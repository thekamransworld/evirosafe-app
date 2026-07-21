import React, { useState, useMemo, useRef, useEffect } from 'react';
import { logoSrc } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext, useDataContext } from '../contexts';
import { NotificationsPanel } from './NotificationsPanel';
import {
  LayoutDashboard, Sparkles, BarChart3, Map, Award,
  FileWarning, CheckSquare, ClipboardCheck, ShieldCheck, ListChecks,
  ClipboardList, HardHat, Megaphone, GraduationCap, Clock3, ClipboardX,
  FlaskConical, Gauge, Grid3x3, Eye, Search as SearchIcon,
  Siren, Leaf, Users2, PackageCheck, FolderOpen, Activity,
  Handshake, FileText, Download, Lock, Bell, Signpost,
  Wrench, UsersRound, Building2, Settings2, Search, X, ChevronDown,
  LogOut, ChevronsLeft, ChevronsRight,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Icon map — lucide-react, matching the rest of the app instead of hand-rolled SVGs
// ─────────────────────────────────────────────────────────────────────────────
const ICONS: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard, 'ai-insights': Sparkles, 'hse-statistics': BarChart3,
  'site-map': Map, certification: Award,
  reports: FileWarning, actions: CheckSquare, inspections: ClipboardCheck,
  'audit-inspection': ShieldCheck, ptw: ListChecks, checklists: ClipboardList,
  plans: ClipboardList, rams: HardHat, tbt: Megaphone, training: GraduationCap,
  'man-hours': Clock3, 'corrective-actions': ClipboardX, 'chemical-register': FlaskConical,
  kpi: Gauge, 'risk-matrix': Grid3x3, bbs: Eye, rca: SearchIcon,
  emergency: Siren, environment: Leaf, contractors: Users2, ppe: PackageCheck,
  documents: FolderOpen, fatigue: Activity, meetings: Handshake,
  compliance: FileText, 'audit-log': FileText, exports: Download, privacy: Lock,
  notifications: Bell, signage: Signpost, housekeeping: Wrench,
  people: UsersRound, organizations: Building2, settings: Settings2,
};

interface MenuItem { label: string; view: string; roles?: string[] }
interface MenuSection { id: string; label: string; items: MenuItem[] }

const MENU_SECTIONS: MenuSection[] = [
  { id: 'core', label: 'Overview', items: [
    { label: 'Dashboard',      view: 'dashboard' },
    { label: 'AI Insights',    view: 'ai-insights' },
    { label: 'HSE Statistics', view: 'hse-statistics' },
    { label: 'Site Map',       view: 'site-map' },
    { label: 'My Certificate', view: 'certification' },
  ]},
  { id: 'operations', label: 'Operations', items: [
    { label: 'Incident Reports',   view: 'reports' },
    { label: 'Action Tracker',     view: 'actions' },
    { label: 'Inspections',        view: 'inspections' },
    { label: 'Audit & Inspection', view: 'audit-inspection', roles: ['ADMIN','ORG_ADMIN','HSE_MANAGER','HSE_OFFICER','SUPERVISOR','INSPECTOR'] },
    { label: 'Permit to Work',     view: 'ptw' },
    { label: 'Checklists',         view: 'checklists' },
    { label: 'Plans',              view: 'plans' },
    { label: 'RAMS',               view: 'rams' },
    { label: 'Toolbox Talks',      view: 'tbt' },
    { label: 'Training',           view: 'training' },
    { label: 'Man-Hours Log',      view: 'man-hours',          roles: ['ADMIN','ORG_ADMIN','HSE_MANAGER','HSE_OFFICER','SUPERVISOR'] },
    { label: 'Corrective Actions', view: 'corrective-actions', roles: ['ADMIN','ORG_ADMIN','HSE_MANAGER','HSE_OFFICER','SUPERVISOR'] },
    { label: 'Chemical Register',  view: 'chemical-register',  roles: ['ADMIN','ORG_ADMIN','HSE_MANAGER','HSE_OFFICER','SUPERVISOR'] },
  ]},
  { id: 'analytics', label: 'Analytics', items: [
    { label: 'KPI Dashboard',       view: 'kpi',          roles: ['ADMIN','ORG_ADMIN','HSE_MANAGER','HSE_OFFICER','SUPERVISOR'] },
    { label: 'Risk Matrix',         view: 'risk-matrix',  roles: ['ADMIN','ORG_ADMIN','HSE_MANAGER','HSE_OFFICER','SUPERVISOR'] },
    { label: 'Safety Observations', view: 'bbs' },
    { label: 'RCA (Investigation)', view: 'rca',          roles: ['ADMIN','ORG_ADMIN','HSE_MANAGER','HSE_OFFICER'] },
  ]},
  { id: 'advanced', label: 'Advanced Modules', items: [
    { label: 'Emergency Response', view: 'emergency',    roles: ['ADMIN','ORG_ADMIN','HSE_MANAGER','HSE_OFFICER','SUPERVISOR'] },
    { label: 'Environmental',      view: 'environment',  roles: ['ADMIN','ORG_ADMIN','HSE_MANAGER','HSE_OFFICER','SUPERVISOR'] },
    { label: 'Contractors',        view: 'contractors',  roles: ['ADMIN','ORG_ADMIN','HSE_MANAGER','HSE_OFFICER','SUPERVISOR'] },
    { label: 'PPE Inventory',      view: 'ppe',          roles: ['ADMIN','ORG_ADMIN','HSE_MANAGER','HSE_OFFICER','SUPERVISOR'] },
    { label: 'Document Control',   view: 'documents' },
    { label: 'Fatigue & FFD',      view: 'fatigue',      roles: ['ADMIN','ORG_ADMIN','HSE_MANAGER','HSE_OFFICER','SUPERVISOR'] },
    { label: 'Safety Meetings',    view: 'meetings',     roles: ['ADMIN','ORG_ADMIN','HSE_MANAGER','HSE_OFFICER','SUPERVISOR'] },
  ]},
  { id: 'compliance', label: 'Compliance', items: [
    { label: 'Compliance Register', view: 'compliance',  roles: ['ADMIN','ORG_ADMIN','HSE_MANAGER','HSE_OFFICER'] },
    { label: 'Audit Log',           view: 'audit-log',   roles: ['ADMIN','ORG_ADMIN','HSE_MANAGER','HSE_OFFICER'] },
    { label: 'Data Export',         view: 'exports',     roles: ['ADMIN','ORG_ADMIN','HSE_MANAGER','HSE_OFFICER'] },
    { label: 'Data & Privacy',      view: 'privacy',     roles: ['ADMIN','ORG_ADMIN'] },
  ]},
  { id: 'system', label: 'System', items: [
    { label: 'Notifications',   view: 'notifications' },
    { label: 'Signage Library', view: 'signage' },
    { label: 'Housekeeping',    view: 'housekeeping',  roles: ['ADMIN','ORG_ADMIN'] },
    { label: 'People',          view: 'people',        roles: ['ADMIN','ORG_ADMIN','HSE_MANAGER','HSE_OFFICER'] },
    { label: 'Organizations',   view: 'organizations', roles: ['ADMIN','ORG_ADMIN'] },
    { label: 'Settings',        view: 'settings',      roles: ['ADMIN','ORG_ADMIN'] },
  ]},
];

// Sections open by default on first visit — keeps the initial view scannable
// instead of dumping all 40 items on screen at once. User's manual
// expand/collapse choices are remembered for the rest of the session.
const DEFAULT_OPEN: Record<string, boolean> = {
  core: true, operations: true, analytics: false,
  advanced: false, compliance: false, system: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Nav item
// ─────────────────────────────────────────────────────────────────────────────
const NavItem: React.FC<{
  label: string; view: string; currentView: string;
  setCurrentView: (view: string) => void; isOpen: boolean; badge?: number;
}> = ({ label, view, currentView, setCurrentView, isOpen, badge }) => {
  const isActive = currentView === view;
  const Icon = ICONS[view] || LayoutDashboard;

  return (
    <button
      onClick={() => setCurrentView(view)}
      className={`giq-nav-item w-full ${isActive ? 'active' : ''}`}
      style={{ justifyContent: isOpen ? 'flex-start' : 'center', margin: '0 8px', width: isOpen ? 'calc(100% - 16px)' : 32 }}
      title={!isOpen ? label : undefined}
    >
      <Icon size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
      {isOpen && <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
      {isOpen && badge !== undefined && badge > 0 && (
        <span style={{
          background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700,
          borderRadius: 99, minWidth: 18, height: 18, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0,
        }}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Collapsible section header
// ─────────────────────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{
  label: string; isOpen: boolean; isExpanded: boolean; onToggle: () => void;
}> = ({ label, isOpen, isExpanded, onToggle }) => {
  if (!isOpen) return <div style={{ margin: '10px auto', width: 20, borderTop: '1px solid var(--border-default)' }} />;
  return (
    <button onClick={onToggle} className="giq-section-label" style={{
      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'none', border: 'none', cursor: 'pointer',
    }}>
      <span>{label}</span>
      <ChevronDown size={12} style={{ transition: 'transform 0.15s', transform: isExpanded ? 'none' : 'rotate(-90deg)' }} />
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Sidebar
// ─────────────────────────────────────────────────────────────────────────────
export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, isOpen, setOpen }) => {
  const { logout, currentUser }   = useAuth();
  const { notifications }         = useDataContext();
  const { activeUser }            = useAppContext();
  const [showNotifications, setShowNotifications] = useState(false);
  const [search, setSearch]       = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(DEFAULT_OPEN);
  const toggleSection = (id: string) => setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));

  const unreadCount = notifications.filter(
    (n) => n.user_id === activeUser?.id && !n.is_read,
  ).length;

  // Case-insensitive + trimmed role comparison — prevents items silently
  // disappearing due to casing differences between Firestore and this list.
  const userRole = (activeUser?.role ?? '').toUpperCase().trim();
  const canSee = (item: MenuItem) => !item.roles || item.roles.map(r => r.toUpperCase()).includes(userRole);

  // Keyboard shortcut: "/" focuses the sidebar search, matching common app conventions.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // When actively searching, auto-expand every section that has a match
  // so results aren't hidden behind a collapsed header.
  const isSearching = search.trim().length > 0;
  const matchesSearch = (item: MenuItem) => item.label.toLowerCase().includes(search.trim().toLowerCase());

  return (
    <>
      <div
        className="giq-sidebar"
        style={{
          width: isOpen ? 'var(--sidebar-width)' : 64,
          // App.tsx already lays this component out as a normal flex child
          // (sibling to the main content area) — override .giq-sidebar's
          // `position: fixed` so it stays in-flow instead of floating over
          // the page content.
          position: 'relative',
          top: 'auto',
          left: 'auto',
          flexShrink: 0,
        }}
      >

        {/* ── Header / Logo ─────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', height: 60, flexShrink: 0,
          padding: isOpen ? '0 16px' : '0', justifyContent: isOpen ? 'flex-start' : 'center',
          borderBottom: '1px solid var(--border-default)',
        }}>
          <img src={logoSrc} alt="Logo" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
          {isOpen && (
            <span style={{ marginLeft: 10, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
              EviroSafe
            </span>
          )}
        </div>

        {/* ── Search ─────────────────────────────────────────────────────── */}
        {isOpen && (
          <div style={{ padding: '10px 12px 4px', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search modules…"
                style={{
                  width: '100%', padding: '7px 28px', fontSize: 12.5, borderRadius: 8,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)', outline: 'none',
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Navigation ────────────────────────────────────────────────── */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 0 8px' }}>
          {MENU_SECTIONS.map((section) => {
            const visibleItems = section.items.filter(canSee).filter((item) => !isSearching || matchesSearch(item));
            if (visibleItems.length === 0) return null;

            const isExpanded = isSearching ? true : (expandedSections[section.id] ?? true);

            return (
              <div key={section.id}>
                <SectionHeader
                  label={section.label}
                  isOpen={isOpen}
                  isExpanded={isExpanded}
                  onToggle={() => toggleSection(section.id)}
                />
                {isExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 4 }}>
                    {visibleItems.map((item) => (
                      <NavItem
                        key={item.view}
                        label={item.label}
                        view={item.view}
                        isOpen={isOpen}
                        currentView={currentView}
                        setCurrentView={setCurrentView}
                        badge={item.view === 'notifications' ? unreadCount : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {isSearching && MENU_SECTIONS.every(s => s.items.filter(canSee).filter(matchesSearch).length === 0) && (
            <p style={{ padding: '20px 16px', fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center' }}>
              No modules match "{search}"
            </p>
          )}
        </nav>

        {/* ── Notification bell + collapse toggle ───────────────────────── */}
        <div style={{ padding: 8, borderTop: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => setShowNotifications(true)}
            className="giq-nav-item"
            style={{ justifyContent: isOpen ? 'flex-start' : 'center', position: 'relative', width: '100%' }}
          >
            <Bell size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
            {isOpen && <span style={{ flex: 1, textAlign: 'left' }}>Notifications</span>}
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 6, right: isOpen ? 10 : 4,
                width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
              }} />
            )}
          </button>

          <button
            onClick={() => setOpen(!isOpen)}
            className="giq-nav-item"
            style={{ justifyContent: isOpen ? 'flex-start' : 'center', width: '100%' }}
          >
            {isOpen ? <ChevronsLeft size={16} /> : <ChevronsRight size={16} />}
            {isOpen && <span style={{ flex: 1, textAlign: 'left' }}>Collapse</span>}
          </button>
        </div>

        {/* ── User footer ────────────────────────────────────────────────── */}
        <div style={{
          padding: isOpen ? '12px 14px' : '10px 0', borderTop: '1px solid var(--border-default)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          justifyContent: isOpen ? 'flex-start' : 'center',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          {isOpen && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.email}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {(activeUser?.role ?? 'User').replace(/_/g, ' ')}
              </p>
            </div>
          )}
          {isOpen && (
            <button onClick={() => logout()} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, flexShrink: 0 }}>
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>

      {showNotifications && (
        <NotificationsPanel onClose={() => setShowNotifications(false)} />
      )}
    </>
  );
};