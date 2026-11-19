// Deletes the old permit-workflow files that the new system replaces. Safe to run twice.
//   node scripts/remove-old-ptw-files.mjs
import { existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const old = [
  'src/contexts/PtwWorkflowContext.tsx',   // replaced by src/hooks/usePtwController.ts
  'src/utils/workflowEngine.ts',           // replaced by src/lib/ptw/engine.ts
  'src/utils/ptwLogic.ts',                 // replaced by src/lib/ptw/validity.ts and gates.ts
  'src/components/GasTestLogSection.tsx',  // replaced by src/components/ptw/GasTestLogSection.tsx
];
let removed = 0;
for (const f of old) {
  const p = resolve(root, f);
  if (existsSync(p)) { rmSync(p); removed++; console.log('removed', f); } else console.log('already gone', f);
}
console.log(removed ? `Done. Now stage the deletions: git rm --cached ${old.join(' ')}` : 'Nothing to remove.');
