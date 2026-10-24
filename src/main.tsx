import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Dev-only hooks used by the browser acceptance tests (tests/acceptance.md). Not in production builds.
if (import.meta.env.DEV) {
  import('./devtools').then((m) => m.installDevtools());
}
