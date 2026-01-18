import React, { useState, useMemo } from 'react';
import { 
  X, ChevronRight, ChevronLeft, Calendar, MapPin, 
  FileText, Users, AlertTriangle, CheckCircle, Upload 
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useAppContext, useDataContext } from '../../contexts';
import { ptwTypeDetails } from '../../config';
import type { 
  Ptw, PtwType, Project, User, 
  PtwHotWorkPayload, PtwConfinedSpacePayload, 
  PtwWorkAtHeightPayload, PtwLiftingPayload 
} from '../../types';

// Import Specialized Components
import { FireWatchDetails } from './FireWatchDetails';
import { GasTestLog } from './GasTestLog';
import { IsolationList } from './IsolationList';
import { WorkAtHeightPermit } from '../WorkAtHeightPermit'; // Reusing existing
import { LoadCalculationSection } from '../LoadCalculationSection'; // Reusing existing

interface PermitCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const STEPS = [
  { id: 1, title: 'Type Selection' },
  { id: 2, title: 'General Details' },
  { id: 3, title: 'Specific Requirements' },
  { id: 4, title: 'Review & Submit' }
];

export const PermitCreationModal: React.FC<PermitCreationModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { projects } = useDataContext();
  const { activeUser, usersList } = useAppContext();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState<PtwType | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    project_id: '',
    title: '',
    description: '',
    location: '',
    start_date: '',
    end_date: '',
    contractor: '',
    supervisor_id: '',
    team_size: 1,
    // Dynamic Payload Data
    payload: {} as any
  });

  // Initialize payload when type changes
  const handleTypeSelect = (type: PtwType) => {
    setSelectedType(type);
    
    // Initialize specific payload structure based on type
    let initialPayload: any = {};
    
    if (type === 'Hot Work') {
      initialPayload = { fire_watcher: { name: '', mobile: '' }, post_watch_minutes: 30 };
    } else if (type === 'Confined Space Entry') {
      initialPayload = { gas_tests: [], entry_log: [] };
    } else if (type === 'Electrical Work' || type === 'Mechanical Work') {
      initialPayload = { isolations: [] }; // For LOTO
    } else if (type === 'Work at Height') {
      initialPayload = { access_equipment: { step_ladder: false, independent_scaffolding: false, other: '' } };
    } else if (type === 'Lifting') {
      initialPayload = { load_calculation: { load_weight: 0, crane_capacity: 0 } };
    }

    setFormData(prev => ({ ...prev, payload: initialPayload }));
    setCurrentStep(2);
  };

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = () => {
    // Construct final PTW object structure
    const finalData = {
      project_id: formData.project_id,
      type: selectedType,
      title: formData.title,
      status: 'DRAFT', // Always start as draft
      payload: {
        ...formData.payload,
        permit_no: `PTW-${Date.now().toString().slice(-6)}`, // Temp ID
        work: {
          location: formData.location,
          description: formData.description,
          coverage: {
            start_date: formData.start_date,
            end_date: formData.end_date,
            start_time: '08:00', // Default
            end_time: '17:00'    // Default
          },
          number_of_workers: formData.team_size
        },
        requester: {
          name: activeUser?.name,
          email: activeUser?.email,
          contractor: formData.contractor,
          designation: activeUser?.role
        },
        // Default empty arrays for safety
        safety_requirements: [],
        ppe: {},
        signoffs: {}
      }
    };

    onSubmit(finalData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-800">
        
        {/* Header */}
        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Permit to Work</h2>
            <div className="flex items-center gap-2 mt-2">
              {STEPS.map((step, idx) => (
                <div key={step.id} className="flex items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    currentStep === step.id 
                      ? 'bg-blue-600 text-white' 
                      : currentStep > step.id 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-500'
                  }`}>
                    {currentStep > step.id ? <CheckCircle className="w-3 h-3" /> : step.id}
                  </div>
                  <span className={`ml-2 text-xs ${currentStep === step.id ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                    {step.title}
                  </span>
                  {idx < STEPS.length - 1 && <div className="w-8 h-px bg-gray-200 dark:bg-gray-700 mx-2" />}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* STEP 1: TYPE SELECTION */}
          {currentStep === 1 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(Object.keys(ptwTypeDetails) as PtwType[]).map((type) => {
                const details = ptwTypeDetails[type];
                return (
                  <button
                    key={type}
                    onClick={() => handleTypeSelect(type)}
                    className="flex flex-col items-center p-6 border dark:border-gray-700 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group text-center h-full"
                  >
                    <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">{details.icon}</span>
                    <span className="font-bold text-gray-900 dark:text-white text-sm">{type}</span>
                    <span className="text-xs text-gray-500 mt-1 line-clamp-2">{details.description}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 2: GENERAL DETAILS */}
          {currentStep === 2 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Project</label>
                  <select 
                    value={formData.project_id}
                    onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                    className="w-full p-2.5 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <option value="">Select Project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Work Location</label>
                  <input 
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full p-2.5 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    placeholder="e.g. Zone A, Level 2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Work Description</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value, title: e.target.value.substring(0, 50)})}
                  rows={3}
                  className="w-full p-2.5 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  placeholder="Describe the task in detail..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Start Date</label>
                  <input 
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="w-full p-2.5 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">End Date</label>
                  <input 
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className="w-full p-2.5 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Contractor Company</label>
                  <input 
                    type="text"
                    value={formData.contractor}
                    onChange={(e) => setFormData({...formData, contractor: e.target.value})}
                    className="w-full p-2.5 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    placeholder="Company Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Site Supervisor</label>
                  <select 
                    value={formData.supervisor_id}
                    onChange={(e) => setFormData({...formData, supervisor_id: e.target.value})}
                    className="w-full p-2.5 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <option value="">Select Supervisor</option>
                    {usersList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SPECIFIC REQUIREMENTS (DYNAMIC) */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-6">
                <h3 className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {selectedType} Requirements
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Please complete the specific safety controls for this high-risk activity.
                </p>
              </div>

              {/* DYNAMIC COMPONENTS */}
              
              {selectedType === 'Hot Work' && (
                <FireWatchDetails 
                  data={formData.payload}
                  onChange={(data) => setFormData(prev => ({ ...prev, payload: { ...prev.payload, ...data } }))}
                />
              )}

              {selectedType === 'Confined Space Entry' && (
                <GasTestLog 
                  entries={formData.payload.gas_tests || []}
                  onChange={(entries) => setFormData(prev => ({ ...prev, payload: { ...prev.payload, gas_tests: entries } }))}
                />
              )}

              {(selectedType === 'Electrical Work' || selectedType === 'Mechanical Work') && (
                <IsolationList 
                  isolations={formData.payload.isolations || []}
                  onChange={(isolations) => setFormData(prev => ({ ...prev, payload: { ...prev.payload, isolations } }))}
                />
              )}

              {selectedType === 'Work at Height' && (
                <WorkAtHeightPermit 
                  payload={formData.payload as PtwWorkAtHeightPayload}
                  onChange={(payload) => setFormData(prev => ({ ...prev, payload }))}
                />
              )}

              {selectedType === 'Lifting' && (
                <LoadCalculationSection 
                  loadCalc={formData.payload.load_calculation}
                  onChange={(calc) => setFormData(prev => ({ ...prev, payload: { ...prev.payload, load_calculation: calc } }))}
                  disabled={false}
                />
              )}

              {/* Fallback for types with no specific component yet */}
              {!['Hot Work', 'Confined Space Entry', 'Electrical Work', 'Mechanical Work', 'Work at Height', 'Lifting'].includes(selectedType || '') && (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No specific technical controls required for this permit type.</p>
                  <p className="text-sm text-gray-400">Proceed to review.</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: REVIEW */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Review Permit Details</h3>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 block">Type</span>
                    <span className="font-bold text-gray-900 dark:text-white">{selectedType}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Project</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {projects.find(p => p.id === formData.project_id)?.name || 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Location</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formData.location}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Duration</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {formData.start_date} to {formData.end_date}
                    </span>
                  </div>
                </div>
                
                <div className="pt-4 border-t dark:border-gray-700">
                  <span className="text-gray-500 block text-sm mb-1">Description</span>
                  <p className="text-gray-900 dark:text-white bg-white dark:bg-gray-900 p-3 rounded border dark:border-gray-700">
                    {formData.description}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-yellow-800 dark:text-yellow-200 text-sm">Declaration</h4>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    By submitting this permit request, I certify that I have inspected the work area and all information provided is accurate. I understand that work cannot commence until this permit is approved and issued.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t dark:border-gray-800 flex justify-between bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
          <Button variant="secondary" onClick={currentStep === 1 ? onClose : handleBack}>
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>
          
          <Button onClick={currentStep === 4 ? handleSubmit : handleNext} className="bg-blue-600 hover:bg-blue-700 text-white">
            {currentStep === 4 ? 'Submit Request' : 'Next Step'} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

      </div>
    </div>
  );
};