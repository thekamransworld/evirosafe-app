// Deletes the old action screens that the new Action Tracker replaces. Safe to run twice.
//   node scripts/remove-old-actions-files.mjs
import { existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const old = [
  'src/components/CorrectiveActions.tsx',    // the CAR register: merged into the Action Tracker (src/components/actions/)
  'src/components/ActionCreationModal.tsx',  // replaced by src/components/actions/ActionCreateModal.tsx
];
let removed = 0;
for (const f of old) {
  const p = resolve(root, f);
  if (existsSync(p)) { rmSync(p); removed++; console.log('removed', f); } else console.log('already gone', f);
}
console.log(removed ? `Done. Now stage the deletions: git rm --cached ${old.join(' ')}` : 'Nothing to remove.');
