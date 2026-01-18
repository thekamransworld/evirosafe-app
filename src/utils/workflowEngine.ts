import type { Ptw, PtwWorkflowStage, PtwWorkflowLog } from '../types/ptw';

export class PtwWorkflowEngine {
  // Define valid transitions
  private static transitions: Record<PtwWorkflowStage, PtwWorkflowStage[]> = {
    DRAFT: ['REQUESTED'],
    REQUESTED: ['ISSUER_REVIEW', 'DRAFT'], // Issuer accepts or returns to draft
    ISSUER_REVIEW: ['ISSUER_SIGNED', 'DRAFT'],
    ISSUER_SIGNED: ['IV_REVIEW', 'PENDING_APPROVAL'], // IV optional
    IV_REVIEW: ['PENDING_APPROVAL', 'DRAFT'],
    PENDING_APPROVAL: ['APPROVED', 'DRAFT'],
    APPROVED: ['ACTIVE', 'CANCELLED'], // Issued -> Active
    ACTIVE: ['SUSPENDED', 'COMPLETION_PENDING', 'HOLD'],
    HOLD: ['ACTIVE', 'CANCELLED'],
    SUSPENDED: ['ACTIVE', 'CANCELLED'],
    COMPLETION_PENDING: ['CLOSED', 'ACTIVE'], // Active if rejected
    CLOSED: ['ARCHIVED'],
    CANCELLED: ['ARCHIVED'],
    ARCHIVED: []
  };

  // Check if transition is valid
  static canTransition(from: PtwWorkflowStage, to: PtwWorkflowStage): boolean {
    return this.transitions[from]?.includes(to) || false;
  }

  // Get next possible stages
  static getNextStages(current: PtwWorkflowStage): PtwWorkflowStage[] {
    return this.transitions[current] || [];
  }

  // Create workflow log entry
  static createLogEntry(
    stage: PtwWorkflowStage,
    action: string,
    userId: string,
    comments?: string
  ): PtwWorkflowLog {
    return {
      stage,
      action,
      user_id: userId,
      timestamp: new Date().toISOString(),
      comments,
      signoff_type: 'digital'
    };
  }

  // Validate role permissions for transition
  static validateRolePermission(
    currentStage: PtwWorkflowStage,
    userRole: string,
    userId: string,
    ptw: Ptw
  ): { allowed: boolean; message: string } {
    const isAdmin = userRole === 'ADMIN';
    const isHSE = userRole === 'HSE_MANAGER';
    const isIssuer = userRole === 'SUPERVISOR' || userRole === 'HSE_MANAGER';
    const isApprover = userRole === 'HSE_MANAGER' || userRole === 'ORG_ADMIN';
    const isReceiver = true; // Usually the creator

    if (isAdmin) return { allowed: true, message: 'Admin Override' };

    switch (currentStage) {
      case 'DRAFT':
        return { allowed: true, message: '' }; // Anyone can edit draft
      
      case 'REQUESTED':
        return { allowed: isIssuer || isHSE, message: 'Only issuer can review requested permits' };
      
      case 'ISSUER_REVIEW':
        return { allowed: isIssuer, message: 'Only issuer can sign off on review' };
      
      case 'PENDING_APPROVAL':
        return { allowed: isApprover, message: 'Only approver can authorize' };
      
      case 'APPROVED':
        return { allowed: isIssuer, message: 'Only issuer can activate/issue permit' };
      
      case 'ACTIVE':
        return { allowed: isReceiver || isIssuer, message: 'Only receiver or issuer can update active work' };
      
      case 'COMPLETION_PENDING':
        return { allowed: isIssuer, message: 'Only issuer can close permit' };
      
      default:
        return { allowed: false, message: 'Action not allowed' };
    }
  }
}