import React, { useState } from 'react';
import { Plus, AlertTriangle, Trash2, AlertCircle } from 'lucide-react';
import { Inspection, InspectionFinding } from '../../../types';
import { Button } from '../../ui/Button';

interface Step6Props {
  formData: Partial<Inspection>;
  setFormData: (data: Partial<Inspection>) => void;
}

export const Step6Findings: React.FC<Step6Props> = ({ formData, setFormData }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFinding, setNewFinding] = useState<Partial<InspectionFinding>>({
    description: '',
    risk_level: 'Low',
    category: 'Unsafe Condition',
    status: 'open'
  });

  const handleAddFinding = () => {
    if (!newFinding.description) return;

    const finding: InspectionFinding = {
      ...newFinding as InspectionFinding,
      id: `find_${Date.now()}`,
      checklist_item_id: '',
      evidence_urls: [],
      corrective_action_required: newFinding.risk_level === 'High' || newFinding.risk_level === 'Critical',
      observation_category: 'work_environment',
      observation_type: 'unsafe_condition',
      immediate_controls: [],
      created_at: new Date().toISOString(),
      created_by: 'current_user'
    };

    setFormData({
      ...formData,
      findings: [...(formData.findings || []), finding]
    });
    
    // Reset form
    setNewFinding({
      description: '',
      risk_level: 'Low',
      category: 'Unsafe Condition',
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
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Category</label>
                    <select 
                        className="w-full p-2 rounded border dark:bg-gray-900 dark:border-gray-700"
                        value={newFinding.category}
                        onChange={e => setNewFinding({...newFinding, category: e.target.value as any})}
                    >
                        <option value="Unsafe Act">Unsafe Act</option>
                        <option value="Unsafe Condition">Unsafe Condition</option>
                        <option value="Documentation">Documentation</option>
                        <option value="Equipment">Equipment</option>
                        <option value="Environmental">Environmental</option>
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
                <div>
                    <label className="text-xs text-gray-500">Risk Level</label>
                    <select 
                        value={newFinding.risk_level}
                        onChange={e => setNewFinding({...newFinding, risk_level: e.target.value as any})}
                        className="w-full p-2 rounded border dark:bg-gray-900 dark:border-gray-700"
                    >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                    </select>
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
                        finding.risk_level === 'Critical' ? 'bg-red-100 text-red-600' :
                        finding.risk_level === 'High' ? 'bg-orange-100 text-orange-600' :
                        'bg-blue-100 text-blue-600'
                    }`}>
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-bold bg-gray-100 text-gray-700`}>
                                {finding.category}
                            </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mt-1">{finding.description}</p>
                        <div className="text-xs text-gray-500 mt-2 flex gap-4">
                            <span>Risk Level: <strong className="uppercase">{finding.risk_level}</strong></span>
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