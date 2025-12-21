
import React, { useState, useEffect, useRef } from 'react';
import type { Rams as RamsType, RamsStatus, RamsStep, User } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import ReactMarkdown from 'react-markdown';
import { RiskMatrixDisplay } from './RiskMatrixDisplay';
import { useAppContext } from '../contexts';
import { ActionsBar } from './ui/ActionsBar';
import { EmailModal } from './ui/EmailModal';

interface RamsDetailModalProps {
  rams: RamsType;
  onClose: () => void;
  onStatusChange: (ramsId: string, newStatus: RamsStatus) => void;
}

const getStatusColor = (status: RamsStatus): 'green' | 'blue' | 'yellow' | 'red' | 'gray' => {
  switch (status) {
    case 'published': return 'green';
    case 'approved': return 'blue';
    case 'under_review': return 'yellow';
    case 'archived': return 'gray';
    case 'draft':
    default: return 'gray';
  }
};

const DetailItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
    <div className="text-sm text-gray-800 dark:text-gray-200 mt-1">{children}</div>
  </div>
);

const PersonDetail: React.FC<{ person?: { name: string; email: string; signed_at?: string } }> = ({ person }) => {
    if (!person || !person.name) return <span className="text-gray-400">N/A</span>;
    return (
        <div>
            <p className="font-semibold">{person.name}</p>
            {person.signed_at && <p className="text-xs text-green-600">Signed at {new Date(person.signed_at).toLocaleString()}</p>}
        </div>
    );
}

const WorkflowActions: React.FC<{ status: RamsStatus, onAction: (newStatus: RamsStatus) => void }> = ({ status, onAction }) => {
    const { can } = useAppContext();
    const canApprove = can('approve', 'rams');
    return (
        <div className="flex items-center space-x-2">
            {status === 'draft' && <Button onClick={() => onAction('under_review')}>Submit for Review</Button>}
            {status === 'under_review' && canApprove && (
                <>
                    <Button variant="secondary" onClick={() => onAction('draft')}>Request Changes</Button>
                    <Button onClick={() => onAction('approved')}>Approve</Button>
                </>
            )}
             {status === 'approved' && canApprove && <Button onClick={() => onAction('published')}>Publish</Button>}
             {status === 'published' && canApprove && <Button variant="danger" onClick={() => onAction('archived')}>Archive</Button>}
        </div>
    );
}

const StepDisplay: React.FC<{ step: RamsStep }> = ({ step }) => (
    <div className="border dark:border-dark-border rounded-lg overflow-hidden">
        <div className="bg-gray-50 dark:bg-dark-background p-3 border-b dark:border-dark-border">
            <h4 className="font-bold">Step {step.step_no}: {step.description}</h4>
        </div>
        <div className="p-3 grid grid-cols-2 gap-4">
            <div>
                <h5 className="font-semibold text-sm mb-2">Hazards</h5>
                <ul className="list-disc list-inside text-sm space-y-1">
                    {step.hazards.map(h => <li key={h.id}>{h.description}</li>)}
                </ul>
            </div>
             <div>
                <h5 className="font-semibold text-sm mb-2">Controls</h5>
                <ul className="list-disc list-inside text-sm space-y-1">
                    {step.controls.map(c => <li key={c.id}>{c.description} <span className="text-xs text-gray-500">({c.hierarchy})</span></li>)}
                </ul>
            </div>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-dark-background border-t dark:border-dark-border grid grid-cols-2 gap-4">
            <div>
                 <h5 className="font-semibold text-sm mb-2">Risk Before Controls</h5>
                 <RiskMatrixDisplay matrix={step.risk_before} />
            </div>
            <div>
                 <h5 className="font-semibold text-sm mb-2">Risk After Controls</h5>
                 <RiskMatrixDisplay matrix={step.risk_after} />
            </div>
        </div>
    </div>
);


export const RamsDetailModal: React.FC<RamsDetailModalProps> = ({ rams, onClose, onStatusChange }) => {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const handlePrint = () => window.print();

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b dark:border-dark-border flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{rams.activity} ({rams.version})</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Risk Assessment & Method Statement</p>
          </div>
          <div className="flex items-center gap-4">
             <ActionsBar onPrint={handlePrint} onDownloadPdf={handlePrint} onEmail={() => setIsEmailModalOpen(true)} />
             <Badge color={getStatusColor(rams.status)}>{rams.status.replace('_', ' ')}</Badge>
             <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><CloseIcon className="w-6 h-6" /></button>
          </div>
        </header>

        <div className="flex-grow flex overflow-hidden">
            <main className="flex-1 p-8 overflow-y-auto">
                <h3 className="text-lg font-bold">Method Statement</h3>
                <div className="prose dark:prose-invert max-w-none text-sm my-4"><ReactMarkdown>{rams.method_statement.overview}</ReactMarkdown></div>
                
                <h3 className="text-lg font-bold mt-6">Sequence of Operations</h3>
                <div className="space-y-4 mt-4">
                    {rams.method_statement.sequence_of_operations.map(step => (
                        <StepDisplay key={step.step_no} step={step} />
                    ))}
                </div>

                <h3 className="text-lg font-bold mt-6">Emergency Arrangements</h3>
                <div className="prose dark:prose-invert max-w-none text-sm my-4"><ReactMarkdown>{rams.method_statement.emergency_arrangements}</ReactMarkdown></div>

            </main>

            <aside className="w-80 bg-gray-50 dark:bg-dark-background border-l dark:border-dark-border p-6 overflow-y-auto flex-shrink-0">
                <h3 className="text-lg font-bold mb-4">Details</h3>
                <div className="space-y-4">
                    <DetailItem label="Prepared By"><PersonDetail person={rams.prepared_by} /></DetailItem>
                    <DetailItem label="Reviewed By"><PersonDetail person={rams.reviewed_by} /></DetailItem>
                    <DetailItem label="Client Approved By"><PersonDetail person={rams.approved_by_client} /></DetailItem>
                    <DetailItem label="Valid From">{new Date(rams.times.valid_from).toLocaleDateString()}</DetailItem>
                    <DetailItem label="Valid Until">{new Date(rams.times.valid_until).toLocaleDateString()}</DetailItem>
                </div>
                 <h3 className="text-lg font-bold mt-6 mb-4">Attachments</h3>
                 <ul className="space-y-2">
                     {rams.attachments.map(att => (
                         <li key={att.name} className="flex items-center p-2 bg-white dark:bg-dark-card border dark:border-dark-border rounded-md">
                             <PaperClipIcon className="w-5 h-5 text-gray-400 mr-2" />
                             <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline flex-1 truncate">{att.name}</a>
                         </li>
                     ))}
                     {rams.attachments.length === 0 && <p className="text-sm text-gray-500">No attachments.</p>}
                 </ul>
            </aside>
        </div>

        <footer className="p-4 border-t bg-gray-100 dark:bg-dark-background dark:border-dark-border flex justify-end items-center flex-shrink-0">
            <WorkflowActions status={rams.status} onAction={(newStatus) => onStatusChange(rams.id, newStatus)} />
        </footer>
      </div>
    </div>
    <EmailModal 
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        documentTitle={`RAMS: ${rams.activity}`}
        documentLink={`${window.location.href}?rams=${rams.id}`}
        defaultRecipients={[rams.prepared_by, rams.reviewed_by, rams.approved_by_client].filter(p => p && p.email) as User[]}
    />
    </>
  );
};


// Icons
const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const PaperClipIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.122 2.122l7.81-7.81" />
    </svg>
);
