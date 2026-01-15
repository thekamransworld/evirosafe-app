import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// --- HELPER: CLEAN JSON ---
const cleanJson = (text: string) => {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

// --- ROBUST GENERATION FUNCTION ---
// Tries multiple models in case one is deprecated or unavailable
const generateContentSafe = async (prompt: string) => {
  if (!apiKey) throw new Error("AI not configured. Please add VITE_GEMINI_API_KEY.");

  // List of models to try in order of preference (Fastest -> Most Stable)
  const modelsToTry = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-001",
    "gemini-1.0-pro", 
    "gemini-pro"
  ];

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error: any) {
      console.warn(`Model ${modelName} failed:`, error.message);
      
      // If it's a 404 (Not Found), try the next model
      if (error.message.includes("404") || error.message.includes("not found")) {
        continue;
      }
      // If it's a 403 (Permission) or 400 (Bad Request), stop and throw
      throw error;
    }
  }
  throw new Error("All AI models failed. Please enable 'Generative Language API' in Google Cloud Console.");
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
    console.error("AI Error:", error);
    return mockSafetyReport(prompt);
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
    return mockRams(activity);
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
    return mockTbt(topic);
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
    return mockCourse(title);
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
    return mockCertInsight();
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

// --- FALLBACK MOCKS ---
const mockSafetyReport = (prompt: string) => ({
  description: `Report: ${prompt}`,
  rootCause: "Pending Investigation",
  riskLevel: "Medium",
  recommendation: "Review safety procedures and conduct TBT."
});

const mockRams = (activity: string) => ({
  overview: `Method Statement for ${activity}`,
  competence: "Standard HSE Training",
  emergency_arrangements: "Muster Point A",
  sequence_of_operations: [{
    step_no: 1, description: "Prepare work area",
    hazards: [{ id: "h1", description: "General Hazard" }],
    controls: [{ id: "c1", description: "Standard Controls", hierarchy: "administrative" }],
    risk_before: { severity: 3, likelihood: 3 },
    risk_after: { severity: 2, likelihood: 1 }
  }]
});

const mockTbt = (topic: string) => ({
  summary: `Discussion on ${topic}`,
  hazards: ["General Hazard"],
  controls: ["Follow SOP"],
  questions: ["Do you understand the risks?"]
});

const mockCourse = (title: string) => ({
  syllabus: `# ${title}\n\nStandard syllabus content.`,
  learning_objectives: ["Understand basics", "Safety compliance"]
});

const mockCertInsight = () => ({
  nextLevelRecommendation: "Continue logging safe hours.",
  missingItems: ["Advanced Training"]
});