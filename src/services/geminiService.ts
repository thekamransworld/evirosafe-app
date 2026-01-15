import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
// We use the environment variable. If it's missing, we'll handle it gracefully in the functions.
const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// --- HELPER: CLEAN JSON ---
// Removes markdown code blocks to ensure valid JSON parsing
const cleanJson = (text: string) => {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

// --- ROBUST GENERATION FUNCTION ---
// Tries multiple models to ensure reliability
const generateContentSafe = async (prompt: string) => {
  if (!apiKey) throw new Error("AI not configured. Please add VITE_GEMINI_API_KEY.");

  const modelsToTry = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"];

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.warn(`[AI] Model ${modelName} failed:`, error.message);
      // If it's a 404 or 503, try the next model. Otherwise, it might be a key issue.
      if (!error.message.includes("404") && !error.message.includes("503")) {
         // Continue trying other models just in case, but log the warning
      }
    }
  }
  throw new Error("All AI models failed. Please check your API Key.");
};

// --- 1. GENERIC RESPONSE ---
export const generateResponse = async (prompt: string) => {
  try {
    return await generateContentSafe(prompt);
  } catch (error: any) {
    console.error("AI Error:", error);
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
      - rootCause: The likely root cause (Human Error, Equipment Failure, Process, Environment).
      - riskLevel: High, Medium, or Low.
      - recommendation: 3 bullet points of immediate corrective actions.
    `);
    return JSON.parse(cleanJson(text));
  } catch (error) {
    console.error("AI Parsing Error:", error);
    return {
        description: prompt,
        rootCause: "Pending Investigation",
        riskLevel: "Medium",
        recommendation: "Review safety procedures."
    };
  }
};

// --- 3. RAMS GENERATION ---
export const generateRamsContent = async (activity: string) => {
  try {
    const text = await generateContentSafe(`
      Create a Method Statement for construction activity: "${activity}".
      Return strictly valid JSON with this structure:
      {
        "overview": "Brief summary of the work",
        "competence": "Required training/certs",
        "emergency_arrangements": "Emergency procedures",
        "sequence_of_operations": [
          {
            "step_no": 1,
            "description": "Step description",
            "hazards": [{"id": "h1", "description": "Hazard name"}],
            "controls": [{"id": "c1", "description": "Control measure", "hierarchy": "engineering"}],
            "risk_before": {"severity": 4, "likelihood": 4},
            "risk_after": {"severity": 2, "likelihood": 2}
          }
        ]
      }
    `);
    return JSON.parse(cleanJson(text));
  } catch (error) {
    return {
        overview: "Manual entry required.",
        competence: "Standard",
        emergency_arrangements: "Standard",
        sequence_of_operations: []
    };
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
    return {
        summary: "Manual entry required.",
        hazards: [],
        controls: [],
        questions: []
    };
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
    return {
        syllabus: "Manual entry required.",
        learning_objectives: []
    };
  }
};

// --- 6. CERTIFICATION INSIGHT ---
export const generateCertificationInsight = async (profile: any) => {
  try {
    const text = await generateContentSafe(`
      Analyze this HSE profile: ${JSON.stringify(profile)}.
      Suggest 1 recommendation to reach the next level and 2 missing requirements.
      Return JSON: { "nextLevelRecommendation": "string", "missingItems": ["string"] }
    `);
    return JSON.parse(cleanJson(text));
  } catch (error) {
    return {
        nextLevelRecommendation: "Continue professional development.",
        missingItems: []
    };
  }
};

export const generateReportSummary = async (json: string) => {
    try {
        return await generateContentSafe(`Summarize this incident report in 2 sentences: ${json}`);
    } catch (e) { return "Summary unavailable."; }
};

export const translateText = async (text: string, lang: string) => {
    try {
        return await generateContentSafe(`Translate this to ${lang}: "${text}"`);
    } catch (e) { return text; }
};

export const generateAiRiskForecast = async () => {
    try {
        const text = await generateContentSafe(`
            Generate a predictive HSE risk forecast for a construction site.
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