import React, { useState } from 'react';
import type { ChecklistRun, ChecklistTemplate, User } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface HousekeepingRunDetailModalProps {
  run: ChecklistRun;
  template: ChecklistTemplate;
  executor: User | undefined;
  onClose: () => void;
}

export const HousekeepingRunDetailModal: React.FC<HousekeepingRunDetailModalProps> = ({ run, template, executor, onClose }) => {
  const [reviewerNote, setReviewerNote] = useState('');

  const getResultColor = (result: string) => {
      switch(result) {
          case 'pass': return 'text-green-600 bg-green-50 border-green-200';
          case 'fail': return 'text-red-600 bg-red-50 border-red-200';
          default: return 'text-gray-500 bg-gray-50 border-gray-200';
      }
  };

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b dark:border-dark-border flex justify-between items-start">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Housekeeping Inspection Record</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {template?.title['en'] || 'Checklist'} • {new Date(run.executed_at).toLocaleString()}
                </p>
            </div>
            <div className="text-right">
                <div className="text-3xl font-bold text-emerald-600">{run.score}%</div>
                <div className="text-xs text-gray-500 uppercase font-bold">Compliance Score</div>
            </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
            
            {/* Meta Data */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-lg border dark:border-dark-border">
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Inspected By</p>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                            {executor?.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{executor?.name || 'Unknown'}</span>
                    </div>
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Status</p>
                    <div className="mt-1">
                        <Badge color={run.status === 'completed' ? 'green' : 'yellow'}>
                            {run.status.toUpperCase()}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Checklist Results */}
            <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Checklist Results</h3>
                <div className="space-y-3">
                    {run.results.map((result, idx) => {
                        const item = template.items.find(i => i.id === result.item_id);
                        return (
                            <div key={idx} className="flex justify-between items-start p-3 border-b dark:border-dark-border last:border-0">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {item?.text['en'] || 'Unknown Item'}
                                    </p>
                                    {result.remarks && (
                                        <p className="text-xs text-gray-500 mt-1 italic">
                                            Note: {result.remarks}
                                        </p>
                                    )}
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getResultColor(result.result)}`}>
                                    {result.result.toUpperCase()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Reviewer Section (Workflow) */}
            <div className="pt-4 border-t dark:border-dark-border">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Supervisor Review</h3>
                <textarea 
                    className="w-full p-3 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white"
                    rows={3}
                    placeholder="Add review comments or corrective actions..."
                    value={reviewerNote}
                    onChange={(e) => setReviewerNote(e.target.value)}
                />
            </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t dark:border-dark-border bg-gray-50 dark:bg-black/20 flex justify-end gap-3 rounded-b-lg">
            <Button variant="secondary" onClick={handlePrint}>Print Report</Button>
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button onClick={onClose}>Verify & Archive</Button>
        </div>
      </div>
    </div>
  );
};