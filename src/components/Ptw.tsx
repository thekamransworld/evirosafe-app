
import React from 'react';
import type { Project, User } from '../types';
import type { Ptw as PtwDoc } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { ptwTypeDetails } from '../config';
import { useAppContext } from '../contexts';

interface PtwProps {
  ptws: PtwDoc[];
  users: User[];
  projects: Project[];
  onCreatePtw: () => void;
  onAddExistingPtw: () => void;
  onSelectPtw: (ptw: PtwDoc) => void;
}

export const Ptw: React.FC<PtwProps> = ({ ptws, users, projects, onCreatePtw, onAddExistingPtw, onSelectPtw }) => {
  const { can } = useAppContext();

  const getStatusColor = (status: PtwDoc['status']): 'green' | 'blue' | 'yellow' | 'gray' | 'red' => {
    switch (status) {
      case 'ACTIVE': return 'green';
      case 'APPROVAL': return 'blue';
      case 'PRE_SCREEN':
      case 'SITE_INSPECTION':
      case 'SUBMITTED':
         return 'yellow';
      case 'HOLD': return 'red';
      case 'COMPLETED':
      case 'CLOSED':
          return 'gray';
      case 'DRAFT':
      default: return 'gray';
    }
  };

  const getProjectName = (projectId: string) => projects.find(p => p.id === projectId)?.name || 'Unknown';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Permit to Work</h1>
        {can('create', 'ptw') && (
            <div className="space-x-2">
                <Button variant="secondary" onClick={onAddExistingPtw}>Add Existing Permit</Button>
                <Button onClick={onCreatePtw}>
                  <PlusIcon className="w-5 h-5 mr-2" />
                  New Permit
                </Button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ptws.map((ptw) => {
          const details = ptwTypeDetails[ptw.type];
          
          return (
             <Card key={ptw.id} onClick={() => onSelectPtw(ptw)} className={`flex flex-col border-l-4 hover:shadow-lg transition-all cursor-pointer`} style={{ borderColor: details.hex }}>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center">
                            <span className="text-4xl mr-3">{details.icon}</span>
                            <div>
                                <h3 className="text-md font-bold text-text-primary">{ptw.title}</h3>
                                <p className="text-xs text-text-secondary">{ptw.type}</p>
                            </div>
                        </div>
                        <Badge color={getStatusColor(ptw.status)}>
                            {ptw.status.replace('_', ' ')}
                        </Badge>
                    </div>
                    <p className="text-sm text-text-secondary mt-2 line-clamp-2">{ptw.payload.work.description}</p>
                    <div className="text-xs text-gray-500 mt-4 space-y-1">
                        <p><strong>Permit #:</strong> {ptw.payload.permit_no || `Draft #${ptw.id.slice(-6)}`}</p>
                        <p><strong>Project:</strong> {getProjectName(ptw.project_id)}</p>
                        <p><strong>Location:</strong> {ptw.payload.work.location}</p>
                        {/* FIX: Corrected property access from '.schedule.start' to '.coverage.start_date' to match the type definition. */}
                        <p><strong>Validity:</strong> {new Date(ptw.payload.work.coverage.start_date).toLocaleDateString()}</p>
                        <p><strong>Requester:</strong> {ptw.payload.requester.name}</p>
                    </div>
                </div>
            </Card>
          )
        })}
      </div>
    </div>
  );
};

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);
