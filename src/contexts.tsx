import React, { createContext, useState, useMemo, useContext, useEffect } from 'react';
import { 
  organizations as initialOrganizations, 
  users as initialUsers
} from './data';
import { translations, supportedLanguages, roles } from './config';
import type { 
  Organization, User, Report, ReportStatus, CapaAction, Notification, 
  ChecklistRun, Inspection, Plan as PlanType, PlanStatus, 
  Rams as RamsType, RamsStatus, TbtSession, 
  TrainingCourse, TrainingRecord, TrainingSession, Project, View, 
  Ptw, Action, Resource, Sign, ChecklistTemplate, ActionItem 
} from './types';
import { useToast } from './components/ui/Toast';
import * as dbService from './services/dbService';

// --- MOCK DATA DEFINITIONS ---
const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'Downtown Construction', status: 'active', org_id: 'org1', location: 'City Center', start_date: '2023-01-01', code: 'DTC-001', finish_date: '2024-01-01', manager_id: 'user_1', type: 'Construction' },
  { id: 'p2', name: 'Refinery Maintenance', status: 'active', org_id: 'org1', location: 'Sector 7', start_date: '2023-03-15', code: 'REF-002', finish_date: '2024-03-15', manager_id: 'user_2', type: 'Maintenance' }
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
    { id: 'n1', report_id: 'rep_1', user_id: 'user_1', is_read: false, message: 'System connected successfully.', timestamp: new Date().toISOString() }
];
const MOCK_PTWS: Ptw[] = [];
const MOCK_TEMPLATES: ChecklistTemplate[] = [
    {
        id: 'ct_1', org_id: 'org_1', category: 'Safety', title: { en: 'Weekly Safety Walkdown' }, 
        items: [{ id: 'i1', text: { en: 'PPE Compliance' }, description: { en: 'Check helmets, boots, vests' } }]
    }
];

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
  // ADDED: Setter for checklist templates
  setChecklistTemplates: React.Dispatch<React.SetStateAction<ChecklistTemplate[]>>;
  
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
    
    const [isLoading, setIsLoading] = useState(true);
    
    // DB Connected States
    const [projects, setProjects] = useState<Project[]>([]);
    const [reportList, setReportList] = useState<Report[]>([]);
    const [inspectionList, setInspectionList] = useState<Inspection[]>([]);
    const [ptwList, setPtwList] = useState<Ptw[]>([]);

    // Mock/Local States (Not yet in DB)
    const [checklistRunList, setChecklistRunList] = useState<ChecklistRun[]>(MOCK_CHECKLIST_RUNS);
    const [planList, setPlanList] = useState<PlanType[]>(MOCK_PLANS);
    const [ramsList, setRamsList] = useState<RamsType[]>(MOCK_RAMS);
    const [tbtList, setTbtList] = useState<TbtSession[]>(MOCK_TBTS);
    const [trainingCourseList, setTrainingCourseList] = useState<TrainingCourse[]>(MOCK_COURSES);
    const [trainingRecordList, setTrainingRecordList] = useState<TrainingRecord[]>(MOCK_RECORDS);
    const [trainingSessionList, setTrainingSessionList] = useState<TrainingSession[]>(MOCK_SESSIONS);
    const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
    const [signs, setSigns] = useState<Sign[]>([]);
    const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>(MOCK_TEMPLATES);
    const [standaloneActions, setStandaloneActions] = useState<ActionItem[]>([]);

    // --- FETCH DATA ON LOAD ---
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // Fetch all data in parallel from Firebase
                const [dbProjects, dbReports, dbPtws, dbInspections] = await Promise.all([
                    dbService.getProjects(),
                    dbService.getReports(),
                    dbService.getPtws(),
                    dbService.getInspections()
                ]);

                setProjects(dbProjects);
                setReportList(dbReports);
                setPtwList(dbPtws);
                setInspectionList(dbInspections);
            } catch (error) {
                console.error("Failed to load data:", error);
                toast.error("Failed to load data from server. Using local mode.");
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    // --- DB HANDLERS ---

    const handleCreateReport = async (reportData: any) => {
        try {
            const newReportData = {
                ...reportData,
                org_id: activeOrg.id,
                reporter_id: activeUser?.id || 'unknown',
                status: 'submitted',
                audit_trail: [{ user_id: activeUser?.id || 'system', timestamp: new Date().toISOString(), action: 'Report Created' }],
                capa: [],
                acknowledgements: []
            };
            // Save to DB
            const savedReport = await dbService.createReport(newReportData);
            // Update Local State
            setReportList(prev => [savedReport as Report, ...prev]);
            toast.success("Report saved to database.");
        } catch (e) {
            console.error(e);
            toast.error("Failed to save report.");
        }
    };

    const handleCreateProject = async (data: any) => {
        try {
            const newProjectData = { ...data, org_id: activeOrg.id, status: 'active' };
            const savedProject = await dbService.createProject(newProjectData);
            setProjects(prev => [...prev, savedProject as Project]);
            toast.success("Project created.");
        } catch (e) {
            toast.error("Error creating project.");
        }
    };

    const handleCreatePtw = async (data: any) => {
        try {
            const newPtwData = { ...data, org_id: activeOrg.id, status: 'DRAFT', audit_log: [], approvals: [] };
            const savedPtw = await dbService.createPtw(newPtwData);
            setPtwList(prev => [savedPtw as Ptw, ...prev]);
            toast.success("Permit created.");
        } catch (e) {
            toast.error("Error creating permit.");
        }
    };

    const handleCreateInspection = async (data: any) => {
        try {
            const newInspData = {
                ...data,
                org_id: activeOrg.id,
                findings: [],
                status: data.status || 'Ongoing',
                audit_trail: [{ user_id: activeUser?.id || 'system', timestamp: new Date().toISOString(), action: 'Inspection Created' }]
            };
            const savedInsp = await dbService.createInspection(newInspData);
            setInspectionList(prev => [savedInsp as Inspection, ...prev]);
            toast.success("Inspection created.");
        } catch (e) {
            toast.error("Error creating inspection.");
        }
    };

    // --- LOCAL HANDLERS (Not yet in DB) ---
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

    const handleStatusChange = async (id: string, s: any) => {
        // Optimistic update
        setReportList(prev => prev.map(r => r.id === id ? { ...r, status: s } : r));
        // DB update
        await dbService.updateReport(id, { status: s });
    };

    const handleUpdateInspection = async (i: any, action?: any) => {
        setInspectionList(prev => prev.map(x => x.id === i.id ? i : x));
        await dbService.updateInspection(i.id, i);
    };

    const handleUpdatePtw = async (d: any, action?: any) => {
        setPtwList(prev => prev.map(p => p.id === d.id ? d : p));
        await dbService.updatePtw(d.id, d);
    };

    // ... (Keep other local handlers)
    const handleCapaActionChange = (id: string, index: number, status: any) => {
         setReportList(prev => prev.map(r => {
            if (r.id === id) {
                const newCapa = [...r.capa];
                if (newCapa[index]) {
                    newCapa[index] = { ...newCapa[index], status: status };
                    return { ...r, capa: newCapa };
                }
            }
            return r;
        }));
    };
    const handleAcknowledgeReport = (id: string) => setReportList(prev => prev.map(r => r.id === id ? { ...r, acknowledgements: [...r.acknowledgements, { user_id: activeUser?.id || '', acknowledged_at: new Date().toISOString() }] } : r));
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
    
    const handleUpdateActionStatus = (origin: any, newStatus: any) => {
        if (origin.type === 'report-capa') {
            handleCapaActionChange(origin.parentId, parseInt(origin.itemId), newStatus);
        } else if (origin.type === 'standalone') {
             setStandaloneActions(prev => prev.map(a => 
                a.id === origin.parentId ? { ...a, status: newStatus } : a
            ));
        }
    };

    const actionItems = useMemo<ActionItem[]>(() => {
        const items: ActionItem[] = [];
        reportList.forEach(report => {
            report.capa?.forEach((action, index) => {
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
        return [...items, ...standaloneActions];
    }, [reportList, standaloneActions]);

    const value = {
        isLoading,
        projects, reportList, inspectionList, checklistRunList, planList, ramsList, tbtList, 
        trainingCourseList, trainingRecordList, trainingSessionList, notifications, signs, checklistTemplates, ptwList,
        actionItems,
        setInspectionList, setChecklistRunList, setPtwList,
        setChecklistTemplates, // EXPOSED HERE
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