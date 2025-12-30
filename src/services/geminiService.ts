// src/services/geminiService.ts

// --- MOCK AI SERVICE ---
// Simulates intelligent responses for the Chat Interface

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