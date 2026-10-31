// Firestore side of verifiable certificates. The pure logic (who qualifies,
// codes, dates) lives in src/lib/certificates.ts; this file only reads/writes.
//
// Two collections are involved:
//   training_records/{id}            - private, org-scoped (existing)
//   certificate_verifications/{code} - public GET-by-code, minimal fields
//
// Each certificate is written as ONE batch (record + verification doc), so a
// record can never end up pointing at a verification doc that doesn't exist,
// or the other way round. Batches are per person rather than per session on
// purpose: Firestore allows only 20 security-rule lookups per batched write,
// and every write here needs a few.

import { db } from '../firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import type { TrainingRecord } from '../types';
import {
  buildCertificateForExistingRecord,
  buildVerifyUrl,
  planSessionCertificates,
  type IssuedCertificate,
  type SessionPlan,
  type SessionPlanInput,
} from '../lib/certificates';
import { downloadCertificatePdf, UnsupportedCharactersError } from '../lib/certificatePdf';
import { fetchVerification } from './certificateLookup';

/** Turns a Firebase / PDF error into something a person can act on. */
export function describeCertificateError(e: unknown): string {
  const err = e as { code?: string; message?: string };
  if (e instanceof UnsupportedCharactersError) {
    return 'This name or title uses a non-Latin script (e.g. Arabic), which the certificate PDF cannot print yet.';
  }
  switch (err?.code) {
    case 'permission-denied':
      return 'Permission denied. Your role may not be allowed to issue certificates, or the latest Firestore rules have not been deployed yet.';
    case 'unavailable':
    case 'failed-precondition':
      return 'Could not reach the server. Check your internet connection and try again.';
    default:
      return err?.message || 'Something went wrong.';
  }
}

// Public lookup lives in certificateLookup.ts so the verify page stays small.
export { fetchVerification } from './certificateLookup';

// ─── Issuing ──────────────────────────────────────────────────────────────

export interface IssueResult {
  /** Certificates that were written successfully. */
  issued: IssuedCertificate[];
  failed: { user_id: string; message: string }[];
  skipped: SessionPlan['skipped'];
}

export interface CloseSessionResult extends IssueResult {
  /** True only when every certificate was written AND the session was marked completed. */
  sessionClosed: boolean;
  sessionError?: string;
}

/**
 * Issues certificates to everyone in a session who earned one and doesn't have
 * one yet. Safe to run repeatedly (record IDs are deterministic and anyone
 * already certified is skipped), which is what lets a session that was closed
 * before certificates existed be backfilled.
 */
export async function issueCertificatesForSession(input: SessionPlanInput): Promise<IssueResult> {
  const plan = planSessionCertificates(input);

  const settled = await Promise.allSettled(
    plan.issue.map(({ record, verification }) => {
      const batch = writeBatch(db);
      batch.set(doc(db, 'training_records', record.id), record, { merge: true });
      batch.set(doc(db, 'certificate_verifications', verification.code), verification);
      return batch.commit();
    }),
  );

  const issued: IssuedCertificate[] = [];
  const failed: IssueResult['failed'] = [];
  settled.forEach((res, i) => {
    if (res.status === 'fulfilled') issued.push(plan.issue[i]);
    else failed.push({ user_id: plan.issue[i].record.user_id, message: describeCertificateError(res.reason) });
  });
  return { issued, failed, skipped: plan.skipped };
}

/**
 * Finalises a training session: issues a certificate to everyone who earned
 * one, then marks the session completed.
 *
 * Order matters. Certificates go first and the session is closed last, only if
 * all of them succeeded. If anything fails the session stays open, the person
 * presses Finalize again, and already-issued certificates are skipped, so a
 * retry never duplicates anything.
 */
export async function closeSessionAndIssueCertificates(
  input: SessionPlanInput & { attendance: any[] },
): Promise<CloseSessionResult> {
  const result = await issueCertificatesForSession(input);
  if (result.failed.length > 0) return { ...result, sessionClosed: false };

  try {
    await updateDoc(doc(db, 'training_sessions', input.session.id), {
      status: 'completed',
      attendance: input.attendance,
    });
    return { ...result, sessionClosed: true };
  } catch (e) {
    return { ...result, sessionClosed: false, sessionError: describeCertificateError(e) };
  }
}

/** Issues a verifiable certificate for a training record that predates this feature. */
export async function issueCertificateForExistingRecord(
  args: Parameters<typeof buildCertificateForExistingRecord>[0],
): Promise<IssuedCertificate> {
  const issued = buildCertificateForExistingRecord(args);
  const batch = writeBatch(db);
  batch.update(doc(db, 'training_records', issued.record.id), {
    certificate_no: issued.record.certificate_no,
    verification_code: issued.record.verification_code,
  });
  batch.set(doc(db, 'certificate_verifications', issued.verification.code), issued.verification);
  await batch.commit();
  return issued;
}

/** Marks a certificate revoked on both the private record and the public page. */
export async function revokeCertificate(record: TrainingRecord): Promise<string> {
  if (!record.verification_code) throw new Error('This record has no certificate to revoke.');
  const revoked_at = new Date().toISOString();
  const batch = writeBatch(db);
  batch.update(doc(db, 'certificate_verifications', record.verification_code), { status: 'revoked', revoked_at });
  batch.update(doc(db, 'training_records', record.id), { revoked_at });
  await batch.commit();
  return revoked_at;
}

// ─── Download ─────────────────────────────────────────────────────────────

/**
 * Generates the PDF from the PUBLIC verification record rather than from live
 * data, so what's printed is exactly what a verifier will see when they scan
 * it (even if the course is renamed or the person is edited later).
 */
export async function downloadCertificateForRecord(record: TrainingRecord): Promise<void> {
  if (!record.verification_code) throw new Error('No certificate has been issued for this record yet.');
  const v = await fetchVerification(record.verification_code);
  if (!v) throw new Error('The public verification record for this certificate is missing.');
  if (v.status === 'revoked') throw new Error('This certificate has been revoked and cannot be downloaded.');

  await downloadCertificatePdf({
    holderName: v.holder_name,
    courseTitle: v.course_title,
    orgName: v.org_name,
    certificateNo: v.certificate_no,
    verificationCode: v.code,
    verifyUrl: buildVerifyUrl(v.code),
    issuedOn: v.issued_on,
    expiresOn: v.expires_on,
    trainerName: v.trainer_name,
    scorePercent: typeof record.score === 'number' ? record.score : undefined,
  });
}
