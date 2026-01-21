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
import { collection, getDocs, doc, setDoc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from './contexts/AuthContext';
import { logoSrc } from './config';

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
  setOrganizations: React.Dispatch<React.SetStateAction<Organization[]>>;
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
  // Persist view in localStorage
  const [currentView, setCurrentView] = useState<View>(() => {
    return (localStorage.getItem('currentView') as View) || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);
  
  const [organizations, setOrganizations] = useState<Organization[]>(initialOrganizations || []);
  const [activeOrg, setActiveOrg] = useState<Organization>(organizations[0] || initialOrganizations[0]);
  
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

  // Fallback mechanism for activeUser to prevent UI flicker/crashes on reload
  const activeUser = useMemo(() => {
    if (!activeUserId) return null;
    
    // 1. Try to find in current state (Firebase data)
    const foundInState = usersList.find(u => u.id === activeUserId);
    if (foundInState) return foundInState;

    // 2. Fallback to static data (prevents "missing buttons" on refresh)
    const foundInStatic = initialUsers.find(u => u.id === activeUserId);
    if (foundInStatic) return foundInStatic;

    return null;
  }, [activeUserId, usersList]);

  const login = (userId: string) => {
    // Check both lists to ensure valid login even if offline
    const user = usersList.find(u => u.id === userId) || initialUsers.find(u => u.id === userId);
    
    if (user) {
        localStorage.setItem('activeUserId', userId);
        setActiveUserId(userId);
        
        if (!localStorage.getItem('currentView')) {
            const defaultView = user.preferences?.default_view || 'dashboard';
            setCurrentView(defaultView);
        }
        
        const userOrg = organizations.find(o => o.id === user.org_id) || initialOrganizations.find(o => o.id === user.org_id);
        if(userOrg) setActiveOrg(userOrg);
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

  const language = activeUser?.preferences?.language || 'en';
  const dir = useMemo(() => supportedLanguages.find(l => l.code === language)?.dir || 'ltr', [language]);

  const handleUpdateUser = (updatedUser: User) => setUsersList(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  
  // --- FIXED: Save Organization to Firebase ---
  const handleCreateOrganization = async (data: any) => {
      try {
          const newOrg: Organization = { 
              ...data, 
              id: `org_${Date.now()}`, 
              status: 'active',
              branding: {
                  logoUrl: logoSrc,
                  primaryColor: '#00A86B'
              },
              secondaryLanguages: ['ar'],
              timezone: 'GMT+3',
              primaryLanguage: 'en',
              slug: data.name.toLowerCase().replace(/\s+/g, '-'),
              domain: data.name.toLowerCase().replace(/\s+/g, '') + '.com'
          };

          // 1. Update Local State immediately
          setOrganizations(prev => [...prev, newOrg]);
          
          // 2. Save to Firestore
          await setDoc(doc(db, 'organizations', newOrg.id), newOrg);
          
          toast.success("Organization created and saved.");
      } catch (e) {
          console.error("Error saving organization:", e);
          toast.error("Failed to save organization to database.");
      }
  };

  const handleInviteUser = (userData: any) => { setInvitedEmails(prev => [...prev, userData]); toast.success("Invited"); };
  const handleSignUp = () => {};
  const handleApproveUser = (id: string) => setUsersList(prev => prev.map(u => u.id === id ? { ...u, status: 'active' } : u));
  const t = (key: string, fallback: string = key) => translations[language]?.[key] || translations['en']?.[key] || fallback;

  const value = {
    currentView, setCurrentView, activeOrg, setActiveOrg, isSidebarOpen, setSidebarOpen,
    usersList, setUsersList, activeUser, handleUpdateUser, organizations, setOrganizations, handleCreateOrganization,
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
  handleCreateChecklistTemplate: (data: any) => void;

  // --- DELETE FUNCTIONS ---
  handleDeleteReport: (id: string) => void;
  handleDeleteInspection: (id: string) => void;
  handleDeletePtw: (id: string) => void;
  handleDeleteRams: (id: string) => void;
  handleDeletePlan: (id: string) => void;
}

const DataContext = createContext<DataContextType>(null!);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { activeOrg, activeUser, setUsersList, setOrganizations } = useAppContext();
    const { currentUser } = useAuth();
    const toast = useToast();
    
    const [isLoading, setIsLoading] = useState(true);
    
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

    useEffect(() => {
      if (!currentUser) {
          setIsLoading(false);
          return;
      }

      const fetchData = async () => {
        try {
          const fetchCol = async (name: string, setter: any, initialData: any[] = []) => {
            const snap = await getDocs(collection(db, name));
            const data = snap.docs.map(d => d.data());
            if (data.length > 0) {
                 setter(data);
            } else {
                 setter(initialData); 
            }
          };

          await Promise.all([
            fetchCol('organizations', setOrganizations, initialOrganizations),
            fetchCol('users', setUsersList, initialUsers),
            fetchCol('projects', setProjects, initialProjects),
            fetchCol('reports', setReportList),
            fetchCol('inspections', setInspectionList),
            fetchCol('ptws', setPtwList),
            fetchCol('checklist_templates', setChecklistTemplates, initialTemplates),
            fetchCol('checklist_runs', setChecklistRunList),
            fetchCol('plans', setPlanList, initialPlans),
            fetchCol('rams', setRamsList, initialRams),
            fetchCol('signs', setSigns, initialSigns),
            fetchCol('actions', setStandaloneActions),
            fetchCol('tbt_sessions', setTbtList),
            fetchCol('training_courses', setTrainingCourseList),
            fetchCol('training_records', setTrainingRecordList),
            fetchCol('training_sessions', setTrainingSessionList),
            fetchCol('notifications', setNotifications),
          ]);
        } catch (e) {
          console.error("Error fetching data:", e);
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
    }, [currentUser, setUsersList, setOrganizations]);

    const updateDB = async (collectionName: string, id: string, data: any) => {
        try {
            await updateDoc(doc(db, collectionName, id), data);
        } catch (e) {
            console.error(`Error updating ${collectionName}:`, e);
        }
    };

    // --- DELETE FUNCTIONS ---
    const handleDeleteReport = async (id: string) => {
        if(!window.confirm("Are you sure you want to delete this report?")) return;
        try {
            await deleteDoc(doc(db, 'reports', id));
            setReportList(prev => prev.filter(i => i.id !== id));
            toast.success("Report deleted.");
        } catch(e) { console.error(e); toast.error("Failed to delete."); }
    };

    const handleDeleteInspection = async (id: string) => {
        if(!window.confirm("Are you sure you want to delete this inspection?")) return;
        try {
            await deleteDoc(doc(db, 'inspections', id));
            setInspectionList(prev => prev.filter(i => i.id !== id));
            toast.success("Inspection deleted.");
        } catch(e) { console.error(e); toast.error("Failed to delete."); }
    };

    const handleDeletePtw = async (id: string) => {
        if(!window.confirm("Are you sure you want to delete this permit?")) return;
        try {
            await deleteDoc(doc(db, 'ptws', id));
            setPtwList(prev => prev.filter(i => i.id !== id));
            toast.success("Permit deleted.");
        } catch(e) { console.error(e); toast.error("Failed to delete."); }
    };

    const handleDeleteRams = async (id: string) => {
        if(!window.confirm("Are you sure you want to delete this RAMS?")) return;
        try {
            await deleteDoc(doc(db, 'rams', id));
            setRamsList(prev => prev.filter(i => i.id !== id));
            toast.success("RAMS deleted.");
        } catch(e) { console.error(e); toast.error("Failed to delete."); }
    };

    const handleDeletePlan = async (id: string) => {
        if(!window.confirm("Are you sure you want to delete this plan?")) return;
        try {
            await deleteDoc(doc(db, 'plans', id));
            setPlanList(prev => prev.filter(i => i.id !== id));
            toast.success("Plan deleted.");
        } catch(e) { console.error(e); toast.error("Failed to delete."); }
    };

    // --- CREATE HANDLERS ---
    const handleCreateReport = async (reportData: any) => {
        const newReport = { ...reportData, id: `rep_${Date.now()}`, org_id: activeOrg.id, reporter_id: activeUser?.id || 'unknown', status: 'submitted', audit_trail: [], capa: [], acknowledgements: [] };
        setReportList(prev => [newReport, ...prev]);
        try { await setDoc(doc(db, 'reports', newReport.id), newReport); toast.success("Report saved."); } catch (e) { console.error(e); }
    };

    const handleCreateInspection = async (data: any) => {
        const newInspection = { ...data, id: `insp_${Date.now()}`, org_id: activeOrg.id, findings: [], status: data.status || 'Ongoing', audit_trail: [] };
        setInspectionList(prev => [newInspection, ...prev]);
        try { await setDoc(doc(db, 'inspections', newInspection.id), newInspection); toast.success("Inspection created."); } catch (e) { console.error(e); }
    };

    const handleCreateStandaloneAction = async (data: any) => {
        const newAction = { id: `act_${Date.now()}`, ...data, status: 'Open', source: { type: 'Standalone', id: '-', description: 'Direct Entry' }, origin: { type: 'standalone', parentId: '', itemId: '' } };
        setStandaloneActions(prev => [newAction, ...prev]);
        try { await setDoc(doc(db, 'actions', newAction.id), newAction); toast.success("Action created."); } catch (e) { console.error(e); }
    };
    
    const handleCreateProject = async (data: any) => {
        try {
            const projectData = { ...data, org_id: activeOrg.id, status: 'active', created_at: new Date().toISOString() };
            const docRef = await addDoc(collection(db, 'projects'), projectData);
            const newProj = { id: docRef.id, ...projectData };
            setProjects(prev => [...prev, newProj]);
            toast.success("Project created.");
        } catch (e) { console.error(e); toast.error("Failed to create project"); }
    };

    const handleCreatePtw = async (data: any) => {
        const newPtw = { ...data, id: `ptw_${Date.now()}`, status: 'DRAFT' };
        setPtwList(prev => [newPtw, ...prev]);
        try { await setDoc(doc(db, 'ptws', newPtw.id), newPtw); toast.success("Permit created."); } catch (e) { console.error(e); }
    };

    const handleCreateChecklistTemplate = async (data: any) => {
        const newTemplate = { ...data, id: `ct_${Date.now()}`, org_id: activeOrg.id };
        setChecklistTemplates(prev => [...prev, newTemplate]);
        try { await setDoc(doc(db, 'checklist_templates', newTemplate.id), newTemplate); toast.success("Template created."); } catch (e) { console.error(e); }
    };

    // --- UPDATE HANDLERS ---
    const handleStatusChange = (id: string, status: any) => { setReportList(prev => prev.map(r => r.id === id ? { ...r, status } : r)); updateDB('reports', id, { status }); };
    const handleCapaActionChange = (reportId: string, capaIndex: number, newStatus: CapaAction['status']) => { /* ... implementation ... */ };
    const handleUpdateActionStatus = (origin: any, newStatus: any) => { /* ... implementation ... */ };
    const handleUpdateInspection = (inspection: any, action?: any) => { /* ... implementation ... */ };
    const handleUpdatePtw = (ptw: any, action?: any) => { /* ... implementation ... */ };
    const handleUpdatePlan = (plan: any) => { setPlanList(prev => prev.map(p => p.id === plan.id ? plan : p)); updateDB('plans', plan.id, plan); toast.success("Plan saved."); };
    const handlePlanStatusChange = (id: string, status: any) => { setPlanList(prev => prev.map(p => p.id === id ? { ...p, status } : p)); updateDB('plans', id, { status }); };
    const handleUpdateRams = (rams: any) => { setRamsList(prev => prev.map(r => r.id === rams.id ? rams : r)); updateDB('rams', rams.id, rams); toast.success("RAMS saved."); };
    const handleRamsStatusChange = (id: string, status: any) => { setRamsList(prev => prev.map(r => r.id === id ? { ...r, status } : r)); updateDB('rams', id, { status }); };
    const handleUpdateTbt = (tbt: any) => { setTbtList(prev => prev.map(t => t.id === tbt.id ? tbt : t)); updateDB('tbt_sessions', tbt.id, tbt); toast.success("TBT updated."); };
    const handleAcknowledgeReport = (id: string) => { /* ... implementation ... */ };
    const handleCreateOrUpdateCourse = (c: any) => setTrainingCourseList(prev => [...prev.filter(x => x.id !== c.id), c]);
    const handleScheduleSession = (d: any) => setTrainingSessionList(prev => [{ ...d, id: `ts_${Date.now()}`, roster: [] } as any, ...prev]);
    const handleCloseSession = (id: string, att: any) => setTrainingSessionList(prev => prev.map(s => s.id === id ? { ...s, status: 'completed', attendance: att } : s));

    const handleCreatePlan = (d: any) => {
        const newPlan: any = { id: `plan_${Date.now()}`, org_id: activeOrg.id, project_id: d.project_id, type: d.type, title: d.title, version: 'v1.0', status: 'draft', people: { prepared_by: { name: activeUser?.name || 'Unknown', email: activeUser?.email || '', signed_at: new Date().toISOString() } }, dates: { created_at: new Date().toISOString(), updated_at: new Date().toISOString(), next_review_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }, content: { body_json: d.sections || [], attachments: [] }, meta: { tags: [], change_note: 'Initial creation' }, audit_trail: [] };
        setPlanList(prev => [newPlan, ...prev]);
        try { setDoc(doc(db, 'plans', newPlan.id), newPlan); toast.success("Plan created successfully."); } catch(e) { console.error(e); }
    };

    const handleCreateRams = (d: any) => {
        const newRams: any = { id: `rams_${Date.now()}`, org_id: activeOrg.id, project_id: d.project_id, activity: d.activity, location: d.location, status: 'draft', version: 'v1.0', prepared_by: { name: activeUser?.name || 'Unknown', email: activeUser?.email || '', role: activeUser?.role || 'User', signed_at: new Date().toISOString() }, times: { created_at: new Date().toISOString(), updated_at: new Date().toISOString(), valid_from: new Date().toISOString(), valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }, method_statement: d.aiContent ? { overview: d.aiContent.overview || '', competence: d.aiContent.competence || '', sequence_of_operations: d.aiContent.sequence_of_operations || [], emergency_arrangements: d.aiContent.emergency_arrangements || '' } : { overview: '', competence: '', sequence_of_operations: [], emergency_arrangements: '' }, overall_risk_before: 0, overall_risk_after: 0, attachments: [], linked_ptw_types: [], audit_log: [] };
        setRamsList(prev => [newRams, ...prev]);
        try { setDoc(doc(db, 'rams', newRams.id), newRams); toast.success("RAMS created successfully."); } catch(e) { console.error(e); }
    };

    const handleCreateTbt = (d: any) => setTbtList(prev => [{ ...d, id: `tbt_${Date.now()}`, attendees: [] } as any, ...prev]);

    const actionItems = useMemo<ActionItem[]>(() => {
        const items: ActionItem[] = [];
        (reportList || []).forEach(report => {
            if (report.capa) {
                report.capa.forEach((action, index) => {
                    items.push({ id: `report-${report.id}-capa-${index}`, action: action.action, owner_id: action.owner_id, due_date: action.due_date, status: action.status, project_id: report.project_id, source: { type: 'Report', id: report.id, description: report.description }, origin: { type: 'report-capa', parentId: report.id, itemId: index.toString() } });
                });
            }
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
        handleUpdateActionStatus, handleCreateInspection, handleCreateStandaloneAction,
        handleCreateChecklistTemplate,
        handleDeleteReport, handleDeleteInspection, handleDeletePtw, handleDeleteRams, handleDeletePlan
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