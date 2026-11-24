// Bundles the tests with esbuild (so the TypeScript sources run as-is in Node) and runs them with the
// built-in test runner.
//   npm run test:ptw        the permit-to-work suite
//   npm run test:actions    the actions suite and the shared rules (counters, notifications)
//   npm run test:all        everything
//
//   PTW      tests/ptw.lib.test.ts          the permit engine, gates, validity, gas, SIMOPS
//            tests/ptw.rules.sim.test.ts    the generated Firestore rules, run against the engine
//            tests/ptw.rules.gen.test.ts    the rules generator and firestore.rules splicing
//            tests/ptw.service.test.ts      ptwService.ts end to end, with writes judged by the generated rules
//            tests/ptw.ui.test.tsx          the permit screens rendered with fixtures (no browser)
//            tests/ptw.public.test.tsx      the QR status page, the permit PDF, and course tagging
//   ACTIONS  tests/actions.*.test.ts(x)     engine, rules (against the engine and forged writes), service,
//                                           screens, and the one-off import
//   SHARED   tests/shared.*.test.ts         counters and notifications rules, the notification service
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outdir = resolve(root, 'node_modules/.cache/evirosafe-tests');
mkdirSync(outdir, { recursive: true });
const SUITES = {
  ptw: ['ptw.lib.test', 'ptw.rules.sim.test', 'ptw.rules.gen.test', 'ptw.service.test', 'ptw.ui.test', 'ptw.public.test'],
  actions: [
    'actions.lib.test', 'actions.rules.sim.test', 'actions.rules.gen.test', 'actions.service.test',
    'actions.ui.test', 'actions.migrate.test', 'shared.rules.test', 'shared.notifications.test',
  ],
};
SUITES.all = [...SUITES.ptw, ...SUITES.actions];
const suite = process.argv[2] ?? 'all';
if (!SUITES[suite]) { console.error(`Unknown suite "${suite}". Use one of: ${Object.keys(SUITES).join(', ')}`); process.exit(2); }
const names = SUITES[suite];

// The service and UI tests run the real source against in-memory stand-ins for Firebase and the app contexts.
// Windows paths use backslashes; compare importers with forward slashes so the stand-ins apply there too.
const fwd = p => String(p).replace(/\\/g, '/');
const fakeFirebase = {
  name: 'fake-firebase',
  setup(b) {
    b.onResolve({ filter: /^firebase\/firestore$/ }, () => ({ path: resolve(root, 'tests/helpers/fakeFirestore.ts') }));
    b.onResolve({ filter: /^firebase\/auth$/ }, () => ({ path: resolve(root, 'tests/helpers/fakeAuth.ts') }));
    b.onResolve({ filter: /\/firebase$/ }, a => (fwd(a.importer).includes('/src/') ? { path: resolve(root, 'tests/helpers/fakeFirebase.ts') } : undefined));
    b.onResolve({ filter: /\/contexts$/ }, a => (fwd(a.importer).includes('/src/components/') ? { path: resolve(root, 'tests/helpers/fakeContexts.tsx') } : undefined));
  },
};

// A test file that is not there (a partly extracted zip, say) is reported, not fatal.
const found = names
  .map(n => ({ n, file: [resolve(root, `tests/${n}.ts`), resolve(root, `tests/${n}.tsx`)].find(f => existsSync(f)) }));
const missing = found.filter(x => !x.file).map(x => x.n);
if (missing.length) console.warn(`\nWARNING: test file(s) not found, skipped: ${missing.map(n => `tests/${n}`).join(', ')}.\n         Extract the latest zip over the project again to get them.\n`);
const present = found.filter(x => x.file);

await build({
  entryPoints: present.map(x => x.file),
  outdir,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  logLevel: 'error',
  define: { 'import.meta.env': '{}' },
  jsx: 'automatic',
  // react-dom/server is CommonJS and requires Node built-ins; give the ES-module bundle a `require`.
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty' },
  plugins: [fakeFirebase],
});

const r = spawnSync(process.execPath, ['--test', ...present.map(x => resolve(outdir, `${x.n}.mjs`))], { stdio: 'inherit', cwd: root });
process.exit(r.status ?? 1);
