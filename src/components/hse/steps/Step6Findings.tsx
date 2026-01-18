import React, { useState } from 'react';
import { Plus, AlertTriangle, Trash2, AlertCircle } from 'lucide-react';
import { HSEInspection, HSEFinding } from '../../../types';
import { Button } from '../../ui/Button';

interface Step6Props {
  formData: Partial<HSEInspection>;
  setFormData: (data: Partial<HSEInspection>) => void;
}

export const Step6Findings: React.FC<Step6Props> = ({ formData, setFormData }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFinding, setNewFinding] = useState<Partial<HSEFinding>>({
    description: '',
    risk_assessment: { severity: 1, likelihood: 1, risk_level: 'low', risk_score: 1, people_at_risk: 1, potential_consequences: [] },
    type: 'non_conformity',
    status: 'open'
  });

  const calculateRisk = (sev: number, like: number) => {
    const score = sev * like;
    let level = 'low';
    if (score >= 15) level = 'extreme';
    else if (score >= 10) level = 'high';
    else if (score >= 5) level = 'medium';
    return { score, level };
  };

  const handleAddFinding = () => {
    if (!newFinding.description) return;

    const risk = calculateRisk(newFinding.risk_assessment!.severity, newFinding.risk_assessment!.likelihood);
    
    const finding: HSEFinding = {
      ...newFinding as HSEFinding,
      id: `find_${Date.now()}`,
      finding_number: `F-${(formData.findings?.length || 0) + 1}`,
      risk_assessment: {
        ...newFinding.risk_assessment!,
        risk_score: risk.score,
        risk_level: risk.level as any
      },
      created_at: new Date().toISOString(), // FIX: Use ISO string
      updated_at: new Date().toISOString(), // FIX: Use ISO string
      created_by: 'current_user',
      evidence_ids: [],
      corrective_action_required: risk.score > 5,
      immediate_controls: [],
      root_causes: [],
      evidence_urls: [],
      category: 'General',
      observation_category: 'people_behaviors',
      observation_type: 'unsafe_condition',
      risk_level: risk.level === 'extreme' ? 'Critical' : risk.level === 'high' ? 'High' : risk.level === 'medium' ? 'Medium' : 'Low'
    };

    setFormData({
      ...formData,
      findings: [...(formData.findings || []), finding]
    });
    
    setNewFinding({
      description: '',
      risk_assessment: { severity: 1, likelihood: 1, risk_level: 'low', risk_score: 1, people_at_risk: 1, potential_consequences: [] },
      type: 'non_conformity',
      status: 'open'
    });
    setShowAddForm(false);
  };

  const removeFinding = (id: string) => {
    setFormData({
      ...formData,
      findings: formData.findings?.filter(f => f.id !== id)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Findings & Observations</h3>
            <p className="text-sm text-gray-500">Record non-conformities, hazards, or positive observations.</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Finding
        </Button>
      </div>

      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 animate-fade-in-up">
            <h4 className="font-bold mb-4 dark:text-white">New Finding Details</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Type</label>
                    <select 
                        className="w-full p-2 rounded border dark:bg-gray-900 dark:border-gray-700"
                        value={newFinding.type}
                        onChange={e => setNewFinding({...newFinding, type: e.target.value as any})}
                    >
                        <option value="non_conformity">Non-Conformity</option>
                        <option value="observation">Observation</option>
                        <option value="opportunity_for_improvement">Opportunity for Improvement</option>
                        <option value="compliment">Positive Compliment</option>
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Description</label>
                    <input 
                        type="text" 
                        className="w-full p-2 rounded border dark:bg-gray-900 dark:border-gray-700"
                        placeholder="Describe the hazard..."
                        value={newFinding.description}
                        onChange={e => setNewFinding({...newFinding, description: e.target.value})}
                    />
                </div>
            </div>

            <div className="mb-4">
                <h5 className="text-sm font-bold mb-2 dark:text-gray-300">Risk Assessment</h5>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-500">Severity (1-5)</label>
                        <input 
                            type="range" min="1" max="5" 
                            value={newFinding.risk_assessment?.severity}
                            onChange={e => setNewFinding({...newFinding, risk_assessment: {...newFinding.risk_assessment!, severity: parseInt(e.target.value) as any}})}
                            className="w-full"
                        />
                        <div className="text-center font-bold">{newFinding.risk_assessment?.severity}</div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Likelihood (1-5)</label>
                        <input 
                            type="range" min="1" max="5" 
                            value={newFinding.risk_assessment?.likelihood}
                            onChange={e => setNewFinding({...newFinding, risk_assessment: {...newFinding.risk_assessment!, likelihood: parseInt(e.target.value) as any}})}
                            className="w-full"
                        />
                        <div className="text-center font-bold">{newFinding.risk_assessment?.likelihood}</div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowAddForm(false)}>Cancel</Button>
                <Button onClick={handleAddFinding}>Save Finding</Button>
            </div>
        </div>
      )}

      <div className="space-y-3">
        {(formData.findings || []).map((finding) => (
            <div key={finding.id} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg flex justify-between items-start hover:shadow-md transition-shadow">
                <div className="flex gap-3">
                    <div className={`p-2 rounded-lg h-fit ${
                        finding.risk_assessment?.risk_level === 'extreme' ? 'bg-red-100 text-red-600' :
                        finding.risk_assessment?.risk_level === 'high' ? 'bg-orange-100 text-orange-600' :
                        'bg-blue-100 text-blue-600'
                    }`}>
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-white">{finding.finding_number}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-bold ${
                                finding.type === 'non_conformity' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                            }`}>{finding.type?.replace(/_/g, ' ')}</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mt-1">{finding.description}</p>
                        <div className="text-xs text-gray-500 mt-2 flex gap-4">
                            <span>Risk Score: <strong>{finding.risk_assessment?.risk_score}</strong></span>
                            <span>Level: <strong className="uppercase">{finding.risk_assessment?.risk_level}</strong></span>
                        </div>
                    </div>
                </div>
                <button onClick={() => removeFinding(finding.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
        ))}
        {(!formData.findings || formData.findings.length === 0) && !showAddForm && (
            <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No findings recorded yet.</p>
            </div>
        )}
      </div>
    </div>
  );
};