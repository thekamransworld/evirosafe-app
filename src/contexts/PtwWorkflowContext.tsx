import React, { createContext, useContext, ReactNode } from 'react';
import type { Ptw, PtwWorkflowStage } from '../types';
import { PtwWorkflowEngine } from '../utils/workflowEngine';

// Import UserRole type from workflowEngine — cast string to it safely
type UserRole = 'ADMIN' | 'ORG_ADMIN' | 'HSE_MANAGER' | 'SUPERVISOR' | 'WORKER';

interface PtwWorkflowContextType {
  moveToNextStage:        (ptw: Ptw, userId: string, comments?: string) => Ptw | null;
  getNextPossibleStages:  (ptw: Ptw) => PtwWorkflowStage[];
  validateUserPermission: (ptw: Ptw, userId: string, userRole: string) => boolean;
  getStageResponsibilities: (stage: PtwWorkflowStage) => string[];
}

const PtwWorkflowContext = createContext<PtwWorkflowContextType | undefined>(undefined);

export const usePtwWorkflow = () => {
  const context = useContext(PtwWorkflowContext);
  if (!context) throw new Error('usePtwWorkflow must be used within a PtwWorkflowProvider');
  return context;
};

export const PtwWorkflowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  const moveToNextStage = (ptw: Ptw, userId: string, comments?: string): Ptw | null => {
    const nextStages = PtwWorkflowEngine.getNextStages(ptw.status);
    if (nextStages.length === 0) return null;
    const nextStage = nextStages[0];
    return {
      ...ptw,
      status: nextStage,
      workflow_log: [
        ...(ptw.workflow_log || []),
        {
          stage:        nextStage,
          action:       `Moved to ${nextStage}`,
          user_id:      userId,
          timestamp:    new Date().toISOString(),
          comments,
          signoff_type: 'digital',
        }
      ],
      updated_at: new Date().toISOString(),
    };
  };

  const getNextPossibleStages = (ptw: Ptw): PtwWorkflowStage[] =>
    PtwWorkflowEngine.getNextStages(ptw.status);

  const validateUserPermission = (ptw: Ptw, userId: string, userRole: string): boolean => {
    // Fixed: cast userRole string to UserRole — the engine validates it internally
    const safeRole = (Object.values({ ADMIN: 'ADMIN', ORG_ADMIN: 'ORG_ADMIN', HSE_MANAGER: 'HSE_MANAGER', SUPERVISOR: 'SUPERVISOR', WORKER: 'WORKER' }).includes(userRole)
      ? userRole
      : 'WORKER') as UserRole;

    const permission = PtwWorkflowEngine.validateRolePermission(ptw.status, safeRole, userId, ptw);
    return permission.allowed;
  };

  const getStageResponsibilities = (stage: PtwWorkflowStage): string[] => {
    const responsibilities: Record<PtwWorkflowStage, string[]> = {
      DRAFT:              ['Requester: Complete application details'],
      SUBMITTED:          ['Reviewer: Check details'],
      PRE_SCREEN:         ['HSE: Initial check'],
      SITE_INSPECTION:    ['Inspector: Verify site'],
      REQUESTED:          ['Issuer: Review application', 'HSE: Verify risk assessment'],
      ISSUER_REVIEW:      ['Issuer: Verify site conditions', 'Issuer: Confirm isolations'],
      ISSUER_SIGNED:      ['IV Provider: Independent verification (if critical)'],
      IV_REVIEW:          ['IV Provider: Conduct safety review', 'IV Provider: Verify controls'],
      PENDING_APPROVAL:   ['Approver: Review and authorize'],
      APPROVAL:           ['Approver: Final safety check', 'Approver: Budget/scope verification'],
      APPROVER_SIGNED:    ['Issuer: Prepare for handover'],
      AUTHORIZATION:      ['Issuer: Generate permit documents'],
      HANDOVER_PENDING:   ['Issuer: Conduct pre-job briefing'],
      SITE_HANDOVER:      ['Receiver: Accept responsibility', 'Receiver: Verify site conditions'],
      ACTIVE:             ['Receiver: Supervise work', 'Safety Watch: Monitor conditions'],
      HOLD:               ['Issuer: Pause work'],
      SUSPENDED:          ['Receiver: Secure work area', 'Issuer: Review suspension reason'],
      COMPLETION_PENDING: ['Receiver: Clean work area', 'Receiver: Remove tools'],
      JOINT_INSPECTION:   ['Issuer & Receiver: Inspect work area', 'Issuer: Verify isolations removed'],
      COMPLETED:          ['Receiver: Finish work'],
      CLOSED:             ['Issuer: Archive documents', 'System: Update asset records'],
      CANCELLED:          ['Issuer: Document cancellation reason'],
      REJECTED:           ['Issuer: Reject permit'],
      ARCHIVED:           ['System: Retention period compliance'],
    };
    return responsibilities[stage] || [];
  };

  return (
    <PtwWorkflowContext.Provider value={{ moveToNextStage, getNextPossibleStages, validateUserPermission, getStageResponsibilities }}>
      {children}
    </PtwWorkflowContext.Provider>
  );
};