import React, { useState } from 'react';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts';
import type { InspectionFinding, User, ImmediateControl, ObservationCategory, ObservationType } from '../types';
import { AlertTriangle, X, CheckCircle, MinusCircle, MessageSquare, Camera, ChevronDown, ChevronUp } from 'lucide-react';

// --- ICONS ---
export const CloseIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
export const CameraIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>;
export const MapPinIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;

// --- FINDING FORM ---
export const FindingForm: React.FC<{
    finding: Partial<InspectionFinding>;
    onSave: (finding: InspectionFinding) => void;
    onCancel: () => void;
    users: User[];
}> = ({ finding, onSave, onCancel, users }) => {
    const { activeUser } = useAppContext();
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
                            onClick={() => setFormData(p => ({ ...p, observation_category: cat.id }))}
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
                            onClick={() => setFormData(p => ({ ...p, observation_type: type.id }))}
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
        </div>
    );
};

// --- FINDING DISPLAY ---
export const FindingDisplay: React.FC<{ 
    finding: InspectionFinding, 
    onConvertToReport: () => void, 
    onEdit: () => void, 
    isReviewer: boolean 
}> = ({ finding, onConvertToReport, onEdit, isReviewer }) => (
    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 rounded-r-md shadow-sm">
        <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${finding.risk_level === 'High' ? 'bg-red-600' : finding.risk_level === 'Medium' ? 'bg-orange-500' : 'bg-yellow-500'}`}>
                        {finding.risk_level}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{finding.category}</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{finding.description}</p>
                
                {finding.evidence_urls.length > 0 && (
                    <div className="mt-2 flex gap-2">
                        {finding.evidence_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer">
                                <img src={url} alt="Evidence" className="h-10 w-10 object-cover rounded border border-red-200" />
                            </a>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex flex-col gap-2">
                {!isReviewer && <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>}
                <Button variant="secondary" size="sm" onClick={onConvertToReport} className="text-xs">Create Report</Button>
            </div>
        </div>
    </div>
);