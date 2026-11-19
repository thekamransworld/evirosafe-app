// Is a person certified for what the permit asks of them?
//
// Blocking is deliberately limited to cases we can actually verify: the
// person has an account, at least one course is tagged for the competency,
// and they hold no valid certificate. Anything we cannot verify (no account,
// no tagged course) is reported as a warning, never a silent pass and never
// a block on missing data.

import type { TrainingCourse, TrainingRecord } from '../../types';
import { getRecordCertificateStatus, toDateOnly } from '../certificates';

export interface CompetencyContext {
  records: Pick<TrainingRecord, 'user_id' | 'course_id' | 'expires_at' | 'revoked_at'>[];
  courses: Pick<TrainingCourse, 'id' | 'title' | 'competencies'>[];
}

export type CompetencyStatus = 'ok' | 'missing' | 'no_course' | 'unverified';

export interface CompetencyCheck {
  status: CompetencyStatus;
  key: string;
  /** Titles of the courses tagged for this key (for messages). */
  courses: string[];
}

export function checkCompetency(
  userId: string | undefined,
  key: string,
  ctx: CompetencyContext,
  now: number,
): CompetencyCheck {
  const tagged = ctx.courses.filter(c => Array.isArray(c.competencies) && c.competencies.includes(key));
  const courses = tagged.map(c => c.title);
  if (!userId) return { status: 'unverified', key, courses };
  if (tagged.length === 0) return { status: 'no_course', key, courses };
  const ids = new Set(tagged.map(c => c.id));
  const today = toDateOnly(new Date(now));
  const held = ctx.records.some(r => {
    if (r.user_id !== userId || !ids.has(r.course_id)) return false;
    const s = getRecordCertificateStatus(r, today);
    return s === 'valid' || s === 'expiring';
  });
  return { status: held ? 'ok' : 'missing', key, courses };
}
