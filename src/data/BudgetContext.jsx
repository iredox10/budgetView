import { createContext, useContext, useState, useEffect } from 'react';
import { databases, functions, storage, DB_ID, COLLECTIONS, ID, DELETE_FUNCTION_ID, INGEST_FUNCTION_ID, BUCKET_ID } from '../utils/appwrite';
import { Permission, Role } from 'appwrite';
import { Query } from 'appwrite';

const INGEST_MODE = import.meta.env.VITE_INGEST_MODE || 'direct';
const DIRECT_UPLOAD_BATCH = Number(import.meta.env.VITE_DIRECT_UPLOAD_BATCH || 100);

const BudgetContext = createContext();

export function BudgetProvider({ children }) {
  const [states, setStates] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [uploadProgress, setUploadStatus] = useState({ active: false, current: 0, total: 0 });

  useEffect(() => {
    fetchStates();
  }, []);

  const fetchStates = async () => {
    const retry = async (fn, tries = 4) => {
      for (let i = 0; i < tries; i++) {
        try {
          return await fn();
        } catch (e) {
          if (i === tries - 1) throw e;
          await new Promise(resolve => setTimeout(resolve, 2500 * (i + 1)));
        }
      }
    };

    const asJSON = (v) => {
      if (v === null || v === undefined || v === '') return null;
      if (typeof v === 'object') return v;
      try { return JSON.parse(v); } catch { return null; }
    };

    try {
      const response = await retry(() => databases.listDocuments(DB_ID, COLLECTIONS.STATES));
      const statesWithData = (await Promise.all(response.documents.map(async (doc) => {
        try {
          const [mdaRes, sectorRes] = await Promise.all([
            retry(() => databases.listDocuments(DB_ID, COLLECTIONS.MDAS, [Query.equal('state_id', doc.$id), Query.limit(5000)])),
            retry(() => databases.listDocuments(DB_ID, COLLECTIONS.SECTORS, [Query.equal('state_id', doc.$id)]))
          ]);

          // Reconstruct the nested structure expected by the UI
          const audit = asJSON(doc.audit_report) || { errors: [], reconciled: doc.verified };
          const auditSummary = audit?.summary || {};
          const pickNumber = (primary, fallback) => {
            if (primary === null || primary === undefined) {
              if (typeof fallback === 'number' && Number.isFinite(fallback)) return fallback;
              return null;
            }
            if (typeof primary === 'number' && Number.isFinite(primary)) return primary;
            return null;
          };

          const summary = {
            total_expenditure: pickNumber(doc.total_expenditure, auditSummary.total_expenditure),
            recurrent_expenditure: pickNumber(doc.recurrent_expenditure, auditSummary.recurrent_expenditure),
            capital_expenditure: pickNumber(doc.capital_expenditure, auditSummary.capital_expenditure),
            personnel_cost: pickNumber(doc.personnel_cost, auditSummary.personnel_cost),
            recurrent_revenue: pickNumber(doc.recurrent_revenue, auditSummary.recurrent_revenue),
            faac: pickNumber(doc.faac, auditSummary.faac),
            igr: pickNumber(doc.igr, auditSummary.igr),
            grants: pickNumber(doc.grants, auditSummary.grants),
            capital_receipts: pickNumber(doc.capital_receipts, auditSummary.capital_receipts),
            opening_balance: pickNumber(doc.opening_balance, auditSummary.opening_balance),
            financing_total: pickNumber(doc.financing_total, auditSummary.financing_total),
            deficit_surplus: pickNumber(doc.deficit_surplus, auditSummary.deficit_surplus),
            total_revenue: pickNumber(doc.total_revenue, auditSummary.total_revenue)
          };

          return {
            id: doc.$id,
            name: doc.name,
            year: doc.year,
            data: {
              state: doc.name,
              year: doc.year,
              verified: doc.verified,
              isOfficialError: doc.isOfficialError,
              errorExplanation: doc.errorExplanation,
              summarySources: asJSON(doc.summarySources) || {},
              summaryPages: asJSON(doc.summaryPages) || {},
              pdf_file_id: doc.pdf_file_id,
              text_file_id: doc.text_file_id,
              revenue_file_id: doc.revenue_file_id,
              projects_file_id: doc.projects_file_id,
              audit,
              anomalies: asJSON(doc.anomalies) || (audit.anomalies || []),
              has_anomalies: Boolean(doc.has_anomalies) || Boolean(audit.has_anomalies) || Boolean((audit.anomalies || []).length),
              document_metrics: asJSON(doc.document_metrics) || {},
              process_logs: doc.process_logs || "",
              summary,
              mdas: mdaRes.documents.map(m => ({
                ...m,
                units: asJSON(m.units) || [],
                provenance: asJSON(m.provenance) || {}
              })),
              sectors: sectorRes.documents
            }
          };
        } catch (e) {
          console.error(`State ${doc.$id} failed to load`, e);
          return null;
        }
      }))).filter(Boolean);

      setStates(statesWithData);
      setIsInitialized(true);
    } catch (e) {
      console.error("Appwrite fetch failed", e);
      setIsInitialized(true);
    }
  };

  const addState = async (newStateData, pdfFile = null, textFile = null) => {
    setUploadStatus({ active: true, current: 0, total: 100 });
    
    try {
      // 1. Duplicate check
      const existing = await databases.listDocuments(DB_ID, COLLECTIONS.STATES, [
        Query.equal('name', newStateData.state),
        Query.equal('year', parseInt(newStateData.year))
      ]);
      
      if (existing.total > 0) {
        throw new Error(`A budget for ${newStateData.state} (${newStateData.year}) already exists. Purge it from the console first.`);
      }

      console.log("🚀 Initializing budget ingestion...");

      // 2. Upload original PDF if provided
      let pdfFileId = "";
      if (pdfFile) {
        console.log("📄 Uploading original budget PDF...");
        const uploadedPdf = await storage.createFile(BUCKET_ID, ID.unique(), pdfFile);
        pdfFileId = uploadedPdf.$id;
        await storage.updateFile(BUCKET_ID, pdfFileId, undefined, [
          Permission.read(Role.any())
        ]);
      }

      // 3. Upload Text Extract if provided
      let textFileId = "";
      if (textFile) {
        console.log("📝 Uploading raw text extract...");
        const uploadedText = await storage.createFile(BUCKET_ID, ID.unique(), textFile);
        textFileId = uploadedText.$id;
        await storage.updateFile(BUCKET_ID, textFileId, undefined, [
          Permission.read(Role.any())
        ]);
      }

      // 4. Validate bundle before any ingestion
      const mdas = Array.isArray(newStateData.mdas) ? newStateData.mdas : [];
      if (mdas.length === 0) {
        throw new Error("No MDAs detected in this bundle. Ensure the folder contains a JSON with MDA data (mda/expenditure_mda) or share the folder so we can add a parser rule.");
      }

      // Naming gate: placeholder sector/unit names mean the parser could not
      // recover a description from the document — surface it, don't ingest.
      const badSectors = (newStateData.sectors || []).filter(s =>
        !s.name || !String(s.name).trim() ||
        ['unknown', 'other', 'unnamed'].includes(String(s.name).trim().toLowerCase()) ||
        String(s.name).includes('(unnamed)')
      );
      if (badSectors.length > 0) {
        throw new Error(`Sector naming failed for ${badSectors.length} sector(s) (e.g. code ${badSectors[0].code}). The PDF wraps these names in a layout the parser could not recover — fix the extractor, don't ingest placeholders.`);
      }
      const badUnits = [];
      const walkUnits = (units, mda) => units.forEach(u => {
        if (!u.name || !String(u.name).trim()) badUnits.push(`${mda.code}/${u.code}`);
        walkUnits(u.children || [], mda);
      });
      mdas.forEach(m => walkUnits(m.units || [], m));
      if (badUnits.length > 0) {
        throw new Error(`Unit naming failed for ${badUnits.length} unit(s) (e.g. ${badUnits[0]}). Same rule: fix the extractor before ingesting.`);
      }

      if (INGEST_MODE === 'cloud' && INGEST_FUNCTION_ID) {
        // Cloud ingestion (fallback)
        const blob = new Blob([JSON.stringify(newStateData)], { type: 'application/json' });
        const file = new File([blob], "verify_staging.json");
        const tempFileId = ID.unique();
        await storage.createFile(BUCKET_ID, tempFileId, file);

        setUploadStatus({ active: true, current: 20, total: 100 });

        const execution = await functions.createExecution(
          INGEST_FUNCTION_ID,
          JSON.stringify({ 
            fileId: tempFileId, 
            bucketId: BUCKET_ID,
            pdfFileId: pdfFileId,
            textFileId: textFileId
          }),
          true
        );

        const executionId = execution.$id;
        console.log(`⏳ Server-side ingestion started: ${executionId}. Monitoring database...`);

        let isIngested = false;
        let pollingCount = 0;
        const maxPolls = 180; 

        while (!isIngested) {
          if (pollingCount > maxPolls) throw new Error("Cloud ingestion timed out.");
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          const res = await databases.listDocuments(DB_ID, COLLECTIONS.STATES, [
            Query.equal('name', newStateData.state),
            Query.equal('year', parseInt(newStateData.year))
          ]);

          if (res.total > 0) {
            isIngested = true;
          } else {
            pollingCount++;
            setUploadStatus(prev => ({ ...prev, current: Math.min(prev.current + 5, 98) }));
          }
        }
      } else {
        // Direct ingestion from the browser (no cloud function)
        setUploadStatus({ active: true, current: 20, total: 100 });

        const stateId = ID.unique();
        const audit = newStateData.audit || {};
        const summary = newStateData.summary || {};

        const auditReport = {
          ...audit,
          summary: newStateData.summary || {},
          summarySources: newStateData.summarySources || {},
          summaryPages: newStateData.summaryPages || {}
        };

        await databases.createDocument(DB_ID, COLLECTIONS.STATES, stateId, {
          name: newStateData.state,
          year: parseInt(newStateData.year),
          state_code: newStateData.state_code || "",
          currency: newStateData.currency || "NGN",
          total_expenditure: summary.total_expenditure ?? 0,
          total_revenue: summary.total_revenue ?? null,
          recurrent_expenditure: summary.recurrent_expenditure ?? null,
          capital_expenditure: summary.capital_expenditure ?? 0,
          personnel_cost: summary.personnel_cost ?? 0,
          recurrent_revenue: summary.recurrent_revenue ?? 0,
          faac: summary.faac ?? null,
          igr: summary.igr ?? null,
          grants: summary.grants ?? null,
          capital_receipts: summary.capital_receipts ?? null,
          opening_balance: summary.opening_balance ?? null,
          financing_total: summary.financing_total ?? null,
          deficit_surplus: summary.deficit_surplus ?? null,
          verified: audit.reconciled !== false,
          isOfficialError: audit.reconciled === false,
          errorExplanation: (newStateData.errorExplanation || (audit.errors ? JSON.stringify(audit.errors) : '')).slice(0, 1900),
          summarySources: JSON.stringify(newStateData.summarySources || {}),
          summaryPages: JSON.stringify(newStateData.summaryPages || {}),
          pdf_file_id: pdfFileId,
          text_file_id: textFileId,
          audit_report: JSON.stringify(auditReport),
          anomalies: JSON.stringify(audit.anomalies || []),
          has_anomalies: Boolean(audit.has_anomalies || (audit.anomalies && audit.anomalies.length > 0)),
          document_metrics: JSON.stringify(newStateData.document_metrics || {}),
          process_logs: newStateData.process_logs || ""
        });

        const sectors = Array.isArray(newStateData.sectors) ? newStateData.sectors : [];

        let processed = 0;
        const totalWork = mdas.length + sectors.length;
        const bumpProgress = () => {
          processed += 1;
          const progress = totalWork > 0 ? 20 + Math.floor((processed / totalWork) * 78) : 98;
          setUploadStatus(prev => ({ ...prev, current: Math.min(progress, 98) }));
        };

        const mdaErrors = [];
        const sectorErrors = [];
        let mdaCreated = 0;
        let sectorCreated = 0;

        for (let i = 0; i < mdas.length; i += DIRECT_UPLOAD_BATCH) {
          const slice = mdas.slice(i, i + DIRECT_UPLOAD_BATCH);
          await Promise.all(slice.map(async (mda) => {
            const prov = mda.provenance || {};
            try {
              await databases.createDocument(DB_ID, COLLECTIONS.MDAS, ID.unique(), {
                state_id: stateId,
                code: String(mda.code || '0'),
                name: mda.name || 'Unknown',
                total: mda.total ?? 0,
                recurrent: mda.recurrent ?? null,
                personnel: mda.personnel ?? null,
                overhead: mda.overhead ?? null,
                capital: mda.capital ?? null,
                sourceLine: prov.line_text || '',
                pageNumber: prov.page || 0,
                units: JSON.stringify(mda.units || []),
                provenance: JSON.stringify(prov || {})
              });
              mdaCreated += 1;
              bumpProgress();
            } catch (err) {
              mdaErrors.push({ code: mda.code, message: err.message });
            }
          }));
        }

        for (let i = 0; i < sectors.length; i += DIRECT_UPLOAD_BATCH) {
          const slice = sectors.slice(i, i + DIRECT_UPLOAD_BATCH);
          await Promise.all(slice.map(async (sector) => {
            try {
              await databases.createDocument(DB_ID, COLLECTIONS.SECTORS, ID.unique(), {
                state_id: stateId,
                code: sector.code || '0',
                name: sector.name || 'Unknown',
                amount: sector.amount || 0
              });
              sectorCreated += 1;
              bumpProgress();
            } catch (err) {
              sectorErrors.push({ code: sector.code, message: err.message });
            }
          }));
        }

        if (mdaErrors.length > 0 || sectorErrors.length > 0) {
          const firstMdaError = mdaErrors[0]?.message;
          const firstSectorError = sectorErrors[0]?.message;
          const detail = firstMdaError || firstSectorError || 'Unknown write error';
          console.error('MDA write errors', mdaErrors.slice(0, 5));
          console.error('Sector write errors', sectorErrors.slice(0, 5));
          throw new Error(`Upload incomplete. Saved ${mdaCreated}/${mdas.length} MDAs and ${sectorCreated}/${sectors.length} sectors. First error: ${detail}`);
        }

        setUploadStatus(prev => ({ ...prev, current: 100 }));
      }

      console.log("✅ Ingestion complete.");
      await fetchStates();
      setUploadStatus({ active: false, current: 0, total: 0 });
      return "success-redirect";
    } catch (e) {
      console.error("Turbo ingestion failed", e);
      setUploadStatus({ active: false, current: 0, total: 0 });
      throw e;
    }
  };

  const deleteState = async (id) => {
    setUploadStatus({ active: true, current: 0, total: 100 });
    try {
      console.log(`🗑️ Triggering async cloud purge for state ${id}...`);
      
      // 1. Create asynchronous execution
      try {
        await functions.createExecution(
          DELETE_FUNCTION_ID,
          JSON.stringify({ stateId: id }),
          true // ASYNC = true
        );
      } catch (e) {
        // Appwrite sometimes throws a scope error even if the execution was triggered
        if (!e.message.includes('execution.read') && !e.message.includes('scope')) {
          throw e;
        }
        console.log("ℹ️ Execution triggered (scope warning ignored).");
      }

      console.log(`⏳ Purge initiated. Monitoring database for completion...`);

      // 2. Poll the database. When the document is deleted, the purge is done.
      let isDeleted = false;
      let pollingCount = 0;
      const maxPolls = 120; // 10 minutes (5s intervals)

      while (!isDeleted) {
        if (pollingCount > maxPolls) throw new Error("Cloud purge timed out after 10 minutes.");
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        try {
          await databases.getDocument(DB_ID, COLLECTIONS.STATES, id);
          // If we reach here, it still exists
          pollingCount++;
          setUploadStatus(prev => ({ 
            ...prev, 
            current: Math.min(prev.current + 5, 95) 
          }));
        } catch (e) {
          if (e.code === 404) {
            isDeleted = true;
          } else {
            throw e;
          }
        }
      }

      console.log("✅ Deletion confirmed via Database check.");
      await fetchStates();
      setUploadStatus({ active: false, current: 0, total: 0 });
    } catch (e) {
      console.error("Appwrite delete failed", e);
      setUploadStatus({ active: false, current: 0, total: 0 });
      throw new Error(`Cloud Purge Status Unknown: ${e.message}. Please refresh the page in a few moments.`);
    }
  };

  return (
    <BudgetContext.Provider value={{ states, addState, deleteState, isInitialized, uploadProgress }}>
      {children}
    </BudgetContext.Provider>
  );
}

export const useBudget = () => useContext(BudgetContext);
