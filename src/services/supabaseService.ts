
import type { Project, Report, Inspection, ChecklistRun, Plan, Rams, TbtSession, TrainingCourse, TrainingRecord, TrainingSession, Notification, Ptw, Sign, ChecklistTemplate } from '../types';
import { 
    projects as initialProjects, 
    reports as initialReports, 
    inspections as initialInspections, 
    checklistRuns as initialChecklistRuns, 
    plans as initialPlans, 
    rams as initialRams, 
    tbtSessions as initialTbtSessions, 
    trainingCourses as initialTrainingCourses, 
    trainingRecords as initialTrainingRecords, 
    trainingSessions as initialTrainingSessions, 
    notifications as initialNotifications, 
    ptws as initialPtws,
    signs as initialSigns,
    checklistTemplates as initialChecklistTemplates
} from '../data';

// --- API Wrapper ---
// In a real app, this would come from an auth context after login.
const FAKE_AUTH_TOKEN = 'fake-jwt-token-for-demonstration';
const API_BASE_URL = '/api'; // Placeholder for the real backend URL

const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FAKE_AUTH_TOKEN}`,
        ...options.headers,
    };
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
    }
    return response.json();
};


// --- MOCK DATABASE (localStorage for Projects) ---
const DB_KEY = 'evirosafe_db';

const getDb = () => {
    try {
        const db = localStorage.getItem(DB_KEY);
        if (db) return JSON.parse(db);
    } catch (error) {
        console.error("Error reading from localStorage", error);
    }
    const initialDb = { projects: initialProjects };
    localStorage.setItem(DB_KEY, JSON.stringify(initialDb));
    return initialDb;
};

const saveDb = (db: any) => {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (error) {
        console.error("Error writing to localStorage", error);
    }
};


// --- API FUNCTIONS ---
// Each function now demonstrates how a real API call would be made,
// with a fallback to the mock data to keep the demo app functional.

export const getProjects = async (): Promise<Project[]> => {
    try {
        return await apiFetch('/projects');
    } catch (error) {
        // console.debug("Offline mode: using mock data for getProjects.");
        const db = getDb();
        return db.projects || [];
    }
};

export const createProject = async (projectData: Omit<Project, 'id'>): Promise<Project> => {
    try {
        return await apiFetch('/projects', {
            method: 'POST',
            body: JSON.stringify(projectData),
        });
    } catch (error) {
        // console.debug("Offline mode: using mock implementation for createProject.");
        const db = getDb();
        const newProject: Project = { ...projectData, id: `proj_${Date.now()}` };
        db.projects.push(newProject);
        saveDb(db);
        return newProject;
    }
};

export const getReports = async (): Promise<Report[]> => {
    try {
        return await apiFetch('/reports');
    } catch (error) {
        // console.debug("Offline mode: using mock data for getReports.");
        return initialReports;
    }
};

export const getPtws = async (): Promise<Ptw[]> => {
    try {
        return await apiFetch('/ptws');
    } catch (error) {
        // console.debug("Offline mode: using mock data for getPtws.");
        return initialPtws;
    }
};

export const getInspections = async (): Promise<Inspection[]> => {
    try {
        return await apiFetch('/inspections');
    } catch (error) {
        // console.debug("Offline mode: using mock data for getInspections.");
        return initialInspections;
    }
};

export const getChecklistRuns = async (): Promise<ChecklistRun[]> => {
    try {
        return await apiFetch('/checklist-runs');
    } catch (error) {
        // console.debug("Offline mode: using mock data for getChecklistRuns.");
        return initialChecklistRuns;
    }
};

export const getPlans = async (): Promise<Plan[]> => {
    try {
        return await apiFetch('/plans');
    } catch (error) {
        // console.debug("Offline mode: using mock data for getPlans.");
        return initialPlans;
    }
};

export const getRams = async (): Promise<Rams[]> => {
    try {
        return await apiFetch('/rams');
    } catch (error) {
        // console.debug("Offline mode: using mock data for getRams.");
        return initialRams;
    }
};

export const getTbtSessions = async (): Promise<TbtSession[]> => {
    try {
        return await apiFetch('/tbt-sessions');
    } catch (error) {
        // console.debug("Offline mode: using mock data for getTbtSessions.");
        return initialTbtSessions;
    }
};

export const getTrainingCourses = async (): Promise<TrainingCourse[]> => {
    try {
        return await apiFetch('/training-courses');
    } catch (error) {
        // console.debug("Offline mode: using mock data for getTrainingCourses.");
        return initialTrainingCourses;
    }
};

export const getTrainingRecords = async (): Promise<TrainingRecord[]> => {
    try {
        return await apiFetch('/training-records');
    } catch (error) {
        // console.debug("Offline mode: using mock data for getTrainingRecords.");
        return initialTrainingRecords;
    }
};

export const getTrainingSessions = async (): Promise<TrainingSession[]> => {
    try {
        return await apiFetch('/training-sessions');
    } catch (error) {
        // console.debug("Offline mode: using mock data for getTrainingSessions.");
        return initialTrainingSessions;
    }
};

export const getNotifications = async (): Promise<Notification[]> => {
    try {
        return await apiFetch('/notifications');
    } catch (error) {
        // console.debug("Offline mode: using mock data for getNotifications.");
        return initialNotifications;
    }
};

export const getSigns = async (): Promise<Sign[]> => {
    try {
        return await apiFetch('/signs');
    } catch (error) {
        // console.debug("Offline mode: using mock data for getSigns.");
        return initialSigns;
    }
};

export const getChecklistTemplates = async (): Promise<ChecklistTemplate[]> => {
    try {
        return await apiFetch('/checklist-templates');
    } catch (error) {
        // console.debug("Offline mode: using mock data for getChecklistTemplates.");
        return initialChecklistTemplates;
    }
};
