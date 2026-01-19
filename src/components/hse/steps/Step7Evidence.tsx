import React from 'react';
import { Inspection, Evidence } from '../../../types';
import { EvidenceCollector } from '../EvidenceCollector';
import { Camera, FileText } from 'lucide-react';

interface Step7Props {
  formData: Partial<Inspection>;
  setFormData: (data: Partial<Inspection>) => void;
}

export const Step7Evidence: React.FC<Step7Props> = ({ formData, setFormData }) => {
  
  // Handle adding new evidence (photo/video/audio)
  // Note: In the new schema, evidence is attached to findings or checklist items.
  // This step can be used to collect general site evidence.
  const handleEvidenceCaptured = (evidence: Evidence) => {
    // For now, we just log it as we don't have a top-level evidence array on Inspection
    console.log("Evidence captured:", evidence);
    // You might want to add a 'general_evidence' field to Inspection type later
  };

  const handleEvidenceRemoved = (evidenceId: string) => {
    console.log("Evidence removed:", evidenceId);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Camera className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Evidence Collection</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Attach photos, videos, or documents to support your inspection results.
            </p>
          </div>
        </div>
      </div>

      {/* Main Collector Area */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
        
        {/* The Collector Component */}
        <EvidenceCollector
          inspectionId={formData.id || 'temp_id'}
          existingEvidence={[]}
          onEvidenceCaptured={handleEvidenceCaptured}
          onEvidenceRemoved={handleEvidenceRemoved}
          maxFiles={50}
        />
      </div>
    </div>
  );
};