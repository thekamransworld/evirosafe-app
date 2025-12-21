
import React, { useState } from 'react';
import type { Role, Resource, Action, Scope } from '../types';
import { allPossiblePermissions } from '../config';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts';

interface RolesProps {
  roles: Role[];
}

const PermissionRow: React.FC<{ resource: Resource, actions: Action[], scopes: Scope[], rolePermissions: any, onPermissionChange: any }> = ({ resource, actions, scopes, rolePermissions, onPermissionChange }) => {
  return (
    <tr className="border-b">
      <td className="py-3 px-4 font-semibold capitalize">{resource.replace('_', ' ')}</td>
      {allPossiblePermissions.find(p => p.resource === 'reports')!.actions.map(action => (
        <td key={action} className="py-3 px-4 text-center">
          {actions.includes(action) ? (
            <input
              type="checkbox"
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              checked={rolePermissions[resource]?.actions.includes(action) || false}
              onChange={(e) => onPermissionChange(resource, action, e.target.checked)}
            />
          ) : null}
        </td>
      ))}
    </tr>
  );
};


export const Roles: React.FC<RolesProps> = ({ roles: initialRoles }) => {
  const { can } = useAppContext();
  const [roles, setRoles] = useState(initialRoles);
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
        newPermissions.push({ resource, actions: [action], scope: 'org' }); // default scope
      }

      return { ...prevRole, permissions: newPermissions };
    });
  };
  
  const getRolePermissionsMap = (role: Role) => {
    return role.permissions.reduce((acc, p) => {
      acc[p.resource] = { actions: p.actions, scope: p.scope };
      return acc;
    }, {} as Record<Resource, { actions: Action[], scope: Scope }>);
  };
  
  const rolePermissionsMap = getRolePermissionsMap(selectedRole);

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-text-primary">Roles & Permissions</h1>
            {can('create', 'roles') && (
                <Button>
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Create Role
                </Button>
            )}
        </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card className="p-0">
            <div className="p-4 border-b">
                <h3 className="font-semibold">Roles</h3>
            </div>
            <ul>
              {roles.map((role) => (
                <li key={role.key}>
                  <button
                    onClick={() => setSelectedRole(role)}
                    className={`w-full text-left px-4 py-3 text-sm ${
                      selectedRole.key === role.key ? 'bg-primary-50 text-primary-700 font-semibold' : 'hover:bg-gray-50'
                    }`}
                  >
                    {role.label}
                    {role.is_system && <span className="ml-2 text-xs text-gray-400">(System)</span>}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="md:col-span-3">
          <Card>
             <div className="border-b pb-4 mb-4 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">{selectedRole.label}</h2>
                    <p className="text-sm text-text-secondary">Configure permissions for this role.</p>
                </div>
                <Button>Save Changes</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b">
                    <th className="py-2 px-4 text-left font-medium text-gray-500 uppercase">Resource</th>
                    {allPossiblePermissions.find(p => p.resource === 'reports')!.actions.map(action => (
                      <th key={action} className="py-2 px-4 text-center font-medium text-gray-500 uppercase w-20">{action}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allPossiblePermissions.map(p => (
                    <PermissionRow 
                      key={p.resource}
                      resource={p.resource}
                      actions={p.actions}
                      scopes={p.scopes}
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


// Icon
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);
