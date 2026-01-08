import React, { useState, useEffect } from 'react';
import { AppProvider, DataProvider, ModalProvider, useAppContext, useDataContext, useModalContext } from './contexts';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { DemoBanner } from './components/DemoBanner';
import { ToastProvider } from './components/ui/Toast';
import { Sidebar } from './components/Sidebar';
import { roles as rolesConfig } from './config';
import { Loader2 } from 'lucide-react';
import type { User } from './types'; // Added import for type safety

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
import { HseStatistics } from './components/HseStatistics';

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
import { SessionAttendanceModal } from './components/SessionAttendanceModal';
import { ActionCreationModal } from './components/ActionCreationModal';
import { InspectionCreationModal } from './components/InspectionCreationModal';
import { InspectionConductModal } from './components/InspectionConductModal';
import { ChecklistRunModal } from './components/ChecklistRunModal';
import { ChecklistDetailModal } from './components/ChecklistDetailModal';

// --- Auth Sync: Bridge Firebase Auth -> EviroSafe "activeUser" ---
const AuthSync: React.FC = () => {
  const { currentUser } = useAuth();
  const { usersList, setUsersList, login, logout, activeOrg } = useAppContext();

  useEffect(() => {
    if (!currentUser) {
      logout();
      return;
    }

    const uid = currentUser.uid;
    const email = currentUser.email || `user-${uid.slice(0, 6)}@evirosafe.local`;
    const displayName = currentUser.displayName || email.split('@')[0];

    // Ensure user exists in local state
    setUsersList(prev => {
      if (prev.some(u => u.id === uid)) return prev;

      const existingUser = prev[0];
      
      // FIX: Explicitly typed to match User interface
      const defaultPreferences: User['preferences'] = {
          language: 'en',
          default_view: 'dashboard',
          units: { 
            temperature: 'C', 
            wind_speed: 'km/h', 
            height: 'm', 
            weight: 'kg' 
          }
      };

      const template = existingUser ? {
        ...existingUser,
        preferences: existingUser.preferences || defaultPreferences
      } : {
        id: uid,
        org_id: activeOrg?.id || 'org1',
        email,
        name: displayName,
        avatar_url: '',
        role: 'ADMIN',
        status: 'active',
        preferences: defaultPreferences
      };

      // Explicitly cast to User to satisfy TypeScript
      const newUser: User = {
        ...template,
        id: uid,
        org_id: activeOrg?.id || template.org_id,
        email,
        name: displayName,
        status: 'active'
      } as User;

      return [newUser, ...prev];
    });

    // Force login to set activeUser
    login(uid);
  }, [currentUser, activeOrg?.id]);

  return null;
};

// --- Global Modals Component ---
const GlobalModals = () => {
  const { activeUser, usersList } = useAppContext();
  const {
    isReportCreationModalOpen, setIsReportCreationModalOpen, selectedReport, setSelectedReport, reportInitialData,
    isPtwCreationModalOpen, setIsPtwCreationModalOpen, ptwCreationMode, selectedPtw, setSelectedPtw,
    isPlanCreationModalOpen, setIsPlanCreationModalOpen, selectedPlan, setSelectedPlan, selectedPlanForEdit, setSelectedPlanForEdit,
    isRamsCreationModalOpen, setIsRamsCreationModalOpen, selectedRams, setSelectedRams, selectedRamsForEdit, setSelectedRamsForEdit,
    isTbtCreationModalOpen, setIsTbtCreationModalOpen, selectedTbt, setSelectedTbt,
    isCourseModalOpen, setCourseModalOpen, isSessionModalOpen, setSessionModalOpen, isAttendanceModalOpen, setAttendanceModalOpen,
    courseForSession, sessionForAttendance,
    isActionCreationModalOpen, setIsActionCreationModalOpen,
    isInspectionCreationModalOpen, setIsInspectionCreationModalOpen
  } = useModalContext();

  const {
    handleCreateReport, handleStatusChange, handleCapaActionChange, handleAcknowledgeReport,
    handleCreatePtw, handleUpdatePtw,
    handleCreatePlan, handlePlanStatusChange, handleUpdatePlan,
    handleCreateRams, handleRamsStatusChange, handleUpdateRams,
    handleCreateTbt, handleUpdateTbt,
    handleCreateOrUpdateCourse, handleScheduleSession, handleCloseSession,
    handleCreateStandaloneAction, handleCreateInspection,
    projects, trainingCourseList, checklistTemplates
  } = useDataContext();

  if (!activeUser) return null;

  return (
    <>
      <ReportCreationModal isOpen={isReportCreationModalOpen} onClose={() => setIsReportCreationModalOpen(false)} initialData={reportInitialData} />
      {selectedReport && <ReportDetailModal report={selectedReport} users={usersList} activeUser={activeUser} onClose={() => setSelectedReport(null)} onStatusChange={handleStatusChange} onCapaActionChange={handleCapaActionChange} onAcknowledgeReport={handleAcknowledgeReport} />}
      <PtwCreationModal isOpen={isPtwCreationModalOpen} onClose={() => setIsPtwCreationModalOpen(false)} onSubmit={handleCreatePtw} mode={ptwCreationMode} />
      {selectedPtw && <PtwDetailModal ptw={selectedPtw} onClose={() => setSelectedPtw(null)} onUpdate={handleUpdatePtw} />}
      <PlanCreationModal isOpen={isPlanCreationModalOpen} onClose={() => setIsPlanCreationModalOpen(false)} onSubmit={handleCreatePlan} projects={projects} />
      {selectedPlan && <PlanDetailModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} onStatusChange={handlePlanStatusChange} />}
      {selectedPlanForEdit && <PlanEditorModal plan={selectedPlanForEdit} onClose={() => setSelectedPlanForEdit(null)} onSave={handleUpdatePlan} onSubmitForReview={handlePlanStatusChange} />}
      <RamsCreationModal isOpen={isRamsCreationModalOpen} onClose={() => setIsRamsCreationModalOpen(false)} onSubmit={handleCreateRams} projects={projects} activeUser={activeUser} />
      {selectedRams && <RamsDetailModal rams={selectedRams} onClose={() => setSelectedRams(null)} onStatusChange={handleRamsStatusChange} />}
      {selectedRamsForEdit && <RamsEditorModal rams={selectedRamsForEdit} onClose={() => setSelectedRamsForEdit(null)} onSave={handleUpdateRams} onSubmitForReview={handleRamsStatusChange} />}
      <TbtCreationModal isOpen={isTbtCreationModalOpen} onClose={() => setIsTbtCreationModalOpen(false)} onSubmit={handleCreateTbt} projects={projects} activeUser={activeUser} />
      {selectedTbt && <TbtSessionModal session={selectedTbt} onClose={() => setSelectedTbt(null)} onUpdate={handleUpdateTbt} users={usersList} />}
      <TrainingCourseModal isOpen={isCourseModalOpen} onClose={() => setCourseModalOpen(false)} courses={trainingCourseList} onUpdateCourse={handleCreateOrUpdateCourse} />
      {courseForSession && <TrainingSessionModal isOpen={isSessionModalOpen} onClose={() => setSessionModalOpen(false)} onSubmit={handleScheduleSession} course={courseForSession} projects={projects} users={usersList} />}
      {sessionForAttendance && <SessionAttendanceModal isOpen={isAttendanceModalOpen} onClose={() => setAttendanceModalOpen(false)} onSubmit={handleCloseSession} session={sessionForAttendance} users={usersList} />}
      <ActionCreationModal isOpen={isActionCreationModalOpen} onClose={() => setIsActionCreationModalOpen(false)} onSubmit={handleCreateStandaloneAction} users={usersList} projects={projects} />
      <InspectionCreationModal isOpen={isInspectionCreationModalOpen} onClose={() => setIsInspectionCreationModalOpen(false)} onSubmit={handleCreateInspection} projects={projects} users={usersList} checklistTemplates={checklistTemplates} />
    </>
  );
};

// --- Main App Content ---
const AppContent = () => {
  const { currentView, setCurrentView, activeUser } = useAppContext();
  const { currentUser, loading: authLoading } = useAuth();
  const { isLoading: dataLoading } = useDataContext();

  const {
    projects, ptwList, trainingCourseList, trainingRecordList, trainingSessionList,
  } = useDataContext();

  const {
    setSelectedPlan, setSelectedPlanForEdit, setIsPlanCreationModalOpen,
    setSelectedRams, setSelectedRamsForEdit, setIsRamsCreationModalOpen,
    setCourseModalOpen, setSessionModalOpen, setCourseForSession, setAttendanceModalOpen, setSessionForAttendance,
    setIsPtwCreationModalOpen, setPtwCreationMode, setSelectedPtw,
  } = useModalContext();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // --- LOADING STATE ---
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
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        isOpen={sidebarOpen}
        setOpen={setSidebarOpen}
      />

      <main className="flex-1 min-h-screen flex flex-col transition-all duration-300">
        <DemoBanner />
        <div className="flex-1 p-8 overflow-y-auto">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'site-map' && <div className="h-[calc(100vh-8rem)]"><SiteMap /></div>}
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
          {currentView === 'hse-statistics' && <HseStatistics />}
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
          <AuthSync />
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