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
        
        return {
          id: doc.$id,
          name: doc.name,
          year: doc.year,
          data: {
            ...doc,
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
        // Linear backoff: increase wait time with each retry
        const waitTime = (6 - retries) * 2000; 
        console.warn(`Rate limited. Retrying in ${waitTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return throttledCreateDocument(collectionId, data, retries - 1);
      }
      throw e;
    }
  };

  const addState = async (newStateData) => {
    setUploadStatus({ active: true, current: 0, total: newStateData.mdas.length + newStateData.sectors.length + 1 });
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

      // 2. Sequential Upload for MDAs with strict throttling
      const mdas = newStateData.mdas;
      for (let i = 0; i < mdas.length; i++) {
        const mda = mdas[i];
        await throttledCreateDocument(COLLECTIONS.MDAS, {
          state_id: stateId,
          code: mda.code || "000000000000",
          name: mda.name || "Unknown Agency",
          total: mda.total || 0,
          personnel: mda.personnel || 0,
          overhead: mda.overhead || 0,
          capital: mda.capital || 0,
          sourceLine: mda.sourceLine || ""
        });
        setUploadStatus(prev => ({ ...prev, current: prev.current + 1 }));
        
        // Safety delay: 150ms between EVERY request to stay under 120/min burst
        // This is slow but guaranteed to succeed
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      // 3. Create Sectors
      for (const sector of newStateData.sectors) {
        await throttledCreateDocument(COLLECTIONS.SECTORS, {
          state_id: stateId,
          code: sector.code || "000",
          name: sector.name || "Unknown Sector",
          amount: sector.amount || 0
        });
        setUploadStatus(prev => ({ ...prev, current: prev.current + 1 }));
        await new Promise(resolve => setTimeout(resolve, 150));
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
    try {
      const mdas = await databases.listDocuments(DB_ID, COLLECTIONS.MDAS, [Query.equal('state_id', id), Query.limit(5000)]);
      for (const m of mdas.documents) {
        await databases.deleteDocument(DB_ID, COLLECTIONS.MDAS, m.$id);
        await new Promise(resolve => setTimeout(resolve, 50)); // Throttled delete
      }
      
      const sectors = await databases.listDocuments(DB_ID, COLLECTIONS.SECTORS, [Query.equal('state_id', id)]);
      for (const s of sectors.documents) {
        await databases.deleteDocument(DB_ID, COLLECTIONS.SECTORS, s.$id);
      }

      await databases.deleteDocument(DB_ID, COLLECTIONS.STATES, id);
      await fetchStates();
    } catch (e) {
      console.error("Appwrite delete failed", e);
    }
  };

  return (
    <BudgetContext.Provider value={{ states, addState, deleteState, isInitialized, uploadProgress }}>
      {children}
    </BudgetContext.Provider>
  );
}

export const useBudget = () => useContext(BudgetContext);
