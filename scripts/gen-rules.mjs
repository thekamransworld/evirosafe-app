// Regenerates the generated sections of firestore.rules from the models:
//   COMMON   src/lib/shared/*          role helpers, project scope, yearly counters, notifications
//   PTW      src/lib/ptw/model.ts      permits to work
//   ACTIONS  src/lib/actions/model.ts  corrective and preventive actions
//
//   npm run gen:rules              rewrite the sections in firestore.rules
//   npm run check:rules            fail (exit 1) if the file is out of date
//   node scripts/gen-rules.mjs --print    show the generated sections
// (npm run gen:ptw-rules and check:ptw-rules run this same script.)
import { buildSync } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildAllRules, extractBlock, spliceAll } from './rules-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rulesPath = resolve(root, 'firestore.rules');
const cacheDir = resolve(root, 'node_modules/.cache/rules-gen');
mkdirSync(cacheDir, { recursive: true });

async function load(src, name) {
  const outfile = resolve(cacheDir, `${name}.mjs`);
  buildSync({ entryPoints: [resolve(root, src)], outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' });
  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

const models = {
  shared: {
    roles: await load('src/lib/shared/roles.ts', 'roles'),
    notifications: await load('src/lib/shared/notifications.ts', 'notifications'),
  },
  ptw: await load('src/lib/ptw/model.ts', 'ptw'),
  actions: await load('src/lib/actions/model.ts', 'actions'),
};
const { blocks } = buildAllRules(models);

const mode = process.argv.includes('--check') ? 'check' : process.argv.includes('--print') ? 'print' : 'write';
const current = readFileSync(rulesPath, 'utf8');

if (mode === 'print') {
  for (const b of blocks) console.log(b.text + '\n');
} else if (mode === 'check') {
  let bad = 0;
  for (const b of blocks) {
    const have = extractBlock(current, b.key);
    if (have === null) { console.error(`firestore.rules has no generated ${b.key} section yet. Run: npm run gen:rules`); bad++; }
    else if (have !== b.text) { console.error(`The ${b.key} section of firestore.rules is out of date. Run: npm run gen:rules`); bad++; }
  }
  if (bad) process.exit(1);
  console.log('Generated rules are up to date.');
} else {
  writeFileSync(rulesPath, spliceAll(current, blocks));
  console.log('Wrote the generated sections of firestore.rules. Review the diff, then: firebase deploy --only firestore:rules');
}
