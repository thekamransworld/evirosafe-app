// Public page opened by scanning the QR code on a certificate: /verify/<code>.
// Works without signing in and renders outside the main app (no sidebar, no
// providers), so a site manager or client can check a card from their phone.

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Search, SearchX, ShieldAlert, ShieldCheck, ShieldX, WifiOff } from 'lucide-react';
import { fetchVerification } from '../services/certificateLookup';
import {
  daysBetween,
  formatDateOnly,
  formatVerificationCode,
  getCertificateStatus,
  normalizeVerificationCode,
  toDateOnly,
  type CertificateStatus,
  type CertificateVerification,
} from '../lib/certificates';

type View =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'found'; cert: CertificateVerification; checkedAt: Date }
  | { kind: 'not_found'; checkedAt: Date }
  | { kind: 'error'; offline: boolean; unavailable: boolean };

const NAVY = '#1E2761';
const GREEN = '#18B07F';

const readCodeFromPath = (): string => {
  const m = window.location.pathname.match(/^\/verify\/?([^/]*)/i);
  if (!m || !m[1]) return '';
  try {
    return normalizeVerificationCode(decodeURIComponent(m[1]));
  } catch {
    return '';
  }
};

const STATUS_STYLE: Record<
  CertificateStatus,
  { bg: string; border: string; fg: string; Icon: React.ElementType; title: string }
> = {
  valid:    { bg: '#ECFDF5', border: '#A7F3D0', fg: '#047857', Icon: ShieldCheck, title: 'Valid certificate' },
  expiring: { bg: '#ECFDF5', border: '#A7F3D0', fg: '#047857', Icon: ShieldCheck, title: 'Valid certificate' },
  expired:  { bg: '#FFFBEB', border: '#FDE68A', fg: '#B45309', Icon: ShieldAlert, title: 'Certificate expired' },
  revoked:  { bg: '#FEF2F2', border: '#FECACA', fg: '#B91C1C', Icon: ShieldX,     title: 'Certificate revoked' },
};

const Row: React.FC<{ label: string; value?: string; mono?: boolean }> = ({ label, value, mono }) =>
  value ? (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-6" style={{ borderTop: '1px solid #E2E8F0' }}>
      <dt className="text-xs font-semibold uppercase tracking-wider sm:w-36 sm:flex-shrink-0" style={{ color: '#94A3B8' }}>
        {label}
      </dt>
      <dd className={`text-sm font-semibold break-words ${mono ? 'font-mono' : ''}`} style={{ color: '#0F172A' }}>
        {value}
      </dd>
    </div>
  ) : null;

export const CertificateResult: React.FC<{
  cert: CertificateVerification;
  checkedAt: Date;
  onReset: () => void;
  /** Injectable for tests; defaults to today. */
  today?: string;
}> = ({ cert, checkedAt, onReset, today = toDateOnly(new Date()) }) => {
  const status = getCertificateStatus(cert, today);
  const s = STATUS_STYLE[status];
  const daysLeft = cert.expires_on ? daysBetween(today, cert.expires_on) : null;
  const subtitle =
    status === 'revoked'
      ? 'This certificate has been withdrawn by the issuer. Do not accept it.'
      : status === 'expired'
      ? `Expired on ${formatDateOnly(cert.expires_on)}. It was genuine, but is no longer current.`
      : status === 'expiring' && daysLeft !== null
      ? `Valid until ${formatDateOnly(cert.expires_on)} (${daysLeft === 0 ? 'expires today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}).`
      : cert.expires_on
      ? `Valid until ${formatDateOnly(cert.expires_on)}.`
      : 'This certificate does not expire.';

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
      <div className="flex items-start gap-4 p-5 sm:p-6" style={{ background: s.bg, borderBottom: `1px solid ${s.border}` }} role="status">
        <s.Icon className="mt-0.5 h-9 w-9 flex-shrink-0" style={{ color: s.fg }} />
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: s.fg, letterSpacing: '-0.02em' }}>{s.title}</h1>
          <p className="mt-1 text-sm" style={{ color: s.fg }}>{subtitle}</p>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Awarded to</p>
        <p className="mt-1 text-2xl font-extrabold break-words" style={{ color: NAVY, letterSpacing: '-0.02em' }}>
          {cert.holder_name}
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>For completing</p>
        <p className="mt-1 text-base font-bold break-words" style={{ color: '#0F172A' }}>{cert.course_title}</p>

        <dl className="mt-5">
          <Row label="Issued by" value={cert.org_name} />
          <Row label="Date issued" value={formatDateOnly(cert.issued_on)} />
          <Row label="Valid until" value={cert.expires_on ? formatDateOnly(cert.expires_on) : 'No expiry'} />
          <Row label="Trainer" value={cert.trainer_name} />
          <Row label="Certificate no." value={cert.certificate_no} mono />
          <Row label="Verification code" value={formatVerificationCode(cert.code)} mono />
        </dl>
      </div>

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <p className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }}>
          Checked {checkedAt.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.
          This confirms the certificate exists in EviroSafe&rsquo;s records and shows its current status.
          It does not confirm who is holding it, so check the person&rsquo;s photo ID against the name above.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-4 text-sm font-semibold underline-offset-2 hover:underline"
          style={{ color: NAVY }}
        >
          Verify another certificate
        </button>
      </div>
    </div>
  );
};

export const NotFoundNotice: React.FC<{ code: string }> = ({ code }) => (
  <div className="mb-4 flex items-start gap-4 rounded-2xl p-5 sm:p-6" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }} role="status">
    <SearchX className="mt-0.5 h-9 w-9 flex-shrink-0" style={{ color: '#B91C1C' }} />
    <div>
      <h1 className="text-xl font-extrabold" style={{ color: '#B91C1C', letterSpacing: '-0.02em' }}>Certificate not found</h1>
      <p className="mt-1 text-sm" style={{ color: '#B91C1C' }}>
        No certificate matches {code ? <span className="font-mono font-semibold">{formatVerificationCode(code)}</span> : 'that code'}.
        Check the code and try again. If it was printed on a certificate you were handed, treat that certificate as unverified.
      </p>
    </div>
  </div>
);

export const ErrorNotice: React.FC<{ offline: boolean; unavailable: boolean; onRetry: () => void }> = ({ offline, unavailable, onRetry }) => (
  <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6" style={{ border: '1px solid #E2E8F0' }} role="alert">
    <div className="flex items-start gap-4">
      <WifiOff className="mt-0.5 h-8 w-8 flex-shrink-0" style={{ color: '#B45309' }} />
      <div>
        <h1 className="text-lg font-extrabold" style={{ color: '#0F172A' }}>Couldn&rsquo;t check this certificate</h1>
        <p className="mt-1 text-sm" style={{ color: '#475569' }}>
          {unavailable
            ? 'The verification service is not available right now. This does not mean the certificate is invalid.'
            : offline
            ? 'You appear to be offline. Verification needs an internet connection so the result is always up to date.'
            : 'Something went wrong while contacting the server. This does not mean the certificate is invalid.'}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: NAVY }}
        >
          Try again
        </button>
      </div>
    </div>
  </div>
);

const VerifyCertificate: React.FC = () => {
  const [code, setCode] = useState<string>(readCodeFromPath);
  const [input, setInput] = useState('');
  const [view, setView] = useState<View>({ kind: 'idle' });

  // Keep the URL and state in sync with back/forward navigation.
  useEffect(() => {
    const onPop = () => setCode(readCodeFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // A public lookup page must never be indexed.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    const previousTitle = document.title;
    document.title = 'Verify certificate | EviroSafe';
    return () => {
      meta.remove();
      document.title = previousTitle;
    };
  }, []);

  const lookup = useCallback(async (value: string) => {
    if (!value) {
      setView({ kind: 'idle' });
      return;
    }
    setView({ kind: 'loading' });
    try {
      const cert = await fetchVerification(value);
      setView(cert ? { kind: 'found', cert, checkedAt: new Date() } : { kind: 'not_found', checkedAt: new Date() });
    } catch (e: any) {
      const errCode = e?.code as string | undefined;
      setView({
        kind: 'error',
        offline: errCode === 'unavailable' || (typeof navigator !== 'undefined' && navigator.onLine === false),
        unavailable: errCode === 'permission-denied',
      });
    }
  }, []);

  useEffect(() => {
    lookup(code);
  }, [code, lookup]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = normalizeVerificationCode(input);
    if (!next) return;
    window.history.pushState(null, '', `/verify/${next}`);
    setCode(next);
  };

  const reset = () => {
    window.history.pushState(null, '', '/verify');
    setInput('');
    setCode('');
  };

  const showForm = view.kind === 'idle' || view.kind === 'not_found';

  return (
    <div className="min-h-screen w-full" style={{ background: '#F1F5F9', color: '#0F172A' }}>
      <div className="mx-auto w-full max-w-xl px-4 pb-12 pt-8 sm:pt-14">
        {/* Brand */}
        <div className="mb-6 flex items-center gap-3">
          <img src="/logo.svg" alt="" className="h-10 w-auto" />
          <div>
            <p className="text-lg font-extrabold leading-none" style={{ color: NAVY, letterSpacing: '-0.02em' }}>
              EviroSafe
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748B' }}>
              Certificate verification
            </p>
          </div>
        </div>

        {view.kind === 'loading' && (
          <div className="flex items-center gap-3 rounded-2xl bg-white p-6 shadow-sm" style={{ border: '1px solid #E2E8F0' }} role="status">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: GREEN }} />
            <p className="text-sm font-medium" style={{ color: '#475569' }}>Checking this certificate…</p>
          </div>
        )}

        {view.kind === 'found' && (
          <CertificateResult cert={view.cert} checkedAt={view.checkedAt} onReset={reset} />
        )}

        {view.kind === 'not_found' && <NotFoundNotice code={code} />}

        {view.kind === 'error' && (
          <ErrorNotice offline={view.offline} unavailable={view.unavailable} onRetry={() => lookup(code)} />
        )}

        {showForm && (
          <form onSubmit={submit} className="rounded-2xl bg-white p-5 shadow-sm sm:p-6" style={{ border: '1px solid #E2E8F0' }}>
            <h2 className="text-lg font-extrabold" style={{ color: NAVY, letterSpacing: '-0.02em' }}>
              {view.kind === 'idle' ? 'Verify a certificate' : 'Try a different code'}
            </h2>
            <p className="mt-1 text-sm" style={{ color: '#475569' }}>
              Scan the QR code on the certificate, or type the verification code printed beside it.
            </p>
            <label htmlFor="cert-code" className="mt-4 block text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>
              Verification code
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="cert-code"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-lg px-3 py-2.5 font-mono text-sm outline-none focus:ring-2"
                style={{ border: '1px solid #CBD5E1', color: '#0F172A', background: '#fff' }}
              />
              <button
                type="submit"
                disabled={!normalizeVerificationCode(input)}
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: NAVY }}
              >
                <Search className="h-4 w-4" />
                Verify
              </button>
            </div>
          </form>
        )}

        <p className="mt-8 text-center text-xs" style={{ color: '#94A3B8' }}>
          Certificates are issued by the organisation named on them and recorded on the EviroSafe HSE platform.
        </p>
      </div>
    </div>
  );
};

export default VerifyCertificate;
