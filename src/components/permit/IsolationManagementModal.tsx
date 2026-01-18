import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Lock, Unlock, AlertTriangle, CheckCircle, X } from 'lucide-react';
// FIX: Import from the main types file
import type { Ptw } from '../../types';

interface IsolationManagementModalProps {
  ptw: Ptw;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (isolations: any[]) => void;
}

export const IsolationManagementModal: React.FC<IsolationManagementModalProps> = ({
  ptw,
  isOpen,
  onClose,
  onUpdate
}) => {
  // Cast payload to any to access isolations safely
  const payload = ptw.payload as any;
  const [isolations, setIsolations] = useState<any[]>(payload.isolations || []);
  
  const [newIsolation, setNewIsolation] = useState({
    point: '',
    method: 'LOTO',
    tagNumber: '',
    isolatedBy: '',
    verifiedBy: ''
  });

  const handleAdd = () => {
    if (!newIsolation.point) return;
    const isolation = {
      id: `iso_${Date.now()}`,
      ...newIsolation,
      status: 'isolated',
      timestamp: new Date().toISOString()
    };
    const updated = [...isolations, isolation];
    setIsolations(updated);
    onUpdate(updated);
    setNewIsolation({ point: '', method: 'LOTO', tagNumber: '', isolatedBy: '', verifiedBy: '' });
  };

  const handleDeisolate = (id: string) => {
    const updated = isolations.map(iso => 
      iso.id === id ? { ...iso, status: 'deisolated', deisolatedAt: new Date().toISOString() } : iso
    );
    setIsolations(updated);
    onUpdate(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-red-500" />
            Isolation Management (LOTO)
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Add New Isolation */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
            <h4 className="font-bold mb-3 text-sm uppercase text-gray-500">Add Isolation Point</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input 
                placeholder="Isolation Point (e.g. Valve V-101)"
                value={newIsolation.point}
                onChange={e => setNewIsolation({...newIsolation, point: e.target.value})}
                className="p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
              />
              <input 
                placeholder="Tag Number"
                value={newIsolation.tagNumber}
                onChange={e => setNewIsolation({...newIsolation, tagNumber: e.target.value})}
                className="p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
              />
              <input 
                placeholder="Isolated By"
                value={newIsolation.isolatedBy}
                onChange={e => setNewIsolation({...newIsolation, isolatedBy: e.target.value})}
                className="p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
              />
              <input 
                placeholder="Verified By"
                value={newIsolation.verifiedBy}
                onChange={e => setNewIsolation({...newIsolation, verifiedBy: e.target.value})}
                className="p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
              />
            </div>
            <Button onClick={handleAdd} className="w-full">Apply Lock & Tag</Button>
          </div>

          {/* List */}
          <div className="space-y-2">
            {isolations.map((iso) => (
              <div key={iso.id} className={`p-3 border rounded-lg flex justify-between items-center ${iso.status === 'isolated' ? 'bg-red-50 border-red-200 dark:bg-red-900/20' : 'bg-green-50 border-green-200 dark:bg-green-900/20'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    {iso.status === 'isolated' ? <Lock className="w-4 h-4 text-red-600" /> : <Unlock className="w-4 h-4 text-green-600" />}
                    <span className="font-bold">{iso.point}</span>
                    <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">{iso.tagNumber}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {iso.status === 'isolated' ? `Isolated by ${iso.isolatedBy}` : `De-isolated at ${new Date(iso.deisolatedAt).toLocaleTimeString()}`}
                  </p>
                </div>
                {iso.status === 'isolated' && (
                  <Button size="sm" variant="secondary" onClick={() => handleDeisolate(iso.id)}>
                    Remove Lock
                  </Button>
                )}
              </div>
            ))}
            {isolations.length === 0 && <p className="text-center text-gray-500 italic">No active isolations.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};