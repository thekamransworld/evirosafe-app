// Small presentation helpers shared by the permit screens.
import { STAGE_LABEL, type Stage } from '../../lib/ptw/model';

export type BadgeColor = 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple' | 'indigo' | 'amber';

export const STAGE_BADGE: Record<Stage, BadgeColor> = {
  DRAFT: 'gray',
  SUBMITTED: 'yellow',
  SITE_INSPECTION: 'blue',
  APPROVAL: 'purple',
  SITE_HANDOVER: 'indigo',
  ACTIVE: 'green',
  HOLD: 'amber',
  EXPIRED: 'red',
  COMPLETION_PENDING: 'blue',
  CLOSED: 'gray',
  CANCELLED: 'gray',
  REJECTED: 'red',
  ARCHIVED: 'gray',
};

/** Who acts next, in plain words. */
export const STAGE_HELP: Record<Stage, string> = {
  DRAFT: 'Draft. The person who raised it completes the details and submits it.',
  SUBMITTED: 'Waiting for a reviewer (not the person who raised the permit) to pre-screen it.',
  SITE_INSPECTION: 'Waiting for a reviewer to inspect the site and complete the checks.',
  APPROVAL: 'Waiting for an approver (HSE Manager, Org Admin or Admin) to approve it.',
  SITE_HANDOVER: 'Approved. The permit holder accepts the handover on site to start the work.',
  ACTIVE: 'Work in progress. Anyone on site can stop work. A reviewer can extend it. The permit holder requests completion when the work is done.',
  HOLD: 'Work is stopped. A reviewer must make sure it is safe and resume it, or the permit can be completed or cancelled.',
  EXPIRED: 'The validity has ended. Work must stop. Request completion, or cancel the permit.',
  COMPLETION_PENDING: 'Work finished. A reviewer carries out the completion inspection, then closes the permit.',
  CLOSED: 'This permit is closed.',
  CANCELLED: 'This permit was cancelled.',
  REJECTED: 'This permit was rejected.',
  ARCHIVED: 'This permit is archived.',
};

export const stageLabel = (stage: Stage | null, raw?: string) =>
  stage ? STAGE_LABEL[stage] : String(raw || 'Unknown').replace(/_/g, ' ');

export const fmtDateTime = (ms: number) =>
  Number.isFinite(ms) ? new Date(ms).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '';

export const fmtTime = (ms: number) =>
  Number.isFinite(ms) ? new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
