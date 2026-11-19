import React from 'react';
import { AlertOctagon, Clock, Info } from 'lucide-react';
import type { Ptw } from '../../types';
import { effectiveStatus, firstActivatedMs, formatRemaining, requestedWindow, validFromMs, validUntilMs } from '../../lib/ptw/validity';
import { typeRule } from '../../lib/ptw/model';
import type { EnginePermit } from '../../lib/ptw/engine';
import { useNow } from './useNow';
import { fmtDateTime } from './ptwUi';

/**
 * How long this permit is valid, and what that means right now. The clock the
 * work is judged by is the server's (valid_until_ts); this banner only shows it.
 */
export const ValidityBanner: React.FC<{ permit: Ptw }> = ({ permit }) => {
  const now = useNow(15_000);
  const p = permit as unknown as EnginePermit;
  const stage = effectiveStatus(p, now);
  const rule = typeRule(permit.type);

  const box = (tone: 'green' | 'amber' | 'red' | 'blue' | 'gray', icon: React.ReactNode, title: string, body?: React.ReactNode) => {
    const tones = {
      green: 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200',
      amber: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200',
      red: 'bg-red-50 border-red-300 text-red-900 dark:bg-red-900/25 dark:border-red-800 dark:text-red-200',
      blue: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
      gray: 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-white/5 dark:border-dark-border dark:text-gray-300',
    };
    return (
      <div role="status" className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${tones[tone]}`} data-testid="validity-banner">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div>
          <div className="font-bold">{title}</div>
          {body && <div className="mt-0.5 text-xs opacity-90">{body}</div>}
        </div>
      </div>
    );
  };

  if (stage === 'ACTIVE' || stage === 'HOLD') {
    const until = validUntilMs(p);
    if (!Number.isFinite(until)) return box('gray', <Info size={18} />, 'Validity not recorded', 'This permit has no recorded end time.');
    const left = until - now;
    const ext = (permit.extensions ?? []).length;
    const tone = left < 0 ? 'red' : left <= 15 * 60_000 ? 'red' : left <= 60 * 60_000 ? 'amber' : 'green';
    const first = firstActivatedMs(p);
    return box(
      tone,
      tone === 'red' ? <AlertOctagon size={18} /> : <Clock size={18} />,
      `${stage === 'HOLD' ? 'On hold. ' : ''}${formatRemaining(left)}`,
      <>Valid until {fmtDateTime(until)}{Number.isFinite(first) ? `. Started ${fmtDateTime(first)}` : ''}{ext > 0 ? `. Extended ${ext} time${ext === 1 ? '' : 's'}` : ''}.
        {stage === 'HOLD' ? ' The clock keeps running while work is on hold.' : ''}</>,
    );
  }

  if (stage === 'EXPIRED') {
    const until = validUntilMs(p);
    return box('red', <AlertOctagon size={18} />, 'EXPIRED. Work must stop.',
      <>{Number.isFinite(until) ? `Validity ended ${fmtDateTime(until)}. ` : ''}Request completion, or cancel the permit. An expired permit cannot be extended.</>);
  }

  if (stage === 'SITE_HANDOVER') {
    const w = requestedWindow(permit.payload);
    return box('blue', <Clock size={18} />, 'Approved. Validity starts at handover.',
      <>It will run for up to {rule?.maxHours ?? '?'} h{w ? `, and never past the requested end (${fmtDateTime(w.end)})` : ''}.</>);
  }

  if (stage === 'COMPLETION_PENDING') {
    const until = validUntilMs(p), from = validFromMs(p);
    return box('gray', <Info size={18} />, 'Work finished. Waiting for the completion inspection.',
      Number.isFinite(from) && Number.isFinite(until) ? <>Was valid {fmtDateTime(from)} to {fmtDateTime(until)}.</> : undefined);
  }

  if (stage === 'DRAFT' || stage === 'SUBMITTED' || stage === 'SITE_INSPECTION' || stage === 'APPROVAL') {
    const w = requestedWindow(permit.payload);
    return box('gray', <Clock size={18} />, w ? `Requested: ${fmtDateTime(w.start)} to ${fmtDateTime(w.end)}` : 'No valid start and end time set yet',
      <>{rule ? `A ${permit.type} permit can be valid for at most ${rule.maxHours} h at a time.` : ''} Validity only starts at handover.</>);
  }
  return null;
};
