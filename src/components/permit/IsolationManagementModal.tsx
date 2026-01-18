import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Lock, Unlock, AlertTriangle, FileText, CheckCircle, X } from 'lucide-react';
import type { Ptw } from '../../types/permit';

interface IsolationManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  permit: Ptw;
  onUpdate: (isolations: any[]) => void;
}

export const IsolationManagementModal: React.FC<IsolationManagementModalProps> = ({
  isOpen,
  onClose,
  permit,
  onUpdate
}) => {
  // @ts-ignore
  const [isolations, setIsolations] = useState<any[]>(permit.payload.isolations || []);
  const [certificateGenerated, setCertificateGenerated] = useState(false);

  const handleToggleLock = (id: string) => {
    const updated = isolations.map(iso => 
      iso.id === id ? { ...iso, locked: !iso.locked, lockedAt: new Date().toISOString() } : iso
    );
    setIsolations(updated);
  };

  const handleSave = () => {
    onUpdate(isolations);
    onClose();
  };

  const allLocked = isolations.length > 0 && isolations.every(i => i.locked);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Lock className="w-6 h-6 text-red-600" />
              Isolation Management (LOTO)
            </h2>
            <p className="text-sm text-gray-500">Permit: {permit.permitNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
            <div>
              <h4 className="font-bold text-red-900 dark:text-red-200">Critical Safety Warning</h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                All energy sources must be isolated, locked, and tagged before work commences. Verify zero energy state.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 dark:text-white">Isolation Points</h3>
            {isolations.map((iso) => (
              <div key={iso.id} className={`flex items-center justify-between p-4 border rounded-xl transition-all ${iso.locked ? 'bg-green-50 border-green-200 dark:bg-green-900/10' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">{iso.equipment}</div>
                  <div className="text-sm text-gray-500">
                    {iso.isolationType} • Tag: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">{iso.tagNumber}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{iso.location}</div>
                </div>
                
                <button
                  onClick={() => handleToggleLock(iso.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
                    iso.locked 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-red-100 text-red-600 hover:bg-red-200'
                  }`}
                >
                  {iso.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  {iso.locked ? 'LOCKED' : 'UNLOCKED'}
                </button>
              </div>
            ))}
            {isolations.length === 0 && (
              <p className="text-center text-gray-500 py-8">No isolation points defined for this permit.</p>
            )}
          </div>

          {allLocked && (
            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-green-900 dark:text-green-200">All Points Isolated</h3>
              <p className="text-green-700 dark:text-green-300 mb-4">System is ready for verification.</p>
              
              {!certificateGenerated ? (
                <Button onClick={() => setCertificateGenerated(true)} className="bg-green-600 hover:bg-green-700 text-white">
                  <FileText className="w-4 h-4 mr-2" /> Generate Isolation Certificate
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-2 text-green-800 font-bold">
                  <FileText className="w-5 h-5" /> Certificate Generated: ISO-{permit.permitNumber}-001
                </div>
              )}
            </div>
          )}

        </div>

        <div className="p-6 border-t dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
};