import { DemoBanner } from "./components/DemoBanner";


import React, { useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/Dashboard';
import { People } from './components/People';
import { Roles } from './components/Roles';
import { Projects } from './components/Projects';
import { Settings } from './components/Settings';
import { AiInsights } from './components/AiInsights';
import { Reports } from './components/Reports';
import { Inspections } from './components/Inspections';
import { Ptw } from './components/Ptw';
import { Checklists } from './components/Checklists';
import { Plans } from './components/Plans';
import { Rams } from './components/Rams';
import { Signage } from './components/Signage';
import { Tbt } from './components/Tbt';
import { Trainings } from './components/Trainings';
import { Housekeeping } from './components/Housekeeping';
import { Actions } from './components/Actions';
import { SiteMap } from './components/SiteMap';
import { CertifiedProfile } from './components/CertifiedProfile';
import { ReportDetailModal } from './components/ReportDetailModal';
import { ReportCreationModal } from './components/ReportCreationModal';
import { PtwCreationModal } from './components/PtwCreationModal';
import { PtwDetailModal } from './components/PtwDetailModal';
import { PlanDetailModal } from './components/PlanDetailModal';
import { PlanEditorModal } from './components/PlanEditorModal';
import { PlanCreationModal } from './components/PlanCreationModal';
import { RamsDetailModal } from './components/RamsDetailModal';
import { RamsEditorModal } from './components/RamsEditorModal';
import { RamsCreationModal } from './components/RamsCreationModal';
import { TbtCreationModal } from './components/TbtCreationModal';
import { TbtSessionModal } from './components/TbtSessionModal';
import { TrainingCourseModal } from './components/TrainingCourseModal';
import { TrainingRecordModal } from './components/TrainingRecordModal';
import { TrainingSessionModal } from './components/TrainingSessionModal';
import { SessionAttendanceModal } from './components/SessionAttendanceModal';
import { Organizations } from './components/Organizations';
import { roles as rolesData } from './config';
import { AppProvider, useAppContext, DataProvider, useDataContext, useModalContext, ModalProvider } from './contexts';
import type { Plan as PlanType, Ptw as PtwType, Rams as RamsType } from './types';
import { LoginScreen } from './components/LoginScreen';
import { ToastProvider } from './components/ui/Toast';

const ImpersonationBanner: React.FC = () => {
    const { activeUser, impersonatingAdmin, stopImpersonating } = useAppContext();
    if (!impersonatingAdmin || !activeUser) return null;

    return (
        <div className="bg-purple-600 text-white text-center py-2 text-sm font-semibold">
            <span>You are viewing as {activeUser.name}. </span>
            <button onClick={stopImpersonating} className="underline hover:text-purple-200">
                Return to Admin View
            </button>
        </div>
    );
};


const AppContent: React.FC = () => {
  const { 
    currentView, setCurrentView, 
    activeOrg, setActiveOrg, organizations, 
    isSidebarOpen, setSidebarOpen, 
    activeUser, handleUpdateUser,
    dir, usersList,
    handleCreateOrganization
  } = useAppContext();
  
  const { 
    projects,
    handleCreateProject,
    handleStatusChange, handleCapaActionChange, handleAcknowledgeReport,
    ptwList, handleCreatePtw, handleUpdatePtw,
    handleCreatePlan, handleUpdatePlan, handlePlanStatusChange,
    handleCreateRams, handleUpdateRams, handleRamsStatusChange,
    handleCreateTbt, handleUpdateTbt,
    trainingCourseList, trainingRecordList, trainingSessionList,
    handleCreateOrUpdateCourse,
    handleScheduleSession, handleCloseSession,
  } = useDataContext();

  const {
    selectedReport, setSelectedReport,
    isReportCreationModalOpen, setIsReportCreationModalOpen, reportInitialData,
    isPtwCreationModalOpen, setIsPtwCreationModalOpen,
    ptwCreationMode, setPtwCreationMode,
    selectedPtw, setSelectedPtw,
    selectedPlan, setSelectedPlan,
    selectedPlanForEdit, setSelectedPlanForEdit,
    isPlanCreationModalOpen, setIsPlanCreationModalOpen,
    selectedRams, setSelectedRams,
    selectedRamsForEdit, setSelectedRamsForEdit,
    isRamsCreationModalOpen, setIsRamsCreationModalOpen,
    isTbtCreationModalOpen, setIsTbtCreationModalOpen,
    selectedTbt, setSelectedTbt,
    isCourseModalOpen, setCourseModalOpen,
    isSessionModalOpen, setSessionModalOpen,
    isAttendanceModalOpen, setAttendanceModalOpen,
    courseForSession, setCourseForSession,
    sessionForAttendance, setSessionForAttendance
  } = useModalContext();

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute('dir', dir);
  }, [dir]);

  const handleSelectPlan = (plan: PlanType) => {
    if (plan.status === 'draft') {
      setSelectedPlanForEdit(plan);
    } else {
      setSelectedPlan(plan);
    }
  };

  const handleSelectRams = (rams: RamsType) => {
    if (rams.status === 'draft') {
      setSelectedRamsForEdit(rams);
    } else {
      setSelectedRams(rams);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'organizations': return <Organizations />;
      case 'projects': return <Projects />;
      case 'people': return <People />;
      case 'roles': return <Roles roles={rolesData} />;
      case 'settings': return <Settings />;
      case 'ai-insights': return <AiInsights />;
      case 'reports': return <Reports />;
      case 'actions': return <Actions />;
      case 'inspections': return <Inspections />;
      case 'ptw': return <Ptw 
            ptws={ptwList}
            users={usersList}
            projects={projects}
            onSelectPtw={setSelectedPtw}
            onCreatePtw={() => { setPtwCreationMode('new'); setIsPtwCreationModalOpen(true); }}
            onAddExistingPtw={() => { setPtwCreationMode('existing'); setIsPtwCreationModalOpen(true); }}
        />;
      case 'checklists': return <Checklists />;
      case 'plans': return <Plans onSelectPlan={handleSelectPlan} onNewPlan={() => setIsPlanCreationModalOpen(true)} />;
      case 'rams': return <Rams onSelectRams={handleSelectRams} onNewRams={() => setIsRamsCreationModalOpen(true)} />;
      case 'signage': return <Signage />;
      case 'tbt': return <Tbt />;
      case 'training': return <Trainings 
        courses={trainingCourseList} 
        records={trainingRecordList}
        sessions={trainingSessionList}
        users={usersList}
        projects={projects}
        onManageCourses={() => setCourseModalOpen(true)}
        onScheduleSession={(course) => { setCourseForSession(course); setSessionModalOpen(true); }}
        onManageAttendance={(session) => { setSessionForAttendance(session); setAttendanceModalOpen(true); }}
        />;
      case 'housekeeping': return <Housekeeping />;
      case 'site-map': return <SiteMap />;
      case 'certification': return <CertifiedProfile />;
      default: return <Dashboard />;
    }
  };

  // This check is important as the AuthGate ensures activeUser is never null here.
  if (!activeUser) return null;

  return (
    <div className={`h-screen w-screen flex bg-transparent text-text-primary dark:text-dark-text-primary overflow-hidden transition-colors duration-300`}>
      {isSidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden" />}
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} isOpen={isSidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative animate-fade-in">
        <ImpersonationBanner />
        <Header 
            activeOrg={activeOrg} 
            setActiveOrg={setActiveOrg} 
            organizations={organizations} 
            user={activeUser} 
            toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} 
        />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {renderView()}
        </main>
      </div>

      {/* MODALS */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          users={usersList}
          activeUser={activeUser}
          onStatusChange={handleStatusChange}
          onCapaActionChange={handleCapaActionChange}
          onAcknowledgeReport={handleAcknowledgeReport}
        />
      )}
      {isReportCreationModalOpen && (
          <ReportCreationModal
            isOpen={isReportCreationModalOpen}
            onClose={() => setIsReportCreationModalOpen(false)}
            initialData={reportInitialData}
          />
      )}
      {isPtwCreationModalOpen && (
        <PtwCreationModal
            isOpen={isPtwCreationModalOpen}
            onClose={() => setIsPtwCreationModalOpen(false)}
            onSubmit={handleCreatePtw}
            mode={ptwCreationMode}
        />
      )}
      {selectedPtw && (
        <PtwDetailModal 
            ptw={selectedPtw}
            onClose={() => setSelectedPtw(null)}
            onUpdate={handleUpdatePtw}
        />
      )}
      {isPlanCreationModalOpen && (
        <PlanCreationModal
            isOpen={isPlanCreationModalOpen}
            onClose={() => setIsPlanCreationModalOpen(false)}
            onSubmit={handleCreatePlan}
            projects={projects}
        />
      )}
      {selectedPlan && (
        <PlanDetailModal 
            plan={selectedPlan}
            onClose={() => setSelectedPlan(null)}
            onStatusChange={(id, status) => {
                handlePlanStatusChange(id, status);
                setSelectedPlan(null);
            }}
        />
      )}
      {selectedPlanForEdit && (
        <PlanEditorModal
          plan={selectedPlanForEdit}
          onClose={() => setSelectedPlanForEdit(null)}
          onSave={handleUpdatePlan}
          onSubmitForReview={(id, status) => {
            handlePlanStatusChange(id, status);
            setSelectedPlanForEdit(null);
          }}
        />
      )}
       {selectedRams && (
        <RamsDetailModal 
            rams={selectedRams}
            onClose={() => setSelectedRams(null)}
            onStatusChange={(id, status) => {
                handleRamsStatusChange(id, status);
                setSelectedRams(null);
            }}
        />
      )}
      {selectedRamsForEdit && (
        <RamsEditorModal
          rams={selectedRamsForEdit}
          onClose={() => setSelectedRamsForEdit(null)}
          onSave={handleUpdateRams}
          onSubmitForReview={(id, status) => {
              handleRamsStatusChange(id, status);
              setSelectedRamsForEdit(null);
          }}
        />
      )}
      {isRamsCreationModalOpen && (
        <RamsCreationModal
          isOpen={isRamsCreationModalOpen}
          onClose={() => setIsRamsCreationModalOpen(false)}
          onSubmit={handleCreateRams}
          projects={projects}
          activeUser={activeUser}
        />
      )}
      {isTbtCreationModalOpen && (
        <TbtCreationModal
          isOpen={isTbtCreationModalOpen}
          onClose={() => setIsTbtCreationModalOpen(false)}
          onSubmit={handleCreateTbt}
          projects={projects}
          activeUser={activeUser}
        />
      )}
      {selectedTbt && (
        <TbtSessionModal
          session={selectedTbt}
          onClose={() => setSelectedTbt(null)}
          onUpdate={(tbt) => {
            handleUpdateTbt(tbt);
            if (tbt.status !== 'draft') {
              setSelectedTbt(tbt);
            } else {
              setSelectedTbt(null);
            }
          }}
          users={usersList}
        />
      )}
      {isCourseModalOpen && (
        <TrainingCourseModal
          isOpen={isCourseModalOpen}
          onClose={() => setCourseModalOpen(false)}
          courses={trainingCourseList}
          onUpdateCourse={handleCreateOrUpdateCourse}
        />
      )}
      {courseForSession && isSessionModalOpen && (
        <TrainingSessionModal
            isOpen={isSessionModalOpen}
            onClose={() => { setSessionModalOpen(false); setCourseForSession(null); }}
            course={courseForSession}
            onSubmit={handleScheduleSession}
            projects={projects}
            users={usersList}
        />
      )}
      {sessionForAttendance && isAttendanceModalOpen && (
        <SessionAttendanceModal
            isOpen={isAttendanceModalOpen}
            onClose={() => { setAttendanceModalOpen(false); setSessionForAttendance(null); }}
            session={sessionForAttendance}
            onSubmit={handleCloseSession}
            users={usersList}
        />
      )}
    </div>
  );
}

const AuthGate: React.FC = () => {
    const { activeUser } = useAppContext();
    const { isLoading } = useDataContext();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-background dark:bg-dark-background text-text-primary dark:text-white">
                <div className="flex flex-col items-center space-y-3">
                    <svg className="animate-spin h-8 w-8 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">Loading EviroSafe...</span>
                </div>
            </div>
        );
    }

    if (!activeUser) {
        return <LoginScreen />;
    }
    return <AppContent />;
};

const App: React.FC = () => {
    return (
        <ToastProvider>
            <AppProvider>
                <ModalProvider>
                    <DataProvider>
                        <AuthGate />
                    </DataProvider>
                </ModalProvider>
            </AppProvider>
        </ToastProvider>
    );
};

export default App;