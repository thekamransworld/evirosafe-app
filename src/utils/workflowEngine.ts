import type { Ptw, PtwWorkflowStage, PtwWorkflowLog } from '../types';

export class PtwWorkflowEngine {
  // Define valid transitions
  private static transitions: Record<PtwWorkflowStage, PtwWorkflowStage[]> = {
    DRAFT: ['REQUESTED', 'SUBMITTED'],
    SUBMITTED: ['PRE_SCREEN', 'DRAFT'],
    PRE_SCREEN: ['SITE_INSPECTION', 'REJECTED'],
    SITE_INSPECTION: ['APPROVAL', 'REJECTED'],
    REQUESTED: ['ISSUER_REVIEW', 'DRAFT'],
    ISSUER_REVIEW: ['ISSUER_SIGNED', 'DRAFT'],
    ISSUER_SIGNED: ['IV_REVIEW', 'PENDING_APPROVAL'],
    IV_REVIEW: ['PENDING_APPROVAL', 'DRAFT'],
    PENDING_APPROVAL: ['APPROVAL'],
    APPROVAL: ['APPROVED', 'DRAFT', 'ACTIVE'],
    APPROVED: ['APPROVER_SIGNED'],
    APPROVER_SIGNED: ['AUTHORIZATION'],
    AUTHORIZATION: ['HANDOVER_PENDING'],
    HANDOVER_PENDING: ['SITE_HANDOVER'],
    SITE_HANDOVER: ['ACTIVE'],
    ACTIVE: ['SUSPENDED', 'COMPLETION_PENDING', 'HOLD', 'COMPLETED'],
    HOLD: ['ACTIVE', 'CANCELLED'],
    SUSPENDED: ['ACTIVE', 'CANCELLED'],
    COMPLETION_PENDING: ['JOINT_INSPECTION'],
    COMPLETED: ['CLOSED'],
    JOINT_INSPECTION: ['CLOSED', 'ACTIVE'],
    CLOSED: ['ARCHIVED'],
    CANCELLED: ['ARCHIVED'],
    REJECTED: ['ARCHIVED'],
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
    _userId: string,
    _ptw: Ptw
  ): { allowed: boolean; message: string } {
    const isAdmin = userRole === 'ADMIN';
    const isHSE = userRole === 'HSE_MANAGER';
    const isIssuer = userRole === 'SUPERVISOR' || userRole === 'HSE_MANAGER';
    const isApprover = userRole === 'HSE_MANAGER' || userRole === 'ORG_ADMIN';
    const isReceiver = true;

    if (isAdmin) return { allowed: true, message: 'Admin Override' };

    switch (currentStage) {
      case 'DRAFT':
        return { allowed: true, message: '' };
      
      case 'REQUESTED':
      case 'SUBMITTED':
        return { allowed: isIssuer || isHSE, message: 'Only issuer can review requested permits' };
      
      case 'ISSUER_REVIEW':
      case 'PRE_SCREEN':
        return { allowed: isIssuer, message: 'Only issuer can sign off on review' };
      
      case 'ISSUER_SIGNED':
      case 'SITE_INSPECTION':
        return { allowed: true, message: '' };
      
      case 'PENDING_APPROVAL':
      case 'APPROVAL':
        return { allowed: isApprover, message: 'Only approver can review and sign' };
      
      case 'APPROVED':
        return { allowed: isApprover, message: 'Only approver can sign off' };

      case 'AUTHORIZATION':
        return { allowed: isIssuer, message: 'Only issuer can authorize permit' };
      
      case 'HANDOVER_PENDING':
      case 'SITE_HANDOVER':
        return { allowed: isReceiver || isIssuer, message: 'Only receiver can accept handover' };
      
      case 'ACTIVE':
        return { allowed: isReceiver || isIssuer, message: 'Only receiver can update work status' };
      
      case 'COMPLETION_PENDING':
      case 'COMPLETED':
        return { allowed: isReceiver || isIssuer, message: 'Only receiver can mark work complete' };
      
      case 'JOINT_INSPECTION':
        return { allowed: isIssuer || isHSE, message: 'Joint inspection requires issuer' };
      
      case 'CLOSED':
        return { allowed: isIssuer, message: 'Only issuer can close permit' };
      
      default:
        return { allowed: false, message: 'Action not allowed' };
    }
  }
}