import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  onSnapshot
} from 'firebase/firestore';

// --- GENERIC HELPERS ---

// 1. Real-time Listener (Auto-updates when DB changes)
export const subscribeToCollection = (collectionName: string, callback: (data: any[]) => void) => {
  try {
    // Order by created_at descending (newest first)
    // Note: You might need to create an index in Firebase Console if this query fails initially,
    // but usually it works fine for small datasets.
    const q = query(collection(db, collectionName)); 
    
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(data);
    });
  } catch (error) {
    console.error(`Error subscribing to ${collectionName}:`, error);
    return () => {}; // Return empty unsubscribe function
  }
};

// 2. Add Document
export const addToCollection = async (collectionName: string, data: any) => {
  try {
    // Firestore doesn't like 'undefined', so we sanitize the object
    const cleanData = JSON.parse(JSON.stringify(data));
    
    const docRef = await addDoc(collection(db, collectionName), {
      ...cleanData,
      created_at: new Date().toISOString(), // Store as string for easy frontend parsing
      updated_at: new Date().toISOString()
    });
    console.log(`Document written to ${collectionName} with ID: ${docRef.id}`);
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

// 3. Update Document
export const updateInCollection = async (collectionName: string, docId: string, data: any) => {
  try {
    const cleanData = JSON.parse(JSON.stringify(data));
    const docRef = doc(db, collectionName, docId);
    
    await updateDoc(docRef, {
      ...cleanData,
      updated_at: new Date().toISOString()
    });
    console.log(`Document ${docId} updated in ${collectionName}`);
  } catch (e) {
    console.error("Error updating document: ", e);
    throw e;
  }
};