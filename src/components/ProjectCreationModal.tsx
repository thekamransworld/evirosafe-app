import React, { useState, useMemo, useEffect } from 'react';
import type { Project, User } from '../types';
import { Button } from './ui/Button';
import { 
  Briefcase, Calendar, Users, ShieldAlert, 
  CheckCircle, ArrowRight, ArrowLeft, X 
} from 'lucide-react';

interface ProjectCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  users: User[];
  initialData?: Partial<Project> | null;
}

const STEPS = [
  { id: 1, title: 'General Info', icon: Briefcase },
  { id: 2, title: 'Schedule', icon: Calendar },
  { id: 3, title: 'Team & Risk', icon: Users },
  { id: 4, title: 'Review', icon: CheckCircle },
];

export const ProjectCreationModal: React.FC<ProjectCreationModalProps> = ({ isOpen, onClose, onSubmit, users, initialData }) => {
  const [step, setStep] = useState(1);
  
  const defaultData = {
    name: '',
    code: '',
    location: '',
    type: 'Construction',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    finish_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    manager_id: '',
    safety_officer_id: '',
    initial_risk_level: 'Medium',
    budget: 0,
  };

  const [formData, setFormData] = useState(defaultData);
  const [error, setError] = useState('');

  // Reset or Populate form when modal opens
  useEffect(() => {
    if (isOpen) {
        setStep(1);
        if (initialData) {
            setFormData({ ...defaultData, ...initialData });
        } else {
            setFormData(defaultData);
        }
    }
  }, [isOpen, initialData]);

  // --- ROBUST USER FILTERING ---
  const availableManagers = useMemo(() => {
    // 1. Try to find specific roles
    const managers = users.filter(u => 
      ['admin', 'org_admin', 'hse_manager', 'supervisor'].includes((u.role || '').toLowerCase())
    );
    // 2. If no managers found, return ALL users (Fallback to prevent blocking)
    return managers.length > 0 ? managers : users;
  }, [users]);

  const availableOfficers = useMemo(() => {
    const officers = users.filter(u => 
      ['hse_officer', 'inspector', 'hse_manager'].includes((u.role || '').toLowerCase())
    );
    return officers.length > 0 ? officers : users;
  }, [users]);

  // Auto-select first manager if none selected
  useEffect(() => {
      if (step === 3 && !formData.manager_id && availableManagers.length > 0) {
          setFormData(prev => ({ ...prev, manager_id: availableManagers[0].id }));
      }
  }, [step, availableManagers]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.code || !formData.location) {
        setError('Please fill in all required fields.');
        return false;
      }
    }
    if (step === 3) {
      if (!formData.manager_id) {
        setError('A Project Manager must be assigned.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => setStep(prev => prev - 1);

  const handleSubmit = () => {
    onSubmit(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-white">{initialData ? 'Edit Project' : 'New Project Setup'}</h2>
            <p className="text-slate-400 text-sm mt-1">Step {step} of 4</p>
          </div>
          
          {/* Progress Indicators */}
          <div className="flex gap-2">
            {STEPS.map(s => (
              <div 
                key={s.id} 
                className={`h-2 w-8 rounded-full transition-all ${step >= s.id ? 'bg-blue-600' : 'bg-slate-700'}`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
              <ShieldAlertIcon className="w-4 h-4" />
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Project Name *</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => handleChange('name', e.target.value)}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Neom Bay Phase 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Project Code *</label>
                  <input 
                    type="text" 
                    value={formData.code} 
                    onChange={e => handleChange('code', e.target.value)}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. NB-001"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Location *</label>
                <input 
                  type="text" 
                  value={formData.location} 
                  onChange={e => handleChange('location', e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Site Address or Coordinates"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Project Type</label>
                <select 
                  value={formData.type} 
                  onChange={e => handleChange('type', e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option>Construction</option>
                  <option>Infrastructure</option>
                  <option>Oil & Gas</option>
                  <option>Maintenance</option>
                  <option>Shutdown</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                <textarea 
                  value={formData.description} 
                  onChange={e => handleChange('description', e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Brief scope of work..."
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Start Date</label>
                  <input 
                    type="date" 
                    value={formData.start_date} 
                    onChange={e => handleChange('start_date', e.target.value)}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Finish Date</label>
                  <input 
                    type="date" 
                    value={formData.finish_date} 
                    onChange={e => handleChange('finish_date', e.target.value)}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Estimated Budget (USD)</label>
                <input 
                  type="number" 
                  value={formData.budget} 
                  onChange={e => handleChange('budget', parseInt(e.target.value))}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Team Assignment</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Project Manager *</label>
                    <select 
                      value={formData.manager_id} 
                      onChange={e => handleChange('manager_id', e.target.value)}
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select Manager...</option>
                      {availableManagers.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                    {availableManagers.length === 0 && (
                        <p className="text-xs text-amber-500 mt-1">No specific managers found. Showing all users.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Lead Safety Officer</label>
                    <select 
                      value={formData.safety_officer_id} 
                      onChange={e => handleChange('safety_officer_id', e.target.value)}
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select Safety Officer...</option>
                      {availableOfficers.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Risk Profile</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Initial Risk Level</label>
                  <select 
                    value={formData.initial_risk_level} 
                    onChange={e => handleChange('initial_risk_level', e.target.value)}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option>Low - Standard Operations</option>
                    <option>Medium - Caution Required</option>
                    <option>High - Hazardous Activities</option>
                    <option>Critical - Extreme Caution</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-fade-in text-center py-8">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-white">Ready to {initialData ? 'Update' : 'Launch'}?</h3>
              <p className="text-slate-400 max-w-md mx-auto">
                You are about to {initialData ? 'update' : 'create'} project <span className="text-white font-bold">{formData.name}</span>. 
                Team members will be notified immediately.
              </p>
              
              <div className="bg-slate-800/50 p-4 rounded-xl text-left max-w-sm mx-auto border border-slate-700">
                <div className="flex justify-between mb-2">
                    <span className="text-slate-400 text-sm">Code:</span>
                    <span className="text-white font-mono text-sm">{formData.code}</span>
                </div>
                <div className="flex justify-between mb-2">
                    <span className="text-slate-400 text-sm">Manager:</span>
                    <span className="text-white text-sm">
                        {users.find(u => u.id === formData.manager_id)?.name || 'Pending'}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Duration:</span>
                    <span className="text-white text-sm">
                        {Math.ceil((new Date(formData.finish_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24))} Days
                    </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900 rounded-b-2xl flex justify-between items-center">
          {step > 1 ? (
            <Button variant="secondary" onClick={handleBack} className="bg-slate-800 text-white hover:bg-slate-700 border-slate-700">
              Back
            </Button>
          ) : (
            <Button variant="secondary" onClick={onClose} className="bg-slate-800 text-white hover:bg-slate-700 border-slate-700">
              Cancel
            </Button>
          )}

          {step < 4 ? (
            <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white">
              Next Step <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20">
              {initialData ? 'Update Project' : 'Launch Project'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const ShieldAlertIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.002zM12 15.75h.007v.008H12v-.008z" /></svg>;