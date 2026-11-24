# Actions: corrective and preventive actions

> Generated from `src/lib/actions/model.ts` and the generated Firestore rules. Do not edit by hand.
> Regenerate with `npm run gen:docs`; `npm run check:docs` fails if this file is out of date.

## What it is

One list of every corrective, preventive and improvement action, whatever raised it: an incident, an inspection, an audit,
a plan, an observation, or a person on the site. It replaces three older stores that held the same thing:
the Action Tracker (`actions`), the CAR register (`corrective_actions`) and the `capa[]` list inside every incident report.

## Stages

| Stage | Meaning |
|---|---|
| Open (`OPEN`) | Raised and assigned. The owner starts work, or marks it completed with a note. |
| In progress (`IN_PROGRESS`) | The owner is working on it. Progress notes can be added at any time. |
| Completed, awaiting verification (`COMPLETED`) | The owner says it is done. Someone other than the owner (and other than whoever recorded the completion) must verify it before it closes. |
| Closed (verified) (`CLOSED`) | Verified and closed. An approver can reopen it with a written reason. |
| Cancelled (`CANCELLED`) | Cancelled with a reason. An approver can reopen it. |

Overdue is not a stage: an action is overdue when it is open or in progress and its due date is before today. It is worked out each time it is shown, never stored.

## Steps: who may do what

| Step | From | To | Roles allowed | Who exactly | Written note | Also changes |
|---|---|---|---|---|---|---|
| Start work | Open | In progress | admin, org admin, hse manager, hse officer, supervisor, inspector, worker, custom site lead | the owner (the person it is assigned to) | no |  |
| Mark completed | Open, In progress | Completed, awaiting verification | admin, org admin, hse manager, hse officer, supervisor, inspector, worker, custom site lead | the owner (the person it is assigned to) | required | `completion` |
| Verify and close | Completed, awaiting verification | Closed (verified) | admin, org admin, hse manager, hse officer, supervisor, inspector, custom site lead | someone who is NOT the owner and did NOT record the completion | required | `verification` |
| Send back (not done) | Completed, awaiting verification | In progress | admin, org admin, hse manager, hse officer, supervisor, inspector, custom site lead | someone who is NOT the owner and did NOT record the completion | required |  |
| Add progress note | Open, In progress, Completed, awaiting verification | (stays) | admin, org admin, hse manager, hse officer, supervisor, inspector, worker, custom site lead | anyone with an allowed role | required |  |
| Change owner, due date or priority | Open, In progress | (stays) | admin, org admin, hse manager, hse officer, supervisor, inspector, custom site lead | anyone with an allowed role | required | `due_date`, `owner_id`, `priority` |
| Withdraw (raised in error) | Open | Cancelled | admin, org admin, hse manager, hse officer, supervisor, inspector, custom site lead | the person who raised it | required |  |
| Cancel | Open, In progress, Completed, awaiting verification | Cancelled | admin, org admin, hse manager | anyone with an allowed role | required |  |
| Reopen | Closed (verified), Cancelled | Open | admin, org admin, hse manager | anyone with an allowed role | required |  |

- **Segregation of duties.** The owner cannot verify their own work, and neither can the person who recorded the completion.
- **Administrator override.** admin, org admin can do an owner, creator or verifier step they are not entitled to, but only with a written justification of at least 10 characters. It is recorded in the history and flagged.
- **Written notes** are at least 5 characters and at most 1000.
- **Signed records.** Completing and verifying stamp a record (who, the database's own time, the note). The person and the time cannot be set by the browser.
- **History** is append-only: the database refuses any write that changes or removes an earlier entry.

## Who may raise and edit

- Raise an action: admin, org admin, hse manager, hse officer, supervisor, inspector, custom site lead. Anyone with a staff role can be the owner.
- Edit the title, details and the corrective-action section while the action is open, in progress or completed (not once it is closed or cancelled): the person who raised it or an approver; the corrective-action section also by a reviewer who is not the owner.
- Delete: nobody. A numbered action is cancelled with a reason instead. Old unnumbered actions can be deleted by an administrator after they have been imported.

## Fields

| Field | Notes |
|---|---|
| `number` | `ACT-YYYY-NNNN`, one counter per organisation per year, taken in the same transaction that creates the action, so a number is never skipped or reused |
| `title` | what has to be done; at most 200 characters |
| `description` | optional; at most 4000 characters |
| `kind` | `corrective`, `preventive`, `improvement` |
| `priority` | `low`, `medium`, `high`, `critical` |
| `owner_id`, `creator_id` | users-collection document ids |
| `project_id` | required for a new action; decides who can see it |
| `due_date` | `YYYY-MM-DD` |
| `source` | `type`: `incident`, `inspection`, `audit`, `plan`, `observation`, `manual`; `id` (required unless raised directly), `ref`, `item` |
| `car` | optional corrective-action section: `root_cause`, `effectiveness_plan`, `effectiveness_result` (at most 2000 characters each) |
| `completion`, `verification` | `{by, at, note}` stamped by the step; `at` is database time |
| `history` | append-only list of what happened, by whom, with notes, overrides and changes |
| `stage_times`, `last_transition_at`, `created_at`, `updated_at` | database time |
| `imported`, `import_source`, `import_ref`, `legacy` | only on actions copied from the old stores; `legacy` keeps the old record whole |

## Who is told

Never the person who did the step. Only active people of the same organisation. A notification is private to its recipient.

| After | Told |
|---|---|
| Raised | the owner |
| Start work | the person who raised it |
| Mark completed | the person who raised it, the reviewers of the project (not the owner) |
| Verify and close | the owner, the person who raised it |
| Send back (not done) | the owner |
| Add progress note | the owner, the person who raised it |
| Change owner, due date or priority | the owner, the previous owner (when the owner changed) |
| Withdraw (raised in error) | the owner, the person who raised it |
| Cancel | the owner, the person who raised it |
| Reopen | the owner, the person who raised it |

There is no automatic reminder for an action that becomes overdue: that needs a scheduled server job, which this app does not have yet. Overdue actions show in red on the tracker, on the dashboard and in the KPI figures.

## Defaults to confirm with the client's procedure

These are reasonable starting points, not facts about the client. Change them in `model.ts` and the screens and the database follow.

1. Days allowed by priority (pre-fills the due date): low 30, medium 14, high 7, critical 1.
2. Who may raise an action: admin, org admin, hse manager, hse officer, supervisor, inspector, custom site lead (a worker can own one, not raise one).
3. Who may verify: admin, org admin, hse manager, hse officer, supervisor, inspector, custom site lead, never the owner or the person who recorded the completion.
4. Who may cancel or reopen: admin, org admin, hse manager.
5. Verification needs a written note, not a form: the note says what was checked.
6. Corrective actions do not require a root cause to be recorded before closing; the section is optional.
7. "Overdue" uses the date on the reader's device. An action due today is not overdue until tomorrow.

## Import of the old stores

Run once, by an administrator, from the project folder. It never changes or deletes an old record. Use your real login email in place of YOUR_ADMIN_EMAIL (no `<` `>` brackets: Windows treats them as redirection).

```
node scripts/migrate-actions.mjs --email YOUR_ADMIN_EMAIL            # dry run: reads and reports only
node scripts/migrate-actions.mjs --email YOUR_ADMIN_EMAIL --apply    # writes, after you type IMPORT
```

Each new action gets a fixed id (`imp_act_...`, `imp_car_...`, `imp_capa_...`), so running it twice cannot duplicate anything, and a run that stopped half way can be run again. Records are numbered oldest first. Old actions that have no project are visible to administrators only: pass `--default-project PROJECT_ID` to place them.

Until the import has run, the tracker lists the old actions read-only under a notice, and the old CAR register and the capa lists inside reports are not shown in the new tracker.

## What the database enforces, and what it does not

```
ENFORCED HERE   who may raise an action, and who may do each step (role, owner / creator / verifier,
                and the administrator override); the owner and the person who recorded the completion
                can never verify it; a signed completion / verification record stamped with server
                time; an append-only history; server-stamped times; numbers from the yearly counter;
                no deletion of numbered actions; the one-off import by administrators.
NOT ENFORCED    that the owner is really a person of this organisation (a rule cannot look a person
                up by document id), that a due date is in the future, and anything about the words in
                a note beyond its length.
```

## Known limits

- The rules cannot check that the owner is a real person of the organisation, or that the number printed on an action equals its counter value (only its format).
- The Firestore emulator cannot run in this setup, so the rules are tested with the in-repo interpreter (`tests/helpers/rulesSim.ts`) and by deploying; the first real use on the live database is the final test.
- Attachments (photos) on actions are not supported yet: file storage has not been decided. The old CAR evidence links are kept, read-only, in the imported record.

