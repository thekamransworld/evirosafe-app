// One-off import of the three old action stores into the new `actions` documents:
//   actions              the old Action Tracker's standalone actions
//   corrective_actions   the old CAR register
//   reports[].capa[]     the corrective / preventive items embedded in every incident report
//
//   node scripts/migrate-actions.mjs --email YOUR_ADMIN_EMAIL                DRY RUN: reads, reports, writes nothing
//   node scripts/migrate-actions.mjs --email YOUR_ADMIN_EMAIL --apply        writes (asks you to type IMPORT first)
//   (type your real login email in place of YOUR_ADMIN_EMAIL: no < > brackets, Windows treats them as redirection)
//
// Options
//   --email ADDRESS            the administrator's login (ADMIN or ORG_ADMIN). The password is asked for, hidden.
//   --org ID                   organisation to import (only the platform ADMIN needs this; others use their own)
//   --default-project ID       project for old actions that have none (otherwise they are visible to administrators only)
//   --limit N                  import only the first N (to try it on a few records first)
//   --yes                      do not ask for the IMPORT confirmation
//
// What it does NOT do: it never changes or deletes an old record. Each new document has a fixed id
// (imp_act_..., imp_car_..., imp_capa_...), so running it again skips what is already imported, and a run that
// stopped half way can simply be run again. The database rules decide whether each write is allowed; they only
// allow this for administrators. The old collections stay as they are until you decide to remove them.
//
// Uses the same Firebase project the app uses (read from src/firebase.ts, or VITE_FIREBASE_* variables).

import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import readline from 'node:readline';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

import { describeSignInError, parseArgs, runMigration } from './migrate-actions-lib.mjs';

// ─── command line ─────────────────────────────────────────────────────────

function ask(question, { hidden = false } = {}) {
  return new Promise(resolveAnswer => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    if (hidden) {
      // After the prompt is on screen, nothing typed is echoed, and nothing is redrawn when you press backspace.
      const write = rl._writeToOutput.bind(rl);
      rl._writeToOutput = s => { if (!muted) write(s); };
    }
    rl.question(question, answer => { muted = false; rl.close(); try { process.stdin.pause(); } catch { /* not a terminal */ } if (hidden) process.stdout.write('\n'); resolveAnswer(answer); });
    muted = hidden;
  });
}

/** The Firebase web config the app itself uses (public identifiers, not secrets): the env vars, or the defaults in src/firebase.ts. */
function readFirebaseConfig() {
  const src = readFileSync(resolve(root, 'src/firebase.ts'), 'utf8');
  const field = (name, env) => process.env[env] || (new RegExp(`${name}:\\s*import\\.meta\\.env\\.\\w+\\s*\\|\\|\\s*"([^"]+)"`).exec(src)?.[1]);
  const cfg = {
    apiKey: field('apiKey', 'VITE_FIREBASE_API_KEY'), authDomain: field('authDomain', 'VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: field('projectId', 'VITE_FIREBASE_PROJECT_ID'), appId: field('appId', 'VITE_FIREBASE_APP_ID'),
  };
  for (const [k, v] of Object.entries(cfg)) if (!v) throw new Error(`Could not find the Firebase ${k}. Set VITE_FIREBASE_* or check src/firebase.ts.`);
  return cfg;
}

/**
 * Ends the program. Calling process.exit() while the terminal handle is still closing crashes Node on Windows
 * ("Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)"), so the exit code is set, the terminal is released,
 * and Node is left to end by itself; the forced exit is only a fallback for connections that keep it alive.
 */
function finish(code) {
  process.exitCode = code;
  try { process.stdin.pause(); } catch { /* not a terminal */ }
  setTimeout(() => process.exit(code), 1500).unref();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.errors.length) {
    if (args.errors.length) console.error(args.errors.map(e => `Error: ${e}`).join('\n') + '\n');
    // The help is the comment block at the top of this file.
    const help = [];
    for (const l of readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n')) { if (l.startsWith('//')) help.push(l.replace(/^\/\/ ?/, '')); else if (l.trim() === '' && help.length) help.push(''); else break; }
    console.log(help.join('\n').trim());
    process.exit(args.errors.length ? 2 : 0);
  }
  if (!args.email) { console.error('Error: --email is required (the administrator login).'); process.exit(2); }

  // The pure code (mapping, numbering, the document builder) is the same TypeScript the app and its tests use.
  const { buildSync } = await import('esbuild');
  const cache = resolve(root, 'node_modules/.cache/migrate');
  mkdirSync(cache, { recursive: true });
  const outfile = resolve(cache, 'lib.mjs');
  buildSync({
    stdin: {
      contents: [
        "export { planImport, buildImportAction } from './src/lib/actions/migrate';",
        "export { IMPORT_ROLES } from './src/lib/actions/model';",
        "export { resolveSentinels } from './src/lib/shared/writes';",
        "export { counterDocId } from './src/lib/shared/counters';",
      ].join('\n'),
      resolveDir: root, loader: 'ts', sourcefile: 'migrate-entry.ts',
    },
    outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
  });
  const lib = await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);

  const { initializeApp, deleteApp } = await import('firebase/app');
  const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
  const fs = await import('firebase/firestore');
  const app = initializeApp(readFirebaseConfig(), 'migrate-actions');
  const closeApp = async () => { try { await deleteApp(app); } catch { /* already closed */ } };
  const db = fs.getFirestore(app);

  const password = await ask(`Password for ${args.email} (what you type is not shown): `, { hidden: true });
  let cred;
  try { cred = await signInWithEmailAndPassword(getAuth(app), args.email, password); }
  catch (e) {
    console.error(`\nCould not sign in. ${describeSignInError(e.code)}`);
    await closeApp();
    return finish(1);
  }

  const io = {
    log: m => console.log(m),
    getPointer: async uid => {
      const s = await fs.getDoc(fs.doc(db, 'users_by_uid', uid));
      if (!s.exists()) return null;
      const p = s.data();
      let name = '';
      try { const u = await fs.getDoc(fs.doc(db, 'users', p.docId)); name = u.exists() ? (u.data().name || '') : ''; } catch { /* the name is only for the history */ }
      return { docId: p.docId, org_id: p.org_id, role: p.role, name };
    },
    readCollection: async (name, orgId) => (await fs.getDocs(fs.query(fs.collection(db, name), fs.where('org_id', '==', orgId)))).docs.map(d => ({ ...d.data(), id: d.id })),
    getCounter: async (orgId, year) => {
      const s = await fs.getDoc(fs.doc(db, 'counters', lib.counterDocId('act', orgId, year)));
      return s.exists() ? Number(s.data().value) : 0;
    },
    importOne: (c, x) => fs.runTransaction(db, async tx => {
      const ref = fs.doc(db, 'actions', c.id);
      if ((await tx.get(ref)).exists()) return 'exists';
      const counterRef = fs.doc(db, 'counters', lib.counterDocId('act', x.orgId, x.year));
      const cs = await tx.get(counterRef);
      const n = (cs.exists() ? Number(cs.data().value) : 0) + 1;
      const built = lib.buildImportAction(c, { orgId: x.orgId, importer: x.importer, year: x.year, n, now: x.now });
      if (cs.exists()) tx.update(counterRef, { value: n }); else tx.set(counterRef, built.counter);
      tx.set(ref, lib.resolveSentinels(built.action, s => (s.__sentinel === 'serverTimestamp' ? fs.serverTimestamp() : s.__sentinel === 'timestamp' ? fs.Timestamp.fromMillis(s.ms) : fs.deleteField())));
      return 'created';
    }),
    confirm: async text => (await ask(text)).trim() === 'IMPORT',
  };

  const result = await runMigration({ args, uid: cred.user.uid, email: args.email, io, lib });
  await closeApp();
  finish(result.exitCode);
}

main().catch(e => { console.error(e); finish(1); });
