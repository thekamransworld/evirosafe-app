import React, { createContext, useState, useMemo, useContext, useEffect } from 'react';
import { 
  organizations as initialOrganizations, 
  users as initialUsers
} from './data';
import { translations, supportedLanguages, roles } from './config';
import type { 
  Organization, User, Report, ChecklistRun, Inspection, Plan as PlanType, 
  Rams as RamsType, TbtSession, TrainingCourse, TrainingRecord, TrainingSession, 
  Project, View, Ptw, Action, Resource, Sign, ChecklistTemplate, ActionItem, Notification, CapaAction
} from './types';
import { useToast } from './components/ui/Toast';

// --- APP CONTEXT ---
type InvitedUser = { name: string; email: string; role: User['role']; org_id: string };

interface AppContextType {
  currentView: View;
  setCurrentView: React.Dispatch<React.SetStateAction<View>>;
  activeOrg: Organization;
  setActiveOrg: React.Dispatch<React.SetStateAction<Organization>>;
  isSidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  usersList: User[];
  setUsersList: React.Dispatch<React.SetStateAction<User[]>>;
  activeUser: User | null;
  handleUpdateUser: (updatedUser: User) => void;
  organizations: Organization[];
  handleCreateOrganization: (data: any) => void;
  invitedEmails: InvitedUser[];
  handleInviteUser: (userData: any) => void;
  handleSignUp: (email: string) => void;
  handleApproveUser: (userId: string) => void;
  language: string;
  dir: 'ltr' | 'rtl';
  t: (key: string, fallback?: string) => string;
  login: (userId: string) => void;
  logout: () => void;
  can: (action: Action, resource: Resource) => boolean;
  impersonatingAdmin: User | null;
  impersonateUser: (userId: string) => void;
  stopImpersonating: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType>(null!);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [organizations, setOrganizations] = useState<Organization[]>(initialOrganizations || []);
  const [activeOrg, setActiveOrg] = useState<Organization>(organizations[0]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [usersList, setUsersList] = useState<User[]>(initialUsers || []);
  const [activeUserId, setActiveUserId] = useState<string | null>(() => localStorage.getItem('activeUserId'));
  const [impersonatingAdmin, setImpersonatingAdmin] = useState<User | null>(null);
  const [invitedEmails, setInvitedEmails] = useState<InvitedUser[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
      const saved = localStorage.getItem('theme');
      return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  const toast = useToast();

  useEffect(() => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
      setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const activeUser = useMemo(() => {
    if (!activeUserId) return null;
    return usersList.find(u => u.id === activeUserId) || null;
  }, [activeUserId, usersList]);

  const login = (userId: string) => {
    const user = usersList.find(u => u.id === userId);
    if (user && user.status !== 'active') {
        toast.error(`${user.name} is not an active user.`);
        return;
    }
    localStorage.setItem('activeUserId', userId);
    setActiveUserId(userId);
    if(user) setCurrentView(user.preferences.default_view);
  };
  
  const logout = () => {
    localStorage.removeItem('activeUserId');
    setActiveUserId(null);
    setImpersonatingAdmin(null);
  };

  const impersonateUser = (userId: string) => {
    if (activeUser && !impersonatingAdmin) {
      setImpersonatingAdmin(activeUser);
      login(userId);
    }
  };

  const stopImpersonating = () => {
    if (impersonatingAdmin) {
      login(impersonatingAdmin.id);
      setImpersonatingAdmin(null);
    }
  };

  const can = (action: Action, resource: Resource): boolean => {
    if (!activeUser) return false;
    const userRole = roles.find(r => r.key === activeUser.role);
    if (!userRole) return false;
    const permission = userRole.permissions.find(p => p.resource === resource);
    if (!permission) return false;
    return permission.actions.includes(action);
  };

  const language = activeUser?.preferences.language || 'en';
  const dir = useMemo(() => supportedLanguages.find(l => l.code === language)?.dir || 'ltr', [language]);

  const handleUpdateUser = (updatedUser: User) => {
    setUsersList(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };
  
  const handleCreateOrganization = (data: any) => {
    const newOrg: Organization = {
      id: `org_${Date.now()}`,
      status: 'active',
      slug: data.name.toLowerCase().replace(/\s+/g, '-'),
      primaryLanguage: 'en',
      secondaryLanguages: [],
      branding: { logoUrl: 'https://i.imgur.com/sC8b3Qd.png' }, 
      domain: `${data.name.split(' ')[0].toLowerCase()}.com`,
      timezone: 'GMT+4',
      ...data,
    };
    setOrganizations(prev => [...prev, newOrg]);
  };

  const handleInviteUser = (userData: any) => {
    const userToInvite = { ...userData, org_id: userData.org_id || activeOrg.id };
    setInvitedEmails(prev => [...prev, userToInvite]);
    toast.success(`Invitation sent.`);
  };

  const handleSignUp = (email: string) => { /* Mock logic */ };
  const handleApproveUser = (userId: string) => {
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' as const } : u));
    toast.success(`User approved.`);
  };
  
  const t = (key: string, fallback: string = key): string => {
    return translations[language]?.[key] || translations['en']?.[key] || fallback;
  };

  const value: AppContextType = {
    currentView, setCurrentView,
    activeOrg, setActiveOrg,
    isSidebarOpen, setSidebarOpen,
    usersList, setUsersList, activeUser, handleUpdateUser,
    organizations, handleCreateOrganization, 
    invitedEmails, handleInviteUser, handleSignUp,
    handleApproveUser,
    language, dir, t,
    login, logout, can,
    impersonatingAdmin, impersonateUser, stopImpersonating,
    theme, toggleTheme
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);

// --- DATA CONTEXT ---

interface DataContextType {
  isLoading: boolean;
  projects: Project[];
  reportList: Report[];
  inspectionList: Inspection[];
  checklistRunList: ChecklistRun[];
  planList: PlanType[];
  ramsList: RamsType[];
  tbtList: TbtSession[];
  trainingCourseList: TrainingCourse[];
  trainingRecordList: TrainingRecord[];
  trainingSessionList: TrainingSession[];
  notifications: Notification[];
  signs: Sign[];
  checklistTemplates: ChecklistTemplate[];
  ptwList: Ptw[];
  actionItems: ActionItem[];
  
  setInspectionList: React.Dispatch<React.SetStateAction<Inspection[]>>;
  setChecklistRunList: React.Dispatch<React.SetStateAction<ChecklistRun[]>>;
  setPtwList: React.Dispatch<React.SetStateAction<Ptw[]>>;
  
  handleCreateProject: (data: any) => void;
  handleCreateReport: (data: any) => void;
  handleStatusChange: (id: string, status: any) => void;
  handleCapaActionChange: (id: string, index: number, status: any) => void;
  handleAcknowledgeReport: (id: string) => void;
  handleUpdateInspection: (data: any, action?: any) => void;
  handleCreatePtw: (data: any) => void;
  handleUpdatePtw: (data: any, action?: any) => void;
  handleCreatePlan: (data: any) => void;
  handleUpdatePlan: (data: any) => void;
  handlePlanStatusChange: (id: string, status: any) => void;
  handleCreateRams: (data: any) => void;
  handleUpdateRams: (data: any) => void;
  handleRamsStatusChange: (id: string, status: any) => void;
  handleCreateTbt: (data: any) => void;
  handleUpdateTbt: (data: any) => void;
  handleCreateOrUpdateCourse: (data: any) => void;
  handleScheduleSession: (data: any) => void;
  handleCloseSession: (id: string, attendance: any) => void;
  handleUpdateActionStatus: (origin: any, status: any) => void;
  handleCreateInspection: (data: any) => void;
  handleCreateStandaloneAction: (data: any) => void;
}

const DataContext = createContext<DataContextType>(null!);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { activeOrg, activeUser } = useAppContext();
    const toast = useToast();
    
    const [isLoading, setIsLoading] = useState(false);
    
    // SAFETY: Initialize with empty arrays to prevent "undefined" crashes
    const [projects, setProjects] = useState<Project[]>([]);
    const [reportList, setReportList] = useState<Report[]>([]);
    const [inspectionList, setInspectionList] = useState<Inspection[]>([]);
    const [checklistRunList, setChecklistRunList] = useState<ChecklistRun[]>([]);
    const [planList, setPlanList] = useState<PlanType[]>([]);
    const [ramsList, setRamsList] = useState<RamsType[]>([]);
    const [tbtList, setTbtList] = useState<TbtSession[]>([]);
    const [trainingCourseList, setTrainingCourseList] = useState<TrainingCourse[]>([]);
    const [trainingRecordList, setTrainingRecordList] = useState<TrainingRecord[]>([]);
    const [trainingSessionList, setTrainingSessionList] = useState<TrainingSession[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [ptwList, setPtwList] = useState<Ptw[]>([]);
    const [signs, setSigns] = useState<Sign[]>([]);
    const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>([]);
    const [standaloneActions, setStandaloneActions] = useState<ActionItem[]>([]);

    const handleCreateReport = async (reportData: any) => {
        const newReport = {
            ...reportData,
            id: `rep_${Date.now()}`,
            org_id: activeOrg.id,
            reporter_id: activeUser?.id || 'unknown',
            status: 'submitted',
            audit_trail: [{ user_id: activeUser?.id || 'system', timestamp: new Date().toISOString(), action: 'Report Created' }],
            capa: [],
            acknowledgements: []
        };
        setReportList(prev => [newReport, ...prev]);
        toast.success("Report saved.");
    };

    const handleCreateInspection = (data: any) => {
        const newInspection = {
            ...data,
            id: `insp_${Date.now()}`,
            org_id: activeOrg.id,
            findings: [],
            status: data.status || 'Ongoing',
            audit_trail: [{ 
                user_id: activeUser?.id || 'system', 
                timestamp: new Date().toISOString(), 
                action: 'Inspection Created' 
            }]
        };
        setInspectionList(prev => [newInspection as Inspection, ...prev]);
        toast.success("Inspection created successfully.");
    };

    const handleCreateStandaloneAction = (data: any) => {
        const newAction: ActionItem = {
            id: `act_${Date.now()}`,
            action: data.action,
            owner_id: data.owner_id,
            due_date: data.due_date,
            status: 'Open',
            // @ts-ignore
            priority: data.priority,
            project_id: data.project_id,
            source: { type: 'Standalone' as any, id: '-', description: 'Direct Entry' },
            origin: { type: 'standalone' as any, parentId: '', itemId: '' }
        };
        setStandaloneActions(prev => [newAction, ...prev]);
        toast.success("Action created.");
    };
    
    const actionItems = useMemo<ActionItem[]>(() => {
        const items: ActionItem[] = [];
        // SAFETY CHECK: Ensure reportList is an array before iterating
        (reportList || []).forEach(report => {
            if (report.capa) {
                report.capa.forEach((action, index) => {
                    items.push({
                        id: `report-${report.id}-capa-${index}`,
                        action: action.action,
                        owner_id: action.owner_id,
                        due_date: action.due_date,
                        status: action.status,
                        project_id: report.project_id,
                        source: { type: 'Report', id: report.id, description: report.description },
                        origin: { type: 'report-capa', parentId: report.id, itemId: index.toString() }
                    });
                });
            }
        });
        return [...items, ...standaloneActions];
    }, [reportList, standaloneActions]);

    const handleUpdateActionStatus = (origin: any, newStatus: any) => {
        if (origin.type === 'report-capa') {
            handleCapaActionChange(origin.parentId, parseInt(origin.itemId), newStatus);
        } else if (origin.type === 'standalone') {
             setStandaloneActions(prev => prev.map(a => 
                a.id === origin.parentId ? { ...a, status: newStatus } : a
            ));
        }
    };

    const handleCapaActionChange = (reportId: string, capaIndex: number, newStatus: CapaAction['status']) => {
        setReportList(prev => prev.map(r => {
            if (r.id === reportId) {
                const newCapa = [...r.capa];
                if (newCapa[capaIndex]) {
                    newCapa[capaIndex] = { ...newCapa[capaIndex], status: newStatus };
                    return { ...r, capa: newCapa };
                }
            }
            return r;
        }));
    };

    const handleCreateProject = (data: any) => setProjects(prev => [...prev, { ...data, id: `proj_${Date.now()}`, org_id: activeOrg.id, status: 'active' }]);
    const handleStatusChange = (id: string, s: any) => setReportList(prev => prev.map(r => r.id === id ? { ...r, status: s } : r));
    const handleAcknowledgeReport = (id: string) => setReportList(prev => prev.map(r => r.id === id ? { ...r, acknowledgements: [...r.acknowledgements, { user_id: activeUser?.id || '', acknowledged_at: new Date().toISOString() }] } : r));
    const handleUpdateInspection = (i: any) => setInspectionList(prev => prev.map(x => x.id === i.id ? i : x));
    const handleCreatePtw = (d: any) => setPtwList(prev => [{ ...d, id: `ptw_${Date.now()}`, status: 'DRAFT' }, ...prev]);
    const handleUpdatePtw = (d: any) => setPtwList(prev => prev.map(p => p.id === d.id ? d : p));
    const handleCreatePlan = (d: any) => setPlanList(prev => [{ ...d, id: `plan_${Date.now()}`, content: { body_json: [], attachments: [] }, people: { prepared_by: { name: '', email: '' } }, dates: { created_at: '', updated_at: '', next_review_at: '' }, meta: { tags: [], change_note: '' }, audit_trail: [] } as any, ...prev]);
    const handleUpdatePlan = (d: any) => setPlanList(prev => prev.map(p => p.id === d.id ? d : p));
    const handlePlanStatusChange = (id: string, s: any) => setPlanList(prev => prev.map(p => p.id === id ? { ...p, status: s } : p));
    const handleCreateRams = (d: any) => setRamsList(prev => [{ ...d, id: `rams_${Date.now()}` } as any, ...prev]);
    const handleUpdateRams = (d: any) => setRamsList(prev => prev.map(r => r.id === d.id ? d : r));
    const handleRamsStatusChange = (id: string, s: any) => setRamsList(prev => prev.map(r => r.id === id ? { ...r, status: s } : r));
    const handleCreateTbt = (d: any) => setTbtList(prev => [{ ...d, id: `tbt_${Date.now()}`, attendees: [] } as any, ...prev]);
    const handleUpdateTbt = (d: any) => setTbtList(prev => prev.map(t => t.id === d.id ? d : t));
    const handleCreateOrUpdateCourse = (c: any) => setTrainingCourseList(prev => [...prev.filter(x => x.id !== c.id), c]);
    const handleScheduleSession = (d: any) => setTrainingSessionList(prev => [{ ...d, id: `ts_${Date.now()}`, roster: [] } as any, ...prev]);
    const handleCloseSession = (id: string, att: any) => setTrainingSessionList(prev => prev.map(s => s.id === id ? { ...s, status: 'completed', attendance: att } : s));

    const value = {
        isLoading,
        projects, reportList, inspectionList, checklistRunList, planList, ramsList, tbtList, 
        trainingCourseList, trainingRecordList, trainingSessionList, notifications, signs, checklistTemplates, ptwList,
        actionItems,
        setInspectionList, setChecklistRunList, setPtwList,
        handleCreateProject, handleCreateReport, handleStatusChange, handleCapaActionChange, handleAcknowledgeReport,
        handleUpdateInspection, handleCreatePtw, handleUpdatePtw, handleCreatePlan, handleUpdatePlan, handlePlanStatusChange,
        handleCreateRams, handleUpdateRams, handleRamsStatusChange, handleCreateTbt, handleUpdateTbt,
        handleCreateOrUpdateCourse, handleScheduleSession, handleCloseSession,
        handleUpdateActionStatus,
        handleCreateInspection,       
        handleCreateStandaloneAction 
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useDataContext = () => useContext(DataContext);


// --- MODAL CONTEXT ---

interface ModalContextType {
  selectedReport: Report | null; setSelectedReport: (report: Report | null) => void;
  isReportCreationModalOpen: boolean; setIsReportCreationModalOpen: (isOpen: boolean) => void;
  reportInitialData: Partial<Report> | null; setReportInitialData: (data: Partial<Report> | null) => void;
  
  isActionCreationModalOpen: boolean; 
  setIsActionCreationModalOpen: (isOpen: boolean) => void;
  openActionCreationModal: (options?: { initialData?: any; mode?: 'create' | 'edit' }) => void;
  openActionDetailModal: (action: any) => void;

  selectedPtw: Ptw | null; setSelectedPtw: (ptw: Ptw | null) => void;
  isPtwCreationModalOpen: boolean; setIsPtwCreationModalOpen: (isOpen: boolean) => void;
  ptwCreationMode: 'new' | 'existing'; setPtwCreationMode: (mode: 'new' | 'existing') => void;
  selectedPlan: PlanType | null; setSelectedPlan: (plan: PlanType | null) => void;
  selectedPlanForEdit: PlanType | null; setSelectedPlanForEdit: (plan: PlanType | null) => void;
  isPlanCreationModalOpen: boolean; setIsPlanCreationModalOpen: (isOpen: boolean) => void;
  selectedRams: RamsType | null; setSelectedRams: (rams: RamsType | null) => void;
  selectedRamsForEdit: RamsType | null; setSelectedRamsForEdit: (rams: RamsType | null) => void;
  isRamsCreationModalOpen: boolean; setIsRamsCreationModalOpen: (isOpen: boolean) => void;
  selectedTbt: TbtSession | null; setSelectedTbt: (tbt: TbtSession | null) => void;
  isTbtCreationModalOpen: boolean; setIsTbtCreationModalOpen: (isOpen: boolean) => void;
  isCourseModalOpen: boolean; setCourseModalOpen: (isOpen: boolean) => void;
  isSessionModalOpen: boolean; setSessionModalOpen: (isOpen: boolean) => void;
  isAttendanceModalOpen: boolean; setAttendanceModalOpen: (isOpen: boolean) => void;
  courseForSession: TrainingCourse | null; setCourseForSession: (course: TrainingCourse | null) => void;
  sessionForAttendance: TrainingSession | null; setSessionForAttendance: (session: TrainingSession | null) => void;
  isInspectionCreationModalOpen: boolean; setIsInspectionCreationModalOpen: (isOpen: boolean) => void;
}

const ModalContext = createContext<ModalContextType>(null!);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isReportCreationModalOpen, setIsReportCreationModalOpen] = useState(false);
  const [reportInitialData, setReportInitialData] = useState<Partial<Report> | null>(null);

  const [isActionCreationModalOpen, setIsActionCreationModalOpen] = useState(false);

  const openActionCreationModal = (options?: { initialData?: any; mode?: 'create' | 'edit' }) => {
      setIsActionCreationModalOpen(true);
  };
  const openActionDetailModal = (action: any) => {
      console.log("View action details", action);
  };

  const [selectedPtw, setSelectedPtw] = useState<Ptw | null>(null);
  const [isPtwCreationModalOpen, setIsPtwCreationModalOpen] = useState(false);
  const [ptwCreationMode, setPtwCreationMode] = useState<'new' | 'existing'>('new');
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<PlanType | null>(null);
  const [isPlanCreationModalOpen, setIsPlanCreationModalOpen] = useState(false);
  const [selectedRams, setSelectedRams] = useState<RamsType | null>(null);
  const [selectedRamsForEdit, setSelectedRamsForEdit] = useState<RamsType | null>(null);
  const [isRamsCreationModalOpen, setIsRamsCreationModalOpen] = useState(false);
  const [selectedTbt, setSelectedTbt] = useState<TbtSession | null>(null);
  const [isTbtCreationModalOpen, setIsTbtCreationModalOpen] = useState(false);
  const [isCourseModalOpen, setCourseModalOpen] = useState(false);
  const [isSessionModalOpen, setSessionModalOpen] = useState(false);
  const [isAttendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [courseForSession, setCourseForSession] = useState<TrainingCourse | null>(null);
  const [sessionForAttendance, setSessionForAttendance] = useState<TrainingSession | null>(null);
  const [isInspectionCreationModalOpen, setIsInspectionCreationModalOpen] = useState(false);

  const value = {
    selectedReport, setSelectedReport,
    isReportCreationModalOpen, setIsReportCreationModalOpen,
    reportInitialData, setReportInitialData,
    
    isActionCreationModalOpen, setIsActionCreationModalOpen,
    openActionCreationModal, openActionDetailModal,

    selectedPtw, setSelectedPtw,
    isPtwCreationModalOpen, setIsPtwCreationModalOpen,
    ptwCreationMode, setPtwCreationMode,
    selectedPlan, setSelectedPlan,
    selectedPlanForEdit, setSelectedPlanForEdit,
    isPlanCreationModalOpen, setIsPlanCreationModalOpen,
    selectedRams, setSelectedRams,
    selectedRamsForEdit, setSelectedRamsForEdit,
    isRamsCreationModalOpen, setIsRamsCreationModalOpen,
    selectedTbt, setSelectedTbt,
    isTbtCreationModalOpen, setIsTbtCreationModalOpen,
    isCourseModalOpen, setCourseModalOpen,
    isSessionModalOpen, setSessionModalOpen,
    isAttendanceModalOpen, setAttendanceModalOpen,
    courseForSession, setCourseForSession,
    sessionForAttendance, setSessionForAttendance,
    isInspectionCreationModalOpen, setIsInspectionCreationModalOpen
  };

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
};

export const useModalContext = () => useContext(ModalContext);