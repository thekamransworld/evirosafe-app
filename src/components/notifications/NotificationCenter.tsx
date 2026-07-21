/**
 * FILE: src/components/notifications/NotificationCenter.tsx
 * PASTE AT: src/components/notifications/NotificationCenter.tsx
 *           (create notifications/ folder inside src/components/)
 *
 * TO ADD TO APP (src/App.tsx):
 * ─────────────────────────────────────────────────────────────────────
 * 1. Import and add the bell icon to your top navigation bar:
 *
 *   import { NotificationBell } from './components/notifications/NotificationCenter';
 *
 *   // In your Navbar/Header component, add:
 *   <NotificationBell />
 *
 * 2. Add the full page view to your route block:
 *   import NotificationCenter from './components/notifications/NotificationCenter';
 *   {activePage === 'notifications' && <NotificationCenter />}
 *
 * SIDEBAR NAV ITEM (optional — most apps just use the bell):
 *   { id: 'notifications', label: 'Notifications', icon: Bell,
 *     roles: ['admin','hse_manager','supervisor','worker'] }
 *
 * HOW NOTIFICATIONS GET CREATED:
 * ─────────────────────────────────────────────────────────────────────
 *   Option A — from DataContext handlers (immediate, in-app):
 *     After any important write, call createNotification() from this file.
 *     e.g. after a PTW is approved, notify the requester.
 *
 *   Option B — from Firebase Cloud Functions (see notificationTriggers.ts):
 *     Scheduled and event-driven notifications (cert expiry, overdue actions)
 *     are written to Firestore by Cloud Functions and picked up by the
 *     real-time listener in this component automatically.
 *
 * NOTIFICATION TYPES HANDLED:
 *   ptw_approved | ptw_rejected | incident_submitted | action_overdue |
 *   certification_expiry | inspection_due | capa_assigned |
 *   document_review_due | drill_scheduled | bbs_follow_up | system
 */

import React, {
  useState, useEffect, useCallback, useRef,
} from 'react';
import {
  Bell, X, CheckCheck, Filter, RefreshCw,
  AlertTriangle, CheckCircle2, Clock, FileText,
  Shield, Users, Leaf, Activity, BookOpen,
  ChevronRight, Trash2, Volume2, VolumeX,
} from 'lucide-react';
import {
  collection, query, where, orderBy, limit,
  onSnapshot, doc, updateDoc, writeBatch,
  addDoc, serverTimestamp, Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAppContext } from '../../contexts';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'ptw_approved'
  | 'ptw_rejected'
  | 'ptw_expiring'
  | 'incident_submitted'
  | 'incident_assigned'
  | 'action_overdue'
  | 'action_assigned'
  | 'certification_expiry'
  | 'inspection_due'
  | 'inspection_assigned'
  | 'capa_assigned'
  | 'document_review_due'
  | 'drill_scheduled'
  | 'bbs_follow_up'
  | 'env_breach'
  | 'fatigue_alert'
  | 'system';

type NotifSeverity = 'info' | 'warning' | 'critical' | 'success';

export interface AppNotification {
  id: string;
  org_id: string;
  user_id: string;
  type: NotificationType;
  severity: NotifSeverity;
  title: string;
  message: string;
  /** Resource this notification links to (for deep-link navigation) */
  link_page?: string;
  link_id?: string;
  read: boolean;
  read_at?: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification config
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NotificationType, { icon: React.ElementType; color: string; bg: string }> = {
  ptw_approved:         { icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-950' },
  ptw_rejected:         { icon: X,             color: 'text-red-600',     bg: 'bg-red-100 dark:bg-red-950' },
  ptw_expiring:         { icon: Clock,         color: 'text-amber-600',   bg: 'bg-amber-100 dark:bg-amber-950' },
  incident_submitted:   { icon: AlertTriangle, color: 'text-orange-600',  bg: 'bg-orange-100 dark:bg-orange-950' },
  incident_assigned:    { icon: AlertTriangle, color: 'text-orange-600',  bg: 'bg-orange-100 dark:bg-orange-950' },
  action_overdue:       { icon: Clock,         color: 'text-red-600',     bg: 'bg-red-100 dark:bg-red-950' },
  action_assigned:      { icon: CheckCircle2,  color: 'text-blue-600',    bg: 'bg-blue-100 dark:bg-blue-950' },
  certification_expiry: { icon: Shield,        color: 'text-amber-600',   bg: 'bg-amber-100 dark:bg-amber-950' },
  inspection_due:       { icon: FileText,      color: 'text-blue-600',    bg: 'bg-blue-100 dark:bg-blue-950' },
  inspection_assigned:  { icon: FileText,      color: 'text-blue-600',    bg: 'bg-blue-100 dark:bg-blue-950' },
  capa_assigned:        { icon: AlertTriangle, color: 'text-purple-600',  bg: 'bg-purple-100 dark:bg-purple-950' },
  document_review_due:  { icon: BookOpen,      color: 'text-indigo-600',  bg: 'bg-indigo-100 dark:bg-indigo-950' },
  drill_scheduled:      { icon: Users,         color: 'text-teal-600',    bg: 'bg-teal-100 dark:bg-teal-950' },
  bbs_follow_up:        { icon: Activity,      color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-950' },
  env_breach:           { icon: Leaf,          color: 'text-red-600',     bg: 'bg-red-100 dark:bg-red-950' },
  fatigue_alert:        { icon: Activity,      color: 'text-red-600',     bg: 'bg-red-100 dark:bg-red-950' },
  system:               { icon: Bell,          color: 'text-slate-600',   bg: 'bg-slate-100 dark:bg-slate-800' },
};

const SEVERITY_STYLES: Record<NotifSeverity, string> = {
  critical: 'border-l-red-500',
  warning:  'border-l-amber-500',
  success:  'border-l-emerald-500',
  info:     'border-l-blue-500',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: create a notification document in Firestore
// Call this from DataContext handlers after important writes
// ─────────────────────────────────────────────────────────────────────────────

export async function createNotification(
  notif: Omit<AppNotification, 'id' | 'read' | 'read_at'>,
): Promise<void> {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...notif,
      read: false,
      server_timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.error('[NotificationCenter] Failed to create notification:', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Relative time formatter
// ─────────────────────────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Single notification card
// ─────────────────────────────────────────────────────────────────────────────

interface NotifCardProps {
  notif: AppNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate?: (page: string, id?: string) => void;
  compact?: boolean;
}

const NotifCard: React.FC<NotifCardProps> = ({
  notif, onMarkRead, onDelete, onNavigate, compact = false,
}) => {
  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;
  const Icon = cfg.icon;

  return (
    <div
      className={`group relative flex gap-3 p-3.5 rounded-xl border-l-[3px] transition-all
        ${SEVERITY_STYLES[notif.severity]}
        ${notif.read
          ? 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 opacity-70'
          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-sm'
        }`}
    >
      {/* Unread dot */}
      {!notif.read && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
      )}

      {/* Icon */}
      <div className={`p-2 rounded-lg flex-shrink-0 h-fit ${cfg.bg}`}>
        <Icon className={`w-4 h-4 ${cfg.color}`} />
      </div>

      {/* Content */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => {
          if (!notif.read) onMarkRead(notif.id);
          if (notif.link_page && onNavigate) onNavigate(notif.link_page, notif.link_id);
        }}
      >
        <p className={`text-sm font-semibold leading-tight ${notif.read ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
          {notif.title}
        </p>
        {!compact && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            {notif.message}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-1">{relTime(notif.created_at)}</p>
      </div>

      {/* Actions — show on hover */}
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {!notif.read && (
          <button
            onClick={() => onMarkRead(notif.id)}
            title="Mark as read"
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
        <button
          onClick={() => onDelete(notif.id)}
          title="Delete"
          className="p-1 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </button>
        {notif.link_page && (
          <button
            onClick={() => onNavigate?.(notif.link_page!, notif.link_id)}
            title="Go to item"
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Notification Bell (for Navbar)
// ─────────────────────────────────────────────────────────────────────────────

interface NotificationBellProps {
  onNavigate?: (page: string, id?: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
  const { activeUser, activeOrg } = useAppContext();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [muted, setMuted]   = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  // Real-time Firestore listener — only user's own notifications
  useEffect(() => {
    if (!activeUser?.id || !activeOrg?.id) return;
    const q = query(
      collection(db, 'notifications'),
      where('user_id',  '==', activeUser.id),
      where('org_id',   '==', activeOrg.id),
      orderBy('created_at', 'desc'),
      limit(50),
    );
    const unsub: Unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification));
      setNotifications(data);

      // Browser notification for new unread items (if permission granted)
      const unreadCount = data.filter((n) => !n.read).length;
      if (!muted && unreadCount > prevCountRef.current && prevCountRef.current > 0) {
        if (Notification.permission === 'granted') {
          new Notification('EviroSafe', {
            body: `You have ${unreadCount} unread notifications`,
            icon: '/favicon.ico',
          });
        }
      }
      prevCountRef.current = unreadCount;
    });
    return () => unsub();
  }, [activeUser?.id, activeOrg?.id, muted]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter((n) => !n.read);
  const unreadCount = unread.length;

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) =>
      n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n,
    ));
    try {
      await updateDoc(doc(db, 'notifications', id), {
        read: true,
        read_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[NotificationBell] markRead failed:', e);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (!unreadIds.length) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const batch = writeBatch(db);
    unreadIds.forEach((id) => batch.update(doc(db, 'notifications', id), { read: true }));
    try { await batch.commit(); } catch (e) { console.error('[NotificationBell] markAllRead failed:', e); }
  }, [notifications]);

  const deleteNotif = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'notifications', id));
      await batch.commit();
    } catch (e) { console.error('[NotificationBell] delete failed:', e); }
  }, []);

  const requestBrowserPermission = () => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => { setIsOpen((v) => !v); requestBrowserPermission(); }}
        className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-slate-400">{unreadCount} unread</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 font-medium"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setMuted((v) => !v)}
                title={muted ? 'Unmute notifications' : 'Mute notifications'}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                {muted
                  ? <VolumeX className="w-4 h-4 text-slate-400" />
                  : <Volume2 className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="w-8 h-8 mx-auto text-slate-200 dark:text-slate-700 mb-2" />
                <p className="text-sm text-slate-400">No notifications yet</p>
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                {/* Unread first */}
                {unread.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 pt-1">New</p>
                    {unread.map((n) => (
                      <NotifCard
                        key={n.id}
                        notif={n}
                        onMarkRead={markRead}
                        onDelete={deleteNotif}
                        onNavigate={onNavigate}
                        compact
                      />
                    ))}
                  </>
                )}
                {/* Read notifications */}
                {notifications.filter((n) => n.read).length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 pt-2">Earlier</p>
                    {notifications.filter((n) => n.read).slice(0, 10).map((n) => (
                      <NotifCard
                        key={n.id}
                        notif={n}
                        onMarkRead={markRead}
                        onDelete={deleteNotif}
                        onNavigate={onNavigate}
                        compact
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2.5">
              <button
                onClick={() => { setIsOpen(false); onNavigate?.('notifications'); }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium w-full text-center"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Full page Notification Center
// ─────────────────────────────────────────────────────────────────────────────

interface NotificationCenterProps {
  onNavigate?: (page: string, id?: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigate }) => {
  const { activeUser, activeOrg } = useAppContext();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [filterType, setFilterType] = useState<NotificationType | 'All'>('All');
  const [filterRead, setFilterRead] = useState<'all' | 'unread' | 'read'>('all');

  // Real-time listener (same as bell, but fetches more)
  useEffect(() => {
    if (!activeUser?.id || !activeOrg?.id) return;
    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', activeUser.id),
      where('org_id',  '==', activeOrg.id),
      orderBy('created_at', 'desc'),
      limit(200),
    );
    const unsub: Unsubscribe = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification)));
      setIsLoading(false);
    }, () => setIsLoading(false));
    return () => unsub();
  }, [activeUser?.id, activeOrg?.id]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) =>
      n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n,
    ));
    try {
      await updateDoc(doc(db, 'notifications', id), {
        read: true, read_at: new Date().toISOString(),
      });
    } catch (e) { console.error(e); }
  }, []);

  const deleteNotif = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await writeBatch(db).delete(doc(db, 'notifications', id));
    } catch (e) { console.error(e); }
  }, []);

  const markAllRead = useCallback(async () => {
    const ids = notifications.filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const batch = writeBatch(db);
    ids.forEach((id) => batch.update(doc(db, 'notifications', id), { read: true }));
    try { await batch.commit(); } catch (e) { console.error(e); }
  }, [notifications]);

  const filtered = notifications.filter((n) => {
    if (filterType !== 'All' && n.type !== filterType) return false;
    if (filterRead === 'unread' && n.read)  return false;
    if (filterRead === 'read'   && !n.read) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Group by date for display
  const grouped = filtered.reduce<Record<string, AppNotification[]>>((acc, n) => {
    const day = new Date(n.created_at).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    if (!acc[day]) acc[day] = [];
    acc[day].push(n);
    return acc;
  }, {});

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'} · {notifications.length} total
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-xl text-sm font-semibold hover:bg-blue-100"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {(['all', 'unread', 'read'] as const).map((f) => (
          <button key={f} onClick={() => setFilterRead(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              filterRead === f
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}>
            {f}
          </button>
        ))}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-600 dark:text-slate-400"
        >
          <option value="All">All types</option>
          {(Object.keys(TYPE_CONFIG) as NotificationType[]).map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <Bell className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 text-sm">
            {notifications.length === 0 ? 'No notifications yet.' : 'No notifications match your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day}>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                {day}
              </p>
              <div className="space-y-2">
                {items.map((n) => (
                  <NotifCard
                    key={n.id}
                    notif={n}
                    onMarkRead={markRead}
                    onDelete={deleteNotif}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;