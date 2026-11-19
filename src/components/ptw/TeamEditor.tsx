import React from 'react';
import type { PtwTeamMember, User } from '../../types';
import { Button } from '../ui/Button';

const ROLES: Array<{ value: PtwTeamMember['role']; label: string }> = [
  { value: 'worker', label: 'Worker' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'standby', label: 'Standby / attendant' },
  { value: 'rigger', label: 'Rigger' },
  { value: 'fire_watch', label: 'Fire watch' },
  { value: 'gas_tester', label: 'Gas tester' },
  { value: 'crane_operator', label: 'Crane operator' },
];

const input = 'w-full p-2 border rounded-md text-sm bg-white dark:bg-dark-background dark:border-dark-border text-gray-900 dark:text-gray-100 disabled:opacity-60';

/**
 * Who is working under this permit. Linking a person to their EviroSafe account
 * lets the permit check their training certificates; anyone without an account
 * is listed but cannot be verified automatically.
 */
export const TeamEditor: React.FC<{
  team: PtwTeamMember[];
  onChange: (team: PtwTeamMember[]) => void;
  users: User[];
  disabled?: boolean;
}> = ({ team = [], onChange, users, disabled }) => {
  const update = (i: number, patch: Partial<PtwTeamMember>) => onChange(team.map((m, k) => (k === i ? { ...m, ...patch } : m)));
  const add = () => onChange([...team, { id: `t_${Date.now()}_${team.length}`, name: '', role: 'worker' }]);
  const remove = (i: number) => onChange(team.filter((_, k) => k !== i));

  return (
    <div className="border rounded-lg p-4 dark:border-dark-border" data-testid="team-editor">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h4 className="font-bold text-gray-800 dark:text-gray-200">Team</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">Link people to their EviroSafe account so their training certificates can be checked.</p>
        </div>
        {!disabled && <Button size="sm" onClick={add}>+ Add person</Button>}
      </div>
      {team.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No team members listed.</p>}
      <div className="space-y-3">
        {team.map((m, i) => (
          <div key={m.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end border-b pb-3 dark:border-dark-border last:border-0">
            <label className="md:col-span-3 text-xs text-gray-600 dark:text-gray-400">Name
              <input className={input} value={m.name} disabled={disabled} onChange={e => update(i, { name: e.target.value })} />
            </label>
            <label className="md:col-span-3 text-xs text-gray-600 dark:text-gray-400">EviroSafe account
              <select className={input} value={m.user_id ?? ''} disabled={disabled}
                onChange={e => {
                  const u = users.find(x => x.id === e.target.value);
                  update(i, u ? { user_id: u.id, name: m.name || u.name } : { user_id: undefined });
                }}>
                <option value="">Not linked (cannot be verified)</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </label>
            <label className="md:col-span-2 text-xs text-gray-600 dark:text-gray-400">Role on permit
              <select className={input} value={m.role} disabled={disabled} onChange={e => update(i, { role: e.target.value as PtwTeamMember['role'] })}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            <label className="md:col-span-2 text-xs text-gray-600 dark:text-gray-400">Company
              <input className={input} value={m.company ?? ''} disabled={disabled} onChange={e => update(i, { company: e.target.value })} />
            </label>
            <label className="md:col-span-1 text-xs text-gray-600 dark:text-gray-400">Mobile
              <input className={input} value={m.mobile ?? ''} disabled={disabled} onChange={e => update(i, { mobile: e.target.value })} />
            </label>
            <div className="md:col-span-1 text-right">
              {!disabled && <button type="button" onClick={() => remove(i)} className="text-red-500 text-sm px-2 py-2" aria-label={`Remove ${m.name || 'team member'}`}>Remove</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
