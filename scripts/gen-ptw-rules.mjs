// Regenerates the PTW section of firestore.rules from src/lib/ptw/model.ts.
//
//   npm run gen:ptw-rules          rewrite the section in firestore.rules
//   npm run check:ptw-rules        fail (exit 1) if the file is out of date
//   node scripts/gen-ptw-rules.mjs --print    show the generated section
import { buildSync } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildPtwRules, extractBlock, spliceRules } from './ptw-rules-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rulesPath = resolve(root, 'firestore.rules');
const modelOut = resolve(root, 'node_modules/.cache/ptw-rules/model.mjs');
mkdirSync(dirname(modelOut), { recursive: true });

buildSync({
  entryPoints: [resolve(root, 'src/lib/ptw/model.ts')],
  outfile: modelOut,
  bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
});
const model = await import(pathToFileURL(modelOut).href);
const { text } = buildPtwRules(model);

const mode = process.argv.includes('--check') ? 'check' : process.argv.includes('--print') ? 'print' : 'write';
const current = readFileSync(rulesPath, 'utf8');

if (mode === 'print') {
  console.log(text);
} else if (mode === 'check') {
  const have = extractBlock(current);
  if (have === null) { console.error('firestore.rules has no generated PTW section yet. Run: npm run gen:ptw-rules'); process.exit(1); }
  if (have !== text) { console.error('The PTW section of firestore.rules is out of date. Run: npm run gen:ptw-rules'); process.exit(1); }
  console.log('PTW rules are up to date.');
} else {
  writeFileSync(rulesPath, spliceRules(current, text));
  console.log('Wrote the PTW section of firestore.rules. Review the diff, then: firebase deploy --only firestore:rules');
}
