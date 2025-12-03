import React, { createContext, useState, useMemo, useContext, useEffect } from 'react';
// --- FIX: Only import what we KNOW exists in data.ts ---
import { 
  organizations as initialOrganizations, 
  users as initialUsers
} from './data';
// -------------------------------------------------------

import { planTemplates, translations, supportedLanguages, roles } from './config';
import type { Organization, User, Report, ReportStatus, CapaAction, Notification, ChecklistRun, Inspection, Plan as PlanType, PlanStatus, PlanType as PlanTypeName, Rams as RamsType, RamsStatus, TbtSession, TrainingCourse, TrainingRecord, TrainingSession, Project, View, InspectionStatus, Ptw, Action, Resource, Sign, ChecklistTemplate, ActionItem } from './types';
// Removed broken imports to prevent circular dependencies
import { useToast } from './components/ui/Toast';

// --- DEFINING DUMMY DATA INTERNALLY TO PREVENT CRASHES ---
const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'Downtown Construction', status: 'active', org_id: 'org1', location: 'City Center', start_date: '2023-01-01' },
  { id: 'p2', name: 'Refinery Maintenance', status: 'active', org_id: 'org1', location: 'Sector 7', start_date: '2023-03-15' }
];

const MOCK_INSPECTIONS: Inspection[] = [];
const MOCK_CHECKLIST_RUNS: ChecklistRun[] = [];
const MOCK_PLANS: PlanType[] = [];
const MOCK_RAMS: RamsType[] = [];
const MOCK_TBTS: TbtSession[] = [];
const MOCK_COURSES: TrainingCourse[] = [];
const MOCK_RECORDS: TrainingRecord[] = [];
const MOCK_SESSIONS: TrainingSession[] = [];
const MOCK_NOTIFICATIONS: Notification[] = [
    { id: 'n1', title: 'Welcome', message: 'System connected successfully.', type: 'info', read: false, created_at: new Date().toISOString() }
];
const MOCK_PTWS: Ptw[] = [];
const MOCK_TEMPLATES: ChecklistTemplate[] = [];
// ---------------------------------------------------------

// --- App Context (Global UI State & User) ---

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
  handleCreateOrganization: (data: Omit<Organization, 'id' | 'status' | 'slug' | 'branding' | 'primaryLanguage' | 'secondaryLanguages' | 'domain' | 'timezone'>) => void;
  invitedEmails: InvitedUser[];
  handleInviteUser: (userData: Omit<InvitedUser, 'org_id'> & { org_id?: string }) => void;
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
  
  // Theme Management
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
    if(user) {
        setCurrentView(user.preferences.default_view);
    }
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
  
  const handleCreateOrganization = (data: Omit<Organization, 'id' | 'status' | 'slug' | 'branding' | 'primaryLanguage' | 'secondaryLanguages' | 'domain' | 'timezone'>) => {
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

  const handleInviteUser = (userData: Omit<InvitedUser, 'org_id'> & { org_id?: string }) => {
    const userToInvite: InvitedUser = { ...userData, org_id: userData.org_id || activeOrg.id };

    if (usersList.some(u => u.email.toLowerCase() === userToInvite.email.toLowerCase()) || invitedEmails.some(i => i.email.toLowerCase() === userToInvite.email.toLowerCase())) {
        toast.error("User already exists.");
        return;
    }
    setInvitedEmails(prev => [...prev, userToInvite]);
    toast.success(`Invitation sent.`);
  };

  const handleSignUp = (email: string) => {
    const invitedUser = invitedEmails.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!invitedUser) {
      toast.error("Invalid invitation.");
      return;
    }
    
    const newUser: User = {
        id: `user_${Date.now()}`,
        avatar_url: `https://i.pravatar.cc/150?u=${Date.now()}`,
        status: 'active',
        preferences: { language: 'en', default_view: 'dashboard', units: { temperature: 'C', wind_speed: 'km/h', height: 'm', weight: 'kg' } },
        ...invitedUser
    };
    
    setUsersList(prev => [...prev, newUser]);
    setInvitedEmails(prev => prev.filter(u => u.email.toLowerCase() !== email.toLowerCase()));
    login(newUser.id);
    toast.success(`Welcome, ${newUser.name}!`);
  };

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

// EXPORTING CONTEXT HOOK
export const useAppContext = () => useContext(AppContext);


// --- Data Context (Business Logic & Data) ---

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
  
  setInspectionList: React.Dispatch<React.SetStateAction<Inspection[]>>;
  setChecklistRunList: React.Dispatch<React.SetStateAction<ChecklistRun[]>>;
  setPtwList: React.Dispatch<React.SetStateAction<Ptw[]>>;
  
  handleCreateProject: (projectData: Omit<Project, 'id' | 'org_id' | 'status'>) => void;
  handleCreateReport: (reportData: Omit<Report, 'id' | 'org_id' | 'reporter_id' | 'status' | 'audit_trail' | 'capa' | 'acknowledgements'>) => void;
  handleStatusChange: (reportId: string, newStatus: ReportStatus) => void;
  handleCapaActionChange: (reportId: string, capaIndex: number, newStatus: CapaAction['status']) => void;
  handleAcknowledgeReport: (reportId: string) => void;
  handleUpdateInspection: (inspection: Inspection, action?: 'submit' | 'approve' | 'request_revision' | 'close' | 'save') => void;
  handleCreatePtw: (data: Omit<Ptw, 'id' | 'org_id' | 'status'>) => void;
  handleUpdatePtw: (ptw: Ptw, action?: any) => void;
  handleCreatePlan: (data: { title: string; type: PlanTypeName; project_id: string }) => void;
  handleUpdatePlan: (plan: PlanType) => void;
  handlePlanStatusChange: (planId: string, newStatus: PlanStatus) => void;
  handleCreateRams: (data: { activity: string; location: string; project_id: string, aiContent: any }) => void;
  handleUpdateRams: (rams: RamsType) => void;
  handleRamsStatusChange: (ramsId: string, newStatus: RamsStatus) => void;
  handleCreateTbt: (data: Omit<TbtSession, 'id' | 'org_id' | 'attendees' | 'attachments' | 'audit_log'>) => void;
  handleUpdateTbt: (session: TbtSession) => void;
  handleCreateOrUpdateCourse: (course: TrainingCourse) => void;
  handleScheduleSession: (data: Omit<TrainingSession, 'id' | 'status' | 'roster' | 'attendance'>) => void;
  handleCloseSession: (sessionId: string, attendance: TrainingSession['attendance']) => void;
  actionItems: ActionItem[];
  handleUpdateActionStatus: (origin: ActionItem['origin'], newStatus: CapaAction['status']) => void;
}

const DataContext = createContext<DataContextType>(null!);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { activeOrg, activeUser } = useAppContext();
    const toast = useToast();
    
    const [isLoading, setIsLoading] = useState(false);
    // INITIALIZE DIRECTLY WITH DUMMY DATA
    const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
    const [reportList, setReportList] = useState<Report[]>([]);
    const [inspectionList, setInspectionList] = useState<Inspection[]>(MOCK_INSPECTIONS);
    const [checklistRunList, setChecklistRunList] = useState<ChecklistRun[]>(MOCK_CHECKLIST_RUNS);
    const [planList, setPlanList] = useState<PlanType[]>(MOCK_PLANS);
    const [ramsList, setRamsList] = useState<RamsType[]>(MOCK_RAMS);
    const [tbtList, setTbtList] = useState<TbtSession[]>(MOCK_TBTS);
    const [trainingCourseList, setTrainingCourseList] = useState<TrainingCourse[]>(MOCK_COURSES);
    const [trainingRecordList, setTrainingRecordList] = useState<TrainingRecord[]>(MOCK_RECORDS);
    const [trainingSessionList, setTrainingSessionList] = useState<TrainingSession[]>(MOCK_SESSIONS);
    const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
    const [ptwList, setPtwList] = useState<Ptw[]>(MOCK_PTWS);
    const [signs, setSigns] = useState<Sign[]>([]);
    const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>(MOCK_TEMPLATES);

    const handleCreateReport = async (reportData: any) => {
        const newReport = {
            ...reportData,
            org_id: activeOrg.id,
            reporter_id: activeUser?.id || 'unknown',
            status: 'submitted',
            audit_trail: [{ user_id: activeUser?.id || 'system', timestamp: new Date().toISOString(), action: 'Report Created' }],
            capa: [],
            acknowledgements: []
        };
        // Just local state update for now to avoid errors
        setReportList(prev => [newReport, ...prev]);
        toast.success("Report saved (Local).");
    };
    
    // ... HELPER FUNCTIONS ...
    const actionItems = useMemo<ActionItem[]>(() => {
        const items: ActionItem[] = [];
        reportList.forEach(report => {
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
        });
        return items;
    }, [reportList]);

    const handleUpdateActionStatus = (origin: ActionItem['origin'], newStatus: CapaAction['status']) => {
        if (origin.type === 'report-capa') {
            handleCapaActionChange(origin.parentId, parseInt(origin.itemId), newStatus);
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

    const handleCreateProject = (data: any) => {
        const newProj: Project = { ...data, id: `proj_${Date.now()}`, org_id: activeOrg.id, status: 'active' };
        setProjects(prev => [...prev, newProj]);
        toast.success("Project created.");
    };

    const handleStatusChange = (reportId: string, newStatus: ReportStatus) => {
        setReportList(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
    };

    const handleAcknowledgeReport = (reportId: string) => {
        if (!activeUser) return;
        setReportList(prev => prev.map(r => {
            if (r.id === reportId) {
                return { ...r, acknowledgements: [...r.acknowledgements, { user_id: activeUser.id, acknowledged_at: new Date().toISOString() }] };
            }
            return r;
        }));
    };

    const handleUpdateInspection = (inspection: Inspection, action?: 'submit' | 'approve' | 'request_revision' | 'close' | 'save') => {
        setInspectionList(prev => prev.map(i => i.id === inspection.id ? { ...inspection, status: 'Submitted' } : i));
        toast.success(`Inspection updated.`);
    };

    const handleCreatePtw = (data: any) => {
         const newPtw: Ptw = { ...data, id: `PTW-${Date.now()}`, org_id: activeOrg.id, audit_log: [], approvals: [] };
         setPtwList(prev => [newPtw, ...prev]);
    };

    const handleUpdatePtw = (ptw: Ptw, action: any) => {
         setPtwList(prev => prev.map(p => p.id === ptw.id ? ptw : p));
    };

    const handleCreatePlan = (data: any) => {
        const newPlan: PlanType = {
            id: `plan_${Date.now()}`,
            org_id: activeOrg.id,
            project_id: data.project_id,
            type: data.type,
            title: data.title,
            version: 'v0.1',
            status: 'draft',
            people: { prepared_by: { name: activeUser?.name || '', email: '' } },
            dates: { created_at: new Date().toISOString(), updated_at: new Date().toISOString(), next_review_at: new Date().toISOString() },
            content: { body_json: [], attachments: [] },
            meta: { tags: [], change_note: 'Initial Draft' },
            audit_trail: []
        };
        setPlanList(prev => [newPlan, ...prev]);
    };

    const handleUpdatePlan = (plan: PlanType) => setPlanList(prev => prev.map(p => p.id === plan.id ? plan : p));
    const handlePlanStatusChange = (planId: string, newStatus: PlanStatus) => setPlanList(prev => prev.map(p => p.id === planId ? { ...p, status: newStatus } : p));
    
    const handleCreateRams = (data: any) => {
        const newRams = { id: `rams_${Date.now()}`, ...data, status: 'draft', attachments: [], audit_log: [] } as RamsType;
        setRamsList(prev => [newRams, ...prev]);
    };
    const handleUpdateRams = (rams: RamsType) => setRamsList(prev => prev.map(r => r.id === rams.id ? rams : r));
    const handleRamsStatusChange = (ramsId: string, newStatus: RamsStatus) => setRamsList(prev => prev.map(r => r.id === ramsId ? { ...r, status: newStatus } : r));

    const handleCreateTbt = (data: any) => setTbtList(prev => [...prev, { ...data, id: `tbt_${Date.now()}`, attendees: [] }]);
    const handleUpdateTbt = (session: TbtSession) => setTbtList(prev => prev.map(s => s.id === session.id ? session : s));

    const handleCreateOrUpdateCourse = (course: TrainingCourse) => setTrainingCourseList(prev => [...prev.filter(c=>c.id!==course.id), course]);
    const handleScheduleSession = (data: any) => setTrainingSessionList(prev => [...prev, { ...data, id: `ts_${Date.now()}`, roster: [] }]);
    const handleCloseSession = (sessionId: string, attendance: any) => setTrainingSessionList(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'completed' } : s));

    const value = {
        isLoading,
        projects, reportList, inspectionList, checklistRunList, planList, ramsList, tbtList, 
        trainingCourseList, trainingRecordList, trainingSessionList, notifications, signs, checklistTemplates, ptwList,
        setInspectionList, setChecklistRunList, setPtwList,
        handleCreateProject, handleCreateReport, handleStatusChange, handleCapaActionChange, handleAcknowledgeReport,
        handleUpdateInspection, handleCreatePtw, handleUpdatePtw, handleCreatePlan, handleUpdatePlan, handlePlanStatusChange,
        handleCreateRams, handleUpdateRams, handleRamsStatusChange, handleCreateTbt, handleUpdateTbt,
        handleCreateOrUpdateCourse, handleScheduleSession, handleCloseSession,
        actionItems, handleUpdateActionStatus
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useDataContext = () => useContext(DataContext);


// --- Modal Context (UI State for Modals) ---
interface ModalContextType {
  selectedReport: Report | null; setSelectedReport: (report: Report | null) => void;
  isReportCreationModalOpen: boolean; setIsReportCreationModalOpen: (isOpen: boolean) => void;
  reportInitialData: Partial<Report> | null; setReportInitialData: (data: Partial<Report> | null) => void;
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