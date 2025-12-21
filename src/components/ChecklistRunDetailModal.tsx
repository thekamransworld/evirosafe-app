import React from 'react';
import type { ChecklistRun, ChecklistTemplate } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext } from '../contexts';
import { X, Printer } from 'lucide-react';

interface ChecklistRunDetailModalProps {
  run: ChecklistRun;
  template: ChecklistTemplate;
  onClose: () => void;
}

export const ChecklistRunDetailModal: React.FC<ChecklistRunDetailModalProps> = ({ run, template, onClose }) => {
  const { language, activeOrg } = useAppContext();

  // Helper to handle both string and object titles
  const getTranslated = (textRecord: string | Record<string, string> | undefined) => {
    if (!textRecord) return '';
    if (typeof textRecord === 'string') return textRecord;
    return textRecord[language] || textRecord[activeOrg.primaryLanguage] || textRecord['en'] || Object.values(textRecord)[0] || '';
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'na': return '➖';
      default: return '❓';
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'pass': return 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-300';
      case 'fail': return 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300';
      case 'na': return 'text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getItemById = (itemId: string) => {
    return template.items.find(item => item.id === itemId);
  };

  const passedItems = run.results?.filter(r => r.result === 'pass').length || 0;
  const totalItems = run.results?.length || template.items.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-2xl w-full max-w-5xl my-8" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-card rounded-t-lg sticky top-0 z-10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {getTranslated(template.title)}
              </h2>
              <div className="flex items-center space-x-4 mt-2">
                <Badge color={run.score >= 90 ? 'green' : run.score >= 70 ? 'yellow' : 'red'}>
                  Score: {run.score}%
                </Badge>
                <Badge color={run.status === 'completed' ? 'green' : 'blue'}>
                  {run.status.replace('_', ' ')}
                </Badge>
                <span className="text-sm text-gray-500">
                  {passedItems}/{totalItems} items passed
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(run.executed_at).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Printer className="w-4 h-4 mr-1" />
                Print
              </Button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Score Overview */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Score Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-100 dark:border-green-900/30">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{passedItems}</div>
                <div className="text-sm text-green-800 dark:text-green-300">Items Passed</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-100 dark:border-red-900/30">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">{run.results?.filter(r => r.result === 'fail').length || 0}</div>
                <div className="text-sm text-red-800 dark:text-red-300">Items Failed</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{run.results?.filter(r => r.result === 'na').length || 0}</div>
                <div className="text-sm text-blue-800 dark:text-blue-300">Not Applicable</div>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Result</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks & Evidence</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {run.results?.map((result, index) => {
                  const item = getItemById(result.item_id);
                  if (!item) return null;

                  return (
                    <tr key={result.item_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {getTranslated(item.text)}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {getTranslated(item.description)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getResultColor(result.result)}`}>
                          {getResultIcon(result.result)} {result.result.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {result.remarks ? (
                          <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/5 p-2 rounded">
                            <span className="font-semibold text-xs text-gray-500 block mb-1">Remarks:</span>
                            {result.remarks}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">No remarks</span>
                        )}
                        {result.evidence_urls && result.evidence_urls.length > 0 && (
                          <div className="mt-2 flex gap-2">
                             {result.evidence_urls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                                    Evidence {i+1}
                                </a>
                             ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Summary & Recommendations</h4>
            {run.score >= 90 ? (
              <p className="text-sm text-green-700 dark:text-green-300">
                ✅ Excellent compliance level. All critical items passed. No immediate action required.
              </p>
            ) : run.score >= 70 ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                ⚠️ Satisfactory compliance with minor issues. Review failed items and implement corrective actions.
              </p>
            ) : (
              <p className="text-sm text-red-700 dark:text-red-300">
                ❌ Unsatisfactory compliance level. Immediate corrective actions required before proceeding.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-card flex justify-end rounded-b-lg">
          <Button variant="secondary" onClick={onClose}>
            Close Detail View
          </Button>
        </div>
      </div>
    </div>
  );
};