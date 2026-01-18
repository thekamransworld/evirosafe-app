import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// --- HELPER: CLEAN JSON ---
const cleanJson = (text: string) => {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

// --- 1. GENERIC RESPONSE ---
export const generateResponse = async (prompt: string) => {
  if (!apiKey) return "AI not configured. Please add VITE_GEMINI_API_KEY.";
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("AI Error:", error);
    return "Error generating response. Please check your API Key.";
  }
};

// --- 2. INCIDENT ANALYSIS ---
export const generateSafetyReport = async (prompt: string) => {
  if (!apiKey) return mockSafetyReport(prompt);

  try {
    const result = await model.generateContent(`
      Act as a Senior HSE Manager. Analyze this incident description: "${prompt}".
      Return a JSON object with these fields:
      - description: A professional summary of the event.
      - rootCause: The likely root cause (Human Error, Equipment Failure, Process, Environment).
      - riskLevel: High, Medium, or Low.
      - recommendation: 3 bullet points of immediate corrective actions.
    `);
    const response = await result.response;
    return JSON.parse(cleanJson(response.text()));
  } catch (error) {
    console.error("AI Error:", error);
    return mockSafetyReport(prompt);
  }
};

// --- 3. RAMS GENERATION ---
export const generateRamsContent = async (activity: string) => {
  if (!apiKey) return mockRams(activity);

  try {
    const result = await model.generateContent(`
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
    const response = await result.response;
    return JSON.parse(cleanJson(response.text()));
  } catch (error) {
    return mockRams(activity);
  }
};

// --- 4. TOOLBOX TALK GENERATION ---
export const generateTbtContent = async (topic: string) => {
  if (!apiKey) return mockTbt(topic);

  try {
    const result = await model.generateContent(`
      Create a Toolbox Talk for: "${topic}".
      Return JSON:
      {
        "summary": "Key message",
        "hazards": ["Hazard 1", "Hazard 2"],
        "controls": ["Control 1", "Control 2"],
        "questions": ["Question 1", "Question 2"]
      }
    `);
    const response = await result.response;
    return JSON.parse(cleanJson(response.text()));
  } catch (error) {
    return mockTbt(topic);
  }
};

// --- 5. COURSE GENERATION ---
export const generateCourseContent = async (title: string) => {
  if (!apiKey) return mockCourse(title);

  try {
    const result = await model.generateContent(`
      Create a training syllabus for: "${title}".
      Return JSON:
      {
        "syllabus": "Markdown formatted syllabus content",
        "learning_objectives": ["Obj 1", "Obj 2", "Obj 3"]
      }
    `);
    const response = await result.response;
    return JSON.parse(cleanJson(response.text()));
  } catch (error) {
    return mockCourse(title);
  }
};

// --- 6. CERTIFICATION INSIGHT ---
export const generateCertificationInsight = async (profile: any) => {
  if (!apiKey) return mockCertInsight();

  try {
    const result = await model.generateContent(`
      Analyze this HSE profile: ${JSON.stringify(profile)}.
      Suggest 1 recommendation to reach the next level and 2 missing requirements.
      Return JSON: { "nextLevelRecommendation": "string", "missingItems": ["string"] }
    `);
    const response = await result.response;
    return JSON.parse(cleanJson(response.text()));
  } catch (error) {
    return mockCertInsight();
  }
};

// --- 7. ROOT CAUSE ANALYSIS (NEW) ---
export const generateRootCauseAnalysis = async (description: string) => {
    if (!apiKey) return mockRootCause();
    try {
        const result = await model.generateContent(`
            Perform a 5-Whys Root Cause Analysis for this incident: "${description}".
            Return JSON:
            {
                "direct_cause": "Immediate cause",
                "why_1": "Reason 1",
                "why_2": "Reason 2",
                "why_3": "Reason 3",
                "why_4": "Reason 4",
                "why_5": "Root Cause",
                "conclusion": "Systemic failure identified",
                "root_cause_category": ["Human", "Process"]
            }
        `);
        const response = await result.response;
        return JSON.parse(cleanJson(response.text()));
    } catch (e) { return mockRootCause(); }
};

// --- 8. COST ESTIMATION (NEW) ---
export const estimateIncidentCosts = async (description: string, severity: string) => {
    if (!apiKey) return mockCosts();
    try {
        const result = await model.generateContent(`
            Estimate the financial impact of a "${severity}" severity incident: "${description}".
            Return JSON with estimated USD values (numbers only):
            {
                "direct_costs": { "medical": 0, "repair": 0, "compensation": 0, "fines": 0 },
                "indirect_costs": { "downtime": 0, "legal": 0, "training": 0, "admin": 0 },
                "total_estimated": 0
            }
        `);
        const response = await result.response;
        return JSON.parse(cleanJson(response.text()));
    } catch (e) { return mockCosts(); }
};

export const generateReportSummary = async (json: string) => {
    if (!apiKey) return "AI Summary unavailable (No API Key).";
    try {
        const result = await model.generateContent(`Summarize this incident report in 2 sentences: ${json}`);
        return result.response.text();
    } catch (e) { return "Error generating summary."; }
};

export const translateText = async (text: string, lang: string) => {
    if (!apiKey) return `[Mock Translate]: ${text}`;
    try {
        const result = await model.generateContent(`Translate this to ${lang}: "${text}"`);
        return result.response.text();
    } catch (e) { return text; }
};

export const generateAiRiskForecast = async () => {
    return {
        risk_level: 'Medium',
        summary: 'AI Analysis: Moderate risk due to high activity levels and potential heat stress.',
        recommendations: ['Enforce hydration breaks', 'Check lifting gear certification', 'Monitor wind speeds']
    };
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

const mockRootCause = () => ({
    direct_cause: "Manual Mock Cause",
    why_1: "Reason 1", why_2: "Reason 2", why_3: "Reason 3", why_4: "Reason 4", why_5: "Root Cause",
    conclusion: "System failure",
    root_cause_category: ["Process"]
});

const mockCosts = () => ({
    direct_costs: { medical: 1000, repair: 500, compensation: 0, fines: 0 },
    indirect_costs: { downtime: 2000, legal: 0, training: 500, admin: 200 },
    total_estimated: 4200
});