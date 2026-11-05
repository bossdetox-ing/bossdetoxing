import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../src/app/App';
import '../../src/styles/global.css';
import '../../src/styles/clandrei.css';

// The clandrei palette (src/styles/clandrei.css) is the app's look.
document.documentElement.dataset.palette = 'clandrei';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
