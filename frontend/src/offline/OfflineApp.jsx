import MuseumShell from './components/MuseumShell.jsx';
import HomeExhibit from './exhibits/HomeExhibit.jsx';
import RestorationExhibit from './exhibits/RestorationExhibit.jsx';
import BusinessExhibit from './exhibits/BusinessExhibit.jsx';
import ArchiveExhibit from './exhibits/ArchiveExhibit.jsx';
import { useMuseumSession } from './state/useMuseumSession.js';

export default function OfflineApp() {
  const { state, dispatch } = useMuseumSession();
  const navigate = (exhibit) => dispatch({ type: 'navigate', exhibit });

  return (
    <MuseumShell activeExhibit={state.activeExhibit} onNavigate={navigate}>
      {state.activeExhibit === 'home' && <HomeExhibit onNavigate={navigate} />}
      {state.activeExhibit === 'restore' && <RestorationExhibit />}
      {state.activeExhibit === 'archive' && <ArchiveExhibit onNavigate={navigate} />}
      {state.activeExhibit === 'business' && <BusinessExhibit />}
    </MuseumShell>
  );
}
