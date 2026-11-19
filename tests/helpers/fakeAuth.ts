// Stands in for firebase/auth in tests (reauth.ts).
export class EmailAuthProvider { static credential(email: string, password: string) { return { email, password }; } }
export async function reauthenticateWithCredential(_user: unknown, cred: { password: string }) {
  if (cred.password !== 'right-password') throw Object.assign(new Error('wrong'), { code: 'auth/wrong-password' });
}
