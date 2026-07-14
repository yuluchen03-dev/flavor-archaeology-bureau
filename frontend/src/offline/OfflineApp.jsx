import MuseumShell from './components/MuseumShell.jsx';
import HomeExhibit from './exhibits/HomeExhibit.jsx';
import RestorationExhibit from './exhibits/RestorationExhibit.jsx';
import BusinessExhibit from './exhibits/BusinessExhibit.jsx';
import ArchiveExhibit from './exhibits/ArchiveExhibit.jsx';
import { useMuseumSession } from './state/MuseumSessionContext.jsx';

export default function OfflineApp() {
  const { state, dispatch } = useMuseumSession();
  const navigate = (exhibit) => dispatch({ type: 'navigate', exhibit });
  const markStepComplete = (step) => dispatch({ type: 'completeStep', step });

  return (
    <MuseumShell activeExhibit={state.activeExhibit} onNavigate={navigate}>
      {state.activeExhibit === 'home' && <HomeExhibit onNavigate={navigate} />}
      {state.activeExhibit === 'restore' && (
        <RestorationExhibit onNavigate={navigate} onStepComplete={markStepComplete} />
      )}
      {state.activeExhibit === 'archive' && <ArchiveExhibit onNavigate={navigate} />}
      {state.activeExhibit === 'business' && <BusinessExhibit onNavigate={navigate} />}
    </MuseumShell>
  );
}
