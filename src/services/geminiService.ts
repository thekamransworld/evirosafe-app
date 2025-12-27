import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- MOCK DATA GENERATORS (Fallback) ---
const getMockSafetyReport = (prompt: string) => {
  return `## 🤖 AI Safety Assessment (Simulation)
  
**Subject:** ${prompt}

**Analysis:**
Based on the description provided, this situation presents a **Moderate Risk**. The primary concerns are potential personnel injury and lack of procedural compliance.

**Recommended Actions:**
1. **Immediate:** Stop work and secure the area.
2. **Short-term:** Conduct a toolbox talk regarding "${prompt}".
3. **Long-term:** Review the RAMS for this specific activity.

*Note: This is a simulated response because the AI Service is currently unavailable.*`;
};

const getMockRiskForecast = () => ({
  risk_level: "Medium",
  summary: "Simulated Analysis: Weather conditions (38°C) and high activity levels suggest elevated fatigue risks.",
  recommendations: [
    "Increase hydration breaks to every 45 minutes.",
    "Ensure shade is available for all static posts.",
    "Verify all lifting equipment certifications before use."
  ]
});

const getMockRams = (activity: string) => ({
  overview: `Method Statement for: ${activity}\n\n1. Barricade the work area.\n2. Verify permits.\n3. Don appropriate PPE.`,
  competence: "All personnel must be certified and inducted.",
  sequence_of_operations: [
    {
      step_no: 1,
      description: "Site Preparation and barricading",
      hazards: [{ id: "h1", description: "Unauthorized entry" }],
      controls: [{ id: "c1", description: "Install hard barricades and signage", hierarchy: "engineering" }],
      risk_before: { severity: 3, likelihood: 3 },
      risk_after: { severity: 3, likelihood: 1 }
    },
    {
      step_no: 2,
      description: `Execution of ${activity}`,
      hazards: [{ id: "h2", description: "Manual handling injury" }],
      controls: [{ id: "c2", description: "Use mechanical aids where possible", hierarchy: "engineering" }],
      risk_before: { severity: 4, likelihood: 3 },
      risk_after: { severity: 2, likelihood: 2 }
    }
  ],
  emergency_arrangements: "Contact Site Security on Channel 1. Muster at Point B."
});

const getMockTbt = (title: string) => ({
  summary: `Today's talk focuses on ${title}. Ensure all workers understand the specific risks involved.`,
  hazards: ["Slips, trips, and falls", "Moving machinery", "Heat stress"],
  controls: ["Keep walkways clear", "Wear high-visibility vests", "Drink water frequently"],
  questions: ["What do you do if you see a hazard?", "Where is the nearest fire extinguisher?"]
});

const getMockCourse = (title: string) => ({
  syllabus: `# Course: ${title}\n\n## Module 1: Basics\n- Introduction to ${title}\n- Safety Standards\n\n## Module 2: Hazards\n- Identification\n- Mitigation\n\n## Module 3: Assessment\n- Practical Exam`,
  learning_objectives: ["Identify key hazards", "Apply control measures", "Understand legal duties"]
});

// --- SAFE API HANDLER ---
// This function tries the API, and if it fails (404, 400, etc.), it returns the mock data.
async function safeGenerate<T>(
  apiCall: () => Promise<T>, 
  fallback: T
): Promise<T> {
  if (!API_KEY) {
    console.warn("Gemini Service: No API Key provided. Using mock data.");
    await new Promise(r => setTimeout(r, 1000)); // Simulate network delay
    return fallback;
  }

  try {
    return await apiCall();
  } catch (error: any) {
    console.error("Gemini Service Error (Falling back to mock):", error.message);
    return fallback;
  }
}

// --- EXPORTED FUNCTIONS ---

export const generateSafetyReport = async (prompt: string) => {
  return safeGenerate(async () => {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`
      Act as a HSE Expert. Write a brief safety assessment report for: "${prompt}".
      Include Analysis and 3 bullet points for Recommendations. Use Markdown formatting.
    `);
    return result.response.text();
  }, getMockSafetyReport(prompt));
};

export const generateAiRiskForecast = async () => {
  return safeGenerate(async () => {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`
      Analyze construction site risk for today. 
      Return ONLY valid JSON with this structure: 
      { "risk_level": "Low"|"Medium"|"High", "summary": "string", "recommendations": ["string"] }
    `);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  }, getMockRiskForecast());
};

export const generateRamsContent = async (activity: string) => {
  return safeGenerate(async () => {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Create a RAMS (Risk Assessment Method Statement) for: "${activity}".
      Return ONLY valid JSON with this structure:
      {
        "overview": "string",
        "competence": "string",
        "sequence_of_operations": [
          { 
            "step_no": 1, 
            "description": "string", 
            "hazards": [{"id": "h1", "description": "string"}], 
            "controls": [{"id": "c1", "description": "string", "hierarchy": "engineering"}],
            "risk_before": {"severity": 3, "likelihood": 3},
            "risk_after": {"severity": 2, "likelihood": 1}
          }
        ],
        "emergency_arrangements": "string"
      }
    `;
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  }, getMockRams(activity));
};

export const generateTbtContent = async (title: string) => {
  return safeGenerate(async () => {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Create a Toolbox Talk for: "${title}".
      Return ONLY valid JSON:
      { "summary": "string", "hazards": ["string"], "controls": ["string"], "questions": ["string"] }
    `;
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  }, getMockTbt(title));
};

export const generateCourseContent = async (title: string) => {
  return safeGenerate(async () => {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Create a training course outline for: "${title}".
      Return ONLY valid JSON:
      { "syllabus": "markdown string", "learning_objectives": ["string"] }
    `;
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  }, getMockCourse(title));
};

export const generateReportSummary = async (json: string) => {
  return safeGenerate(async () => {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`Summarize this safety report in 2 sentences: ${json}`);
    return result.response.text();
  }, "Simulated Summary: Incident involved minor property damage. Immediate controls applied.");
};

export const generateCertificationInsight = async (profile: any) => {
  return safeGenerate(async () => {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`
        Analyze this HSE profile: ${JSON.stringify(profile)}.
        Return JSON: { "nextLevelRecommendation": "string", "missingItems": ["string"] }
    `);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  }, {
    nextLevelRecommendation: "Focus on leading more safety inspections to reach the 'Advanced' level.",
    missingItems: ["Lead 5 TBTs", "Complete 'Advanced Risk Assessment' course"]
  });
};

export const translateText = async (text: string, lang: string) => {
  return safeGenerate(async () => {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`Translate this to ${lang}: "${text}"`);
    return result.response.text();
  }, `[Simulated Translation to ${lang}]: ${text}`);
};