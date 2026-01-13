import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext } from '../contexts';
import { ROLE_DEFINITIONS } from '../config/permissions';
import type { Resource, Action, RoleDefinition, PermissionRule } from '../types/rbac';
import { 
  Plus, Save, Shield, Check, X, Lock, 
  LayoutDashboard, FileText, ClipboardCheck, FileCheck, 
  ListTodo, Brush, FileSpreadsheet, ShieldAlert, 
  AlertTriangle, Megaphone, GraduationCap, Activity, 
  Building2, FolderKanban, Users, Settings, Key
} from 'lucide-react';
import { useToast } from './ui/Toast';

// --- CONFIGURATION MATCHING YOUR SCREENSHOT ---

const RESOURCES: { key: Resource; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { key: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
  { key: 'inspections', label: 'Inspections', icon: <ClipboardCheck className="w-4 h-4" /> },
  { key: 'ptw', label: 'Ptw', icon: <FileCheck className="w-4 h-4" /> },
  { key: 'checklists', label: 'Checklists', icon: <ListTodo className="w-4 h-4" /> },
  { key: 'housekeeping', label: 'Housekeeping', icon: <Brush className="w-4 h-4" /> },
  { key: 'plans', label: 'Plans', icon: <FileSpreadsheet className="w-4 h-4" /> },
  { key: 'rams', label: 'Rams', icon: <ShieldAlert className="w-4 h-4" /> },
  { key: 'signage', label: 'Signage', icon: <AlertTriangle className="w-4 h-4" /> },
  { key: 'tbt', label: 'Tbt', icon: <Megaphone className="w-4 h-4" /> },
  { key: 'training', label: 'Training', icon: <GraduationCap className="w-4 h-4" /> },
  { key: 'actions', label: 'Actions', icon: <Activity className="w-4 h-4" /> },
  { key: 'organizations', label: 'Organizations', icon: <Building2 className="w-4 h-4" /> },
  { key: 'projects', label: 'Projects', icon: <FolderKanban className="w-4 h-4" /> },
  { key: 'people', label: 'People', icon: <Users className="w-4 h-4" /> },
  { key: 'roles', label: 'Roles', icon: <Key className="w-4 h-4" /> },
  { key: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

const ACTIONS: { key: Action; label: string }[] = [
  { key: 'read', label: 'READ' },
  { key: 'create', label: 'CREATE' },
  { key: 'update', label: 'UPDATE' },
  { key: 'approve', label: 'APPROVE' },
  { key: 'delete', label: 'DELETE' },
  { key: 'export', label: 'EXPORT' },
  { key: 'assign', label: 'ASSIGN' },
];

// --- HELPER: FLATTEN PERMISSIONS (Handle Inheritance) ---
const getEffectivePermissions = (roleKey: string, definitions: Record<string, RoleDefinition>): PermissionRule[] => {
  const roleDef = definitions[roleKey];
  if (!roleDef) return [];
  
  let permissions = [...roleDef.permissions];
  
  // Recursive inheritance
  if (roleDef.inheritsFrom) {
    const inherited = getEffectivePermissions(roleDef.inheritsFrom, definitions);
    // Merge: Current role overrides inherited if conflict (simplified here as union)
    permissions = [...permissions, ...inherited];
  }
  
  return permissions;
};

export const Roles: React.FC = () => {
  const { can } = useAppContext();
  const toast = useToast();
  
  // Local state for roles to allow "editing" in UI
  const [rolesConfig, setRolesConfig] = useState(ROLE_DEFINITIONS);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>('ADMIN');
  const [isDirty, setIsDirty] = useState(false);

  const selectedRole = rolesConfig[selectedRoleKey];

  // Calculate effective permissions for the selected role (including inheritance)
  const effectivePermissions = useMemo(() => {
    return getEffectivePermissions(selectedRoleKey, rolesConfig);
  }, [selectedRoleKey, rolesConfig]);

  const hasPermission = (resource: Resource, action: Action) => {
    // Admin bypass - visually check everything
    if (selectedRoleKey === 'ADMIN') return true;

    return effectivePermissions.some(p => 
      p.resource === resource && p.actions.includes(action)
    );
  };

  const handleTogglePermission = (resource: Resource, action: Action) => {
    if (selectedRoleKey === 'ADMIN') {
        toast.info("Administrator permissions cannot be modified.");
        return;
    }

    setRolesConfig(prev => {
      const newConfig = { ...prev };
      const role = { ...newConfig[selectedRoleKey] };
      const existingRuleIndex = role.permissions.findIndex(p => p.resource === resource);

      if (existingRuleIndex >= 0) {
        // Rule exists, toggle action
        const rule = { ...role.permissions[existingRuleIndex] };
        if (rule.actions.includes(action)) {
          rule.actions = rule.actions.filter(a => a !== action);
        } else {
          rule.actions = [...rule.actions, action];
        }
        role.permissions[existingRuleIndex] = rule;
      } else {
        // Rule doesn't exist, create it
        role.permissions = [...role.permissions, { resource, actions: [action], scope: role.defaultScope }];
      }

      newConfig[selectedRoleKey] = role;
      return newConfig;
    });
    setIsDirty(true);
  };

  const handleSave = () => {
    // In a real app, this would save to Firebase
    console.log("Saving roles config:", rolesConfig);
    toast.success("Permissions updated successfully.");
    setIsDirty(false);
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
            <h1 className="text-3xl font-bold text-text-primary dark:text-white">Roles & Permissions</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage access levels and system capabilities.</p>
        </div>
        {can('create', 'roles') && (
            <Button>
                <Plus className="w-5 h-5 mr-2" />
                Create Role
            </Button>
        )}
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* LEFT SIDEBAR: ROLES LIST */}
        <Card className="w-72 flex flex-col p-0 overflow-hidden shrink-0 border-r-0">
            <div className="p-4 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                <h3 className="font-bold text-slate-800 dark:text-white">Roles</h3>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {Object.values(rolesConfig).map((role) => (
                    <button
                        key={role.key}
                        onClick={() => setSelectedRoleKey(role.key)}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all duration-200 flex justify-between items-center ${
                            selectedRoleKey === role.key 
                            ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' 
                            : 'text-slate-600 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}
                    >
                        <span>{role.label}</span>
                        {/* Simple heuristic for "System" roles */}
                        {['ADMIN', 'ORG_ADMIN', 'HSE_MANAGER', 'SUPERVISOR', 'HSE_OFFICER', 'INSPECTOR', 'WORKER', 'CLIENT_VIEWER'].includes(role.key) && (
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-normal">(System)</span>
                        )}
                    </button>
                ))}
            </div>
        </Card>

        {/* RIGHT CONTENT: PERMISSION MATRIX */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-white dark:bg-dark-card shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedRole.label}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Configure permissions for this role. 
                        {selectedRole.inheritsFrom && <span className="ml-2 text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded text-xs">Inherits from: {rolesConfig[selectedRole.inheritsFrom]?.label}</span>}
                    </p>
                </div>
                {isDirty && (
                    <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Save className="w-4 h-4 mr-2" /> Save Changes
                    </Button>
                )}
            </div>

            {/* Matrix Table */}
            <div className="flex-1 overflow-auto">
                <table className="min-w-full text-sm text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-slate-800/80 sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                            <th className="py-4 px-6 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs border-b dark:border-slate-700 w-64">
                                Resource
                            </th>
                            {ACTIONS.map(action => (
                                <th key={action.key} className="py-4 px-2 text-center font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] border-b dark:border-slate-700 w-24">
                                    {action.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800">
                        {RESOURCES.map((resource) => (
                            <tr key={resource.key} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="py-3 px-6 font-medium text-slate-900 dark:text-slate-200 border-r dark:border-slate-800 bg-white dark:bg-dark-card sticky left-0 z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 rounded bg-gray-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                            {resource.icon}
                                        </div>
                                        {resource.label}
                                    </div>
                                </td>
                                {ACTIONS.map(action => {
                                    const isAllowed = hasPermission(resource.key, action.key);
                                    const isAdmin = selectedRoleKey === 'ADMIN';
                                    
                                    return (
                                        <td key={action.key} className="py-3 px-2 text-center">
                                            <label className={`inline-flex items-center justify-center w-6 h-6 rounded-md border transition-all cursor-pointer
                                                ${isAllowed 
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                                                    : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-transparent hover:border-blue-400'}
                                                ${isAdmin ? 'opacity-50 cursor-not-allowed' : ''}
                                            `}>
                                                <input 
                                                    type="checkbox" 
                                                    className="hidden" 
                                                    checked={isAllowed} 
                                                    onChange={() => handleTogglePermission(resource.key, action.key)}
                                                    disabled={isAdmin}
                                                />
                                                <Check className="w-4 h-4" strokeWidth={3} />
                                            </label>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};