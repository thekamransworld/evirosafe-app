
import React, { useState, useEffect, useRef } from 'react';
import type { Plan, PlanStatus, User } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import ReactMarkdown from 'react-markdown';
import { useAppContext } from '../contexts';
import { ActionsBar } from './ui/ActionsBar';
import { EmailModal } from './ui/EmailModal';

interface PlanDetailModalProps {
  plan: Plan;
  onClose: () => void;
  onStatusChange: (planId: string, newStatus: PlanStatus) => void;
}

const getStatusColor = (status: PlanStatus): 'green' | 'blue' | 'yellow' | 'red' | 'gray' => {
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
    <div className="text-sm text-gray-800 mt-1">{children}</div>
  </div>
);

const PersonDetail: React.FC<{ person?: { name: string, email: string, signed_at?: string } }> = ({ person }) => {
    if (!person) return <span className="text-gray-400">N/A</span>;
    return (
        <div>
            <p className="font-semibold">{person.name}</p>
            <p className="text-xs text-gray-500">{person.email}</p>
            {person.signed_at && <p className="text-xs text-green-600">Signed at {new Date(person.signed_at).toLocaleString()}</p>}
        </div>
    );
}

const WorkflowActions: React.FC<{ status: PlanStatus, onAction: (newStatus: PlanStatus) => void }> = ({ status, onAction }) => {
    const { can } = useAppContext();
    const canApprove = can('approve', 'plans');
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

export const PlanDetailModal: React.FC<PlanDetailModalProps> = ({ plan, onClose, onStatusChange }) => {
  const [activeSection, setActiveSection] = React.useState(plan.content.body_json[0]?.title || '');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const handlePrint = () => window.print();

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{plan.title} ({plan.version})</h2>
            <p className="text-sm text-gray-500">{plan.type} Plan</p>
          </div>
          <div className="flex items-center gap-4">
             <ActionsBar onPrint={handlePrint} onDownloadPdf={handlePrint} onEmail={() => setIsEmailModalOpen(true)} />
             <Badge color={getStatusColor(plan.status)}>{plan.status.replace('_', ' ')}</Badge>
             <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon className="w-6 h-6" /></button>
          </div>
        </header>

        <div className="flex-grow flex overflow-hidden">
            <nav className="w-64 bg-gray-50 border-r overflow-y-auto p-4 flex-shrink-0">
                <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Sections</h3>
                <ul>
                    {plan.content.body_json.map(section => (
                        <li key={section.title}>
                            <button
                                onClick={() => setActiveSection(section.title)}
                                className={`w-full text-left p-2 rounded-md text-sm font-medium ${activeSection === section.title ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-200'}`}
                            >
                                {section.title}
                            </button>
                        </li>
                    ))}
                     {plan.content.body_json.length === 0 && <p className="text-sm text-gray-500">No content sections.</p>}
                </ul>
            </nav>

            <main className="flex-1 p-8 overflow-y-auto">
                 {plan.status === 'under_review' && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <MailIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                A review request has been sent to the Client. This plan is pending approval.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                {plan.content.body_json.map(section => (
                    <div key={section.title} className={activeSection === section.title ? '' : 'hidden'}>
                        <h1 className="text-2xl font-bold border-b pb-2 mb-4">{section.title}</h1>
                        <div className="prose max-w-none">
                            <ReactMarkdown>{section.content}</ReactMarkdown>
                        </div>
                    </div>
                ))}
                 {plan.content.body_json.length === 0 && <p className="text-center text-gray-500">This plan has no content yet.</p>}
            </main>

            <aside className="w-80 bg-gray-50 border-l p-6 overflow-y-auto flex-shrink-0">
                <h3 className="text-lg font-bold mb-4">Details</h3>
                <div className="space-y-4">
                    <DetailItem label="Prepared By"><PersonDetail person={plan.people.prepared_by} /></DetailItem>
                    <DetailItem label="Reviewed By"><PersonDetail person={plan.people.reviewed_by} /></DetailItem>
                    <DetailItem label="Client Approved By"><PersonDetail person={plan.people.approved_by_client} /></DetailItem>
                    <DetailItem label="Last Updated">{new Date(plan.dates.updated_at).toLocaleDateString()}</DetailItem>
                    <DetailItem label="Next Review">{new Date(plan.dates.next_review_at).toLocaleDateString()}</DetailItem>
                    <DetailItem label="Tags">
                        <div className="flex flex-wrap gap-1">
                            {plan.meta.tags.map(tag => <Badge key={tag} color="gray" size="sm">{tag}</Badge>)}
                        </div>
                    </DetailItem>
                </div>
                 <h3 className="text-lg font-bold mt-6 mb-4">Attachments</h3>
                 <ul className="space-y-2">
                     {plan.content.attachments.map(att => (
                         <li key={att.name} className="flex items-center p-2 bg-white border rounded-md">
                             <PaperClipIcon className="w-5 h-5 text-gray-400 mr-2" />
                             <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline flex-1 truncate">{att.name}</a>
                         </li>
                     ))}
                     {plan.content.attachments.length === 0 && <p className="text-sm text-gray-500">No attachments.</p>}
                 </ul>
            </aside>
        </div>

        <footer className="p-4 border-t bg-gray-100 flex justify-end items-center flex-shrink-0">
            <WorkflowActions status={plan.status} onAction={(newStatus) => onStatusChange(plan.id, newStatus)} />
        </footer>
      </div>
    </div>
    <EmailModal 
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        documentTitle={`Plan: ${plan.title}`}
        documentLink={`${window.location.href}?plan=${plan.id}`}
        defaultRecipients={[plan.people.prepared_by, plan.people.reviewed_by, plan.people.approved_by_client].filter(Boolean) as User[]}
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
const MailIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>;
