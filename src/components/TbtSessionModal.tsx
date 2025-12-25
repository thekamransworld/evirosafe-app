import React, { useState, useRef, useEffect } from 'react';
import type { TbtSession, TbtAttendee, User } from '../types';
import { Button } from './ui/Button';
import { ActionsBar } from './ui/ActionsBar';
import { EmailModal } from './ui/EmailModal';

interface TbtSessionModalProps {
  session: TbtSession;
  onClose: () => void;
  onUpdate: (session: TbtSession) => void;
  users: User[];
}

const DetailItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="py-2">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <div className="text-base text-gray-900 dark:text-white mt-1">{children}</div>
    </div>
);

const SignaturePad: React.FC<{ onSave: (dataUrl: string) => void }> = ({ onSave }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
    }, []);

    const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
        const { offsetX, offsetY } = nativeEvent;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = nativeEvent;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.closePath();
        setIsDrawing(false);
    };

    const clear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const handleSave = () => {
        const dataUrl = canvasRef.current?.toDataURL() || '';
        onSave(dataUrl);
    };

    return (
        <div className="space-y-2">
            <canvas
                ref={canvasRef}
                width={300}
                height={150}
                className="border bg-white rounded-md cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
            />
            <div className="space-x-2">
                <Button variant="secondary" size="sm" onClick={clear}>Clear</Button>
                <Button size="sm" onClick={handleSave}>Save Signature</Button>
            </div>
        </div>
    );
};

export const TbtSessionModal: React.FC<TbtSessionModalProps> = ({ session, onClose, onUpdate, users = [] }) => {
    const [editedSession, setEditedSession] = useState(session);
    const [newAttendee, setNewAttendee] = useState({ name: '', company: '', role: '' });
    const [isSigning, setIsSigning] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const isViewMode = session.status === 'delivered' || session.status === 'closed';

    const handleAddAttendee = (signature: string) => {
        const attendee: TbtAttendee = {
            ...newAttendee,
            signature,
            attendance_time: new Date().toISOString(),
        };
        setEditedSession(prev => ({ ...prev, attendees: [...prev.attendees, attendee]}));
        setNewAttendee({ name: '', company: '', role: '' });
        setIsSigning(false);
    };
    
    const handleFinalize = () => {
        const finalSession = { ...editedSession, status: 'delivered' as const };
        onUpdate(finalSession);
    };

    const handlePrint = () => window.print();

    // Safety check: ensure users is an array before finding
    const conductedByUser = (users || []).find(u => u.name === editedSession.conducted_by.name);

    return (
        <>
        <div id="printable-tbt" className="hidden print:block p-8 bg-white text-black">
            <h1 className="text-2xl font-bold">{editedSession.title}</h1>
            <p><strong>Date:</strong> {editedSession.date} at {editedSession.time}</p>
            <p><strong>Location:</strong> {editedSession.location}</p>
            <p><strong>Conducted By:</strong> {editedSession.conducted_by.name}</p>
            <h2 className="text-xl font-bold mt-4 border-b">Summary</h2>
            <p className="mt-2">{editedSession.summary}</p>
            <h2 className="text-xl font-bold mt-4 border-b">Attendance</h2>
            <table className="w-full mt-2 text-sm border-collapse border">
                <thead><tr className="bg-gray-100">
                    <th className="border p-2">Name</th><th className="border p-2">Company</th><th className="border p-2">Signature</th>
                </tr></thead>
                <tbody>
                    {editedSession.attendees.map((att, i) => (
                        <tr key={i}><td className="border p-2">{att.name}</td><td className="border p-2">{att.company}</td><td className="border p-2"><img src={att.signature} className="h-8" alt="sig"/></td></tr>
                    ))}
                </tbody>
            </table>
        </div>
        <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-tbt, #printable-tbt * { visibility: visible; }
          #printable-tbt { position: absolute; left: 0; top: 0; width: 100%; }
           @page { size: A4; margin: 1.5cm; }
        }
      `}</style>
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4 print:hidden" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b dark:border-dark-border flex justify-between items-center bg-white dark:bg-dark-card sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{session.title}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Toolbox Talk Record</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <ActionsBar onPrint={handlePrint} onDownloadPdf={handlePrint} onEmail={() => setIsEmailModalOpen(true)} />
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><CloseIcon className="w-6 h-6"/></button>
                    </div>
                </header>
                <div className="flex-grow flex overflow-hidden">
                    <main className="flex-1 p-6 overflow-y-auto space-y-6 bg-white dark:bg-dark-card">
                        <DetailItem label="Summary">{editedSession.summary}</DetailItem>
                        <DetailItem label="Hazards Discussed"><ul className="list-disc list-inside text-gray-700 dark:text-gray-300">{editedSession.hazards_discussed.map((h,i) => <li key={i}>{h}</li>)}</ul></DetailItem>
                        <DetailItem label="Controls Discussed"><ul className="list-disc list-inside text-gray-700 dark:text-gray-300">{editedSession.controls_discussed.map((c,i) => <li key={i}>{c}</li>)}</ul></DetailItem>
                        {editedSession.discussion_points && <DetailItem label="Discussion Points"><ul className="list-disc list-inside text-gray-700 dark:text-gray-300">{editedSession.discussion_points.map((q,i) => <li key={i}>{q}</li>)}</ul></DetailItem>}
                    </main>
                    <aside className="w-96 bg-gray-50 dark:bg-dark-background border-l dark:border-dark-border p-4 overflow-y-auto">
                        <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Attendance</h3>
                        <div className="space-y-2">
                           {editedSession.attendees.map((att, index) => (
                               <div key={index} className="p-2 border dark:border-dark-border rounded-md bg-white dark:bg-dark-card flex items-center">
                                   <div className="flex-grow">
                                       <p className="font-semibold text-sm text-gray-900 dark:text-white">{att.name}</p>
                                       <p className="text-xs text-gray-500 dark:text-gray-400">{att.company}</p>
                                   </div>
                                   <img src={att.signature} alt="signature" className="h-8 w-20 object-contain bg-white rounded"/>
                               </div>
                           ))}
                        </div>
                         {!isViewMode && (
                            <div className="mt-4 border-t dark:border-dark-border pt-4">
                                {isSigning ? (
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-gray-900 dark:text-white">Sign In</h4>
                                        <SignaturePad onSave={handleAddAttendee}/>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-gray-900 dark:text-white">Add Attendee</h4>
                                        <input value={newAttendee.name} onChange={e => setNewAttendee(p => ({...p, name: e.target.value}))} placeholder="Name" className="w-full p-2 border dark:border-dark-border rounded-md text-sm bg-white dark:bg-dark-card text-gray-900 dark:text-white"/>
                                        <input value={newAttendee.company} onChange={e => setNewAttendee(p => ({...p, company: e.target.value}))} placeholder="Company" className="w-full p-2 border dark:border-dark-border rounded-md text-sm bg-white dark:bg-dark-card text-gray-900 dark:text-white"/>
                                        <Button onClick={() => setIsSigning(true)} disabled={!newAttendee.name || !newAttendee.company} className="w-full">Proceed to Sign</Button>
                                    </div>
                                )}
                            </div>
                         )}
                    </aside>
                </div>
                 {!isViewMode && (
                     <footer className="p-4 border-t bg-gray-100 dark:bg-dark-background dark:border-dark-border flex justify-end sticky bottom-0 z-10">
                        <Button onClick={handleFinalize}>Finalize & Deliver Session</Button>
                    </footer>
                 )}
            </div>
        </div>
        <EmailModal 
            isOpen={isEmailModalOpen}
            onClose={() => setIsEmailModalOpen(false)}
            documentTitle={`TBT Summary: ${session.title}`}
            defaultRecipients={conductedByUser ? [conductedByUser] : []}
            documentLink="#"
        />
        </>
    );
};

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;