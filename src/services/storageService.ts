import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadFileToCloud = async (file: File, folder: string = 'general'): Promise<string> => {
  try {
    // 1. Create unique filename
    const filename = `${folder}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, filename);
    
    // 2. Attempt Upload
    console.log(`Starting upload for ${file.name}...`);
    const snapshot = await uploadBytes(storageRef, file);
    
    // 3. Get URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;

  } catch (error: any) {
    console.error("Storage Upload Failed:", error);
    
    // 4. If upload fails (CORS or Network), return a fake URL so the report still saves
    return `https://placehold.co/600x400/FF0000/FFFFFF?text=Image+Upload+Failed`;
  }
};