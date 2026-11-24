// Builds docs/ACTIONS_SYSTEM.md from the model (src/lib/actions/model.ts) and the generated rules text, so the
// documentation cannot disagree with what the app and the database actually do. Pure: no file access.

const cell = s => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const names = a => a.map(x => `\`${x}\``).join(', ');
const roleList = roles => roles.map(r => r.replace(/_/g, ' ').toLowerCase()).join(', ');
const stageLabel = (m, s) => m.STAGE_LABEL[s];

const WHO = {
  any: 'anyone with an allowed role',
  owner: 'the owner (the person it is assigned to)',
  verifier: 'someone who is NOT the owner and did NOT record the completion',
  creator: 'the person who raised it',
};

export function buildActionsDoc(m, rulesText = '') {
  const steps = Object.values(m.ACTIONS);
  const out = [];
  const p = (...l) => out.push(...l);

  p('# Actions: corrective and preventive actions',
    '',
    '> Generated from `src/lib/actions/model.ts` and the generated Firestore rules. Do not edit by hand.',
    '> Regenerate with `npm run gen:docs`; `npm run check:docs` fails if this file is out of date.',
    '',
    '## What it is',
    '',
    'One list of every corrective, preventive and improvement action, whatever raised it: an incident, an inspection, an audit,',
    'a plan, an observation, or a person on the site. It replaces three older stores that held the same thing:',
    'the Action Tracker (`actions`), the CAR register (`corrective_actions`) and the `capa[]` list inside every incident report.',
    '',
    '## Stages',
    '',
    '| Stage | Meaning |', '|---|---|',
    ...m.STAGES.map(s => `| ${stageLabel(m, s)} (\`${s}\`) | ${cell(m.STAGE_HELP[s])} |`),
    '',
    'Overdue is not a stage: an action is overdue when it is open or in progress and its due date is before today. It is worked out each time it is shown, never stored.',
    '',
    '## Steps: who may do what',
    '',
    '| Step | From | To | Roles allowed | Who exactly | Written note | Also changes |', '|---|---|---|---|---|---|---|',
    ...steps.map(d => `| ${d.label} | ${d.from.map(s => stageLabel(m, s)).join(', ')} | ${d.to === 'SAME' ? '(stays)' : stageLabel(m, d.to)} | ${roleList(d.roles)} | ${WHO[d.actor]} | ${d.reason ? 'required' : 'no'} | ${d.writes.length ? names(d.writes) : ''} |`),
    '',
    '- **Segregation of duties.** The owner cannot verify their own work, and neither can the person who recorded the completion.',
    `- **Administrator override.** ${roleList(m.OVERRIDERS)} can do an owner, creator or verifier step they are not entitled to, but only with a written justification of at least ${m.MIN_JUSTIFICATION_CHARS} characters. It is recorded in the history and flagged.`,
    `- **Written notes** are at least ${m.MIN_REASON_CHARS} characters and at most ${m.MAX.note}.`,
    '- **Signed records.** Completing and verifying stamp a record (who, the database\'s own time, the note). The person and the time cannot be set by the browser.',
    '- **History** is append-only: the database refuses any write that changes or removes an earlier entry.',
    '',
    '## Who may raise and edit',
    '',
    `- Raise an action: ${roleList(m.CREATE_ROLES)}. Anyone with a staff role can be the owner.`,
    '- Edit the title, details and the corrective-action section while the action is open, in progress or completed (not once it is closed or cancelled): the person who raised it or an approver; the corrective-action section also by a reviewer who is not the owner.',
    '- Delete: nobody. A numbered action is cancelled with a reason instead. Old unnumbered actions can be deleted by an administrator after they have been imported.',
    '',
    '## Fields',
    '',
    '| Field | Notes |', '|---|---|',
    '| `number` | `ACT-YYYY-NNNN`, one counter per organisation per year, taken in the same transaction that creates the action, so a number is never skipped or reused |',
    `| \`title\` | what has to be done; at most ${m.MAX.title} characters |`,
    `| \`description\` | optional; at most ${m.MAX.description} characters |`,
    `| \`kind\` | ${m.KINDS.map(k => `\`${k}\``).join(', ')} |`,
    `| \`priority\` | ${m.PRIORITIES.map(k => `\`${k}\``).join(', ')} |`,
    '| `owner_id`, `creator_id` | users-collection document ids |',
    '| `project_id` | required for a new action; decides who can see it |',
    '| `due_date` | `YYYY-MM-DD` |',
    `| \`source\` | \`type\`: ${m.SOURCE_TYPES.map(k => `\`${k}\``).join(', ')}; \`id\` (required unless raised directly), \`ref\`, \`item\` |`,
    `| \`car\` | optional corrective-action section: ${m.CAR_KEYS.map(k => `\`${k}\``).join(', ')} (at most ${m.MAX.car} characters each) |`,
    '| `completion`, `verification` | `{by, at, note}` stamped by the step; `at` is database time |',
    '| `history` | append-only list of what happened, by whom, with notes, overrides and changes |',
    '| `stage_times`, `last_transition_at`, `created_at`, `updated_at` | database time |',
    '| `imported`, `import_source`, `import_ref`, `legacy` | only on actions copied from the old stores; `legacy` keeps the old record whole |',
    '',
    '## Who is told',
    '',
    'Never the person who did the step. Only active people of the same organisation. A notification is private to its recipient.',
    '',
    '| After | Told |', '|---|---|',
    ...Object.entries(m.NOTIFY).map(([step, who]) => `| ${step === 'create' ? 'Raised' : m.ACTIONS[step].label} | ${who.map(w => m.AUDIENCE_LABEL[w]).join(', ')} |`),
    '',
    'There is no automatic reminder for an action that becomes overdue: that needs a scheduled server job, which this app does not have yet. Overdue actions show in red on the tracker, on the dashboard and in the KPI figures.',
    '',
    '## Defaults to confirm with the client\'s procedure',
    '',
    'These are reasonable starting points, not facts about the client. Change them in `model.ts` and the screens and the database follow.',
    '',
    `1. Days allowed by priority (pre-fills the due date): ${m.PRIORITIES.map(k => `${k} ${m.PRIORITY_DUE_DAYS[k]}`).join(', ')}.`,
    `2. Who may raise an action: ${roleList(m.CREATE_ROLES)} (a worker can own one, not raise one).`,
    `3. Who may verify: ${roleList(m.ACTIONS.verify.roles)}, never the owner or the person who recorded the completion.`,
    `4. Who may cancel or reopen: ${roleList(m.ACTIONS.cancel.roles)}.`,
    '5. Verification needs a written note, not a form: the note says what was checked.',
    '6. Corrective actions do not require a root cause to be recorded before closing; the section is optional.',
    '7. "Overdue" uses the date on the reader\'s device. An action due today is not overdue until tomorrow.',
    '',
    '## Import of the old stores',
    '',
    'Run once, by an administrator, from the project folder. It never changes or deletes an old record. Use your real login email in place of YOUR_ADMIN_EMAIL (no `<` `>` brackets: Windows treats them as redirection).',
    '',
    '```',
    'node scripts/migrate-actions.mjs --email YOUR_ADMIN_EMAIL            # dry run: reads and reports only',
    'node scripts/migrate-actions.mjs --email YOUR_ADMIN_EMAIL --apply    # writes, after you type IMPORT',
    '```',
    '',
    'Each new action gets a fixed id (`imp_act_...`, `imp_car_...`, `imp_capa_...`), so running it twice cannot duplicate anything, and a run that stopped half way can be run again. Records are numbered oldest first. Old actions that have no project are visible to administrators only: pass `--default-project PROJECT_ID` to place them.',
    '',
    'Until the import has run, the tracker lists the old actions read-only under a notice, and the old CAR register and the capa lists inside reports are not shown in the new tracker.',
    '',
    '## What the database enforces, and what it does not',
    '');
  const hdr = /\/\/ ENFORCED HERE[\s\S]*?(?=\n\s*\/\/ >>>|\n\s*function)/.exec(rulesText);
  if (hdr) {
    const text = hdr[0].split('\n').map(l => l.replace(/^\s*\/\/ ?/, '')).join('\n').trim();
    p('```', text, '```', '');
  } else {
    p('(See the header of the ACTIONS section in `firestore.rules`.)', '');
  }
  p('## Known limits',
    '',
    '- The rules cannot check that the owner is a real person of the organisation, or that the number printed on an action equals its counter value (only its format).',
    '- The Firestore emulator cannot run in this setup, so the rules are tested with the in-repo interpreter (`tests/helpers/rulesSim.ts`) and by deploying; the first real use on the live database is the final test.',
    '- Attachments (photos) on actions are not supported yet: file storage has not been decided. The old CAR evidence links are kept, read-only, in the imported record.',
    '');
  return out.join('\n');
}
