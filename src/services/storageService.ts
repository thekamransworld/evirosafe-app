// --- MOCK STORAGE SERVICE ---
// Use this if you do not have a Google Cloud Billing Account enabled.

/**
 * Simulates uploading a file to the cloud.
 * Returns a placeholder image URL after a short delay.
 */
export const uploadFileToCloud = async (file: File, path: string = 'general'): Promise<string> => {
  console.log(`[Mock Storage] Pretending to upload file: ${file.name} to folder: ${path}`);

  // 1. Simulate network delay (1 second)
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 2. Return a fake URL (Placeholder image)
  // This allows the UI to show "Success" and display an image
  return `https://placehold.co/600x400/2563eb/ffffff?text=Uploaded:+${encodeURIComponent(file.name)}`;
};