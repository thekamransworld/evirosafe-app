import { GoogleGenerativeAI } from "@google/generative-ai";
import type { PtwType } from '../types';

// Initialize Gemini
const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// FIX: Ensure this interface is exported with this exact name
export interface AiRiskAnalysisResult {
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  hazards: string[];
  controls: string[];
  ppe: string[];
  requiredCertifications: string[];
}

// Mock fallback if API key is missing
const mockAssessment = (type: string): AiRiskAnalysisResult => ({
  riskLevel: 'High',
  hazards: ['Falling objects', 'Electrical shock', 'Slip/Trip'],
  controls: ['Barricade area', 'Use insulated tools', 'Wear harness'],
  ppe: ['Helmet', 'Safety Shoes', 'Gloves'],
  requiredCertifications: ['Work at Height', 'Electrical Safety']
});

export const analyzePtwRisk = async (
  type: PtwType, 
  description: string, 
  location: string
): Promise<AiRiskAnalysisResult> => {
  if (!apiKey) return mockAssessment(type);

  try {
    const prompt = `
      Analyze this Permit to Work request:
      Type: ${type}
      Location: ${location}
      Description: "${description}"

      Return a JSON object with:
      - riskLevel: "Low", "Medium", "High", or "Critical"
      - hazards: array of strings (max 5)
      - controls: array of strings (max 5 specific safety controls)
      - ppe: array of strings (required PPE)
      - requiredCertifications: array of strings (e.g. "Confined Space Training")
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, "").trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("PTW AI Analysis failed:", error);
    return mockAssessment(type);
  }
};

export const checkSimopsConflicts = (
  currentLocation: string,
  startTime: string,
  endTime: string,
  activePermits: any[]
): string[] => {
  const conflicts: string[] = [];
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  activePermits.forEach(ptw => {
    // 1. Check Location Overlap (Simple string match for demo)
    if (ptw.payload.work.location.toLowerCase().includes(currentLocation.toLowerCase()) || 
        currentLocation.toLowerCase().includes(ptw.payload.work.location.toLowerCase())) {
      
      // 2. Check Time Overlap
      const ptwStart = new Date(ptw.payload.work.coverage.start_date + 'T' + ptw.payload.work.coverage.start_time).getTime();
      const ptwEnd = new Date(ptw.payload.work.coverage.end_date + 'T' + ptw.payload.work.coverage.end_time).getTime();

      if ((start >= ptwStart && start <= ptwEnd) || (end >= ptwStart && end <= ptwEnd)) {
        conflicts.push(`Conflict with Active Permit #${ptw.payload.permit_no} (${ptw.type}) at ${ptw.payload.work.location}`);
      }
    }
  });

  return conflicts;
};