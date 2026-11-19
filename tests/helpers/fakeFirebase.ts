// Stands in for src/firebase.ts inside the service tests (see scripts/test-ptw.mjs).
export const app = { fake: true };
export const db = { fake: true };
export const auth = { fake: true, currentUser: null as null | { email: string } };
