import { createContext, useContext, useState, useEffect } from 'react';
import { databases, functions, DB_ID, COLLECTIONS, ID, DELETE_FUNCTION_ID } from '../utils/appwrite';
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
            mdas: mdaRes.documents,
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

  const throttledCreateDocument = async (collectionId, data, retries = 5) => {
    // Generate ID outside the try block so if we retry, we can decide 
    // whether to use a new one or the same one. 
    // For Appwrite, on a 429 retry, we SHOULD use a new unique ID 
    // to avoid "already exists" if the previous request actually succeeded 
    // but the client didn't know.
    try {
      return await databases.createDocument(DB_ID, collectionId, ID.unique(), data);
    } catch (e) {
      // If it's a rate limit error, wait and retry with a NEW ID
      if (e.code === 429 && retries > 0) {
        const waitTime = (6 - retries) * 3000;
        console.warn(`Rate limited. Retrying with new ID in ${waitTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return throttledCreateDocument(collectionId, data, retries - 1);
      }
      // If it's a conflict error (already exists), it means a previous 
      // "failed" attempt actually succeeded. We can ignore this and move on
      // OR we can return the existing one.
      if (e.code === 409) {
        console.info("Document already exists (likely from a ghost retry success). Continuing...");
        return { $id: "existing" }; 
      }
      throw e;
    }
  };

  const addState = async (newStateData) => {
    const totalSteps = newStateData.mdas.length + newStateData.sectors.length + 1;
    setUploadStatus({ active: true, current: 0, total: totalSteps });
    
    try {
      // Pre-check: Does this state/year already exist? 
      // This prevents the "ID already exists" if the user is uploading a duplicate
      const existing = await databases.listDocuments(DB_ID, COLLECTIONS.STATES, [
        Query.equal('name', newStateData.state),
        Query.equal('year', newStateData.year)
      ]);
      
      if (existing.total > 0) {
        throw new Error(`A budget for ${newStateData.state} (${newStateData.year}) already exists in the cloud. Please delete the existing one from the Admin Console first.`);
      }

      // 1. Create State Document
      const stateDoc = await databases.createDocument(DB_ID, COLLECTIONS.STATES, ID.unique(), {
        name: newStateData.state || "Unknown State",
        year: newStateData.year || 2024,
        total_expenditure: newStateData.summary.total_expenditure || 0,
        capital_expenditure: newStateData.summary.capital_expenditure || 0,
        personnel_cost: newStateData.summary.personnel_cost || 0,
        recurrent_revenue: newStateData.summary.recurrent_revenue || 0,
        faac: newStateData.summary.faac || 0,
        igr: newStateData.summary.igr || 0,
        grants: newStateData.summary.grants || 0,
        capital_receipts: newStateData.summary.capital_receipts || 0,
        verified: true, 
        isOfficialError: newStateData.isOfficialError || false,
        errorExplanation: newStateData.errorExplanation || "",
        summarySources: JSON.stringify(newStateData.summarySources || {})
      });
      
      const stateId = stateDoc.$id;
      setUploadStatus(prev => ({ ...prev, current: prev.current + 1 }));

      // 2. Parallel Batch Upload for MDAs (Chunks of 5)
      const mdas = newStateData.mdas;
      const mdaChunks = [];
      for (let i = 0; i < mdas.length; i += 5) {
        mdaChunks.push(mdas.slice(i, i + 5));
      }

      for (const chunk of mdaChunks) {
        await Promise.all(chunk.map(mda => 
          throttledCreateDocument(COLLECTIONS.MDAS, {
            state_id: stateId,
            code: mda.code || "000000000000",
            name: mda.name || "Unknown Agency",
            total: mda.total || 0,
            personnel: mda.personnel || 0,
            overhead: mda.overhead || 0,
            capital: mda.capital || 0,
            sourceLine: mda.sourceLine || ""
          })
        ));
        setUploadStatus(prev => ({ ...prev, current: prev.current + chunk.length }));
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // 3. Create Sectors (Chunks of 5)
      const sectorChunks = [];
      for (let i = 0; i < newStateData.sectors.length; i += 5) {
        sectorChunks.push(newStateData.sectors.slice(i, i + 5));
      }

      for (const chunk of sectorChunks) {
        await Promise.all(chunk.map(sector => 
          throttledCreateDocument(COLLECTIONS.SECTORS, {
            state_id: stateId,
            code: sector.code || "000",
            name: sector.name || "Unknown Sector",
            amount: sector.amount || 0
          })
        ));
        setUploadStatus(prev => ({ ...prev, current: prev.current + chunk.length }));
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      await fetchStates();
      setUploadStatus({ active: false, current: 0, total: 0 });
      return stateId;
    } catch (e) {
      console.error("Appwrite upload failed", e);
      setUploadStatus({ active: false, current: 0, total: 0 });
      throw e;
    }
  };

  const deleteState = async (id) => {
    setUploadStatus({ active: true, current: 0, total: 100 });
    try {
      console.log(`🗑️ Triggering async cloud purge for state ${id}...`);
      
      // 1. Create asynchronous execution
      // We don't wait for completion via getExecution (to avoid scope errors)
      // Instead we poll the database for the state document's existence.
      await functions.createExecution(
        DELETE_FUNCTION_ID,
        JSON.stringify({ stateId: id }),
        true // ASYNC = true
      );

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
