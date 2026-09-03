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
  Project, View, Ptw, Action, Resource, Sign, ChecklistTemplate, ActionItem, Notification, CapaAction, Chemical, BbsObservation,
  Hazard, ContractorCompany, ContractorWorker, PpeItem, PpeAssignment, ShiftLog, FfdAssessment, EnvReading, SafetyMeeting,
  EmergencyPlan, EmergencyDrill, ControlledDocument, DataRequest, RetentionPolicy, ProcessingActivity, DataBreach, ComplianceTracking, RcaRecord,
  SiteAccessLog, CorrectiveAction, ManHoursEntry, Audit, LegalComplianceItem, WasteRecord
} from './types';
import { useToast } from './components/ui/Toast';

// --- FIREBASE IMPORTS ---
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, query, where } from 'firebase/firestore';
import { useAuth } from './contexts/AuthContext';

// --- NOTIFICATION SERVICE ---
import { sendNotification, notifyRole } from './services/notificationService';

// --- EMAIL SERVICE ---
import { sendInviteEmail } from './services/emailService';

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
  handleDeleteUser: (userId: string) => void;
  organizations: Organization[];
  handleCreateOrganization: (data: any) => void;
  invitedEmails: InvitedUser[];
  handleInviteUser: (userData: { org_id?: string; name: string; email: string; role: User['role']; project_id?: string; department?: string }) => Promise<void>;
  handleSignUp: (email: string) => void;
  handleApproveUser: (userId: string) => void;
  language: string;
  dir: 'ltr' | 'rtl';
  t: (key: string, fallback?: string) => string;
  login: (userId: string) => void;
  logout: () => void;
  can: (action: Action, resource: Resource) => boolean;
  impersonatedUser: User | null;
  impersonateUser: (userId: string) => void;
  stopImpersonating: () => void;
}

const AppContext = createContext<AppContextType>(null!);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth(); // Get Firebase Auth User
  
  const [currentView, setCurrentView] = useState<View>(() => {
    return (localStorage.getItem('currentView') as View) || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);
  
  const [organizations, setOrganizations] = useState<Organization[]>(initialOrganizations || []);
  const [activeOrg, setActiveOrg] = useState<Organization>(organizations[0] || initialOrganizations[0]);

  // Organizations were previously only ever written to Firestore, never read back —
  // meaning an org created in one session never showed up again after a reload or for
  // anyone else. This brings it in line with every other collection's fetch pattern.
  // Organizations aren't org_id-scoped themselves (they ARE the org), so this fetches
  // just the one this user belongs to, by ID, via the pointer doc — not the full list.
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const ptrSnap = await getDoc(doc(db, 'users_by_uid', currentUser.uid));
        const myOrgId = ptrSnap.exists() ? (ptrSnap.data() as any).org_id : null;
        if (!myOrgId) return; // Not linked yet — DataProvider's fallback will backfill this shortly.
        const orgSnap = await getDoc(doc(db, 'organizations', myOrgId));
        if (orgSnap.exists()) {
          const org = { ...orgSnap.data(), id: orgSnap.id } as Organization;
          setOrganizations(prev => {
            const exists = prev.some(o => o.id === org.id);
            return exists ? prev.map(o => o.id === org.id ? org : o) : [...prev, org];
          });
        }
      } catch (e) {
        console.error('Error fetching organization:', e);
      }
    })();
  }, [currentUser]);
  
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [usersList, setUsersList] = useState<User[]>(initialUsers || []);
  const [activeUserId, setActiveUserId] = useState<string | null>(() => localStorage.getItem('activeUserId'));
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
  const [invitedEmails, setInvitedEmails] = useState<InvitedUser[]>([]);

  const toast = useToast();

  // --- CRITICAL FIX: ROBUST USER RESOLUTION ---
  const activeUser = useMemo(() => {
    // 1. If we are impersonating, use that
    if (impersonatedUser) return impersonatedUser;

    // 2. Try to find user in the loaded list (Database)
    if (activeUserId) {
        const foundInState = usersList.find(u => u.id === activeUserId);
        if (foundInState) return foundInState;
        
        const foundInStatic = initialUsers.find(u => u.id === activeUserId);
        if (foundInStatic) return foundInStatic;
    }

    // 3. FALLBACK: If Database is loading but Auth is ready, show a minimal, low-privilege
    // placeholder rather than nothing — this is display-only now. It intentionally does NOT
    // grant elevated access (see the can() fix above): if this is a genuine loading flicker,
    // the real record replaces it within a render or two; if no matching record ever shows up,
    // this user correctly ends up with no real permissions instead of silently becoming an admin.
    if (currentUser) {
        return {
            id: currentUser.uid,
            name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
            email: currentUser.email || '',
            role: 'WORKER',
            org_id: activeOrg.id,
            status: 'active',
            avatar_url: '',
            preferences: { language: 'en', default_view: 'dashboard', units: { temperature: 'C', wind_speed: 'km/h', height: 'm', weight: 'kg' } }
        } as User;
    }

    return null;
  }, [activeUserId, usersList, currentUser, impersonatedUser, activeOrg.id]);

  const login = (userId: string) => {
    localStorage.setItem('activeUserId', userId);
    setActiveUserId(userId);
    
    // Try to find user to set view preferences
    const user = usersList.find(u => u.id === userId) || initialUsers.find(u => u.id === userId);
    if (user) {
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
    setImpersonatedUser(null);
  };

  const impersonateUser = (userId: string) => {
    // Store current admin before switching
    // Note: In a real app, you'd store this in a separate state variable
    // For now, we assume the current activeUser is the admin
    if (activeUser && activeUser.role === 'ADMIN') {
        // We need to find the user we want to be
        const targetUser = usersList.find(u => u.id === userId);
        if (targetUser) {
            setImpersonatedUser(targetUser); // Set the target as the active view
        }
    }
  };

  const stopImpersonating = () => {
    setImpersonatedUser(null);
  };

  const can = (action: Action, resource: Resource): boolean => {
    if (!activeUser) return false;
    
    // Find role definition
    const userRole = roles.find(r => r.key === activeUser.role);
    
    // Fallback for temporary/unknown roles: no permissions until a real role resolves.
    // (Previously this granted every permission to the not-yet-resolved fallback user —
    // that was the actual privilege-escalation bug, not just the displayed role label.)
    if (!userRole) {
        return false;
    }

    // Check specific resource permission
    const permission = userRole.permissions.find(p => p.resource === resource);
    return permission ? permission.actions.includes(action) : false;
  };

  const language = activeUser?.preferences?.language || 'en';
  const dir = useMemo(() => supportedLanguages.find(l => l.code === language)?.dir || 'ltr', [language]);

  const handleUpdateUser = async (updatedUser: User) => {
    const previous = usersList.find(u => u.id === updatedUser.id);
    setUsersList(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    try {
      await updateDoc(doc(db, 'users', updatedUser.id), { ...updatedUser });
      // Keep the pointer doc in sync if this user is activated and their role/org_id
      // actually changed — otherwise Firestore rules would keep enforcing stale
      // permissions after a role change, exactly the kind of drift this whole
      // pointer-collection approach exists to prevent.
      if (
        (updatedUser as any).auth_uid &&
        previous &&
        (previous.role !== updatedUser.role ||
         previous.org_id !== updatedUser.org_id ||
         JSON.stringify(previous.project_ids || []) !== JSON.stringify(updatedUser.project_ids || []))
      ) {
        await setDoc(doc(db, 'users_by_uid', (updatedUser as any).auth_uid), {
          docId: updatedUser.id,
          org_id: updatedUser.org_id,
          role: updatedUser.role,
          project_ids: updatedUser.project_ids || [],
        });
      }
    } catch (e) {
      console.error('Failed to save user update:', e);
      toast.error('Failed to save changes.');
      if (previous) setUsersList(prev => prev.map(u => u.id === updatedUser.id ? previous : u));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === activeUser?.id) {
      toast.error("You can't delete your own account.");
      return;
    }
    const target = usersList.find(u => u.id === userId);
    setUsersList(prev => prev.filter(u => u.id !== userId));
    try {
      await deleteDoc(doc(db, 'users', userId));
      // Clean up the pointer doc too, if this user had one — an orphaned pointer
      // with no real user doc behind it is exactly the kind of stale record that
      // cost hours of confusion earlier in this project.
      const authUid = (target as any)?.auth_uid;
      if (authUid) {
        await deleteDoc(doc(db, 'users_by_uid', authUid)).catch((e) => console.error('Pointer cleanup failed:', e));
      }
      toast.success('User removed.');
    } catch (e) {
      console.error('Failed to delete user:', e);
      toast.error('Failed to delete user.');
      if (target) setUsersList(prev => [...prev, target]);
    }
  };
  
  const handleCreateOrganization = async (data: any) => {
    const newOrg = { ...data, id: `org_${Date.now()}`, status: 'active' };
    setOrganizations(prev => [...prev, newOrg]);
    try {
        await setDoc(doc(db, 'organizations', newOrg.id), newOrg);
        toast.success("Organization created.");
    } catch (e) {
        console.error(e);
        toast.error("Failed to create organization.");
        setOrganizations(prev => prev.filter(o => o.id !== newOrg.id));
    }
  };

  const handleInviteUser = async (userData: { org_id?: string; name: string; email: string; role: User['role']; project_id?: string; department?: string }) => {
    const newUserId = `user_${Date.now()}`;
    const newUser: User = {
      id: newUserId,
      org_id: userData.org_id || activeOrg?.id || '',
      email: userData.email.trim().toLowerCase(),
      name: userData.name,
      avatar_url: '',
      role: userData.role,
      status: 'invited',
      ...(userData.project_id ? { project_ids: [userData.project_id] } : {}),
    } as User;

    setUsersList(prev => [...prev, newUser]);
    setInvitedEmails(prev => [...prev, userData as InvitedUser]);

    try {
      await setDoc(doc(db, 'users', newUserId), newUser);
      toast.success(`${userData.name} invited. They can sign up with ${userData.email}.`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to save invited user.');
      setUsersList(prev => prev.filter(u => u.id !== newUserId));
      return;
    }

    try {
      await sendInviteEmail(
        userData.email,
        userData.name,
        userData.role,
        activeOrg?.name || 'your organization',
        activeUser?.name || 'Your admin'
      );
    } catch (e) {
      console.error('Invite email failed to send:', e);
      toast.error(`${userData.name} was invited, but the notification email failed to send. Let them know to activate manually.`);
    }
  };
  const handleSignUp = () => {};
  const handleApproveUser = async (id: string) => {
    setUsersList(prev => prev.map(u => u.id === id ? { ...u, status: 'active' } : u));
    try {
      await updateDoc(doc(db, 'users', id), { status: 'active' });
    } catch (e) {
      console.error('Failed to approve user:', e);
    }
  };
  const t = (key: string, fallback: string = key) => translations[language]?.[key] || translations['en']?.[key] || fallback;

  const value = {
    currentView, setCurrentView, activeOrg, setActiveOrg, isSidebarOpen, setSidebarOpen,
    usersList, setUsersList, activeUser, handleUpdateUser, handleDeleteUser, organizations, handleCreateOrganization,
    invitedEmails, handleInviteUser, handleSignUp, handleApproveUser, language, dir, t,
    login, logout, can, impersonatedUser, impersonateUser, stopImpersonating
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
  chemicalList: Chemical[];
  bbsObservations: BbsObservation[];
  legalComplianceList: LegalComplianceItem[];
  wasteRecordList: WasteRecord[];
  hazardList: Hazard[];
  contractorCompanies: ContractorCompany[];
  contractorWorkers: ContractorWorker[];
  ppeItems: PpeItem[];
  ppeAssignments: PpeAssignment[];
  shiftLogs: ShiftLog[];
  ffdAssessments: FfdAssessment[];
  envReadings: EnvReading[];
  safetyMeetings: SafetyMeeting[];
  emergencyPlans: EmergencyPlan[];
  emergencyDrills: EmergencyDrill[];
  controlledDocuments: ControlledDocument[];
  dataRequests: DataRequest[];
  retentionPolicies: RetentionPolicy[];
  processingActivities: ProcessingActivity[];
  dataBreaches: DataBreach[];
  complianceTracking: ComplianceTracking[];
  rcaRecords: RcaRecord[];
  siteAccessLogs: SiteAccessLog[];
  correctiveActions: CorrectiveAction[];
  manHoursEntries: ManHoursEntry[];
  audits: Audit[];
  
  setInspectionList: React.Dispatch<React.SetStateAction<Inspection[]>>;
  setChecklistRunList: React.Dispatch<React.SetStateAction<ChecklistRun[]>>;
  setPtwList: React.Dispatch<React.SetStateAction<Ptw[]>>;
  
  handleCreateProject: (data: any) => void;
  handleUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  handleCreateReport: (data: any) => void;
  handleStatusChange: (id: string, status: any) => void;
  handleCapaActionChange: (id: string, index: number, status: any) => void;
  handleAddCapaAction: (reportId: string, action: Omit<CapaAction, 'status'>) => void;
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
  handleCreateChemical: (data: any) => void;
  handleUpdateChemical: (data: Chemical) => void;
  handleCreateBbsObservation: (data: BbsObservation) => void;
  handleUpdateBbsObservation: (data: BbsObservation) => void;
  handleCreateLegalComplianceItem: (data: LegalComplianceItem) => void;
  handleUpdateLegalComplianceItem: (data: LegalComplianceItem) => void;
  handleCreateWasteRecord: (data: WasteRecord) => void;
  handleCreateHazard: (data: Hazard) => void;
  handleUpdateHazard: (data: Hazard) => void;
  handleCreateContractorCompany: (data: ContractorCompany) => void;
  handleUpdateContractorCompany: (data: ContractorCompany) => void;
  handleCreateContractorWorker: (data: ContractorWorker) => void;
  handleUpdateContractorWorker: (data: ContractorWorker) => void;
  handleCreatePpeItem: (data: PpeItem) => void;
  handleUpdatePpeItem: (data: PpeItem) => void;
  handleCreatePpeAssignment: (data: PpeAssignment) => void;
  handleUpdatePpeAssignment: (data: PpeAssignment) => void;
  handleCreateShiftLog: (data: ShiftLog) => void;
  handleCreateFfdAssessment: (data: FfdAssessment) => void;
  handleCreateEnvReading: (data: EnvReading) => void;
  handleCreateSafetyMeeting: (data: SafetyMeeting) => void;
  handleUpdateSafetyMeeting: (data: SafetyMeeting) => void;
  handleCreateEmergencyPlan: (data: EmergencyPlan) => void;
  handleUpdateEmergencyPlan: (data: EmergencyPlan) => void;
  handleCreateEmergencyDrill: (data: EmergencyDrill) => void;
  handleUpdateEmergencyDrill: (data: EmergencyDrill) => void;
  handleCreateControlledDocument: (data: ControlledDocument) => void;
  handleUpdateControlledDocument: (data: ControlledDocument) => void;
  handleCreateDataRequest: (data: DataRequest) => void;
  handleUpdateDataRequest: (data: DataRequest) => void;
  handleCreateRetentionPolicy: (data: RetentionPolicy) => void;
  handleUpdateRetentionPolicy: (data: RetentionPolicy) => void;
  handleCreateProcessingActivity: (data: ProcessingActivity) => void;
  handleUpdateProcessingActivity: (data: ProcessingActivity) => void;
  handleCreateDataBreach: (data: DataBreach) => void;
  handleUpdateDataBreach: (data: DataBreach) => void;
  handleUpdateComplianceTracking: (data: Omit<ComplianceTracking, 'id' | 'org_id' | 'updated_at'> & { id?: string }) => void;
  handleCreateRcaRecord: (data: RcaRecord) => void;
  handleCreateSiteAccessLog: (data: SiteAccessLog) => void;
  handleUpdateSiteAccessLog: (data: SiteAccessLog) => void;
  handleCreateCorrectiveAction: (data: CorrectiveAction) => void;
  handleUpdateCorrectiveAction: (data: CorrectiveAction) => void;
  handleSaveManHoursEntry: (data: Omit<ManHoursEntry, 'id' | 'org_id'> & { id?: string }) => void;
  handleCreateAudit: (data: Audit) => void;
  handleUpdateAudit: (data: Audit) => void;

  // --- DELETE HANDLERS ---
  handleDeleteReport: (id: string) => void;
  handleDeleteInspection: (id: string) => void;
  handleDeletePtw: (id: string) => void;
  handleDeletePlan: (id: string) => void;
  handleDeleteRams: (id: string) => void;
  handleDeleteTbt: (id: string) => void;
}

const DataContext = createContext<DataContextType>(null!);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { activeOrg, activeUser, setUsersList } = useAppContext();
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
    const [chemicalList, setChemicalList] = useState<Chemical[]>([]);
    const [bbsObservations, setBbsObservations] = useState<BbsObservation[]>([]);
    const [legalComplianceList, setLegalComplianceList] = useState<LegalComplianceItem[]>([]);
    const [wasteRecordList, setWasteRecordList] = useState<WasteRecord[]>([]);
    const [hazardList, setHazardList] = useState<Hazard[]>([]);
    const [contractorCompanies, setContractorCompanies] = useState<ContractorCompany[]>([]);
    const [contractorWorkers, setContractorWorkers] = useState<ContractorWorker[]>([]);
    const [ppeItems, setPpeItems] = useState<PpeItem[]>([]);
    const [ppeAssignments, setPpeAssignments] = useState<PpeAssignment[]>([]);
    const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);
    const [ffdAssessments, setFfdAssessments] = useState<FfdAssessment[]>([]);
    const [envReadings, setEnvReadings] = useState<EnvReading[]>([]);
    const [safetyMeetings, setSafetyMeetings] = useState<SafetyMeeting[]>([]);
    const [emergencyPlans, setEmergencyPlans] = useState<EmergencyPlan[]>([]);
    const [emergencyDrills, setEmergencyDrills] = useState<EmergencyDrill[]>([]);
    const [controlledDocuments, setControlledDocuments] = useState<ControlledDocument[]>([]);
    const [dataRequests, setDataRequests] = useState<DataRequest[]>([]);
    const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([]);
    const [processingActivities, setProcessingActivities] = useState<ProcessingActivity[]>([]);
    const [dataBreaches, setDataBreaches] = useState<DataBreach[]>([]);
    const [complianceTracking, setComplianceTracking] = useState<ComplianceTracking[]>([]);
    const [rcaRecords, setRcaRecords] = useState<RcaRecord[]>([]);
    const [siteAccessLogs, setSiteAccessLogs] = useState<SiteAccessLog[]>([]);
    const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([]);
    const [manHoursEntries, setManHoursEntries] = useState<ManHoursEntry[]>([]);
    const [audits, setAudits] = useState<Audit[]>([]);

    useEffect(() => {
      if (!currentUser) {
          setIsLoading(false);
          return;
      }

      const fetchData = async () => {
        try {
          // Resolve org_id, role, and project_ids BEFORE fetching anything else, so
          // every query below can be scoped correctly. Previously every fetchCol
          // pulled entire collections with no filter at all — every organization's
          // data, into every browser, every load.
          const resolveMyIdentity = async (): Promise<{ orgId: string | null; role: string | null; projectIds: string[] }> => {
            // Tier 1: the pointer doc — fast, reliable, what new activations create.
            try {
              const ptrSnap = await getDoc(doc(db, 'users_by_uid', currentUser.uid));
              if (ptrSnap.exists()) {
                const ptr = ptrSnap.data() as any;
                if (ptr.org_id) {
                  // Pointers written before project-level scoping existed have no
                  // project_ids key at all (distinct from a real, explicit empty
                  // array). Backfill from the real user doc so existing activated
                  // users don't silently lose all project-scoped visibility the
                  // moment this ships.
                  if (ptr.project_ids === undefined && ptr.docId) {
                    try {
                      const userSnap = await getDoc(doc(db, 'users', ptr.docId));
                      const projectIds = userSnap.exists() ? ((userSnap.data() as any).project_ids || []) : [];
                      await setDoc(doc(db, 'users_by_uid', currentUser.uid), { ...ptr, project_ids: projectIds });
                      return { orgId: ptr.org_id, role: ptr.role || null, projectIds };
                    } catch (e) { console.error('Pointer project_ids backfill failed:', e); }
                  }
                  return { orgId: ptr.org_id, role: ptr.role || null, projectIds: ptr.project_ids || [] };
                }
              }
            } catch (e) { console.error('Pointer lookup failed:', e); }

            // Tier 2: fall back to an email match against the real users collection —
            // covers accounts activated or manually fixed before the pointer collection
            // existed. Also backfills the pointer so future loads use the fast path.
            if (currentUser.email) {
              try {
                const emailSnap = await getDocs(query(collection(db, 'users'), where('email', '==', currentUser.email)));
                if (!emailSnap.empty) {
                  const data = emailSnap.docs[0].data() as any;
                  if (data.org_id) {
                    // Must await this — the fetchCol calls right after this function
                    // returns will be authorized by Firestore rules against this exact
                    // pointer doc. If it isn't written yet, those reads get denied even
                    // though resolution succeeded on the client a moment earlier.
                    try {
                      await setDoc(doc(db, 'users_by_uid', currentUser.uid), {
                        docId: emailSnap.docs[0].id, org_id: data.org_id, role: data.role || null,
                        project_ids: data.project_ids || [],
                      });
                    } catch (e) { console.error('Pointer backfill failed:', e); }
                    return { orgId: data.org_id, role: data.role || null, projectIds: data.project_ids || [] };
                  }
                }
              } catch (e) { console.error('Email fallback lookup failed:', e); }
            }
            return { orgId: null, role: null, projectIds: [] };
          };

          const { orgId: myOrgId, role: myRole, projectIds: myProjectIds } = await resolveMyIdentity();
          const isProjectRestricted = myRole != null && !['ADMIN', 'ORG_ADMIN'].includes(myRole);
          // Confirmed from types.ts: exactly these collections carry a project_id
          // field. Everything else (training catalog, chemicals register, legal
          // compliance, etc.) is genuinely org-wide and must not be filtered here —
          // doing so would silently hide data Firestore rules would otherwise allow.
          const PROJECT_SCOPED_COLLECTIONS = new Set([
            'reports', 'inspections', 'ptws', 'checklist_runs', 'plans', 'rams',
            'actions', 'tbt_sessions', 'training_sessions', 'bbs_observations',
            'hazards', 'contractor_workers', 'ppe_assignments', 'shift_logs',
            'env_readings', 'waste_records', 'safety_meetings', 'site_access_logs',
            'man_hours_entries',
          ]);

          const fetchCol = async (name: string, setter: any, initialData: any[] = []) => {
            if (!myOrgId) { setter(initialData); return; }
            const needsProjectFilter = isProjectRestricted && PROJECT_SCOPED_COLLECTIONS.has(name);
            if (needsProjectFilter && myProjectIds.length === 0) {
              // Firestore's 'in' operator requires a non-empty array — a restricted
              // user assigned to zero projects should just see nothing here, not
              // hit an invalid-query error.
              setter(initialData);
              return;
            }
            const constraints = [where('org_id', '==', myOrgId)];
            if (needsProjectFilter) {
              // Firestore's 'in' filter caps at 30 values.
              constraints.push(where('project_id', 'in', myProjectIds.slice(0, 30)));
            }
            const snap = await getDocs(query(collection(db, name), ...constraints));
            // Spread the document's data first, then force `id` to the actual Firestore
            // document ID. .data() alone never includes it — it only came through before
            // for documents that happened to also store a matching `id` field manually.
            // Any document missing that redundant field silently got `id: undefined` and
            // could never be found again by ID anywhere else in the app.
            const data = snap.docs.map(d => ({ ...d.data(), id: d.id }));
            if (data.length > 0) {
                 setter(data);
            } else {
                 setter(initialData); 
            }
          };

          await Promise.all([
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
            fetchCol('chemicals', setChemicalList),
            fetchCol('bbs_observations', setBbsObservations),
            fetchCol('hazards', setHazardList),
            fetchCol('contractor_companies', setContractorCompanies),
            fetchCol('contractor_workers', setContractorWorkers),
            fetchCol('ppe_items', setPpeItems),
            fetchCol('ppe_assignments', setPpeAssignments),
            fetchCol('shift_logs', setShiftLogs),
            fetchCol('ffd_assessments', setFfdAssessments),
            fetchCol('env_readings', setEnvReadings),
            fetchCol('legal_compliance_items', setLegalComplianceList),
            fetchCol('waste_records', setWasteRecordList),
            fetchCol('safety_meetings', setSafetyMeetings),
            fetchCol('emergency_plans', setEmergencyPlans),
            fetchCol('emergency_drills', setEmergencyDrills),
            fetchCol('controlled_documents', setControlledDocuments),
            fetchCol('dsar_requests', setDataRequests),
            fetchCol('retention_policies', setRetentionPolicies),
            fetchCol('processing_activities', setProcessingActivities),
            fetchCol('data_breaches', setDataBreaches),
            fetchCol('compliance_tracking', setComplianceTracking),
            fetchCol('rca_records', setRcaRecords),
            fetchCol('site_access_logs', setSiteAccessLogs),
            fetchCol('corrective_actions', setCorrectiveActions),
            fetchCol('man_hours_entries', setManHoursEntries),
            fetchCol('audits', setAudits),
          ]);
        } catch (e) {
          console.error("Error fetching data:", e);
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
    }, [currentUser, setUsersList]);

    const updateDB = async (collectionName: string, id: string, data: any) => {
        try {
            await updateDoc(doc(db, collectionName, id), data);
        } catch (e) {
            console.error(`Error updating ${collectionName}:`, e);
            throw e;
        }
    };

    // --- DELETE HANDLERS ---
    const handleDeleteReport = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'reports', id));
            setReportList(prev => prev.filter(item => item.id !== id));
            toast.success("Report deleted.");
        } catch (e) { console.error(e); toast.error("Failed to delete."); }
    };

    const handleDeleteInspection = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'inspections', id));
            setInspectionList(prev => prev.filter(item => item.id !== id));
            toast.success("Inspection deleted.");
        } catch (e) { console.error(e); toast.error("Failed to delete."); }
    };

    const handleDeletePtw = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'ptws', id));
            setPtwList(prev => prev.filter(item => item.id !== id));
            toast.success("Permit deleted.");
        } catch (e) { console.error(e); toast.error("Failed to delete."); }
    };

    const handleDeletePlan = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'plans', id));
            setPlanList(prev => prev.filter(item => item.id !== id));
            toast.success("Plan deleted.");
        } catch (e) { console.error(e); toast.error("Failed to delete."); }
    };

    const handleDeleteRams = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'rams', id));
            setRamsList(prev => prev.filter(item => item.id !== id));
            toast.success("RAMS deleted.");
        } catch (e) { console.error(e); toast.error("Failed to delete."); }
    };

    const handleDeleteTbt = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'tbt_sessions', id));
            setTbtList(prev => prev.filter(item => item.id !== id));
            toast.success("TBT Session deleted.");
        } catch (e) { console.error(e); toast.error("Failed to delete."); }
    };

    // --- CREATE HANDLERS ---
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
        try { 
            await setDoc(doc(db, 'reports', newReport.id), newReport); 
            await notifyRole(activeOrg.id, 'HSE_MANAGER', `New ${newReport.type} reported by ${activeUser?.name}`, 'warning');
            toast.success("Report saved."); 
        } catch (e) {
            console.error(e);
            toast.error("Failed to save report.");
            setReportList(prev => prev.filter(r => r.id !== newReport.id));
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
            await notifyRole(activeOrg.id, 'SUPERVISOR', `New Inspection: ${newInspection.title}`, 'info');
            toast.success("Inspection created."); 
        } catch (e) {
            console.error(e);
            toast.error("Failed to create inspection.");
            setInspectionList(prev => prev.filter(i => i.id !== newInspection.id));
        }
    };

    const handleCreateChemical = async (data: any) => {
        const newChemical: Chemical = {
            ...data,
            id: `chem_${Date.now()}`,
            org_id: activeOrg.id,
            status: 'active',
            last_review: new Date().toISOString(),
        };
        setChemicalList(prev => [newChemical, ...prev]);
        try {
            await setDoc(doc(db, 'chemicals', newChemical.id), newChemical);
            toast.success("Chemical added to register.");
        } catch (e) {
            console.error(e);
            toast.error("Failed to add chemical.");
            setChemicalList(prev => prev.filter(c => c.id !== newChemical.id));
        }
    };

    const handleUpdateChemical = async (updated: Chemical) => {
        const previous = chemicalList.find(c => c.id === updated.id);
        setChemicalList(prev => prev.map(c => c.id === updated.id ? updated : c));
        try {
            await updateDoc(doc(db, 'chemicals', updated.id), updated as any);
            toast.success("Chemical updated.");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update chemical.");
            if (previous) setChemicalList(prev => prev.map(c => c.id === updated.id ? previous : c));
        }
    };

    const handleCreateBbsObservation = async (obs: BbsObservation) => {
        setBbsObservations(prev => [obs, ...prev]);
        try {
            await setDoc(doc(db, 'bbs_observations', obs.id), obs);
        } catch (e) {
            console.error(e);
            toast.error("Failed to save observation.");
            setBbsObservations(prev => prev.filter(o => o.id !== obs.id));
        }
    };

    const handleUpdateBbsObservation = async (updated: BbsObservation) => {
        const previous = bbsObservations.find(o => o.id === updated.id);
        setBbsObservations(prev => prev.map(o => o.id === updated.id ? updated : o));
        try {
            await updateDoc(doc(db, 'bbs_observations', updated.id), updated as any);
        } catch (e) {
            console.error(e);
            toast.error("Failed to update observation.");
            if (previous) setBbsObservations(prev => prev.map(o => o.id === updated.id ? previous : o));
        }
    };

    const handleCreateLegalComplianceItem = async (item: LegalComplianceItem) => {
        setLegalComplianceList(prev => [item, ...prev]);
        try {
            await setDoc(doc(db, 'legal_compliance_items', item.id), item);
        } catch (e) {
            console.error(e);
            toast.error("Failed to save compliance item.");
            setLegalComplianceList(prev => prev.filter(i => i.id !== item.id));
        }
    };

    const handleUpdateLegalComplianceItem = async (updated: LegalComplianceItem) => {
        const previous = legalComplianceList.find(i => i.id === updated.id);
        setLegalComplianceList(prev => prev.map(i => i.id === updated.id ? updated : i));
        try {
            await updateDoc(doc(db, 'legal_compliance_items', updated.id), updated as any);
        } catch (e) {
            console.error(e);
            toast.error("Failed to update compliance assessment.");
            if (previous) setLegalComplianceList(prev => prev.map(i => i.id === updated.id ? previous : i));
        }
    };

    const handleCreateWasteRecord = async (record: WasteRecord) => {
        setWasteRecordList(prev => [record, ...prev]);
        try {
            await setDoc(doc(db, 'waste_records', record.id), record);
        } catch (e) {
            console.error(e);
            toast.error("Failed to save waste record.");
            setWasteRecordList(prev => prev.filter(r => r.id !== record.id));
        }
    };

    const handleCreateHazard = async (data: Hazard) => {
        const record = { ...data, org_id: activeOrg.id };
        setHazardList(prev => [record, ...prev]);
        try { await setDoc(doc(db, 'hazards', record.id), record); }
        catch (e) { console.error(e); toast.error("Failed to save hazard."); setHazardList(prev => prev.filter(h => h.id !== record.id)); }
    };
    const handleUpdateHazard = async (data: Hazard) => {
        const previous = hazardList.find(h => h.id === data.id);
        setHazardList(prev => prev.map(h => h.id === data.id ? data : h));
        try { await updateDoc(doc(db, 'hazards', data.id), data as any); }
        catch (e) { console.error(e); toast.error("Failed to update hazard."); if (previous) setHazardList(prev => prev.map(h => h.id === data.id ? previous : h)); }
    };

    const handleCreateContractorCompany = async (data: ContractorCompany) => {
        const record = { ...data, org_id: activeOrg.id };
        setContractorCompanies(prev => [record, ...prev]);
        try { await setDoc(doc(db, 'contractor_companies', record.id), record); }
        catch (e) { console.error(e); toast.error("Failed to save contractor company."); setContractorCompanies(prev => prev.filter(c => c.id !== record.id)); }
    };
    const handleUpdateContractorCompany = async (data: ContractorCompany) => {
        const previous = contractorCompanies.find(c => c.id === data.id);
        setContractorCompanies(prev => prev.map(c => c.id === data.id ? data : c));
        try { await updateDoc(doc(db, 'contractor_companies', data.id), data as any); }
        catch (e) { console.error(e); toast.error("Failed to update contractor company."); if (previous) setContractorCompanies(prev => prev.map(c => c.id === data.id ? previous : c)); }
    };

    const handleCreateContractorWorker = async (data: ContractorWorker) => {
        const record = { ...data, org_id: activeOrg.id };
        setContractorWorkers(prev => [record, ...prev]);
        try { await setDoc(doc(db, 'contractor_workers', record.id), record); }
        catch (e) { console.error(e); toast.error("Failed to save contractor worker."); setContractorWorkers(prev => prev.filter(w => w.id !== record.id)); }
    };
    const handleUpdateContractorWorker = async (data: ContractorWorker) => {
        const previous = contractorWorkers.find(w => w.id === data.id);
        setContractorWorkers(prev => prev.map(w => w.id === data.id ? data : w));
        try { await updateDoc(doc(db, 'contractor_workers', data.id), data as any); }
        catch (e) { console.error(e); toast.error("Failed to update contractor worker."); if (previous) setContractorWorkers(prev => prev.map(w => w.id === data.id ? previous : w)); }
    };

    const handleCreatePpeItem = async (data: PpeItem) => {
        const record = { ...data, org_id: activeOrg.id };
        setPpeItems(prev => [record, ...prev]);
        try { await setDoc(doc(db, 'ppe_items', record.id), record); }
        catch (e) { console.error(e); toast.error("Failed to save PPE item."); setPpeItems(prev => prev.filter(i => i.id !== record.id)); }
    };
    const handleUpdatePpeItem = async (data: PpeItem) => {
        const previous = ppeItems.find(i => i.id === data.id);
        setPpeItems(prev => prev.map(i => i.id === data.id ? data : i));
        try { await updateDoc(doc(db, 'ppe_items', data.id), data as any); }
        catch (e) { console.error(e); toast.error("Failed to update PPE item."); if (previous) setPpeItems(prev => prev.map(i => i.id === data.id ? previous : i)); }
    };

    const handleCreatePpeAssignment = async (data: PpeAssignment) => {
        const record = { ...data, org_id: activeOrg.id };
        setPpeAssignments(prev => [record, ...prev]);
        try { await setDoc(doc(db, 'ppe_assignments', record.id), record); }
        catch (e) { console.error(e); toast.error("Failed to save PPE assignment."); setPpeAssignments(prev => prev.filter(a => a.id !== record.id)); }
    };
    const handleUpdatePpeAssignment = async (data: PpeAssignment) => {
        const previous = ppeAssignments.find(a => a.id === data.id);
        setPpeAssignments(prev => prev.map(a => a.id === data.id ? data : a));
        try { await updateDoc(doc(db, 'ppe_assignments', data.id), data as any); }
        catch (e) { console.error(e); toast.error("Failed to update PPE assignment."); if (previous) setPpeAssignments(prev => prev.map(a => a.id === data.id ? previous : a)); }
    };

    const handleCreateShiftLog = async (data: ShiftLog) => {
        const record = { ...data, org_id: activeOrg.id };
        setShiftLogs(prev => [record, ...prev]);
        try { await setDoc(doc(db, 'shift_logs', record.id), record); }
        catch (e) { console.error(e); toast.error("Failed to save shift log."); setShiftLogs(prev => prev.filter(s => s.id !== record.id)); }
    };

    const handleCreateFfdAssessment = async (data: FfdAssessment) => {
        const record = { ...data, org_id: activeOrg.id };
        setFfdAssessments(prev => [record, ...prev]);
        try { await setDoc(doc(db, 'ffd_assessments', record.id), record); }
        catch (e) { console.error(e); toast.error("Failed to save FFD assessment."); setFfdAssessments(prev => prev.filter(f => f.id !== record.id)); }
    };

    const handleCreateEnvReading = async (data: EnvReading) => {
        const record = { ...data, org_id: activeOrg.id };
        setEnvReadings(prev => [record, ...prev]);
        try { await setDoc(doc(db, 'env_readings', record.id), record); }
        catch (e) { console.error(e); toast.error("Failed to save environmental reading."); setEnvReadings(prev => prev.filter(r => r.id !== record.id)); }
    };

    const handleCreateSafetyMeeting = async (data: SafetyMeeting) => {
        const record = { ...data, org_id: activeOrg.id };
        setSafetyMeetings(prev => [record, ...prev]);
        try { await setDoc(doc(db, 'safety_meetings', record.id), record); }
        catch (e) { console.error(e); toast.error("Failed to save meeting."); setSafetyMeetings(prev => prev.filter(m => m.id !== record.id)); }
    };
    const handleUpdateSafetyMeeting = async (data: SafetyMeeting) => {
        const previous = safetyMeetings.find(m => m.id === data.id);
        setSafetyMeetings(prev => prev.map(m => m.id === data.id ? data : m));
        try { await updateDoc(doc(db, 'safety_meetings', data.id), data as any); }
        catch (e) { console.error(e); toast.error("Failed to update meeting."); if (previous) setSafetyMeetings(prev => prev.map(m => m.id === data.id ? previous : m)); }
    };

    const handleCreateEmergencyPlan = async (data: EmergencyPlan) => {
        const record = { ...data, org_id: activeOrg.id };
        setEmergencyPlans(prev => [record, ...prev]);
        try { await setDoc(doc(db, 'emergency_plans', record.id), record); }
        catch (e) { console.error(e); toast.error("Failed to save emergency plan."); setEmergencyPlans(prev => prev.filter(p => p.id !== record.id)); }
    };
    const handleUpdateEmergencyPlan = async (data: EmergencyPlan) => {
        const previous = emergencyPlans.find(p => p.id === data.id);
        setEmergencyPlans(prev => prev.map(p => p.id === data.id ? data : p));
        try { await updateDoc(doc(db, 'emergency_plans', data.id), data as any); }
        catch (e) { console.error(e); toast.error("Failed to update emergency plan."); if (previous) setEmergencyPlans(prev => prev.map(p => p.id === data.id ? previous : p)); }
    };

    const handleCreateEmergencyDrill = async (data: EmergencyDrill) => {
        const record = { ...data, org_id: activeOrg.id };
        setEmergencyDrills(prev => [record, ...prev]);
        try { await setDoc(doc(db, 'emergency_drills', record.id), record); }
        catch (e) { console.error(e); toast.error("Failed to save drill."); setEmergencyDrills(prev => prev.filter(d => d.id !== record.id)); }
    };
    const handleUpdateEmergencyDrill = async (data: EmergencyDrill) => {
        const previous = emergencyDrills.find(d => d.id === data.id);
        setEmergencyDrills(prev => prev.map(d => d.id === data.id ? data : d));
        try { await updateDoc(doc(db, 'emergency_drills', data.id), data as any); }
        catch (e) { console.error(e); toast.error("Failed to update drill."); if (previous) setEmergencyDrills(prev => prev.map(d => d.id === data.id ? previous : d)); }
    };

    const handleCreateControlledDocument = async (data: ControlledDocument) => {
        const record = { ...data, org_id: activeOrg.id };
        setControlledDocuments(prev => [record, ...prev]);
        try { await setDoc(doc(db, 'controlled_documents', record.id), record); }
        catch (e) { console.error(e); toast.error("Failed to save document."); setControlledDocuments(prev => prev.filter(d => d.id !== record.id)); }
    };
    const handleUpdateControlledDocument = async (data: ControlledDocument) => {
        const previous = controlledDocuments.find(d => d.id === data.id);
        setControlledDocuments(prev => prev.map(d => d.id === data.id ? data : d));
        try { await updateDoc(doc(db, 'controlled_documents', data.id), data as any); }
        catch (e) { console.error(e); toast.error("Failed to update document."); if (previous) setControlledDocuments(prev => prev.map(d => d.id === data.id ? previous : d)); }
    };

    const handleCreateDataRequest = async (data: DataRequest) => {
        const record = { ...data, org_id: activeOrg.id };
        setDataRequests(prev => [record, ...prev]);
        try { await setDoc(doc(db, 'dsar_requests', record.id), record); }
        catch (e) { console.error(e); toast.error("Failed to save request."); setDataRequests(prev => prev.filter(r => r.id !== record.id)); }
    };
    const handleUpdateDataRequest = async (data: DataRequest) => {
        const previous = dataRequests.find(r => r.id === data.id);
        setDataRequests(prev => prev.map(r => r.id === data.id ? data : r));
        try { await updateDoc(doc(db, 'dsar_requests', data.id), data as any); }
        catch (e) { console.error(e); toast.error("Failed to update request."); if (previous) setDataRequests(prev => prev.map(r => r.id === data.id ? previous : r)); }
    };

    const handleCreateRetentionPolicy = async (data: RetentionPolicy) => {
        const record = { ...data, org_id: activeOrg.id };
        setRetentionPolicies(prev => [record, ...prev]);
        try { await setDoc(doc(db, 'retention_policies', record.id), record); }
        catch (e) { console.error(e); toast.error("Failed to save policy."); setRetentionPolicies(prev => prev.filter(p => p.id !== record.id)); }
    };
    const handleUpdateRetentionPolicy = async (data: RetentionPolicy) => {
        const previous = retentionPolicies.find(p => p.id === data.id);
        setRetentionPolicies(prev => prev.map(p => p.id === data.id ? data : p));
        try { await updateDoc(doc(db, 'retention_policies', data.id), data as any); }
        catch (e) { console.error(e); toast.error("Failed to update policy."); if (previous) setRetentionPolicies(prev => prev.map(p => p.id === data.id ? previous : p)); }
    };

    const handleCreateProcessingActivity = async (data: ProcessingActivity) => {
        const record = { ...data, org_id: activeOrg.id };
        setProcessingActivities(prev => [record, ...prev]);
        try { await setDoc(doc(db, 'processing_activities', record.id), record); }
        catch (e) { console.error(e); toast.error("Failed to save activity."); setProcessingActivities(prev => prev.filter(a => a.id !== record.id)); }
    };
    const handleUpdateProcessingActivity = async (data: ProcessingActivity) => {
        const previous = processingActivities.find(a => a.id === data.id);
        setProcessingActivities(prev => prev.map(a => a.id === data.id ? data : a));
        try { await updateDoc(doc(db, 'processing_activities', data.id), data as any); }
        catch (e) { console.error(e); toast.error("Failed to update activity."); if (previous) setProcessingActivities(prev => prev.map(a => a.id === data.id ? previous : a)); }
    };

    const handleCreateDataBreach = async (data: DataBreach) => {
        const record = { ...data, org_id: activeOrg.id };
        setDataBreaches(prev => [record, ...prev]);
        try { await setDoc(doc(db, 'data_breaches', record.id), record); }
        catch (e) { console.error(e); toast.error("Failed to save breach record."); setDataBreaches(prev => prev.filter(b => b.id !== record.id)); }
    };
    const handleUpdateDataBreach = async (data: DataBreach) => {
        const previous = dataBreaches.find(b => b.id === data.id);
        setDataBreaches(prev => prev.map(b => b.id === data.id ? data : b));
        try { await updateDoc(doc(db, 'data_breaches', data.id), data as any); }
        catch (e) { console.error(e); toast.error("Failed to update breach record."); if (previous) setDataBreaches(prev => prev.map(b => b.id === data.id ? previous : b)); }
    };

    // Upsert: one requirement can be tracked, then re-edited, without the
    // caller needing to know whether a tracking record already exists yet.
    const handleUpdateComplianceTracking = async (data: Omit<ComplianceTracking, 'id' | 'org_id' | 'updated_at'> & { id?: string }) => {
        const id = data.id || `${activeOrg.id}_${data.requirement_id}`;
        const record: ComplianceTracking = { ...data, id, org_id: activeOrg.id, updated_at: new Date().toISOString() };
        const previous = complianceTracking.find(t => t.id === id);
        setComplianceTracking(prev => previous ? prev.map(t => t.id === id ? record : t) : [record, ...prev]);
        try { await setDoc(doc(db, 'compliance_tracking', id), record); }
        catch (e) {
            console.error(e);
            toast.error("Failed to update compliance tracking.");
            setComplianceTracking(prev => previous ? prev.map(t => t.id === id ? previous : t) : prev.filter(t => t.id !== id));
        }
    };

    const handleCreateRcaRecord = async (data: RcaRecord) => {
        const record = { ...data, org_id: activeOrg.id };
        setRcaRecords(prev => [record, ...prev]);
        try { await setDoc(doc(db, 'rca_records', record.id), record); }
        catch (e) { console.error(e); toast.error("Failed to save RCA record."); setRcaRecords(prev => prev.filter(r => r.id !== record.id)); }
    };

    const handleCreateSiteAccessLog = async (data: SiteAccessLog) => {
        const record = { ...data, org_id: activeOrg.id };
        setSiteAccessLogs(prev => [record, ...prev]);
        try { await setDoc(doc(db, 'site_access_logs', record.id), record); }
        catch (e) { console.error(e); toast.error("Failed to save access log entry."); setSiteAccessLogs(prev => prev.filter(l => l.id !== record.id)); }
    };
    const handleUpdateSiteAccessLog = async (data: SiteAccessLog) => {
        const previous = siteAccessLogs.find(l => l.id === data.id);
        setSiteAccessLogs(prev => prev.map(l => l.id === data.id ? data : l));
        try { await updateDoc(doc(db, 'site_access_logs', data.id), data as any); }
        catch (e) { console.error(e); toast.error("Failed to update access log entry."); if (previous) setSiteAccessLogs(prev => prev.map(l => l.id === data.id ? previous : l)); }
    };

    const handleCreateCorrectiveAction = async (data: CorrectiveAction) => {
        const record = { ...data, org_id: activeOrg.id };
        setCorrectiveActions(prev => [record, ...prev]);
        try { await setDoc(doc(db, 'corrective_actions', record.id), record); }
        catch (e) { console.error(e); toast.error("Failed to save corrective action."); setCorrectiveActions(prev => prev.filter(c => c.id !== record.id)); }
    };
    const handleUpdateCorrectiveAction = async (data: CorrectiveAction) => {
        const previous = correctiveActions.find(c => c.id === data.id);
        setCorrectiveActions(prev => prev.map(c => c.id === data.id ? data : c));
        try { await updateDoc(doc(db, 'corrective_actions', data.id), data as any); }
        catch (e) { console.error(e); toast.error("Failed to update corrective action."); if (previous) setCorrectiveActions(prev => prev.map(c => c.id === data.id ? previous : c)); }
    };

    // Upsert keyed by project_id + log_date, matching the component's
    // existing one-entry-per-project-per-day semantics exactly - re-logging
    // the same day/project naturally overwrites via setDoc rather than
    // creating a duplicate.
    const handleSaveManHoursEntry = async (data: Omit<ManHoursEntry, 'id' | 'org_id'> & { id?: string }) => {
        const id = data.id || `${data.project_id}_${data.log_date}`;
        const record: ManHoursEntry = { ...data, id, org_id: activeOrg.id };
        const previous = manHoursEntries.find(e => e.id === id);
        setManHoursEntries(prev => previous ? prev.map(e => e.id === id ? record : e) : [record, ...prev]);
        try { await setDoc(doc(db, 'man_hours_entries', id), record); }
        catch (e) {
            console.error(e);
            toast.error("Failed to save man-hours entry.");
            setManHoursEntries(prev => previous ? prev.map(e => e.id === id ? previous : e) : prev.filter(e => e.id !== id));
        }
    };

    const handleCreateAudit = async (data: Audit) => {
        const record = { ...data, org_id: activeOrg.id };
        setAudits(prev => [record, ...prev]);
        try { await setDoc(doc(db, 'audits', record.id), record); }
        catch (e) { console.error(e); toast.error("Failed to save audit."); setAudits(prev => prev.filter(a => a.id !== record.id)); }
    };
    const handleUpdateAudit = async (data: Audit) => {
        const previous = audits.find(a => a.id === data.id);
        setAudits(prev => prev.map(a => a.id === data.id ? data : a));
        try { await updateDoc(doc(db, 'audits', data.id), data as any); }
        catch (e) { console.error(e); toast.error("Failed to update audit."); if (previous) setAudits(prev => prev.map(a => a.id === data.id ? previous : a)); }
    };

    const handleCreateStandaloneAction = async (data: any) => {
        const newAction = {
            id: `act_${Date.now()}`,
            org_id: activeOrg.id,
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
            if (data.owner_id) {
                await sendNotification(data.owner_id, `You have been assigned a new action: ${data.action}`, 'info');
            }
            toast.success("Action created."); 
        } catch (e) {
            console.error(e);
            toast.error("Failed to create action.");
            setStandaloneActions(prev => prev.filter(a => a.id !== newAction.id));
        }
    };
    
    const handleCreateProject = async (data: any) => {
        try {
            const projectData = {
                ...data,
                org_id: activeOrg.id,
                status: 'active',
                created_at: new Date().toISOString()
            };
            const docRef = await addDoc(collection(db, 'projects'), projectData);
            const newProj = { id: docRef.id, ...projectData };
            setProjects(prev => [...prev, newProj]);
            toast.success("Project created.");
        } catch (e) { 
            console.error(e);
            toast.error("Failed to create project");
        }
    };

    const handleUpdateProject = async (projectId: string, updates: Partial<Project>) => {
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p));
        try {
            await updateDB('projects', projectId, updates);
            toast.success("Project updated.");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update project");
        }
    };

    const handleCreatePtw = async (data: any) => {
        // The Guided Permit wizard doesn't collect a dedicated "title" field, so
        // without this fallback newPtw.title is undefined and the PTW list crashes
        // as soon as it's searched (p.title.toLowerCase() on undefined).
        const newPtw = { ...data, title: data.title || data.description || 'Untitled Permit', org_id: activeOrg.id, id: `ptw_${Date.now()}`, status: 'DRAFT' };
        setPtwList(prev => [newPtw, ...prev]);
        try { await setDoc(doc(db, 'ptws', newPtw.id), newPtw); toast.success("Permit created."); } catch (e) { console.error(e); toast.error("Failed to create permit."); setPtwList(prev => prev.filter(p => p.id !== newPtw.id)); }
    };

    const handleCreateChecklistTemplate = async (data: any) => {
        const newTemplate = { ...data, id: `ct_${Date.now()}`, org_id: activeOrg.id };
        setChecklistTemplates(prev => [...prev, newTemplate]);
        try { await setDoc(doc(db, 'checklist_templates', newTemplate.id), newTemplate); toast.success("Template created."); } catch (e) { console.error(e); toast.error("Failed to create template."); setChecklistTemplates(prev => prev.filter(t => t.id !== newTemplate.id)); }
    };

    const handleStatusChange = async (id: string, status: any) => {
        const previous = reportList.find(r => r.id === id);
        setReportList(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        try {
            await updateDB('reports', id, { status });
        } catch (e) {
            toast.error("Failed to update status.");
            if (previous) setReportList(prev => prev.map(r => r.id === id ? previous : r));
        }
    };

    const handleCapaActionChange = async (reportId: string, capaIndex: number, newStatus: CapaAction['status']) => {
        const report = reportList.find(r => r.id === reportId);
        if (report) {
            const previousCapa = report.capa;
            const newCapa = [...report.capa];
            if (newCapa[capaIndex]) {
                newCapa[capaIndex] = { ...newCapa[capaIndex], status: newStatus };
                setReportList(prev => prev.map(r => r.id === reportId ? { ...r, capa: newCapa } : r));
                try {
                    await updateDB('reports', reportId, { capa: newCapa });
                } catch (e) {
                    toast.error("Failed to update CAPA status.");
                    setReportList(prev => prev.map(r => r.id === reportId ? { ...r, capa: previousCapa } : r));
                }
            }
        }
    };

    const handleAddCapaAction = async (reportId: string, action: Omit<CapaAction, 'status'>) => {
        const report = reportList.find(r => r.id === reportId);
        if (report) {
            const previousCapa = report.capa;
            const newCapaAction: CapaAction = { ...action, status: 'Open' };
            const newCapa = [...(report.capa || []), newCapaAction];
            setReportList(prev => prev.map(r => r.id === reportId ? { ...r, capa: newCapa } : r));
            try {
                await updateDB('reports', reportId, { capa: newCapa });
                toast.success("CAPA action added.");
            } catch (e) {
                toast.error("Failed to add CAPA action.");
                setReportList(prev => prev.map(r => r.id === reportId ? { ...r, capa: previousCapa } : r));
            }
        }
    };

    const handleUpdateActionStatus = async (origin: any, newStatus: any) => {
        if (origin.type === 'report-capa') {
            await handleCapaActionChange(origin.parentId, parseInt(origin.itemId), newStatus);
        } else if (origin.type === 'standalone') {
             const previous = standaloneActions.find(a => a.id === origin.parentId);
             setStandaloneActions(prev => prev.map(a => a.id === origin.parentId ? { ...a, status: newStatus } : a));
             try {
                 await updateDB('actions', origin.parentId, { status: newStatus });
             } catch (e) {
                 toast.error("Failed to update action status.");
                 if (previous) setStandaloneActions(prev => prev.map(a => a.id === origin.parentId ? previous : a));
             }
        }
    };

    const handleUpdateInspection = async (inspection: any, action?: any) => {
        let updatedInspection = { ...inspection };
        if (action === 'submit') updatedInspection.status = 'Submitted';
        if (action === 'approve') updatedInspection.status = 'Approved';
        if (action === 'close') updatedInspection.status = 'Closed';
        if (action === 'request_revision') updatedInspection.status = 'Ongoing';

        const previous = inspectionList.find(x => x.id === inspection.id);
        setInspectionList(prev => prev.map(x => x.id === inspection.id ? updatedInspection : x));
        try {
            await updateDB('inspections', inspection.id, updatedInspection);
            toast.success("Inspection updated.");
        } catch (e) {
            toast.error("Failed to update inspection.");
            if (previous) setInspectionList(prev => prev.map(x => x.id === inspection.id ? previous : x));
        }
    };

    const handleUpdatePtw = async (ptw: any, action?: any) => {
        let updatedPtw = { ...ptw };
        if (action === 'submit') updatedPtw.status = 'SUBMITTED';
        if (action === 'approve_proponent') updatedPtw.status = 'APPROVAL';
        if (action === 'approve_hse') updatedPtw.status = 'ACTIVE';
        if (action === 'reject') updatedPtw.status = 'DRAFT';
        if (action === 'suspend') updatedPtw.status = 'HOLD';
        if (action === 'resume') updatedPtw.status = 'ACTIVE';
        if (action === 'close') updatedPtw.status = 'CLOSED';

        if (action === 'submit') {
            await notifyRole(activeOrg.id, 'SUPERVISOR', `PTW #${ptw.payload.permit_no || ptw.id} submitted for review`, 'info');
        } else if (action === 'approve_hse') {
            await sendNotification(ptw.payload.creator_id, `Your PTW #${ptw.payload.permit_no || ptw.id} is ACTIVE`, 'success');
        } else if (action === 'reject') {
            await sendNotification(ptw.payload.creator_id, `Your PTW #${ptw.payload.permit_no || ptw.id} was REJECTED`, 'error');
        }

        const previous = ptwList.find(p => p.id === ptw.id);
        setPtwList(prev => prev.map(p => p.id === ptw.id ? updatedPtw : p));
        try {
            await updateDB('ptws', ptw.id, updatedPtw);
            toast.success("Permit updated.");
        } catch (e) {
            toast.error("Failed to update permit.");
            if (previous) setPtwList(prev => prev.map(p => p.id === ptw.id ? previous : p));
        }
    };

    const handleUpdatePlan = async (plan: any) => {
        const previous = planList.find(p => p.id === plan.id);
        setPlanList(prev => prev.map(p => p.id === plan.id ? plan : p));
        try {
            await updateDB('plans', plan.id, plan);
            toast.success("Plan saved.");
        } catch (e) {
            toast.error("Failed to save plan.");
            if (previous) setPlanList(prev => prev.map(p => p.id === plan.id ? previous : p));
        }
    };

    const handlePlanStatusChange = async (id: string, status: any) => {
        const previous = planList.find(p => p.id === id);
        setPlanList(prev => prev.map(p => p.id === id ? { ...p, status } : p));
        try {
            await updateDB('plans', id, { status });
        } catch (e) {
            toast.error("Failed to update plan status.");
            if (previous) setPlanList(prev => prev.map(p => p.id === id ? previous : p));
        }
    };

    const handleUpdateRams = async (rams: any) => {
        const previous = ramsList.find(r => r.id === rams.id);
        setRamsList(prev => prev.map(r => r.id === rams.id ? rams : r));
        try {
            await updateDB('rams', rams.id, rams);
            toast.success("RAMS saved.");
        } catch (e) {
            toast.error("Failed to save RAMS.");
            if (previous) setRamsList(prev => prev.map(r => r.id === rams.id ? previous : r));
        }
    };

    const handleRamsStatusChange = async (id: string, status: any) => {
        const previous = ramsList.find(r => r.id === id);
        setRamsList(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        try {
            await updateDB('rams', id, { status });
        } catch (e) {
            toast.error("Failed to update RAMS status.");
            if (previous) setRamsList(prev => prev.map(r => r.id === id ? previous : r));
        }
    };

    const handleUpdateTbt = async (tbt: any) => {
        const previous = tbtList.find(t => t.id === tbt.id);
        setTbtList(prev => prev.map(t => t.id === tbt.id ? tbt : t));
        try {
            await updateDB('tbt_sessions', tbt.id, tbt);
            toast.success("TBT updated.");
        } catch (e) {
            toast.error("Failed to update TBT.");
            if (previous) setTbtList(prev => prev.map(t => t.id === tbt.id ? previous : t));
        }
    };

    const handleAcknowledgeReport = async (id: string) => {
        const report = reportList.find(r => r.id === id);
        if (report) {
            const previousAcks = report.acknowledgements;
            const newAcks = [...report.acknowledgements, { user_id: activeUser?.id || '', acknowledged_at: new Date().toISOString() }];
            setReportList(prev => prev.map(r => r.id === id ? { ...r, acknowledgements: newAcks } : r));
            try {
                await updateDB('reports', id, { acknowledgements: newAcks });
            } catch (e) {
                toast.error("Failed to record acknowledgement.");
                setReportList(prev => prev.map(r => r.id === id ? { ...r, acknowledgements: previousAcks } : r));
            }
        }
    };

    const handleCreateOrUpdateCourse = async (c: any) => {
        const isNew = !trainingCourseList.some(x => x.id === c.id);
        const courseId = c.id || `course_${Date.now()}`;
        const course = { ...c, org_id: activeOrg.id, id: courseId };
        const previous = trainingCourseList;
        setTrainingCourseList(prev => [...prev.filter(x => x.id !== courseId), course]);
        try {
            await setDoc(doc(db, 'training_courses', courseId), course);
            toast.success(isNew ? "Course created." : "Course updated.");
        } catch (e) {
            console.error('Failed to save course:', e);
            toast.error("Failed to save course.");
            setTrainingCourseList(previous);
        }
    };

    const handleScheduleSession = async (d: any) => {
        const newSession = { ...d, org_id: activeOrg.id, id: `ts_${Date.now()}`, roster: [] } as any;
        setTrainingSessionList(prev => [newSession, ...prev]);
        try {
            await setDoc(doc(db, 'training_sessions', newSession.id), newSession);
            toast.success("Session scheduled.");
        } catch (e) {
            console.error('Failed to schedule session:', e);
            toast.error("Failed to schedule session.");
            setTrainingSessionList(prev => prev.filter(s => s.id !== newSession.id));
        }
    };

    const handleCloseSession = async (id: string, att: any) => {
        const previous = trainingSessionList.find(s => s.id === id);
        setTrainingSessionList(prev => prev.map(s => s.id === id ? { ...s, status: 'completed', attendance: att } : s));
        try {
            await updateDoc(doc(db, 'training_sessions', id), { status: 'completed', attendance: att });
            toast.success("Session closed.");
        } catch (e) {
            console.error('Failed to close session:', e);
            toast.error("Failed to close session.");
            if (previous) setTrainingSessionList(prev => prev.map(s => s.id === id ? previous : s));
        }
    };

    const handleCreatePlan = async (d: any) => {
        const newPlan: any = {
            id: `plan_${Date.now()}`,
            org_id: activeOrg.id,
            project_id: d.project_id,
            type: d.type,
            title: d.title,
            version: 'v1.0',
            status: 'draft',
            people: {
                prepared_by: {
                    name: activeUser?.name || 'Unknown',
                    email: activeUser?.email || '',
                    signed_at: new Date().toISOString()
                }
            },
            dates: {
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                next_review_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            },
            content: {
                body_json: d.sections || [], 
                attachments: []
            },
            meta: { tags: [], change_note: 'Initial creation' },
            audit_trail: []
        };
        
        setPlanList(prev => [newPlan, ...prev]);
        try {
            await setDoc(doc(db, 'plans', newPlan.id), newPlan);
            toast.success("Plan created successfully.");
        } catch(e) {
            console.error('Failed to save plan:', e);
            toast.error("Failed to save plan.");
            setPlanList(prev => prev.filter(p => p.id !== newPlan.id));
        }
    };

    const handleCreateRams = async (d: any) => {
        const newRams: any = {
            id: `rams_${Date.now()}`,
            org_id: activeOrg.id,
            project_id: d.project_id,
            activity: d.activity,
            location: d.location,
            status: 'draft',
            version: 'v1.0',
            prepared_by: {
                name: activeUser?.name || 'Unknown',
                email: activeUser?.email || '',
                role: activeUser?.role || 'User',
                signed_at: new Date().toISOString()
            },
            times: {
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                valid_from: new Date().toISOString(),
                valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            },
            method_statement: d.aiContent ? {
                overview: d.aiContent.overview || '',
                competence: d.aiContent.competence || '',
                sequence_of_operations: d.aiContent.sequence_of_operations || [],
                emergency_arrangements: d.aiContent.emergency_arrangements || ''
            } : { overview: '', competence: '', sequence_of_operations: [], emergency_arrangements: '' },
            overall_risk_before: 0,
            overall_risk_after: 0,
            attachments: [],
            linked_ptw_types: [],
            audit_log: []
        };

        setRamsList(prev => [newRams, ...prev]);
        try {
            await setDoc(doc(db, 'rams', newRams.id), newRams);
            toast.success("RAMS created successfully.");
        } catch(e) {
            console.error('Failed to save RAMS:', e);
            toast.error("Failed to save RAMS.");
            setRamsList(prev => prev.filter(r => r.id !== newRams.id));
        }
    };

    const handleCreateTbt = async (d: any) => {
        const newTbt = { ...d, org_id: activeOrg.id, id: `tbt_${Date.now()}`, attendees: [] } as any;
        setTbtList(prev => [newTbt, ...prev]);
        try {
            await setDoc(doc(db, 'tbt_sessions', newTbt.id), newTbt);
            toast.success("Toolbox Talk saved.");
        } catch (e) {
            console.error('Failed to save TBT:', e);
            toast.error("Failed to save Toolbox Talk.");
            setTbtList(prev => prev.filter(t => t.id !== newTbt.id));
        }
    };

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

    const value = {
        isLoading,
        projects, reportList, inspectionList, checklistRunList, planList, ramsList, tbtList, 
        trainingCourseList, trainingRecordList, trainingSessionList, notifications, signs, checklistTemplates, ptwList,
        actionItems, chemicalList, bbsObservations, legalComplianceList, wasteRecordList,
        hazardList, contractorCompanies, contractorWorkers, ppeItems, ppeAssignments, shiftLogs, ffdAssessments,
        envReadings, safetyMeetings, emergencyPlans, emergencyDrills, controlledDocuments, dataRequests, retentionPolicies,
        processingActivities, dataBreaches, complianceTracking, rcaRecords, siteAccessLogs,
        correctiveActions, manHoursEntries, audits,
        setInspectionList, setChecklistRunList, setPtwList,
        handleCreateProject, handleUpdateProject, handleCreateReport, handleStatusChange, handleCapaActionChange, handleAddCapaAction, handleAcknowledgeReport,
        handleUpdateInspection, handleCreatePtw, handleUpdatePtw, handleCreatePlan, handleUpdatePlan, handlePlanStatusChange,
        handleCreateRams, handleUpdateRams, handleRamsStatusChange, handleCreateTbt, handleUpdateTbt,
        handleCreateOrUpdateCourse, handleScheduleSession, handleCloseSession,
        handleUpdateActionStatus, handleCreateInspection, handleCreateStandaloneAction,
        handleCreateChecklistTemplate, handleCreateChemical, handleUpdateChemical, handleCreateBbsObservation, handleUpdateBbsObservation,
        handleCreateLegalComplianceItem, handleUpdateLegalComplianceItem, handleCreateWasteRecord,
        handleCreateHazard, handleUpdateHazard, handleCreateContractorCompany, handleUpdateContractorCompany,
        handleCreateContractorWorker, handleUpdateContractorWorker, handleCreatePpeItem, handleUpdatePpeItem,
        handleCreatePpeAssignment, handleUpdatePpeAssignment, handleCreateShiftLog, handleCreateFfdAssessment,
        handleCreateEnvReading, handleCreateSafetyMeeting, handleUpdateSafetyMeeting, handleCreateEmergencyPlan,
        handleCreateEmergencyDrill, handleUpdateEmergencyDrill,
        handleUpdateEmergencyPlan, handleCreateControlledDocument, handleUpdateControlledDocument,
        handleCreateDataRequest, handleUpdateDataRequest, handleCreateRetentionPolicy, handleUpdateRetentionPolicy,
        handleCreateProcessingActivity, handleUpdateProcessingActivity, handleCreateDataBreach, handleUpdateDataBreach,
        handleUpdateComplianceTracking, handleCreateRcaRecord, handleCreateSiteAccessLog, handleUpdateSiteAccessLog,
        handleCreateCorrectiveAction, handleUpdateCorrectiveAction, handleSaveManHoursEntry, handleCreateAudit, handleUpdateAudit,
        handleDeleteReport, handleDeleteInspection, handleDeletePtw, handleDeletePlan, handleDeleteRams, handleDeleteTbt
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