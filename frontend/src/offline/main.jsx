import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './offline.css';
import './styles/shell.css';
import './styles/workbench.css';
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
