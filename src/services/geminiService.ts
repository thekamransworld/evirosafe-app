import { GoogleGenerativeAI } from "@google/generative-ai";

// Access API Key from environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

// Initialize API
const genAI = new GoogleGenerativeAI(API_KEY);

// --- MOCK DATA GENERATORS (Fallback) ---
const getMockRiskForecast = () => ({
    risk_level: 'Medium',
    summary: 'Moderate risk detected due to high temperatures and ongoing lifting operations (Mock Data).',
    recommendations: ['Enforce hydration breaks', 'Check lifting gear certification', 'Monitor wind speeds']
});

const getMockSafetyReport = (prompt: string) => `## AI Safety Assessment (Mock)\n\n**Subject:** ${prompt}\n\n**Analysis:**\nBased on standard safety protocols, the situation described involves potential hazards related to site operations.\n\n**Recommendations:**\n1. Isolate the area.\n2. Verify permits.\n3. Conduct a TBT.`;

const getMockRams = (prompt: string) => ({
    overview: `Method Statement for: ${prompt}\n\n1. Ensure work area is barricaded.\n2. Verify all permits are active.\n3. Conduct TBT before start.`,
    competence: "All personnel must hold valid cards and specific training for this task.",
    sequence_of_operations: [
        {
            step_no: 1,
            description: "Site Preparation",
            hazards: [{ id: "h1", description: "Slips, Trips, Falls" }],
            controls: [{ id: "c1", description: "Good housekeeping", hierarchy: "administrative" }],
            risk_before: { severity: 3, likelihood: 3 },
            risk_after: { severity: 3, likelihood: 1 }
        }
    ],
    emergency_arrangements: "In case of emergency, stop work immediately and proceed to assembly point A."
});

const getMockTbt = (title: string) => ({
    summary: `Today we are discussing ${title}. Key safety points include hazard identification and control measures.`,
    hazards: ["Unexpected movement", "Falling objects", "Pinch points"],
    controls: ["Stay within walkways", "Wear helmet and gloves", "Maintain eye contact"],
    questions: ["What is the main hazard?", "Who is the supervisor?"]
});

const getMockCourse = (title: string) => ({
    syllabus: `# Course: ${title}\n\n## Module 1: Introduction\n- Overview\n- Regulations\n\n## Module 2: Safety\n- Risk Controls\n- PPE`,
    learning_objectives: ["Understand risks", "Apply controls", "Emergency response"]
});

// --- API FUNCTIONS ---

export const generateAiRiskForecast = async () => {
    if (!API_KEY) return getMockRiskForecast();
    
    try {
        // Use 'gemini-pro' as it is generally available
        const model = genAI.getGenerativeModel({ model: "gemini-pro" }); 
        const prompt = "Analyze construction site risks for today: 38C temperature, 62 workers, lifting operations. Return JSON with risk_level (Low/Medium/High), summary, and recommendations array.";
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Attempt to parse JSON from AI response
        try {
            // Clean up markdown code blocks if present
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (e) {
            console.warn("AI JSON parse failed, using mock", e);
            return getMockRiskForecast();
        }
    } catch (error) {
        console.error("AI Service Error (Risk Forecast):", error);
        return getMockRiskForecast();
    }
};

export const generateSafetyReport = async (prompt: string) => {
    if (!API_KEY) return getMockSafetyReport(prompt);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(`Generate a safety report for: ${prompt}`);
        return result.response.text();
    } catch (error) {
        console.error("AI Service Error (Safety Report):", error);
        return getMockSafetyReport(prompt);
    }
};

export const generateRamsContent = async (prompt: string) => {
    if (!API_KEY) return getMockRams(prompt);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(`Generate RAMS content JSON for: ${prompt}. Fields: overview, competence, sequence_of_operations (array of steps with hazards/controls), emergency_arrangements.`);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("AI Service Error (RAMS):", error);
        return getMockRams(prompt);
    }
};

export const generateTbtContent = async (title: string) => {
    if (!API_KEY) return getMockTbt(title);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(`Generate Toolbox Talk JSON for '${title}'. Fields: summary, hazards (array), controls (array), questions (array).`);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("AI Service Error (TBT):", error);
        return getMockTbt(title);
    }
};

export const generateCourseContent = async (title: string) => {
    if (!API_KEY) return getMockCourse(title);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(`Generate training course JSON for '${title}'. Fields: syllabus (markdown string), learning_objectives (array).`);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("AI Service Error (Course):", error);
        return getMockCourse(title);
    }
};

export const generateReportSummary = async (json: string) => {
    if (!API_KEY) return "AI Summary: Incident details recorded. Investigation pending.";
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(`Summarize this safety report JSON in 2 sentences: ${json}`);
        return result.response.text();
    } catch (error) {
        return "AI Summary: Incident details recorded. Investigation pending.";
    }
};

export const generateCertificationInsight = async (profile: any) => {
    // Mock only for now as this is complex logic
    return {
        nextLevelRecommendation: "Focus on leading more safety inspections to reach the 'Advanced' level.",
        missingItems: ["Lead 5 TBTs", "Complete 'Advanced Risk Assessment' course"]
    };
};

export const translateText = async (text: string, lang: string) => {
    if (!API_KEY) return `[${lang}] ${text}`;
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(`Translate to ${lang}: ${text}`);
        return result.response.text();
    } catch (error) {
        return `[${lang}] ${text}`;
    }
};