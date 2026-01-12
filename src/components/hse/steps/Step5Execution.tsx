import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle, XCircle, MinusCircle, 
  MessageSquare, Camera, ChevronDown, ChevronUp 
} from 'lucide-react';
// FIX: Updated import path
import { HSEInspection, ChecklistItem } from '../../../types';

interface Step5Props {
  formData: Partial<HSEInspection>;
  setFormData: (data: Partial<HSEInspection>) => void;
}

export const Step5Execution: React.FC<Step5Props> = ({ formData, setFormData }) => {
  const [items, setItems] = useState<ChecklistItem[]>(formData.checklist_items || []);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  useEffect(() => {
    setFormData({ ...formData, checklist_items: items });
  }, [items]);

  const handleResponse = (itemId: string, value: 'pass' | 'fail' | 'na') => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          response: {
            ...item.response,
            value: value,
            timestamp: new Date(),
            responder: 'Current User',
            evidence_ids: item.response?.evidence_ids || []
          }
        };
      }
      return item;
    }));
    setExpandedItem(null);
  };

  const handleComment = (itemId: string, comment: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, response: { ...item.response!, comments: comment } } 
        : item
    ));
  };

  const groupedItems = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    items.forEach(item => {
      const cat = item.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [items]);

  const progress = Math.round((items.filter(i => i.response?.value).length / items.length) * 100) || 0;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-gray-900 dark:text-white">Inspection Progress</h3>
          <span className="text-sm font-bold text-blue-600">{progress}% Completed</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {Object.entries(groupedItems).length === 0 && (
        <div className="text-center py-10 text-gray-500">
          No checklist items loaded. Please select a template in Step 4.
        </div>
      )}

      {Object.entries(groupedItems).map(([category, categoryItems]) => (
        <div key={category} className="space-y-3">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">{category}</h4>
          
          {categoryItems.map((item) => (
            <div key={item.id} className={`bg-white dark:bg-gray-900 border rounded-xl overflow-hidden transition-all ${
              item.response?.value === 'fail' ? 'border-red-300 dark:border-red-900' : 
              item.response?.value === 'pass' ? 'border-green-300 dark:border-green-900' : 
              'border-gray-200 dark:border-gray-800'
            }`}>
              <div className="p-4 flex items-start gap-4">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{item.requirement}</p>
                  <p className="text-sm text-gray-500 mt-1">{item.criteria}</p>
                </div>
                
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleResponse(item.id, 'pass')}
                    className={`p-2 rounded-lg flex flex-col items-center gap-1 min-w-[60px] transition-colors ${
                      item.response?.value === 'pass' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100 dark:bg-gray-800'
                    }`}
                  >
                    <CheckCircle className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase">Pass</span>
                  </button>

                  <button
                    onClick={() => handleResponse(item.id, 'fail')}
                    className={`p-2 rounded-lg flex flex-col items-center gap-1 min-w-[60px] transition-colors ${
                      item.response?.value === 'fail' 
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100 dark:bg-gray-800'
                    }`}
                  >
                    <XCircle className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase">Fail</span>
                  </button>

                  <button
                    onClick={() => handleResponse(item.id, 'na')}
                    className={`p-2 rounded-lg flex flex-col items-center gap-1 min-w-[60px] transition-colors ${
                      item.response?.value === 'na' 
                        ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' 
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100 dark:bg-gray-800'
                    }`}
                  >
                    <MinusCircle className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase">N/A</span>
                  </button>
                </div>
              </div>

              {(expandedItem === item.id || item.response?.value === 'fail') && (
                <div className="px-4 pb-4 pt-0 animate-fade-in-down">
                  <div className="flex gap-3 mt-3">
                    <div className="flex-1 relative">
                      <MessageSquare className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Add remarks or observations..."
                        value={item.response?.comments || ''}
                        onChange={(e) => handleComment(item.id, e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                      />
                    </div>
                    <button className="px-3 py-2 border rounded-lg flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Camera className="w-4 h-4" />
                      Evidence
                    </button>
                  </div>
                </div>
              )}
              
              <button 
                onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                className="w-full flex justify-center py-1 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
              >
                {expandedItem === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};