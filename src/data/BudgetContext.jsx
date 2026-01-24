import { createContext, useContext, useState, useEffect } from 'react';
import { databases, DB_ID, COLLECTIONS, ID } from '../utils/appwrite';
import { Query } from 'appwrite';

const BudgetContext = createContext();

export function BudgetProvider({ children }) {
  const [states, setStates] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    fetchStates();
  }, []);

  const fetchStates = async () => {
    try {
      const response = await databases.listDocuments(DB_ID, COLLECTIONS.STATES);
      // Fetch MDAs and Sectors for each state to maintain current local-like structure
      // In a large app, we would fetch these on-demand, but for now we'll maintain the existing logic
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

  const addState = async (newStateData) => {
    try {
      const stateId = ID.unique();
      
      // 1. Create State Document
      await databases.createDocument(DB_ID, COLLECTIONS.STATES, stateId, {
        name: newStateData.state,
        year: newStateData.year,
        total_expenditure: newStateData.summary.total_expenditure,
        capital_expenditure: newStateData.summary.capital_expenditure,
        personnel_cost: newStateData.summary.personnel_cost,
        recurrent_revenue: newStateData.summary.recurrent_revenue,
        faac: newStateData.summary.faac || 0,
        igr: newStateData.summary.igr || 0,
        grants: newStateData.summary.grants || 0,
        capital_receipts: newStateData.summary.capital_receipts || 0
      });

      // 2. Batch Create MDAs (Using Promise.all for speed)
      // Note: Appwrite has rate limits, for thousands of MDAs we'd need a worker or chunking
      const mdaChunks = [];
      for (let i = 0; i < newStateData.mdas.length; i += 50) {
        mdaChunks.push(newStateData.mdas.slice(i, i + 50));
      }

      for (const chunk of mdaChunks) {
        await Promise.all(chunk.map(mda => 
          databases.createDocument(DB_ID, COLLECTIONS.MDAS, ID.unique(), {
            state_id: stateId,
            code: mda.code,
            name: mda.name,
            total: mda.total,
            personnel: mda.personnel || 0,
            overhead: mda.overhead || 0,
            capital: mda.capital || 0,
            sourceLine: mda.sourceLine || ""
          })
        ));
      }

      // 3. Create Sectors
      await Promise.all(newStateData.sectors.map(sector => 
        databases.createDocument(DB_ID, COLLECTIONS.SECTORS, ID.unique(), {
          state_id: stateId,
          code: sector.code,
          name: sector.name,
          amount: sector.amount
        })
      ));

      await fetchStates();
      return stateId;
    } catch (e) {
      console.error("Appwrite upload failed", e);
      throw e;
    }
  };

  const deleteState = async (id) => {
    try {
      // 1. Delete MDAs
      const mdas = await databases.listDocuments(DB_ID, COLLECTIONS.MDAS, [Query.equal('state_id', id), Query.limit(5000)]);
      await Promise.all(mdas.documents.map(m => databases.deleteDocument(DB_ID, COLLECTIONS.MDAS, m.$id)));
      
      // 2. Delete Sectors
      const sectors = await databases.listDocuments(DB_ID, COLLECTIONS.SECTORS, [Query.equal('state_id', id)]);
      await Promise.all(sectors.documents.map(s => databases.deleteDocument(DB_ID, COLLECTIONS.SECTORS, s.$id)));

      // 3. Delete State
      await databases.deleteDocument(DB_ID, COLLECTIONS.STATES, id);
      
      await fetchStates();
    } catch (e) {
      console.error("Appwrite delete failed", e);
    }
  };

  return (
    <BudgetContext.Provider value={{ states, addState, deleteState, isInitialized }}>
      {children}
    </BudgetContext.Provider>
  );
}

export const useBudget = () => useContext(BudgetContext);
