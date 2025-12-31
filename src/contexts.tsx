import React, { createContext, useState, useMemo, useContext, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase'; 
import { translations, supportedLanguages, roles } from './config';
import type { 
  Organization, User, Report, ReportStatus, CapaAction, Notification, 
  ChecklistRun, Inspection, Plan as PlanType, PlanStatus, 
  Rams as RamsType, RamsStatus, TbtSession, 
  TrainingCourse, TrainingRecord, TrainingSession, Project, View, 
  Ptw, Action, Resource, Sign, ChecklistTemplate, ActionItem 
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
  
  // Data State
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization>({
      id: 'temp', name: 'Loading...', slug: '', domain: '', status: 'active', 
      timezone: '', primaryLanguage: 'en', secondaryLanguages: [], branding: { logoUrl: '' }, industry: '', country: ''
  });

  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeUserId, setActiveUserId] = useState<string | null>(() => localStorage.getItem('activeUserId'));
  const [impersonatingAdmin, setImpersonatingAdmin] = useState<User | null>(null);
  const [invitedEmails, setInvitedEmails] = useState<InvitedUser[]>([]);
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
      const saved = localStorage.getItem('theme');
      return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  const toast = useToast();

  // --- REAL-TIME LISTENERS FOR CORE DATA ---
  useEffect(() => {
    const orgUnsub = onSnapshot(collection(db, 'organizations'), (snapshot) => {
        const orgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization));
        setOrganizations(orgs);
        if (orgs.length > 0 && activeOrg.id === 'temp') {
            setActiveOrg(orgs[0]);
        }
    });

    const userUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsersList(users);
    });

    return () => {
        orgUnsub();
        userUnsub();
    };
  }, []);

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
    if(user && user.preferences) {
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

  // FIX: Added safe navigation (?.) to prevent crash if preferences is undefined
  const language = activeUser?.preferences?.language || 'en';
  const dir = useMemo(() => supportedLanguages.find(l => l.code === language)?.dir || 'ltr', [language]);

  const handleUpdateUser = async (updatedUser: User) => {
    try {
        await updateDoc(doc(db, 'users', updatedUser.id), { ...updatedUser });
        toast.success("Profile updated.");
    } catch (e) {
        console.error(e);
        toast.error("Failed to update profile.");
    }
  };
  
  const handleCreateOrganization = async (data: any) => {
    try {
        const newOrg = {
            ...data,
            status: 'active',
            slug: data.name.toLowerCase().replace(/\s+/g, '-'),
            primaryLanguage: 'en',
            secondaryLanguages: [],
            branding: { logoUrl: 'https://i.imgur.com/sC8b3Qd.png' }, 
            domain: `${data.name.split(' ')[0].toLowerCase()}.com`,
            timezone: 'GMT+4',
        };
        await addDoc(collection(db, 'organizations'), newOrg);
        toast.success("Organization created.");
    } catch (e) {
        toast.error("Failed to create organization.");
    }
  };

  const handleInviteUser = (userData: any) => {
    const userToInvite = { ...userData, org_id: userData.org_id || activeOrg.id };
    setInvitedEmails(prev => [...prev, userToInvite]);
    toast.success(`Invitation sent (Simulated).`);
  };

  const handleSignUp = (email: string) => { };
  
  const handleApproveUser = async (userId: string) => {
    try {
        await updateDoc(doc(db, 'users', userId), { status: 'active' });
        toast.success(`User approved.`);
    } catch (e) {
        toast.error("Failed to approve user.");
    }
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
    const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>([]);
    const [standaloneActions, setStandaloneActions] = useState<ActionItem[]>([]);

    // --- REAL-TIME DATA SYNC ---
    useEffect(() => {
        if (!activeOrg?.id || activeOrg.id === 'temp') return;

        // FIX: Added error handling to prevent crash if index is missing
        try {
            const unsubProjects = onSnapshot(query(collection(db, 'projects'), where('org_id', '==', activeOrg.id)), (s) => setProjects(s.docs.map(d => ({id: d.id, ...d.data()} as Project))));
            
            // Note: This query requires the index you need to create
            const unsubReports = onSnapshot(query(collection(db, 'reports'), where('org_id', '==', activeOrg.id), orderBy('occurred_at', 'desc')), (s) => setReportList(s.docs.map(d => ({id: d.id, ...d.data()} as Report))));
            
            const unsubInspections = onSnapshot(query(collection(db, 'inspections'), where('org_id', '==', activeOrg.id)), (s) => setInspectionList(s.docs.map(d => ({id: d.id, ...d.data()} as Inspection))));
            const unsubPtw = onSnapshot(query(collection(db, 'ptws'), where('org_id', '==', activeOrg.id)), (s) => setPtwList(s.docs.map(d => ({id: d.id, ...d.data()} as Ptw))));
            const unsubActions = onSnapshot(query(collection(db, 'actions'), where('org_id', '==', activeOrg.id)), (s) => setStandaloneActions(s.docs.map(d => ({id: d.id, ...d.data()} as ActionItem))));
            
            const unsubPlans = onSnapshot(query(collection(db, 'plans'), where('org_id', '==', activeOrg.id)), (s) => setPlanList(s.docs.map(d => ({id: d.id, ...d.data()} as PlanType))));
            const unsubRams = onSnapshot(query(collection(db, 'rams'), where('org_id', '==', activeOrg.id)), (s) => setRamsList(s.docs.map(d => ({id: d.id, ...d.data()} as RamsType))));
            const unsubTbt = onSnapshot(query(collection(db, 'tbt_sessions'), where('org_id', '==', activeOrg.id)), (s) => setTbtList(s.docs.map(d => ({id: d.id, ...d.data()} as TbtSession))));
            const unsubTemplates = onSnapshot(query(collection(db, 'checklist_templates'), where('org_id', '==', activeOrg.id)), (s) => setChecklistTemplates(s.docs.map(d => ({id: d.id, ...d.data()} as ChecklistTemplate))));
            const unsubSigns = onSnapshot(query(collection(db, 'signs'), where('org_id', '==', activeOrg.id)), (s) => setSigns(s.docs.map(d => ({id: d.id, ...d.data()} as Sign))));

            setIsLoading(false);

            return () => {
                unsubProjects(); unsubReports(); unsubInspections(); unsubPtw(); unsubActions();
                unsubPlans(); unsubRams(); unsubTbt(); unsubTemplates(); unsubSigns();
            };
        } catch (error) {
            console.error("Firebase Sync Error (Likely missing index):", error);
            setIsLoading(false);
        }
    }, [activeOrg?.id]);


    // --- HANDLERS (WRITING TO DB) ---

    const handleCreateProject = async (data: any) => {
        try {
            await addDoc(collection(db, 'projects'), { ...data, org_id: activeOrg.id, status: 'active', created_at: new Date().toISOString() });
            toast.success("Project created.");
        } catch (e) { toast.error("Error creating project."); }
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
            toast.success("Report saved.");
        } catch (e) { toast.error("Error saving report."); }
    };

    const handleCreateInspection = async (data: any) => {
        try {
            await addDoc(collection(db, 'inspections'), {
                ...data,
                org_id: activeOrg.id,
                findings: [],
                status: data.status || 'Ongoing',
                audit_trail: [{ user_id: activeUser?.id || 'system', timestamp: new Date().toISOString(), action: 'Inspection Created' }]
            });
            toast.success("Inspection created.");
        } catch (e) { toast.error("Error creating inspection."); }
    };

    const handleCreatePtw = async (data: any) => {
        try {
            await addDoc(collection(db, 'ptws'), {
                ...data,
                org_id: activeOrg.id,
                status: 'DRAFT',
                created_at: new Date().toISOString(),
                audit_log: [{ user_id: activeUser?.id, timestamp: new Date().toISOString(), action: 'Permit Created' }]
            });
            toast.success("Permit created.");
        } catch (e) { toast.error("Error creating permit."); }
    };

    const handleCreateStandaloneAction = async (data: any) => {
        try {
            await addDoc(collection(db, 'actions'), {
                ...data,
                org_id: activeOrg.id,
                status: 'Open',
                created_at: new Date().toISOString(),
                source: { type: 'Standalone', id: '-', description: 'Direct Entry' },
                origin: { type: 'standalone', parentId: '', itemId: '' }
            });
            toast.success("Action created.");
        } catch (e) { toast.error("Error creating action."); }
    };

    // --- UPDATE HANDLERS ---

    const handleStatusChange = async (id: string, status: any) => {
        await updateDoc(doc(db, 'reports', id), { status });
    };

    const handleCapaActionChange = async (reportId: string, capaIndex: number, newStatus: CapaAction['status']) => {
        const report = reportList.find(r => r.id === reportId);
        if (!report) return;
        const newCapa = [...report.capa];
        if (newCapa[capaIndex]) {
            newCapa[capaIndex] = { ...newCapa[capaIndex], status: newStatus };
            await updateDoc(doc(db, 'reports', reportId), { capa: newCapa });
        }
    };

    const handleUpdateActionStatus = async (origin: any, newStatus: any) => {
        if (origin.type === 'report-capa') {
            handleCapaActionChange(origin.parentId, parseInt(origin.itemId), newStatus);
        } else if (origin.type === 'standalone') {
            await updateDoc(doc(db, 'actions', origin.parentId), { status: newStatus });
        }
    };

    const handleUpdateInspection = async (data: any, action?: any) => {
        await updateDoc(doc(db, 'inspections', data.id), { ...data });
        toast.success("Inspection updated.");
    };

    const handleUpdatePtw = async (data: any) => {
        await updateDoc(doc(db, 'ptws', data.id), { ...data });
        toast.success("Permit updated.");
    };

    // --- OTHER HANDLERS ---
    const handleCreatePlan = async (d: any) => { await addDoc(collection(db, 'plans'), { ...d, org_id: activeOrg.id, status: 'draft', content: { body_json: [], attachments: [] }, people: { prepared_by: { name: activeUser?.name, email: activeUser?.email } }, dates: { created_at: new Date().toISOString(), updated_at: new Date().toISOString(), next_review_at: new Date().toISOString() }, meta: { tags: [], change_note: '' }, audit_trail: [] }); toast.success("Plan created."); };
    const handleUpdatePlan = async (d: any) => { await updateDoc(doc(db, 'plans', d.id), d); toast.success("Plan updated."); };
    const handlePlanStatusChange = async (id: string, s: any) => { await updateDoc(doc(db, 'plans', id), { status: s }); };
    
    const handleCreateRams = async (d: any) => { await addDoc(collection(db, 'rams'), { ...d, org_id: activeOrg.id, status: 'draft', created_at: new Date().toISOString() }); toast.success("RAMS created."); };
    const handleUpdateRams = async (d: any) => { await updateDoc(doc(db, 'rams', d.id), d); toast.success("RAMS updated."); };
    const handleRamsStatusChange = async (id: string, s: any) => { await updateDoc(doc(db, 'rams', id), { status: s }); };

    const handleCreateTbt = async (d: any) => { await addDoc(collection(db, 'tbt_sessions'), { ...d, org_id: activeOrg.id, attendees: [] }); toast.success("TBT created."); };
    const handleUpdateTbt = async (d: any) => { await updateDoc(doc(db, 'tbt_sessions', d.id), d); toast.success("TBT updated."); };

    const handleCreateOrUpdateCourse = (c: any) => setTrainingCourseList(prev => [...prev.filter(x => x.id !== c.id), c]);
    const handleScheduleSession = (d: any) => setTrainingSessionList(prev => [{ ...d, id: `ts_${Date.now()}`, roster: [] } as any, ...prev]);
    const handleCloseSession = (id: string, att: any) => setTrainingSessionList(prev => prev.map(s => s.id === id ? { ...s, status: 'completed', attendance: att } : s));
    const handleAcknowledgeReport = async (id: string) => { /* Logic to add ack to DB */ };

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