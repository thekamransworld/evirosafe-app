
import React from 'react';
import type { TbtSession } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useDataContext, useModalContext, useAppContext } from '../contexts';

const StatCard: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
    <div className="bg-gray-100 dark:bg-dark-card p-4 rounded-lg text-center">
        <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">{title}</p>
        <p className="text-3xl font-bold text-primary-700 dark:text-primary-400 mt-1">{value}</p>
    </div>
);


export const Tbt: React.FC = () => {
  const { tbtList } = useDataContext();
  const { setIsTbtCreationModalOpen, setSelectedTbt } = useModalContext();
  const { can } = useAppContext();

  const upcomingSessions = tbtList.filter(s => s.status === 'draft' || s.status === 'scheduled');
  const pastSessions = tbtList.filter(s => s.status === 'delivered' || s.status === 'closed' || s.status === 'archived');
  
  const getStatusColor = (status: TbtSession['status']): 'green' | 'blue' | 'yellow' | 'red' | 'gray' => {
    switch (status) {
        case 'delivered':
        case 'closed': return 'green';
        case 'scheduled': return 'blue';
        case 'draft': return 'yellow';
        case 'archived': return 'gray';
        default: return 'gray';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">Toolbox Talks Dashboard</h1>
        {can('create', 'tbt') && (
            <Button onClick={() => setIsTbtCreationModalOpen(true)}>
              <PlusIcon className="w-5 h-5 mr-2" />
              New TBT Session
            </Button>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total TBTs" value={tbtList.length} />
          <StatCard title="Delivered This Month" value={pastSessions.filter(s => new Date(s.date).getMonth() === new Date().getMonth()).length} />
          <StatCard title="Upcoming TBTs" value={upcomingSessions.length} />
          <StatCard title="Compliance %" value="95%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Scheduled & Draft TBTs">
              <div className="space-y-3">
                  {upcomingSessions.map(session => (
                      <div key={session.id} className="p-3 bg-gray-50 dark:bg-dark-background rounded-md border dark:border-dark-border flex justify-between items-center">
                          <div>
                              <p className="font-semibold text-text-primary dark:text-dark-text-primary">{session.title}</p>
                              <p className="text-sm text-gray-500 dark:text-dark-text-secondary">{session.location} on {session.date}</p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge color={getStatusColor(session.status)}>{session.status}</Badge>
                            <Button size="sm" onClick={() => setSelectedTbt(session)}>
                                {session.status === 'draft' ? 'Prepare' : 'Start Session'}
                            </Button>
                          </div>
                      </div>
                  ))}
                  {upcomingSessions.length === 0 && <p className="text-sm text-center text-gray-500 py-4">No upcoming sessions.</p>}
              </div>
          </Card>
           <Card title="Past TBT Sessions">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                  {pastSessions.map(session => (
                      <div key={session.id} className="p-3 bg-gray-50 dark:bg-dark-background rounded-md border dark:border-dark-border flex justify-between items-center">
                          <div>
                              <p className="font-semibold text-text-primary dark:text-dark-text-primary">{session.title}</p>
                              <p className="text-sm text-gray-500 dark:text-dark-text-secondary">{session.location} on {session.date}</p>
                          </div>
                           <div className="flex items-center space-x-3">
                            <Badge color={getStatusColor(session.status)}>{session.status}</Badge>
                            <Button size="sm" variant="secondary" onClick={() => setSelectedTbt(session)}>View Record</Button>
                          </div>
                      </div>
                  ))}
                   {pastSessions.length === 0 && <p className="text-sm text-center text-gray-500 py-4">No past sessions.</p>}
              </div>
          </Card>
      </div>
    </div>
  );
};

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);
