import React, { useRef } from 'react';
import type { Report } from '../types';
import { Button } from './ui/Button';
import { generatePdf } from '../services/pdfService';
import { AlertTriangle, CheckCircle, XCircle, Printer, Download } from 'lucide-react';

interface SafetyAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
}

export const SafetyAlertModal: React.FC<SafetyAlertModalProps> = ({ isOpen, onClose, report }) => {
  const alertRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    await generatePdf('safety-alert-content', `Safety_Alert_${report.id}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Preview Safety Alert</h3>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
            <Button size="sm" onClick={handleDownload} leftIcon={<Download className="w-4 h-4"/>}>Download PDF</Button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-100 dark:bg-black/50">
          <div id="safety-alert-content" className="bg-white text-black p-8 shadow-lg mx-auto max-w-[210mm] min-h-[297mm]" style={{ width: '210mm' }}>
            
            {/* Alert Header */}
            <div className="border-b-4 border-red-600 pb-4 mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-black text-red-600 uppercase tracking-tighter">Safety Alert</h1>
                <p className="text-gray-600 font-bold mt-1">EviroSafe Global HSE • {new Date().toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <div className="bg-red-600 text-white px-4 py-1 font-bold text-sm uppercase inline-block mb-1">
                  {report.classification || 'Incident'}
                </div>
                <p className="text-xs text-gray-500">Ref: {report.id}</p>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-3 gap-6">
              
              {/* Left Column: Description & Image */}
              <div className="col-span-2 space-y-6">
                <section>
                  <h2 className="text-lg font-bold text-gray-800 border-b-2 border-gray-200 mb-2">What Happened?</h2>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {report.description}
                  </p>
                </section>

                {report.evidence_urls && report.evidence_urls.length > 0 && (
                  <div className="border-2 border-gray-200 rounded-lg overflow-hidden h-64 bg-gray-50 flex items-center justify-center">
                    <img 
                      src={report.evidence_urls[0]} 
                      alt="Incident Evidence" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <section>
                  <h2 className="text-lg font-bold text-gray-800 border-b-2 border-gray-200 mb-2">Why Did It Happen?</h2>
                  <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-orange-500">
                    <p className="font-bold text-sm text-gray-800 mb-1">Root Cause:</p>
                    <p className="text-sm text-gray-700">
                      {report.root_cause_analysis?.conclusion || report.root_cause || "Investigation pending."}
                    </p>
                  </div>
                </section>
              </div>

              {/* Right Column: Key Lessons */}
              <div className="col-span-1 space-y-6">
                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                  <div className="flex items-center gap-2 mb-2 text-red-700 font-bold">
                    <AlertTriangle className="w-5 h-5" />
                    <h3>Key Risks</h3>
                  </div>
                  <ul className="text-sm text-red-800 space-y-1 list-disc pl-4">
                    <li>{report.type}</li>
                    <li>Severity: {report.risk_pre_control.severity}/5</li>
                    <li>Likelihood: {report.risk_pre_control.likelihood}/5</li>
                  </ul>
                </div>

                <section>
                  <h2 className="text-lg font-bold text-gray-800 border-b-2 border-gray-200 mb-3">Lessons Learned</h2>
                  <ul className="space-y-3">
                    <li className="flex gap-3 text-sm text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span>Ensure all permits are signed before starting work.</span>
                    </li>
                    <li className="flex gap-3 text-sm text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span>Verify isolation (LOTO) is effective.</span>
                    </li>
                    <li className="flex gap-3 text-sm text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span>Conduct dynamic risk assessment if conditions change.</span>
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-gray-800 border-b-2 border-gray-200 mb-3">Do Not</h2>
                  <ul className="space-y-3">
                    <li className="flex gap-3 text-sm text-gray-700">
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <span>Do not bypass safety guards.</span>
                    </li>
                    <li className="flex gap-3 text-sm text-gray-700">
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <span>Do not rush critical steps.</span>
                    </li>
                  </ul>
                </section>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-4 border-t border-gray-300 flex justify-between items-end text-xs text-gray-500">
              <div>
                <p className="font-bold text-gray-900">HSE Department</p>
                <p>EviroSafe Global</p>
              </div>
              <div className="text-right">
                <p>Discuss this alert in your next Toolbox Talk.</p>
                <p>Scan QR code for full report.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};