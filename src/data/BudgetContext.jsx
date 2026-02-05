import { createContext, useContext, useState, useEffect } from 'react';
import { databases, functions, storage, DB_ID, COLLECTIONS, ID, DELETE_FUNCTION_ID, INGEST_FUNCTION_ID, BUCKET_ID } from '../utils/appwrite';
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
    try {
      const response = await databases.listDocuments(DB_ID, COLLECTIONS.STATES);
      const statesWithData = await Promise.all(response.documents.map(async (doc) => {
        const [mdaRes, sectorRes] = await Promise.all([
          databases.listDocuments(DB_ID, COLLECTIONS.MDAS, [Query.equal('state_id', doc.$id), Query.limit(5000)]),
          databases.listDocuments(DB_ID, COLLECTIONS.SECTORS, [Query.equal('state_id', doc.$id)])
        ]);
        
        // Reconstruct the nested structure expected by the UI
        const audit = doc.audit_report ? JSON.parse(doc.audit_report) : { errors: [], reconciled: doc.verified };
        const auditSummary = audit?.summary || {};
        const pickNumber = (primary, fallback) => {
          if (typeof primary === 'number' && Number.isFinite(primary) && primary !== 0) return primary;
          if (typeof fallback === 'number' && Number.isFinite(fallback)) return fallback;
          return 0;
        };

        const summary = {
          total_expenditure: pickNumber(doc.total_expenditure, auditSummary.total_expenditure),
          capital_expenditure: pickNumber(doc.capital_expenditure, auditSummary.capital_expenditure),
          personnel_cost: pickNumber(doc.personnel_cost, auditSummary.personnel_cost),
          recurrent_revenue: pickNumber(doc.recurrent_revenue, auditSummary.recurrent_revenue),
          faac: pickNumber(doc.faac, auditSummary.faac),
          igr: pickNumber(doc.igr, auditSummary.igr),
          grants: pickNumber(doc.grants, auditSummary.grants),
          capital_receipts: pickNumber(doc.capital_receipts, auditSummary.capital_receipts),
          total_revenue: pickNumber(doc.total_revenue, auditSummary.total_revenue)
        };

        if (summary.total_revenue === 0) {
          summary.total_revenue = summary.faac + summary.igr + summary.grants + summary.capital_receipts;
        }

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
            summarySources: doc.summarySources ? JSON.parse(doc.summarySources) : {},
            summaryPages: doc.summaryPages ? JSON.parse(doc.summaryPages) : {},
            pdf_file_id: doc.pdf_file_id,
            text_file_id: doc.text_file_id,
            audit,
            document_metrics: doc.document_metrics ? JSON.parse(doc.document_metrics) : {},
            process_logs: doc.process_logs || "",
            summary,
            mdas: mdaRes.documents.map(m => ({
              ...m,
              units: m.units ? JSON.parse(m.units) : [],
              provenance: m.provenance ? JSON.parse(m.provenance) : {}
            })),
            sectors: sectorRes.documents
          }
        };
      }));
      
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
      }

      // 3. Upload Text Extract if provided
      let textFileId = "";
      if (textFile) {
        console.log("📝 Uploading raw text extract...");
        const uploadedText = await storage.createFile(BUCKET_ID, ID.unique(), textFile);
        textFileId = uploadedText.$id;
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
          total_expenditure: summary.total_expenditure || 0,
          capital_expenditure: summary.capital_expenditure || 0,
          personnel_cost: summary.personnel_cost || 0,
          recurrent_revenue: summary.recurrent_revenue || 0,
          faac: summary.faac || 0,
          igr: summary.igr || 0,
          grants: summary.grants || 0,
          capital_receipts: summary.capital_receipts || 0,
          verified: audit.reconciled !== false,
          isOfficialError: audit.reconciled === false,
          errorExplanation: (newStateData.errorExplanation || (audit.errors ? JSON.stringify(audit.errors) : '')).slice(0, 1900),
          summarySources: JSON.stringify(newStateData.summarySources || {}),
          summaryPages: JSON.stringify(newStateData.summaryPages || {}),
          pdf_file_id: pdfFileId,
          text_file_id: textFileId,
          audit_report: JSON.stringify(auditReport),
          document_metrics: JSON.stringify(newStateData.document_metrics || {}),
          process_logs: newStateData.process_logs || ""
        });

        const mdas = Array.isArray(newStateData.mdas) ? newStateData.mdas : [];
        const sectors = Array.isArray(newStateData.sectors) ? newStateData.sectors : [];

        let processed = 0;
        const totalWork = mdas.length + sectors.length;
        const bumpProgress = () => {
          processed += 1;
          const progress = totalWork > 0 ? 20 + Math.floor((processed / totalWork) * 78) : 98;
          setUploadStatus(prev => ({ ...prev, current: Math.min(progress, 98) }));
        };

        for (let i = 0; i < mdas.length; i += DIRECT_UPLOAD_BATCH) {
          const slice = mdas.slice(i, i + DIRECT_UPLOAD_BATCH);
          await Promise.all(slice.map(mda => {
            const prov = mda.provenance || {};
            return databases.createDocument(DB_ID, COLLECTIONS.MDAS, ID.unique(), {
              state_id: stateId,
              code: String(mda.code || '0'),
              name: mda.name || 'Unknown',
              total: mda.total || 0,
              personnel: mda.personnel || mda.recurrent || 0,
              overhead: mda.overhead || 0,
              capital: mda.capital || 0,
              sourceLine: prov.line_text || '',
              pageNumber: prov.page || 0,
              units: JSON.stringify(mda.units || []),
              provenance: JSON.stringify(prov || {})
            }).then(bumpProgress);
          }));
        }

        for (let i = 0; i < sectors.length; i += DIRECT_UPLOAD_BATCH) {
          const slice = sectors.slice(i, i + DIRECT_UPLOAD_BATCH);
          await Promise.all(slice.map(sector => {
            return databases.createDocument(DB_ID, COLLECTIONS.SECTORS, ID.unique(), {
              state_id: stateId,
              code: sector.code || '0',
              name: sector.name || 'Unknown',
              amount: sector.amount || 0
            }).then(bumpProgress);
          }));
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
