# EviroSafe — Complete Integration Guide
# Where to paste every file + exact code changes in existing files
# ============================================================

# ════════════════════════════════════════════════════════════
# PHASE 1 FILES — Critical Bug Fixes & Security
# ════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────
# FILE 1: Gemini Cloud Function Proxy (NEW file)
# ─────────────────────────────────────────────────────────
DESTINATION:  functions/src/geminiProxy.ts
ACTION:       CREATE new file (the functions/ folder may not exist yet)

If functions/ does not exist in your project root:
  1. Run: firebase init functions
     - Select: TypeScript
     - Do NOT overwrite existing files if prompted
  2. Then create: functions/src/geminiProxy.ts
  3. Replace functions/package.json with the delivered version

FULL PATH FROM PROJECT ROOT:
  your-project/
  └── functions/
      ├── package.json          ← REPLACE with delivered version
      └── src/
          ├── index.ts          ← REPLACE with delivered version
          └── geminiProxy.ts    ← CREATE new file

# ─────────────────────────────────────────────────────────
# FILE 2: Gemini Client (NEW file)
# ─────────────────────────────────────────────────────────
DESTINATION:  src/lib/geminiClient.ts
ACTION:       CREATE new file

If src/lib/ does not exist:
  mkdir src/lib

FULL PATH FROM PROJECT ROOT:
  your-project/
  └── src/
      └── lib/
          └── geminiClient.ts   ← CREATE new file

AFTER CREATING: Find every place in the codebase that uses the old Gemini pattern
and replace it. Search for this in your editor (Ctrl+Shift+F / Cmd+Shift+F):

  SEARCH:  import.meta.env.VITE_GEMINI_API_KEY
  SEARCH:  new GoogleGenerativeAI(
  SEARCH:  GoogleGenerativeAI

Replace each usage with the new pattern:

  // OLD (remove this):
  import { GoogleGenerativeAI } from '@google/generative-ai';
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // NEW (use this instead):
  import { askGemini } from '@/lib/geminiClient';
  const result = await askGemini(prompt);
  const text = result.text;

Also remove VITE_GEMINI_API_KEY from .env:
  your-project/
  └── .env                      ← DELETE the line: VITE_GEMINI_API_KEY=...

# ─────────────────────────────────────────────────────────
# FILE 3: DataContext (REPLACE existing file)
# ─────────────────────────────────────────────────────────
DESTINATION:  src/contexts/DataContext.tsx
ACTION:       REPLACE the entire existing file

FULL PATH FROM PROJECT ROOT:
  your-project/
  └── src/
      └── contexts/
          └── DataContext.tsx   ← REPLACE entirely

IMPORTANT — check these imports match your project:
  Line ~20: import { db } from '../firebase';
  → Make sure '../firebase' matches where your Firebase init file is.
    It might be '../firebase/index' or '../config/firebase' — check your project.

  Line ~30-50: import { organizations, users, ... } from '../data';
  → This must match your actual seed data export names in src/data/index.ts
    If names differ, update the destructure to match.

  Line ~60-80: import type { Organization, User, Report, ... } from '../types';
  → All these types must exist in your src/types/index.ts (or wherever your types live).
    Any missing types — add them or remove the import.

# ─────────────────────────────────────────────────────────
# FILE 4: PtwDetailModal (REPLACE or CREATE)
# ─────────────────────────────────────────────────────────
DESTINATION:  src/components/ptw/PtwDetailModal.tsx
ACTION:       REPLACE if it exists, CREATE if it doesn't

FULL PATH FROM PROJECT ROOT:
  your-project/
  └── src/
      └── components/
          └── ptw/
              └── PtwDetailModal.tsx   ← REPLACE or CREATE

ALSO — open src/App.tsx and make these changes:

  CHANGE 1: Add usersList to the useAppContext destructure
  ─────────────────────────────────────────────────────────
  Find this line (approx line 20-40 in App.tsx):
    const { activeOrg, activeUser, ... } = useAppContext();

  Add usersList to it:
    const { activeOrg, activeUser, usersList, ... } = useAppContext();

  CHANGE 2: Pass usersList to the Ptw component
  ─────────────────────────────────────────────────────────
  Find where <Ptw is rendered (search for: <Ptw ):

  BEFORE:
    <Ptw
      ptws={ptwList}
      users={[]}
      ...otherProps
    />

  AFTER:
    <Ptw
      ptws={ptwList}
      users={usersList}
      ...otherProps
    />

  CHANGE 3: Pass usersList to Trainings component too
  ─────────────────────────────────────────────────────────
  Find where <Trainings is rendered (search for: <Trainings ):

  BEFORE:
    <Trainings
      users={[]}
      ...otherProps
    />

  AFTER:
    <Trainings
      users={usersList}
      ...otherProps
    />

ALSO — open the file that renders PtwDetailModal (likely src/components/ptw/PtwList.tsx
or src/pages/Ptw.tsx) and update how it opens the modal:

  Find where PtwDetailModal (or the old ptw detail component) is rendered.
  Replace the onUpdate prop call pattern so it just calls handleUpdatePtw:

  BEFORE (old pattern):
    onUpdate={(ptw, action) => handleUpdatePtw(ptw, action)}

  AFTER (new pattern — action not needed, DataContext just persists):
    onUpdate={(ptw) => handleUpdatePtw(ptw)}

# ─────────────────────────────────────────────────────────
# FILE 5: Firestore Security Rules (REPLACE existing file)
# ─────────────────────────────────────────────────────────
DESTINATION:  firestore.rules   (project root)
ACTION:       REPLACE the entire existing file

FULL PATH FROM PROJECT ROOT:
  your-project/
  └── firestore.rules            ← REPLACE entirely

After replacing, deploy the rules:
  firebase deploy --only firestore:rules

VERIFY it works by checking the Firebase Console:
  → Firestore → Rules → look for no syntax errors

# ─────────────────────────────────────────────────────────
# FILE 6: AuthSync (REPLACE existing file)
# ─────────────────────────────────────────────────────────
DESTINATION:  src/components/AuthSync.tsx
ACTION:       REPLACE the entire existing file

FULL PATH FROM PROJECT ROOT:
  your-project/
  └── src/
      └── components/
          └── AuthSync.tsx       ← REPLACE entirely

IMPORTANT — check these imports:
  Line ~6: import { db } from '../firebase';
  → Must match your Firebase init file path.

  Line ~9: import { useAppContext } from '../contexts/AppContext';
  → Must match your AppContext location.

  Line ~10: import type { User as AppUser } from '../types';
  → Must match your User type export.

Also check that AppContext exports setUsersList and setActiveUser:
  Open src/contexts/AppContext.tsx
  Look for the context value object — it should include:
    setUsersList: ...,
    setActiveUser: ...,

  If setActiveUser does not exist, add it:

  In the AppContext state declarations, find where activeUser is set:
    const [activeUser, setActiveUser] = useState<AppUser | null>(null);

  Make sure setActiveUser is included in the context value:
    value={{
      ...existingValues,
      activeUser,
      setActiveUser,   ← add this if missing
    }}

  And add it to the context type:
    setActiveUser: React.Dispatch<React.SetStateAction<AppUser | null>>;

# ─────────────────────────────────────────────────────────
# FILE 7: Firestore Indexes (REPLACE or CREATE)
# ─────────────────────────────────────────────────────────
DESTINATION:  firestore.indexes.json   (project root)
ACTION:       REPLACE if it exists, CREATE if it doesn't

FULL PATH FROM PROJECT ROOT:
  your-project/
  └── firestore.indexes.json     ← REPLACE or CREATE

After replacing, deploy the indexes:
  firebase deploy --only firestore:indexes

Note: index builds take 2–10 minutes in the Firebase Console.
You can monitor progress at: Firebase Console → Firestore → Indexes


# ════════════════════════════════════════════════════════════
# PHASE 2 FILES — New Feature Modules
# ════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────
# FILE 8: KPI Calculations Engine (NEW file)
# ─────────────────────────────────────────────────────────
DESTINATION:  src/lib/kpiCalculations.ts
ACTION:       CREATE new file

FULL PATH FROM PROJECT ROOT:
  your-project/
  └── src/
      └── lib/
          └── kpiCalculations.ts   ← CREATE new file

No changes needed in other files to just add this — it's a pure utility.
It gets imported by KpiDashboard.tsx (next file).

# ─────────────────────────────────────────────────────────
# FILE 9: KPI Dashboard Component (NEW file)
# ─────────────────────────────────────────────────────────
DESTINATION:  src/components/kpi/KpiDashboard.tsx
ACTION:       CREATE new file (also create the kpi/ folder)

FULL PATH FROM PROJECT ROOT:
  your-project/
  └── src/
      └── components/
          └── kpi/
              └── KpiDashboard.tsx   ← CREATE new file

TO ADD TO THE APP (wire into navigation):

  STEP 1 — Open src/App.tsx
  Find where the main navigation cases are (likely a switch/if block or route config).
  Add a case for 'kpi' or 'dashboard':

    import KpiDashboard from './components/kpi/KpiDashboard';

    // In the render/route section:
    {activePage === 'kpi' && (
      <KpiDashboard
        industry="Construction"   // change to your industry
      />
    )}

  STEP 2 — Open your sidebar/nav component (likely src/components/Sidebar.tsx
  or src/components/Navigation.tsx — search for where nav items are defined)

  Add a new nav item:
    {
      id: 'kpi',
      label: 'KPI Dashboard',
      icon: BarChart2,           // import from lucide-react
      roles: ['admin', 'hse_manager', 'supervisor'],
    }

  STEP 3 — Verify recharts is installed (it should already be in your project).
  If not: npm install recharts

# ─────────────────────────────────────────────────────────
# FILE 10: Root Cause Analysis Module (NEW file)
# ─────────────────────────────────────────────────────────
DESTINATION:  src/components/rca/RcaModule.tsx
ACTION:       CREATE new file (also create the rca/ folder)

FULL PATH FROM PROJECT ROOT:
  your-project/
  └── src/
      └── components/
          └── rca/
              └── RcaModule.tsx   ← CREATE new file

TO ADD TO THE APP:

  OPTION A — As a modal launched from an incident report
  ────────────────────────────────────────────────────────
  Open src/components/reports/ReportDetailModal.tsx
  (or wherever individual report details are shown — search for: report.description)

  Add an "Investigate" button and RCA state:

    import RcaModule from '../rca/RcaModule';

    // Add state at the top of the component:
    const [showRca, setShowRca] = useState(false);

    // Add button in the report detail UI (near status buttons):
    <button
      onClick={() => setShowRca(true)}
      className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl text-sm font-semibold"
    >
      <GitBranch className="w-4 h-4" />
      Root Cause Analysis
    </button>

    // Add modal render:
    {showRca && (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
          <h2 className="text-xl font-bold mb-4">Root Cause Analysis</h2>
          <RcaModule
            report={report}
            onClose={() => setShowRca(false)}
          />
        </div>
      </div>
    )}

  OPTION B — As a standalone page
  ────────────────────────────────────────────────────────
  Add 'rca' to navigation and render:
    {activePage === 'rca' && selectedReport && (
      <RcaModule report={selectedReport} />
    )}

# ─────────────────────────────────────────────────────────
# FILE 11: Compliance Register (NEW file)
# ─────────────────────────────────────────────────────────
DESTINATION:  src/components/compliance/ComplianceRegister.tsx
ACTION:       CREATE new file (also create the compliance/ folder)

FULL PATH FROM PROJECT ROOT:
  your-project/
  └── src/
      └── components/
          └── compliance/
              └── ComplianceRegister.tsx   ← CREATE new file

TO ADD TO THE APP:

  STEP 1 — Open src/App.tsx

    import ComplianceRegister from './components/compliance/ComplianceRegister';

    // In the render/route section:
    {activePage === 'compliance' && <ComplianceRegister />}

  STEP 2 — Add to sidebar nav:
    {
      id: 'compliance',
      label: 'Compliance Register',
      icon: Shield,              // import Shield from lucide-react
      roles: ['admin', 'hse_manager'],
    }

  STEP 3 — Wire Firestore persistence (the component currently uses local state).
  To persist compliance item status changes to Firestore, add this to the updateItem
  function inside ComplianceRegister.tsx:

    // After the setItems call in updateItem():
    import { doc, setDoc } from 'firebase/firestore';
    import { db } from '../../firebase';

    // Inside updateItem function, add after setItems():
    try {
      await setDoc(
        doc(db, 'compliance_items', id),
        { [field]: value, org_id: activeOrg.id, updated_at: new Date().toISOString() },
        { merge: true }
      );
    } catch (e) {
      console.error('[ComplianceRegister] Failed to persist:', e);
    }

    // Also change updateItem to async:
    const updateItem = async (id: string, field: keyof ComplianceItem, value: any) => { ... }

# ─────────────────────────────────────────────────────────
# FILE 12: Emergency Response Module (NEW file)
# ─────────────────────────────────────────────────────────
DESTINATION:  src/components/emergency/EmergencyResponse.tsx
ACTION:       CREATE new file (also create the emergency/ folder)

FULL PATH FROM PROJECT ROOT:
  your-project/
  └── src/
      └── components/
          └── emergency/
              └── EmergencyResponse.tsx   ← CREATE new file

TO ADD TO THE APP:

  STEP 1 — Open src/App.tsx

    import EmergencyResponse from './components/emergency/EmergencyResponse';

    // In the render/route section:
    {activePage === 'emergency' && <EmergencyResponse />}

  STEP 2 — Add to sidebar nav:
    {
      id: 'emergency',
      label: 'Emergency Response',
      icon: Siren,               // import Siren from lucide-react
      roles: ['admin', 'hse_manager', 'supervisor'],
    }

  STEP 3 — Wire Firestore persistence for plans and drills.
  In EmergencyResponse.tsx, find the setPlans and setDrills calls and add Firestore writes:

    import { collection, addDoc } from 'firebase/firestore';
    import { db } from '../../firebase';
    import { useAppContext } from '../../contexts/AppContext';

    const { activeOrg } = useAppContext();

    // In the plan save handler (where setPlans is called):
    const handleSavePlan = async (plan: EmergencyPlan) => {
      setPlans((p) => [plan, ...p]);
      setShowPlanForm(false);
      try {
        await addDoc(collection(db, 'emergency_plans'), {
          ...plan,
          org_id: activeOrg.id,
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        console.error('[EmergencyResponse] Failed to save plan:', e);
      }
    };

    // In the drill save handler:
    const handleSaveDrill = async (drill: EmergencyDrill) => {
      setDrills((d) => [drill, ...d]);
      setShowDrillForm(false);
      try {
        await addDoc(collection(db, 'emergency_drills'), {
          ...drill,
          org_id: activeOrg.id,
        });
      } catch (e) {
        console.error('[EmergencyResponse] Failed to save drill:', e);
      }
    };


# ════════════════════════════════════════════════════════════
# PHASE 2 — REMAINING FILES (to be delivered next)
# ════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────
# FILE 13: Certification Alerts Utility (NEW — coming next)
# ─────────────────────────────────────────────────────────
DESTINATION:  src/lib/certificationAlerts.ts
ACTION:       CREATE new file

# ─────────────────────────────────────────────────────────
# FILE 14: Risk Matrix Component (NEW — coming next)
# ─────────────────────────────────────────────────────────
DESTINATION:  src/components/risk-matrix/RiskMatrix.tsx
ACTION:       CREATE new file

TO ADD TO THE APP (preview):
  {activePage === 'risk-matrix' && <RiskMatrix />}

  Sidebar nav item:
    { id: 'risk-matrix', label: 'Risk Matrix', icon: Grid, roles: ['admin','hse_manager','supervisor'] }


# ════════════════════════════════════════════════════════════
# FULL PROJECT STRUCTURE AFTER ALL PHASES
# ════════════════════════════════════════════════════════════

#  your-project/
#  ├── firestore.rules              ← REPLACED (Phase 1)
#  ├── firestore.indexes.json       ← REPLACED (Phase 1)
#  ├── .env                         ← Remove VITE_GEMINI_API_KEY line
#  │
#  ├── functions/                   ← NEW (Phase 1)
#  │   ├── package.json
#  │   └── src/
#  │       ├── index.ts
#  │       └── geminiProxy.ts
#  │
#  └── src/
#      ├── contexts/
#      │   └── DataContext.tsx      ← REPLACED (Phase 1)
#      │
#      ├── components/
#      │   ├── AuthSync.tsx         ← REPLACED (Phase 1)
#      │   │
#      │   ├── ptw/
#      │   │   └── PtwDetailModal.tsx   ← REPLACED (Phase 1)
#      │   │
#      │   ├── kpi/                 ← NEW folder (Phase 2)
#      │   │   └── KpiDashboard.tsx
#      │   │
#      │   ├── rca/                 ← NEW folder (Phase 2)
#      │   │   └── RcaModule.tsx
#      │   │
#      │   ├── compliance/          ← NEW folder (Phase 2)
#      │   │   └── ComplianceRegister.tsx
#      │   │
#      │   ├── emergency/           ← NEW folder (Phase 2)
#      │   │   └── EmergencyResponse.tsx
#      │   │
#      │   ├── risk-matrix/         ← NEW folder (Phase 2, next)
#      │   │   └── RiskMatrix.tsx
#      │   │
#      │   └── notifications/       ← NEW folder (Phase 3)
#      │       └── NotificationCenter.tsx
#      │
#      └── lib/                     ← NEW folder (Phase 1-2)
#          ├── geminiClient.ts      ← Phase 1
#          ├── kpiCalculations.ts   ← Phase 2
#          └── certificationAlerts.ts  ← Phase 2 (next)


# ════════════════════════════════════════════════════════════
# DEPLOYMENT ORDER (do these in sequence)
# ════════════════════════════════════════════════════════════

# Step 1 — Phase 1 security fixes first (before anything else)
firebase deploy --only firestore:rules

# Step 2 — Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Step 3 — Deploy Cloud Functions (Gemini proxy)
cd functions && npm install && cd ..
firebase deploy --only functions

# Step 4 — Build and deploy the frontend
npm run build
firebase deploy --only hosting
# (or your deployment platform: Vercel/Netlify)

# Step 5 — Verify in Firebase Console
# → Firestore → Rules: no errors shown
# → Firestore → Indexes: all indexes show "Enabled"
# → Functions: geminiProxy function listed


# ════════════════════════════════════════════════════════════
# QUICK SEARCH CHEATSHEET — find exact locations in codebase
# ════════════════════════════════════════════════════════════

# To find where PTW component is rendered (for users={[]} fix):
grep -r "users={\[\]}" src/

# To find all direct Gemini API usages to replace:
grep -r "VITE_GEMINI_API_KEY\|GoogleGenerativeAI\|gemini-pro" src/

# To find where navigation items are defined:
grep -r "id: 'reports'\|activePage\|navItems" src/

# To find your Firebase init file:
grep -r "initializeApp\|getFirestore" src/ --include="*.ts" --include="*.tsx"

# To find AppContext to add setActiveUser:
grep -r "setUsersList\|setActiveUser\|AppContext" src/contexts/