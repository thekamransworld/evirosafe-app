import React, { createContext, useContext, ReactNode } from 'react';
import type { Ptw, PtwWorkflowStage } from '../types/ptw';
import { PtwWorkflowEngine } from '../utils/workflowEngine';

interface PtwWorkflowContextType {
  moveToNextStage: (ptw: Ptw, userId: string, comments?: string) => Ptw | null;
  getNextPossibleStages: (ptw: Ptw) => PtwWorkflowStage[];
  validateUserPermission: (ptw: Ptw, userId: string, userRole: string) => boolean;
  getStageResponsibilities: (stage: PtwWorkflowStage) => string[];
}

const PtwWorkflowContext = createContext<PtwWorkflowContextType | undefined>(undefined);

export const usePtwWorkflow = () => {
  const context = useContext(PtwWorkflowContext);
  if (!context) {
    throw new Error('usePtwWorkflow must be used within a PtwWorkflowProvider');
  }
  return context;
};

export const PtwWorkflowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const moveToNextStage = (ptw: Ptw, userId: string, comments?: string): Ptw | null => {
    const nextStages = PtwWorkflowEngine.getNextStages(ptw.status);
    if (nextStages.length === 0) return null;

    // For simplicity in this helper, we default to the first available next stage.
    // In a real UI, you'd pass the specific target stage.
    const nextStage = nextStages[0];
    
    const updatedPtw: Ptw = {
      ...ptw,
      status: nextStage,
      workflow_log: [
        ...(ptw.workflow_log || []),
        PtwWorkflowEngine.createLogEntry(nextStage, `Moved to ${nextStage}`, userId, comments)
      ],
      updated_at: new Date().toISOString()
    };

    return updatedPtw;
  };

  const getNextPossibleStages = (ptw: Ptw): PtwWorkflowStage[] => {
    return PtwWorkflowEngine.getNextStages(ptw.status);
  };

  const validateUserPermission = (ptw: Ptw, userId: string, userRole: string): boolean => {
    const permission = PtwWorkflowEngine.validateRolePermission(
      ptw.status,
      userRole,
      userId,
      ptw
    );
    return permission.allowed;
  };

  const getStageResponsibilities = (stage: PtwWorkflowStage): string[] => {
    const responsibilities: Record<string, string[]> = {
      DRAFT: ['Requester: Complete application details'],
      REQUESTED: ['Issuer: Review application', 'HSE: Verify risk assessment'],
      ISSUER_REVIEW: ['Issuer: Verify site conditions', 'Issuer: Confirm isolations'],
      PENDING_APPROVAL: ['Approver: Review and authorize'],
      APPROVED: ['Issuer: Prepare for handover'],
      ACTIVE: ['Receiver: Supervise work', 'Safety Watch: Monitor conditions'],
      COMPLETION_PENDING: ['Issuer: Verify site restoration'],
      CLOSED: ['Issuer: Archive documents']
    };

    return responsibilities[stage] || [];
  };

  return (
    <PtwWorkflowContext.Provider value={{
      moveToNextStage,
      getNextPossibleStages,
      validateUserPermission,
      getStageResponsibilities
    }}>
      {children}
    </PtwWorkflowContext.Provider>
  );
};