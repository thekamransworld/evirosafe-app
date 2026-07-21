import React, { useState } from 'react';
import type { User } from '../types';
import { Button } from './ui/Button';
import { FormField } from './ui/FormField';
import { useAppContext, useDataContext } from '../contexts';
import { roles as rolesData } from '../config';
import { sendInviteEmail } from '../services/emailService';
import { useToast } from './ui/Toast';

/**
 * AddUserModal — the SINGLE canonical way to invite a new person into an
 * organization anywhere in the app.
 *
 * This replaces three previously separate/duplicated entry points:
 *  1. People.tsx "Add User" button (was non-functional)
 *  2. OrganizationDetails.tsx "Invite User" (had its own local re-implementation)
 *  3. ProjectDetails.tsx Team tab "Add Member" (was a dead stub —
 *     that button now correctly does something different: assigning an
 *     EXISTING person to a project team, not creating a new person.
 *     See AssignTeamMemberModal.tsx for that flow.)
 *
 * Both People.tsx and OrganizationDetails.tsx render THIS component so
 * there is exactly one invite implementation, one validation path, and
 * one email-sending call — no risk of the two drifting apart over time.
 */

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-select a project at invite time (optional — used when inviting from within a project context) */
  defaultProjectId?: string;
  /** Override which org the invite is created under. Defaults to the globally active org.
   *  Pass this when inviting from a specific organization's detail page, which may not
   *  be the same as the user's currently "active" org. */
  targetOrgId?: string;
  targetOrgName?: string;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, defaultProjectId, targetOrgId, targetOrgName }) => {
  const { handleInviteUser, activeOrg, activeUser } = useAppContext();
  const { projects } = useDataContext();
  const toast = useToast();

  const orgId   = targetOrgId   || (activeOrg as any)?.id;
  const orgName = targetOrgName || (activeOrg as any)?.name || '';

  const orgProjects = projects.filter(p => p.org_id === orgId);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'WORKER' as User['role'],
    project_id: defaultProjectId || '',
  });
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Full Name and Email are required.');
      return;
    }

    setIsSending(true);
    setError('');

    try {
      // 1. Send invitation email
      try {
        await sendInviteEmail(
          formData.email,
          formData.name,
          formData.role,
          orgName,
          activeUser?.name || '',
        );
      } catch (emailErr) {
        // Email delivery failing shouldn't block the actual invite record
        // from being created — log it but continue.
        console.warn('[AddUserModal] Invite email failed to send:', emailErr);
      }

      // 2. Create the invited-user record (Firestore stub + local state)
      await handleInviteUser({
        org_id: orgId,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        project_id: formData.project_id || undefined,
      } as any);

      toast.success(`Invitation sent to ${formData.email}`);
      onClose();
      setFormData({ name: '', email: '', role: 'WORKER', project_id: defaultProjectId || '' });
    } catch (err) {
      console.error(err);
      setError('Failed to send invitation. Please try again.');
      toast.error('Invitation failed to send.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b dark:border-dark-border">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Invite New Person</h3>
          <p className="text-sm text-gray-500">
            {orgName ? `Add a member to ${orgName}` : 'Add a member to your organization'}
          </p>
        </div>
        <div className="p-6 space-y-4">
          <FormField label="Full Name">
            <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="John Doe" autoFocus />
          </FormField>
          <FormField label="Email Address">
            <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
              className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="john@example.com" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Role">
              <select value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value as User['role'] }))}
                className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white">
                {rolesData.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </FormField>
            <FormField label="Assign Project (optional)">
              <select value={formData.project_id} onChange={e => setFormData(p => ({ ...p, project_id: e.target.value }))}
                className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white">
                <option value="">No Project (Org Level)</option>
                {orgProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </FormField>
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>}
        </div>
        <div className="bg-gray-50 dark:bg-dark-background px-6 py-3 flex justify-end space-x-2 border-t dark:border-dark-border rounded-b-lg">
          <Button variant="secondary" onClick={onClose} disabled={isSending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSending}>
            {isSending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;