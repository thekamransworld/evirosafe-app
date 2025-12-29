import React, { useState, useEffect } from 'react';
import type { Project, User } from '../types';
import { Button } from './ui/Button';
import { FormField } from './ui/FormField';

interface ProjectCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Project, 'id' | 'org_id' | 'status'>) => void;
  users: User[];
}

export const ProjectCreationModal: React.FC<ProjectCreationModalProps> = ({ isOpen, onClose, onSubmit, users }) => {
    // Filter users who can be managers
    const managers = users.filter(u => ['SUPERVISOR', 'HSE_MANAGER', 'ADMIN', 'ORG_ADMIN'].includes(u.role));

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        location: '',
        start_date: new Date().toISOString().split('T')[0],
        finish_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        manager_id: '',
        type: 'Construction'
    });
    const [error, setError] = useState('');

    // Auto-select the first manager when the modal opens to prevent "Required" error
    useEffect(() => {
        if (isOpen && !formData.manager_id && managers.length > 0) {
            setFormData(prev => ({ ...prev, manager_id: managers[0].id }));
        }
    }, [isOpen, managers]);

    const handleSubmit = () => {
        // Robust Validation
        if (!formData.name.trim()) {
            setError('Project Name is required.');
            return;
        }
        if (!formData.code.trim()) {
            setError('Project Code is required.');
            return;
        }
        if (!formData.manager_id) {
            setError('Please select a Project Manager.');
            return;
        }

        onSubmit(formData);
        onClose();
        
        // Reset form
        setFormData({
            name: '',
            code: '',
            location: '',
            start_date: new Date().toISOString().split('T')[0],
            finish_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            manager_id: '',
            type: 'Construction'
        });
        setError('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-dark-border">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create New Project</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Project Name">
                            <input 
                                type="text" 
                                value={formData.name} 
                                onChange={e => setFormData(p => ({...p, name: e.target.value}))} 
                                className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" 
                                placeholder="e.g. Alpha Tower"
                            />
                        </FormField>
                        <FormField label="Project Code">
                            <input 
                                type="text" 
                                value={formData.code} 
                                onChange={e => setFormData(p => ({...p, code: e.target.value}))} 
                                className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" 
                                placeholder="e.g. PRJ-001"
                            />
                        </FormField>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <FormField label="Location">
                            <input 
                                type="text" 
                                value={formData.location} 
                                onChange={e => setFormData(p => ({...p, location: e.target.value}))} 
                                className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" 
                                placeholder="City, Site Area"
                            />
                        </FormField>
                        <FormField label="Type">
                            <select 
                                value={formData.type} 
                                onChange={e => setFormData(p => ({...p, type: e.target.value}))} 
                                className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white"
                            >
                                <option>Construction</option>
                                <option>Shutdown</option>
                                <option>Operations</option>
                                <option>Office</option>
                                <option>Maintenance</option>
                            </select>
                        </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Start Date">
                            <input 
                                type="date" 
                                value={formData.start_date} 
                                onChange={e => setFormData(p => ({...p, start_date: e.target.value}))} 
                                className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" 
                            />
                        </FormField>
                        <FormField label="Finish Date">
                            <input 
                                type="date" 
                                value={formData.finish_date} 
                                onChange={e => setFormData(p => ({...p, finish_date: e.target.value}))} 
                                className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" 
                            />
                        </FormField>
                    </div>
                    <FormField label="Project Manager">
                        <select 
                            value={formData.manager_id} 
                            onChange={e => setFormData(p => ({...p, manager_id: e.target.value}))} 
                            className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white"
                        >
                            <option value="">Select Manager</option>
                            {managers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </FormField>
                    
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
                        </div>
                    )}
                </div>
                <div className="bg-gray-50 dark:bg-dark-background px-6 py-3 flex justify-end space-x-2 border-t dark:border-dark-border">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Create Project</Button>
                </div>
            </div>
        </div>
    );
};