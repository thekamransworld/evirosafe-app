import React, { useState } from 'react';
import type { User } from '../../types';
import { Button } from './Button';
import { sendDocumentEmail } from '../../services/emailService'; // <--- Import Service

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
    const [message, setMessage] = useState(`Hello,\n\nPlease review the attached document.\n\nThank you.`);
    const [isSending, setIsSending] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSend = async () => {
        setIsSending(true);
        
        // Combine all emails
        const extra = additionalEmails.split(',').map(e => e.trim()).filter(e => e);
        const allEmails = [...new Set([...recipients, ...extra])];

        try {
            // Send email to each recipient
            const promises = allEmails.map(email => 
                sendDocumentEmail(email, documentTitle, documentLink, message)
            );
            
            await Promise.all(promises);
            
            setIsSent(true);
            setTimeout(() => {
                onClose();
                setIsSent(false);
            }, 2000);
        } catch (error) {
            alert("Failed to send emails. Check console.");
        } finally {
            setIsSending(false);
        }
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
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Email Sent!</h3>
                        <p className="text-text-secondary dark:text-dark-text-secondary">Your document has been successfully sent.</p>
                    </div>
                ) : (
                    <>
                        <div className="p-6 border-b dark:border-dark-border"><h3 className="text-xl font-bold text-gray-900 dark:text-white">Email Document</h3></div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">To:</label>
                                <div className="flex flex-wrap gap-2 p-2 border rounded-md mt-1 dark:border-dark-border bg-gray-50 dark:bg-dark-background">
                                    {recipients.map(email => (<span key={email} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm px-2 py-1 rounded-full">{email}</span>))}
                                    {recipients.length === 0 && <span className="text-gray-400 text-sm">No default recipients</span>}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Add more recipients (comma separated):</label>
                                <input type="text" value={additionalEmails} onChange={(e) => setAdditionalEmails(e.target.value)} className="w-full mt-1 p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="colleague@company.com" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Message:</label>
                                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className="w-full mt-1 p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" />
                                <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">A link to "{documentTitle}" will be included automatically.</p>
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