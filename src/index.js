import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';

// No-ops entirely when REACT_APP_SENTRY_DSN isn't set — local dev
// never needs a Sentry account for this to work.
if (process.env.REACT_APP_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
}

// Without this, any single component throwing during render (a bad API
// response shape, a null-deref) unmounts the whole app to a blank white
// screen — Sentry.init above reports a crash, it doesn't contain one.
// This catches it and offers a reload instead of a dead page.
const ErrorFallback = () => (
  <div style={{
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 16,
    fontFamily: 'system-ui, sans-serif', padding: 24, textAlign: 'center',
  }}>
    <div style={{ fontSize: 40 }}>⚠️</div>
    <h1 style={{ fontSize: 20, margin: 0 }}>Something went wrong</h1>
    <p style={{ color: '#6b7fa3', maxWidth: 420, margin: 0 }}>
      This page hit an unexpected error. Reloading usually fixes it — your
      data on the server is safe either way.
    </p>
    <button
      onClick={() => window.location.reload()}
      style={{ padding: '10px 24px', background: '#1e6bbd', color: 'white',
        border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
        cursor: 'pointer' }}
    >
      Reload page
    </button>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);