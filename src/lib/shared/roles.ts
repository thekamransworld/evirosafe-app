// Who is who, for every module. Data only (loads in plain Node for the tests and the rules generator).
// The Firestore rules helpers isStaff / isReviewer / isApprover / isOverrider are generated from these
// lists (scripts/rules-lib.mjs), so a role can never be allowed by the screen and refused by the database.

export type Role =
  | 'ADMIN' | 'ORG_ADMIN' | 'HSE_MANAGER' | 'HSE_OFFICER' | 'SUPERVISOR'
  | 'INSPECTOR' | 'WORKER' | 'CLIENT_VIEWER' | 'CUSTOM_SITE_LEAD';

/** Everyone except a read-only client viewer. */
export const STAFF: readonly Role[] = [
  'ADMIN', 'ORG_ADMIN', 'HSE_MANAGER', 'HSE_OFFICER', 'SUPERVISOR',
  'INSPECTOR', 'WORKER', 'CUSTOM_SITE_LEAD',
];
export const REVIEWERS: readonly Role[] = [
  'ADMIN', 'ORG_ADMIN', 'HSE_MANAGER', 'HSE_OFFICER', 'SUPERVISOR',
  'INSPECTOR', 'CUSTOM_SITE_LEAD',
];
export const APPROVERS: readonly Role[] = ['ADMIN', 'ORG_ADMIN', 'HSE_MANAGER'];
/** May bypass a segregation-of-duties rule, in writing, with an audit flag. */
export const OVERRIDERS: readonly Role[] = ['ADMIN', 'ORG_ADMIN'];
/** Unrestricted by project: see every project of their organisation. */
export const ORG_WIDE: readonly Role[] = ['ADMIN', 'ORG_ADMIN'];

/** Minimum length of a written reason / override justification. */
export const MIN_REASON_CHARS = 5;
export const MIN_JUSTIFICATION_CHARS = 10;

export const hasRole = (list: readonly string[], role: string | undefined | null): boolean => !!role && list.includes(role);
