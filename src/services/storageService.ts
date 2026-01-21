// src/services/storageService.ts

// --- CONFIGURATION ---
const CLOUD_NAME = "dsw9llfdo"; 
const UPLOAD_PRESET = "evirosafe"; 

export const uploadFileToCloud = async (file: File, folder: string = 'general'): Promise<string> => {
  // API Endpoint for your specific cloud name
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', `evirosafe/${folder}`); // Keeps your cloud organized by feature

  try {
    console.log(`Uploading ${file.name} to Cloudinary...`);
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Upload success:", data.secure_url);
    
    return data.secure_url; // This is the permanent URL

  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    // Fallback placeholder so the app doesn't crash if internet is bad
    return `https://placehold.co/600x400/red/white?text=Upload+Failed`;
  }
};