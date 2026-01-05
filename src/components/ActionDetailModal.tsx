import React, { useState } from 'react';
import type { ActionItem, User } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext } from '../contexts';

interface ActionDetailModalProps {
  actionItem: ActionItem;
  onClose: () => void;
  onUpdateStatus: (newStatus: ActionItem['status']) => void;
  users: User[];
}

export const ActionDetailModal: React.FC<ActionDetailModalProps> = ({ actionItem, onClose, onUpdateStatus, users }) => {
  const { activeUser } = useAppContext();
  const [comment, setComment] = useState('');

  const owner = users.find(u => u.id === actionItem.owner_id);
  
  // Mock History Generator
  const history = [
    { date: new Date().toISOString(), user: activeUser?.name || 'System', text: `Viewing action details`, type: 'view' },
    { date: actionItem.due_date, user: 'System', text: 'Action due date set', type: 'system' },
    { date: new Date(Date.now() - 86400000).toISOString(), user: 'System', text: 'Action created', type: 'create' },
  ];

  // FIX: Ensure returned colors match BadgeProps
  const getPriorityColor = (p?: string): 'red' | 'yellow' | 'green' => {
      switch(p) {
          case 'Critical': return 'red';
          case 'High': return 'red'; // Changed from orange to red
          case 'Medium': return 'yellow';
          default: return 'green';
      }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b dark:border-dark-border flex justify-between items-start">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <Badge color={actionItem.status === 'Closed' ? 'green' : 'blue'}>{actionItem.status}</Badge>
                    {actionItem.priority && <Badge color={getPriorityColor(actionItem.priority)}>{actionItem.priority}</Badge>}
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Action #{actionItem.id.slice(-6)}</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8">
            {/* Details */}
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                    <p className="text-gray-900 dark:text-gray-100 mt-1 bg-gray-50 dark:bg-white/5 p-3 rounded-lg border dark:border-white/10">
                        {actionItem.action}
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Assigned To</label>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                {owner?.name.charAt(0) || '?'}
                            </div>
                            <span className="text-sm text-gray-900 dark:text-white">{owner?.name || 'Unassigned'}</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Due Date</label>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">{new Date(actionItem.due_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Source</label>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">{actionItem.source.type} ({actionItem.source.id})</p>
                    </div>
                </div>
            </div>

            {/* History / Timeline */}
            <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 border-b dark:border-dark-border pb-2">Activity History</h3>
                <div className="space-y-6 relative pl-4 border-l-2 border-gray-200 dark:border-gray-700 ml-2">
                    {history.map((item, idx) => (
                        <div key={idx} className="relative">
                            <div className={`absolute -left-[21px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-dark-card ${item.type === 'create' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                            <p className="text-xs text-gray-500 mb-0.5">{new Date(item.date).toLocaleString()}</p>
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                                <span className="font-semibold">{item.user}</span>: {item.text}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Add Comment (Visual Only for Demo) */}
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a note or update..." 
                    className="flex-1 p-2 text-sm border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white"
                />
                <Button size="sm" variant="secondary" onClick={() => setComment('')}>Post</Button>
            </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t dark:border-dark-border bg-gray-50 dark:bg-black/20 flex justify-end gap-2 rounded-b-xl">
            {actionItem.status !== 'Closed' && (
                <Button onClick={() => { onUpdateStatus('Closed'); onClose(); }} className="bg-green-600 hover:bg-green-700 text-white border-none">
                    Mark as Closed
                </Button>
            )}
            {actionItem.status === 'Open' && (
                <Button onClick={() => { onUpdateStatus('In Progress'); onClose(); }} className="bg-blue-600 hover:bg-blue-700 text-white border-none">
                    Start Progress
                </Button>
            )}
            <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};