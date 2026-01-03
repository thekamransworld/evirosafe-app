import React, { createContext, useState, useMemo, useContext, useEffect } from 'react';
import { 
  organizations as initialOrganizations, 
  users as initialUsers,
  projects as initialProjects,
  checklistTemplates as initialTemplates,
  signs as initialSigns,
  plans as initialPlans,
  rams as initialRams
} from './data';
import { translations, supportedLanguages, roles } from './config';
import type { 
  Organization, User, Report, ChecklistRun, Inspection, Plan as PlanType, 
  Rams as RamsType, TbtSession, TrainingCourse, TrainingRecord, TrainingSession, 
  Project, View, Ptw, Action, Resource, Sign, ChecklistTemplate, ActionItem, Notification, CapaAction
} from './types';
import { useToast } from './components/ui/Toast';

// --- FIREBASE IMPORTS ---
import { db } from './firebase';
import { collection, getDocs, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';

// --- MOCK DATA (Fallbacks) ---
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
const MOCK_TEMPLATES: ChecklistTemplate[] = [];

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
  const [activeOrg, setActiveOrg] = useState<Organization>(organizations[0] || {});
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [usersList, setUsersList] = useState<User[]>(initialUsers || []);
  const [activeUserId, setActiveUserId] = useState<string | null>(() => localStorage.getItem('activeUserId'));
  const [impersonatingAdmin, setImpersonatingAdmin] = useState<User | null>(null);
  const [invitedEmails, setInvitedEmails] = useState<InvitedUser[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const toast = useToast();

  useEffect(() => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const activeUser = useMemo(() => {
    if (!activeUserId) return null;
    return usersList.find(u => u.id === activeUserId) || null;
  }, [activeUserId, usersList]);

  const login = (userId: string) => {
    const user = usersList.find(u => u.id === userId);
    if (user) {
        localStorage.setItem('activeUserId', userId);
        setActiveUserId(userId);
        setCurrentView(user.preferences.default_view);
    }
  };
  
  const logout = () => {
    localStorage.removeItem('activeUserId');
    setActiveUserId(null);
    setImpersonatingAdmin(null);
  };

  const impersonateUser = (userId: string) => {
    if (activeUser) {
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
    return permission ? permission.actions.includes(action) : false;
  };

  const language = activeUser?.preferences.language || 'en';
  const dir = useMemo(() => supportedLanguages.find(l => l.code === language)?.dir || 'ltr', [language]);

  const handleUpdateUser = (updatedUser: User) => setUsersList(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  const handleCreateOrganization = (data: any) => setOrganizations(prev => [...prev, { ...data, id: `org_${Date.now()}`, status: 'active' }]);
  const handleInviteUser = (userData: any) => { setInvitedEmails(prev => [...prev, userData]); toast.success("Invited"); };
  const handleSignUp = () => {};
  const handleApproveUser = (id: string) => setUsersList(prev => prev.map(u => u.id === id ? { ...u, status: 'active' } : u));
  const t = (key: string, fallback: string = key) => translations[language]?.[key] || translations['en']?.[key] || fallback;

  const value = {
    currentView, setCurrentView, activeOrg, setActiveOrg, isSidebarOpen, setSidebarOpen,
    usersList, setUsersList, activeUser, handleUpdateUser, organizations, handleCreateOrganization,
    invitedEmails, handleInviteUser, handleSignUp, handleApproveUser, language, dir, t,
    login, logout, can, impersonatingAdmin, impersonateUser, stopImpersonating, theme, toggleTheme
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
    
    // Initialize with local data first (Instant Load)
    const [projects, setProjects] = useState<Project[]>(initialProjects || []);
    const [reportList, setReportList] = useState<Report[]>([]);
    const [inspectionList, setInspectionList] = useState<Inspection[]>([]);
    const [checklistRunList, setChecklistRunList] = useState<ChecklistRun[]>([]);
    const [planList, setPlanList] = useState<PlanType[]>(initialPlans || []);
    const [ramsList, setRamsList] = useState<RamsType[]>(initialRams || []);
    const [tbtList, setTbtList] = useState<TbtSession[]>([]);
    const [trainingCourseList, setTrainingCourseList] = useState<TrainingCourse[]>([]);
    const [trainingRecordList, setTrainingRecordList] = useState<TrainingRecord[]>([]);
    const [trainingSessionList, setTrainingSessionList] = useState<TrainingSession[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [ptwList, setPtwList] = useState<Ptw[]>([]);
    const [signs, setSigns] = useState<Sign[]>(initialSigns || []);
    const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>(initialTemplates || []);
    const [standaloneActions, setStandaloneActions] = useState<ActionItem[]>([]);

    // --- FETCH DATA FROM FIREBASE (FIXED) ---
    useEffect(() => {
      // 1. STOP: Don't fetch if no user is logged in yet
      if (!activeUser) return; 

      const fetchData = async () => {
        setIsLoading(true);
        try {
          // Helper to fetch collection
          const fetchCol = async (name: string, setter: any) => {
            const snap = await getDocs(collection(db, name));
            const data = snap.docs.map(d => d.data());
            if (data.length > 0) setter(data);
          };

          await Promise.all([
            fetchCol('projects', setProjects),
            fetchCol('reports', setReportList),
            fetchCol('inspections', setInspectionList),
            fetchCol('ptws', setPtwList),
            fetchCol('checklist_templates', setChecklistTemplates),
            fetchCol('plans', setPlanList),
            fetchCol('rams', setRamsList),
            fetchCol('signs', setSigns),
            fetchCol('actions', setStandaloneActions),
          ]);
        } catch (e) {
          console.error("Error fetching data:", e);
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
    }, [activeUser]); // 2. TRIGGER: Only run this when 'activeUser' changes (i.e., logs in)

    // --- CREATE HANDLERS (Write to Firebase) ---

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
        // Optimistic Update
        setReportList(prev => [newReport, ...prev]);
        // DB Update
        try {
          await setDoc(doc(db, 'reports', newReport.id), newReport);
          toast.success("Report saved to database.");
        } catch (e) {
          console.error(e);
          toast.error("Saved locally only (DB Error)");
        }
    };

    const handleCreateInspection = async (data: any) => {
        const newInspection = {
            ...data,
            id: `insp_${Date.now()}`,
            org_id: activeOrg.id,
            findings: [],
            status: data.status || 'Ongoing',
            audit_trail: [{ user_id: activeUser?.id || 'system', timestamp: new Date().toISOString(), action: 'Inspection Created' }]
        };
        setInspectionList(prev => [newInspection, ...prev]);
        try {
          await setDoc(doc(db, 'inspections', newInspection.id), newInspection);
          toast.success("Inspection created.");
        } catch (e) { console.error(e); }
    };

    const handleCreateStandaloneAction = async (data: any) => {
        const newAction = {
            id: `act_${Date.now()}`,
            action: data.action,
            owner_id: data.owner_id,
            due_date: data.due_date,
            status: 'Open',
            priority: data.priority,
            project_id: data.project_id,
            source: { type: 'Standalone', id: '-', description: 'Direct Entry' },
            origin: { type: 'standalone', parentId: '', itemId: '' }
        };
        setStandaloneActions(prev => [newAction as any, ...prev]);
        try {
          await setDoc(doc(db, 'actions', newAction.id), newAction);
          toast.success("Action created.");
        } catch (e) { console.error(e); }
    };
    
    const handleCreateProject = async (data: any) => {
        const newProj = { ...data, id: `proj_${Date.now()}`, org_id: activeOrg.id, status: 'active' };
        setProjects(prev => [...prev, newProj]);
        try {
          await setDoc(doc(db, 'projects', newProj.id), newProj);
          toast.success("Project created.");
        } catch (e) { console.error(e); }
    };

    const handleCreatePtw = async (data: any) => {
        const newPtw = { ...data, id: `ptw_${Date.now()}`, status: 'DRAFT' };
        setPtwList(prev => [newPtw, ...prev]);
        try {
          await setDoc(doc(db, 'ptws', newPtw.id), newPtw);
          toast.success("Permit created.");
        } catch (e) { console.error(e); }
    };

    // --- OTHER HANDLERS (Local State for now, can be expanded) ---
    const actionItems = useMemo<ActionItem[]>(() => {
        const items: ActionItem[] = [];
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
             setStandaloneActions(prev => prev.map(a => a.id === origin.parentId ? { ...a, status: newStatus } : a));
             // In real app: updateDoc(doc(db, 'actions', origin.parentId), { status: newStatus });
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

    const handleStatusChange = (id: string, s: any) => setReportList(prev => prev.map(r => r.id === id ? { ...r, status: s } : r));
    const handleAcknowledgeReport = (id: string) => setReportList(prev => prev.map(r => r.id === id ? { ...r, acknowledgements: [...r.acknowledgements, { user_id: activeUser?.id || '', acknowledged_at: new Date().toISOString() }] } : r));
    const handleUpdateInspection = (i: any) => setInspectionList(prev => prev.map(x => x.id === i.id ? i : x));
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
        handleUpdateActionStatus, handleCreateInspection, handleCreateStandaloneAction 
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useDataContext = () => useContext(DataContext);

// --- MODAL CONTEXT ---
interface ModalContextType {
  selectedReport: any; setSelectedReport: any;
  isReportCreationModalOpen: any; setIsReportCreationModalOpen: any;
  reportInitialData: any; setReportInitialData: any;
  isActionCreationModalOpen: any; setIsActionCreationModalOpen: any;
  openActionCreationModal: any; openActionDetailModal: any;
  selectedPtw: any; setSelectedPtw: any;
  isPtwCreationModalOpen: any; setIsPtwCreationModalOpen: any;
  ptwCreationMode: any; setPtwCreationMode: any;
  selectedPlan: any; setSelectedPlan: any;
  selectedPlanForEdit: any; setSelectedPlanForEdit: any;
  isPlanCreationModalOpen: any; setIsPlanCreationModalOpen: any;
  selectedRams: any; setSelectedRams: any;
  selectedRamsForEdit: any; setSelectedRamsForEdit: any;
  isRamsCreationModalOpen: any; setIsRamsCreationModalOpen: any;
  selectedTbt: any; setSelectedTbt: any;
  isTbtCreationModalOpen: any; setIsTbtCreationModalOpen: any;
  isCourseModalOpen: any; setCourseModalOpen: any;
  isSessionModalOpen: any; setSessionModalOpen: any;
  isAttendanceModalOpen: any; setAttendanceModalOpen: any;
  courseForSession: any; setCourseForSession: any;
  sessionForAttendance: any; setSessionForAttendance: any;
  isInspectionCreationModalOpen: any; setIsInspectionCreationModalOpen: any;
}

const ModalContext = createContext<ModalContextType>(null!);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [isReportCreationModalOpen, setIsReportCreationModalOpen] = useState(false);
  const [reportInitialData, setReportInitialData] = useState(null);
  const [isActionCreationModalOpen, setIsActionCreationModalOpen] = useState(false);
  const [selectedPtw, setSelectedPtw] = useState(null);
  const [isPtwCreationModalOpen, setIsPtwCreationModalOpen] = useState(false);
  const [ptwCreationMode, setPtwCreationMode] = useState('new');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState(null);
  const [isPlanCreationModalOpen, setIsPlanCreationModalOpen] = useState(false);
  const [selectedRams, setSelectedRams] = useState(null);
  const [selectedRamsForEdit, setSelectedRamsForEdit] = useState(null);
  const [isRamsCreationModalOpen, setIsRamsCreationModalOpen] = useState(false);
  const [selectedTbt, setSelectedTbt] = useState(null);
  const [isTbtCreationModalOpen, setIsTbtCreationModalOpen] = useState(false);
  const [isCourseModalOpen, setCourseModalOpen] = useState(false);
  const [isSessionModalOpen, setSessionModalOpen] = useState(false);
  const [isAttendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [courseForSession, setCourseForSession] = useState(null);
  const [sessionForAttendance, setSessionForAttendance] = useState(null);
  const [isInspectionCreationModalOpen, setIsInspectionCreationModalOpen] = useState(false);

  const openActionCreationModal = () => setIsActionCreationModalOpen(true);
  const openActionDetailModal = () => {};

  const value = {
    selectedReport, setSelectedReport, isReportCreationModalOpen, setIsReportCreationModalOpen, reportInitialData, setReportInitialData,
    isActionCreationModalOpen, setIsActionCreationModalOpen, openActionCreationModal, openActionDetailModal,
    selectedPtw, setSelectedPtw, isPtwCreationModalOpen, setIsPtwCreationModalOpen, ptwCreationMode, setPtwCreationMode,
    selectedPlan, setSelectedPlan, selectedPlanForEdit, setSelectedPlanForEdit, isPlanCreationModalOpen, setIsPlanCreationModalOpen,
    selectedRams, setSelectedRams, selectedRamsForEdit, setSelectedRamsForEdit, isRamsCreationModalOpen, setIsRamsCreationModalOpen,
    selectedTbt, setSelectedTbt, isTbtCreationModalOpen, setIsTbtCreationModalOpen,
    isCourseModalOpen, setCourseModalOpen, isSessionModalOpen, setSessionModalOpen, isAttendanceModalOpen, setAttendanceModalOpen,
    courseForSession, setCourseForSession, sessionForAttendance, setSessionForAttendance, isInspectionCreationModalOpen, setIsInspectionCreationModalOpen
  };

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
};

export const useModalContext = () => useContext(ModalContext);