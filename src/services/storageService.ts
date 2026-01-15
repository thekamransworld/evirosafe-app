// src/services/storageService.ts

export const uploadFileToCloud = async (file: File, folder: string = 'general'): Promise<string> => {
  // This log proves the new code is running
  console.log(`[Mock Storage Active] Simulating upload for ${file.name}...`);

  // 1. Simulate a short network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // 2. Generate a fake URL so the app doesn't crash
  const isVideo = file.type.startsWith('video');
  const encodedName = encodeURIComponent(file.name);
  const mockUrl = `https://placehold.co/600x400/2563eb/ffffff?text=${isVideo ? 'Video' : 'Image'}:+${encodedName}`;
  
  return mockUrl;
};