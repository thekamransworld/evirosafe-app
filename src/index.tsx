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

// The screens are code-split so each visitor only downloads what they need.
// In particular, someone who scans a certificate's or a permit's QR code lands on
// a public page without loading the whole app (or its login) first.
const App = React.lazy(() => import('./App'));
const VerifyCertificate = React.lazy(() => import('./components/VerifyCertificate'));
const PublicPermitPage = React.lazy(() => import('./components/PublicPermitPage'));
const isVerifyRoute = /^\/verify(\/|$)/i.test(window.location.pathname);
const isPermitRoute = /^\/permit(\/|$)/i.test(window.location.pathname);

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
        {isVerifyRoute ? <VerifyCertificate /> : isPermitRoute ? <PublicPermitPage /> : <App />}
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>
);