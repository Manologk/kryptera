import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './app/App';
import { QueryProvider } from './providers/QueryProvider';
import './styles/globals.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <QueryProvider>
      <App />
      <Toaster richColors position="top-right" closeButton />
    </QueryProvider>
  </StrictMode>,
);
