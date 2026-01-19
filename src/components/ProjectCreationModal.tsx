import React, { useState, useEffect } from 'react';
import type { Project, User } from '../types';
import { Button } from './ui/Button';
import { 
  Briefcase, Calendar, Shield, Users, 
  DollarSign, Clock, MapPin, FileText, 
  CheckCircle, AlertTriangle 
} from 'lucide-react';

interface ProjectCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  users: User[];
  initialData?: Project | null; // Added for Edit Mode
}

// Helper for form sections
const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="space-y-4">
        <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider border-b dark:border-gray-700 pb-2 mb-4">
            {title}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children}
        </div>
    </div>
);

const InputField: React.FC<{ 
    label: string; 
    value: any; 
    onChange: (val: any) => void; 
    type?: string; 
    placeholder?: string;
    required?: boolean;
    fullWidth?: boolean;
    prefix?: React.ReactNode;
}> = ({ label, value, onChange, type = 'text', placeholder, required, fullWidth, prefix }) => (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            {prefix && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    {prefix}
                </div>
            )}
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${prefix ? 'pl-10' : ''}`}
                placeholder={placeholder}
                required={required}
            />
        </div>
    </div>
);

const SelectField: React.FC<{
    label: string;
    value: any;
    onChange: (val: any) => void;
    options: { label: string; value: string }[];
    required?: boolean;
}> = ({ label, value, onChange, options, required }) => (
    <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

export const ProjectCreationModal: React.FC<ProjectCreationModalProps> = ({ isOpen, onClose, onSubmit, users, initialData }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        type: 'Construction',
        status: 'active',
        description: '',
        location: '',
        client: '',
        contract_number: '',
        start_date: new Date().toISOString().split('T')[0],
        finish_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        budget: '',
        currency: 'USD',
        work_hours_start: '08:00',
        work_hours_end: '17:00',
        work_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        risk_level: 'Medium',
        manager_id: '',
        safety_officer_id: '',
    });

    const [error, setError] = useState('');

    // Load initial data if editing
    useEffect(() => {
        if (initialData) {
            setFormData({
                ...formData,
                ...initialData,
                budget: initialData.budget?.toString() || '',
                // Ensure we don't overwrite with undefined if fields are missing in legacy data
                manager_id: initialData.manager_id || '',
                // @ts-ignore - handling potential missing fields
                safety_officer_id: initialData.team_members?.[1] || '', 
            });
        }
    }, [initialData, isOpen]);

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const validateStep = (currentStep: number) => {
        if (currentStep === 1) {
            if (!formData.name || !formData.code || !formData.location) return "Name, Code, and Location are required.";
        }
        if (currentStep === 2) {
            if (!formData.start_date || !formData.finish_date) return "Start and Finish dates are required.";
        }
        if (currentStep === 3) {
            if (!formData.manager_id) return "A Project Manager must be assigned.";
        }
        return null;
    };

    const handleNext = () => {
        const err = validateStep(step);
        if (err) {
            setError(err);
            return;
        }
        setStep(prev => prev + 1);
    };

    const handleSubmit = () => {
        const finalData = {
            ...formData,
            budget: parseFloat(formData.budget) || 0,
            // Preserve existing progress/spent if editing, else 0
            progress: initialData?.progress || 0,
            budget_spent: initialData?.budget_spent || 0,
            team_members: [formData.manager_id, formData.safety_officer_id].filter(Boolean)
        };
        onSubmit(finalData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 rounded-t-2xl">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {initialData ? 'Edit Project' : 'New Project Setup'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Step {step} of 4</p>
                    </div>
                    
                    {/* Step Indicators */}
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`h-2 w-8 rounded-full transition-all ${i <= step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                            <AlertTriangle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6 animate-fade-in">
                            <FormSection title="General Information">
                                <InputField label="Project Name" value={formData.name} onChange={v => updateField('name', v)} placeholder="e.g. Downtown Tower A" required prefix={<Briefcase className="w-4 h-4"/>} />
                                <InputField label="Project Code" value={formData.code} onChange={v => updateField('code', v)} placeholder="e.g. PRJ-2024-001" required prefix={<FileText className="w-4 h-4"/>} />
                                <SelectField 
                                    label="Project Type" 
                                    value={formData.type} 
                                    onChange={v => updateField('type', v)}
                                    options={[
                                        { label: 'Construction', value: 'Construction' },
                                        { label: 'Infrastructure', value: 'Infrastructure' },
                                        { label: 'Maintenance', value: 'Maintenance' },
                                        { label: 'Oil & Gas', value: 'Oil & Gas' },
                                        { label: 'Shutdown', value: 'Shutdown' }
                                    ]}
                                />
                                <InputField label="Location / Site" value={formData.location} onChange={v => updateField('location', v)} placeholder="e.g. Business Bay, Dubai" required prefix={<MapPin className="w-4 h-4"/>} />
                            </FormSection>
                            
                            <FormSection title="Client Details">
                                <InputField label="Client Name" value={formData.client} onChange={v => updateField('client', v)} placeholder="e.g. Emaar Properties" />
                                <InputField label="Contract Number" value={formData.contract_number} onChange={v => updateField('contract_number', v)} placeholder="e.g. CNT-998877" />
                            </FormSection>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-fade-in">
                            <FormSection title="Schedule & Timeline">
                                <InputField label="Start Date" type="date" value={formData.start_date} onChange={v => updateField('start_date', v)} required />
                                <InputField label="Finish Date" type="date" value={formData.finish_date} onChange={v => updateField('finish_date', v)} required />
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label="Work Start Time" type="time" value={formData.work_hours_start} onChange={v => updateField('work_hours_start', v)} />
                                    <InputField label="Work End Time" type="time" value={formData.work_hours_end} onChange={v => updateField('work_hours_end', v)} />
                                </div>
                            </FormSection>

                            <FormSection title="Budgeting">
                                <InputField label="Total Budget" type="number" value={formData.budget} onChange={v => updateField('budget', v)} placeholder="0.00" prefix={<DollarSign className="w-4 h-4"/>} />
                                <SelectField 
                                    label="Currency" 
                                    value={formData.currency} 
                                    onChange={v => updateField('currency', v)}
                                    options={[
                                        { label: 'USD - US Dollar', value: 'USD' },
                                        { label: 'AED - UAE Dirham', value: 'AED' },
                                        { label: 'SAR - Saudi Riyal', value: 'SAR' },
                                        { label: 'EUR - Euro', value: 'EUR' }
                                    ]}
                                />
                            </FormSection>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-fade-in">
                            <FormSection title="Team Assignment">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Project Manager <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                        <select 
                                            value={formData.manager_id} 
                                            onChange={e => updateField('manager_id', e.target.value)}
                                            className="w-full pl-10 p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                        >
                                            <option value="">Select Manager...</option>
                                            {users.filter(u => ['PROJECT_MANAGER', 'ADMIN', 'ORG_ADMIN'].includes(u.role)).map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Lead Safety Officer</label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                        <select 
                                            value={formData.safety_officer_id} 
                                            onChange={e => updateField('safety_officer_id', e.target.value)}
                                            className="w-full pl-10 p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                        >
                                            <option value="">Select Safety Officer...</option>
                                            {users.filter(u => ['HSE_MANAGER', 'HSE_OFFICER'].includes(u.role)).map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </FormSection>

                            <FormSection title="Risk Profile">
                                <SelectField 
                                    label="Initial Risk Level" 
                                    value={formData.risk_level} 
                                    onChange={v => updateField('risk_level', v)}
                                    options={[
                                        { label: 'Low - Routine Operations', value: 'Low' },
                                        { label: 'Medium - Standard Construction', value: 'Medium' },
                                        { label: 'High - Hazardous Activities', value: 'High' },
                                        { label: 'Critical - Complex Engineering', value: 'Critical' }
                                    ]}
                                />
                            </FormSection>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-fade-in text-center">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {initialData ? 'Save Changes?' : 'Ready to Launch?'}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                                You are about to {initialData ? 'update' : 'create'} <strong>{formData.name}</strong>. 
                                {initialData ? ' All changes will be reflected immediately.' : ' Once created, you can invite more team members and start assigning permits.'}
                            </p>
                            
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-left max-w-md mx-auto border border-gray-200 dark:border-gray-700">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500 block text-xs uppercase">Code</span>
                                        <span className="font-mono font-bold dark:text-white">{formData.code}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-xs uppercase">Type</span>
                                        <span className="font-medium dark:text-white">{formData.type}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-xs uppercase">Manager</span>
                                        <span className="font-medium dark:text-white">
                                            {users.find(u => u.id === formData.manager_id)?.name || 'Unknown'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-xs uppercase">Duration</span>
                                        <span className="font-medium dark:text-white">
                                            {Math.ceil((new Date(formData.finish_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24))} Days
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl flex justify-between">
                    {step > 1 ? (
                        <Button variant="secondary" onClick={() => setStep(prev => prev - 1)}>Back</Button>
                    ) : (
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    )}

                    {step < 4 ? (
                        <Button onClick={handleNext}>Next Step</Button>
                    ) : (
                        <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/30">
                            {initialData ? 'Update Project' : 'Launch Project'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};