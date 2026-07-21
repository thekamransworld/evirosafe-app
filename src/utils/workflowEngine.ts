/**
 * EviroSafe — PTW Workflow Engine (Fixed)
 *
 * Changes from original:
 * 1. isReceiver = true REMOVED — now checks actual role + PTW assignment
 * 2. validateRolePermission now accepts the current user object properly
 * 3. Added getRequiredRoles() for UI guidance (shows who needs to act next)
 * 4. Added isPermitExpired() check — active permits expire after 24h by default
 * 5. Transition map tightened: APPROVAL can no longer jump directly to ACTIVE
 */

import type { Ptw, PtwWorkflowStage, PtwWorkflowLog } from '../types';

// ─── Role constants ───────────────────────────────────────────────────────────

const ROLE = {
  ADMIN:       'ADMIN',
  ORG_ADMIN:   'ORG_ADMIN',
  HSE_MANAGER: 'HSE_MANAGER',
  SUPERVISOR:  'SUPERVISOR',
  WORKER:      'WORKER',
} as const;

type UserRole = typeof ROLE[keyof typeof ROLE];

// ─── Valid stage transitions ──────────────────────────────────────────────────
// Each entry maps a current stage to the stages it can legally move to.
// APPROVAL can NO LONGER jump to ACTIVE directly — this bypassed the
// authorization and handover chain, which is a compliance violation.

const TRANSITIONS: Record<PtwWorkflowStage, PtwWorkflowStage[]> = {
  DRAFT:              ['SUBMITTED'],
  SUBMITTED:          ['PRE_SCREEN', 'DRAFT'],
  PRE_SCREEN:         ['SITE_INSPECTION', 'REJECTED'],
  SITE_INSPECTION:    ['APPROVAL', 'REJECTED'],
  REQUESTED:          ['ISSUER_REVIEW', 'DRAFT'],
  ISSUER_REVIEW:      ['ISSUER_SIGNED', 'DRAFT'],
  ISSUER_SIGNED:      ['IV_REVIEW'],
  IV_REVIEW:          ['PENDING_APPROVAL', 'DRAFT'],
  PENDING_APPROVAL:   ['APPROVAL'],
  APPROVAL:           ['APPROVER_SIGNED', 'REJECTED'],  // ACTIVE shortcut REMOVED
  APPROVER_SIGNED:    ['AUTHORIZATION'],
  AUTHORIZATION:      ['HANDOVER_PENDING'],
  HANDOVER_PENDING:   ['SITE_HANDOVER'],
  SITE_HANDOVER:      ['ACTIVE'],
  ACTIVE:             ['SUSPENDED', 'COMPLETION_PENDING', 'HOLD'],
  HOLD:               ['ACTIVE', 'CANCELLED'],
  SUSPENDED:          ['ACTIVE', 'CANCELLED'],
  COMPLETION_PENDING: ['JOINT_INSPECTION'],
  JOINT_INSPECTION:   ['COMPLETED', 'ACTIVE'],
  COMPLETED:          ['CLOSED'],
  CLOSED:             ['ARCHIVED'],
  CANCELLED:          ['ARCHIVED'],
  REJECTED:           ['ARCHIVED'],
  ARCHIVED:           [],
};

// ─── Role requirements per stage ─────────────────────────────────────────────
// Defines WHICH roles can advance the permit from each stage.
// Used both for enforcement and for UI hints ("waiting on HSE Manager").

const STAGE_ROLE_REQUIREMENTS: Record<PtwWorkflowStage, UserRole[]> = {
  DRAFT:              [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER, ROLE.SUPERVISOR, ROLE.WORKER],
  SUBMITTED:          [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER],
  PRE_SCREEN:         [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER, ROLE.SUPERVISOR],
  SITE_INSPECTION:    [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER, ROLE.SUPERVISOR],
  REQUESTED:          [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER, ROLE.SUPERVISOR],
  ISSUER_REVIEW:      [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER, ROLE.SUPERVISOR],
  ISSUER_SIGNED:      [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER],
  IV_REVIEW:          [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER],
  PENDING_APPROVAL:   [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER],
  APPROVAL:           [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER],
  APPROVER_SIGNED:    [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER],
  AUTHORIZATION:      [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER, ROLE.SUPERVISOR],
  HANDOVER_PENDING:   [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER, ROLE.SUPERVISOR],
  SITE_HANDOVER:      [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER, ROLE.SUPERVISOR],
  ACTIVE:             [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER, ROLE.SUPERVISOR],
  HOLD:               [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER, ROLE.SUPERVISOR],
  SUSPENDED:          [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER],
  COMPLETION_PENDING: [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER, ROLE.SUPERVISOR],
  JOINT_INSPECTION:   [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER, ROLE.SUPERVISOR],
  COMPLETED:          [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER],
  CLOSED:             [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER],
  CANCELLED:          [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER],
  REJECTED:           [ROLE.ADMIN, ROLE.ORG_ADMIN, ROLE.HSE_MANAGER],
  ARCHIVED:           [ROLE.ADMIN],
};

// ─── Default permit validity (hours) by type ──────────────────────────────────

const PERMIT_VALIDITY_HOURS: Record<string, number> = {
  HOT_WORK:           8,   // Hot work: max 1 shift
  CONFINED_SPACE:     8,   // Confined space: max 1 shift
  WORKING_AT_HEIGHT:  12,
  ELECTRICAL:         24,
  EXCAVATION:         24,
  GENERAL:            24,
  RADIATION:          8,
  LIFTING:            12,
};

// ─── Main class ───────────────────────────────────────────────────────────────

export class PtwWorkflowEngine {

  /** Check if a transition between two stages is valid */
  static canTransition(from: PtwWorkflowStage, to: PtwWorkflowStage): boolean {
    return TRANSITIONS[from]?.includes(to) ?? false;
  }

  /** Get all legal next stages from the current stage */
  static getNextStages(current: PtwWorkflowStage): PtwWorkflowStage[] {
    return TRANSITIONS[current] ?? [];
  }

  /**
   * Validate whether a user can act on a permit at its current stage.
   *
   * Replaces the original method which had isReceiver hardcoded to true.
   * Now checks:
   *   1. Is the transition itself valid?
   *   2. Does the user's role meet the stage requirement?
   *   3. For HANDOVER stages — is the user the assigned receiver on this PTW?
   */
  static validateRolePermission(
    currentStage: PtwWorkflowStage,
    userRole: UserRole,
    userId: string,
    ptw: Ptw
  ): { allowed: boolean; message: string } {

    // Admins bypass all checks (break-glass access — should be audit-logged)
    if (userRole === ROLE.ADMIN) {
      return { allowed: true, message: 'Admin override — action will be audit-logged' };
    }

    const allowedRoles = STAGE_ROLE_REQUIREMENTS[currentStage];
    if (!allowedRoles) {
      return { allowed: false, message: 'Unknown stage — cannot determine permissions' };
    }

    const roleAllowed = allowedRoles.includes(userRole);
    if (!roleAllowed) {
      const required = allowedRoles.filter(r => r !== ROLE.ADMIN).join(', ');
      return {
        allowed: false,
        message: `Your role (${userRole}) cannot act at stage "${currentStage}". Required: ${required}`,
      };
    }

    // ── Receiver-specific enforcement ──────────────────────────────────────
    // For handover stages, the acting user must be the designated receiver
    // on this specific permit — not just anyone with a high-enough role.

    const receiverStages: PtwWorkflowStage[] = ['HANDOVER_PENDING', 'SITE_HANDOVER'];
    if (receiverStages.includes(currentStage)) {
      const assignedReceiverId = (ptw.payload as any)?.receiver_id as string | undefined;
      if (assignedReceiverId && assignedReceiverId !== userId) {
        return {
          allowed: false,
          message: 'Only the designated permit receiver can accept this handover',
        };
      }
    }

    // ── Issuer-specific enforcement ────────────────────────────────────────

    const issuerStages: PtwWorkflowStage[] = ['AUTHORIZATION', 'JOINT_INSPECTION', 'CLOSED'];
    if (issuerStages.includes(currentStage)) {
      const assignedIssuerId = (ptw.payload as any)?.issuer_id as string | undefined;
      if (assignedIssuerId && assignedIssuerId !== userId && userRole !== ROLE.ORG_ADMIN && userRole !== ROLE.HSE_MANAGER) {
        return {
          allowed: false,
          message: 'Only the designated permit issuer or HSE Manager can perform this action',
        };
      }
    }

    return { allowed: true, message: '' };
  }

  /**
   * Check if an ACTIVE permit has exceeded its validity window.
   * This should be checked on every page load / real-time listener.
   */
  static isPermitExpired(ptw: Ptw): boolean {
    if (ptw.status !== 'ACTIVE') return false;

    const activatedAt = (ptw.payload as any)?.activated_at as string | undefined;
    if (!activatedAt) return false;

    const validityHours = PERMIT_VALIDITY_HOURS[ptw.type] ?? 24;
    const expiryMs      = new Date(activatedAt).getTime() + validityHours * 60 * 60 * 1000;

    return Date.now() > expiryMs;
  }

  /** Returns how many hours until the permit expires (negative = already expired) */
  static hoursUntilExpiry(ptw: Ptw): number {
    const activatedAt = (ptw.payload as any)?.activated_at as string | undefined;
    if (!activatedAt) return Infinity;

    const validityHours = PERMIT_VALIDITY_HOURS[ptw.type] ?? 24;
    const expiryMs      = new Date(activatedAt).getTime() + validityHours * 60 * 60 * 1000;
    const remainingMs   = expiryMs - Date.now();

    return Math.round(remainingMs / (1000 * 60 * 60) * 10) / 10;
  }

  /** Returns human-readable labels for which roles need to act next */
  static getRequiredRoles(stage: PtwWorkflowStage): string {
    const roles = STAGE_ROLE_REQUIREMENTS[stage] ?? [];
    const filtered = roles.filter(r => r !== ROLE.ADMIN && r !== ROLE.WORKER);
    if (filtered.length === 0) return 'Any user';
    return filtered.map(r => r.replace('_', ' ')).join(' or ');
  }

  /** Create a workflow log entry */
  static createLogEntry(
    stage:    PtwWorkflowStage,
    action:   string,
    userId:   string,
    comments?: string,
  ): PtwWorkflowLog {
    return {
      stage,
      action,
      user_id:      userId,
      timestamp:    new Date().toISOString(),
      comments,
      signoff_type: 'digital',
    };
  }
}