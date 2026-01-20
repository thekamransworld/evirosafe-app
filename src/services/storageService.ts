// src/services/storageService.ts

/**
 * MOCK STORAGE SERVICE
 * Used when Firebase Storage bucket is not available (Free Tier limit).
 * Simulates a successful upload and returns a placeholder image.
 */
export const uploadFileToCloud = async (file: File, folder: string = 'general'): Promise<string> => {
  console.log(`[Mock Storage] Starting upload for ${file.name} to folder: ${folder}`);

  // 1. Simulate network delay (1.5 seconds) to feel like a real upload
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 2. Return a generated placeholder image URL
  // This URL generates an image with the file name on it
  const mockUrl = `https://placehold.co/600x400/2563eb/ffffff?text=Uploaded:+${encodeURIComponent(file.name)}`;
  
  console.log("[Mock Storage] Upload success:", mockUrl);
  return mockUrl;
};