import React, { useMemo } from 'react';
import { useAppContext, useDataContext } from '../contexts';
import { usePtwWorkflow } from '../contexts/PtwWorkflowContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

export const MyTasksWidget: React.FC = () => {
  const { activeUser, can } = useAppContext();
  const { ptwList } = useDataContext();
  const { validateUserPermission } = usePtwWorkflow();
  const { setSelectedPtw } = useModalContext(); // You need to export this from contexts

  const tasks = useMemo(() => {
    if (!activeUser) return [];

    return ptwList.filter(ptw => {
      // Check if user has permission to act on this PTW in its current state
      const permission = validateUserPermission(ptw, activeUser.id, activeUser.role);
      return permission;
    }).map(ptw => ({
      id: ptw.id,
      title: ptw.title,
      type: 'PTW',
      status: ptw.status,
      due: new Date(ptw.updated_at).toLocaleDateString()
    }));
  }, [ptwList, activeUser]);

  if (tasks.length === 0) return null;

  return (
    <Card title="My Pending Tasks" className="mb-6 border-l-4 border-l-blue-500">
      <div className="space-y-3">
        {tasks.map(task => (
          <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3">
              {task.status.includes('REJECT') ? <AlertCircle className="text-red-500 w-5 h-5" /> : <Clock className="text-blue-500 w-5 h-5" />}
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">{task.title}</p>
                <p className="text-xs text-gray-500">{task.type} • {task.status.replace('_', ' ')}</p>
              </div>
            </div>
            <Button size="sm" onClick={() => { /* Open Modal Logic Here */ }}>
              Action
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

// Helper hook import needed
import { useModalContext } from '../contexts';