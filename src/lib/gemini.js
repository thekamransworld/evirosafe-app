import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
// Note: Ensure your .env.local has NEXT_PUBLIC_GEMINI_API_KEY defined
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

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

    // Clean up the text to ensure it is valid JSON
    const cleanJson = text.replace(/```json|```/g, '').trim();
    
    return JSON.parse(cleanJson);

  } catch (error) {
    console.error("AI Generation Error:", error);
    return null;
  }
}