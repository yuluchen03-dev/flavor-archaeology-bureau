import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { loadProgress, saveProgress } from '../lib/progressStore.js';
import { INITIAL_SESSION, museumSessionReducer, persistentSession } from './museumSession.js';

const MuseumSessionContext = createContext(null);

export function MuseumSessionProvider({ children }) {
  const persisted = loadProgress();
  const [state, dispatch] = useReducer(museumSessionReducer, {
    ...INITIAL_SESSION,
    ...persisted,
  });

  useEffect(() => {
    saveProgress(persistentSession(state));
  }, [state.selectedDishId, state.completedSteps, state.reducedMotion]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <MuseumSessionContext.Provider value={value}>{children}</MuseumSessionContext.Provider>;
}

export function useMuseumSession() {
  const value = useContext(MuseumSessionContext);
  if (!value) throw new Error('useMuseumSession must be used inside MuseumSessionProvider');
  return value;
}
