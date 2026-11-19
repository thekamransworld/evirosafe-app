// Public page opened by scanning the QR code on a permit: /permit/<token>.
// Works without signing in and renders outside the main app (no sidebar, no
// providers), so anyone on site can check, from a phone, whether the permit
// they were handed is valid RIGHT NOW. It shows only the permit number, type,
// status, validity and location: no names, no description.

import React, { useCallback, useEffect, useState } from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, Loader2, SearchX, WifiOff } from 'lucide-react';
import { fetchPublicPermit, type PublicPermit } from '../services/ptwService';
import { publicStatus, type PublicTone } from '../lib/ptw/publicStatus';
import { readPermitToken } from '../lib/ptw/publicUrl';
import { validFromMs, validUntilMs } from '../lib/ptw/validity';
import { useNow } from './ptw/useNow';

export type PermitView =
  | { kind: 'loading' }
  | { kind: 'found'; permit: PublicPermit; checkedAt: number }
  | { kind: 'not_found' }
  | { kind: 'error'; offline: boolean };

const NAVY = '#1E2761';
const TONES: Record<PublicTone, { bg: string; border: string; fg: string }> = {
  go:      { bg: '#ECFDF5', border: '#A7F3D0', fg: '#047857' },
  caution: { bg: '#FFFBEB', border: '#FDE68A', fg: '#B45309' },
  stop:    { bg: '#FEF2F2', border: '#FECACA', fg: '#B91C1C' },
  neutral: { bg: '#F1F5F9', border: '#CBD5E1', fg: '#334155' },
};

const Row: React.FC<{ label: string; value?: string; mono?: boolean }> = ({ label, value, mono }) =>
  value ? (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-6" style={{ borderTop: '1px solid #E2E8F0' }}>
      <dt className="text-xs font-semibold uppercase tracking-wider sm:w-36 sm:flex-shrink-0" style={{ color: '#94A3B8' }}>{label}</dt>
      <dd className={`text-sm font-semibold break-words ${mono ? 'font-mono' : ''}`} style={{ color: '#0F172A' }}>{value}</dd>
    </div>
  ) : null;

const when = (ms: number) =>
  Number.isFinite(ms) ? new Date(ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

export const PermitStatusView: React.FC<{ view: PermitView; now: number; onRefresh: () => void }> = ({ view, now, onRefresh }) => {
  if (view.kind === 'loading') {
    return <div className="flex items-center gap-3 text-sm" style={{ color: '#64748B' }} role="status"><Loader2 className="h-5 w-5 animate-spin" /> Checking this permit...</div>;
  }
  if (view.kind === 'not_found') {
    return (
      <div className="flex items-start gap-4 rounded-2xl p-5 sm:p-6" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }} role="status">
        <SearchX className="mt-0.5 h-9 w-9 flex-shrink-0" style={{ color: '#B91C1C' }} />
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: '#B91C1C', letterSpacing: '-0.02em' }}>Permit not found</h1>
          <p className="mt-1 text-sm" style={{ color: '#B91C1C' }}>No permit matches this code. Treat the permit you were handed as <strong>not valid</strong> and ask the permit holder.</p>
        </div>
      </div>
    );
  }
  if (view.kind === 'error') {
    return (
      <div className="flex items-start gap-4 rounded-2xl p-5 sm:p-6" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }} role="status">
        <WifiOff className="mt-0.5 h-9 w-9 flex-shrink-0" style={{ color: '#B45309' }} />
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: '#B45309' }}>{view.offline ? 'No connection' : 'Could not check this permit'}</h1>
          <p className="mt-1 text-sm" style={{ color: '#B45309' }}>The status could not be read, so do not assume the permit is valid. {view.offline ? 'Check your internet connection and ' : ''}<button type="button" className="underline font-semibold" onClick={onRefresh}>try again</button>.</p>
        </div>
      </div>
    );
  }

  const m = view.permit;
  const s = publicStatus(m, now);
  const t = TONES[s.tone];
  const Icon = s.tone === 'go' ? CheckCircle2 : s.tone === 'caution' ? AlertTriangle : AlertOctagon;
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
      <div className="flex items-start gap-4 p-5 sm:p-6" style={{ background: t.bg, borderBottom: `1px solid ${t.border}` }} role="status" data-testid="permit-status">
        <Icon className="mt-0.5 h-9 w-9 flex-shrink-0" style={{ color: t.fg }} />
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: t.fg, letterSpacing: '-0.02em' }}>{s.title}</h1>
          <p className="mt-1 text-sm" style={{ color: t.fg }}>{s.detail}</p>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Permit to work</p>
        <p className="mt-1 text-2xl font-extrabold break-words font-mono" style={{ color: NAVY, letterSpacing: '-0.02em' }}>{m.permit_no}</p>
        <dl className="mt-5">
          <Row label="Type" value={m.type} />
          <Row label="Location" value={m.location} />
          <Row label="Valid from" value={when(validFromMs(m as any))} />
          <Row label="Valid until" value={when(validUntilMs(m as any))} />
          <Row label="Last updated" value={when(m.updated_at ? new Date(m.updated_at).getTime() : NaN)} />
        </dl>
      </div>
      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <p className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }}>
          Checked {when(view.checkedAt)}. This is the current status held by EviroSafe. It does not show who is working or what the work is.
          If anything on site does not match this page, <strong>stop work</strong> and ask the permit holder or the site HSE team.
        </p>
        <button type="button" onClick={onRefresh} className="mt-4 text-sm font-semibold underline-offset-2 hover:underline" style={{ color: NAVY }}>Check again</button>
      </div>
    </div>
  );
};

const PublicPermitPage: React.FC = () => {
  const token = readPermitToken(window.location.pathname);
  const [view, setView] = useState<PermitView>(token ? { kind: 'loading' } : { kind: 'not_found' });
  const now = useNow(15_000); // keeps the countdown and the expiry reading true between checks

  const check = useCallback(async () => {
    if (!token) { setView({ kind: 'not_found' }); return; }
    const r = await fetchPublicPermit(token);
    if (r.ok === true) setView({ kind: 'found', permit: r.permit, checkedAt: Date.now() });
    else if (r.reason === 'not-found') setView({ kind: 'not_found' });
    else setView(prev => (prev.kind === 'found' ? prev : { kind: 'error', offline: r.reason === 'offline' }));
  }, [token]);

  useEffect(() => {
    void check();
    const every = setInterval(() => { if (!document.hidden) void check(); }, 30_000);
    const onVisible = () => { if (!document.hidden) void check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(every); document.removeEventListener('visibilitychange', onVisible); };
  }, [check]);

  return (
    <main className="min-h-screen px-4 py-8" style={{ background: '#F1F5F9' }}>
      <div className="mx-auto w-full max-w-xl">
        <p className="mb-4 text-sm font-extrabold tracking-wide" style={{ color: NAVY }}>EviroSafe</p>
        <PermitStatusView view={view} now={now} onRefresh={() => void check()} />
      </div>
    </main>
  );
};

export default PublicPermitPage;
