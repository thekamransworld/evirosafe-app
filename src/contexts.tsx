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
  impersonatingAdmin: User | null;
  impersonateUser: (userId: string) => void;
  stopImpersonating: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
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

  // --- CRITICAL FIX: ROBUST USER RESOLUTION ---
  const activeUser = useMemo(() => {
    // 1. If we are impersonating, use that
    if (impersonatingAdmin) return impersonatingAdmin;

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
  }, [activeUserId, usersList, currentUser, impersonatingAdmin, activeOrg.id]);

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
    setImpersonatingAdmin(null);
  };

  const impersonateUser = (userId: string) => {
    // Store current admin before switching
    // Note: In a real app, you'd store this in a separate state variable
    // For now, we assume the current activeUser is the admin
    if (activeUser && activeUser.role === 'ADMIN') {
        // We need to find the user we want to be
        const targetUser = usersList.find(u => u.id === userId);
        if (targetUser) {
            setImpersonatingAdmin(targetUser); // Set the target as the active view
        }
    }
  };

  const stopImpersonating = () => {
    setImpersonatingAdmin(null);
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
        (previous.role !== updatedUser.role || previous.org_id !== updatedUser.org_id)
      ) {
        await setDoc(doc(db, 'users_by_uid', (updatedUser as any).auth_uid), {
          docId: updatedUser.id,
          org_id: updatedUser.org_id,
          role: updatedUser.role,
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
    } catch (e) { console.error(e); }
  };

  const handleInviteUser = async (userData: { org_id?: string; name: string; email: string; role: User['role']; project_id?: string; department?: string }) => {
    const newUserId = `user_${Date.now()}`;
    const newUser: User = {
      id: newUserId,
      org_id: userData.org_id || activeOrg?.id || '',
      email: userData.email,
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

    useEffect(() => {
      if (!currentUser) {
          setIsLoading(false);
          return;
      }

      const fetchData = async () => {
        try {
          // Resolve this user's org_id BEFORE fetching anything else, so every query below
          // can be scoped to it. Previously every fetchCol pulled entire collections with
          // no filter at all — every organization's data, into every browser, every load.
          const resolveMyOrgId = async (): Promise<string | null> => {
            // Tier 1: the pointer doc — fast, reliable, what new activations create.
            try {
              const ptrSnap = await getDoc(doc(db, 'users_by_uid', currentUser.uid));
              if (ptrSnap.exists()) {
                const org = (ptrSnap.data() as any).org_id;
                if (org) return org;
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
                      });
                    } catch (e) { console.error('Pointer backfill failed:', e); }
                    return data.org_id;
                  }
                }
              } catch (e) { console.error('Email fallback lookup failed:', e); }
            }
            return null;
          };

          const myOrgId = await resolveMyOrgId();

          const fetchCol = async (name: string, setter: any, initialData: any[] = []) => {
            if (!myOrgId) { setter(initialData); return; }
            const snap = await getDocs(query(collection(db, name), where('org_id', '==', myOrgId)));
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
        } catch (e) { console.error(e); }
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
            if (data.owner_id) {
                await sendNotification(data.owner_id, `You have been assigned a new action: ${data.action}`, 'info');
            }
            toast.success("Action created."); 
        } catch (e) { console.error(e); }
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
        const newPtw = { ...data, title: data.title || data.description || 'Untitled Permit', id: `ptw_${Date.now()}`, status: 'DRAFT' };
        setPtwList(prev => [newPtw, ...prev]);
        try { await setDoc(doc(db, 'ptws', newPtw.id), newPtw); toast.success("Permit created."); } catch (e) { console.error(e); }
    };

    const handleCreateChecklistTemplate = async (data: any) => {
        const newTemplate = { ...data, id: `ct_${Date.now()}`, org_id: activeOrg.id };
        setChecklistTemplates(prev => [...prev, newTemplate]);
        try { await setDoc(doc(db, 'checklist_templates', newTemplate.id), newTemplate); toast.success("Template created."); } catch (e) { console.error(e); }
    };

    const handleStatusChange = (id: string, status: any) => {
        setReportList(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        updateDB('reports', id, { status });
    };

    const handleCapaActionChange = (reportId: string, capaIndex: number, newStatus: CapaAction['status']) => {
        const report = reportList.find(r => r.id === reportId);
        if (report) {
            const newCapa = [...report.capa];
            if (newCapa[capaIndex]) {
                newCapa[capaIndex] = { ...newCapa[capaIndex], status: newStatus };
                setReportList(prev => prev.map(r => r.id === reportId ? { ...r, capa: newCapa } : r));
                updateDB('reports', reportId, { capa: newCapa });
            }
        }
    };

    const handleAddCapaAction = (reportId: string, action: Omit<CapaAction, 'status'>) => {
        const report = reportList.find(r => r.id === reportId);
        if (report) {
            const newCapaAction: CapaAction = { ...action, status: 'Open' };
            const newCapa = [...(report.capa || []), newCapaAction];
            setReportList(prev => prev.map(r => r.id === reportId ? { ...r, capa: newCapa } : r));
            updateDB('reports', reportId, { capa: newCapa });
            toast.success("CAPA action added.");
        }
    };

    const handleUpdateActionStatus = (origin: any, newStatus: any) => {
        if (origin.type === 'report-capa') {
            handleCapaActionChange(origin.parentId, parseInt(origin.itemId), newStatus);
        } else if (origin.type === 'standalone') {
             setStandaloneActions(prev => prev.map(a => a.id === origin.parentId ? { ...a, status: newStatus } : a));
             updateDB('actions', origin.parentId, { status: newStatus });
        }
    };

    const handleUpdateInspection = (inspection: any, action?: any) => {
        let updatedInspection = { ...inspection };
        if (action === 'submit') updatedInspection.status = 'Submitted';
        if (action === 'approve') updatedInspection.status = 'Approved';
        if (action === 'close') updatedInspection.status = 'Closed';
        if (action === 'request_revision') updatedInspection.status = 'Ongoing';

        setInspectionList(prev => prev.map(x => x.id === inspection.id ? updatedInspection : x));
        updateDB('inspections', inspection.id, updatedInspection);
        toast.success("Inspection updated.");
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

        setPtwList(prev => prev.map(p => p.id === ptw.id ? updatedPtw : p));
        updateDB('ptws', ptw.id, updatedPtw);
        toast.success("Permit updated.");
    };

    const handleUpdatePlan = (plan: any) => {
        setPlanList(prev => prev.map(p => p.id === plan.id ? plan : p));
        updateDB('plans', plan.id, plan);
        toast.success("Plan saved.");
    };

    const handlePlanStatusChange = (id: string, status: any) => {
        setPlanList(prev => prev.map(p => p.id === id ? { ...p, status } : p));
        updateDB('plans', id, { status });
    };

    const handleUpdateRams = (rams: any) => {
        setRamsList(prev => prev.map(r => r.id === rams.id ? rams : r));
        updateDB('rams', rams.id, rams);
        toast.success("RAMS saved.");
    };

    const handleRamsStatusChange = (id: string, status: any) => {
        setRamsList(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        updateDB('rams', id, { status });
    };

    const handleUpdateTbt = (tbt: any) => {
        setTbtList(prev => prev.map(t => t.id === tbt.id ? tbt : t));
        updateDB('tbt_sessions', tbt.id, tbt);
        toast.success("TBT updated.");
    };

    const handleAcknowledgeReport = (id: string) => {
        const report = reportList.find(r => r.id === id);
        if (report) {
            const newAcks = [...report.acknowledgements, { user_id: activeUser?.id || '', acknowledged_at: new Date().toISOString() }];
            setReportList(prev => prev.map(r => r.id === id ? { ...r, acknowledgements: newAcks } : r));
            updateDB('reports', id, { acknowledgements: newAcks });
        }
    };

    const handleCreateOrUpdateCourse = (c: any) => setTrainingCourseList(prev => [...prev.filter(x => x.id !== c.id), c]);
    const handleScheduleSession = (d: any) => setTrainingSessionList(prev => [{ ...d, id: `ts_${Date.now()}`, roster: [] } as any, ...prev]);
    const handleCloseSession = (id: string, att: any) => setTrainingSessionList(prev => prev.map(s => s.id === id ? { ...s, status: 'completed', attendance: att } : s));

    const handleCreatePlan = (d: any) => {
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
            setDoc(doc(db, 'plans', newPlan.id), newPlan);
            toast.success("Plan created successfully.");
        } catch(e) { console.error(e); }
    };

    const handleCreateRams = (d: any) => {
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
            setDoc(doc(db, 'rams', newRams.id), newRams);
            toast.success("RAMS created successfully.");
        } catch(e) { console.error(e); }
    };

    const handleCreateTbt = (d: any) => setTbtList(prev => [{ ...d, id: `tbt_${Date.now()}`, attendees: [] } as any, ...prev]);

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
        actionItems,
        setInspectionList, setChecklistRunList, setPtwList,
        handleCreateProject, handleUpdateProject, handleCreateReport, handleStatusChange, handleCapaActionChange, handleAddCapaAction, handleAcknowledgeReport,
        handleUpdateInspection, handleCreatePtw, handleUpdatePtw, handleCreatePlan, handleUpdatePlan, handlePlanStatusChange,
        handleCreateRams, handleUpdateRams, handleRamsStatusChange, handleCreateTbt, handleUpdateTbt,
        handleCreateOrUpdateCourse, handleScheduleSession, handleCloseSession,
        handleUpdateActionStatus, handleCreateInspection, handleCreateStandaloneAction,
        handleCreateChecklistTemplate,
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