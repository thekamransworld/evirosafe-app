// The one read the PUBLIC verification page needs. Kept in its own tiny module
// so that page doesn't pull in the PDF / issuing code.

import { db } from '../firebase';
import { doc, getDocFromServer } from 'firebase/firestore';
import {
  isValidVerificationCodeFormat,
  normalizeVerificationCode,
  type CertificateVerification,
} from '../lib/certificates';

/**
 * Looks up a certificate by its code. Always asks the SERVER: this app keeps
 * an offline cache, and a verifier must never be shown a stale "valid" for a
 * certificate that was revoked a minute ago. Offline, this throws instead.
 * Returns null for malformed or unknown codes.
 */
export async function fetchVerification(rawCode: string): Promise<CertificateVerification | null> {
  const code = normalizeVerificationCode(rawCode);
  if (!isValidVerificationCodeFormat(code)) return null;
  const snap = await getDocFromServer(doc(db, 'certificate_verifications', code));
  return snap.exists() ? (snap.data() as CertificateVerification) : null;
}
