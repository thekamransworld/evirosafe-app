// What the public status page (the page a QR code opens) tells a person on site. Pure.
//
// The question it answers is "may work go ahead under this permit RIGHT NOW?",
// so anything that is not clearly valid reads as a stop. The page only ever
// holds the permit number, type, status, validity and location.

import { STAGE_LABEL, normalizeStage, type Stage } from './model';
import { effectiveStatus, formatRemaining, validUntilMs } from './validity';

export interface PublicMirror {
  permit_no?: string;
  type?: string;
  status?: string;
  location?: string;
  valid_from?: string;
  valid_until?: string;
  valid_until_ts?: unknown;
  updated_at?: string;
}

export type PublicTone = 'go' | 'caution' | 'stop' | 'neutral';

export interface PublicStatus {
  tone: PublicTone;
  /** One short line, shown large. */
  title: string;
  /** What it means. */
  detail: string;
  stage: Stage | null;
}

export function publicStatus(m: PublicMirror, now: number): PublicStatus {
  const stage = effectiveStatus({ status: m.status, valid_until: m.valid_until, valid_until_ts: m.valid_until_ts }, now);
  const until = validUntilMs({ valid_until: m.valid_until, valid_until_ts: m.valid_until_ts });
  switch (stage) {
    case 'ACTIVE': {
      const left = until - now;
      return {
        tone: left <= 15 * 60_000 ? 'caution' : 'go',
        title: 'VALID: work may continue',
        detail: `${formatRemaining(left)}. Work must stop when the permit ends unless it is formally extended.`,
        stage,
      };
    }
    case 'HOLD':
      return { tone: 'stop', title: 'ON HOLD: work stopped', detail: 'Work under this permit has been stopped. Do not work until it is formally resumed.', stage };
    case 'EXPIRED':
      return { tone: 'stop', title: 'EXPIRED: work must stop', detail: 'The validity of this permit has ended. It cannot be used.', stage };
    case 'SITE_HANDOVER':
      return { tone: 'stop', title: 'NOT STARTED', detail: 'This permit is approved but has not been handed over. Work must not start yet.', stage };
    case 'COMPLETION_PENDING':
      return { tone: 'stop', title: 'WORK FINISHED', detail: 'Work under this permit is complete and waiting for the completion inspection. Do not start new work under it.', stage };
    case 'CLOSED':
    case 'CANCELLED':
    case 'REJECTED':
    case 'ARCHIVED':
      return { tone: 'stop', title: `${STAGE_LABEL[stage].toUpperCase()}: not valid`, detail: 'This permit can no longer be used for work.', stage };
    case 'DRAFT':
    case 'SUBMITTED':
    case 'SITE_INSPECTION':
    case 'APPROVAL':
      return { tone: 'stop', title: 'NOT AUTHORISED', detail: 'This permit has not been approved. Work must not start.', stage };
    default:
      return { tone: 'neutral', title: 'Status unknown', detail: 'This permit could not be read. Treat it as not valid and ask the permit holder.', stage: normalizeStage(m.status) };
  }
}
