import React from 'react';
import { createRoot } from 'react-dom/client';
import '@cortexapps/react-plugin-ui/index.css';
import { SpaceliftPlugin } from './components/SpaceliftPlugin';

const App: React.FC = () => {
  return <SpaceliftPlugin />;
};

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error('Root container not found');
}