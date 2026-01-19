import React, { useState } from 'react';
import { Button } from './ui/Button';
import { AlertTriangle, Download, Share2, X } from 'lucide-react';
import { generatePdf } from '../services/pdfService'; // Fixed Import
import type { Report } from '../types';

interface SafetyAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
}

export const SafetyAlertModal: React.FC<SafetyAlertModalProps> = ({ isOpen, onClose, report }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    await generatePdf('safety-alert-content', `Safety-Alert-${report.id}`);
    setIsGenerating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Generate Safety Alert
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Preview Area */}
        <div className="p-6 bg-gray-100 dark:bg-black/50 overflow-y-auto max-h-[70vh]">
          <div id="safety-alert-content" className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-xl mx-auto">
            
            {/* Alert Header */}
            <div className="border-b-4 border-orange-500 pb-4 mb-6">
              <h1 className="text-3xl font-black text-orange-600 uppercase tracking-tight">Safety Alert</h1>
              <p className="text-sm text-gray-500 mt-1">Ref: {report.id} | Date: {new Date().toLocaleDateString()}</p>
            </div>

            {/* Content */}
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1">What Happened?</h4>
                <p className="text-gray-700 text-sm leading-relaxed">{report.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                  <h4 className="text-xs font-bold text-orange-800 uppercase mb-1">Location</h4>
                  <p className="text-sm text-orange-900">{report.location.text}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <h4 className="text-xs font-bold text-blue-800 uppercase mb-1">Category</h4>
                  <p className="text-sm text-blue-900">{report.type}</p>
                </div>
              </div>

              {report.root_cause && (
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1">Root Cause</h4>
                  <p className="text-gray-700 text-sm">{report.root_cause}</p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Immediate Actions Required</h4>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {report.immediate_actions ? (
                    <li>{report.immediate_actions}</li>
                  ) : (
                    <li>Review risk assessment for similar activities.</li>
                  )}
                  <li>Discuss this alert in the next Toolbox Talk.</li>
                </ul>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400 font-semibold">EviroSafe HSE Management System</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t dark:border-gray-800 bg-white dark:bg-slate-900 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleDownload} disabled={isGenerating}>
            {isGenerating ? 'Generating PDF...' : <><Download className="w-4 h-4 mr-2" /> Download Alert</>}
          </Button>
        </div>
      </div>
    </div>
  );
};