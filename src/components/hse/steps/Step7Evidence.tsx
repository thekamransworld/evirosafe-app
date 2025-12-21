import React from 'react';
import { HSEInspection, Evidence } from '../../../types/hse-inspection';
import { EvidenceCollector } from '../EvidenceCollector'; // Adjust path if EvidenceCollector is elsewhere
import { Camera, FileText } from 'lucide-react';

interface Step7Props {
  formData: Partial<HSEInspection>;
  setFormData: (data: Partial<HSEInspection>) => void;
}

export const Step7Evidence: React.FC<Step7Props> = ({ formData, setFormData }) => {
  
  // Handle adding new evidence (photo/video/audio)
  const handleEvidenceCaptured = (evidence: Evidence) => {
    const currentEvidence = formData.evidence || [];
    setFormData({
      ...formData,
      evidence: [...currentEvidence, evidence]
    });
  };

  // Handle removing evidence
  const handleEvidenceRemoved = (evidenceId: string) => {
    const currentEvidence = formData.evidence || [];
    setFormData({
      ...formData,
      evidence: currentEvidence.filter(e => e.id !== evidenceId)
    });
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
        
        {/* Stats Summary */}
        <div className="flex gap-4 mb-6 text-sm">
          <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="font-semibold dark:text-white">{formData.evidence?.length || 0}</span>
            <span className="text-gray-500">Files Attached</span>
          </div>
        </div>

        {/* The Collector Component */}
        <EvidenceCollector
          inspectionId={formData.inspection_id || 'temp_id'}
          existingEvidence={formData.evidence || []}
          onEvidenceCaptured={handleEvidenceCaptured}
          onEvidenceRemoved={handleEvidenceRemoved}
          maxFiles={50} // Allow up to 50 files
        />
      </div>
    </div>
  );
};