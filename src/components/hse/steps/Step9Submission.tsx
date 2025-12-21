import React from 'react';
import { Button } from '../../ui/Button';
import { Send, CheckCircle, ShieldCheck } from 'lucide-react';

interface Step9Props {
  onSubmit: () => void;
  saving: boolean;
  formData: any;
}

export const Step9Submission: React.FC<Step9Props> = ({ onSubmit, saving, formData }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full py-10 text-center">
      <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <ShieldCheck className="w-12 h-12 text-green-600 dark:text-green-400" />
      </div>
      
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Ready to Submit</h2>
      <p className="text-gray-500 max-w-md mb-8">
        Your inspection <strong>{formData.title}</strong> is ready for submission. 
        This will generate the final report, notify stakeholders, and log findings in the action tracker.
      </p>

      <div className="w-full max-w-md bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 mb-8 text-left">
          <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-4 border-b pb-2">Submission Checklist</h4>
          <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-4 h-4 text-green-500"/> Team assigned
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-4 h-4 text-green-500"/> Checklist completed
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-4 h-4 text-green-500"/> Findings recorded
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-4 h-4 text-green-500"/> Evidence attached
              </li>
          </ul>
      </div>

      <Button onClick={onSubmit} disabled={saving} size="lg" className="w-64 justify-center bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/30">
        {saving ? (
            <span className="flex items-center gap-2">Processing...</span>
        ) : (
            <span className="flex items-center gap-2">
                <Send className="w-5 h-5" /> Submit Inspection
            </span>
        )}
      </Button>
    </div>
  );
};