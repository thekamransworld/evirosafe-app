// Firestore rejects `undefined`. Strip it from plain objects and arrays, and
// leave everything else (Timestamp, FieldValue, Date, class instances) alone.

function isPlain(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.filter(v => v !== undefined).map(v => stripUndefined(v)) as unknown as T;
  }
  if (isPlain(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}
