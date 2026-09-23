# EviroSafe

A multi-tenant HSE (Health, Safety & Environment) management platform for
industrial and construction operations.

## Stack

- **Frontend:** React + TypeScript, Vite
- **Backend:** Firebase (Firestore + Authentication)
- **Hosting/CI:** Vercel, deployed via GitHub integration (push to `main` → auto-deploy)
- **Error monitoring:** Sentry
- **AI layer:** Google Gemini 2.5, gated behind an `AI_FEATURES_ENABLED` flag — off by
  default, falls back to mock responses everywhere it's called so the app runs fully
  without a Gemini key
- **Offline support:** Firestore IndexedDB persistence (PWA-installable)

## Architecture

**Multi-tenancy.** Every org's data is isolated at the database level. Most
collections carry an `org_id` field, and Firestore Security Rules (`firestore.rules`,
~175 lines) enforce org-scoping server-side via an `isOrgScoped()` check — not just
in the client UI. Security rules are covered by automated tests (240+ assertions).

**Identity model.** A Firebase Auth account is linked to its Firestore profile
document via an `auth_uid` field (not by matching document IDs), with a `users_by_uid/{authUid}`
pointer document used specifically so security rules can resolve a caller's
`org_id`/`role` without needing to run a query (Firestore rules can only do direct
path lookups, not field queries). `AuthSync.tsx` resolves this client-side on login
and hands the result to the app's user context.

**Roles.** 9 distinct roles from `WORKER` up to a cross-org `ADMIN`, including an
admin "view as" impersonation tool for support/troubleshooting.

## Feature areas (8 capability groups, 35+ modules)

1. **Safety & Incident Management** — incident reporting, inspections,
   behavior-based safety observations, emergency response/drills, root cause
   analysis (5-Why, Fishbone, Bow-Tie)
2. **Permits, Risk & Work Control** — permit to work (hot work, confined space,
   work at height), RAMS, risk matrix, configurable checklists
3. **Compliance & Legal** — legal compliance register, standards/ISO register,
   system-wide audit log, document control
4. **Training & Competency** — course/session management, toolbox talks
   (canvas signature capture), training compliance matrix
5. **Assets, Environment & Resources** — chemical register, PPE inventory,
   contractor management, environmental monitoring, waste management, fatigue
   & fitness-for-duty
6. **People & Multi-Site Operations** — multi-tenant org management, RBAC,
   man-hours logging
7. **Analytics & Reporting** — KPI dashboard (LTIR/TRIR/DART), customizable
   widget dashboard, PDF export, bulk data export
8. **Global & Local Compliance** — 6 languages with full RTL support (English,
   Arabic, Urdu, Hindi, French, Spanish), DSAR/data-privacy tooling, reference
   data aligned to Saudi Civil Defence / MOMRA / KSA Labour Law

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in your own Firebase project's config
npm run dev
```

Required environment variables (see `.env.example`):

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
VITE_GEMINI_API_KEY        # optional — AI features run in mock mode without it
```

## Deploying your own instance

1. Create a new Firebase project (Firestore + Authentication, Email/Password
   provider enabled).
2. Deploy the included `firestore.rules` and `firestore.indexes.json` to it.
3. Set the environment variables above in your hosting provider (Vercel or
   otherwise) — **do not reuse the original project's credentials**; this repo
   is only usable against a project where these rules have been deployed.
4. Connect the repo to Vercel (or your host of choice) — `npm run build`
   outputs a static bundle, no server runtime required.

## Data model

Core Firestore collections: `users`, `users_by_uid`, `organizations`,
`projects`, `hazards`, `ptws`, `rams`, `tbt_sessions`, `training_courses`,
`training_records`, `checklist_templates`, `checklist_runs`, `chemicals`,
`ppe_items`, `contractor_companies`, `compliance_tracking`,
`legal_compliance_items`, `rca_records`, `corrective_actions`, `audits`,
`audit_logs`, `bbs_observations`, `emergency_plans`, `emergency_drills`,
`controlled_documents`, `dsar_requests`, `data_breaches`,
`retention_policies`, `processing_activities`, `signs`, `notifications`, and
others — see `firestore.rules` for the full authoritative list and their
access rules.
