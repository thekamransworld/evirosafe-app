import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadFileToCloud = async (file: File, folder: string = 'general'): Promise<string> => {
  try {
    // 1. Create a unique filename (e.g., reports/1715000000_photo.jpg)
    const filename = `${folder}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, filename);
    
    // 2. Upload the file
    console.log(`Uploading ${file.name} to ${folder}...`);
    const snapshot = await uploadBytes(storageRef, file);
    
    // 3. Get the public URL to save in the database
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("File available at", downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error("Firebase Storage Upload Error:", error);
    // Fallback if storage fails (prevents app crash)
    return `https://placehold.co/600x400/red/white?text=Upload+Failed`;
  }
};