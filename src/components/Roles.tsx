import React, { useState } from 'react';
import type { Role, Resource, Action } from '../types';
import { allPossiblePermissions } from '../config';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts';
import { Plus } from 'lucide-react';

interface RolesProps {
  roles: Role[];
}

const PermissionRow: React.FC<{ resource: Resource, actions: Action[], rolePermissions: any, onPermissionChange: any }> = ({ resource, actions, rolePermissions, onPermissionChange }) => {
  return (
    <tr className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
      <td className="py-3 px-4 font-semibold capitalize text-slate-900 dark:text-slate-100">
        {resource.replace('_', ' ')}
      </td>
      {allPossiblePermissions.find(p => p.resource === 'reports')!.actions.map(action => (
        <td key={action} className="py-3 px-4 text-center">
          {actions.includes(action) ? (
            <input
              type="checkbox"
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
              checked={rolePermissions[resource]?.actions.includes(action) || false}
              onChange={(e) => onPermissionChange(resource, action, e.target.checked)}
            />
          ) : (
            <span className="block w-4 h-4 mx-auto bg-gray-100 dark:bg-slate-800 rounded-sm opacity-50"></span>
          )}
        </td>
      ))}
    </tr>
  );
};

export const Roles: React.FC<RolesProps> = ({ roles: initialRoles }) => {
  const { can } = useAppContext();
  const [roles] = useState(initialRoles);
  const [selectedRole, setSelectedRole] = useState<Role>(roles[0]);

  const handlePermissionChange = (resource: Resource, action: Action, checked: boolean) => {
    setSelectedRole(prevRole => {
      const newPermissions = [...prevRole.permissions];
      const permissionIndex = newPermissions.findIndex(p => p.resource === resource);
      
      if (permissionIndex > -1) {
        const existingActions = newPermissions[permissionIndex].actions;
        if (checked && !existingActions.includes(action)) {
          newPermissions[permissionIndex].actions.push(action);
        } else if (!checked) {
          newPermissions[permissionIndex].actions = existingActions.filter(a => a !== action);
        }
      } else if (checked) {
        newPermissions.push({ resource, actions: [action], scope: 'org' });
      }

      return { ...prevRole, permissions: newPermissions };
    });
  };
  
  const getRolePermissionsMap = (role: Role) => {
    return role.permissions.reduce((acc, p) => {
      acc[p.resource] = { actions: p.actions, scope: p.scope };
      return acc;
    }, {} as Record<Resource, { actions: Action[], scope: any }>);
  };
  
  const rolePermissionsMap = getRolePermissionsMap(selectedRole);

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Roles & Permissions</h1>
                <p className="text-slate-400 mt-1">Manage access levels and system capabilities</p>
            </div>
            {can('create', 'roles') && (
                <Button>
                    <Plus className="w-5 h-5 mr-2" />
                    Create Role
                </Button>
            )}
        </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                <h3 className="font-bold text-slate-800 dark:text-white">Available Roles</h3>
            </div>
            <ul className="divide-y dark:divide-slate-700">
              {roles.map((role) => (
                <li key={role.key}>
                  <button
                    onClick={() => setSelectedRole(role)}
                    className={`w-full text-left px-4 py-3 text-sm transition-all duration-200 ${
                      selectedRole.key === role.key 
                        ? 'bg-primary-50 text-primary-700 font-bold border-l-4 border-primary-600 dark:bg-primary-900/20 dark:text-primary-400' 
                        : 'text-slate-600 hover:bg-gray-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                        <span>{role.label}</span>
                        {role.is_system && (
                            <span className="text-[10px] uppercase tracking-wider bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded dark:bg-slate-700 dark:text-slate-400">
                                System
                            </span>
                        )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="md:col-span-3">
          <Card>
             <div className="border-b dark:border-slate-700 pb-4 mb-4 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedRole.label}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Configure resource access and functional permissions for this role.
                    </p>
                </div>
                <Button>Save Changes</Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr className="border-b dark:border-slate-700">
                    <th className="py-3 px-4 text-left font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs">Resource</th>
                    {allPossiblePermissions.find(p => p.resource === 'reports')!.actions.map(action => (
                      <th key={action} className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs w-24">
                          {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                  {allPossiblePermissions.map(p => (
                    <PermissionRow 
                      key={p.resource}
                      resource={p.resource}
                      actions={p.actions}
                      rolePermissions={rolePermissionsMap}
                      onPermissionChange={handlePermissionChange}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};