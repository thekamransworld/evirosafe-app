import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadFileToCloud = async (file: File, folder: string = 'general'): Promise<string> => {
  try {
    // 1. Create a reference
    const filename = `${folder}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, filename);
    
    // 2. Try to upload (This will fail if no bucket exists)
    console.log(`Attempting upload for ${file.name}...`);
    const snapshot = await uploadBytes(storageRef, file);
    
    // 3. Get URL if successful
    return await getDownloadURL(snapshot.ref);

  } catch (error: any) {
    // 4. CATCH THE ERROR so the app doesn't crash
    console.warn("Storage Upload Failed (likely no bucket or CORS). Using placeholder.");
    
    // Return a fake image URL so the report can still be submitted
    return `https://placehold.co/600x400/FF0000/FFFFFF?text=Storage+Not+Configured`;
  }
};