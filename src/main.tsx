import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { applyThemeToDOM } from './utils/theme';
import { useNominaStore } from './store/useNominaStore';

// Apply stored theme variables immediately to DOM before mount
try {
  applyThemeToDOM(useNominaStore.getState().themeSettings);
} catch (e) {
  console.warn('Initial theme setup:', e);
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
