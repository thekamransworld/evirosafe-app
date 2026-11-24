// The import flow, with every outside effect (sign-in, reading, writing, asking) behind `io`, so the tests can
// drive it against an in-memory database judged by the generated rules. The command-line wrapper is
// scripts/migrate-actions.mjs. Nothing here runs on import.

export function parseArgs(argv) {
  const a = { apply: false, yes: false, email: '', org: '', defaultProject: '', limit: Infinity, help: false, errors: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const val = () => { const v = argv[++i]; if (v === undefined || v.startsWith('--')) { a.errors.push(`${k} needs a value`); return ''; } return v; };
    if (k === '--apply') a.apply = true;
    else if (k === '--yes') a.yes = true;
    else if (k === '--help' || k === '-h') a.help = true;
    else if (k === '--email') a.email = val();
    else if (k === '--org') a.org = val();
    else if (k === '--default-project') a.defaultProject = val();
    else if (k === '--limit') { const v = val(); if (v !== '') { const n = Number(v); if (!Number.isInteger(n) || n < 1) a.errors.push('--limit needs a whole number of 1 or more'); else a.limit = n; } }
    else a.errors.push(`unknown option ${k}`);
  }
  if (a.email && !looksLikeEmail(a.email)) {
    a.errors.push(`"${a.email}" is not an email address. Type the email you sign in to EviroSafe with, for example name@company.com (not the words in the instructions).`);
  }
  return a;
}

/** Something@something.something, nothing odd in it. Not a full validation: it catches a placeholder left in. */
export function looksLikeEmail(s) {
  return /^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/.test(String(s || ''));
}

/** A plain sentence for a Firebase sign-in error code. */
export function describeSignInError(code) {
  switch (code) {
    case 'auth/invalid-email': return 'That is not a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'The email or the password is wrong.';
    case 'auth/too-many-requests': return 'Too many attempts. Wait a few minutes and try again.';
    case 'auth/user-disabled': return 'This account is disabled.';
    case 'auth/network-request-failed': return 'Could not reach Firebase. Check the internet connection.';
    default: return `Could not sign in (${code || 'unknown error'}).`;
  }
}

const pad = n => String(n).padStart(4, '0');
const localDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * The whole flow, with every outside effect behind `io`, so the tests can drive it against an in-memory database
 * judged by the generated rules.
 * @param io { log, getPointer(uid), readCollection(name, orgId), getCounter(orgId, year), importOne(candidate, ctx), confirm(text) }
 * @param lib { planImport, buildImportAction, IMPORT_ROLES }
 */
export async function runMigration({ args, uid, email, io, lib, now = new Date() }) {
  const { planImport, IMPORT_ROLES } = lib;
  const fail = (msg) => { io.log(`\nStopped: ${msg}`); return { exitCode: 1, created: 0, exists: 0, failed: [] }; };

  const pointer = await io.getPointer(uid);
  if (!pointer || !pointer.docId || !pointer.role) return fail('your login has no user record. Sign in with an administrator account of the app.');
  if (!IMPORT_ROLES.includes(pointer.role)) return fail(`your role (${pointer.role}) cannot run the import. It needs ADMIN or ORG_ADMIN.`);
  const orgId = args.org || pointer.org_id;
  if (!orgId) return fail('no organisation. Pass --org ORG_ID.');
  if (pointer.role !== 'ADMIN' && orgId !== pointer.org_id) return fail(`you can only import your own organisation (${pointer.org_id}).`);

  io.log(`Signed in as ${email || pointer.docId} (${pointer.role}); organisation ${orgId}.`);
  io.log(args.apply ? 'MODE: APPLY (new documents will be written).' : 'MODE: DRY RUN (nothing will be written).');
  io.log('Reading the old records...');

  const [actions, corrective_actions, reports] = await Promise.all([
    io.readCollection('actions', orgId), io.readCollection('corrective_actions', orgId), io.readCollection('reports', orgId),
  ]);
  io.log(`  actions: ${actions.length}   corrective_actions: ${corrective_actions.length}   reports: ${reports.length}`);

  const reportProjects = {};
  for (const r of reports) if (r.id && r.project_id) reportProjects[r.id] = r.project_id;
  const importer = { id: pointer.docId, name: pointer.name || email || pointer.docId, role: pointer.role };
  const ctx = { orgId, importer, today: localDate(now), reportProjects, ...(args.defaultProject ? { defaultProjectId: args.defaultProject } : {}) };
  const existingIds = new Set(actions.map(a => a.id));
  const plan = planImport({ actions, corrective_actions, reports }, existingIds, ctx);

  const year = now.getUTCFullYear(); // the database rules check the UTC year
  const counter = await io.getCounter(orgId, year);
  const todo = plan.toCreate.slice(0, args.limit);
  const noProject = todo.filter(c => !c.fields.project_id).length;

  io.log('\nImport plan');
  io.log(`  Old Action Tracker actions ........ ${plan.counts.actions}`);
  io.log(`  Old CAR register ................... ${plan.counts.corrective_actions}`);
  io.log(`  Incident corrective/preventive items ${plan.counts.report_capa}`);
  io.log(`  Already imported (skipped) ......... ${plan.alreadyImported}`);
  io.log(`  Nothing to import (skipped) ........ ${plan.skipped.length}${plan.skipped.length ? '  e.g. ' + plan.skipped.slice(0, 3).map(s => `${s.ref} (${s.reason})`).join('; ') : ''}`);
  io.log(`  Without a project .................. ${noProject}${noProject && !args.defaultProject ? '  (visible to administrators only; use --default-project PROJECT_ID to place them)' : ''}`);
  if (todo.length) io.log(`  New numbers ........................ ACT-${year}-${pad(counter + 1)} to ACT-${year}-${pad(counter + todo.length)}, oldest record first`);
  if (args.limit !== Infinity && plan.toCreate.length > todo.length) io.log(`  (--limit ${args.limit}: only the first ${todo.length} of ${plan.toCreate.length})`);
  if (plan.warnings.length) {
    io.log(`\nThings to know (${plan.warnings.length}):`);
    for (const w of plan.warnings.slice(0, 25)) io.log(`  - ${w.ref}: ${w.warning}`);
    if (plan.warnings.length > 25) io.log(`  ... and ${plan.warnings.length - 25} more`);
  }

  if (!args.apply) {
    io.log(todo.length ? '\nNothing was written. To import these, run the same command again with --apply.' : '\nNothing to import.');
    return { exitCode: 0, created: 0, exists: 0, failed: [], planned: todo.length };
  }
  if (!todo.length) { io.log('\nNothing to import.'); return { exitCode: 0, created: 0, exists: 0, failed: [], planned: 0 }; }
  if (!args.yes && !(await io.confirm(`\nThis writes ${todo.length} new action(s). Old records are not changed. Type IMPORT to continue: `))) {
    io.log('Cancelled. Nothing was written.');
    return { exitCode: 0, created: 0, exists: 0, failed: [], planned: todo.length };
  }

  let created = 0, exists = 0, consecutive = 0;
  const failed = [];
  for (const [i, c] of todo.entries()) {
    try {
      const r = await io.importOne(c, { orgId, importer, year, now: Date.now() });
      if (r === 'exists') exists++; else created++;
      consecutive = 0;
    } catch (e) {
      consecutive++;
      failed.push({ ref: c.ref, code: e?.code, message: e?.message });
      io.log(`  FAILED ${c.ref}: ${e?.code || ''} ${e?.message || e}`);
      if (consecutive >= 3) { io.log('Three failures in a row: stopping. Fix the cause and run again; what was imported is kept.'); break; }
    }
    if ((i + 1) % 10 === 0 || i === todo.length - 1) io.log(`  ${i + 1} of ${todo.length} processed (${created} created, ${exists} already there, ${failed.length} failed)`);
  }
  io.log(`\nDone. Created ${created}, already there ${exists}, failed ${failed.length}. The old records were not changed.`);
  if (failed.length) io.log('Run the command again to retry the failed ones: it skips everything already imported.');
  return { exitCode: failed.length ? 1 : 0, created, exists, failed, planned: todo.length };
}

