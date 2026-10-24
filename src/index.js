import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

// Offline support: register the service worker (production only, HTTPS only)
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Check for a newer build when the app comes back to the foreground
      // and every 30 minutes while open.
      const check = () => { try { reg.update(); } catch {} };
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
      setInterval(check, 30 * 60 * 1000);
    }).catch(() => {
      /* registration failed — app still works online */
    });
    // A new worker taking over a page that already had one means a new
    // build is live — App.js shows the "tap to update" banner.
    let hadController = !!navigator.serviceWorker.controller;
    // S131: the worker tells us when a newer app shell was stored for next launch
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'sankirtan-shell-updated') window.dispatchEvent(new Event('sankirtan:update'));
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) window.dispatchEvent(new Event('sankirtan:update'));
      hadController = true;
    });
  });
}
