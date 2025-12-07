// ============================================================================
// MODA - Main Entry Point
// Vite-compiled React application
// ============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from './contexts/AppProviders';
import { MODAApp } from './components/MODAApp';
import './styles/index.css';

// Initialize the app
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <AppProviders>
      <MODAApp />
    </AppProviders>
  </React.StrictMode>
);
