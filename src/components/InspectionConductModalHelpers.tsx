import React, { useState, useMemo, useRef } from 'react';
import { Button } from './ui/Button';
import { 
  CheckCircle, XCircle, Clock, AlertCircle, Calendar, 
  Users, AlertTriangle, TrendingUp, FileText, BarChart3, 
  Mail, Printer, Download, Sparkles, X, Search 
} from 'lucide-react';
import type { 
  Inspection, InspectionFinding, OpeningMeetingData, ClosingMeetingData, 
  User, ImmediateControl, ObservationCategory, ObservationType 
} from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// --- ICONS ---
const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.624l-.259 1.035L16.38 20.624a3.375 3.375 0 00-2.455-2.455l-1.036-.259.259-1.035a3.375 3.375 0 002.456-2.456l.259-1.035.259 1.035a3.375 3.375 0 00-2.456 2.456z" /></svg>;

// --- FINDING FORM ---
export const FindingForm: React.FC<{
    finding: Partial<InspectionFinding>;
    onSave: (finding: InspectionFinding) => void;
    onCancel: () => void;
    users: User[];
    isSubmitted: boolean;
    activeUser: User | null;
}> = ({ finding, onSave, onCancel, users, isSubmitted, activeUser }) => {
    const [formData, setFormData] = useState({
        description: finding.description || '',
        risk_level: finding.risk_level || 'Low',
        category: finding.category || 'Unsafe Condition',
        observation_category: finding.observation_category || 'people_behaviors',
        observation_type: finding.observation_type || 'unsafe_condition',
        evidence_urls: finding.evidence_urls || [],
        corrective_action_required: finding.corrective_action_required ?? true,
        responsible_person_id: finding.responsible_person_id || '',
        due_date: finding.due_date || '',
        gps_tag: finding.gps_tag,
        immediate_controls: finding.immediate_controls || [],
        root_causes: finding.root_causes || [],
    });

    const [newImmediateControl, setNewImmediateControl] = useState('');
    const [showRootCauseModal, setShowRootCauseModal] = useState(false);

    const OBSERVATION_CATEGORIES = [
        { id: 'people_behaviors', label: 'People & Behaviors', icon: '👷', color: 'blue' },
        { id: 'equipment_machinery', label: 'Equipment & Machinery', icon: '🔧', color: 'orange' },
        { id: 'materials_substances', label: 'Materials & Substances', icon: '🧪', color: 'purple' },
        { id: 'work_environment', label: 'Work Environment', icon: '🏗️', color: 'green' },
        { id: 'documentation', label: 'Documentation', icon: '📋', color: 'gray' },
        { id: 'emergency_preparedness', label: 'Emergency Preparedness', icon: '🚨', color: 'red' },
        { id: 'management_systems', label: 'Management Systems', icon: '📊', color: 'indigo' },
    ];

    const handleAddImmediateControl = () => {
        if (!newImmediateControl.trim()) return;
        const control: ImmediateControl = {
            action: newImmediateControl,
            taken_by: activeUser?.id || '',
            taken_at: new Date().toISOString(),
            effectiveness: 'effective'
        };
        setFormData(prev => ({
            ...prev,
            immediate_controls: [...prev.immediate_controls, control]
        }));
        setNewImmediateControl('');
    };

    const handleSave = () => {
        if (!formData.description.trim()) {
            alert("Description is required");
            return;
        }
        
        const savedFinding: InspectionFinding = {
            ...finding,
            ...formData,
            id: finding.id || `find_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            status: 'open',
            created_at: finding.created_at || new Date().toISOString(),
            created_by: finding.created_by || activeUser?.id || '',
        } as InspectionFinding;
        
        onSave(savedFinding);
    };

    return (
        <div className="p-6 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-2xl shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
                <h4 className="font-bold text-xl text-gray-900 dark:text-white">
                    {finding.id ? 'Edit Finding' : 'Record New Finding'}
                </h4>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                    <CloseIcon className="w-5 h-5"/>
                </button>
            </div>
            
            {/* Observation Categories */}
            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                    Observation Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {OBSERVATION_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, observation_category: cat.id as ObservationCategory }))}
                            className={`p-4 rounded-xl border-2 transition-all ${formData.observation_category === cat.id ? `border-${cat.color}-500 bg-${cat.color}-50 dark:bg-${cat.color}-900/20` : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                        >
                            <div className="text-2xl mb-2">{cat.icon}</div>
                            <div className="text-xs font-medium">{cat.label}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Finding Type */}
            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                    Type of Observation
                </label>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { id: 'unsafe_act', label: 'Unsafe Act', color: 'red' },
                        { id: 'unsafe_condition', label: 'Unsafe Condition', color: 'orange' },
                        { id: 'non_compliance', label: 'Non-Compliance', color: 'yellow' },
                        { id: 'best_practice', label: 'Best Practice', color: 'green' },
                        { id: 'observation', label: 'Observation', color: 'blue' },
                    ].map(type => (
                        <button
                            key={type.id}
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, observation_type: type.id as ObservationType }))}
                            className={`p-3 rounded-lg border ${formData.observation_type === type.id ? `border-${type.color}-500 bg-${type.color}-50 dark:bg-${type.color}-900/20` : 'border-gray-200 dark:border-gray-700'}`}
                        >
                            <div className={`text-sm font-medium ${formData.observation_type === type.id ? `text-${type.color}-700 dark:text-${type.color}-300` : ''}`}>
                                {type.label}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Detailed Description
                </label>
                <textarea
                    value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Be specific: What did you observe? Where? When? Who was involved? What was the context?"
                    rows={4}
                    className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* Immediate Controls */}
            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <h5 className="font-bold text-red-700 dark:text-red-300">Immediate Controls Applied</h5>
                </div>
                
                <div className="flex gap-2 mb-3">
                    <input
                        type="text"
                        value={newImmediateControl}
                        onChange={e => setNewImmediateControl(e.target.value)}
                        placeholder="What immediate action was taken? (e.g., Barricaded area, Issued PPE, Stopped work...)"
                        className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                    <Button onClick={handleAddImmediateControl} size="sm">
                        Add Control
                    </Button>
                </div>

                {formData.immediate_controls.length > 0 && (
                    <div className="space-y-2">
                        {formData.immediate_controls.map((control, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                                <span className="text-sm">{control.action}</span>
                                <button
                                    onClick={() => setFormData(p => ({
                                        ...p,
                                        immediate_controls: p.immediate_controls.filter((_, i) => i !== index)
                                    }))}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Risk & Responsibility */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Risk Level
                    </label>
                    <select 
                        value={formData.risk_level} 
                        onChange={e => setFormData(p => ({ ...p, risk_level: e.target.value as any }))} 
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                    >
                        <option value="Low">🟢 Low Risk</option>
                        <option value="Medium">🟡 Medium Risk</option>
                        <option value="High">🔴 High Risk</option>
                        <option value="Critical">⚫ Critical Risk</option>
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Assign To
                    </label>
                    <select 
                        value={formData.responsible_person_id} 
                        onChange={e => setFormData(p => ({ ...p, responsible_person_id: e.target.value }))} 
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                    >
                        <option value="">Select responsible person</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Due Date
                    </label>
                    <input
                        type="date"
                        value={formData.due_date}
                        onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                    />
                </div>
            </div>

            {/* Root Cause Button */}
            {formData.observation_type !== 'best_practice' && (
                <div className="flex justify-between items-center">
                    <Button
                        variant="secondary"
                        onClick={() => setShowRootCauseModal(true)}
                        leftIcon={<Search className="w-4 h-4" />}
                    >
                        Root Cause Analysis (5 Whys)
                    </Button>
                </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <Button variant="secondary" onClick={onCancel}>
                    Cancel
                </Button>
                <Button 
                    onClick={handleSave}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                >
                    Save Finding
                </Button>
            </div>

            {/* Root Cause Modal */}
            {showRootCauseModal && (
                <RootCauseAnalysisModal
                    finding={formData}
                    onSave={(analysis) => {
                        setFormData(p => ({ ...p, root_causes: analysis.systemic_issues }));
                        setShowRootCauseModal(false);
                    }}
                    onClose={() => setShowRootCauseModal(false)}
                />
            )}
        </div>
    );
};

// --- ROOT CAUSE ANALYSIS MODAL ---
export const RootCauseAnalysisModal: React.FC<{
  finding: any;
  onSave: (analysis: {
    why1: string;
    why2: string;
    why3: string;
    why4: string;
    why5: string;
    systemic_issues: string[];
    recommended_actions: string[];
  }) => void;
  onClose: () => void;
}> = ({ finding, onSave, onClose }) => {
  const [analysis, setAnalysis] = useState({
    why1: '',
    why2: '',
    why3: '',
    why4: '',
    why5: '',
    systemic_issues: [] as string[],
    recommended_actions: [] as string[],
  });

  const [newAction, setNewAction] = useState('');

  const SYSTEMIC_ISSUES = [
    'Training / Competence',
    'Procedures / Work Instructions',
    'Supervision / Leadership',
    'Communication',
    'Equipment Design / Maintenance',
    'Work Environment',
    'Resource Allocation',
    'Time Pressure',
    'Organizational Culture',
    'Contractor Management',
  ];

  const handleAddAction = () => {
    if (newAction.trim()) {
      setAnalysis(prev => ({
        ...prev,
        recommended_actions: [...prev.recommended_actions, newAction.trim()]
      }));
      setNewAction('');
    }
  };

  const handleSubmit = () => {
    if (!analysis.why1.trim()) {
      alert('Please complete at least the first "Why"');
      return;
    }
    onSave(analysis);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b dark:border-gray-800">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Root Cause Analysis (5 Whys)</h2>
              <p className="text-gray-600 dark:text-gray-400">Dig deep to find the systemic cause</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-8">
          {/* Finding Summary */}
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-bold text-red-700 dark:text-red-300">Finding Being Analyzed</h3>
            </div>
            <p className="text-gray-800 dark:text-gray-200">{finding.description}</p>
          </div>

          {/* 5 Whys Analysis */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">The 5 Whys Method</h3>
            
            <div className="space-y-4">
              {[
                { level: 1, label: 'Why 1: Direct Cause', placeholder: 'What was the immediate cause?' },
                { level: 2, label: 'Why 2: Underlying Cause', placeholder: 'Why did that happen?' },
                { level: 3, label: 'Why 3: Process Issue', placeholder: 'Why was the system inadequate?' },
                { level: 4, label: 'Why 4: Management Issue', placeholder: 'Why did management allow this?' },
                { level: 5, label: 'Why 5: Root Cause', placeholder: 'What is the fundamental/systemic cause?' },
              ].map((item, index) => (
                <div key={index} className={`p-4 border-l-4 ${index === 4 ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'} rounded-r-lg`}>
                  <label className="block text-sm font-bold mb-2">{item.label}</label>
                  <input
                    type="text"
                    value={analysis[`why${index + 1}` as keyof typeof analysis] as string}
                    onChange={(e) => setAnalysis(prev => ({ ...prev, [`why${index + 1}`]: e.target.value }))}
                    placeholder={item.placeholder}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Systemic Issues */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Systemic Issues Identified</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SYSTEMIC_ISSUES.map(issue => (
                <button
                  key={issue}
                  type="button"
                  onClick={() => {
                    setAnalysis(prev => ({
                      ...prev,
                      systemic_issues: prev.systemic_issues.includes(issue)
                        ? prev.systemic_issues.filter(i => i !== issue)
                        : [...prev.systemic_issues, issue]
                    }));
                  }}
                  className={`p-3 border rounded-lg text-sm text-left transition-all ${analysis.systemic_issues.includes(issue)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
                  }`}
                >
                  {issue}
                </button>
              ))}
            </div>
          </div>

          {/* Recommended Actions */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Recommended Preventive Actions</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                placeholder="Enter recommended action..."
                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg"
                onKeyPress={(e) => e.key === 'Enter' && handleAddAction()}
              />
              <Button onClick={handleAddAction}>Add</Button>
            </div>
            
            {analysis.recommended_actions.length > 0 && (
              <div className="space-y-2">
                {analysis.recommended_actions.map((action, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                    <span className="text-sm">{action}</span>
                    <button
                      onClick={() => setAnalysis(prev => ({
                        ...prev,
                        recommended_actions: prev.recommended_actions.filter((_, i) => i !== index)
                      }))}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t dark:border-gray-800 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 text-white">
            Save Analysis & Apply to Finding
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- CLOSING MEETING SECTION ---
export const ClosingMeetingSection: React.FC<{
  inspection: Inspection;
  findings: InspectionFinding[];
  onComplete: (data: ClosingMeetingData) => void;
  onGenerateReport: () => void;
  isEditable: boolean;
}> = ({
  inspection,
  findings,
  onComplete,
  onGenerateReport,
  isEditable
}) => {
  const [closingData, setClosingData] = useState<ClosingMeetingData>({
    conducted_at: new Date().toISOString(),
    key_findings_summary: '',
    immediate_actions_agreed: '',
    follow_up_required: false,
    next_inspection_date: '',
    supervisor_acknowledged: false,
    recommendations: '',
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const critical = findings.filter(f => f.risk_level === 'Critical' || f.risk_level === 'High').length;
    const medium = findings.filter(f => f.risk_level === 'Medium').length;
    const low = findings.filter(f => f.risk_level === 'Low').length;
    const open = findings.filter(f => f.status === 'open').length;
    const closed = findings.filter(f => f.status === 'closed').length;
    
    return { critical, medium, low, total: findings.length, open, closed };
  }, [findings]);

  // Find top categories
  const topCategories = useMemo(() => {
    const categories: Record<string, number> = {};
    findings.forEach(f => {
      categories[f.observation_category] = (categories[f.observation_category] || 0) + 1;
    });
    return Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [findings]);

  const handleSubmit = () => {
    if (!closingData.supervisor_acknowledged) {
      alert('Supervisor acknowledgement is required');
      return;
    }
    if (!closingData.key_findings_summary.trim()) {
      alert('Please provide a findings summary');
      return;
    }
    onComplete(closingData);
  };

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl border border-green-200 dark:border-green-800">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-green-900 dark:text-green-200">Closing Meeting</h2>
          <p className="text-green-700 dark:text-green-300">Phase 3: Review & Action Planning</p>
        </div>
      </div>

      {/* Inspection Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border text-center">
          <div className="text-3xl font-bold text-red-600">{stats.critical}</div>
          <div className="text-sm text-gray-600">Critical/High Findings</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border text-center">
          <div className="text-3xl font-bold text-orange-600">{stats.medium}</div>
          <div className="text-sm text-gray-600">Medium Findings</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border text-center">
          <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Findings</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border text-center">
          <div className="text-3xl font-bold text-green-600">{stats.closed}</div>
          <div className="text-sm text-gray-600">Closed Actions</div>
        </div>
      </div>

      {/* Top Risk Areas */}
      {topCategories.length > 0 && (
        <div className="mb-6">
          <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Top Risk Categories
          </h4>
          <div className="space-y-2">
            {topCategories.map(([category, count]) => (
              <div key={category} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg border">
                <span className="capitalize">{category.replace('_', ' ')}</span>
                <span className="font-bold text-red-600">{count} findings</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meeting Content */}
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            Key Findings Summary
          </label>
          <textarea
            value={closingData.key_findings_summary}
            onChange={(e) => setClosingData({...closingData, key_findings_summary: e.target.value})}
            disabled={!isEditable}
            rows={4}
            className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800"
            placeholder="Summarize the main findings, trends identified, and overall assessment..."
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            Immediate Actions Agreed (within 24 hours)
          </label>
          <textarea
            value={closingData.immediate_actions_agreed}
            onChange={(e) => setClosingData({...closingData, immediate_actions_agreed: e.target.value})}
            disabled={!isEditable}
            rows={3}
            className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800"
            placeholder="What immediate actions will be taken? Who is responsible?"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            Recommendations for Improvement
          </label>
          <textarea
            value={closingData.recommendations}
            onChange={(e) => setClosingData({...closingData, recommendations: e.target.value})}
            disabled={!isEditable}
            rows={3}
            className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800"
            placeholder="Systemic improvements, training needs, process changes..."
          />
        </div>

        {/* Follow-up Planning */}
        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-yellow-600" />
              <h4 className="font-bold text-yellow-700 dark:text-yellow-300">Follow-up Planning</h4>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={closingData.follow_up_required}
                onChange={(e) => setClosingData({...closingData, follow_up_required: e.target.checked})}
                disabled={!isEditable}
                className="rounded"
              />
              <span className="text-sm">Follow-up inspection required</span>
            </label>
          </div>
          
          {closingData.follow_up_required && (
            <div className="mt-3">
              <label className="block text-sm font-medium mb-2">Next inspection date</label>
              <input
                type="date"
                value={closingData.next_inspection_date}
                onChange={(e) => setClosingData({...closingData, next_inspection_date: e.target.value})}
                disabled={!isEditable}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
        </div>

        {/* Supervisor Acknowledgement */}
        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={closingData.supervisor_acknowledged}
                  onChange={(e) => setClosingData({...closingData, supervisor_acknowledged: e.target.checked})}
                  disabled={!isEditable}
                  className="rounded"
                />
                <span className="font-bold">Supervisor Acknowledgement</span>
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                I acknowledge receipt of these findings and accept responsibility for implementing the agreed actions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-6 border-t border-green-200 dark:border-green-800 flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onGenerateReport}
          variant="secondary"
          leftIcon={<FileText className="w-5 h-5" />}
          className="flex-1"
        >
          Generate Inspection Report
        </Button>
        
        {isEditable && (
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            leftIcon={<CheckCircle className="w-5 h-5" />}
            disabled={!closingData.supervisor_acknowledged}
          >
            Complete Inspection & Close
          </Button>
        )}
      </div>
    </div>
  );
};

// --- INSPECTION REPORT GENERATOR ---
export const InspectionReportGenerator: React.FC<{
  inspection: Inspection;
  findings: InspectionFinding[];
  openingMeeting: any;
  closingMeeting: any;
  onEmail?: (emailData: any) => void;
}> = ({
  inspection,
  findings,
  openingMeeting,
  closingMeeting,
  onEmail
}) => {
  const reportRef = useRef<HTMLDivElement>(null);

  // Calculate statistics
  const stats = {
    total: findings.length,
    critical: findings.filter(f => f.risk_level === 'Critical' || f.risk_level === 'High').length,
    medium: findings.filter(f => f.risk_level === 'Medium').length,
    low: findings.filter(f => f.risk_level === 'Low').length,
    open: findings.filter(f => f.status === 'open').length,
    closed: findings.filter(f => f.status === 'closed').length,
    byCategory: findings.reduce((acc, f) => {
      acc[f.observation_category] = (acc[f.observation_category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`inspection-report-${inspection.id}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Report Actions */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border shadow-sm">
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={generatePDF}
            leftIcon={<Download className="w-4 h-4" />}
            variant="secondary"
          >
            Download PDF
          </Button>
          <Button
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
            variant="secondary"
          >
            Print Report
          </Button>
          <Button
            onClick={() => onEmail?.({
              subject: `Inspection Report: ${inspection.title}`,
              body: `Please find attached the inspection report.`,
              attachments: [{ type: 'report', id: inspection.id }]
            })}
            leftIcon={<Mail className="w-4 h-4" />}
            variant="secondary"
          >
            Email Report
          </Button>
        </div>
      </div>

      {/* Report Preview */}
      <div ref={reportRef} className="bg-white p-8 rounded-xl border shadow-lg">
        {/* Header */}
        <div className="text-center mb-8 border-b pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">INSPECTION REPORT</h1>
          <h2 className="text-xl text-gray-700">{inspection.title}</h2>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-semibold">Report ID:</span> {inspection.id}
            </div>
            <div>
              <span className="font-semibold">Date:</span> {new Date(inspection.schedule_at || inspection.created_at || '').toLocaleDateString()}
            </div>
            <div>
              <span className="font-semibold">Location:</span> {inspection.location_area || 'N/A'}
            </div>
            <div>
              <span className="font-semibold">Status:</span> {inspection.status}
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" /> Executive Summary
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700">{closingMeeting?.key_findings_summary || 'No summary available'}</p>
          </div>
        </div>

        {/* Key Statistics */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Inspection Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
              <div className="text-sm text-gray-600">Critical/High Findings</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.medium}</div>
              <div className="text-sm text-gray-600">Medium Findings</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Findings</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{stats.closed}</div>
              <div className="text-sm text-gray-600">Closed Actions</div>
            </div>
          </div>
        </div>

        {/* Findings by Category */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Findings by Category</h3>
          <div className="space-y-2">
            {Object.entries(stats.byCategory).map(([category, count]) => (
              <div key={category} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="capitalize">{category.replace('_', ' ')}</span>
                <span className="font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Findings */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Detailed Findings
          </h3>
          <div className="space-y-4">
            {findings.map((finding, index) => (
              <div key={finding.id} className="border-l-4 border-red-500 pl-4 py-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold">Finding #{index + 1}: {finding.description}</h4>
                    <div className="text-sm text-gray-600 mt-1">
                      Category: {finding.observation_category} | 
                      Risk: <span className="font-bold text-red-600">{finding.risk_level}</span> | 
                      Status: {finding.status}
                    </div>
                  </div>
                </div>
                {finding.immediate_controls?.length > 0 && (
                  <div className="mt-2 text-sm text-green-700">
                    <span className="font-semibold">Immediate Controls:</span> {finding.immediate_controls.map(c => c.action).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {closingMeeting?.recommendations && (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">Recommendations</h3>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-700 whitespace-pre-line">{closingMeeting.recommendations}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold mb-2">Inspection Team</h4>
              <p className="text-sm text-gray-600">Lead Inspector: {inspection.person_responsible?.name || 'N/A'}</p>
              <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
            </div>
            <div>
              <h4 className="font-bold mb-2">Acknowledgement</h4>
              <p className="text-sm text-gray-600">
                {closingMeeting?.supervisor_acknowledged 
                  ? 'Acknowledged by area supervisor'
                  : 'Pending acknowledgement'}
              </p>
              <p className="text-sm text-gray-600">Report Generated: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- FOLLOW UP SECTION ---
export const FollowUpSection: React.FC<{
  inspection: Inspection;
  findings: InspectionFinding[];
  onVerify: (findingId: string, verification: any) => void;
  onScheduleFollowUp: (date: string) => void;
}> = ({
  inspection,
  findings,
  onVerify,
  onScheduleFollowUp
}) => {
  const [verificationDates, setVerificationDates] = useState<Record<string, string>>({});
  const [followUpDate, setFollowUpDate] = useState(
    inspection.scheduled_follow_up || ''
  );

  const openFindings = findings.filter(f => 
    f.status === 'open' || f.status === 'in_progress'
  );
  
  const verifiedFindings = findings.filter(f => 
    f.verification_data?.verified_by
  );

  const handleVerify = (findingId: string, effective: boolean) => {
    const verification = {
      verified_by: 'current_user_id', // Replace with actual user
      verified_at: new Date().toISOString(),
      effective,
      notes: effective ? 'Action verified as effective' : 'Action not effective, requires rework',
      evidence_urls: [],
    };
    onVerify(findingId, verification);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-2xl border border-purple-200 dark:border-purple-800">
        <h2 className="text-2xl font-bold text-purple-900 dark:text-purple-200 mb-2">
          Follow-up & Verification
        </h2>
        <p className="text-purple-700 dark:text-purple-300">Phase 4: Action Verification</p>
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border text-center">
          <div className="text-3xl font-bold text-blue-600">{openFindings.length}</div>
          <div className="text-sm text-gray-600">Pending Verification</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border text-center">
          <div className="text-3xl font-bold text-green-600">{verifiedFindings.length}</div>
          <div className="text-sm text-gray-600">Verified</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border text-center">
          <div className="text-3xl font-bold text-orange-600">
            {findings.length > 0 ? Math.round((verifiedFindings.length / findings.length) * 100) : 0}%
          </div>
          <div className="text-sm text-gray-600">Verification Rate</div>
        </div>
      </div>

      {/* Open Findings for Verification */}
      {openFindings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Findings Pending Verification
          </h3>
          
          <div className="space-y-3">
            {openFindings.map(finding => (
              <div key={finding.id} className="p-4 bg-white dark:bg-gray-800 rounded-xl border">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold">{finding.description}</h4>
                    <div className="text-sm text-gray-600 mt-1">
                      Assigned to: {finding.responsible_person?.name} | 
                      Due: {finding.due_date ? new Date(finding.due_date).toLocaleDateString() : 'No date'}
                    </div>
                    {finding.immediate_controls?.length > 0 && (
                      <div className="mt-2 text-sm text-green-700">
                        <span className="font-semibold">Immediate controls applied:</span> {finding.immediate_controls.map(c => c.action).join(', ')}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={verificationDates[finding.id] || ''}
                      onChange={(e) => setVerificationDates(prev => ({
                        ...prev,
                        [finding.id]: e.target.value
                      }))}
                      className="p-2 border rounded text-sm"
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleVerify(finding.id, true)}
                      leftIcon={<CheckCircle className="w-4 h-4" />}
                    >
                      Verify Effective
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleVerify(finding.id, false)}
                      leftIcon={<XCircle className="w-4 h-4" />}
                    >
                      Not Effective
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verified Findings */}
      {verifiedFindings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Verified Findings
          </h3>
          
          <div className="space-y-2">
            {verifiedFindings.map(finding => (
              <div key={finding.id} className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{finding.description}</span>
                  <span className="text-sm text-green-600">
                    Verified on {new Date(finding.verification_data!.verified_at).toLocaleDateString()}
                  </span>
                </div>
                {finding.verification_data?.notes && (
                  <p className="text-sm text-gray-600 mt-1">{finding.verification_data.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Next Follow-up */}
      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <h4 className="font-bold text-blue-900 dark:text-blue-200">Schedule Next Follow-up</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">Set date for verification completion</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="p-2 border rounded"
              min={new Date().toISOString().split('T')[0]}
            />
            <Button
              onClick={() => onScheduleFollowUp(followUpDate)}
              disabled={!followUpDate}
            >
              Schedule
            </Button>
          </div>
        </div>
      </div>

      {/* Completion Status */}
      {openFindings.length === 0 && (
        <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-xl border border-green-200 dark:border-green-800 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-green-900 dark:text-green-200">All Findings Verified!</h3>
          <p className="text-green-700 dark:text-green-300 mt-2">
            All corrective actions have been verified as effective. This inspection can now be closed.
          </p>
        </div>
      )}
    </div>
  );
};

// --- AI RISK ANALYSIS ---
export const AiRiskAnalysis: React.FC<{
  findings: InspectionFinding[];
  onAnalysisComplete: (analysis: any) => void;
}> = ({ findings, onAnalysisComplete }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any | null>(null);

  const analyzeFindings = async () => {
    setIsAnalyzing(true);
    
    try {
      // Mock AI analysis for now
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockAnalysis = {
        primaryCategory: 'People & Behaviors',
        trend: 'Increasing unsafe acts in high-risk areas',
        priorityArea: 'PPE Compliance',
        recommendations: [
          'Conduct refresher training on PPE usage',
          'Increase supervision during shift changes',
          'Implement positive reinforcement program'
        ]
      };
      
      setAnalysis(mockAnalysis);
      onAnalysisComplete(mockAnalysis);
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-lg mb-6 border border-purple-100 dark:border-purple-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-purple-600" />
          <h4 className="font-bold text-purple-900 dark:text-purple-200">AI Risk Analysis</h4>
        </div>
        <Button 
          size="sm" 
          onClick={analyzeFindings} 
          disabled={isAnalyzing || findings.length === 0}
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Trends'}
        </Button>
      </div>
      
      {analysis && (
        <div className="space-y-3 animate-fade-in">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-2 bg-white dark:bg-gray-800 rounded border">
              <div className="text-xs text-gray-500">Primary Risk Category</div>
              <div className="font-bold text-sm">{analysis.primaryCategory}</div>
            </div>
            <div className="p-2 bg-white dark:bg-gray-800 rounded border">
              <div className="text-xs text-gray-500">Trend Detected</div>
              <div className="font-bold text-sm">{analysis.trend}</div>
            </div>
            <div className="p-2 bg-white dark:bg-gray-800 rounded border">
              <div className="text-xs text-gray-500">Priority Area</div>
              <div className="font-bold text-sm">{analysis.priorityArea}</div>
            </div>
          </div>
          
          {analysis.recommendations && (
            <div className="p-3 bg-white dark:bg-gray-800 rounded border">
              <div className="text-sm font-medium mb-2">AI Recommendations</div>
              <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
                {analysis.recommendations.map((rec: string, i: number) => (
                  <li key={i}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};