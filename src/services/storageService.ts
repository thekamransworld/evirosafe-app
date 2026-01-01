// src/services/storageService.ts

// --- CLOUDINARY CONFIGURATION ---
const CLOUD_NAME = "dsw9llfdo"; 
const UPLOAD_PRESET = "evirosafe_preset"; 

/**
 * Uploads a file to Cloudinary (Free Image/Video Hosting)
 * @param file The file object from the input
 * @param folder Optional folder name (Cloudinary handles this via presets usually)
 */
export const uploadFileToFirebase = async (file: File, folder: string): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  
  // Note: Folders in Cloudinary usually require the preset to allow dynamic folders, 
  // or they just go to the root. We append it just in case your preset supports it.
  formData.append("folder", folder); 

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Cloudinary Error:", errorData);
      throw new Error(errorData.error?.message || "Upload failed");
    }

    const data = await response.json();
    // Return the secure HTTPS URL of the uploaded file
    return data.secure_url; 
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};