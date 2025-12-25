import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

// Generic hook to fetch real-time data from a collection
export const useCollection = <T>(collectionName: string, initialData: T[] = []) => {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const q = query(collection(db, collectionName), orderBy('created_at', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const results: any[] = [];
        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() });
        });
        setData(results);
        setLoading(false);
      }, (err) => {
        console.error(`Error fetching ${collectionName}:`, err);
        setError(err.message);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err: any) {
      // Fallback if query fails (e.g. missing index or offline)
      console.warn(`Firestore query failed for ${collectionName}, falling back to simple fetch.`);
      const unsubscribe = onSnapshot(collection(db, collectionName), (snapshot) => {
         const results: any[] = [];
         snapshot.forEach((doc) => {
           results.push({ id: doc.id, ...doc.data() });
         });
         setData(results);
         setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [collectionName]);

  return { data, loading, error };
};

// CRUD Helpers
export const addDocument = async (collectionName: string, data: any) => {
  try {
    // Add server timestamp
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      created_at: new Date().toISOString(), // Store as string for easier frontend parsing
      updated_at: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding document: ", error);
    throw error;
  }
};

export const updateDocument = async (collectionName: string, id: string, data: any) => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating document: ", error);
    throw error;
  }
};

export const deleteDocument = async (collectionName: string, id: string) => {
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    console.error("Error deleting document: ", error);
    throw error;
  }
};