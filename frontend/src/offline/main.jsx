import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './offline.css';
import './styles/shell.css';
import './styles/home.css';
import './styles/workbench.css';
import './styles/archive.css';
import './styles/research.css';
import './styles/partnership.css';
import './styles/responsive.css';
import OfflineApp from './OfflineApp.jsx';
import { MuseumSessionProvider } from './state/MuseumSessionContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MuseumSessionProvider>
      <OfflineApp />
    </MuseumSessionProvider>
  </StrictMode>,
);
