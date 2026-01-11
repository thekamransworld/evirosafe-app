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
    console.log("Upload success:", downloadURL);
    return downloadURL;

  } catch (error: any) {
    // 4. Handle CORS or Network Errors gracefully
    console.error("Storage Upload Error:", error);
    
    // Check if it's a CORS or permission error
    if (error.code === 'storage/unauthorized' || error.message.includes('CORS') || error.message.includes('access control')) {
        console.warn("CORS issue detected. Using placeholder to allow report submission.");
        // Return a placeholder so the report can still be saved
        return `https://placehold.co/600x400/FF0000/FFFFFF?text=Image+Error+(CORS)`;
    }

    // Return a generic error placeholder for other issues
    return `https://placehold.co/600x400/orange/white?text=Upload+Failed`;
  }
};