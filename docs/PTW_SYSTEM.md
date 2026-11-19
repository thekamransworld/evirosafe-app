# Permit to Work: how the system works

Generated from `src/lib/ptw/model.ts`, the single table the screens, the engine and the database rules all read.
If you change a rule, change it there, then run `npm run gen:ptw-rules` and `npm run test:ptw`.

## Stages and actions

| Action | From | To | Who | Reason | Password |
|---|---|---|---|---|---|
| Submit for approval | Draft | Awaiting pre-screen | any site staff (the person who raised it, or its receiver) |  |  |
| Pass pre-screen | Awaiting pre-screen | Site inspection | admin, org admin, hse manager, hse officer, supervisor, inspector, custom site lead (not the person who raised or received it) |  |  |
| Pass site inspection | Site inspection | Awaiting approval | admin, org admin, hse manager, hse officer, supervisor, inspector, custom site lead (not the person who raised or received it) |  |  |
| Approve | Awaiting approval | Ready for handover | admin, org admin, hse manager (not the person who raised or received it) |  | required |
| Accept handover & start work | Ready for handover | Active | any site staff (the person who raised it, or its receiver) |  | required |
| Stop work | Active | On hold | any site staff | required |  |
| Resume work | On hold | Active | admin, org admin, hse manager, hse officer, supervisor, inspector, custom site lead (not the person who raised or received it) | required |  |
| Revalidate (extend) | Active | Active | admin, org admin, hse manager, hse officer, supervisor, inspector, custom site lead (not the person who raised or received it) | required | required |
| Fail inspection | Completion pending | On hold | admin, org admin, hse manager, hse officer, supervisor, inspector, custom site lead (not the person who raised or received it) | required |  |
| Request completion | Active, On hold, Expired | Completion pending | any site staff (the person who raised it, or its receiver) |  |  |
| Close permit | Completion pending | Closed | admin, org admin, hse manager, hse officer, supervisor, inspector, custom site lead (not the person who raised or received it) |  | required |
| Send back for changes | Awaiting pre-screen, Site inspection, Awaiting approval | Draft | admin, org admin, hse manager, hse officer, supervisor, inspector, custom site lead (not the person who raised or received it) | required |  |
| Reject | Awaiting pre-screen, Site inspection, Awaiting approval | Rejected | admin, org admin, hse manager, hse officer, supervisor, inspector, custom site lead (not the person who raised or received it) | required |  |
| Withdraw | Draft, Awaiting pre-screen, Site inspection, Awaiting approval, Ready for handover | Cancelled | any site staff (the person who raised it, or its receiver) | required |  |
| Cancel permit | Awaiting pre-screen, Site inspection, Awaiting approval, Ready for handover, Active, On hold, Expired, Completion pending | Cancelled | admin, org admin, hse manager, hse officer, supervisor, inspector, custom site lead (not the person who raised or received it) | required |  |
| Mark expired | Active | Expired | any site staff (automatic; anyone may trigger it, the database checks the clock) |  |  |
| Archive | Closed, Cancelled, Rejected | Archived | admin, org admin, hse manager |  |  |

An administrator (Admin or Org Admin) can do a "reviewer" or "requester" step on a permit they raised themselves, but only with a written justification, which is recorded and flagged in the permit history.

## Permit types (DEFAULTS: confirm against the client's procedure)

| Type | Max validity | Risk | Needs RAMS ref | Isolation | Gas test | Fire watch | Required PPE | Training certificate |
|---|---|---|---|---|---|---|---|---|
| Hot Work | 8 h | high | yes | no | no | yes | goggles, safety gloves | Hot work |
| Confined Space Entry | 8 h | high | yes | yes | max 60 min old | no |  | Confined space entry |
| Chemical Handling | 8 h | high | yes | no | no | no |  | Chemical handling |
| Work at Height | 12 h | high | yes | no | no | no | safety harness, hard hat | Work at height |
| Electrical Work | 12 h | high | yes | yes | no | no |  | Electrical safety |
| Excavation | 12 h | high | yes | no | no | no |  | Excavation |
| Lifting | 12 h | high | yes | no | no | no |  | Lifting & rigging |
| Utility Work | 12 h | medium | yes | yes | no | no |  |  |
| Mechanical Work | 12 h | medium | yes | yes | no | no |  |  |
| Night Work | 12 h | medium | yes | no | no | no |  |  |
| Road Closure | 24 h | medium | yes | no | no | no |  |  |
| General Work | 24 h | low | no | no | no | no |  |  |

A permit is valid for at most **7 days** in total, however often it is extended. Validity starts when the handover is accepted, not when the permit is requested.
Gas limits (defaults): O2 19.5 to 23.5 %, LEL at most 10 %, H2S at most 10 ppm, CO at most 25 ppm.
Fire watch after hot work: at least 30 minutes. Crane utilisation: above 85 % is flagged, above 100 % is refused (recomputed from the weights, never taken from a saved percentage).
Checklist items where "No" stops the permit (defaults): uw_5, wah_7, wah_11, wah_13, wah_14, cs_2, cs_3, cs_4, cs_5, cs_6, cs_7, ew_1, ew_2, ex_2, hw_1, hw_2, hw_3, li_1, li_2, li_4, mw_1, ch_1.

## Who enforces what

| | The database (Firestore rules) | The app only |
|---|---|---|
| Who may do which step, and from which stage | yes | yes |
| Segregation of duties, administrator override with justification | yes | yes |
| Validity window: stamped from server time, capped by permit type and by 7 days | yes | yes |
| Extension refused after expiry; resume never extends; expire only after the end | yes | yes |
| Append-only activity log, server-stamped times, signed by the logged-in user | yes | yes |
| Stoppage records: append-only | yes | yes |
| Content edits only in the stages where staff record work | yes | yes |
| Permit numbers (PTW-YYYY-NNNN) never skipped or reused | yes | yes |
| Checklist answered, RAMS reference, PPE, fire watch, lift plan | | yes |
| Training certificates (only where a course is tagged for the competency) | | yes |
| Conflicting work in the same area (SIMOPS) | | yes |
| Isolation applied and verified, passing and fresh gas test, nobody inside | | yes |
| Password re-entry on signature steps | | yes |

The app checks run on every action and cannot be skipped from the screens, but a person with their own tools and a valid login could write content that the database rules do not look at.

## Deploying (in this order)

1. `npm run test:ptw` (no Firebase needed)
2. `npm run gen:ptw-rules` and review the diff of `firestore.rules`
3. Optional but recommended, needs Java: `npm run test:rules` against the Firestore emulator
4. `firebase deploy --only firestore:rules`
5. Deploy the app (push to GitHub, Vercel builds it)
6. Old permits (made before this system) are read-only. An administrator can delete them from the permit screen.

## Things to know

- Permits update live on every open screen. Every action re-reads the permit from the server first.
- A device clock more than 10 minutes wrong is refused when a permit is handed over or extended.
- Competency checking only blocks once training courses are tagged with competencies (course screen) and people are linked to their accounts on the permit team.
- Typed names in the client sign-off sections are a record of what was agreed on site, not system signatures.
- The QR code on the permit PDF opens `/permit/<code>`, a public page (no sign-in) that says whether the permit is valid right now. It shows only the permit number, type, status, validity and location, never names or the work description. Anything that is not clearly valid reads as a stop.
- For the QR code to open the live site, set `VITE_PUBLIC_APP_URL` (for example https://your-app.vercel.app) in Vercel, Production, then redeploy. Without it the code points at whatever address the app was opened from (localhost in development).
- Download the permit as a PDF from the permit screen. The PDF states its status at printing time and that a paper copy can be out of date. Arabic and other non-Latin text cannot be drawn by the PDF fonts: it prints as "?" and the first page says so.
- To make the permit check training certificates, tag each course with the competencies it proves (Training, then "Tag competencies for permits" on a course card), and link each person on the permit team to their EviroSafe account.
- Attachments are not available: file storage is not enabled.
