# Setting Up a Dev/Staging Firebase Project

The code side of this is done (`src/firebase.ts` now reads from environment variables, falling back to the current production project if nothing else is configured — so nothing breaks until you actually set up a second project). What's left is console/dashboard work I can't do for you: creating the project itself, and telling Vercel about it.

---

## 1. Create the new Firebase project

In the [Firebase Console](https://console.firebase.google.com):
- **Add project** → name it something clearly distinct, e.g. `evirosafe-auth-dev` or `evirosafe-staging`.
- You can skip Google Analytics for this one if you want — it's not needed for a dev project.

## 2. Enable the same services the prod project uses

Inside the new project:
- **Authentication** → Sign-in method → enable **Email/Password** (matching whatever's enabled on prod — check the real `evirosafe-auth` project's Authentication tab if you're not sure what else is on).
- **Firestore Database** → Create database → start in production mode (not test mode) → pick the same region as your prod project, for consistency.

## 3. Get the new project's config values

Project Settings (gear icon) → General → scroll to **Your apps** → if there's no web app yet, click **Add app** → Web (`</>`) → register it (nickname doesn't matter) → it'll show you a config block that looks like:
```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "..."
};
```
Keep this open for the next two steps — you'll copy each value into the matching `VITE_FIREBASE_*` variable name.

## 4. Deploy your Firestore rules to the new project

Your `firestore.rules` file only affects whichever project you tell the CLI to target. From the project folder:
```
firebase use --add
```
Pick the new dev project when prompted, give it an alias like `dev`. Then, to actually deploy rules to it specifically:
```
firebase deploy --only firestore:rules --project dev
```
Do this now, and again any time you change `firestore.rules` going forward — the two projects don't share rules, so a rule fixed on prod won't automatically apply to dev.

## 5. Point your local machine at the dev project

Create a new file `.env.local` in the project root (already git-ignored, won't get committed) with the values from step 3:
```
VITE_FIREBASE_API_KEY=<dev project's value>
VITE_FIREBASE_AUTH_DOMAIN=<dev project's value>
VITE_FIREBASE_PROJECT_ID=<dev project's value>
VITE_FIREBASE_STORAGE_BUCKET=<dev project's value>
VITE_FIREBASE_MESSAGING_SENDER_ID=<dev project's value>
VITE_FIREBASE_APP_ID=<dev project's value>
VITE_FIREBASE_MEASUREMENT_ID=<dev project's value>
```
Restart `npm run dev` after creating this — Vite only reads env files on startup. You should see `[Firebase] Connected to project: <your-dev-project-id>` in the browser console confirming it took effect (that log line is new, added specifically so this is never ambiguous going forward).

## 6. Point Vercel's Preview deployments at the dev project

In the Vercel dashboard → your project → **Settings** → **Environment Variables**:
- Add each `VITE_FIREBASE_*` variable with the **dev** project's values, scoped to **Preview** only (uncheck Production).
- Your existing Production environment already has no `VITE_FIREBASE_*` variables set at all right now — which is fine, since the code falls back to the hardcoded prod values. If you'd rather be explicit (recommended, since the fallback existing purely for backward-compatibility isn't something you want to depend on long-term), also add the same variable names scoped to **Production**, with the real prod project's values this time.

## 7. Verify

- Open a Vercel **Preview** deployment (any open PR, or push a branch) → check the browser console for `[Firebase] Connected to project: <dev-project-id>`.
- Open the actual **production** site → confirm it logs the real `evirosafe-auth` project id.
- Create a test record on the Preview deployment, then check the *dev* project's Firestore console (not prod) — confirm it landed there and nowhere near real customer data.

---

## What's already done (code side, ready to push independently of the above)

- `src/firebase.ts` — reads config from env vars, falls back to current hardcoded prod values, logs which project it's connected to on every load.
- `.env.example` — added the missing `VITE_FIREBASE_MEASUREMENT_ID` field (was silently absent before) and clearer guidance pointing at `.env.local` for real values.
- `src/vite-env.d.ts` — proper TypeScript typing for the new env vars, so `import.meta.env.VITE_FIREBASE_*` gets real autocomplete instead of Vite's generic fallback typing.

None of this depends on the dev project existing yet — it's safe to commit and push right away, and everything keeps working exactly as it does today until you work through steps 1–6 above.
