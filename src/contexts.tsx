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
import { db } from './firebase'; // Import Firebase
import { 
  collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, setDoc 
} from 'firebase/firestore';
import { MASTER_CHECKLIST_LIBRARY } from './data/checklistLibrary';

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
  const [organizations, setOrganizations] = useState<Organization[]>(initialOrganizations);
  const [activeOrg, setActiveOrg] = useState<Organization>(organizations[0]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [usersList, setUsersList] = useState<User[]>(initialUsers);
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
    const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>(MASTER_CHECKLIST_LIBRARY);
    const [standaloneActions, setStandaloneActions] = useState<ActionItem[]>([]);

    // --- REAL-TIME DATABASE LISTENERS ---
    useEffect(() => {
        // 1. Projects
        const unsubProjects = onSnapshot(query(collection(db, 'projects')), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
            setProjects(data);
        });

        // 2. Reports
        const unsubReports = onSnapshot(query(collection(db, 'reports'), orderBy('occurred_at', 'desc')), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
            setReportList(data);
        });

        // 3. PTWs
        const unsubPtws = onSnapshot(query(collection(db, 'ptws')), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ptw));
            setPtwList(data);
        });

        // 4. Inspections
        const unsubInspections = onSnapshot(query(collection(db, 'inspections')), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inspection));
            setInspectionList(data);
        });

        // 5. Actions
        const unsubActions = onSnapshot(query(collection(db, 'actions')), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActionItem));
            setStandaloneActions(data);
        });

        // 6. RAMS
        const unsubRams = onSnapshot(query(collection(db, 'rams')), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RamsType));
            setRamsList(data);
        });

        // 7. Plans
        const unsubPlans = onSnapshot(query(collection(db, 'plans')), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlanType));
            setPlanList(data);
        });

        setIsLoading(false);

        return () => {
            unsubProjects();
            unsubReports();
            unsubPtws();
            unsubInspections();
            unsubActions();
            unsubRams();
            unsubPlans();
        };
    }, []);

    // --- DATABASE WRITERS ---

    const handleCreateProject = async (data: any) => {
        try {
            await addDoc(collection(db, 'projects'), { ...data, org_id: activeOrg.id, status: 'active', created_at: new Date().toISOString() });
            toast.success("Project created in Database.");
        } catch (e) { console.error(e); toast.error("Failed to save project."); }
    };

    const handleCreateReport = async (reportData: any) => {
        try {
            await addDoc(collection(db, 'reports'), {
                ...reportData,
                org_id: activeOrg.id,
                reporter_id: activeUser?.id || 'unknown',
                status: 'submitted',
                audit_trail: [{ user_id: activeUser?.id || 'system', timestamp: new Date().toISOString(), action: 'Report Created' }],
                capa: [],
                acknowledgements: []
            });
            toast.success("Report saved to Database.");
        } catch (e) { console.error(e); toast.error("Failed to save report."); }
    };

    const handleCreateInspection = async (data: any) => {
        try {
            await addDoc(collection(db, 'inspections'), {
                ...data,
                org_id: activeOrg.id,
                findings: [],
                status: data.status || 'Draft',
                audit_trail: [{ user_id: activeUser?.id || 'system', timestamp: new Date().toISOString(), action: 'Inspection Created' }]
            });
            toast.success("Inspection saved to Database.");
        } catch (e) { console.error(e); toast.error("Failed to save inspection."); }
    };

    const handleCreatePtw = async (data: any) => {
        try {
            await addDoc(collection(db, 'ptws'), {
                ...data,
                org_id: activeOrg.id,
                status: 'DRAFT',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                audit_log: [{ user_id: activeUser?.id || 'system', timestamp: new Date().toISOString(), action: 'PTW Created' }]
            });
            toast.success("Permit saved to Database.");
        } catch (e) { console.error(e); toast.error("Failed to save permit."); }
    };

    const handleCreateStandaloneAction = async (data: any) => {
        try {
            await addDoc(collection(db, 'actions'), {
                ...data,
                status: 'Open',
                source: { type: 'Standalone', id: '-', description: 'Direct Entry' },
                origin: { type: 'standalone', parentId: '', itemId: '' }
            });
            toast.success("Action saved to Database.");
        } catch (e) { console.error(e); toast.error("Failed to save action."); }
    };

    const handleCreateRams = async (data: any) => {
        try {
            await addDoc(collection(db, 'rams'), { ...data, status: 'draft', created_at: new Date().toISOString() });
            toast.success("RAMS saved to Database.");
        } catch (e) { console.error(e); toast.error("Failed to save RAMS."); }
    };

    const handleCreatePlan = async (data: any) => {
        try {
            await addDoc(collection(db, 'plans'), { 
                ...data, 
                status: 'draft', 
                content: { body_json: [], attachments: [] }, 
                people: { prepared_by: { name: activeUser?.name, email: activeUser?.email } },
                dates: { created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                meta: { tags: [], change_note: '' },
                audit_trail: []
            });
            toast.success("Plan saved to Database.");
        } catch (e) { console.error(e); toast.error("Failed to save Plan."); }
    };

    // --- UPDATERS (Optimistic UI + DB Update) ---
    
    const handleStatusChange = async (id: string, status: any) => {
        const ref = doc(db, 'reports', id);
        await updateDoc(ref, { status });
    };

    const handleCapaActionChange = async (reportId: string, capaIndex: number, newStatus: CapaAction['status']) => {
        const report = reportList.find(r => r.id === reportId);
        if (!report) return;
        const newCapa = [...report.capa];
        if (newCapa[capaIndex]) {
            newCapa[capaIndex] = { ...newCapa[capaIndex], status: newStatus };
            const ref = doc(db, 'reports', reportId);
            await updateDoc(ref, { capa: newCapa });
        }
    };

    const handleUpdateActionStatus = async (origin: any, newStatus: any) => {
        if (origin.type === 'report-capa') {
            handleCapaActionChange(origin.parentId, parseInt(origin.itemId), newStatus);
        } else if (origin.type === 'standalone') {
             const ref = doc(db, 'actions', origin.parentId); // parentId is the doc ID for standalone
             await updateDoc(ref, { status: newStatus });
        }
    };

    const handleUpdateInspection = async (data: any, action?: any) => {
        const ref = doc(db, 'inspections', data.id);
        // If status change is needed based on action, calculate it here
        let newStatus = data.status;
        if (action === 'submit') newStatus = 'Submitted';
        if (action === 'approve') newStatus = 'Approved';
        if (action === 'close') newStatus = 'Closed';
        
        await updateDoc(ref, { ...data, status: newStatus });
        toast.success("Inspection updated.");
    };

    const handleUpdatePtw = async (data: any) => {
        const ref = doc(db, 'ptws', data.id);
        await updateDoc(ref, data);
        toast.success("Permit updated.");
    };

    const handleUpdatePlan = async (data: any) => {
        const ref = doc(db, 'plans', data.id);
        await updateDoc(ref, data);
        toast.success("Plan updated.");
    };
    
    const handlePlanStatusChange = async (id: string, status: any) => {
        const ref = doc(db, 'plans', id);
        await updateDoc(ref, { status });
    };

    const handleUpdateRams = async (data: any) => {
        const ref = doc(db, 'rams', data.id);
        await updateDoc(ref, data);
        toast.success("RAMS updated.");
    };

    const handleRamsStatusChange = async (id: string, status: any) => {
        const ref = doc(db, 'rams', id);
        await updateDoc(ref, { status });
    };

    // --- MOCK HANDLERS (For features not yet in DB) ---
    const handleAcknowledgeReport = (id: string) => setReportList(prev => prev.map(r => r.id === id ? { ...r, acknowledgements: [...r.acknowledgements, { user_id: activeUser?.id || '', acknowledged_at: new Date().toISOString() }] } : r));
    const handleCreateTbt = (d: any) => setTbtList(prev => [{ ...d, id: `tbt_${Date.now()}`, attendees: [] } as any, ...prev]);
    const handleUpdateTbt = (d: any) => setTbtList(prev => prev.map(t => t.id === d.id ? d : t));
    const handleCreateOrUpdateCourse = (c: any) => setTrainingCourseList(prev => [...prev.filter(x => x.id !== c.id), c]);
    const handleScheduleSession = (d: any) => setTrainingSessionList(prev => [{ ...d, id: `ts_${Date.now()}`, roster: [] } as any, ...prev]);
    const handleCloseSession = (id: string, att: any) => setTrainingSessionList(prev => prev.map(s => s.id === id ? { ...s, status: 'completed', attendance: att } : s));

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
        return [...items, ...standaloneActions];
    }, [reportList, standaloneActions]);

    const value = {
        isLoading,
        projects, reportList, inspectionList, checklistRunList, planList, ramsList, tbtList, 
        trainingCourseList, trainingRecordList, trainingSessionList, notifications, signs, checklistTemplates, ptwList,
        actionItems,
        setInspectionList, setChecklistRunList, setPtwList, setChecklistTemplates,
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