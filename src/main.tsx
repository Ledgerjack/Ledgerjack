import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { runHardwareSanityCheck } from './utils/sanityCheck';

runHardwareSanityCheck().then((report) => {
  if (!report.systemOperational) {
    const fallbackRoot = document.getElementById('root');
    if (fallbackRoot) {
      fallbackRoot.innerHTML = `
        <div style="padding: 2rem; font-family: sans-serif; text-align: center;">
          <h1 style="color: #dc2626;">Hardware Incompatibility Detected</h1>
          <p style="color: #4b5563;">This application requires a secure runtime environment (HTTPS or localhost) alongside robust WebCrypto APIs to maintain zero-knowledge local client data schemas.</p>
        </div>
      `;
    }
    return;
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
