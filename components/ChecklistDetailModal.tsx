

import React, { useState } from 'react';
import type { ChecklistTemplate, Organization, Project, User } from '../types';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts';

interface ChecklistDetailModalProps {
  template: ChecklistTemplate;
  organization: Organization;
  project: Project;
  user: User;
  onClose: () => void;
}

export const ChecklistDetailModal: React.FC<ChecklistDetailModalProps> = ({ template, organization, project, user, onClose }) => {
  const { language: userLang, activeOrg } = useAppContext();
  const [displayLang, setDisplayLang] = useState(userLang);

  const handlePrint = () => {
    window.print();
  };
  
  const getTranslated = (textRecord: Record<string, string>) => {
      return textRecord[displayLang] || textRecord[activeOrg.primaryLanguage] || textRecord['en'] || Object.values(textRecord)[0] || '';
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex justify-center items-start p-4 print:p-0">
        <div id="printable-checklist" className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col print:max-h-full print:shadow-none print:border-none">
          <div className="p-4 flex justify-between items-center border-b print:hidden">
            <h2 className="text-xl font-bold">Checklist Preview</h2>
            <div className="flex items-center space-x-2">
               <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{activeOrg.primaryLanguage.toUpperCase()}</span>
                    <button onClick={() => setDisplayLang(lang => lang === activeOrg.primaryLanguage ? (activeOrg.secondaryLanguages[0] || 'en') : activeOrg.primaryLanguage)} className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none ${displayLang !== activeOrg.primaryLanguage ? 'bg-primary-600' : 'bg-gray-300'}`}>
                        <span className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform ease-in-out duration-200 ${displayLang !== activeOrg.primaryLanguage ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <span className="text-sm font-medium">{(activeOrg.secondaryLanguages[0] || 'en').toUpperCase()}</span>
                </div>
              <Button variant="secondary" onClick={handlePrint}>🖨️ Print</Button>
              <Button>📄 Download PDF</Button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon className="w-6 h-6" /></button>
            </div>
          </div>
          <div className="p-8 overflow-y-auto print:overflow-visible">
            <header className="flex justify-between items-start mb-8 border-b pb-4">
                <div>
                    <h1 className="text-2xl font-bold">{getTranslated(template.title)}</h1>
                    <p className="text-gray-600">{template.category}</p>
                    <div className="mt-4 text-sm space-y-1">
                        <p><strong>Project:</strong> {project.name}</p>
                        <p><strong>Inspector:</strong> {user.name}</p>
                        <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <img src={organization.branding.logoUrl} alt={`${organization.name} Logo`} className="h-16 w-auto mb-2" />
                    {/* Placeholder for QR Code */}
                    <div className="w-24 h-24 bg-gray-200 flex items-center justify-center text-xs">QR CODE</div>
                </div>
            </header>
            <main>
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b-2 border-gray-400">
                            <th className="w-12 text-left p-2">#</th>
                            <th className="text-left p-2">Item</th>
                            <th className="w-48 text-left p-2">Result (Pass/Fail/NA)</th>
                            <th className="w-64 text-left p-2">Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {template.items.map((item, index) => (
                            <tr key={item.id} className="border-b">
                                <td className="p-3 align-top font-semibold">{index + 1}</td>
                                <td className="p-3 align-top">
                                    <p className="font-semibold">{getTranslated(item.text)}</p>
                                    <p className="text-xs text-gray-500">{getTranslated(item.description)}</p>
                                </td>
                                <td className="p-3 align-top"></td>
                                <td className="p-3 align-top"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>
          </div>
        </div>
      </div>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-checklist, #printable-checklist * {
            visibility: visible;
          }
          #printable-checklist {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </>
  );
};

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;