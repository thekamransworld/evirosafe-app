import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initErrorReporting } from './lib/errorReporting';

initErrorReporting();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Both screens are code-split so each visitor only downloads what they need.
// In particular, someone who scans a certificate's QR code lands on the public
// verification page without loading the whole app (or its login) first.
const App = React.lazy(() => import('./App'));
const VerifyCertificate = React.lazy(() => import('./components/VerifyCertificate'));
const isVerifyRoute = /^\/verify(\/|$)/i.test(window.location.pathname);

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
        {isVerifyRoute ? <VerifyCertificate /> : <App />}
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>
);