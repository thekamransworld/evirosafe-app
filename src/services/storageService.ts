// src/services/storageService.ts
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadFileToCloud = async (file: File, folder: string = 'general'): Promise<string> => {
  try {
    // Create a unique filename
    const filename = `${folder}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, filename);
    
    // Upload
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Firebase Storage Upload Error:", error);
    throw new Error("Failed to upload file to cloud.");
  }
};