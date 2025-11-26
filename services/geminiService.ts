



import { GoogleGenAI, Type, Schema } from "@google/genai";
import type { Report } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("Gemini API key not found. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const callGemini = async (prompt: string, systemInstruction: string): Promise<string> => {
    if (!API_KEY) {
        return Promise.resolve("AI functionality is disabled. Please configure your API key.");
    }
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              systemInstruction,
              temperature: 0.5,
              topP: 0.95,
            }
        });

        return response.text || "";
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (error instanceof Error) {
            return `An error occurred while generating the report: ${error.message}`;
        }
        return "An unknown error occurred while generating the report.";
    }
};

export const generateSafetyReport = async (prompt: string): Promise<string> => {
    const systemInstruction = "You are an expert Health, Safety, and Environment (HSE) analyst. Your task is to generate concise, professional, and actionable safety reports based on the provided data. Format your response in clear markdown.";
    return callGemini(prompt, systemInstruction);
};

export const generateReportSummary = async (reportData: string): Promise<string> => {
    const systemInstruction = "You are an expert HSE analyst. Your task is to generate a concise, 3-line executive summary of the provided incident report data. Focus on the core event, the immediate impact, and the primary root cause. The tone should be formal and professional.";
    const prompt = `Here is the data for an incident report. Please generate an executive summary:\n\n${reportData}`;
    return callGemini(prompt, systemInstruction);
}

export interface AiReportResponse {
  classification: string;
  wasFire: boolean;
  wasInjuryOrIllness: boolean;
  wasEnvironmentImpacted: boolean;
  severityCase: string;
  incidentCodes: string[];
  incidentNotes: string;
  evidencePresent: boolean;
  evidenceSuggestedItems: string[];
  evidenceSummary: string;
  summaryForUser: string;
  emailSubject: string;
  emailBody: string;
  pdfTitle: string;
  pdfBody: string;
}

export const generateReportFromNaturalLanguage = async (naturalLanguageText: string, classification: string): Promise<AiReportResponse> => {
    if (!API_KEY) {
        throw new Error("AI functionality is disabled. Please configure your API key.");
    }

    const systemInstruction = `
You are the EviroSafe HSE Reporting Assistant.

The app already has a fixed list of reporting types chosen by the user:

- "Incident"
- "Accident"
- "Near Miss"
- "Unsafe Act"
- "Unsafe Condition"
- "First Aid Case (FAC)"
- "Medical Treatment Case (MTC)"
- "Lost Time Injury (LTI)"
- "Restricted Work Case (RWC)"
- "Property / Asset Damage"
- "Environmental Incident"
- "Fire Event"
- "Leadership Event"
- "Positive Observation"

This value is provided to you as \`classification\`.

VERY IMPORTANT:
- Never change, rename, or guess another classification.
- Always copy \`classification\` exactly as it was given.
- Your job is ONLY to add HSE sub-information and helper text based on the user’s description.

------------------------------------------------
IDENTIFICATION (FIRE / INJURY / ENVIRONMENT)
------------------------------------------------

From the event description, set:

- \`wasFire\`: true if a fire, flames, smoke, or similar is clearly involved; otherwise false.
- \`wasInjuryOrIllness\`: true if any person suffered an injury or illness; otherwise false.
- \`wasEnvironmentImpacted\`: true if there was a spill, emission, contamination, wildlife impact, or similar; otherwise false.

------------------------------------------------
SEVERITY / CASE LEVEL
------------------------------------------------

Use the description PLUS the classification to set \`severityCase\`, using ONLY:

- "FAC"  = First Aid Case
- "MTC"  = Medical Treatment Case
- "LTI"  = Lost Time Injury
- "RWC"  = Restricted Work Case
- "NONE" = No injury / does not apply (e.g. Near Miss, Unsafe Condition, Property Damage only)

If the classification is already FAC / MTC / LTI / RWC, you should usually match it in \`severityCase\`.

------------------------------------------------
INCIDENT CODES (HIGH-LEVEL IMPACT)
------------------------------------------------

Set \`incidentCodes\` as a list using ONLY:

- "SFTY" = Safety / personal injury or potential for injury
- "FIRE" = Fire-related
- "ENVM" = Environmental impact
- "PROP" = Property / asset damage
- "TBD"  = Not enough information to classify

Rules:
- If \`wasInjuryOrIllness\` is true → include "SFTY".
- If \`wasFire\` is true → include "FIRE".
- If \`wasEnvironmentImpacted\` is true → include "ENVM".
- If the description clearly involves damage to equipment, tools, vehicles or facilities → include "PROP".
- More than one code is allowed (e.g. ["SFTY","PROP"]).
- If nothing is clear → ["TBD"].

\`incidentNotes\` should be 1–2 sentences explaining why you chose the codes.

------------------------------------------------
EVIDENCE (PHOTOS / VIDEOS / DOCUMENTS)
------------------------------------------------

You do NOT upload files. The app handles attachments.

From the description, you must:

- Set \`evidencePresent\`:
  - true if the user mentions photos, videos, CCTV, or documents are attached or available.
  - false if there is no mention.

- Fill \`evidenceSuggestedItems\`:
  - A list of 2–6 recommended evidence items that would help the investigation.
  - Examples:
    - "Photo of the damaged handrail"
    - "Photo of spill and cleanup area"
    - "CCTV clip showing the near miss"
    - "Medical report or clinic note"

- Fill \`evidenceSummary\`:
  - 1–3 sentences summarizing what the current or suggested evidence should show.

------------------------------------------------
SUMMARY AND EMAIL/PDF TEXT
------------------------------------------------

You must always produce helper text for the UI:

- \`summaryForUser\`:
  - 1–3 sentence simple summary: what happened, classification, any key flags (injury/fire/environment).

- \`emailSubject\`:
  - Clear subject line, for example:
    - "EviroSafe – Near Miss in Warehouse – 26/11/2025"
    - "EviroSafe – Lost Time Injury at Main Site"

- \`emailBody\`:
  - Short professional email including:
    - Classification
    - Site/area if available
    - Short event description
    - Key impacts (injury, fire, environment, property)
    - Note if evidence is attached or recommended.

- \`pdfTitle\`:
  - Title for the report PDF, e.g.:
    - "EviroSafe – Incident Report (Accident)"
    - "EviroSafe – Near Miss Report"
    - "EviroSafe – Leadership Event Report"

- \`pdfBody\`:
  - A more detailed narrative suitable for PDF:
    - What happened
    - Classification and severity
    - Impacts (injury, fire, environment, property)
    - Any immediate actions taken
    - Evidence summary.

------------------------------------------------
OUTPUT FORMAT
------------------------------------------------

Always respond in EXACTLY this JSON structure, no extra text:

{
  "classification": "",
  "wasFire": false,
  "wasInjuryOrIllness": false,
  "wasEnvironmentImpacted": false,
  "severityCase": "NONE",
  "incidentCodes": ["TBD"],
  "incidentNotes": "",
  "evidencePresent": false,
  "evidenceSuggestedItems": [],
  "evidenceSummary": "",
  "summaryForUser": "",
  "emailSubject": "",
  "emailBody": "",
  "pdfTitle": "",
  "pdfBody": ""
}

Rules:
- \`classification\` must always equal the input value exactly.
- \`severityCase\` must be one of: "FAC", "MTC", "LTI", "RWC", "NONE".
- \`incidentCodes\` can only contain: "SFTY", "FIRE", "ENVM", "PROP", "TBD" (at least one).
- \`evidencePresent\` is a boolean.
- Do NOT add any other fields.
    `;

    const prompt = `User Description: "${naturalLanguageText}"
classification: "${classification}"`;

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            classification: { type: Type.STRING },
            wasFire: { type: Type.BOOLEAN },
            wasInjuryOrIllness: { type: Type.BOOLEAN },
            wasEnvironmentImpacted: { type: Type.BOOLEAN },
            severityCase: { type: Type.STRING },
            incidentCodes: { type: Type.ARRAY, items: { type: Type.STRING } },
            incidentNotes: { type: Type.STRING },
            evidencePresent: { type: Type.BOOLEAN },
            evidenceSuggestedItems: { type: Type.ARRAY, items: { type: Type.STRING } },
            evidenceSummary: { type: Type.STRING },
            summaryForUser: { type: Type.STRING },
            emailSubject: { type: Type.STRING },
            emailBody: { type: Type.STRING },
            pdfTitle: { type: Type.STRING },
            pdfBody: { type: Type.STRING },
        },
        required: [
            "classification", "wasFire", "wasInjuryOrIllness", "wasEnvironmentImpacted",
            "severityCase", "incidentCodes", "incidentNotes", "evidencePresent",
            "evidenceSuggestedItems", "evidenceSummary", "summaryForUser",
            "emailSubject", "emailBody", "pdfTitle", "pdfBody"
        ]
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: schema,
              temperature: 0.2,
            }
        });

        const jsonString = response.text;
        if (!jsonString) throw new Error("Empty response from AI");
        return JSON.parse(jsonString) as AiReportResponse;

    } catch (error) {
        console.error("Error calling Gemini API for report parsing:", error);
        throw new Error("Failed to parse description with AI.");
    }
};

export const generateRamsContent = async (activityDescription: string): Promise<{ overview: string; competence: string; sequence_of_operations: { description: string; hazards: string[]; controls: string[] }[]; emergency_arrangements: string }> => {
    if (!API_KEY) {
        return Promise.resolve({ overview: 'AI functionality is disabled. Please configure your API key.', competence: '', sequence_of_operations: [], emergency_arrangements: '' });
    }

    const systemInstruction = "You are an expert Health, Safety, and Environment (HSE) professional. Your task is to generate a detailed Risk Assessment and Method Statement (RAMS) as a structured JSON object. The RAMS should include 'overview', 'competence', a 'sequence_of_operations' array with numbered steps (each with a 'description', an array of 'hazards', and an array of 'controls'), and 'emergency_arrangements'. The tone must be professional and aligned with construction site safety standards.";
    const prompt = `Please generate a RAMS for the following activity: ${activityDescription}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                    overview: { type: Type.STRING, description: 'A detailed overview of the activity, including scope and exclusions.' },
                    competence: { type: Type.STRING, description: 'A summary of resources, team roles, and required competencies.' },
                    sequence_of_operations: {
                        type: Type.ARRAY,
                        description: 'A list of numbered steps for the operation.',
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                description: { type: Type.STRING },
                                hazards: { type: Type.ARRAY, items: { type: Type.STRING } },
                                controls: { type: Type.ARRAY, items: { type: Type.STRING } }
                            },
                            required: ['description', 'hazards', 'controls']
                        }
                    },
                    emergency_arrangements: { type: Type.STRING, description: 'Details of emergency procedures and contacts.' }
                },
                required: ['overview', 'competence', 'sequence_of_operations', 'emergency_arrangements']
              },
              temperature: 0.6,
            }
        });

        const jsonString = response.text;
        if (!jsonString) throw new Error("Empty response from AI");
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error calling Gemini API for RAMS content:", error);
        throw new Error("Failed to generate AI content for RAMS.");
    }
};


export const generateTbtContent = async (topic: string): Promise<{ summary: string; hazards: string[]; controls: string[]; questions: string[] }> => {
    if (!API_KEY) {
        return Promise.resolve({ summary: 'AI functionality is disabled. Please configure your API key.', hazards: [], controls: [], questions: [] });
    }
    
    const prompt = `Generate a toolbox talk about "${topic}". Provide a summary, 3-5 key hazards, 3-5 key control measures, and 3 discussion questions to ask workers.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              systemInstruction: "You are an expert Health, Safety, and Environment (HSE) professional. Your task is to generate concise, practical, and engaging content for on-site toolbox talks. The output must be a valid JSON object.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: 'A brief overview of the topic.' },
                    hazards: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A list of potential hazards related to the topic.'},
                    controls: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A list of control measures to mitigate the hazards.'},
                    questions: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A list of engaging questions to ask the workers.'},
                },
                required: ['summary', 'hazards', 'controls', 'questions']
              },
              temperature: 0.7,
            }
        });

        const jsonString = response.text;
        if (!jsonString) throw new Error("Empty response from AI");
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error calling Gemini API for TBT content:", error);
        throw new Error("Failed to generate AI content.");
    }
};

export const generateCourseContent = async (title: string): Promise<{ syllabus: string; learning_objectives: string[] }> => {
    if (!API_KEY) {
        return Promise.resolve({ syllabus: 'AI functionality is disabled. Please configure your API key.', learning_objectives: [] });
    }
    
    const prompt = `Generate a training course outline for a corporate HSE course titled "${title}". The syllabus should be in markdown format, outlining key modules and topics. Provide 3-5 key learning objectives for what a participant will be able to do after the course.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              systemInstruction: "You are an expert curriculum designer for Health, Safety, and Environment (HSE) training. Your task is to generate a structured training course outline. The output must be a valid JSON object.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                    syllabus: { type: Type.STRING, description: 'A detailed course syllabus in markdown format, including modules and key topics.' },
                    learning_objectives: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A list of 3-5 key learning objectives for the course.'},
                },
                required: ['syllabus', 'learning_objectives']
              },
              temperature: 0.6,
            }
        });

        const jsonString = response.text;
        if (!jsonString) throw new Error("Empty response from AI");
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error calling Gemini API for Course content:", error);
        throw new Error("Failed to generate AI content for course.");
    }
};

export const translateText = async (text: string, targetLanguage: 'Arabic' | 'English'): Promise<string> => {
    const systemInstruction = `You are a professional translator. Translate the given text accurately to the target language. Do not add any commentary or extra text, only provide the translation.`;
    const prompt = `Translate the following text to ${targetLanguage}:\n\n---\n\n${text}`;
    return callGemini(prompt, systemInstruction);
};

export const generateAiRiskForecast = async (): Promise<{ risk_level: string, summary: string, recommendations: string[] }> => {
    if (!API_KEY) {
        return Promise.resolve({ risk_level: 'Unavailable', summary: 'AI functionality is disabled. Please configure your API key.', recommendations: [] });
    }

    const prompt = `
    Analyze the following data to provide a daily risk forecast for a construction site and return a JSON object:
    - Weather: 38°C, sunny, wind 25 km/h from NW.
    - Key Activities Today: Crane lifting on Tower A, facade work on Tower B, excavation near Gate 3.
    - Recent Incidents: 1 near miss (dropped object from height), 2 unsafe acts (PPE non-compliance).
    - PTW Active: 1x Lifting, 2x Work at Height, 1x Excavation.
    
    Based on this, determine today's overall risk level (Low, Medium, High, Critical), provide a short summary, and list 2-3 actionable safety recommendations.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              systemInstruction: "You are EviroSafe AI, a predictive safety analyst. Your task is to generate a daily risk forecast as a structured JSON object. Focus on potential risks and provide actionable recommendations.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                    risk_level: { type: Type.STRING, description: 'The overall risk level for the day (Low, Medium, High, or Critical).' },
                    summary: { type: Type.STRING, description: 'A concise summary of why this risk level was chosen.'},
                    recommendations: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A list of 2-3 actionable safety recommendations.'},
                },
                required: ['risk_level', 'summary', 'recommendations']
              },
              temperature: 0.8,
            }
        });

        const jsonString = response.text;
        if (!jsonString) throw new Error("Empty response from AI");
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error calling Gemini API for Risk Forecast:", error);
        throw new Error("Failed to generate AI risk forecast.");
    }
};

export const generateCertificationInsight = async (profile: any): Promise<{ nextLevelRecommendation: string; missingItems: string[] }> => {
    if (!API_KEY) {
        return Promise.resolve({ 
            nextLevelRecommendation: 'AI features disabled. Complete more training hours to progress.', 
            missingItems: ['Verify safe hours', 'Complete advanced training'] 
        });
    }

    const prompt = `
    Analyze this safety profile and return a JSON object with suggestions for the next certification level.
    Current Level: ${profile.level}
    Role: ${profile.role_title}
    Safe Hours: ${profile.safe_working_hours}
    Years Experience: ${profile.total_years_experience}
    Qualifications: ${JSON.stringify(profile.qualifications.map((q:any) => q.title))}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              systemInstruction: "You are EviroSafe Certification AI. Analyze the user profile against standard HSE competency frameworks (like IOSH/NEBOSH) and suggest what is needed for the next level.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                    nextLevelRecommendation: { type: Type.STRING, description: 'Advice on how to reach the next level.' },
                    missingItems: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'List of specific missing qualifications or milestones.'},
                },
                required: ['nextLevelRecommendation', 'missingItems']
              },
              temperature: 0.5,
            }
        });

        const jsonString = response.text;
        if (!jsonString) throw new Error("Empty response from AI");
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error calling Gemini API for Cert Insight:", error);
        return { 
            nextLevelRecommendation: 'Keep accumulating safe working hours and ensure all mandatory training is up to date.', 
            missingItems: ['Review training matrix'] 
        };
    }
};