import React, { useState, useMemo, useEffect } from 'react';
import type { Resource, Action, Scope, RoleDefinition } from '../types/rbac';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useAppContext, useDataContext } from '../contexts';
import { Plus, Save, Shield, Info } from 'lucide-react';
import { FormField } from './ui/FormField';

// Define the matrix structure
const RESOURCES: Resource[] = [
  'dashboard', 'reports', 'inspections', 'ptw', 'checklists', 
  'housekeeping', 'plans', 'rams', 'signage', 'tbt', 
  'training', 'actions', 'organizations', 'projects', 
  'people', 'roles', 'settings'
];

const ACTIONS: Action[] = ['read', 'create', 'update', 'approve', 'delete', 'export', 'assign'];

// --- Role Creation Modal ---
const RoleCreationModal: React.FC<{ isOpen: boolean; onClose: () => void; onSubmit: (role: RoleDefinition) => void; existingRoles: RoleDefinition[] }> = ({ isOpen, onClose, onSubmit, existingRoles }) => {
    const [name, setName] = useState('');
    const [inheritsFrom, setInheritsFrom] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!name.trim()) {
            setError('Role name is required.');
            return;
        }
        
        const key = name.toUpperCase().replace(/\s+/g, '_');
        if (existingRoles.some(r => r.key === key)) {
            setError('Role with this name already exists.');
            return;
        }

        const newRole: RoleDefinition = {
            key,
            label: name,
            inheritsFrom: inheritsFrom || undefined,
            permissions: [],
            defaultScope: 'project'
        };

        onSubmit(newRole);
        onClose();
        setName('');
        setInheritsFrom('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-dark-border">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create Custom Role</h3>
                </div>
                <div className="p-6 space-y-4">
                    <FormField label="Role Name">
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" 
                            placeholder="e.g. Site Engineer" 
                        />
                    </FormField>
                    <FormField label="Inherits Permissions From (Optional)">
                        <select 
                            value={inheritsFrom} 
                            onChange={e => setInheritsFrom(e.target.value)} 
                            className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white"
                        >
                            <option value="">None (Start Empty)</option>
                            {existingRoles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                        </select>
                    </FormField>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
                <div className="bg-gray-50 dark:bg-dark-background px-6 py-3 flex justify-end space-x-2 border-t dark:border-dark-border">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Create Role</Button>
                </div>
            </div>
        </div>
    );
};

export const Roles: React.FC = () => {
  const { can } = useAppContext();
  const { rolesList, handleUpdateRole, handleCreateRole } = useDataContext();
  
  const [roles, setRoles] = useState(rolesList);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>('HSE_MANAGER');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
      if (rolesList.length > 0) {
          setRoles(rolesList);
      }
  }, [rolesList]);

  const selectedRole = useMemo(() => 
    roles.find(r => r.key === selectedRoleKey) || roles[0], 
  [roles, selectedRoleKey]);

  const hasPermission = (resource: Resource, action: Action) => {
    return selectedRole.permissions.some(p => 
      p.resource === resource && p.actions.includes(action)
    );
  };

  const togglePermission = (resource: Resource, action: Action) => {
    setRoles(prevRoles => prevRoles.map(role => {
      if (role.key !== selectedRoleKey) return role;

      const newPermissions = [...role.permissions];
      const existingRuleIndex = newPermissions.findIndex(p => p.resource === resource);

      if (existingRuleIndex >= 0) {
        const rule = { ...newPermissions[existingRuleIndex] };
        if (rule.actions.includes(action)) {
          rule.actions = rule.actions.filter(a => a !== action);
          if (rule.actions.length === 0) {
            newPermissions.splice(existingRuleIndex, 1);
          } else {
            newPermissions[existingRuleIndex] = rule;
          }
        } else {
          rule.actions.push(action);
          newPermissions[existingRuleIndex] = rule;
        }
      } else {
        newPermissions.push({
          resource,
          actions: [action],
          scope: role.defaultScope || 'org'
        });
      }

      return { ...role, permissions: newPermissions };
    }));
  };

  const handleScopeChange = (newScope: Scope) => {
      setRoles(prev => prev.map(r => r.key === selectedRoleKey ? { ...r, defaultScope: newScope } : r));
  };

  const handleSave = () => {
      if (selectedRole) {
          handleUpdateRole(selectedRole);
      }
  };

  const handleCreateSubmit = (newRole: RoleDefinition) => {
      handleCreateRole(newRole);
      setSelectedRoleKey(newRole.key);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Roles & Permissions</h1>
          <p className="text-slate-400 mt-1">Configure access levels using the RBAC Matrix.</p>
        </div>
        {can('create', 'roles') && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Create Custom Role
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-white">System Roles</h3>
            </div>
            <div className="divide-y dark:divide-slate-700">
              {roles.map((role) => (
                <button
                  key={role.key}
                  onClick={() => setSelectedRoleKey(role.key)}
                  className={`w-full text-left px-4 py-3 text-sm transition-all flex justify-between items-center ${
                    selectedRoleKey === role.key
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-500'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border-l-4 border-transparent'
                  }`}
                >
                  <span className="font-medium">{role.label}</span>
                  <Shield className="w-3 h-3 opacity-50" />
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <div className="flex justify-between items-center mb-6 border-b dark:border-slate-700 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedRole.label}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {selectedRole.inheritsFrom ? <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded dark:bg-blue-900 dark:text-blue-200">Inherits from: {roles.find(r => r.key === selectedRole.inheritsFrom)?.label}</span> : 'Configure permissions for this role.'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Default Scope:</span>
                      <select 
                        value={selectedRole.defaultScope || 'org'} 
                        onChange={(e) => handleScopeChange(e.target.value as Scope)}
                        className="bg-slate-100 dark:bg-slate-800 border-none rounded-md text-sm p-1.5 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
                      >
                          <option value="org">Organization</option>
                          <option value="project">Project</option>
                          <option value="team">Team</option>
                          <option value="own">Own / Self</option>
                      </select>
                  </div>
                  <Button onClick={handleSave} leftIcon={<Save className="w-4 h-4"/>}>Save Changes</Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-700">
                    <th className="py-3 px-4 text-left font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider w-48">
                      Module / Resource
                    </th>
                    {ACTIONS.map(action => (
                      <th key={action} className="py-3 px-2 text-center font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider w-20">
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                  {RESOURCES.map(resource => (
                    <tr key={resource} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200 capitalize border-r dark:border-slate-800">
                        {resource.replace(/-/g, ' ')}
                      </td>
                      {ACTIONS.map(action => {
                        const isChecked = hasPermission(resource, action);
                        return (
                          <td key={action} className="py-3 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(resource, action)}
                              className={`w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all ${
                                isChecked ? 'opacity-100' : 'opacity-30 hover:opacity-100'
                              }`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg flex items-start gap-3 text-xs text-blue-700 dark:text-blue-300">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                    <strong>Note:</strong> Permissions are additive. Checking a box grants the capability. 
                    The "Scope" setting determines <em>which</em> data they can act upon.
                </p>
            </div>
          </Card>
        </div>
      </div>

      <RoleCreationModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSubmit={handleCreateSubmit}
        existingRoles={roles}
      />
    </div>
  );
};