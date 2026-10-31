import React from 'react';
import { Award, Calendar, Download, ExternalLink, Link2, Loader2, QrCode } from 'lucide-react';
import type { TrainingRecord } from '../types';
import type { useCertificateActions } from '../hooks/useCertificateActions';
import {
  buildVerifyUrl, formatDateOnly, getRecordCertificateStatus, toDateOnly, type CertificateStatus,
} from '../lib/certificates';

// A certificate issued from a training record: status, dates, and actions to
// download the PDF, open the public verification page, or copy its link.

const STATUS_CFG: Record<CertificateStatus, { label: string; color: string; bg: string }> = {
  valid:    { label: 'Valid',         color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  expiring: { label: 'Expiring soon', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  expired:  { label: 'Expired',       color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  revoked:  { label: 'Revoked',       color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

const fmtIso = (iso?: string) => {
  const d = iso ? new Date(iso) : null;
  return d && !isNaN(d.getTime()) ? formatDateOnly(toDateOnly(d), 'short') : '—';
};

export const CertificateCard: React.FC<{
  record: TrainingRecord;
  title: string;
  actions: ReturnType<typeof useCertificateActions>;
}> = ({ record, title, actions }) => {
  const status = getRecordCertificateStatus(record);
  const cfg = STATUS_CFG[status];
  const busy = actions.busyId === record.id;
  const code = record.verification_code;

  return (
    <div className="giq-card overflow-hidden">
      <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #1E2761 0%, #18B07F 100%)' }} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: cfg.bg }}>
            <Award className="w-5 h-5" style={{ color: cfg.color }} />
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.label}
          </span>
        </div>

        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        <p className="text-xs font-mono mb-3" style={{ color: 'var(--text-muted)' }}>
          {record.certificate_no || 'Certificate not issued yet'}
        </p>

        <div className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            <span>Issued: {fmtIso(record.issued_at)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            <span style={{ color: status === 'expiring' ? '#f59e0b' : status === 'expired' ? '#ef4444' : undefined, fontWeight: status === 'expiring' || status === 'expired' ? 600 : undefined }}>
              {record.expires_at ? `${status === 'expired' ? 'Expired' : 'Expires'}: ${fmtIso(record.expires_at)}` : 'No expiry'}
            </span>
          </div>
        </div>

        {code ? (
          <div className="flex items-center gap-2 mt-4 print:hidden">
            <button
              onClick={() => actions.download(record)}
              disabled={busy || status === 'revoked'}
              className="giq-btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {busy ? 'Preparing…' : 'Certificate PDF'}
            </button>
            <a
              href={buildVerifyUrl(code)}
              target="_blank"
              rel="noopener noreferrer"
              title="Open the public verification page"
              aria-label="Open the public verification page"
              className="giq-btn-secondary flex items-center justify-center px-3"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={() => actions.copyLink(record)}
              title="Copy verification link"
              aria-label="Copy verification link"
              className="giq-btn-secondary flex items-center justify-center px-3"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : actions.canManage ? (
          <button
            onClick={() => actions.issue(record)}
            disabled={busy}
            className="giq-btn-secondary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-60 print:hidden"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
            {busy ? 'Issuing…' : 'Issue verifiable certificate'}
          </button>
        ) : (
          <p className="text-xs mt-4 print:hidden" style={{ color: 'var(--text-muted)' }}>
            Ask your HSE Manager to issue this certificate.
          </p>
        )}
      </div>
    </div>
  );
};
