import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "../firebase";

const storage = getStorage(app);

/**
 * Uploads a file to Firebase Storage and returns the public download URL.
 * @param file The file object from the input
 * @param path The folder path (e.g., 'reports', 'avatars')
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
  try {
    // Create a unique filename: timestamp_random_filename
    const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${file.name}`;
    const storageRef = ref(storage, `${path}/${uniqueName}`);

    // Upload
    const snapshot = await uploadBytes(storageRef, file);

    // Get URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

/**
 * Uploads multiple files in parallel
 */
export const uploadFiles = async (files: File[], path: string): Promise<string[]> => {
  const uploadPromises = files.map(file => uploadFile(file, path));
  return Promise.all(uploadPromises);
};