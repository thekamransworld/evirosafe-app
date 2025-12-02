
import React from 'react';
import { AppProvider, DataProvider, ModalProvider, useAppContext, useDataContext, useModalContext } from './contexts';
import { AuthProvider, useAuth } from './contexts/AuthContext'; // <--- NEW IMPORT
import { LoginScreen } from './components/LoginScreen';
import { DemoBanner } from './components/DemoBanner';
import { ToastProvider } from './components/ui/Toast';
import { roles as rolesConfig } from './config'; 

// --- Import Feature Components ---
import { Dashboard } from './components/Dashboard';
import { Reports } from './components/Reports';
import { Inspections } from './components/Inspections';
import { Ptw } from './components/Ptw';
import { Rams } from './components/Rams';
import { Plans } from './components/Plans';
import { Actions } from './components/Actions';
import { Checklists } from './components/Checklists';
import { Tbt } from './components/Tbt';
import { Trainings } from './components/Trainings';
import { People } from './components/People';
import { Roles } from './components/Roles';
import { Organizations } from './components/Organizations';
import { Projects } from './components/Projects';
import { Signage } from './components/Signage';
import { AiInsights } from './components/AiInsights'; 
import { Settings } from './components/Settings';
import { SiteMap } from './components/SiteMap';
import { Housekeeping } from './components/Housekeeping';
import { CertifiedProfile } from './components/CertifiedProfile';

// --- Import Modals ---
import { ReportCreationModal } from './components/ReportCreationModal';
import { ReportDetailModal } from './components/ReportDetailModal';
import { PtwCreationModal } from './components/PtwCreationModal';
import { PtwDetailModal } from './components/PtwDetailModal';
import { PlanCreationModal } from './components/PlanCreationModal';
import { PlanEditorModal } from './components/PlanEditorModal';
import { PlanDetailModal } from './components/PlanDetailModal';
import { RamsCreationModal } from './components/RamsCreationModal';
import { RamsEditorModal } from './components/RamsEditorModal';
import { RamsDetailModal } from './components/RamsDetailModal';
import { TbtCreationModal } from './components/TbtCreationModal';
import { TbtSessionModal } from './components/TbtSessionModal';
import { TrainingCourseModal } from './components/TrainingCourseModal';
import { TrainingSessionModal } from './components/TrainingSessionModal';
import { TrainingRecordModal } from './components/TrainingRecordModal';
import { SessionAttendanceModal } from './components/SessionAttendanceModal';

// --- Helper for Dynamic Icons ---
const GetIcon = ({ name, className }: { name: string, className?: string }) => {
  const icons: Record<string, JSX.Element> = {
    dashboard: <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />,
    reports: <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 9V3.5L18.5 9H14z" />,
    inspections: <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
    ptw: <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    rams: <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
    plans: <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
    actions: <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
    checklists: <path d="M5 13l4 4L19 7" />,
    tbt: <path d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />,
    training: <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
    people: <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
    roles: <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11.5 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />,
    organizations: <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
    projects: <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />,
    signage: <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
    settings: <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
    "ai-insights": <path d="M13 10V3L4 14h7v7l9-11h-7z" />,
    "site-map": <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />,
    "certification": <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
    housekeeping: <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  };
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      {icons[name] || icons.dashboard}
    </svg>
  );
};

// --- Global Modals Manager ---
const GlobalModals = () => {
  const { activeUser } = useAppContext(); 
  const { 
    isReportCreationModalOpen, setIsReportCreationModalOpen, selectedReport, setSelectedReport, reportInitialData,
    isPtwCreationModalOpen, setIsPtwCreationModalOpen, ptwCreationMode, selectedPtw, setSelectedPtw,
    isPlanCreationModalOpen, setIsPlanCreationModalOpen, selectedPlan, setSelectedPlan, selectedPlanForEdit, setSelectedPlanForEdit,
    isRamsCreationModalOpen, setIsRamsCreationModalOpen, selectedRams, setSelectedRams, selectedRamsForEdit, setSelectedRamsForEdit,
    isTbtCreationModalOpen, setIsTbtCreationModalOpen, selectedTbt, setSelectedTbt,
    isCourseModalOpen, setCourseModalOpen, isSessionModalOpen, setSessionModalOpen, isAttendanceModalOpen, setAttendanceModalOpen,
    courseForSession, sessionForAttendance
  } = useModalContext();

  const { 
    handleCreateReport, handleStatusChange, handleCapaActionChange, handleAcknowledgeReport,
    handleCreatePtw, handleUpdatePtw,
    handleCreatePlan, handlePlanStatusChange, handleUpdatePlan,
    handleCreateRams, handleRamsStatusChange, handleUpdateRams,
    handleCreateTbt, handleUpdateTbt,
    handleCreateOrUpdateCourse, handleScheduleSession, handleCloseSession,
    projects, usersList, trainingCourseList
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
          onAcknowledgeReport={handleAcknowledgeReport}
        />
      )}
      <PtwCreationModal
        isOpen={isPtwCreationModalOpen}
        onClose={() => setIsPtwCreationModalOpen(false)}
        onSubmit={handleCreatePtw}
        mode={ptwCreationMode}
      />
      {selectedPtw && (
        <PtwDetailModal
          ptw={selectedPtw}
          onClose={() => setSelectedPtw(null)}
          onUpdate={handleUpdatePtw}
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
    </>
  );
};

// --- Sidebar Component ---
import { Sidebar } from './components/Sidebar';

// --- Main App Content ---
const AppContent = () => {
  const { currentView, activeUser, isLoading } = useAppContext();
  const { currentUser } = useAuth();
  
  const { 
    projects, ptwList, trainingCourseList, trainingRecordList, trainingSessionList,
  } = useDataContext();
  
  const { 
    setSelectedPlan, setSelectedPlanForEdit, setIsPlanCreationModalOpen,
    setSelectedRams, setSelectedRamsForEdit, setIsRamsCreationModalOpen,
    setCourseModalOpen, setSessionModalOpen, setCourseForSession, setAttendanceModalOpen, setSessionForAttendance,
    setIsPtwCreationModalOpen, setPtwCreationMode, setSelectedPtw
  } = useModalContext();

  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  // GATEKEEPER: Check Firebase User instead of local user
  if (!currentUser) {
    return <LoginScreen />;
  }

  // Fallback loading
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        Loading EviroSafe...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={() => {}} // handled via context
        isOpen={sidebarOpen}
        setOpen={setSidebarOpen}
      />
      
      <main className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <DemoBanner />
        <div className="flex-1 p-8 overflow-y-auto">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'site-map' && (
            <div className="h-[calc(100vh-8rem)]">
              <SiteMap />
            </div>
          )}
          {currentView === 'reports' && <Reports />}
          {currentView === 'ptw' && (
            <Ptw 
              ptws={ptwList} 
              users={[]} 
              projects={projects} 
              onCreatePtw={() => { setPtwCreationMode('new'); setIsPtwCreationModalOpen(true); }}
              onAddExistingPtw={() => { setPtwCreationMode('existing'); setIsPtwCreationModalOpen(true); }}
              onSelectPtw={setSelectedPtw}
            />
          )}
          {currentView === 'inspections' && <Inspections />}
          {currentView === 'actions' && <Actions />}
          {currentView === 'plans' && (
            <Plans 
              onSelectPlan={(plan) => plan.status === 'draft' ? setSelectedPlanForEdit(plan) : setSelectedPlan(plan)}
              onNewPlan={() => setIsPlanCreationModalOpen(true)}
            />
          )}
          {currentView === 'rams' && (
            <Rams 
              onSelectRams={(rams) => rams.status === 'draft' ? setSelectedRamsForEdit(rams) : setSelectedRams(rams)}
              onNewRams={() => setIsRamsCreationModalOpen(true)}
            />
          )}
          {currentView === 'checklists' && <Checklists />}
          {currentView === 'tbt' && <Tbt />}
          {currentView === 'training' && (
            <Trainings 
              courses={trainingCourseList} 
              records={trainingRecordList} 
              sessions={trainingSessionList} 
              users={[]} 
              projects={projects}
              onManageCourses={() => setCourseModalOpen(true)}
              onScheduleSession={(course) => { setCourseForSession(course); setSessionModalOpen(true); }}
              onManageAttendance={(session) => { setSessionForAttendance(session); setAttendanceModalOpen(true); }}
            />
          )}
          {currentView === 'people' && <People />}
          {currentView === 'roles' && <Roles roles={rolesConfig} />}
          {currentView === 'organizations' && <Organizations />}
          {currentView === 'projects' && <Projects />}
          {currentView === 'signage' && <Signage />}
          {currentView === 'ai-insights' && <AiInsights />}
          {currentView === 'settings' && <Settings />}
          {currentView === 'housekeeping' && <Housekeeping />}
          {currentView === 'certification' && <CertifiedProfile />}
        </div>
      </main>
      <GlobalModals />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppProvider>
          <DataProvider>
            <ModalProvider>
              <AppContent />
            </ModalProvider>
          </DataProvider>
        </AppProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
