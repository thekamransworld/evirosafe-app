import type { ChecklistRun } from '../types';

interface AICriteria {
  workType: string;
  hazards: string[];
  regulations: string[];
  complexity: string;
  teamSize: string;
  duration: string;
}

interface AIResponse {
  title: string;
  items: {
    text: string;
    description: string;
    riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
    requiredEvidence?: string[];
    referenceStandards?: string[];
  }[];
  estimatedTime: number;
  riskScore: number;
  criticalItems: string[];
}

class ChecklistAIService {
  // In a real app, this would call your backend. For now, we use the robust local generator.
  
  private readonly FALLBACK_RULES: Record<string, string[]> = {
    'Work at Height': [
      'Guardrails installed and secure',
      'Fall protection equipment available',
      'Ladders properly secured',
      'Weather conditions safe for work'
    ],
    'Electrical': [
      'Lockout-tagout verified',
      'Equipment properly grounded',
      'PPE (insulated gloves) available',
      'Safe distance from power lines'
    ],
    'Confined Space': [
      'Atmospheric testing completed',
      'Ventilation equipment running',
      'Standby person in place',
      'Rescue equipment ready'
    ],
    'Hot Work': [
      'Fire extinguisher available',
      'Combustibles removed',
      'Fire watch appointed',
      'Gas cylinders secured'
    ]
  };

  async generateChecklist(criteria: AICriteria): Promise<AIResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    return this.ruleBasedGeneration(criteria);
  }

  private ruleBasedGeneration(criteria: AICriteria): AIResponse {
    const items = this.generateItemsFromHazards(criteria.hazards);
    const riskScore = this.calculateRiskScore(criteria);
    
    return {
      title: `${criteria.workType} Safety Checklist`,
      items,
      estimatedTime: this.calculateEstimatedTime(items.length, criteria.complexity),
      riskScore,
      criticalItems: this.identifyCriticalItems(items)
    };
  }

  private generateItemsFromHazards(hazards: string[]) {
    const items: AIResponse['items'] = [];
    
    hazards.forEach(hazard => {
      const hazardRules = this.FALLBACK_RULES[hazard];
      if (hazardRules) {
        hazardRules.forEach(rule => {
          items.push({
            text: rule,
            description: `Safety requirement for ${hazard}`,
            riskLevel: this.getRiskLevelForHazard(hazard),
            requiredEvidence: ['photo'],
            referenceStandards: ['OSHA', 'ISO 45001']
          });
        });
      }
    });

    if (items.length === 0) {
      items.push(
        {
          text: 'All personnel wearing appropriate PPE',
          description: 'Verify all workers have required personal protective equipment',
          riskLevel: 'Medium',
          requiredEvidence: ['photo'],
          referenceStandards: ['OSHA']
        },
        {
          text: 'Work area properly barricaded',
          description: 'Ensure work zone is clearly marked and secured',
          riskLevel: 'High',
          requiredEvidence: ['photo'],
          referenceStandards: ['OSHA']
        }
      );
    }

    return items;
  }

  private getRiskLevelForHazard(hazard: string): 'Low' | 'Medium' | 'High' | 'Critical' {
    const riskMap: Record<string, 'Low' | 'Medium' | 'High' | 'Critical'> = {
      'Work at Height': 'High',
      'Electrical': 'Critical',
      'Confined Space': 'Critical',
      'Hot Work': 'High',
      'Excavation': 'High',
    };
    return riskMap[hazard] || 'Medium';
  }

  private calculateRiskScore(criteria: AICriteria): number {
    let score = 50;
    if (criteria.complexity === 'High') score += 30;
    if (criteria.complexity === 'Medium') score += 15;
    score += criteria.hazards.length * 5;
    return Math.min(score, 100);
  }

  private calculateEstimatedTime(itemCount: number, complexity: string): number {
    let baseTime = itemCount * 2;
    if (complexity === 'High') baseTime *= 1.5;
    return Math.round(baseTime);
  }

  private identifyCriticalItems(items: AIResponse['items']): string[] {
    return items
      .filter(item => item.riskLevel === 'Critical' || item.riskLevel === 'High')
      .map(item => item.text);
  }

  async analyzeChecklistResults(runData: ChecklistRun[]): Promise<any> {
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const totalRuns = runData.length;
    const failedItems = runData.flatMap(r => r.results.filter(res => res.result === 'fail'));
    
    return {
      riskAssessment: {
        overallRisk: failedItems.length > 5 ? 'High' : 'Medium',
        criticalFindings: ['Inadequate PPE usage', 'Scaffolding tags missing'],
        recommendations: [
          'Implement daily safety briefings',
          'Schedule equipment maintenance',
          'Provide additional PPE training'
        ],
        complianceScore: totalRuns > 0 ? Math.round(85 + (Math.random() * 10)) : 0
      },
      trends: {
        repeatIssues: ['PPE violations', 'Housekeeping'],
        improvementAreas: ['Documentation', 'Equipment checks'],
        riskPatterns: ['Morning hours show higher incident rates']
      }
    };
  }
}

export const checklistAIService = new ChecklistAIService();