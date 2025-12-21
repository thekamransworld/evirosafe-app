import React, { useState } from 'react';
import { Button } from './ui/Button';
import { FormField } from './ui/FormField';

interface ActionCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  users: any[];
  projects: any[];
}

export const ActionCreationModal: React.FC<ActionCreationModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  users = [], 
  projects = [] 
}) => {
    const [formData, setFormData] = useState({
        action: '',
        owner_id: '',
        project_id: '',
        due_date: new Date().toISOString().slice(0, 10),
        priority: 'Medium'
    });

    const handleSubmit = () => {
        if(!formData.action || !formData.project_id || !formData.due_date) {
            alert("Please fill in the Action description, Project, and Due Date.");
            return;
        }
        onSubmit(formData);
        setFormData({
            action: '',
            owner_id: '',
            project_id: '',
            due_date: new Date().toISOString().slice(0, 10),
            priority: 'Medium'
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create Standalone Action</h3>
                </div>
                <div className="p-6 space-y-4">
                    <FormField label="Action Description">
                        <textarea 
                            className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            rows={3}
                            value={formData.action}
                            onChange={e => setFormData(p => ({...p, action: e.target.value}))}
                            placeholder="Describe the corrective action..."
                        />
                    </FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Project">
                            <select 
                                className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                value={formData.project_id}
                                onChange={e => setFormData(p => ({...p, project_id: e.target.value}))}
                            >
                                <option value="">Select Project</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Priority">
                            <select 
                                className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                value={formData.priority}
                                onChange={e => setFormData(p => ({...p, priority: e.target.value}))}
                            >
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                                <option>Critical</option>
                            </select>
                        </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Owner">
                            <select 
                                className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                value={formData.owner_id}
                                onChange={e => setFormData(p => ({...p, owner_id: e.target.value}))}
                            >
                                <option value="">Unassigned</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Due Date">
                            <input 
                                type="date" 
                                className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                value={formData.due_date}
                                onChange={e => setFormData(p => ({...p, due_date: e.target.value}))}
                            />
                        </FormField>
                    </div>
                </div>
                <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Create Action</Button>
                </div>
            </div>
        </div>
    );
};