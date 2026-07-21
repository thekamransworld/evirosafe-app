# EviroSafe — Phase 4 Integration Guide
# Complete paste locations + wiring instructions for all 6 files
# ================================================================

# ════════════════════════════════════════════════════════════════
# PHASE 4 FILES SUMMARY
# ════════════════════════════════════════════════════════════════

# ┌──────────────────────────────────────────────────────────────────┐
# │  #  │ File                      │ Action  │ Destination          │
# ├──────────────────────────────────────────────────────────────────┤
# │  1  │ DragDropDashboard.tsx     │ CREATE  │ src/components/dashboard/  │
# │  2  │ GuidedWizards.tsx         │ CREATE  │ src/components/wizards/    │
# │  3  │ MobileNav.tsx             │ CREATE  │ src/components/layout/     │
# │  4  │ DataExportHub.tsx         │ CREATE  │ src/components/export/     │
# │  5  │ scheduledReports.ts       │ CREATE  │ functions/src/             │
# │  6  │ GdprControls.tsx          │ CREATE  │ src/components/settings/   │
# └──────────────────────────────────────────────────────────────────┘


# ════════════════════════════════════════════════════════════════
# STEP 1 — Install new dependencies
# ════════════════════════════════════════════════════════════════

# Frontend (in project root):
npm install
# All dependencies already installed from Phase 2/3 — no new ones needed.
# recharts, jspdf, jspdf-autotable, xlsx are already present.

# Functions (inside functions/ folder):
cd functions
npm install @sendgrid/mail      # For email delivery (Option A — recommended)
# OR:
npm install nodemailer @types/nodemailer   # Gmail fallback (Option B)
cd ..


# ════════════════════════════════════════════════════════════════
# STEP 2 — Create new folders
# ════════════════════════════════════════════════════════════════

mkdir -p src/components/dashboard
mkdir -p src/components/wizards
mkdir -p src/components/layout
mkdir -p src/components/export
mkdir -p src/components/settings


# ════════════════════════════════════════════════════════════════
# STEP 3 — File 1: DragDropDashboard.tsx
# ════════════════════════════════════════════════════════════════

DESTINATION:  src/components/dashboard/DragDropDashboard.tsx
ACTION:       CREATE new file

ADD TO src/App.tsx:

  import DragDropDashboard from './components/dashboard/DragDropDashboard';

  // Replace your existing dashboard page render:
  // BEFORE:
  {activePage === 'dashboard' && <OldDashboard />}

  // AFTER:
  {activePage === 'dashboard' && (
    <DragDropDashboard onNavigate={(page) => setActivePage(page)} />
  )}

NOTES:
  - The onNavigate prop lets widgets deep-link to other modules
    (e.g. "View all permits →" navigates to 'ptw')
  - Widget layout is persisted in localStorage under key:
    'evirosafe_dashboard_layout_v2'
  - To reset a user's layout: localStorage.removeItem('evirosafe_dashboard_layout_v2')
  - To add a new widget type, add it to WIDGET_REGISTRY and add a
    case in the WidgetContent switch statement


# ════════════════════════════════════════════════════════════════
# STEP 4 — File 2: GuidedWizards.tsx
# ════════════════════════════════════════════════════════════════

DESTINATION:  src/components/wizards/GuidedWizards.tsx
ACTION:       CREATE new file

This file exports THREE named components — wire each one separately:

  A) IncidentWizard — launch from Reports page header
  ────────────────────────────────────────────────────
  Open src/components/reports/ReportsList.tsx (or wherever your
  "New Incident" button lives — search for: handleCreateReport)

  Add at the top:
    import { IncidentWizard } from '../wizards/GuidedWizards';

  Add state:
    const [showWizard, setShowWizard] = useState(false);

  Replace the "New Incident" button or add alongside it:
    <button onClick={() => setShowWizard(true)}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold">
      <Wand2 className="w-4 h-4" /> Guided Report
    </button>

  Add the wizard modal:
    {showWizard && (
      <IncidentWizard
        onComplete={(data) => {
          handleCreateReport(data);
          setShowWizard(false);
        }}
        onCancel={() => setShowWizard(false)}
      />
    )}

  B) PtwWizard — launch from PTW page header
  ────────────────────────────────────────────
  Open src/components/ptw/PtwList.tsx (or your PTW page)

  import { PtwWizard } from '../wizards/GuidedWizards';

  const [showPtwWizard, setShowPtwWizard] = useState(false);

  <button onClick={() => setShowPtwWizard(true)}>
    Guided Permit
  </button>

  {showPtwWizard && (
    <PtwWizard
      onComplete={(data) => {
        handleCreatePtw(data);
        setShowPtwWizard(false);
      }}
      onCancel={() => setShowPtwWizard(false)}
    />
  )}

  C) RiskAssessmentWizard — launch from RAMS / Risk Assessment page
  ────────────────────────────────────────────────────────────────
  import { RiskAssessmentWizard } from '../wizards/GuidedWizards';

  {showRaWizard && (
    <RiskAssessmentWizard
      onComplete={(data) => {
        handleCreateRams(data);
        setShowRaWizard(false);
      }}
      onCancel={() => setShowRaWizard(false)}
    />
  )}

DRAFT PERSISTENCE:
  Wizards auto-save drafts to sessionStorage so partial entries
  survive an accidental page refresh. Draft keys:
    'wizard_incident_draft'
    'wizard_ptw_draft'
    'wizard_ra_draft'
  Drafts are cleared on successful submit or explicit cancel (with confirm).


# ════════════════════════════════════════════════════════════════
# STEP 5 — File 3: MobileNav.tsx
# ════════════════════════════════════════════════════════════════

DESTINATION:  src/components/layout/MobileNav.tsx
ACTION:       CREATE new file

This file exports:
  • MobileNav     — the bottom tab bar component
  • useMobileNav  — hook for detecting mobile viewport

STEP A — Find your root layout component.
Search for: className.*app-shell OR className.*layout OR the JSX
that contains both your Sidebar and your main content area.
It might be in App.tsx, AppContent.tsx, or a Layout.tsx component.

STEP B — Import at the top of that file:
  import { MobileNav, useMobileNav }
    from './components/layout/MobileNav';
    // Adjust the path based on where your layout file lives

STEP C — Add the hook inside your component:
  const { isMobile } = useMobileNav();

STEP D — Conditionally hide the sidebar on mobile:
  // Find your sidebar render — it probably looks like:
  <Sidebar activePage={activePage} onNavigate={setActivePage} />

  // Wrap it:
  {!isMobile && <Sidebar activePage={activePage} onNavigate={setActivePage} />}

STEP E — Add bottom padding to main content on mobile:
  // Find your <main> or content wrapper element and add:
  style={{ paddingBottom: isMobile ? '72px' : '0' }}
  // This prevents content from hiding behind the tab bar

STEP F — Add the MobileNav component at the bottom of your layout:
  // Add AFTER your main content, BEFORE the closing layout div:
  <MobileNav
    activePage={activePage}
    onNavigate={(page) => setActivePage(page)}
    notifications={unreadNotificationCount}
  />
  // Replace unreadNotificationCount with your actual unread count
  // (from the NotificationBell component's state, or a context value)

FULL EXAMPLE — your layout component after changes:
  const { isMobile } = useMobileNav();

  return (
    <div className="flex h-screen">
      {!isMobile && (
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
      )}
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: isMobile ? '72px' : '0' }}
      >
        {/* ... your page content ... */}
      </main>
      <MobileNav
        activePage={activePage}
        onNavigate={setActivePage}
        notifications={unreadCount}
      />
    </div>
  );

ADDING NetworkStatusDot to your Navbar:
  import { NetworkStatusDot } from '../offline/OfflineSync';

  // Inside your Navbar/Header component, add next to user avatar:
  <NetworkStatusDot />


# ════════════════════════════════════════════════════════════════
# STEP 6 — File 4: DataExportHub.tsx
# ════════════════════════════════════════════════════════════════

DESTINATION:  src/components/export/DataExportHub.tsx
ACTION:       CREATE new file

ADD TO src/App.tsx:

  import DataExportHub from './components/export/DataExportHub';

  {activePage === 'exports' && <DataExportHub />}

ADD SIDEBAR NAV ITEM:
  {
    id: 'exports',
    label: 'Data Export',
    icon: Download,          // import Download from 'lucide-react'
    roles: ['admin', 'hse_manager'],
  }

WIRE EMAIL BUTTON:
  The email delivery button in DataExportHub calls sendReportOnDemand
  (the Cloud Function from scheduledReports.ts). To wire it:

  In DataExportHub.tsx, find the email button onClick handler:
    onClick={() => {
      alert(`Email delivery not yet wired...`);
    }}

  Replace with:
    import { getFunctions, httpsCallable } from 'firebase/functions';
    import { app } from '../../firebase';

    const functions = getFunctions(app, 'us-central1');
    const sendReport = httpsCallable(functions, 'sendReportOnDemand');

    onClick={async () => {
      try {
        await sendReport({
          orgId:      activeOrg.id,
          recipients: [emailAddress],
          modules:    Array.from(selected),
        });
        alert('Report sent successfully!');
      } catch (err) {
        alert('Failed to send report. Check functions logs.');
      }
    }}

ADDING EXPORT BUTTONS TO INDIVIDUAL MODULES:
  You can also add quick export buttons on each module's header
  that link directly to DataExportHub with that module pre-selected.
  Pattern: navigate to 'exports' with a URL param or context value.


# ════════════════════════════════════════════════════════════════
# STEP 7 — File 5: scheduledReports.ts
# ════════════════════════════════════════════════════════════════

DESTINATION:  functions/src/scheduledReports.ts
ACTION:       CREATE new file

ADD TO functions/src/index.ts — open the file and add:

  export {
    weeklyKpiReport,
    monthlyKpiReport,
    sendReportOnDemand,
    updateReportSchedule,
  } from './scheduledReports';

SET UP EMAIL CREDENTIALS (choose one option):

  OPTION A — SendGrid (recommended for production):
  ─────────────────────────────────────────────────
  1. Create a free SendGrid account at sendgrid.com
  2. Create an API key with "Mail Send" permission
  3. Store the key in Firebase Secret Manager:
       firebase functions:secrets:set SENDGRID_API_KEY
       (paste your key when prompted)
  4. In functions/:
       npm install @sendgrid/mail

  OPTION B — Gmail (for testing / small deployments):
  ────────────────────────────────────────────────────
  1. Enable 2FA on your Gmail account
  2. Generate an App Password at myaccount.google.com/apppasswords
  3. Store credentials:
       firebase functions:secrets:set GMAIL_USER
       firebase functions:secrets:set GMAIL_APP_PASSWORD
  4. In functions/:
       npm install nodemailer @types/nodemailer

CREATE A REPORT SCHEDULE IN FIRESTORE:
  After deploying, create a document in Firestore to configure each
  organisation's report schedule:

  Collection: report_schedules
  Document ID: {your-org-id}
  Fields:
    enabled:    true
    recipients: ["manager@company.com", "director@company.com"]
    schedule:   "weekly"         // "daily" | "weekly" | "monthly"
    day:        "monday"
    time:       "08:00"
    timezone:   "Asia/Riyadh"
    modules:    ["kpi", "incidents", "actions"]
    format:     "pdf"
    org_name:   "Your Company Name"

  You can create this document via:
  - Firebase Console → Firestore → report_schedules → Add document
  - Or from the GdprControls settings page (wire updateReportSchedule callable)

DEPLOY:
  firebase deploy --only functions

VERIFY:
  Firebase Console → Functions → you should see:
  - weeklyKpiReport  (Scheduled, runs Mon 08:00)
  - monthlyKpiReport (Scheduled, runs 1st of month)
  - sendReportOnDemand (Callable)
  - updateReportSchedule (Callable)

TEST ON-DEMAND (without waiting for schedule):
  In Firebase Console → Functions → sendReportOnDemand → Test function
  Payload:
    {
      "data": {
        "orgId": "your-org-id",
        "recipients": ["your-email@company.com"],
        "modules": ["kpi", "incidents"]
      }
    }


# ════════════════════════════════════════════════════════════════
# STEP 8 — File 6: GdprControls.tsx
# ════════════════════════════════════════════════════════════════

DESTINATION:  src/components/settings/GdprControls.tsx
ACTION:       CREATE new file

ADD TO src/App.tsx:

  import GdprControls from './components/settings/GdprControls';

  {activePage === 'privacy' && <GdprControls />}

ADD SIDEBAR NAV ITEM:
  {
    id: 'privacy',
    label: 'Data & Privacy',
    icon: Lock,              // import Lock from 'lucide-react'
    roles: ['admin'],        // admin only — sensitive privacy controls
  }

ALTERNATIVELY — add as a tab inside your existing Settings page:
  If you have a Settings page with tabs (General, Users, Billing, etc.),
  add a "Data & Privacy" tab that renders <GdprControls />.

  Open your Settings component (search for: activePage === 'settings')
  and add:
    import GdprControls from './components/settings/GdprControls';

    // In your settings tab render:
    {settingsTab === 'privacy' && <GdprControls />}

    // Add tab button:
    <button onClick={() => setSettingsTab('privacy')}>Data & Privacy</button>

WIRE ERASURE TO FIRESTORE (important for compliance):
  The "Mark Erasure Complete" button in GdprControls currently only
  updates local state. For a real erasure, you must also delete the
  user's data from Firestore. Add a Cloud Function:

  In functions/src/index.ts, add:

    export const eraseUserData = onCall(
      { region: 'us-central1' },
      async (request) => {
        if (!request.auth) throw new HttpsError('unauthenticated', '');
        const { userId, orgId } = request.data;

        // Delete user's personal data across all collections
        // IMPORTANT: Keep non-personal data (anonymise instead of delete)
        const db = getFirestore();
        const batch = db.batch();

        // Anonymise training records (keep for legal obligation, remove PII)
        const trainingSnap = await db.collection('training_records')
          .where('user_id', '==', userId).get();
        trainingSnap.docs.forEach((d) =>
          batch.update(d.ref, { user_id: '[ERASED]', user_name: '[ERASED]' })
        );

        // Delete user profile
        batch.delete(db.collection('users').doc(userId));

        await batch.commit();
        return { success: true };
      }
    );


# ════════════════════════════════════════════════════════════════
# STEP 9 — Complete App.tsx imports for Phase 4
# ════════════════════════════════════════════════════════════════

# Add ALL Phase 4 imports to src/App.tsx at once:

import DragDropDashboard from './components/dashboard/DragDropDashboard';
import { IncidentWizard, PtwWizard, RiskAssessmentWizard }
  from './components/wizards/GuidedWizards';
import { MobileNav, useMobileNav }
  from './components/layout/MobileNav';
import DataExportHub from './components/export/DataExportHub';
import GdprControls  from './components/settings/GdprControls';

# Add routes:
{activePage === 'dashboard' && <DragDropDashboard onNavigate={setActivePage} />}
{activePage === 'exports'   && <DataExportHub />}
{activePage === 'privacy'   && <GdprControls />}

# Add sidebar nav items:
{ id: 'exports', label: 'Data Export',    icon: Download, roles: ['admin','hse_manager'] },
{ id: 'privacy', label: 'Data & Privacy', icon: Lock,     roles: ['admin'] },


# ════════════════════════════════════════════════════════════════
# STEP 10 — Deploy everything
# ════════════════════════════════════════════════════════════════

# 1. Add Firestore rules for report_delivery_log and report_schedules
#    Open firestore.rules and add:

  match /report_schedules/{orgId} {
    allow read:  if isOrgAdmin(orgId) || isSuperAdmin();
    allow write: if isOrgAdmin(orgId) || isSuperAdmin();
  }

  match /report_delivery_log/{logId} {
    allow read:  if isOrgAdmin(resource.data.org_id) || isSuperAdmin();
    allow create: if false;  // written by Cloud Functions only
    allow update, delete: if false;
  }

# Deploy rules:
  firebase deploy --only firestore:rules

# 2. Deploy Cloud Functions:
  cd functions && npm install && cd ..
  firebase deploy --only functions

# 3. Build and deploy frontend:
  npm run build
  firebase deploy --only hosting
  # or: vercel --prod


# ════════════════════════════════════════════════════════════════
# COMPLETE PROJECT STRUCTURE — ALL 4 PHASES
# ════════════════════════════════════════════════════════════════

# your-project/
# ├── firestore.rules              ← P1 + P3 + P4 additions
# ├── firestore.indexes.json       ← P1
# ├── .env                         ← No VITE_GEMINI_API_KEY
# │
# ├── functions/src/
# │   ├── index.ts                 ← All function exports
# │   ├── geminiProxy.ts           ← P1
# │   ├── notificationTriggers.ts  ← P3
# │   └── scheduledReports.ts      ← P4 ← NEW
# │
# └── src/
#     ├── contexts/
#     │   └── DataContext.tsx      ← P1
#     │
#     ├── components/
#     │   ├── audit/AuditLog.tsx               ← P3
#     │   ├── auth/RbacGuard.tsx               ← P3
#     │   ├── bbs/BbsObservations.tsx          ← P3
#     │   ├── compliance/ComplianceRegister.tsx ← P2
#     │   ├── contractors/ContractorManager.tsx ← P3
#     │   ├── dashboard/DragDropDashboard.tsx   ← P4 ← NEW
#     │   ├── documents/DocumentControl.tsx     ← P3
#     │   ├── emergency/EmergencyResponse.tsx   ← P2
#     │   ├── environment/EnvironmentalMonitor.tsx ← P3
#     │   ├── export/DataExportHub.tsx          ← P4 ← NEW
#     │   ├── fatigue/FatigueMonitor.tsx        ← P3
#     │   ├── kpi/KpiDashboard.tsx              ← P2
#     │   ├── layout/MobileNav.tsx              ← P4 ← NEW
#     │   ├── meetings/SafetyMeetings.tsx       ← P3
#     │   ├── notifications/NotificationCenter.tsx ← P3
#     │   ├── offline/OfflineSync.tsx           ← P3
#     │   ├── ppe/PpeInventory.tsx              ← P3
#     │   ├── ptw/PtwDetailModal.tsx            ← P1
#     │   ├── rca/RcaModule.tsx                 ← P2
#     │   ├── risk-matrix/RiskMatrix.tsx        ← P2
#     │   ├── settings/GdprControls.tsx         ← P4 ← NEW
#     │   └── wizards/GuidedWizards.tsx         ← P4 ← NEW
#     │
#     └── lib/
#         ├── auditLogger.ts          ← P3
#         ├── certificationAlerts.ts  ← P2
#         ├── exportUtils.ts          ← P3
#         ├── geminiClient.ts         ← P1
#         └── kpiCalculations.ts      ← P2


# ════════════════════════════════════════════════════════════════
# QUICK DIAGNOSTICS — if something doesn't work
# ════════════════════════════════════════════════════════════════

# Dashboard widgets show "0" everywhere:
#   → DataContext not passing data — check useDataContext() is imported
#     in DragDropDashboard.tsx and DataProvider wraps it in App.tsx

# Wizard form doesn't call handleCreateReport:
#   → Make sure onComplete prop passes data to the DataContext handler
#   → Check: onComplete={(data) => handleCreateReport(data)}

# Mobile nav not showing:
#   → Check window width — it only renders below 768px
#   → Test by narrowing browser DevTools to 375px

# Scheduled report not arriving:
#   → Check Firebase Console → Functions logs for errors
#   → Verify SENDGRID_API_KEY secret is set: firebase functions:secrets:list
#   → Check report_schedules/{orgId} document exists in Firestore
#   → Test on-demand: Firebase Console → sendReportOnDemand → Test function

# GDPR erasure button has no effect on Firestore:
#   → The UI only marks local state as "Completed"
#   → Real erasure requires the Cloud Function (see Step 8 above)
#   → You must implement eraseUserData function and call it from the button

# Export hub downloads 0 rows:
#   → Module's getData() function may be returning [] (placeholder)
#   → BBS, Environment, Contractors, Documents modules use local state
#     not DataContext — their getData returns [] until you wire them
#   → Incidents, PTW, Actions, Training, KPI all pull from DataContext ✓