import { createContext, useContext, useState, useEffect } from 'react';
import kanoData from './kano-2024.json';

const BudgetContext = createContext();

export function BudgetProvider({ children }) {
  const [states, setStates] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize with Kano if nothing in storage
    const saved = localStorage.getItem('budget_states');
    if (saved) {
      try {
        setStates(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved states", e);
        setStates([{ id: 'kano', name: 'Kano', year: 2024, data: kanoData }]);
      }
    } else {
      const defaultState = { id: 'kano', name: 'Kano', year: 2024, data: kanoData };
      setStates([defaultState]);
      localStorage.setItem('budget_states', JSON.stringify([defaultState]));
    }
    setIsInitialized(true);
  }, []);

  const addState = (newStateData) => {
    const newState = {
      id: newStateData.state.toLowerCase().replace(/\s+/g, '-'),
      name: newStateData.state,
      year: newStateData.year,
      data: newStateData
    };
    
    setStates(prev => {
      const filtered = prev.filter(s => s.id !== newState.id);
      const updated = [...filtered, newState];
      localStorage.setItem('budget_states', JSON.stringify(updated));
      return updated;
    });
    return newState.id;
  };

  const deleteState = (id) => {
    if (id === 'kano') return; // Protect default
    setStates(prev => {
      const updated = prev.filter(s => s.id !== id);
      localStorage.setItem('budget_states', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <BudgetContext.Provider value={{ states, addState, deleteState, isInitialized }}>
      {children}
    </BudgetContext.Provider>
  );
}

export const useBudget = () => useContext(BudgetContext);
