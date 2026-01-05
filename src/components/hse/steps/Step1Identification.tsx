import React from 'react';
import { HSEInspection, InspectionType } from '../../../types/hse-inspection';
import { Shield, Globe, Users, Target, FileText, AlertTriangle } from 'lucide-react';

interface Step1Props {
  formData: Partial<HSEInspection>;
  setFormData: (data: Partial<HSEInspection>) => void;
  projects: any[];
}

export const Step1Identification: React.FC<Step1Props> = ({ formData, setFormData, projects }) => {
  const inspectionTypes = [
    { id: 'safety', label: 'Safety', icon: Shield },
    { id: 'environmental', label: 'Environmental', icon: Globe },
    { id: 'health', label: 'Health', icon: Users },
    { id: 'fire', label: 'Fire', icon: AlertTriangle },
    { id: 'equipment', label: 'Equipment', icon: Target },
    { id: 'process', label: 'Process', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Core Identification</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="e.g. Weekly Site Inspection"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project / Site</label>
            <select
              value={formData.entity_id}
              onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="">Select Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Inspection Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {inspectionTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setFormData({ ...formData, type: type.id as InspectionType })}
              className={`p-4 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                formData.type === type.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <type.icon className="w-6 h-6" />
              <span className="font-medium">{type.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};