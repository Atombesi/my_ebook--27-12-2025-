import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const errorLog = document.getElementById('error-log');
if (errorLog) {
  errorLog.textContent = 'index.tsx ha iniziato l\'esecuzione...\n';
}
console.log("index.tsx started");

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);