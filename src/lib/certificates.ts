// Pure helpers for verifiable training certificates. Nothing in this file
// touches Firebase or the DOM, so all of it can be unit-tested in Node.
//
// How verification works:
//   - Every issued certificate gets a random 20-character verification code
//     (100 bits of entropy, so it can't be guessed or enumerated).
//   - A minimal public copy of the certificate is stored at
//     certificate_verifications/{code}. Firestore rules allow anyone to GET
//     that single document by its exact code, but never to list the
//     collection. It deliberately holds only what a verifier needs: name,
//     course, issuer, dates and status. No email, ID numbers, scores or
//     project data.
//   - The QR code on the certificate encodes <app url>/verify/<code>.
//
// This file must stay free of heavy imports (QR / PDF code lives elsewhere) so
// the public verification page that uses it stays small.

import type { TrainingCourse, TrainingRecord, TrainingSession } from '../types';

// ─── Verification codes ───────────────────────────────────────────────────

// Crockford base32: no I, L, O or U, so a code read off paper can't be
// confused with 1 / 0 / V.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const VERIFICATION_CODE_LENGTH = 20;

function randomChars(length: number): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  // 256 is divisible by 32, so `& 31` is perfectly uniform (no modulo bias).
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] & 31];
  return out;
}

export function generateVerificationCode(): string {
  return randomChars(VERIFICATION_CODE_LENGTH);
}

/** Display-only reference number, e.g. EVS-2026-7K3M-9XB4. Not a lookup key. */
export function generateCertificateNumber(now: Date = new Date()): string {
  const s = randomChars(8);
  return `EVS-${now.getFullYear()}-${s.slice(0, 4)}-${s.slice(4)}`;
}

/** 7K3MQ-9XB4D-H2VNT-R8PCW — easier to read and type than 20 raw characters. */
export function formatVerificationCode(code: string): string {
  return code.match(/.{1,5}/g)?.join('-') ?? code;
}

/**
 * Turns whatever a person typed or pasted into a canonical code. Accepts the
 * grouped form, lowercase, stray spaces, and a full verify URL.
 */
export function normalizeVerificationCode(input: string): string {
  let s = (input || '').trim();
  const fromUrl = s.match(/\/verify\/([^/?#\s]+)/i);
  if (fromUrl) s = fromUrl[1];
  return s
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
}

export function isValidVerificationCodeFormat(code: string): boolean {
  if (code.length !== VERIFICATION_CODE_LENGTH) return false;
  for (const ch of code) if (!ALPHABET.includes(ch)) return false;
  return true;
}

// ─── Public URL ───────────────────────────────────────────────────────────

/**
 * Base URL embedded in QR codes. Set VITE_PUBLIC_APP_URL in production so
 * certificates generated from a preview deploy or localhost still point at the
 * real, stable domain — a printed QR code has to keep working for years.
 */
export function getPublicBaseUrl(): string {
  const configured = import.meta.env?.VITE_PUBLIC_APP_URL;
  const fromEnv = typeof configured === 'string' ? configured.trim() : '';
  const base = fromEnv || (typeof window !== 'undefined' ? window.location.origin : '');
  return base.replace(/\/+$/, '');
}

export function buildVerifyUrl(code: string, baseUrl: string = getPublicBaseUrl()): string {
  return `${baseUrl}/verify/${code}`;
}

export function isLocalUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(url);
}

// ─── Dates (date-only, no timezone drift) ─────────────────────────────────

/** 'YYYY-MM-DD'. Certificates carry calendar dates, not instants. */
export type DateOnly = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateOnly(d: Date): DateOnly {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Month arithmetic that clamps (31 Jan + 1 month = 28/29 Feb, not 3 Mar). */
export function addMonthsToDate(base: Date, months: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth() + months, 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(base.getDate(), lastDay));
  return d;
}

export function endOfDateOnlyISO(s: DateOnly): string {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

export function formatDateOnly(s: DateOnly | null | undefined, style: 'long' | 'short' = 'long'): string {
  if (!s) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return s;
  const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return dt.toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    year: 'numeric',
  });
}

export function daysBetween(from: DateOnly, to: DateOnly): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

// ─── Status ───────────────────────────────────────────────────────────────

export type CertificateStatus = 'valid' | 'expiring' | 'expired' | 'revoked';

export const EXPIRING_SOON_DAYS = 30;

/**
 * A certificate is valid THROUGH its expiry date (inclusive). Status is always
 * computed from dates at read time, so expiry needs no scheduled job.
 */
export function getCertificateStatus(
  c: { expires_on?: string; status?: string; revoked_at?: string },
  today: DateOnly = toDateOnly(new Date()),
): CertificateStatus {
  if (c.status === 'revoked' || c.revoked_at) return 'revoked';
  if (c.expires_on) {
    if (today > c.expires_on) return 'expired';
    if (daysBetween(today, c.expires_on) <= EXPIRING_SOON_DAYS) return 'expiring';
  }
  return 'valid';
}

/** Same classification for a TrainingRecord, which stores ISO timestamps. */
export function getRecordCertificateStatus(
  r: Pick<TrainingRecord, 'expires_at' | 'revoked_at'>,
  today: DateOnly = toDateOnly(new Date()),
): CertificateStatus {
  const expires_on = r.expires_at && !isNaN(new Date(r.expires_at).getTime())
    ? toDateOnly(new Date(r.expires_at))
    : '';
  return getCertificateStatus({ expires_on, revoked_at: r.revoked_at }, today);
}

// ─── The public verification document ─────────────────────────────────────

export interface CertificateVerification {
  code: string;
  org_id: string;
  certificate_no: string;
  holder_name: string;
  course_title: string;
  org_name: string;
  issued_on: DateOnly;
  /** '' = the certificate never expires. */
  expires_on: DateOnly | '';
  trainer_name?: string;
  status: 'valid' | 'revoked';
  revoked_at?: string;
  created_at: string;
}

export interface IssuedCertificate {
  record: TrainingRecord;
  verification: CertificateVerification;
}

// ─── Issuance planning ────────────────────────────────────────────────────

/**
 * Pass mark applied to courses that require an assessment. The data model has
 * no per-course pass mark yet, so this is one org-wide default.
 */
export const DEFAULT_PASS_MARK = 70;

export type SkipReason = 'not_attended' | 'below_pass_mark' | 'unknown_user' | 'already_issued' | 'has_record';

export interface SessionPlanInput {
  session: Pick<TrainingSession, 'id' | 'scheduled_at'>;
  attendance: TrainingSession['attendance'];
  course: Pick<TrainingCourse, 'id' | 'title' | 'validity_months' | 'requires_assessment'>;
  users: { id: string; name: string }[];
  orgId: string;
  orgName: string;
  trainerName?: string;
  existingRecords: Pick<TrainingRecord, 'id' | 'user_id' | 'session_id' | 'verification_code'>[];
  passMark?: number;
  now?: Date;
}

export interface SessionPlan {
  issue: IssuedCertificate[];
  skipped: { user_id: string; reason: SkipReason }[];
}

/** Deterministic, so re-finalising a session can never create duplicates. */
export function recordIdFor(sessionId: string, userId: string): string {
  return `tr_${sessionId}_${userId}`;
}

/**
 * Decides who earns a certificate when a session is finalised and builds the
 * documents for them. Pure: the caller does the writing.
 *
 * - Must have attended.
 * - If the course requires an assessment, the score must reach the pass mark.
 * - Dated from the session day (or today, if the session is in the future);
 *   validity runs from that date.
 */
export function planSessionCertificates(input: SessionPlanInput): SessionPlan {
  const now = input.now ?? new Date();
  const passMark = input.passMark ?? DEFAULT_PASS_MARK;

  const scheduled = input.session.scheduled_at ? new Date(input.session.scheduled_at) : null;
  const completedAt = scheduled && !isNaN(scheduled.getTime()) && scheduled <= now ? scheduled : now;
  const issuedOn = toDateOnly(completedAt);
  const months = Number(input.course.validity_months) || 0;
  const expiresOn = months > 0 ? toDateOnly(addMonthsToDate(completedAt, months)) : '';

  const issue: IssuedCertificate[] = [];
  const skipped: SessionPlan['skipped'] = [];

  for (const att of input.attendance) {
    if (!att.attended) {
      skipped.push({ user_id: att.user_id, reason: 'not_attended' });
      continue;
    }
    const user = input.users.find(u => u.id === att.user_id);
    if (!user) {
      skipped.push({ user_id: att.user_id, reason: 'unknown_user' });
      continue;
    }
    if (input.course.requires_assessment && !(typeof att.score === 'number' && att.score >= passMark)) {
      skipped.push({ user_id: att.user_id, reason: 'below_pass_mark' });
      continue;
    }
    const id = recordIdFor(input.session.id, att.user_id);
    // Already certified by this code path, or a record for the same person and
    // session already exists (e.g. created by hand before certificates were
    // verifiable). In the second case a second record would be a duplicate, so
    // it's left for the Records tab's "Issue certificate" button instead.
    const existing = input.existingRecords.find(
      r => r.id === id || (r.user_id === att.user_id && r.session_id === input.session.id),
    );
    if (existing) {
      skipped.push({ user_id: att.user_id, reason: existing.verification_code ? 'already_issued' : 'has_record' });
      continue;
    }

    const code = generateVerificationCode();
    const certificate_no = generateCertificateNumber(now);

    const record: TrainingRecord = {
      id,
      org_id: input.orgId,
      user_id: att.user_id,
      course_id: input.course.id,
      session_id: input.session.id,
      issued_at: completedAt.toISOString(),
      expires_at: expiresOn ? endOfDateOnlyISO(expiresOn) : '',
      status: 'valid',
      certificate_no,
      verification_code: code,
      // Firestore rejects `undefined`, so optional fields are added only when set.
      ...(typeof att.score === 'number' ? { score: att.score } : {}),
    };

    const verification: CertificateVerification = {
      code,
      org_id: input.orgId,
      certificate_no,
      holder_name: user.name,
      course_title: input.course.title,
      org_name: input.orgName,
      issued_on: issuedOn,
      expires_on: expiresOn,
      status: 'valid',
      created_at: now.toISOString(),
      ...(input.trainerName ? { trainer_name: input.trainerName } : {}),
    };

    issue.push({ record, verification });
  }

  return { issue, skipped };
}

/**
 * Builds the verification document for a training record that already exists
 * but was created before certificates were verifiable (e.g. imported or added
 * by hand). Dates come from the record itself.
 */
export function buildCertificateForExistingRecord(input: {
  record: TrainingRecord;
  courseTitle: string;
  holderName: string;
  orgName: string;
  trainerName?: string;
  now?: Date;
}): IssuedCertificate {
  const now = input.now ?? new Date();
  const code = generateVerificationCode();
  const certificate_no = generateCertificateNumber(now);
  const issued = new Date(input.record.issued_at);
  const issued_on = toDateOnly(isNaN(issued.getTime()) ? now : issued);
  const expiry = input.record.expires_at ? new Date(input.record.expires_at) : null;
  const expires_on = expiry && !isNaN(expiry.getTime()) ? toDateOnly(expiry) : '';

  return {
    record: { ...input.record, certificate_no, verification_code: code },
    verification: {
      code,
      org_id: input.record.org_id,
      certificate_no,
      holder_name: input.holderName,
      course_title: input.courseTitle,
      org_name: input.orgName,
      issued_on,
      expires_on,
      status: input.record.revoked_at ? 'revoked' : 'valid',
      created_at: now.toISOString(),
      ...(input.record.revoked_at ? { revoked_at: input.record.revoked_at } : {}),
      ...(input.trainerName ? { trainer_name: input.trainerName } : {}),
    },
  };
}
