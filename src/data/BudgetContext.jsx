import { createContext, useContext, useState, useEffect } from 'react';
import { databases, DB_ID, COLLECTIONS, ID } from '../utils/appwrite';
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
    try {
      return await databases.createDocument(DB_ID, collectionId, ID.unique(), data);
    } catch (e) {
      if (e.code === 429 && retries > 0) {
        const waitTime = (6 - retries) * 3000; 
        console.warn(`Rate limited. Retrying in ${waitTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return throttledCreateDocument(collectionId, data, retries - 1);
      }
      throw e;
    }
  };

  const addState = async (newStateData) => {
    const totalSteps = newStateData.mdas.length + newStateData.sectors.length + 1;
    setUploadStatus({ active: true, current: 0, total: totalSteps });
    try {
      const stateId = ID.unique();
      
      // 1. Create State Document
      await databases.createDocument(DB_ID, COLLECTIONS.STATES, stateId, {
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
        // Increased delay to 1.5s to stay well within 120/min
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

  const throttledDeleteDocument = async (collectionId, documentId, retries = 5) => {
    try {
      return await databases.deleteDocument(DB_ID, collectionId, documentId);
    } catch (e) {
      if (e.code === 429 && retries > 0) {
        const waitTime = (6 - retries) * 4000; // Increased backoff
        console.warn(`Delete rate limited. Retrying in ${waitTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return throttledDeleteDocument(collectionId, documentId, retries - 1);
      }
      throw e;
    }
  };

  const deleteState = async (id) => {
    setUploadStatus({ active: true, current: 0, total: 100 });
    try {
      // 1. Fetch ALL MDAs (Appwrite limit is usually 100, we need to paginate or limit high)
      const mdaRes = await databases.listDocuments(DB_ID, COLLECTIONS.MDAS, [
        Query.equal('state_id', id), 
        Query.limit(5000)
      ]);
      const mdas = mdaRes.documents;
      
      // 2. Smaller Parallel Batches for MDAs
      const batchSize = 5; // Reduced from 10
      const mdaChunks = [];
      for (let i = 0; i < mdas.length; i += batchSize) {
        mdaChunks.push(mdas.slice(i, i + batchSize));
      }

      for (let i = 0; i < mdaChunks.length; i++) {
        const chunk = mdaChunks[i];
        await Promise.all(chunk.map(m => throttledDeleteDocument(COLLECTIONS.MDAS, m.$id)));
        
        const progress = Math.floor(((i * batchSize) / mdas.length) * 90);
        setUploadStatus({ active: true, current: progress, total: 100 });
        
        // Safety delay between batches - increased to 2s
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // 3. Delete Sectors
      const sectorRes = await databases.listDocuments(DB_ID, COLLECTIONS.SECTORS, [Query.equal('state_id', id)]);
      for (const s of sectorRes.documents) {
        await throttledDeleteDocument(COLLECTIONS.SECTORS, s.$id);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 4. Delete State metadata
      await databases.deleteDocument(DB_ID, COLLECTIONS.STATES, id);
      
      await fetchStates();
      setUploadStatus({ active: false, current: 0, total: 0 });
    } catch (e) {
      console.error("Appwrite delete failed", e);
      setUploadStatus({ active: false, current: 0, total: 0 });
      throw new Error("Cloud Purge Incomplete: Appwrite rate limits were exceeded. Some records may still exist in the console. Please wait 1 minute and try again.");
    }
  };

  return (
    <BudgetContext.Provider value={{ states, addState, deleteState, isInitialized, uploadProgress }}>
      {children}
    </BudgetContext.Provider>
  );
}

export const useBudget = () => useContext(BudgetContext);
