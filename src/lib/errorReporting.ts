import * as Sentry from '@sentry/react';

// Reads the DSN from env, same pattern as Firebase's environment separation
// (src/firebase.ts) - no fallback here though, since unlike Firebase there's
// no "safe default project" for error reporting. If VITE_SENTRY_DSN isn't
// set, this quietly does nothing rather than erroring, so local dev without
// a DSN configured keeps working exactly as it does today.
export function initErrorReporting() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.info('[ErrorReporting] No VITE_SENTRY_DSN set - error monitoring is disabled.');
    return;
  }

  Sentry.init({
    dsn,
    // Tags every event with which environment it came from, so dev/staging
    // noise never gets mixed up with real production incidents in the same
    // Sentry project (or point this at entirely separate DSNs per project,
    // same idea as the Firebase dev/prod split).
    environment: import.meta.env.MODE,
    integrations: [
      // This is what makes this useful without touching the ~150+ existing
      // console.error(...) calls already spread across contexts.tsx and
      // every component fixed this session - every one of those gets
      // forwarded to Sentry automatically from here on, with zero changes
      // to those files.
      Sentry.captureConsoleIntegration({ levels: ['error'] }),
    ],
    // Errors only, by design - not wiring up session replay or performance
    // tracing here since that wasn't asked for and adds real cost (both
    // bundle size and Sentry quota) beyond what "catch production errors"
    // needs.
    tracesSampleRate: 0,
  });
}

// For call sites that want to report something Sentry's automatic
// console-capture wouldn't structure well on its own - e.g. an Error object
// with extra context attached, like the React error boundary below.
export function reportError(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, context ? { extra: context } : undefined);
}