# EviroSafe — Phase 3 Integration Guide
# Complete paste locations + wiring instructions for all 14 files
# ================================================================

# ════════════════════════════════════════════════════════════════
# PHASE 3 FILES SUMMARY
# ════════════════════════════════════════════════════════════════

# ┌─────────────────────────────────────────────────────────────┐
# │  #  │ File                       │ Action  │ Destination    │
# ├─────────────────────────────────────────────────────────────┤
# │  1  │ auditLogger.ts             │ CREATE  │ src/lib/       │
# │  2  │ AuditLog.tsx               │ CREATE  │ src/components/audit/ │
# │  3  │ RbacGuard.tsx              │ CREATE  │ src/components/auth/  │
# │  4  │ exportUtils.ts             │ CREATE  │ src/lib/       │
# │  5  │ BbsObservations.tsx        │ CREATE  │ src/components/bbs/   │
# │  6  │ EnvironmentalMonitor.tsx   │ CREATE  │ src/components/environment/ │
# │  7  │ ContractorManager.tsx      │ CREATE  │ src/components/contractors/ │
# │  8  │ PpeInventory.tsx           │ CREATE  │ src/components/ppe/   │
# │  9  │ DocumentControl.tsx        │ CREATE  │ src/components/documents/ │
# │ 10  │ FatigueMonitor.tsx         │ CREATE  │ src/components/fatigue/ │
# │ 11  │ NotificationCenter.tsx     │ CREATE  │ src/components/notifications/ │
# │ 12  │ notificationTriggers.ts    │ CREATE  │ functions/src/ │
# │ 13  │ SafetyMeetings.tsx         │ CREATE  │ src/components/meetings/ │
# │ 14  │ OfflineSync.tsx            │ CREATE  │ src/components/offline/ │
# └─────────────────────────────────────────────────────────────┘


# ════════════════════════════════════════════════════════════════
# STEP 1 — Install missing dependencies
# ════════════════════════════════════════════════════════════════

# In your project root:
npm install jspdf jspdf-autotable xlsx

# jspdf       — PDF generation (exportUtils.ts)
# jspdf-autotable — PDF table formatting
# xlsx        — Excel export (exportUtils.ts)
# recharts    — already installed (used by Phase 2 KPI Dashboard)


# ════════════════════════════════════════════════════════════════
# STEP 2 — Create all new folders
# ════════════════════════════════════════════════════════════════

mkdir -p src/components/audit
mkdir -p src/components/auth
mkdir -p src/components/bbs
mkdir -p src/components/environment
mkdir -p src/components/contractors
mkdir -p src/components/ppe
mkdir -p src/components/documents
mkdir -p src/components/fatigue
mkdir -p src/components/notifications
mkdir -p src/components/meetings
mkdir -p src/components/offline


# ════════════════════════════════════════════════════════════════
# STEP 3 — File 1: auditLogger.ts
# ════════════════════════════════════════════════════════════════

DESTINATION:  src/lib/auditLogger.ts
ACTION:       CREATE new file

PURPOSE: Pure utility — no React. Call writeAuditLog() from any
DataContext handler after a successful Firestore write.

INTEGRATE INTO DataContext.tsx — add these calls inside each handler:

  // At the top of DataContext.tsx, add:
  import { writeAuditLog } from '../lib/auditLogger';

  // Inside handleCreateReport, after the successful setDoc:
  writeAuditLog({
    org_id:        activeOrg.id,
    user_id:       activeUser?.id ?? 'unknown',
    action:        'CREATE',
    resource_type: 'report',
    resource_id:   newReport.id,
    description:   `Incident report submitted: ${newReport.incident_type} at ${newReport.location}`,
    new_value:     { incident_type: newReport.incident_type, severity: newReport.severity },
    timestamp:     new Date().toISOString(),
  });

  // Inside handleUpdatePtw, after the successful updateDoc:
  writeAuditLog({
    org_id:        activeOrg.id,
    user_id:       activeUser?.id ?? 'unknown',
    action:        'STATUS_CHANGE',
    resource_type: 'ptw',
    resource_id:   ptw.id,
    description:   `PTW status → ${ptw.status}`,
    new_value:     { status: ptw.status },
    timestamp:     new Date().toISOString(),
  });

  // Pattern: add a similar call in EVERY handler in DataContext.tsx
  // (handleCreateInspection, handleUpdateInspection, handleCreateTbt, etc.)
  // This ensures a complete audit trail for all HSE data changes.


# ════════════════════════════════════════════════════════════════
# STEP 4 — File 2: AuditLog.tsx
# ════════════════════════════════════════════════════════════════

DESTINATION:  src/components/audit/AuditLog.tsx
ACTION:       CREATE new file

ADD TO src/App.tsx:
  import AuditLog from './components/audit/AuditLog';
  {activePage === 'audit-log' && <AuditLog />}

ADD SIDEBAR NAV ITEM (in your nav items array):
  { id: 'audit-log', label: 'Audit Log', icon: ClipboardList,
    roles: ['admin', 'hse_manager'] }

USE INLINE on any detail modal (shows that resource's history):
  import { AuditLog } from './components/audit/AuditLog';
  <AuditLog resourceType="report" resourceId={report.id} compact />
  <AuditLog resourceType="ptw"    resourceId={ptw.id}    compact />


# ════════════════════════════════════════════════════════════════
# STEP 5 — File 3: RbacGuard.tsx
# ════════════════════════════════════════════════════════════════

DESTINATION:  src/components/auth/RbacGuard.tsx
ACTION:       CREATE new file

This is immediately usable across the entire codebase. Replace any
manual role checks with the CanDo component or usePermission hook.

EXAMPLES — replace patterns like this:
  // OLD (manual role check):
  {activeUser?.role === 'admin' && <DeleteButton />}
  {['admin','hse_manager'].includes(activeUser?.role) && <ApproveBtn />}

  // NEW (using RbacGuard):
  import { CanDo, usePermission, PageGuard } from './components/auth/RbacGuard';

  <CanDo permission="report:delete">
    <DeleteButton />
  </CanDo>

  <CanDo permission="ptw:approve">
    <ApproveBtn />
  </CanDo>

  // Protect entire pages:
  <PageGuard permission="audit:view" onDenied={() => setActivePage('dashboard')}>
    <AuditLog />
  </PageGuard>

  // Hook for programmatic checks:
  const canDelete = usePermission('report:delete');
  if (!canDelete) { toast.error('Permission denied'); return; }

NOTE: RbacGuard is already imported and used in all Phase 3 components
(BbsObservations, EnvironmentalMonitor, ContractorManager, PpeInventory,
DocumentControl, FatigueMonitor, SafetyMeetings). They will work as soon
as you paste this file.


# ════════════════════════════════════════════════════════════════
# STEP 6 — File 4: exportUtils.ts
# ════════════════════════════════════════════════════════════════

DESTINATION:  src/lib/exportUtils.ts
ACTION:       CREATE new file

Already used by all Phase 3 components. Also replace existing export
logic in Phase 2 components (ComplianceRegister, KpiDashboard) with:

  import { exportTableToCsv, exportTableToExcel, exportTableToPdf } from '../../lib/exportUtils';
  import { exportKpiPdf, exportReportToPdf, exportCompliancePdf } from '../../lib/exportUtils';

  // In KpiDashboard.tsx, replace the inline exportCsv function with:
  const exportCsv = () => exportTableToCsv(
    [{ metric: 'LTIFR', value: snapshot.ltifr, unit: 'per 1M hrs' }, ...],
    [{ key: 'metric', label: 'KPI' }, { key: 'value', label: 'Value' }, { key: 'unit', label: 'Unit' }],
    'kpi-snapshot'
  );


# ════════════════════════════════════════════════════════════════
# STEP 7 — Files 5–10: Module components (BBS → Fatigue)
# ════════════════════════════════════════════════════════════════

Each module follows the same pattern. For each one:
  1. Create the folder (already done in Step 2)
  2. Paste the file
  3. Add import + route to App.tsx
  4. Add sidebar nav item

# ── File 5: BbsObservations.tsx ──────────────────────────────
DESTINATION:  src/components/bbs/BbsObservations.tsx

App.tsx route:
  import BbsObservations from './components/bbs/BbsObservations';
  {activePage === 'bbs' && <BbsObservations />}

Sidebar nav:
  { id: 'bbs', label: 'Safety Observations', icon: Eye,
    roles: ['admin','hse_manager','supervisor','worker'] }

# ── File 6: EnvironmentalMonitor.tsx ─────────────────────────
DESTINATION:  src/components/environment/EnvironmentalMonitor.tsx

App.tsx route:
  import EnvironmentalMonitor from './components/environment/EnvironmentalMonitor';
  {activePage === 'environment' && <EnvironmentalMonitor />}

Sidebar nav:
  { id: 'environment', label: 'Environmental', icon: Leaf,
    roles: ['admin','hse_manager','supervisor'] }

# ── File 7: ContractorManager.tsx ────────────────────────────
DESTINATION:  src/components/contractors/ContractorManager.tsx

App.tsx route:
  import ContractorManager from './components/contractors/ContractorManager';
  {activePage === 'contractors' && <ContractorManager />}

Sidebar nav:
  { id: 'contractors', label: 'Contractors', icon: HardHat,
    roles: ['admin','hse_manager','supervisor'] }

# ── File 8: PpeInventory.tsx ──────────────────────────────────
DESTINATION:  src/components/ppe/PpeInventory.tsx

App.tsx route:
  import PpeInventory from './components/ppe/PpeInventory';
  {activePage === 'ppe' && <PpeInventory />}

Sidebar nav:
  { id: 'ppe', label: 'PPE Inventory', icon: Shield,
    roles: ['admin','hse_manager','supervisor'] }

# ── File 9: DocumentControl.tsx ──────────────────────────────
DESTINATION:  src/components/documents/DocumentControl.tsx

App.tsx route:
  import DocumentControl from './components/documents/DocumentControl';
  {activePage === 'documents' && <DocumentControl />}

Sidebar nav:
  { id: 'documents', label: 'Document Control', icon: FolderOpen,
    roles: ['admin','hse_manager','supervisor','worker','viewer'] }

# ── File 10: FatigueMonitor.tsx ───────────────────────────────
DESTINATION:  src/components/fatigue/FatigueMonitor.tsx

App.tsx route:
  import FatigueMonitor from './components/fatigue/FatigueMonitor';
  {activePage === 'fatigue' && <FatigueMonitor />}

Sidebar nav:
  { id: 'fatigue', label: 'Fatigue & FFD', icon: Activity,
    roles: ['admin','hse_manager','supervisor'] }


# ════════════════════════════════════════════════════════════════
# STEP 8 — File 11: NotificationCenter.tsx
# ════════════════════════════════════════════════════════════════

DESTINATION:  src/components/notifications/NotificationCenter.tsx
ACTION:       CREATE new file

This file exports THREE things — use all three:

  A) NotificationBell — add to your top Navbar/Header:
  ────────────────────────────────────────────────────
  import { NotificationBell } from './components/notifications/NotificationCenter';

  // Find your Navbar/Header component (search for: className.*navbar OR className.*header)
  // Add inside it, next to the user avatar/menu:
  <NotificationBell onNavigate={(page, id) => setActivePage(page)} />

  B) NotificationCenter — full page view:
  ────────────────────────────────────────
  import NotificationCenter from './components/notifications/NotificationCenter';
  {activePage === 'notifications' && (
    <NotificationCenter onNavigate={(page, id) => setActivePage(page)} />
  )}

  C) createNotification — call from DataContext handlers:
  ────────────────────────────────────────────────────────
  import { createNotification } from './components/notifications/NotificationCenter';

  // In handleCreatePtw, after the permit is created, notify HSE managers:
  // (You need to know the HSE manager IDs — get them from usersList filtered by role)
  const hseManagers = usersList.filter(u => u.role === 'hse_manager');
  for (const mgr of hseManagers) {
    createNotification({
      org_id:    activeOrg.id,
      user_id:   mgr.id,
      type:      'ptw_approved',       // reuse type for "new submission"
      severity:  'info',
      title:     'New Permit Submitted',
      message:   `A ${ptwData.type} permit has been submitted for review.`,
      link_page: 'ptw',
      link_id:   newPtw.id,
      created_at: new Date().toISOString(),
    });
  }

SIDEBAR NAV (optional):
  { id: 'notifications', label: 'Notifications', icon: Bell,
    roles: ['admin','hse_manager','supervisor','worker','viewer','contractor'] }


# ════════════════════════════════════════════════════════════════
# STEP 9 — File 12: notificationTriggers.ts
# ════════════════════════════════════════════════════════════════

DESTINATION:  functions/src/notificationTriggers.ts
ACTION:       CREATE new file

ADD TO functions/src/index.ts — open the file and add these exports:

  // ADD these lines after the existing exports:
  export { onPtwStatusChange }    from './notificationTriggers';
  export { onIncidentCreated }    from './notificationTriggers';
  export { onActionOverdue }      from './notificationTriggers';
  export { onCertExpiry }         from './notificationTriggers';
  export { onEnvBreach }          from './notificationTriggers';
  export { dailyDigest }          from './notificationTriggers';

REQUIRED: Add firebase-functions v2 to functions/package.json if not present.
Your existing package.json already has firebase-functions — check it's v5+:
  "firebase-functions": "^5.0.0"

DEPLOY:
  firebase deploy --only functions

VERIFY in Firebase Console:
  Functions → should show 6 new functions:
  - onPtwStatusChange (Firestore trigger)
  - onIncidentCreated (Firestore trigger)
  - onActionOverdue   (Scheduled)
  - onCertExpiry      (Scheduled)
  - onEnvBreach       (Firestore trigger)
  - dailyDigest       (Scheduled)

NOTE: The environmental_readings collection is new (used by EnvironmentalMonitor.tsx).
You need to add it to firestore.rules. Open firestore.rules and add:

  match /environmental_readings/{readingId} {
    allow read: if canRead(resource.data.org_id) || isSuperAdmin();
    allow create: if canWrite(request.resource.data.org_id) || isSuperAdmin()
      && hasField('org_id')
      && hasField('parameter_name');
    allow update: if canWrite(resource.data.org_id) || isSuperAdmin();
    allow delete: if isOrgAdmin(resource.data.org_id) || isSuperAdmin();
  }

  // Also add these new collections (from Phase 3 modules):
  match /emergency_plans/{planId} {
    allow read: if canRead(resource.data.org_id) || isSuperAdmin();
    allow create, update: if canWrite(request.resource.data.org_id) || isSuperAdmin();
    allow delete: if isOrgAdmin(resource.data.org_id) || isSuperAdmin();
  }

  match /emergency_drills/{drillId} {
    allow read: if canRead(resource.data.org_id) || isSuperAdmin();
    allow create, update: if canWrite(request.resource.data.org_id) || isSuperAdmin();
    allow delete: if isOrgAdmin(resource.data.org_id) || isSuperAdmin();
  }

  match /bbs_observations/{obsId} {
    allow read: if canRead(resource.data.org_id) || isSuperAdmin();
    allow create: if isAuth() && callerOrg() == request.resource.data.org_id
      && callerRole() in ['admin','hse_manager','supervisor','worker'];
    allow update: if canWrite(resource.data.org_id) || isSuperAdmin();
    allow delete: if isOrgAdmin(resource.data.org_id) || isSuperAdmin();
  }

  match /contractor_companies/{companyId} {
    allow read: if canRead(resource.data.org_id) || isSuperAdmin();
    allow create, update: if canWrite(request.resource.data.org_id) || isSuperAdmin();
    allow delete: if isOrgAdmin(resource.data.org_id) || isSuperAdmin();
  }

  match /contractor_workers/{workerId} {
    allow read: if canRead(resource.data.org_id) || isSuperAdmin();
    allow create, update: if canWrite(request.resource.data.org_id) || isSuperAdmin();
    allow delete: if isOrgAdmin(resource.data.org_id) || isSuperAdmin();
  }

  match /ppe_items/{itemId} {
    allow read: if canRead(resource.data.org_id) || isSuperAdmin();
    allow create, update: if canWrite(request.resource.data.org_id) || isSuperAdmin();
    allow delete: if isOrgAdmin(resource.data.org_id) || isSuperAdmin();
  }

  match /documents/{docId} {
    allow read: if canRead(resource.data.org_id) || isSuperAdmin();
    allow create: if canWrite(request.resource.data.org_id) || isSuperAdmin();
    allow update: if canWrite(resource.data.org_id) || isSuperAdmin();
    allow delete: if isOrgAdmin(resource.data.org_id) || isSuperAdmin();
  }

  match /shift_logs/{logId} {
    allow read: if canRead(resource.data.org_id) || isSuperAdmin();
    allow create: if isAuth() && callerOrg() == request.resource.data.org_id;
    allow update: if canWrite(resource.data.org_id) || isSuperAdmin();
    allow delete: if isOrgAdmin(resource.data.org_id) || isSuperAdmin();
  }

  match /ffd_assessments/{assessId} {
    allow read: if canRead(resource.data.org_id) || isSuperAdmin();
    allow create: if canWrite(request.resource.data.org_id) || isSuperAdmin();
    allow update: if canWrite(resource.data.org_id) || isSuperAdmin();
    allow delete: if isOrgAdmin(resource.data.org_id) || isSuperAdmin();
  }

  match /meetings/{meetingId} {
    allow read: if canRead(resource.data.org_id) || isSuperAdmin();
    allow create: if canWrite(request.resource.data.org_id) || isSuperAdmin();
    allow update: if canWrite(resource.data.org_id) || isSuperAdmin();
    allow delete: if isOrgAdmin(resource.data.org_id) || isSuperAdmin();
  }


# ════════════════════════════════════════════════════════════════
# STEP 10 — File 13: SafetyMeetings.tsx
# ════════════════════════════════════════════════════════════════

DESTINATION:  src/components/meetings/SafetyMeetings.tsx

App.tsx route:
  import SafetyMeetings from './components/meetings/SafetyMeetings';
  {activePage === 'meetings' && <SafetyMeetings />}

Sidebar nav:
  { id: 'meetings', label: 'Safety Meetings', icon: Users,
    roles: ['admin','hse_manager','supervisor'] }


# ════════════════════════════════════════════════════════════════
# STEP 11 — File 14: OfflineSync.tsx
# ════════════════════════════════════════════════════════════════

DESTINATION:  src/components/offline/OfflineSync.tsx
ACTION:       CREATE new file

This exports four things — use all four:

  A) OfflineSyncProvider — wrap your root component:
  ────────────────────────────────────────────────
  In src/App.tsx, find the outermost return() in AppContent:

  BEFORE:
    return (
      <div className="app-shell">
        <Navbar />
        <main>...</main>
      </div>
    );

  AFTER:
    import { OfflineSyncProvider, OfflineStatusBar, NetworkStatusDot }
      from './components/offline/OfflineSync';

    return (
      <OfflineSyncProvider>
        <OfflineStatusBar />       {/* ← shows offline banner */}
        <div className="app-shell">
          <Navbar>
            <NetworkStatusDot />  {/* ← small dot in navbar */}
          </Navbar>
          <main>...</main>
        </div>
      </OfflineSyncProvider>
    );

  B) useOfflineQueue — use in DataContext for writes:
  ────────────────────────────────────────────────────
  NOTE: Full integration requires moving the OfflineSyncProvider
  above DataProvider in the context tree so DataContext can call
  useOfflineQueue. The simpler approach is to use it selectively
  in components where offline support matters most (incident
  reporting forms, checklist runs, BBS observations).

  Example in a report form component:
    import { useOfflineQueue } from '../offline/OfflineSync';
    const { queueWrite, isOnline } = useOfflineQueue();

    const handleSubmit = async () => {
      await queueWrite({
        collection: 'reports',
        docId:      newReport.id,
        data:       newReport,
        operation:  'set',
        org_id:     activeOrg.id,
      });
      // Optimistic UI update regardless of online/offline
      setReportList(prev => [newReport, ...prev]);
    };

  C) OfflineQueueViewer — show in Settings page:
  ───────────────────────────────────────────────
    import { OfflineQueueViewer } from '../offline/OfflineSync';
    // In your Settings page:
    <OfflineQueueViewer />

  D) NetworkStatusDot — in Navbar:
  ─────────────────────────────────
    import { NetworkStatusDot } from '../offline/OfflineSync';
    <NetworkStatusDot />


# ════════════════════════════════════════════════════════════════
# STEP 12 — Complete App.tsx imports block
# ════════════════════════════════════════════════════════════════

# Add ALL Phase 3 imports to src/App.tsx at once:

import AuditLog             from './components/audit/AuditLog';
import BbsObservations      from './components/bbs/BbsObservations';
import EnvironmentalMonitor from './components/environment/EnvironmentalMonitor';
import ContractorManager    from './components/contractors/ContractorManager';
import PpeInventory         from './components/ppe/PpeInventory';
import DocumentControl      from './components/documents/DocumentControl';
import FatigueMonitor       from './components/fatigue/FatigueMonitor';
import NotificationCenter,
  { NotificationBell }      from './components/notifications/NotificationCenter';
import SafetyMeetings       from './components/meetings/SafetyMeetings';
import {
  OfflineSyncProvider,
  OfflineStatusBar,
  NetworkStatusDot,
}                           from './components/offline/OfflineSync';
import { PageGuard }        from './components/auth/RbacGuard';

# Add ALL Phase 3 routes to your page render block:

{activePage === 'audit-log'    && <PageGuard permission="audit:view"        onDenied={() => setActivePage('dashboard')}><AuditLog /></PageGuard>}
{activePage === 'bbs'          && <BbsObservations />}
{activePage === 'environment'  && <PageGuard permission="environment:view"  onDenied={() => setActivePage('dashboard')}><EnvironmentalMonitor /></PageGuard>}
{activePage === 'contractors'  && <PageGuard permission="contractor:view"   onDenied={() => setActivePage('dashboard')}><ContractorManager /></PageGuard>}
{activePage === 'ppe'          && <PageGuard permission="ppe:view"          onDenied={() => setActivePage('dashboard')}><PpeInventory /></PageGuard>}
{activePage === 'documents'    && <DocumentControl />}
{activePage === 'fatigue'      && <PageGuard permission="fatigue:view"      onDenied={() => setActivePage('dashboard')}><FatigueMonitor /></PageGuard>}
{activePage === 'notifications'&& <NotificationCenter onNavigate={(p, id) => setActivePage(p)} />}
{activePage === 'meetings'     && <SafetyMeetings />}


# ════════════════════════════════════════════════════════════════
# STEP 13 — Complete sidebar nav items to add
# ════════════════════════════════════════════════════════════════

# In your Sidebar/Navigation component, add these items.
# Find the navItems array (search for: id: 'reports' or id: 'dashboard')
# and add the following objects:

{ id: 'bbs',           label: 'Safety Observations', icon: Eye,         roles: ['admin','hse_manager','supervisor','worker'] },
{ id: 'environment',   label: 'Environmental',        icon: Leaf,        roles: ['admin','hse_manager','supervisor'] },
{ id: 'contractors',   label: 'Contractors',          icon: HardHat,     roles: ['admin','hse_manager','supervisor'] },
{ id: 'ppe',           label: 'PPE Inventory',        icon: Shield,      roles: ['admin','hse_manager','supervisor'] },
{ id: 'documents',     label: 'Document Control',     icon: FolderOpen,  roles: ['admin','hse_manager','supervisor','worker','viewer'] },
{ id: 'fatigue',       label: 'Fatigue & FFD',        icon: Activity,    roles: ['admin','hse_manager','supervisor'] },
{ id: 'meetings',      label: 'Safety Meetings',      icon: Users,       roles: ['admin','hse_manager','supervisor'] },
{ id: 'audit-log',     label: 'Audit Log',            icon: ClipboardList, roles: ['admin','hse_manager'] },
{ id: 'notifications', label: 'Notifications',        icon: Bell,        roles: ['admin','hse_manager','supervisor','worker','viewer','contractor'] },

# Required lucide-react imports for the new icons:
import {
  Eye, Leaf, HardHat, Shield, FolderOpen,
  Activity, Users, ClipboardList, Bell,
} from 'lucide-react';


# ════════════════════════════════════════════════════════════════
# STEP 14 — Deploy
# ════════════════════════════════════════════════════════════════

# 1. Update Firestore rules (add new collections from Step 9):
firebase deploy --only firestore:rules

# 2. Deploy Cloud Function triggers:
firebase deploy --only functions

# 3. Build and deploy frontend:
npm run build
firebase deploy --only hosting
# or: vercel --prod  /  netlify deploy --prod


# ════════════════════════════════════════════════════════════════
# QUICK FIND COMMANDS — locate exact locations in your codebase
# ════════════════════════════════════════════════════════════════

# Find your Navbar/Header component:
grep -r "className.*nav\|NavBar\|Header\|topbar" src/ --include="*.tsx" -l

# Find where nav items are defined:
grep -r "id: 'reports'\|id: 'dashboard'\|navItems\|sidebarItems" src/ -l

# Find where pages are rendered (the activePage switch/map):
grep -r "activePage ===\|activePage ==" src/ --include="*.tsx" -l

# Find where to add OfflineSyncProvider (outermost component):
grep -r "AppContent\|RouterProvider\|BrowserRouter\|<App" src/ --include="*.tsx" -l

# Find all places that need auditLogger calls:
grep -r "handleCreate\|handleUpdate\|handleStatus\|patchDoc\|writeDoc" src/contexts/ --include="*.tsx"

# Verify no direct Gemini keys remain (from Phase 1):
grep -r "VITE_GEMINI_API_KEY\|GoogleGenerativeAI" src/ --include="*.ts" --include="*.tsx"


# ════════════════════════════════════════════════════════════════
# COMPLETE PROJECT STRUCTURE AFTER ALL THREE PHASES
# ════════════════════════════════════════════════════════════════

# your-project/
# ├── firestore.rules              ← Phase 1 (+ Phase 3 additions above)
# ├── firestore.indexes.json       ← Phase 1
# ├── .env                         ← No VITE_GEMINI_API_KEY
# │
# ├── functions/src/
# │   ├── index.ts                 ← Phase 1 + Phase 3 exports added
# │   ├── geminiProxy.ts           ← Phase 1
# │   └── notificationTriggers.ts ← Phase 3
# │
# └── src/
#     ├── contexts/
#     │   └── DataContext.tsx      ← Phase 1 (+ auditLogger calls added)
#     ├── components/
#     │   ├── AuthSync.tsx         ← Phase 1
#     │   ├── audit/
#     │   │   └── AuditLog.tsx     ← Phase 3
#     │   ├── auth/
#     │   │   └── RbacGuard.tsx    ← Phase 3
#     │   ├── bbs/
#     │   │   └── BbsObservations.tsx ← Phase 3
#     │   ├── compliance/
#     │   │   └── ComplianceRegister.tsx ← Phase 2
#     │   ├── contractors/
#     │   │   └── ContractorManager.tsx ← Phase 3
#     │   ├── documents/
#     │   │   └── DocumentControl.tsx ← Phase 3
#     │   ├── emergency/
#     │   │   └── EmergencyResponse.tsx ← Phase 2
#     │   ├── environment/
#     │   │   └── EnvironmentalMonitor.tsx ← Phase 3
#     │   ├── fatigue/
#     │   │   └── FatigueMonitor.tsx ← Phase 3
#     │   ├── kpi/
#     │   │   └── KpiDashboard.tsx ← Phase 2
#     │   ├── meetings/
#     │   │   └── SafetyMeetings.tsx ← Phase 3
#     │   ├── notifications/
#     │   │   └── NotificationCenter.tsx ← Phase 3
#     │   ├── offline/
#     │   │   └── OfflineSync.tsx  ← Phase 3
#     │   ├── ppe/
#     │   │   └── PpeInventory.tsx ← Phase 3
#     │   ├── ptw/
#     │   │   └── PtwDetailModal.tsx ← Phase 1
#     │   ├── rca/
#     │   │   └── RcaModule.tsx    ← Phase 2
#     │   └── risk-matrix/
#     │       └── RiskMatrix.tsx   ← Phase 2
#     └── lib/
#         ├── auditLogger.ts       ← Phase 3
#         ├── certificationAlerts.ts ← Phase 2
#         ├── exportUtils.ts       ← Phase 3
#         ├── geminiClient.ts      ← Phase 1
#         └── kpiCalculations.ts   ← Phase 2