import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  orderBy 
} from "firebase/firestore";
import { db } from "../firebase";
import type { Report, Project, Ptw, Inspection } from "../types";

// --- GENERIC HELPERS ---

// Helper to fetch all documents from a collection
const fetchCollection = async <T>(collectionName: string): Promise<T[]> => {
  try {
    const q = query(collection(db, collectionName), orderBy("created_at", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (error) {
    console.error(`Error fetching ${collectionName}:`, error);
    return [];
  }
};

// Helper to add a document
const addDocument = async (collectionName: string, data: any) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    console.log(`Document written to ${collectionName} with ID: `, docRef.id);
    return { id: docRef.id, ...data };
  } catch (error) {
    console.error(`Error adding to ${collectionName}:`, error);
    throw error;
  }
};

// --- SPECIFIC FUNCTIONS ---

// 1. PROJECTS
export const getProjects = () => fetchCollection<Project>("projects");
export const createProject = (data: any) => addDocument("projects", data);

// 2. REPORTS (Incidents)
export const getReports = () => fetchCollection<Report>("reports");
export const createReport = (data: any) => addDocument("reports", data);
export const updateReport = async (id: string, data: any) => {
  const ref = doc(db, "reports", id);
  await updateDoc(ref, { ...data, updated_at: new Date().toISOString() });
};

// 3. PERMITS (PTW)
export const getPtws = () => fetchCollection<Ptw>("ptws");
export const createPtw = (data: any) => addDocument("ptws", data);
export const updatePtw = async (id: string, data: any) => {
  const ref = doc(db, "ptws", id);
  await updateDoc(ref, { ...data, updated_at: new Date().toISOString() });
};

// 4. INSPECTIONS
export const getInspections = () => fetchCollection<Inspection>("inspections");
export const createInspection = (data: any) => addDocument("inspections", data);
export const updateInspection = async (id: string, data: any) => {
  const ref = doc(db, "inspections", id);
  await updateDoc(ref, { ...data, updated_at: new Date().toISOString() });
};