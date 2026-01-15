import { GoogleGenerativeAI } from "@google/generative-ai";

// --- 🚨 HARDCODED KEY FIX ---
// Paste your NEW key inside the quotes below.
const HARDCODED_KEY = "AIzaSyDTcyGBUP6-c9exU2M-I10z1CgIMikYwXE"; 

const apiKey = HARDCODED_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// --- HELPER: CLEAN JSON ---
const cleanJson = (text: string) => {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

// --- ROBUST GENERATION FUNCTION ---
const generateContentSafe = async (prompt: string) => {
  // We use 'gemini-1.5-flash' as it is the standard free tier model
  const modelsToTry = ["gemini-1.5-flash", "gemini-pro"];

  for (const modelName of modelsToTry) {
    try {
      console.log(`[AI] Using key: ${apiKey.substring(0, 8)}...`);
      console.log(`[AI] Trying model: ${modelName}...`);
      
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.warn(`[AI] Model ${modelName} failed:`, error.message);
    }
  }
  throw new Error("AI Failed. Please check the API Key in geminiService.ts");
};

// --- 1. GENERIC RESPONSE ---
export const generateResponse = async (prompt: string) => {
  try {
    return await generateContentSafe(prompt);
  } catch (error: any) {
    return `Error: ${error.message}`;
  }
};

// --- 2. INCIDENT ANALYSIS ---
export const generateSafetyReport = async (prompt: string) => {
  try {
    const text = await generateContentSafe(`
      Act as a Senior HSE Manager. Analyze this incident description: "${prompt}".
      Return a JSON object with these fields:
      - description: A professional summary of the event.
      - rootCause: The likely root cause.
      - riskLevel: High, Medium, or Low.
      - recommendation: 3 bullet points of immediate actions.
    `);
    return JSON.parse(cleanJson(text));
  } catch (error) {
    return {
        description: prompt,
        rootCause: "Analysis Failed",
        riskLevel: "Medium",
        recommendation: "Review manually."
    };
  }
};

// --- 3. RAMS GENERATION ---
export const generateRamsContent = async (activity: string) => {
  try {
    const text = await generateContentSafe(`
      Create a Method Statement for: "${activity}".
      Return JSON:
      {
        "overview": "Summary of work",
        "competence": "Required training",
        "emergency_arrangements": "Emergency procedures",
        "sequence_of_operations": [
          {
            "step_no": 1,
            "description": "Step description",
            "hazards": [{"id": "h1", "description": "Hazard"}],
            "controls": [{"id": "c1", "description": "Control", "hierarchy": "engineering"}],
            "risk_before": {"severity": 4, "likelihood": 4},
            "risk_after": {"severity": 2, "likelihood": 2}
          }
        ]
      }
    `);
    return JSON.parse(cleanJson(text));
  } catch (error) {
    throw new Error("RAMS Generation Failed");
  }
};

// --- 4. TOOLBOX TALK GENERATION ---
export const generateTbtContent = async (topic: string) => {
  try {
    const text = await generateContentSafe(`
      Create a Toolbox Talk for: "${topic}".
      Return JSON:
      {
        "summary": "Key message",
        "hazards": ["Hazard 1", "Hazard 2"],
        "controls": ["Control 1", "Control 2"],
        "questions": ["Question 1", "Question 2"]
      }
    `);
    return JSON.parse(cleanJson(text));
  } catch (error) {
    throw new Error("TBT Generation Failed");
  }
};

// --- 5. COURSE GENERATION ---
export const generateCourseContent = async (title: string) => {
  try {
    const text = await generateContentSafe(`
      Create a training syllabus for: "${title}".
      Return JSON:
      {
        "syllabus": "Markdown formatted syllabus content",
        "learning_objectives": ["Obj 1", "Obj 2", "Obj 3"]
      }
    `);
    return JSON.parse(cleanJson(text));
  } catch (error) {
    throw new Error("Course Generation Failed");
  }
};

// --- 6. CERTIFICATION INSIGHT ---
export const generateCertificationInsight = async (profile: any) => {
  try {
    const text = await generateContentSafe(`
      Analyze this HSE profile: ${JSON.stringify(profile)}.
      Return JSON: { "nextLevelRecommendation": "string", "missingItems": ["string"] }
    `);
    return JSON.parse(cleanJson(text));
  } catch (error) {
    return { nextLevelRecommendation: "Continue training.", missingItems: [] };
  }
};

export const generateReportSummary = async (json: string) => {
    try {
        return await generateContentSafe(`Summarize this incident report in 2 sentences: ${json}`);
    } catch (e) { return "Error generating summary."; }
};

export const translateText = async (text: string, lang: string) => {
    try {
        return await generateContentSafe(`Translate this to ${lang}: "${text}"`);
    } catch (e) { return text; }
};

export const generateAiRiskForecast = async () => {
    try {
        const text = await generateContentSafe(`
            Generate a predictive HSE risk forecast.
            Return JSON: { "risk_level": "High/Medium/Low", "summary": "string", "recommendations": ["string"] }
        `);
        return JSON.parse(cleanJson(text));
    } catch (e) {
        return {
            risk_level: 'Medium',
            summary: 'AI Analysis Unavailable.',
            recommendations: ['Follow standard procedures']
        };
    }
};

export const getPredictiveInsights = generateAiRiskForecast;