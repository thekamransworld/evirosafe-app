import React from 'react';
import type { AuditLogEntry, User } from '../types';
import { Card } from './ui/Card';

interface AuditTrailProps {
  logs: AuditLogEntry[];
  users: User[];
}

export const AuditTrail: React.FC<AuditTrailProps> = ({ logs, users }) => {
  const getUser = (userId: string) => users.find(u => u.id === userId);

  return (
    <Card title="Audit Trail">
      <div className="flow-root">
        <ul role="list" className="-mb-8">
          {logs.map((log, logIdx) => {
            const user = getUser(log.user_id);
            return (
              <li key={logIdx}>
                <div className="relative pb-8">
                  {logIdx !== logs.length - 1 ? (
                    <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
                  ) : null}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-dark-card">
                        <img
                          className="h-8 w-8 rounded-full"
                          src={user?.avatar_url || 'https://i.pravatar.cc/150'}
                          alt={user?.name || 'Unknown User'}
                        />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-1.5">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{user?.name || 'System'}</span>
                        {' '}{log.action.toLowerCase()}{log.details && <span className="italic"> {log.details}</span>}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </Card>
  );
};