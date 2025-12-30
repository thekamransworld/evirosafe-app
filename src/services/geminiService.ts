export const generateResponse = async (prompt: string): Promise<string> => {
  // Simulate network delay for realism
  await new Promise(resolve => setTimeout(resolve, 1500));

  const lower = prompt.toLowerCase();

  if (lower.includes('incident') || lower.includes('accident') || lower.includes('collision')) {
    return `### 🚨 Incident Analysis
**Severity:** High
**Root Cause (Potential):** Fatigue & Environmental Conditions

**Analysis:**
The combination of a **double shift** (fatigue) and **wet floor** (environmental hazard) suggests a failure in both administrative controls and housekeeping.

**Recommended Actions:**
1. **Immediate:** Suspend forklift operations in wet areas.
2. **Investigation:** Interview supervisor regarding shift scheduling.
3. **Control:** Install anti-slip mats or dry the area immediately.`;
  }

  if (lower.includes('risk') || lower.includes('assess')) {
    return `### 🛡️ Risk Assessment Generated
**Activity:** ${prompt.replace('risk', '').replace('assessment', '').trim() || 'General Work'}

| Hazard | Risk Level | Control Measure |
| :--- | :--- | :--- |
| **Gravity** | High | 100% Tie-off policy, inspect harness. |
| **Motion** | Medium | Barricade swing radius. |
| **Electrical** | Critical | LOTO verification required. |

*Note: This is a generated draft. Please verify with a certified officer.*`;
  }

  if (lower.includes('tbt') || lower.includes('toolbox')) {
    return `### 🗣️ Toolbox Talk: ${prompt.replace('tbt', '').trim() || 'Safety First'}

**Topic:** Situational Awareness
**Duration:** 5 Minutes

**Key Points:**
1. Look up, down, and around before starting.
2. Identify escape routes.
3. Report "Near Misses" immediately—they are free lessons.

**Question for Crew:**
"What is the first thing you do if you see an unsafe condition?"`;
  }

  // Default response
  return `I have analyzed your request regarding **"${prompt}"**.

- **Compliance Check:** ISO 45001 standards applied.
- **Safety Database:** No similar incidents in the last 48 hours.
- **Suggestion:** Ensure all permits are active before proceeding.`;
};

export const getPredictiveInsights = async () => {
    return [
        { id: 1, title: 'High Wind Warning', probability: '85%', impact: 'Crane Ops', action: 'Suspend Lifting > 10m' },
        { id: 2, title: 'Fatigue Risk', probability: '60%', impact: 'Night Shift', action: 'Extra breaks required' },
        { id: 3, title: 'Equipment Failure', probability: 'Low', impact: 'Excavator 04', action: 'Maintenance due in 2 days' },
    ];
};

// --- MISSING FUNCTION RESTORED ---
export const generateAiRiskForecast = async () => {
    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
        risk_level: 'Medium',
        summary: 'Moderate risk detected due to high temperatures and ongoing lifting operations.',
        recommendations: ['Enforce hydration breaks', 'Check lifting gear certification', 'Monitor wind speeds']
    };
};

// Keep existing exports for compatibility
export const generateSafetyReport = async (prompt: string) => ({ description: await generateResponse(prompt), riskLevel: 'Medium', rootCause: 'TBD', recommendation: 'Review procedures' });
export const generateRamsContent = async (prompt: string) => ({ overview: await generateResponse(prompt), competence: "Standard", sequence_of_operations: [], emergency_arrangements: "Standard" });
export const generateTbtContent = async (title: string) => ({ summary: await generateResponse(title), hazards: [], controls: [], questions: [] });
export const generateCourseContent = async (title: string) => ({ syllabus: await generateResponse(title), learning_objectives: [] });
export const generateReportSummary = async (json: string) => generateResponse("Summarize this report");
export const generateCertificationInsight = async (profile: any) => ({ nextLevelRecommendation: "Continue training.", missingItems: [] });
export const translateText = async (text: string, lang: string) => `[${lang}] ${text}`;