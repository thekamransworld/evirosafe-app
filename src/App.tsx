import React from 'react';
import { AppProvider, DataProvider, ModalProvider, useAppContext, useDataContext, useModalContext } from './contexts';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
import { Sidebar } from './components/Sidebar';

// --- Main App Content ---
const AppContent = () => {
  const { currentView, activeUser, isLoading } = useAppContext();
  const { currentUser } = useAuth(); // <--- NEW CHECK
  
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
  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white">Loading EviroSafe...</div>;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Sidebar 
         currentView={currentView} 
         setCurrentView={() => {}} 
         isOpen={sidebarOpen}
         setOpen={setSidebarOpen}
      />
      
      {/* Dynamic Margin based on Sidebar state */}
      <main className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
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