import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Home, AlertTriangle, Shield, CheckCircle2, MoreHorizontal,
  FileText, BarChart2, Users, Leaf, Activity, Bell, Settings,
  ClipboardList, Eye, FolderOpen, HardHat, Package, Siren,
  X, ChevronRight, Grid2x2, BookOpen, Download, Lock,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

const PRIMARY_TABS: NavItem[] = [
  { id: 'dashboard',  label: 'Home',      icon: Home },
  { id: 'reports',    label: 'Incidents', icon: AlertTriangle },
  { id: 'ptw',        label: 'Permits',   icon: Shield },
  { id: 'actions',    label: 'Actions',   icon: CheckCircle2 },
];

const MORE_GROUPS = [
  {
    label: 'Analytics',
    items: [
      { id: 'kpi',          label: 'KPI Dashboard',        icon: BarChart2 },
      { id: 'risk-matrix',  label: 'Risk Matrix',          icon: Grid2x2 },
      { id: 'compliance',   label: 'Compliance Register',  icon: BookOpen },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'inspections',  label: 'Inspections',          icon: ClipboardList },
      { id: 'bbs',          label: 'Safety Observations',  icon: Eye },
      { id: 'emergency',    label: 'Emergency Response',   icon: Siren },
      { id: 'meetings',     label: 'Safety Meetings',      icon: Users },
    ],
  },
  {
    label: 'People & Assets',
    items: [
      { id: 'training',     label: 'Training',             icon: Users },
      { id: 'contractors',  label: 'Contractors',          icon: HardHat },
      { id: 'ppe',          label: 'PPE Inventory',        icon: Package },
      { id: 'fatigue',      label: 'Fatigue & FFD',        icon: Activity },
    ],
  },
  {
    label: 'Management',
    items: [
      { id: 'documents',    label: 'Document Control',     icon: FolderOpen },
      { id: 'environment',  label: 'Environmental',        icon: Leaf },
      { id: 'audit-log',    label: 'Audit Log',            icon: FileText },
      { id: 'exports',      label: 'Data Export',          icon: Download },
      { id: 'privacy',      label: 'Data & Privacy',       icon: Lock },
      { id: 'notifications',label: 'Notifications',        icon: Bell },
      { id: 'settings',     label: 'Settings',             icon: Settings },
    ],
  },
];

export function useMobileNav() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [mobileTab, setMobileTab] = useState('dashboard');

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    const mq = window.matchMedia('(max-width: 767px)');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return { isMobile, mobileTab, setMobileTab };
}

interface MoreDrawerProps {
  isOpen: boolean;
  activePage: string;
  onNavigate: (page: string) => void;
  onClose: () => void;
  notifications?: number;
}

const MoreDrawer: React.FC<MoreDrawerProps> = ({
  isOpen, activePage, onNavigate, onClose, notifications,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div ref={drawerRef} style={{
        width: '100%', maxHeight: '85vh',
        background: 'var(--color-background-primary)',
        borderRadius: '20px 20px 0 0',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        animation: 'mobileSlideUp 0.25s ease-out',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-border-secondary)' }} />
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px 12px', borderBottom: '1px solid var(--color-border-tertiary)',
          flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
            All Modules
          </h2>
          <button onClick={onClose} style={{
            padding: 8, background: 'var(--color-background-secondary)',
            border: 'none', borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X style={{ width: 18, height: 18, color: 'var(--color-text-secondary)' }} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 16px 24px' }}>
          {MORE_GROUPS.map((group) => (
            <div key={group.label} style={{ marginBottom: 20 }}>
              <p style={{
                fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.07em',
                padding: '8px 4px 6px', margin: 0,
              }}>
                {group.label}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  const hasBadge = item.id === 'notifications' && (notifications ?? 0) > 0;

                  return (
                    <button key={item.id}
                      onClick={() => { onNavigate(item.id); onClose(); }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 6, padding: '14px 8px',
                        background: isActive ? '#E6F1FB' : 'var(--color-background-secondary)',
                        border: isActive ? '1.5px solid #185FA5' : '1px solid var(--color-border-tertiary)',
                        borderRadius: 14, cursor: 'pointer', position: 'relative',
                        minHeight: 72, justifyContent: 'center',
                      }}>
                      {hasBadge && (
                        <div style={{
                          position: 'absolute', top: 8, right: 8,
                          width: 18, height: 18, borderRadius: '50%',
                          background: '#A32D2D', color: '#fff',
                          fontSize: 10, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {notifications! > 9 ? '9+' : notifications}
                        </div>
                      )}
                      <Icon style={{ width: 22, height: 22, color: isActive ? '#185FA5' : 'var(--color-text-secondary)' }} />
                      <span style={{
                        fontSize: 11, fontWeight: isActive ? 600 : 400,
                        color: isActive ? '#185FA5' : 'var(--color-text-secondary)',
                        textAlign: 'center', lineHeight: 1.2,
                      }}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes mobileSlideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
};

interface MobileNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
  notifications?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activePage, onNavigate, notifications = 0 }) => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  if (!isMobile) return null;

  const tabs = [
    ...PRIMARY_TABS,
    { id: '__more__', label: 'More', icon: MoreHorizontal },
  ];

  return (
    <>
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--color-background-primary)',
        borderTop: '1px solid var(--color-border-tertiary)',
        display: 'flex', alignItems: 'stretch',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
      }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isMore = tab.id === '__more__';
          const isActive = !isMore && activePage === tab.id;
          const isMoreActive = isMore && showMore;
          const showBadge = tab.id === 'notifications' && notifications > 0;

          return (
            <button key={tab.id}
              onClick={() => {
                if (isMore) { setShowMore((v) => !v); }
                else { onNavigate(tab.id); setShowMore(false); }
              }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, padding: '10px 4px', background: 'none',
                border: 'none', cursor: 'pointer', position: 'relative', minHeight: 56,
              }}>
              {(isActive || isMoreActive) && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 24, height: 3, borderRadius: '0 0 3px 3px', background: '#185FA5',
                }} />
              )}
              {showBadge && (
                <div style={{
                  position: 'absolute', top: 7, right: '50%',
                  transform: 'translateX(8px)',
                  minWidth: 17, height: 17, borderRadius: '50%',
                  background: '#A32D2D', color: '#fff',
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px', border: '2px solid var(--color-background-primary)',
                }}>
                  {notifications > 99 ? '99+' : notifications}
                </div>
              )}
              <Icon style={{
                width: 23, height: 23,
                color: (isActive || isMoreActive) ? '#185FA5' : 'var(--color-text-secondary)',
                strokeWidth: isActive ? 2.2 : 1.7,
              }} />
              <span style={{
                fontSize: 10,
                fontWeight: (isActive || isMoreActive) ? 600 : 400,
                color: (isActive || isMoreActive) ? '#185FA5' : 'var(--color-text-secondary)',
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      <MoreDrawer
        isOpen={showMore}
        activePage={activePage}
        onNavigate={onNavigate}
        onClose={() => setShowMore(false)}
        notifications={notifications}
      />
    </>
  );
};

export default MobileNav;