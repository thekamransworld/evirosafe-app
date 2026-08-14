import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/Button';
import type { Chemical, GhsHazard } from '../types';

const GHS_OPTIONS: { key: GhsHazard; label: string }[] = [
  { key: 'explosive',      label: 'Explosive' },
  { key: 'flammable',      label: 'Flammable' },
  { key: 'oxidising',      label: 'Oxidising' },
  { key: 'compressed_gas', label: 'Compressed Gas' },
  { key: 'corrosive',      label: 'Corrosive' },
  { key: 'toxic',          label: 'Toxic' },
  { key: 'irritant',       label: 'Irritant' },
  { key: 'environmental',  label: 'Environmental' },
  { key: 'health_hazard',  label: 'Health Hazard' },
];

type ChemicalDraft = Omit<Chemical, 'id' | 'org_id' | 'status' | 'last_review' | 'ppe_required'> & { ppe_required: string };

const emptyForm: ChemicalDraft = {
  substance_name: '', trade_name: '', manufacturer: '', cas_number: '', un_number: '',
  hazard_class: '', ghs_hazards: [], sds_url: '', quantity_on_site: 0, unit: '',
  storage_location: '', ppe_required: '', first_aid: '', disposal_method: '',
};

const fieldClass = 'w-full mt-1 p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white';
const labelClass = 'text-xs font-bold text-gray-500 uppercase';

interface ChemicalCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Chemical, 'id' | 'org_id' | 'status' | 'last_review'>) => void;
}

export const ChemicalCreationModal: React.FC<ChemicalCreationModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<ChemicalDraft>(emptyForm);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const toggleHazard = (h: GhsHazard) => {
    setFormData(prev => ({
      ...prev,
      ghs_hazards: prev.ghs_hazards.includes(h) ? prev.ghs_hazards.filter(x => x !== h) : [...prev.ghs_hazards, h],
    }));
  };

  const handleClose = () => {
    setFormData(emptyForm);
    setError('');
    onClose();
  };

  const handleSubmit = () => {
    if (!formData.substance_name.trim()) {
      setError('Please enter the substance name.');
      return;
    }
    if (formData.ghs_hazards.length === 0) {
      setError('Select at least one GHS hazard classification.');
      return;
    }
    onSubmit({
      ...formData,
      ppe_required: formData.ppe_required.split(',').map(p => p.trim()).filter(Boolean),
    });
    handleClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-6 border-b dark:border-dark-border flex justify-between items-start flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Chemical</h2>
            <p className="text-sm text-gray-500">Register a hazardous substance for the COSHH inventory</p>
          </div>
          <button onClick={handleClose}><X className="w-5 h-5 text-gray-400" /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Substance Name *</label>
              <input value={formData.substance_name} onChange={e => setFormData({ ...formData, substance_name: e.target.value })} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Trade Name</label>
              <input value={formData.trade_name} onChange={e => setFormData({ ...formData, trade_name: e.target.value })} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Manufacturer</label>
              <input value={formData.manufacturer} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Hazard Class</label>
              <input value={formData.hazard_class} onChange={e => setFormData({ ...formData, hazard_class: e.target.value })} placeholder="e.g. Class 3 Flammable Liquid" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>CAS Number</label>
              <input value={formData.cas_number} onChange={e => setFormData({ ...formData, cas_number: e.target.value })} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>UN Number</label>
              <input value={formData.un_number} onChange={e => setFormData({ ...formData, un_number: e.target.value })} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Quantity on Site</label>
              <input type="number" value={formData.quantity_on_site} onChange={e => setFormData({ ...formData, quantity_on_site: Number(e.target.value) })} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Unit</label>
              <input value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} placeholder="L, kg, cylinders..." className={fieldClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>GHS Hazards *</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {GHS_OPTIONS.map(o => (
                <button key={o.key} type="button" onClick={() => toggleHazard(o.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    formData.ghs_hazards.includes(o.key)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white dark:bg-dark-background border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-300'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Storage Location</label>
            <input value={formData.storage_location} onChange={e => setFormData({ ...formData, storage_location: e.target.value })} className={fieldClass} />
          </div>

          <div>
            <label className={labelClass}>PPE Required (comma-separated)</label>
            <input value={formData.ppe_required} onChange={e => setFormData({ ...formData, ppe_required: e.target.value })} placeholder="Chemical gloves, Safety glasses..." className={fieldClass} />
          </div>

          <div>
            <label className={labelClass}>First Aid</label>
            <textarea value={formData.first_aid} onChange={e => setFormData({ ...formData, first_aid: e.target.value })} rows={2} className={fieldClass} />
          </div>

          <div>
            <label className={labelClass}>Disposal Method</label>
            <textarea value={formData.disposal_method} onChange={e => setFormData({ ...formData, disposal_method: e.target.value })} rows={2} className={fieldClass} />
          </div>

          <div>
            <label className={labelClass}>SDS URL</label>
            <input value={formData.sds_url} onChange={e => setFormData({ ...formData, sds_url: e.target.value })} placeholder="https://..." className={fieldClass} />
          </div>
        </div>

        <footer className="p-4 border-t dark:border-dark-border flex justify-end gap-2 flex-shrink-0">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Add Chemical</Button>
        </footer>
      </div>
    </div>
  );
};