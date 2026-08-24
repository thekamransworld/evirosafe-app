import React, { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { uploadFileToCloud } from '../../services/storageService';
import type { ControlledDocument, DocCategory } from '../../types';

const CATEGORY_OPTIONS: { value: DocCategory; label: string }[] = [
  { value: 'policy',           label: 'Policy' },
  { value: 'procedure',        label: 'Procedure' },
  { value: 'form',             label: 'Form' },
  { value: 'risk_assessment',  label: 'Risk Assessment' },
  { value: 'method_statement', label: 'Method Statement' },
  { value: 'plan',             label: 'Plan' },
  { value: 'register',         label: 'Register' },
  { value: 'certificate',      label: 'Certificate' },
  { value: 'report',           label: 'Report' },
  { value: 'permit',           label: 'Permit' },
  { value: 'other',            label: 'Other' },
];

const fieldClass = 'w-full mt-1 p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white';
const labelClass = 'text-xs font-bold text-gray-500 uppercase';

interface DocumentCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<ControlledDocument, 'id' | 'org_id'>) => void;
  ownerName: string;
}

const emptyForm = {
  doc_number: '', title: '', category: 'procedure' as DocCategory,
  current_version: '1.0', review_date: '', description: '',
};

export const DocumentCreationModal: React.FC<DocumentCreationModalProps> = ({ isOpen, onClose, onSubmit, ownerName }) => {
  const [formData, setFormData] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setFormData(emptyForm);
    setFile(null);
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.doc_number.trim()) {
      setError('Please enter a document number and title.');
      return;
    }
    if (!file) {
      setError('Please attach a file.');
      return;
    }

    setUploading(true);
    setError('');
    let fileUrl: string;
    try {
      fileUrl = await uploadFileToCloud(file, 'documents');
    } catch (err: any) {
      setUploading(false);
      setError(`Upload failed: ${err.message || 'check your connection and try again.'}`);
      return;
    }
    setUploading(false);

    const now = new Date().toISOString();
    onSubmit({
      ...formData,
      status: 'draft',
      owner: ownerName,
      approved_by: null,
      approved_at: null,
      file_url: fileUrl,
      revisions: [{ version: formData.current_version, revised_by: ownerName, revised_at: now, change_notes: 'Initial upload' }],
    });
    handleClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-6 border-b dark:border-dark-border flex justify-between items-start flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Document</h2>
            <p className="text-sm text-gray-500">Add a version-controlled document to the register</p>
          </div>
          <button onClick={handleClose}><X className="w-5 h-5 text-gray-400" /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Document Number *</label>
              <input value={formData.doc_number} onChange={e => setFormData({ ...formData, doc_number: e.target.value })} placeholder="e.g. POL-001" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as DocCategory })} className={fieldClass}>
                {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Title *</label>
            <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className={fieldClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Version</label>
              <input value={formData.current_version} onChange={e => setFormData({ ...formData, current_version: e.target.value })} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Review Date</label>
              <input type="date" value={formData.review_date} onChange={e => setFormData({ ...formData, review_date: e.target.value })} className={fieldClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} className={fieldClass} />
          </div>

          <div>
            <label className={labelClass}>File *</label>
            <label className="mt-1 flex items-center gap-2 p-3 border-2 border-dashed rounded-lg dark:border-dark-border cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-background text-sm">
              <Upload className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300">{file ? file.name : 'Click to choose a file'}</span>
              <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>

        <footer className="p-4 border-t dark:border-dark-border flex justify-end gap-2 flex-shrink-0">
          <Button variant="secondary" onClick={handleClose} disabled={uploading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={uploading}>
            {uploading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</span> : 'Add Document'}
          </Button>
        </footer>
      </div>
    </div>
  );
};