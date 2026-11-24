// Regenerates docs/ACTIONS_SYSTEM.md from the model and the generated rules.
//   npm run gen:docs      rewrite the file
//   npm run check:docs    fail (exit 1) if it is out of date
import { buildSync } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildActionsDoc } from './actions-docs-lib.mjs';
import { extractBlock } from './rules-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = resolve(root, 'node_modules/.cache/rules-gen');
mkdirSync(cacheDir, { recursive: true });
const outfile = resolve(cacheDir, 'actions-docs-model.mjs');
buildSync({ entryPoints: [resolve(root, 'src/lib/actions/model.ts')], outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' });
const model = await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);

const rulesText = extractBlock(readFileSync(resolve(root, 'firestore.rules'), 'utf8'), 'ACTIONS') ?? '';
const doc = buildActionsDoc(model, rulesText) + '\n';
const target = resolve(root, 'docs/ACTIONS_SYSTEM.md');

if (process.argv.includes('--check')) {
  let have = '';
  try { have = readFileSync(target, 'utf8').replace(/\r\n/g, '\n'); } catch { /* missing */ }
  if (have !== doc) { console.error('docs/ACTIONS_SYSTEM.md is out of date. Run: npm run gen:docs'); process.exit(1); }
  console.log('docs/ACTIONS_SYSTEM.md is up to date.');
} else {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, doc);
  console.log('Wrote docs/ACTIONS_SYSTEM.md');
}
