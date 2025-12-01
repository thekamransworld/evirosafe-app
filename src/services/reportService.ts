import { db } from "../firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";

// We use "reports" to keep it separate from your old test data
const REPORTS_COLLECTION = "reports";

// 1. SAVE a new report
export const saveReportToDb = async (reportData: any) => {
  try {
    const docRef = await addDoc(collection(db, REPORTS_COLLECTION), {
      ...reportData,
      created_at: new Date().toISOString(),
    });
    console.log("Saved to Cloud with ID: ", docRef.id);
    return { id: docRef.id, ...reportData };
  } catch (e) {
    console.error("Error saving to DB: ", e);
    throw e;
  }
};

// 2. LOAD all reports
export const fetchReportsFromDb = async () => {
  try {
    const q = query(collection(db, REPORTS_COLLECTION), orderBy("created_at", "desc"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (e) {
    console.error("Error loading from DB: ", e);
    return [];
  }
};