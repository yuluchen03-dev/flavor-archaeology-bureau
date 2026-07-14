import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './offline.css';
import OfflineApp from './OfflineApp.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <OfflineApp />
  </StrictMode>,
);
