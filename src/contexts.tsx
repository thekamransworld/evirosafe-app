import React, { createContext, useState, useMemo, useContext, useEffect } from 'react';
import { 
  organizations as initialOrganizations, 
  users as initialUsers,
  projects as initialProjects
} from './data';
import { translations, supportedLanguages, roles, planTemplates } from './config';
// IMPORT THE NEW LIBRARY
import { MASTER_CHECKLIST_LIBRARY } from './data/checklistLibrary';

import type { 
  Organization, User, Report, ChecklistRun, Inspection, Plan, Rams, TbtSession, 
  TrainingCourse, TrainingRecord, TrainingSession, Project, View, 
  Ptw, Action, Resource, Sign, ChecklistTemplate, ActionItem, CapaAction 
} from './types';
import { useToast } from './components/ui/Toast';

// --- HELPER FOR PERSISTENCE ---
const useStickyState = <T,>(defaultValue: T, key: string): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
};

// --- APP CONTEXT ---
interface AppContextType {
  currentView: View;
  setCurrentView: React.Dispatch<React.SetStateAction<View>>;
  activeOrg: Organization;
  usersList: User[];
  setUsersList: React.Dispatch<React.SetStateAction<User[]>>;
  activeUser: User | null;
  organizations: Organization[];
  language: string;
  t: (key: string, fallback?: string) => string;
  login: (userId: string) => void;
  logout: () => void;
  can: (action: Action, resource: Resource) => boolean;
  handleInviteUser: (data: any) => void;
  invitedEmails: any[];
  handleCreateOrganization: (data: any) => void;
  handleUpdateUser: (u: User) => void;
  handleApproveUser: (id: string) => void;
  impersonateUser: (id: string) => void;
  stopImpersonating: () => void;
}

const AppContext = createContext<AppContextType>(null!);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [organizations, setOrganizations] = useStickyState<Organization[]>(initialOrganizations, 'es_orgs');
  const [activeOrg, setActiveOrg] = useState<Organization>(organizations[0]);
  const [usersList, setUsersList] = useStickyState<User[]>(initialUsers, 'es_users');
  const [activeUserId, setActiveUserId] = useState<string | null>(() => localStorage.getItem('activeUserId'));
  const [invitedEmails, setInvitedEmails] = useStickyState<any[]>([], 'es_invites');

  const toast = useToast();

  const activeUser = useMemo(() => usersList.find(u => u.id === activeUserId) || null, [activeUserId, usersList]);

  const login = (userId: string) => {
    localStorage.setItem('activeUserId', userId);
    setActiveUserId(userId);
  };
  
  const logout = () => {
    localStorage.removeItem('activeUserId');
    setActiveUserId(null);
  };

  const can = (action: Action, resource: Resource) => true; 
  const t = (key: string, fallback: string = key) => fallback;

  const handleInviteUser = (data: any) => {
      setInvitedEmails(prev => [...prev, data]);
      toast.success("User invited");
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
    toast.success("Organization Created");
  };

  const value = {
    currentView, setCurrentView,
    activeOrg, organizations,
    usersList, setUsersList, activeUser,
    language: 'en', t,
    login, logout, can,
    handleInviteUser, invitedEmails,
    handleCreateOrganization,
    handleUpdateUser: () => {},
    handleApproveUser: () => {},
    impersonateUser: () => {},
    stopImpersonating: () => {}
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);

// --- DATA CONTEXT ---
interface DataContextType {
  projects: Project[];
  reportList: Report[];
  inspectionList: Inspection[];
  checklistRunList: ChecklistRun[];
  planList: Plan[];
  ramsList: Rams[];
  tbtList: TbtSession[];
  ptwList: Ptw[];
  checklistTemplates: ChecklistTemplate[];
  actionItems: ActionItem[];
  
  setInspectionList: React.Dispatch<React.SetStateAction<Inspection[]>>;
  setChecklistRunList: React.Dispatch<React.SetStateAction<ChecklistRun[]>>;
  setPtwList: React.Dispatch<React.SetStateAction<Ptw[]>>;
  setChecklistTemplates: React.Dispatch<React.SetStateAction<ChecklistTemplate[]>>;
  
  handleCreateProject: (data: any) => void;
  handleCreateReport: (data: any) => void;
  handleCreateInspection: (data: any) => void;
  handleCreatePtw: (data: any) => void;
  handleCreatePlan: (data: any) => void;
  handleCreateRams: (data: any) => void;
  handleCreateTbt: (data: any) => void;
  handleCreateStandaloneAction: (data: any) => void;
  
  handleUpdateInspection: (data: any, action?: any) => void;
  handleUpdatePtw: (data: any, action?: any) => void;
  handleUpdatePlan: (data: any) => void;
  handlePlanStatusChange: (id: string, status: any) => void;
  handleUpdateRams: (data: any) => void;
  handleRamsStatusChange: (id: string, status: any) => void;
  handleUpdateTbt: (data: any) => void;
  handleStatusChange: (id: string, status: any) => void;
  handleCapaActionChange: (id: string, index: number, status: any) => void;
  handleAcknowledgeReport: (id: string) => void;
  handleUpdateActionStatus: (origin: any, status: any) => void;
  
  trainingCourseList: TrainingCourse[];
  trainingRecordList: TrainingRecord[];
  trainingSessionList: TrainingSession[];
  notifications: Notification[];
  signs: Sign[];
  handleCreateOrUpdateCourse: (data: any) => void;
  handleScheduleSession: (data: any) => void;
  handleCloseSession: (id: string, attendance: any) => void;
}

const DataContext = createContext<DataContextType>(null!);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { activeOrg, activeUser } = useAppContext();
    const toast = useToast();
    
    const [projects, setProjects] = useStickyState<Project[]>(initialProjects, 'es_projects');
    const [reportList, setReportList] = useStickyState<Report[]>([], 'es_reports');
    const [inspectionList, setInspectionList] = useStickyState<Inspection[]>([], 'es_inspections');
    const [checklistRunList, setChecklistRunList] = useStickyState<ChecklistRun[]>([], 'es_checklist_runs');
    const [planList, setPlanList] = useStickyState<Plan[]>([], 'es_plans');
    const [ramsList, setRamsList] = useStickyState<Rams[]>([], 'es_rams');
    const [tbtList, setTbtList] = useStickyState<TbtSession[]>([], 'es_tbts');
    const [ptwList, setPtwList] = useStickyState<Ptw[]>([], 'es_ptws');
    // INITIALIZE WITH MASTER LIBRARY
    const [checklistTemplates, setChecklistTemplates] = useStickyState<ChecklistTemplate[]>(MASTER_CHECKLIST_LIBRARY, 'es_templates');
    const [standaloneActions, setStandaloneActions] = useStickyState<ActionItem[]>([], 'es_actions');

    const handleCreateReport = (data: any) => {
        const newReport = { ...data, id: `rep_${Date.now()}`, org_id: activeOrg.id, status: 'submitted', capa: [], audit_trail: [] };
        setReportList(prev => [newReport, ...prev]);
        toast.success("Report Saved");
    };

    const handleCreateInspection = (data: any) => {
        const newInsp = { ...data, id: `insp_${Date.now()}`, org_id: activeOrg.id, findings: [], status: 'Ongoing' };
        setInspectionList(prev => [newInsp, ...prev]);
        toast.success("Inspection Started");
    };

    const handleCreatePtw = (data: any) => {
        const newPtw = { ...data, id: `ptw_${Date.now()}`, status: 'DRAFT' };
        setPtwList(prev => [newPtw, ...prev]);
        toast.success("Permit Created");
    };

    const handleCreatePlan = (data: any) => {
        const templateSections = planTemplates[data.type as any] || [];
        const newPlan = { 
            ...data, 
            id: `plan_${Date.now()}`, 
            status: 'draft',
            content: { body_json: templateSections, attachments: [] },
            people: { prepared_by: { name: activeUser?.name, email: activeUser?.email } },
            dates: { created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            meta: { tags: [], change_note: 'Initial Draft' }
        };
        setPlanList(prev => [newPlan, ...prev]);
        toast.success("Plan Created");
    };

    const handleCreateRams = (data: any) => {
        const newRams = { ...data, id: `rams_${Date.now()}`, status: 'draft' };
        setRamsList(prev => [newRams, ...prev]);
        toast.success("RAMS Created");
    };

    const handleCreateTbt = (data: any) => {
        const newTbt = { ...data, id: `tbt_${Date.now()}`, status: 'draft' };
        setTbtList(prev => [newTbt, ...prev]);
        toast.success("TBT Created");
    };

    const handleCreateStandaloneAction = (data: any) => {
        const newAction = { ...data, id: `act_${Date.now()}`, status: 'Open' };
        setStandaloneActions(prev => [newAction, ...prev]);
        toast.success("Action Created");
    };

    const handleCreateProject = (data: any) => {
        const newProj = { ...data, id: `proj_${Date.now()}`, org_id: activeOrg.id, status: 'active' };
        setProjects(prev => [...prev, newProj]);
        toast.success("Project Created");
    };

    const handleUpdateInspection = (data: any) => setInspectionList(prev => prev.map(i => i.id === data.id ? data : i));
    const handleUpdatePtw = (data: any) => setPtwList(prev => prev.map(p => p.id === data.id ? data : p));
    const handleUpdatePlan = (data: any) => setPlanList(prev => prev.map(p => p.id === data.id ? data : p));
    const handlePlanStatusChange = (id: string, s: any) => setPlanList(prev => prev.map(p => p.id === id ? { ...p, status: s } : p));
    const handleUpdateRams = (data: any) => setRamsList(prev => prev.map(r => r.id === data.id ? data : r));
    const handleRamsStatusChange = (id: string, s: any) => setRamsList(prev => prev.map(r => r.id === id ? { ...r, status: s } : r));
    const handleUpdateTbt = (data: any) => setTbtList(prev => prev.map(t => t.id === data.id ? data : t));
    const handleStatusChange = (id: string, s: any) => setReportList(prev => prev.map(r => r.id === id ? { ...r, status: s } : r));
    
    const handleCapaActionChange = (id: string, index: number, status: any) => {
        setReportList(prev => prev.map(r => {
            if (r.id === id) {
                const newCapa = [...r.capa];
                if(newCapa[index]) newCapa[index].status = status;
                return { ...r, capa: newCapa };
            }
            return r;
        }));
    };

    const handleUpdateActionStatus = (origin: any, status: any) => {
        if (origin.type === 'standalone') {
            setStandaloneActions(prev => prev.map(a => a.id === origin.parentId ? { ...a, status } : a));
        } else {
            handleCapaActionChange(origin.parentId, parseInt(origin.itemId), status);
        }
    };

    const actionItems = useMemo(() => {
        const reportActions = reportList.flatMap(r => r.capa.map((c, i) => ({
            id: `rep_${r.id}_${i}`,
            action: c.action,
            owner_id: c.owner_id,
            due_date: c.due_date,
            status: c.status,
            project_id: r.project_id,
            source: { type: 'Report', id: r.id, description: r.description },
            origin: { type: 'report-capa', parentId: r.id, itemId: i.toString() }
        })));
        return [...reportActions, ...standaloneActions];
    }, [reportList, standaloneActions]);

    const value = {
        projects, reportList, inspectionList, checklistRunList, planList, ramsList, tbtList, ptwList, checklistTemplates, actionItems,
        setInspectionList, setChecklistRunList, setPtwList, setChecklistTemplates,
        handleCreateProject, handleCreateReport, handleCreateInspection, handleCreatePtw, handleCreatePlan, handleCreateRams, handleCreateTbt, handleCreateStandaloneAction,
        handleUpdateInspection, handleUpdatePtw, handleUpdatePlan, handlePlanStatusChange, handleUpdateRams, handleRamsStatusChange, handleUpdateTbt,
        handleStatusChange, handleCapaActionChange, handleAcknowledgeReport: () => {}, handleUpdateActionStatus,
        isLoading: false,
        trainingCourseList: [], trainingRecordList: [], trainingSessionList: [], notifications: [], signs: [],
        handleCreateOrUpdateCourse: () => {}, handleScheduleSession: () => {}, handleCloseSession: () => {}
    };

    return <DataContext.Provider value={value as any}>{children}</DataContext.Provider>;
};

export const useDataContext = () => useContext(DataContext);

// --- MODAL CONTEXT ---
interface ModalContextType {
  selectedReport: any; setSelectedReport: (v:any) => void;
  isReportCreationModalOpen: boolean; setIsReportCreationModalOpen: (v:boolean) => void;
  reportInitialData: any; setReportInitialData: (v:any) => void;
  isActionCreationModalOpen: boolean; setIsActionCreationModalOpen: (v:boolean) => void;
  openActionCreationModal: () => void;
  openActionDetailModal: (v:any) => void;
  selectedPtw: any; setSelectedPtw: (v:any) => void;
  isPtwCreationModalOpen: boolean; setIsPtwCreationModalOpen: (v:boolean) => void;
  ptwCreationMode: any; setPtwCreationMode: (v:any) => void;
  selectedPlan: any; setSelectedPlan: (v:any) => void;
  selectedPlanForEdit: any; setSelectedPlanForEdit: (v:any) => void;
  isPlanCreationModalOpen: boolean; setIsPlanCreationModalOpen: (v:boolean) => void;
  selectedRams: any; setSelectedRams: (v:any) => void;
  selectedRamsForEdit: any; setSelectedRamsForEdit: (v:any) => void;
  isRamsCreationModalOpen: boolean; setIsRamsCreationModalOpen: (v:boolean) => void;
  selectedTbt: any; setSelectedTbt: (v:any) => void;
  isTbtCreationModalOpen: boolean; setIsTbtCreationModalOpen: (v:boolean) => void;
  isCourseModalOpen: boolean; setCourseModalOpen: (v:boolean) => void;
  isSessionModalOpen: boolean; setSessionModalOpen: (v:boolean) => void;
  isAttendanceModalOpen: boolean; setAttendanceModalOpen: (v:boolean) => void;
  courseForSession: any; setCourseForSession: (v:any) => void;
  sessionForAttendance: any; setSessionForAttendance: (v:any) => void;
  isInspectionCreationModalOpen: boolean; setIsInspectionCreationModalOpen: (v:boolean) => void;
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

  const value = {
    selectedReport, setSelectedReport, isReportCreationModalOpen, setIsReportCreationModalOpen, reportInitialData, setReportInitialData,
    isActionCreationModalOpen, setIsActionCreationModalOpen, openActionCreationModal: () => setIsActionCreationModalOpen(true), openActionDetailModal: () => {},
    selectedPtw, setSelectedPtw, isPtwCreationModalOpen, setIsPtwCreationModalOpen, ptwCreationMode, setPtwCreationMode,
    selectedPlan, setSelectedPlan, selectedPlanForEdit, setSelectedPlanForEdit, isPlanCreationModalOpen, setIsPlanCreationModalOpen,
    selectedRams, setSelectedRams, selectedRamsForEdit, setSelectedRamsForEdit, isRamsCreationModalOpen, setIsRamsCreationModalOpen,
    selectedTbt, setSelectedTbt, isTbtCreationModalOpen, setIsTbtCreationModalOpen,
    isCourseModalOpen, setCourseModalOpen, isSessionModalOpen, setSessionModalOpen, isAttendanceModalOpen, setAttendanceModalOpen,
    courseForSession, setCourseForSession, sessionForAttendance, setSessionForAttendance,
    isInspectionCreationModalOpen, setIsInspectionCreationModalOpen
  };

  return <ModalContext.Provider value={value as any}>{children}</ModalContext.Provider>;
};

export const useModalContext = () => useContext(ModalContext);