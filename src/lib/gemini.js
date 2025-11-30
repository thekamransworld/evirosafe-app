import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// THE WORD "export" BELOW IS CRITICAL
export async function generateSafetyReport(userInput) {
  if (!userInput) return null;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `
      Act as a Senior HSE Officer.
      Convert this incident description into a JSON safety report.
      Incident: "${userInput}"

      Output JSON format only:
      {
        "title": "Short professional title",
        "description": "Technical description of what happened",
        "rootCause": "Likely root cause",
        "recommendation": "Actionable step to fix",
        "riskLevel": "Low, Medium, or High"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanJson = text.replace(/```json|```/g, '').trim();
    
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("AI Generation Error:", error);
    return null;
  }
}