/**
 * FILE: src/App.tsx
 * PASTE AT: src/App.tsx  (REPLACE the entire existing file)
 *
 * ── WHAT CHANGED FROM THE ORIGINAL ──────────────────────────────────────────
 *
 * Phase 1 fixes:
 *   - AuthSync replaced with the new src/components/AuthSync.tsx (B2 fix)
 *   - users={[]} → users={usersList} on <Ptw> and <Trainings> (B5 fix)
 *   - handleUpdatePtw now receives the full ptw object only (B1 fix)
 *
 * Phase 2 additions:
 *   - KpiDashboard, RcaModule, ComplianceRegister,
 *     EmergencyResponse, RiskMatrix routes added
 *
 * Phase 3 additions:
 *   - OfflineSyncProvider + OfflineStatusBar wrapping the whole app
 *   - NotificationBell in the top bar
 *   - BbsObservations, EnvironmentalMonitor, ContractorManager,
 *     PpeInventory, DocumentControl, FatigueMonitor,
 *     SafetyMeetings, AuditLog, NotificationCenter routes added
 *   - PageGuard wrapping restricted pages
 *
 * Phase 4 additions:
 *   - DragDropDashboard replaces old Dashboard on 'dashboard' view
 *   - MobileNav added (auto-hides sidebar on mobile)
 *   - DataExportHub and GdprControls routes added
 *   - GuidedWizards wired into Reports and PTW pages
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// ── Contexts ──────────────────────────────────────────────────────────────────
import {
  AppProvider,
  DataProvider,
  ModalProvider,
  useAppContext,
  useDataContext,
  useModalContext,
} from './contexts';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// ── UI primitives ─────────────────────────────────────────────────────────────
import { ToastProvider }  from './components/ui/Toast';
import { PtwWorkflowProvider } from './contexts/PtwWorkflowContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginScreen }    from './components/LoginScreen';
import { DemoBanner }     from './components/DemoBanner';
import { Sidebar }        from './components/Sidebar';
import { roles as rolesConfig } from './config';
import type { User }      from './types';

// ── Phase 1: Fixed AuthSync ───────────────────────────────────────────────────
import AuthSync from './components/AuthSync';

// ── Phase 3: Offline sync + notifications ────────────────────────────────────
import {
  OfflineSyncProvider,
  OfflineStatusBar,
  NetworkStatusDot,
} from './components/offline/OfflineSync';
import {
  NotificationBell,
  NotificationCenter,
} from './components/notifications/NotificationCenter';

// ── Phase 3: RBAC ─────────────────────────────────────────────────────────────
import { PageGuard } from './components/auth/RbacGuard';

// ── Phase 4: Mobile nav + drag-drop dashboard ────────────────────────────────
import { MobileNav, useMobileNav } from './components/layout/MobileNav';

// ─────────────────────────────────────────────────────────────────────────────
// Original feature components (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
import { Reports }         from './components/Reports';
import { Inspections }     from './components/Inspections';
import { Ptw }             from './components/Ptw';
import { Rams }            from './components/Rams';
import { Plans }           from './components/Plans';
import { Actions }         from './components/Actions';
import { Checklists }      from './components/Checklists';
import { Tbt }             from './components/Tbt';
import { Trainings }       from './components/Trainings';
import { People }          from './components/People';
import { Roles }           from './components/Roles';
import { Organizations }   from './components/Organizations';
import { ChemicalRegister }   from './components/ChemicalRegister';
import { CorrectiveActions }  from './components/CorrectiveActions';
import { ManHoursLogger }     from './components/ManHoursLogger';
import { AuditInspection }    from './components/AuditInspection';
import { Projects }        from './components/Projects';
import { Signage }         from './components/Signage';
import { AiInsights }      from './components/AiInsights';
import { Settings }        from './components/Settings';
import { SiteMap }         from './components/SiteMap';
import { Housekeeping }    from './components/Housekeeping';
import { CertifiedProfile } from './components/CertifiedProfile';
import { HseStatistics }   from './components/HseStatistics';

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — New modules
// ─────────────────────────────────────────────────────────────────────────────
import KpiDashboard        from './components/kpi/KpiDashboard';
import { RcaModule }       from './components/rca/RcaModule';
import { ComplianceRegister } from './components/compliance/ComplianceRegister';
import { EmergencyResponse }  from './components/emergency/EmergencyResponse';
import { RiskMatrix }      from './components/risk-matrix/RiskMatrix';

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — Advanced modules
// ─────────────────────────────────────────────────────────────────────────────
import { AuditLog }            from './components/audit/AuditLog';
import { BbsObservations }     from './components/bbs/BbsObservations';
import { EnvironmentalMonitor } from './components/environment/EnvironmentalMonitor';
import { ContractorManager }   from './components/contractors/ContractorManager';
import { PpeInventory }        from './components/ppe/PpeInventory';
import { DocumentControl }     from './components/documents/DocumentControl';
import { FatigueMonitor }      from './components/fatigue/FatigueMonitor';
import { SafetyMeetings }      from './components/meetings/SafetyMeetings';

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 — UI/UX modules
// ─────────────────────────────────────────────────────────────────────────────
import { DragDropDashboard }  from './components/dashboard/DragDropDashboard';
import { IncidentWizard, PtwWizard } from './components/wizards/GuidedWizards';
import DataExportHub          from './components/export/DataExportHub';
import GdprControls           from './components/settings/GdprControls';

// ─────────────────────────────────────────────────────────────────────────────
// Original modals (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
import { ReportCreationModal }     from './components/ReportCreationModal';
import { ReportDetailModal }       from './components/ReportDetailModal';
import { PtwCreationModal }        from './components/PtwCreationModal';
import { PtwDetailModal }          from './components/PtwDetailModal';
import { PlanCreationModal }       from './components/PlanCreationModal';
import { PlanEditorModal }         from './components/PlanEditorModal';
import { PlanDetailModal }         from './components/PlanDetailModal';
import { RamsCreationModal }       from './components/RamsCreationModal';
import { RamsEditorModal }         from './components/RamsEditorModal';
import { RamsDetailModal }         from './components/RamsDetailModal';
import { TbtCreationModal }        from './components/TbtCreationModal';
import { TbtSessionModal }         from './components/TbtSessionModal';
import { TrainingCourseModal }     from './components/TrainingCourseModal';
import { TrainingSessionModal }    from './components/TrainingSessionModal';
import { SessionAttendanceModal }  from './components/SessionAttendanceModal';
import { ActionCreationModal }     from './components/ActionCreationModal';
import { InspectionCreationModal } from './components/InspectionCreationModal';
import { InspectionConductModal }  from './components/InspectionConductModal';
import { ChecklistRunModal }       from './components/ChecklistRunModal';
import { ChecklistDetailModal }    from './components/ChecklistDetailModal';

// ─────────────────────────────────────────────────────────────────────────────
// Global Modals (unchanged from original — only PtwDetailModal call updated)
// ─────────────────────────────────────────────────────────────────────────────

const GlobalModals: React.FC<{ onInvestigate: (report: any) => void }> = ({ onInvestigate }) => {
  const { activeUser, usersList } = useAppContext();
  const {
    isReportCreationModalOpen, setIsReportCreationModalOpen,
    selectedReport, setSelectedReport, reportInitialData,
    isPtwCreationModalOpen, setIsPtwCreationModalOpen,
    ptwCreationMode, selectedPtw, setSelectedPtw,
    isPlanCreationModalOpen, setIsPlanCreationModalOpen,
    selectedPlan, setSelectedPlan,
    selectedPlanForEdit, setSelectedPlanForEdit,
    isRamsCreationModalOpen, setIsRamsCreationModalOpen,
    selectedRams, setSelectedRams,
    selectedRamsForEdit, setSelectedRamsForEdit,
    isTbtCreationModalOpen, setIsTbtCreationModalOpen,
    selectedTbt, setSelectedTbt,
    isCourseModalOpen, setCourseModalOpen,
    isSessionModalOpen, setSessionModalOpen,
    isAttendanceModalOpen, setAttendanceModalOpen,
    courseForSession, sessionForAttendance,
    isActionCreationModalOpen, setIsActionCreationModalOpen,
    isInspectionCreationModalOpen, setIsInspectionCreationModalOpen,
  } = useModalContext();

  const {
    handleCreateReport, handleStatusChange, handleCapaActionChange, handleAddCapaAction, handleAcknowledgeReport,
    handleCreatePtw, handleUpdatePtw,
    handleCreatePlan, handlePlanStatusChange, handleUpdatePlan,
    handleCreateRams, handleRamsStatusChange, handleUpdateRams,
    handleCreateTbt, handleUpdateTbt,
    handleCreateOrUpdateCourse, handleScheduleSession, handleCloseSession,
    handleCreateStandaloneAction, handleCreateInspection,
    projects, trainingCourseList, checklistTemplates,
  } = useDataContext();

  if (!activeUser) return null;

  return (
    <>
      <ReportCreationModal
        isOpen={isReportCreationModalOpen}
        onClose={() => setIsReportCreationModalOpen(false)}
        initialData={reportInitialData}
      />
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          users={usersList}
          activeUser={activeUser}
          onClose={() => setSelectedReport(null)}
          onStatusChange={handleStatusChange}
          onCapaActionChange={handleCapaActionChange}
          onAddCapaAction={handleAddCapaAction}
          onAcknowledgeReport={handleAcknowledgeReport}
          onInvestigate={(report) => { setSelectedReport(null); onInvestigate(report); }}
        />
      )}
      <PtwCreationModal
        isOpen={isPtwCreationModalOpen}
        onClose={() => setIsPtwCreationModalOpen(false)}
        onSubmit={handleCreatePtw}
        mode={ptwCreationMode}
      />
      {/* Phase 1 fix B1: PtwDetailModal now receives onUpdate without action string */}
      {selectedPtw && (
        <PtwDetailModal
          ptw={selectedPtw}
          onClose={() => setSelectedPtw(null)}
          onUpdate={(ptw) => handleUpdatePtw(ptw)}
        />
      )}
      <PlanCreationModal
        isOpen={isPlanCreationModalOpen}
        onClose={() => setIsPlanCreationModalOpen(false)}
        onSubmit={handleCreatePlan}
        projects={projects}
      />
      {selectedPlan && (
        <PlanDetailModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onStatusChange={handlePlanStatusChange}
        />
      )}
      {selectedPlanForEdit && (
        <PlanEditorModal
          plan={selectedPlanForEdit}
          onClose={() => setSelectedPlanForEdit(null)}
          onSave={handleUpdatePlan}
          onSubmitForReview={handlePlanStatusChange}
        />
      )}
      <RamsCreationModal
        isOpen={isRamsCreationModalOpen}
        onClose={() => setIsRamsCreationModalOpen(false)}
        onSubmit={handleCreateRams}
        projects={projects}
        activeUser={activeUser}
      />
      {selectedRams && (
        <RamsDetailModal
          rams={selectedRams}
          onClose={() => setSelectedRams(null)}
          onStatusChange={handleRamsStatusChange}
        />
      )}
      {selectedRamsForEdit && (
        <RamsEditorModal
          rams={selectedRamsForEdit}
          onClose={() => setSelectedRamsForEdit(null)}
          onSave={handleUpdateRams}
          onSubmitForReview={handleRamsStatusChange}
        />
      )}
      <TbtCreationModal
        isOpen={isTbtCreationModalOpen}
        onClose={() => setIsTbtCreationModalOpen(false)}
        onSubmit={handleCreateTbt}
        projects={projects}
        activeUser={activeUser}
      />
      {selectedTbt && (
        <TbtSessionModal
          session={selectedTbt}
          onClose={() => setSelectedTbt(null)}
          onUpdate={handleUpdateTbt}
          users={usersList}
        />
      )}
      <TrainingCourseModal
        isOpen={isCourseModalOpen}
        onClose={() => setCourseModalOpen(false)}
        courses={trainingCourseList}
        onUpdateCourse={handleCreateOrUpdateCourse}
      />
      {courseForSession && (
        <TrainingSessionModal
          isOpen={isSessionModalOpen}
          onClose={() => setSessionModalOpen(false)}
          onSubmit={handleScheduleSession}
          course={courseForSession}
          projects={projects}
          users={usersList}
        />
      )}
      {sessionForAttendance && (
        <SessionAttendanceModal
          isOpen={isAttendanceModalOpen}
          onClose={() => setAttendanceModalOpen(false)}
          onSubmit={handleCloseSession}
          session={sessionForAttendance}
          users={usersList}
        />
      )}
      <ActionCreationModal
        isOpen={isActionCreationModalOpen}
        onClose={() => setIsActionCreationModalOpen(false)}
        onSubmit={handleCreateStandaloneAction}
        users={usersList}
        projects={projects}
      />
      <InspectionCreationModal
        isOpen={isInspectionCreationModalOpen}
        onClose={() => setIsInspectionCreationModalOpen(false)}
        onSubmit={handleCreateInspection}
        projects={projects}
        users={usersList}
        checklistTemplates={checklistTemplates}
      />
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main App Content
// ─────────────────────────────────────────────────────────────────────────────

const AppContent: React.FC = () => {
  const { currentView, setCurrentView, activeUser, usersList } = useAppContext();
  const { currentUser, loading: authLoading } = useAuth();
  const { isLoading: dataLoading } = useDataContext();

  const {
    projects, ptwList,
    trainingCourseList, trainingRecordList, trainingSessionList,
    reportList,
  } = useDataContext();

  const {
    setSelectedPlan, setSelectedPlanForEdit, setIsPlanCreationModalOpen,
    setSelectedRams, setSelectedRamsForEdit, setIsRamsCreationModalOpen,
    setCourseModalOpen, setSessionModalOpen, setCourseForSession,
    setAttendanceModalOpen, setSessionForAttendance,
    setIsPtwCreationModalOpen, setPtwCreationMode, setSelectedPtw,
    setIsReportCreationModalOpen,
  } = useModalContext();

  // Phase 4: mobile detection
  const { isMobile } = useMobileNav();

  // Phase 4: guided wizard state
  const [showIncidentWizard, setShowIncidentWizard] = useState(false);
  const [showPtwWizard, setShowPtwWizard]           = useState(false);

  // Phase 3: selected report for RCA
  const [rcaReport, setRcaReport] = useState<any>(null);

  // Notification unread count (placeholder — wire to NotificationCenter state)
  const [unreadNotifCount] = useState(0);

  const { handleCreateReport, handleCreatePtw } = useDataContext();

  // ── Loading state ────────────────────────────────────────────────────────
  if (authLoading || (currentUser && dataLoading)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white flex-col gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
        <p className="text-slate-400 animate-pulse">Loading EviroSafe...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 transition-all duration-300">

      {/* Phase 3: offline status banner — full width at very top */}
      <OfflineStatusBar />

      {/* Sidebar — hidden on mobile (Phase 4) */}
      {!isMobile && (
        <Sidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          isOpen={true}
          setOpen={() => {}}
        />
      )}

      {/* Main content area */}
      <main
        className="flex-1 min-h-screen flex flex-col transition-all duration-300"
        style={{ paddingBottom: isMobile ? '72px' : '0' }}
      >
        <DemoBanner />

        {/* Top bar — notification bell + network status */}
        <div className="flex items-center justify-end gap-3 px-6 pt-3 pb-1">
          <NetworkStatusDot />
          <NotificationBell
            onNavigate={(page) => setCurrentView(page)}
          />
        </div>

        {/* Page content */}
        <div className="flex-1 p-6 overflow-y-auto">

          {/* ── Phase 4: Drag-drop dashboard replaces original ── */}
          {currentView === 'dashboard' && (
            <DragDropDashboard onNavigate={(page) => setCurrentView(page)} />
          )}

          {/* ── Original pages (unchanged) ── */}
          {currentView === 'site-map' && (
            <div className="h-[calc(100vh-8rem)]"><SiteMap /></div>
          )}

          {currentView === 'reports' && (
            <>
              {/* Phase 4: Guided wizard launch button — add above <Reports /> */}
              <div className="flex justify-end mb-3">
                <button
                  onClick={() => setShowIncidentWizard(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold mr-2"
                >
                  ✦ Guided Report
                </button>
              </div>
              <Reports />
            </>
          )}

          {currentView === 'ptw' && (
            <>
              {/* Phase 4: Guided PTW wizard */}
              <div className="flex justify-end mb-3">
                <button
                  onClick={() => setShowPtwWizard(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold"
                >
                  ✦ Guided Permit
                </button>
              </div>
              {/* Phase 1 fix B5: users={usersList} instead of users={[]} */}
              <Ptw
                ptws={ptwList}
                users={usersList}
                projects={projects}
                onCreatePtw={() => { setPtwCreationMode('new'); setIsPtwCreationModalOpen(true); }}
                onAddExistingPtw={() => { setPtwCreationMode('existing'); setIsPtwCreationModalOpen(true); }}
                onSelectPtw={setSelectedPtw}
              />
            </>
          )}

          {currentView === 'inspections' && <Inspections />}
          {currentView === 'actions'     && <Actions />}

          {currentView === 'plans' && (
            <Plans
              onSelectPlan={(plan) =>
                plan.status === 'draft'
                  ? setSelectedPlanForEdit(plan)
                  : setSelectedPlan(plan)
              }
              onNewPlan={() => setIsPlanCreationModalOpen(true)}
            />
          )}

          {currentView === 'rams' && (
            <Rams
              onSelectRams={(rams) =>
                rams.status === 'draft'
                  ? setSelectedRamsForEdit(rams)
                  : setSelectedRams(rams)
              }
              onNewRams={() => setIsRamsCreationModalOpen(true)}
            />
          )}

          {currentView === 'checklists' && <Checklists />}
          {currentView === 'tbt'        && <Tbt />}

          {currentView === 'training' && (
            // Phase 1 fix B5: users={usersList} instead of users={[]}
            <Trainings
              courses={trainingCourseList}
              records={trainingRecordList}
              sessions={trainingSessionList}
              users={usersList}
              projects={projects}
              onManageCourses={() => setCourseModalOpen(true)}
              onScheduleSession={(course) => {
                setCourseForSession(course);
                setSessionModalOpen(true);
              }}
              onManageAttendance={(session) => {
                setSessionForAttendance(session);
                setAttendanceModalOpen(true);
              }}
            />
          )}

          {currentView === 'people'        && <People />}
          {currentView === 'roles'          && <Roles roles={rolesConfig} />}
          {currentView === 'organizations'  && <Organizations />}
          {currentView === 'chemical-register'  && <ChemicalRegister />}
          {currentView === 'corrective-actions' && <CorrectiveActions />}
          {currentView === 'man-hours'           && <ManHoursLogger />}
          {currentView === 'audit-inspection'    && <AuditInspection />}
          {currentView === 'projects'       && <Projects />}
          {currentView === 'signage'        && <Signage />}
          {currentView === 'ai-insights'    && <AiInsights />}
          {currentView === 'settings'       && <Settings />}
          {currentView === 'housekeeping'   && <Housekeeping />}
          {currentView === 'certification'  && <CertifiedProfile />}
          {currentView === 'hse-statistics' && <HseStatistics />}

          {/* ── Phase 2: New modules ── */}
          {currentView === 'kpi' && (
            <PageGuard
              permission="kpi:view"
              onDenied={() => setCurrentView('dashboard')}
            >
              <KpiDashboard industry="Construction" />
            </PageGuard>
          )}

          {currentView === 'risk-matrix' && (
            <PageGuard
              permission="kpi:view"
              onDenied={() => setCurrentView('dashboard')}
            >
              <RiskMatrix />
            </PageGuard>
          )}

          {currentView === 'compliance' && (
            <PageGuard
              permission="compliance:view"
              onDenied={() => setCurrentView('dashboard')}
            >
              <ComplianceRegister />
            </PageGuard>
          )}

          {currentView === 'emergency' && (
            <PageGuard
              permission="emergency:view"
              onDenied={() => setCurrentView('dashboard')}
            >
              <EmergencyResponse />
            </PageGuard>
          )}

          {/* RCA — launched from report detail, not directly from nav */}
          {currentView === 'rca' && (
            rcaReport ? (
              <RcaModule
                report={rcaReport}
                onClose={() => { setRcaReport(null); setCurrentView('reports'); }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-32 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(16,185,129,0.1)' }}>
                  <span style={{ fontSize: 28 }}>🔍</span>
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Root Cause Analysis</h2>
                <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--text-muted)' }}>
                  Open an incident report, then click <strong style={{ color: 'var(--text-primary)' }}>"Investigate (RCA)"</strong> to start a root cause analysis for that incident.
                </p>
                <button className="giq-btn-primary" onClick={() => setCurrentView('reports')}>
                  Go to Incident Reports
                </button>
              </div>
            )
          )}

          {/* ── Phase 3: Advanced modules ── */}
          {currentView === 'bbs' && <BbsObservations />}

          {currentView === 'environment' && (
            <PageGuard
              permission="environment:view"
              onDenied={() => setCurrentView('dashboard')}
            >
              <EnvironmentalMonitor />
            </PageGuard>
          )}

          {currentView === 'contractors' && (
            <PageGuard
              permission="contractor:view"
              onDenied={() => setCurrentView('dashboard')}
            >
              <ContractorManager />
            </PageGuard>
          )}

          {currentView === 'ppe' && (
            <PageGuard
              permission="ppe:view"
              onDenied={() => setCurrentView('dashboard')}
            >
              <PpeInventory />
            </PageGuard>
          )}

          {currentView === 'documents' && <DocumentControl />}

          {currentView === 'fatigue' && (
            <PageGuard
              permission="fatigue:view"
              onDenied={() => setCurrentView('dashboard')}
            >
              <FatigueMonitor />
            </PageGuard>
          )}

          {currentView === 'meetings' && <SafetyMeetings />}

          {currentView === 'audit-log' && (
            <PageGuard
              permission="audit:view"
              onDenied={() => setCurrentView('dashboard')}
            >
              <AuditLog />
            </PageGuard>
          )}

          {currentView === 'notifications' && (
            <NotificationCenter
              onNavigate={(page) => setCurrentView(page)}
            />
          )}

          {/* ── Phase 4: UI/UX modules ── */}
          {currentView === 'exports' && (
            <PageGuard
              permission="report:export"
              onDenied={() => setCurrentView('dashboard')}
            >
              <DataExportHub />
            </PageGuard>
          )}

          {currentView === 'privacy' && (
            <PageGuard
              permission="settings:admin"
              onDenied={() => setCurrentView('dashboard')}
            >
              <GdprControls />
            </PageGuard>
          )}

        </div>
      </main>

      {/* Phase 3: original modals */}
      <GlobalModals onInvestigate={(report) => {
        setRcaReport(report);
        setCurrentView('rca');
      }} />

      {/* Phase 4: Mobile bottom navigation */}
      <MobileNav
        activePage={currentView}
        onNavigate={(page) => setCurrentView(page)}
        notifications={unreadNotifCount}
      />

      {/* Phase 4: Guided Incident Wizard */}
      {showIncidentWizard && (
        <IncidentWizard
          onComplete={(data) => {
            handleCreateReport(data);
            setShowIncidentWizard(false);
          }}
          onCancel={() => setShowIncidentWizard(false)}
        />
      )}

      {/* Phase 4: Guided PTW Wizard */}
      {showPtwWizard && (
        <PtwWizard
          onComplete={(data) => {
            handleCreatePtw(data);
            setShowPtwWizard(false);
          }}
          onCancel={() => setShowPtwWizard(false)}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Root App — provider tree (Phase 3: OfflineSyncProvider added outermost)
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppProvider>
          {/* Phase 1: Fixed AuthSync replaces the inline one */}
          <AuthSync />
          <DataProvider>
            <ModalProvider>
              {/* Phase 3: Offline sync wraps everything that needs queueWrite */}
              <OfflineSyncProvider>
                <ThemeProvider>
                  <PtwWorkflowProvider>
                    <AppContent />
                  </PtwWorkflowProvider>
                </ThemeProvider>
              </OfflineSyncProvider>
            </ModalProvider>
          </DataProvider>
        </AppProvider>
      </ToastProvider>
    </AuthProvider>
  );
}