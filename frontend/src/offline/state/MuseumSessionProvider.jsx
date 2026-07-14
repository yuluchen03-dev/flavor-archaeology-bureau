import { useEffect, useMemo, useReducer } from 'react';
import { loadProgress, saveProgress } from '../lib/progressStore.js';
import { INITIAL_SESSION, museumSessionReducer, persistentSession } from './museumSession.js';
import { MuseumSessionContext } from './MuseumSessionContext.js';

export default function MuseumSessionProvider({ children }) {
  const [state, dispatch] = useReducer(museumSessionReducer, undefined, () => ({
    ...INITIAL_SESSION,
    ...loadProgress(),
  }));
  const { selectedDishId, completedSteps, reducedMotion } = state;

  useEffect(() => {
    saveProgress(persistentSession({ selectedDishId, completedSteps, reducedMotion }));
  }, [selectedDishId, completedSteps, reducedMotion]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <MuseumSessionContext.Provider value={value}>{children}</MuseumSessionContext.Provider>;
}
