import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Setup API Key (Hardcoded for immediate testing)
const API_KEY = "AIzaSyBr_UMiJV7o6e1iV1dFjRF5zVckUr46D3M";

const genAI = new GoogleGenerativeAI(API_KEY);

// Helper: Clean JSON response
const cleanJson = (text: string) => {
  try {
    return text.replace(/```json/g, "").replace(/```/g, "").trim();
  } catch (e) {
    return text;
  }
};

// Helper: Get Model
const getModel = () => {
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
};

// --- REAL AI FUNCTIONS ---

export const generateRamsContent = async (prompt: string) => {
  if (!API_KEY) {
      console.warn("Gemini API Key is missing. Using mock data.");
      return mockRams(prompt); 
  }

  try {
    const model = getModel();
    const systemPrompt = `
      You are an HSE Expert. Generate a comprehensive Risk Assessment & Method Statement (RAMS) for the activity: "${prompt}".
      Return ONLY valid JSON. No markdown formatting. Structure:
      {
        "overview": "Detailed summary",
        "competence": "Required qualifications",
        "emergency_arrangements": "Emergency procedures",
        "sequence_of_operations": [
          {
            "step_no": 1,
            "description": "Step description",
            "hazards": [{ "id": "h1", "description": "Hazard" }],
            "controls": [{ "id": "c1", "description": "Control", "hierarchy": "administrative" }], 
            "risk_before": { "severity": 4, "likelihood": 4 }, 
            "risk_after": { "severity": 2, "likelihood": 2 }
          }
        ]
      }
    `;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = cleanJson(response.text());
    return JSON.parse(text);

  } catch (error) {
    console.error("AI Generation Failed:", error);
    return mockRams(prompt);
  }
};

export const generateTbtContent = async (title: string) => {
  if (!API_KEY) return mockTbt(title);

  try {
    const model = getModel();
    const result = await model.generateContent(`
      Generate a Toolbox Talk for "${title}". 
      Return ONLY valid JSON:
      {
        "summary": "Brief summary",
        "hazards": ["Hazard 1", "Hazard 2"],
        "controls": ["Control 1", "Control 2"],
        "questions": ["Question 1", "Question 2"]
      }
    `);
    return JSON.parse(cleanJson(result.response.text()));
  } catch (e) {
    console.error("AI TBT Failed:", e);
    return mockTbt(title);
  }
};

export const generateCourseContent = async (title: string) => {
  if (!API_KEY) return mockCourse(title);

  try {
    const model = getModel();
    const result = await model.generateContent(`
      Create a training course syllabus for "${title}".
      Return ONLY valid JSON:
      {
        "syllabus": "Markdown formatted syllabus...",
        "learning_objectives": ["Obj 1", "Obj 2"]
      }
    `);
    return JSON.parse(cleanJson(result.response.text()));
  } catch (e) {
    console.error("AI Course Failed:", e);
    return mockCourse(title);
  }
};

export const generateSafetyReport = async (prompt: string) => {
  if (!API_KEY) return mockSafetyReport(prompt);

  try {
    const model = getModel();
    const result = await model.generateContent(`
      Analyze this safety incident: "${prompt}".
      Return ONLY valid JSON:
      {
        "riskLevel": "Low/Medium/High/Critical",
        "rootCause": "Likely root cause",
        "recommendation": "Immediate actions",
        "description": "Professional description"
      }
    `);
    return JSON.parse(cleanJson(result.response.text()));
  } catch (e) {
    console.error("AI Report Failed:", e);
    return mockSafetyReport(prompt);
  }
};

export const generateAiRiskForecast = async () => {
    if (!API_KEY) return mockRiskForecast();
    
    try {
        const model = getModel();
        const result = await model.generateContent(`
            Generate a daily site safety risk forecast.
            Return ONLY valid JSON:
            {
                "risk_level": "Low/Medium/High",
                "summary": "Short forecast summary",
                "recommendations": ["Action 1", "Action 2", "Action 3"]
            }
        `);
        return JSON.parse(cleanJson(result.response.text()));
    } catch (e) {
        console.error("AI Forecast Failed:", e);
        return mockRiskForecast();
    }
}

export const generateCertificationInsight = async (profile: any) => {
    if (!API_KEY) return mockCertInsight();
    
    try {
        const model = getModel();
        const result = await model.generateContent(`
            Analyze this HSE profile and suggest next certification steps.
            Profile: ${JSON.stringify(profile)}
            Return ONLY valid JSON:
            {
                "nextLevelRecommendation": "Recommendation text",
                "missingItems": ["Item 1", "Item 2"]
            }
        `);
        return JSON.parse(cleanJson(result.response.text()));
    } catch (e) {
        return mockCertInsight();
    }
}

export const translateText = async (text: string, lang: string) => {
    if (!API_KEY) return `[Mock Translation]: ${text}`;
    try {
        const model = getModel();
        const result = await model.generateContent(`Translate to ${lang}: "${text}"`);
        return result.response.text();
    } catch(e) {
        return text;
    }
}

export const generateReportSummary = async (json: string) => {
    if (!API_KEY) return "AI Summary unavailable (Mock Mode).";
    
    try {
        const model = getModel();
        const result = await model.generateContent(`Summarize this incident report in 1 paragraph: ${json}`);
        return result.response.text();
    } catch (e) {
        return "Failed to generate summary.";
    }
};

// --- MOCK FALLBACKS ---
const mockRams = (prompt: string) => ({
    overview: `(Mock) Method Statement for: ${prompt}.`,
    competence: "All personnel must hold valid cards.",
    sequence_of_operations: [
        {
            step_no: 1,
            description: "Site Preparation (Mock)",
            hazards: [{ id: "h1", description: "Slips, Trips" }],
            controls: [{ id: "c1", description: "Good housekeeping", hierarchy: "administrative" }],
            risk_before: { severity: 3, likelihood: 3 },
            risk_after: { severity: 3, likelihood: 1 }
        }
    ],
    emergency_arrangements: "Standard site emergency plan applies."
});

const mockTbt = (title: string) => ({
    summary: `(Mock) Discussion on ${title}`,
    hazards: ["Generic Hazard 1", "Generic Hazard 2"],
    controls: ["Wear PPE", "Follow procedures"],
    questions: ["Do you understand?", "Any questions?"]
});

const mockCourse = (title: string) => ({
    syllabus: `# (Mock) Course: ${title}\n\n## Module 1\n- Introduction`,
    learning_objectives: ["Objective 1", "Objective 2"]
});

const mockSafetyReport = (prompt: string) => ({
    riskLevel: 'Medium',
    rootCause: 'Under investigation (Mock)',
    recommendation: 'Review procedures (Mock)',
    description: prompt
});

const mockRiskForecast = () => ({
    risk_level: 'Medium',
    summary: 'Moderate risk detected (Mock Data).',
    recommendations: ['Check PPE', 'Hydrate']
});

const mockCertInsight = () => ({
    nextLevelRecommendation: "Complete 5 more inspections.",
    missingItems: ["Advanced First Aid"]
});