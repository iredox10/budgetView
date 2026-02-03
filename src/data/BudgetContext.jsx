import { createContext, useContext, useState, useEffect } from 'react';
import { databases, functions, storage, DB_ID, COLLECTIONS, ID, DELETE_FUNCTION_ID, INGEST_FUNCTION_ID, BUCKET_ID } from '../utils/appwrite';
import { Query } from 'appwrite';

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
            audit: doc.audit_report ? JSON.parse(doc.audit_report) : { errors: [], reconciled: doc.verified },
            document_metrics: doc.document_metrics ? JSON.parse(doc.document_metrics) : {},
            process_logs: doc.process_logs || "",
            summary: {
              total_expenditure: doc.total_expenditure,
              capital_expenditure: doc.capital_expenditure,
              personnel_cost: doc.personnel_cost,
              recurrent_revenue: doc.recurrent_revenue,
              faac: doc.faac,
              igr: doc.igr,
              grants: doc.grants,
              capital_receipts: doc.capital_receipts
            },
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
        Query.equal('year', newStateData.year)
      ]);
      
      if (existing.total > 0) {
        throw new Error(`A budget for ${newStateData.state} (${newStateData.year}) already exists. Purge it from the console first.`);
      }

      console.log("🚀 Initializing turbo cloud ingestion...");

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

      // 4. Upload verified JSON data to storage for cloud ingestion
      const blob = new Blob([JSON.stringify(newStateData)], { type: 'application/json' });
      const file = new File([blob], "verify_staging.json");
      const tempFileId = ID.unique();
      await storage.createFile(BUCKET_ID, tempFileId, file);
      
      setUploadStatus({ active: true, current: 20, total: 100 });

      // 5. Trigger Ingestion Cloud Function
      const execution = await functions.createExecution(
        INGEST_FUNCTION_ID,
        JSON.stringify({ 
          fileId: tempFileId, 
          bucketId: BUCKET_ID,
          pdfFileId: pdfFileId,
          textFileId: textFileId
        }),
        true // Async execution
      );

      const executionId = execution.$id;
      console.log(`⏳ Server-side ingestion started: ${executionId}. Monitoring database...`);

      // 5. Poll database for completion
      let isIngested = false;
      let pollingCount = 0;
      const maxPolls = 180; 

      while (!isIngested) {
        if (pollingCount > maxPolls) throw new Error("Cloud ingestion timed out.");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const res = await databases.listDocuments(DB_ID, COLLECTIONS.STATES, [
          Query.equal('name', newStateData.state),
          Query.equal('year', newStateData.year)
        ]);

        if (res.total > 0) {
          isIngested = true;
        } else {
          pollingCount++;
          setUploadStatus(prev => ({ ...prev, current: Math.min(prev.current + 5, 98) }));
        }
      }

      console.log("✅ Turbo ingestion complete.");
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
