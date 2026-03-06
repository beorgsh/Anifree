import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { CacheProvider } from './context/CacheContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CacheProvider>
      <App />
    </CacheProvider>
  </StrictMode>,
);
