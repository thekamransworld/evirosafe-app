import React from 'react';
import { Inspection } from '../../../types';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { CheckCircle, AlertTriangle, Camera, Users, Calendar } from 'lucide-react';

interface Step8Props {
  formData: Partial<Inspection>;
  projects: any[];
  users: any[];
  contractors?: any[];
}

export const Step8Review: React.FC<Step8Props> = ({ formData, projects, users }) => {
  const project = projects.find(p => p.id === formData.project_id);
  const lead = users.find(u => u.id === formData.person_responsible_id);

  const findingsCount = formData.findings?.length || 0;
  const criticalCount = formData.findings?.filter(f => f.risk_level === 'High' || f.risk_level === 'Critical').length || 0;
  
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
        <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100">Review & Validate</h2>
        <p className="text-sm text-blue-700 dark:text-blue-300">Please review all inspection details before final submission.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Identification">
             <div className="space-y-3 text-sm">
                 <div className="flex justify-between border-b pb-2">
                     <span className="text-gray-500">Title</span>
                     <span className="font-medium dark:text-white">{formData.title}</span>
                 </div>
                 <div className="flex justify-between border-b pb-2">
                     <span className="text-gray-500">Type</span>
                     <Badge color="blue">{formData.type || 'Safety'}</Badge>
                 </div>
                 <div className="flex justify-between border-b pb-2">
                     <span className="text-gray-500">Project</span>
                     <span className="font-medium dark:text-white">{project?.name || 'N/A'}</span>
                 </div>
                  <div className="flex justify-between">
                     <span className="text-gray-500">Date</span>
                     <span className="font-medium dark:text-white flex items-center gap-1">
                        <Calendar className="w-3 h-3"/> {new Date(formData.schedule_at || Date.now()).toLocaleDateString()}
                     </span>
                 </div>
             </div>
          </Card>

          <Card title="Team">
             <div className="space-y-3 text-sm">
                 <div className="flex justify-between border-b pb-2">
                     <span className="text-gray-500">Lead Inspector</span>
                     <span className="font-medium dark:text-white">{lead?.name || 'N/A'}</span>
                 </div>
                 <div className="flex justify-between">
                     <span className="text-gray-500">Team Size</span>
                     <span className="font-medium dark:text-white flex items-center gap-1">
                        <Users className="w-3 h-3"/> {1 + (formData.team_member_ids?.length || 0)} Members
                     </span>
                 </div>
             </div>
          </Card>
      </div>

      <Card title="Inspection Summary">
          <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{findingsCount}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Total Findings</div>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalCount}</div>
                  <div className="text-xs text-red-500 uppercase tracking-wider flex justify-center items-center gap-1">
                      <AlertTriangle className="w-3 h-3"/> Critical
                  </div>
              </div>
          </div>
      </Card>

      <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <CheckCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
              <p className="font-bold text-yellow-800 dark:text-yellow-200 text-sm">Declaration</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  By submitting this inspection, I declare that the information provided is accurate and represents the site conditions at the time of inspection.
              </p>
          </div>
      </div>
    </div>
  );
};