import { useContext } from 'react';
import { MuseumSessionContext } from './MuseumSessionContext.js';

export function useMuseumSession() {
  const value = useContext(MuseumSessionContext);
  if (!value) throw new Error('useMuseumSession must be used inside MuseumSessionProvider');
  return value;
}
