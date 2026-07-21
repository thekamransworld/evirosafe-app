import React, { useRef } from 'react';
import { useAppContext, useDataContext } from '../contexts';
import { useTheme } from '../contexts/ThemeContext';
import { Shield, Award, Download, Share2, CheckCircle, Calendar, Building2, Star } from 'lucide-react';

// ─── Cert card ────────────────────────────────────────────────────────────────

const CertCard: React.FC<{ cert: any; onClick: () => void }> = ({ cert, onClick }) => {
  const isValid   = cert.expiryDate ? new Date(cert.expiryDate) > new Date() : true;
  const daysLeft  = cert.expiryDate
    ? Math.ceil((new Date(cert.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div onClick={onClick}
      className="giq-card p-4 cursor-pointer transition-all hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: isValid ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
          <Award className="w-5 h-5" style={{ color: isValid ? '#10b981' : '#ef4444' }} />
        </div>
        <span className="text-xs font-semibold px-2 py-1 rounded-full"
          style={{
            background: isValid ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: isValid ? '#10b981' : '#ef4444',
          }}>
          {isValid ? 'Valid' : 'Expired'}
        </span>
      </div>
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{cert.title}</h3>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{cert.issuedBy}</p>
      <div className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          <span>Issued: {new Date(cert.issueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
        {cert.expiryDate && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            <span className={daysLeft !== null && daysLeft <= 30 ? 'font-semibold' : ''}
              style={{ color: daysLeft !== null && daysLeft <= 30 ? (daysLeft < 0 ? '#ef4444' : '#f59e0b') : 'var(--text-muted)' }}>
              {daysLeft !== null && daysLeft < 0 ? `Expired ${Math.abs(daysLeft)}d ago` : `Expires ${new Date(cert.expiryDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const CertifiedProfile: React.FC = () => {
  const { activeUser, activeOrg } = useAppContext();
  const { reportList, ptwList, inspectionList } = useDataContext();
  const { theme } = useTheme();
  const printRef = useRef<HTMLDivElement>(null);

  if (!activeUser) return null;

  const certs: any[] = (activeUser as any).certifications || [];

  const stats = {
    reports:     reportList.filter(r => r.reporter_id === activeUser.id || r.creator_id === activeUser.id).length,
    ptws:        ptwList.filter(p => (p as any).issuer_id === activeUser.id || p.payload?.requester?.id === activeUser.id).length,
    inspections: inspectionList.filter(i => (i as any).conducted_by_id === activeUser.id).length,
    validCerts:  certs.filter(c => !c.expiryDate || new Date(c.expiryDate) > new Date()).length,
  };

  const roleColors: Record<string, string> = {
    ADMIN:       '#ef4444',
    ORG_ADMIN:   '#f59e0b',
    HSE_MANAGER: '#10b981',
    SUPERVISOR:  '#3b82f6',
    WORKER:      '#8b5cf6',
  };
  const roleColor = roleColors[activeUser.role] || '#10b981';

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="giq-page-title">My Certificate</h1>
          <p className="giq-page-subtitle mt-1">Professional profile and certifications</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="giq-btn-secondary flex items-center gap-2">
            <Download className="w-3.5 h-3.5" />Export PDF
          </button>
          <button className="giq-btn-secondary flex items-center gap-2">
            <Share2 className="w-3.5 h-3.5" />Share
          </button>
        </div>
      </div>

      {/* Profile hero card */}
      <div ref={printRef} className="giq-card overflow-hidden">
        {/* Banner */}
        <div className="h-24 relative"
          style={{ background: `linear-gradient(135deg, #064e3b 0%, #10b981 50%, #34d399 100%)` }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          {/* GuardIQ watermark */}
          <div className="absolute top-3 right-4 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-white/70" />
            <span className="text-white/70 text-xs font-bold tracking-wide">GuardIQ</span>
          </div>
        </div>

        <div className="px-6 pb-6">
          {/* Avatar + name */}
          <div className="flex items-end gap-4 -mt-8 mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold border-4 shadow-lg"
              style={{ background: roleColor, borderColor: 'var(--bg-card)' }}>
              {activeUser.name?.charAt(0) || 'U'}
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {activeUser.name}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{activeUser.email}</p>
            </div>
            <div className="ml-auto pb-1">
              <span className="px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: `${roleColor}15`, color: roleColor }}>
                {activeUser.role?.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Organisation', value: activeOrg?.name || 'GuardIQ', icon: Building2 },
              { label: 'Employee ID',  value: (activeUser as any).employee_id || `GIQ-${activeUser.id?.slice(0, 6).toUpperCase()}`, icon: Shield },
              { label: 'Department',   value: activeUser.department || 'HSE', icon: Star },
              { label: 'Status',       value: 'Active', icon: CheckCircle },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-3"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                <item.icon className="w-3.5 h-3.5 mb-1.5" style={{ color: '#10b981' }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Activity stats */}
          <div className="grid grid-cols-4 gap-4 pt-4"
            style={{ borderTop: '1px solid var(--border-default)' }}>
            {[
              { label: 'Reports Filed',  value: stats.reports,     color: '#ef4444' },
              { label: 'Permits',        value: stats.ptws,        color: '#10b981' },
              { label: 'Inspections',    value: stats.inspections, color: '#3b82f6' },
              { label: 'Certifications', value: stats.validCerts,  color: '#8b5cf6' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold" style={{ color: s.color, letterSpacing: '-0.02em' }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Certifications */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Certifications ({stats.validCerts} valid)
          </h2>
        </div>
        {certs.length === 0 ? (
          <div className="giq-card py-16 text-center">
            <Award className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No certifications recorded</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Certifications added by your HSE Manager will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {certs.map((cert: any, i: number) => (
              <CertCard key={i} cert={cert} onClick={() => {}} />
            ))}
          </div>
        )}
      </div>

      {/* Verification footer */}
      <div className="giq-card p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(16,185,129,0.1)' }}>
          <CheckCircle className="w-5 h-5" style={{ color: '#10b981' }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>GuardIQ Verified Profile</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            This profile is managed by {activeOrg?.name || 'your organisation'} on the GuardIQ HSE Platform.
            Verified on {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>ID: GIQ-{activeUser.id?.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>
    </div>
  );
};