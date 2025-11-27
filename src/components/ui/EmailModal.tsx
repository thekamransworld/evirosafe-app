
import React, { useState } from 'react';
import type { User } from '../../types';
import { Button } from './Button';

interface EmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentTitle: string;
    documentLink: string;
    defaultRecipients: Partial<User>[];
}

export const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose, documentTitle, documentLink, defaultRecipients }) => {
    const [recipients, setRecipients] = useState<string[]>(defaultRecipients.map(u => u.email).filter(Boolean) as string[]);
    const [additionalEmails, setAdditionalEmails] = useState('');
    const [subject, setSubject] = useState(`[EviroSafe FYI] ${documentTitle}`);
    const [message, setMessage] = useState(`Hello team,\n\nPlease review the following document:\n${documentLink}\n\nThank you.`);
    const [isSending, setIsSending] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSend = () => {
        setIsSending(true);
        setTimeout(() => {
            setIsSending(false);
            setIsSent(true);
            setTimeout(() => {
                onClose();
                setIsSent(false); // Reset for next time
            }, 2000);
        }, 1500);
    };
    
    const handleClose = () => {
        if (isSending) return;
        setIsSent(false);
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 print:hidden" onClick={handleClose}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                {isSent ? (
                    <div className="p-12 text-center">
                        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold">Email Sent!</h3>
                        <p className="text-text-secondary dark:text-dark-text-secondary">Your document has been successfully sent.</p>
                    </div>
                ) : (
                    <>
                        <div className="p-6 border-b dark:border-dark-border"><h3 className="text-xl font-bold">Email Document</h3></div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium">To:</label>
                                <div className="flex flex-wrap gap-2 p-2 border rounded-md mt-1 dark:border-dark-border bg-gray-50 dark:bg-dark-background">
                                    {recipients.map(email => (<span key={email} className="bg-gray-200 dark:bg-black/50 text-sm px-2 py-1 rounded-full">{email}</span>))}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Add more recipients (comma separated):</label>
                                <input type="text" value={additionalEmails} onChange={(e) => setAdditionalEmails(e.target.value)} className="w-full mt-1 p-2 border rounded-md dark:bg-dark-background dark:border-dark-border" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Subject:</label>
                                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full mt-1 p-2 border rounded-md dark:bg-dark-background dark:border-dark-border" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Message:</label>
                                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className="w-full mt-1 p-2 border rounded-md dark:bg-dark-background dark:border-dark-border" />
                                <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">A link to "{documentTitle}" will be included in this email.</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-dark-background px-6 py-3 flex justify-end space-x-2 border-t dark:border-dark-border">
                            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                            <Button onClick={handleSend} disabled={isSending}>{isSending ? 'Sending...' : 'Send Email'}</Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
