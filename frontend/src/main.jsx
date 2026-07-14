import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { LanguageProvider } from './lib/language.jsx'

// 捕获webview环境中非关键的运行时错误
window.addEventListener('error', (e) => {
  if (e.message && e.message.includes('getBoundingClientRect')) {
    e.preventDefault();
    return false;
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </LanguageProvider>
  </StrictMode>,
)
