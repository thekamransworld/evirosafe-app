// src/services/storageService.ts

// --- CONFIGURATION ---
const CLOUD_NAME = "dsw9llfdo"; 
const UPLOAD_PRESET = "evirosafe"; 

export const uploadFileToCloud = async (file: File, folder: string = 'general'): Promise<string> => {
  // Use the 'auto' resource type, not a hardcoded 'image' endpoint. Evidence
  // uploads aren't restricted to images (ReportCreationModal's file input has
  // no `accept` filter), and non-image files like .xlsx are internally ZIP
  // containers — Cloudinary's `image` endpoint runs ZIP detection as a
  // security check and rejects them with 400 "Unsupported ZIP file". `auto`
  // detects image/video/raw per-file instead of assuming everything is an image.
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
  
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
    // Re-throw rather than returning a placeholder URL. A caller that gets a
    // string back has no reliable way to know it's actually a failure
    // marker instead of a real upload - that ambiguity is exactly what let
    // a broken evidence/document link get silently saved as if it were
    // real. Every caller needs a try/catch around this call now.
    throw error instanceof Error ? error : new Error('File upload failed.');
  }
};