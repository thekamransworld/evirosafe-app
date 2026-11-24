// Kept so `node scripts/test-ptw.mjs` keeps working: the permit suite of scripts/run-tests.mjs.
process.argv[2] = 'ptw';
await import('./run-tests.mjs');
