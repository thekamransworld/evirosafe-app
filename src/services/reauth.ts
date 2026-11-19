// Password re-entry before the actions that carry a signature (approve, hand
// over, extend, close). Email + password is the only way to sign in to
// EviroSafe, so the person is simply asked for the password again.
//
// This is a deliberate-signature step in the app. The database cannot verify
// it (Firestore rules cannot see a password check), so it is not a security
// boundary; the logged-in user id on every log entry is.

import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../firebase';

export function canReauth(): boolean {
  const u = auth.currentUser;
  return !!u?.email && u.providerData.some(p => p.providerId === 'password');
}

export type ReauthResult = { ok: true } | { ok: false; reason: string };

export async function reauthenticate(password: string): Promise<ReauthResult> {
  const user = auth.currentUser;
  if (!user?.email) return { ok: false, reason: 'You are not signed in. Sign in again and retry.' };
  if (!password) return { ok: false, reason: 'Enter your password to confirm.' };
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    return { ok: true };
  } catch (e) {
    switch ((e as { code?: string })?.code) {
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
        return { ok: false, reason: 'That password is not correct.' };
      case 'auth/too-many-requests':
        return { ok: false, reason: 'Too many attempts. Wait a few minutes and try again.' };
      case 'auth/network-request-failed':
        return { ok: false, reason: 'No connection. Check your internet and try again.' };
      default:
        return { ok: false, reason: 'Could not confirm your password. Try again.' };
    }
  }
}
