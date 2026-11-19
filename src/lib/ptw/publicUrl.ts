/** The address a permit's QR code opens: the public status page. */
export function buildPermitUrl(token: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/permit/${encodeURIComponent(token)}`;
}

/** The token from a /permit/<token> path, or '' when it is not a well-formed one. */
export function readPermitToken(pathname: string): string {
  const m = /^\/permit\/?([^/]*)/i.exec(pathname);
  if (!m || !m[1]) return '';
  try {
    const t = decodeURIComponent(m[1]);
    return /^[A-Za-z0-9]{16,64}$/.test(t) ? t : '';
  } catch {
    return '';
  }
}
