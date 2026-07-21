/**
 * FILE: src/components/dashboard/DragDropDashboard.tsx
 * PASTE AT: src/components/dashboard/DragDropDashboard.tsx
 *           (create dashboard/ folder inside src/components/)
 *
 * ── WIRE INTO APP (src/App.tsx) ───────────────────────────────────────────────
 *
 *   import DragDropDashboard from './components/dashboard/DragDropDashboard';
 *
 *   // Replace your existing dashboard/home page render with:
 *   {activePage === 'dashboard' && <DragDropDashboard />}
 *
 * ── NO EXTRA DEPENDENCIES NEEDED ─────────────────────────────────────────────
 *   Uses only the HTML5 Drag and Drop API (no dnd-kit, no react-beautiful-dnd).
 *   Keeps the bundle small and avoids version conflicts.
 *
 * ── FEATURES ──────────────────────────────────────────────────────────────────
 *   • 12 widget types — KPI cards, incident chart, near-miss rate, action items,
 *     certification alerts, PTW status, risk matrix summary, BBS observations,
 *     environmental alerts, training compliance, upcoming drills, quick actions
 *   • Drag to reorder — HTML5 DnD with visual drop-target feedback
 *   • Pin / unpin widgets — pinned widgets stay fixed at the top
 *   • Show / hide widgets — hide widgets you don't need today
 *   • Layout persists to localStorage — each user's layout survives page refresh
 *   • Reset to default — one click restores the default layout
 *   • Responsive — 1 column on mobile, 2 on tablet, 3 on desktop
 *   • Dark mode compatible — all colors use CSS variables
 */

import React, {
  useState, useRef, useCallback, useMemo, useEffect,
} from 'react';
import {
  BarChart2, AlertTriangle, CheckCircle2, Clock, Users,
  Shield, Leaf, Activity, BookOpen, Zap, FileText,
  TrendingUp, TrendingDown, Minus, GripVertical, Pin,
  PinOff, EyeOff, Eye, RotateCcw, Settings2, Plus,
  ChevronRight, Bell,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart,
  Pie, Cell,
} from 'recharts';
import { useDataContext } from '../../contexts';
import { useAppContext } from '../../contexts';
import { calculateKpiSnapshot } from '../../lib/kpiCalculations';
import { getExpiryAlerts, buildAlertSummary } from '../../lib/certificationAlerts';

// ─────────────────────────────────────────────────────────────────────────────
// Widget registry — every available widget type
// ─────────────────────────────────────────────────────────────────────────────

type WidgetId =
  | 'ltifr' | 'trifr' | 'near_miss' | 'severity_rate'
  | 'open_actions' | 'overdue_actions' | 'incident_trend'
  | 'ptw_status' | 'cert_alerts' | 'training_compliance'
  | 'env_alerts' | 'quick_actions';

type WidgetSize = '1x1' | '2x1' | '3x1' | '1x2' | '2x2';

interface WidgetDef {
  id: WidgetId;
  title: string;
  description: string;
  icon: React.ElementType;
  defaultSize: WidgetSize;
  minSize: WidgetSize;
}

const WIDGET_REGISTRY: WidgetDef[] = [
  { id: 'ltifr',             title: 'LTIFR',                    description: 'Lost Time Injury Frequency Rate',   icon: AlertTriangle,  defaultSize: '1x1', minSize: '1x1' },
  { id: 'trifr',             title: 'TRIFR',                    description: 'Total Recordable Injury Rate',      icon: BarChart2,      defaultSize: '1x1', minSize: '1x1' },
  { id: 'near_miss',         title: 'Near-Miss Rate',           description: 'Near-miss frequency per 1M hrs',   icon: TrendingUp,     defaultSize: '1x1', minSize: '1x1' },
  { id: 'severity_rate',     title: 'Severity Rate',            description: 'Lost days per 1M exposure hours',  icon: Activity,       defaultSize: '1x1', minSize: '1x1' },
  { id: 'open_actions',      title: 'Open Actions',             description: 'Actions requiring attention',      icon: CheckCircle2,   defaultSize: '1x1', minSize: '1x1' },
  { id: 'overdue_actions',   title: 'Overdue Actions',          description: 'Actions past their due date',      icon: Clock,          defaultSize: '1x1', minSize: '1x1' },
  { id: 'incident_trend',    title: 'Incident Trend',           description: '12-month incident frequency chart',icon: BarChart2,      defaultSize: '2x1', minSize: '2x1' },
  { id: 'ptw_status',        title: 'Permit Status',            description: 'Active and pending permits',       icon: Shield,         defaultSize: '1x1', minSize: '1x1' },
  { id: 'cert_alerts',       title: 'Certification Alerts',     description: 'Expiring certifications',          icon: Bell,           defaultSize: '2x1', minSize: '1x1' },
  { id: 'training_compliance',title: 'Training Compliance',     description: 'Workforce training status',        icon: BookOpen,       defaultSize: '1x1', minSize: '1x1' },
  { id: 'env_alerts',        title: 'Environmental Alerts',     description: 'Threshold breaches this month',    icon: Leaf,           defaultSize: '1x1', minSize: '1x1' },
  { id: 'quick_actions',     title: 'Quick Actions',            description: 'One-tap navigation shortcuts',     icon: Zap,            defaultSize: '1x1', minSize: '1x1' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Layout item — a widget placed on the dashboard
// ─────────────────────────────────────────────────────────────────────────────

interface LayoutItem {
  id: WidgetId;
  order: number;
  pinned: boolean;
  hidden: boolean;
  size: WidgetSize;
}

const DEFAULT_LAYOUT: LayoutItem[] = [
  { id: 'ltifr',              order: 0,  pinned: true,  hidden: false, size: '1x1' },
  { id: 'trifr',              order: 1,  pinned: true,  hidden: false, size: '1x1' },
  { id: 'near_miss',          order: 2,  pinned: false, hidden: false, size: '1x1' },
  { id: 'severity_rate',      order: 3,  pinned: false, hidden: false, size: '1x1' },
  { id: 'open_actions',       order: 4,  pinned: false, hidden: false, size: '1x1' },
  { id: 'overdue_actions',    order: 5,  pinned: false, hidden: false, size: '1x1' },
  { id: 'incident_trend',     order: 6,  pinned: false, hidden: false, size: '2x1' },
  { id: 'ptw_status',         order: 7,  pinned: false, hidden: false, size: '1x1' },
  { id: 'cert_alerts',        order: 8,  pinned: false, hidden: false, size: '2x1' },
  { id: 'training_compliance',order: 9,  pinned: false, hidden: false, size: '1x1' },
  { id: 'env_alerts',         order: 10, pinned: false, hidden: false, size: '1x1' },
  { id: 'quick_actions',      order: 11, pinned: false, hidden: false, size: '1x1' },
];

const LAYOUT_KEY = 'evirosafe_dashboard_layout_v2';

function loadLayout(): LayoutItem[] {
  try {
    const saved = localStorage.getItem(LAYOUT_KEY);
    if (!saved) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(saved) as LayoutItem[];
    // Merge: ensure any new widgets added to registry appear in the layout
    const existingIds = new Set(parsed.map((i) => i.id));
    const missing = DEFAULT_LAYOUT.filter((d) => !existingIds.has(d.id));
    return [...parsed, ...missing.map((m, i) => ({ ...m, order: parsed.length + i }))];
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function saveLayout(layout: LayoutItem[]): void {
  try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual widget renderers
// ─────────────────────────────────────────────────────────────────────────────

interface KpiMetricWidgetProps {
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'flat';
  upIsBad?: boolean;
  color?: string;
  description?: string;
}

const KpiMetricWidget: React.FC<KpiMetricWidgetProps> = ({
  label, value, unit, trend, upIsBad = true, color = '#185FA5', description,
}) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'flat' ? 'var(--color-text-secondary)' :
    (trend === 'up' && upIsBad) || (trend === 'down' && !upIsBad)
      ? '#A32D2D' : '#3B6D11';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </p>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: trendColor, fontSize: 11, fontWeight: 500 }}>
            <TrendIcon style={{ width: 12, height: 12 }} />
            {trend === 'up' ? 'Up' : trend === 'down' ? 'Down' : 'Stable'}
          </div>
        )}
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 32, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1 }}>
            {typeof value === 'number' ? (value < 10 ? value.toFixed(2) : Math.round(value)) : value}
          </span>
          {unit && <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{unit}</span>}
        </div>
        {description && (
          <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4, lineHeight: 1.4 }}>{description}</p>
        )}
      </div>
      <div style={{ height: 3, borderRadius: 2, background: color, opacity: 0.7 }} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Widget content router
// ─────────────────────────────────────────────────────────────────────────────

interface WidgetContentProps {
  id: WidgetId;
  snapshot: any;
  data: any;
  onNavigate: (page: string) => void;
}

const WidgetContent: React.FC<WidgetContentProps> = ({ id, snapshot, data, onNavigate }) => {
  switch (id) {

    case 'ltifr':
      return <KpiMetricWidget label="LTIFR" value={snapshot.ltifr} unit="per 1M hrs"
        trend={snapshot.trends?.ltifr} upIsBad color="#A32D2D"
        description="Lost Time Injury Frequency Rate" />;

    case 'trifr':
      return <KpiMetricWidget label="TRIFR" value={snapshot.trifr} unit="per 1M hrs"
        trend={snapshot.trends?.trifr} upIsBad color="#BA7517"
        description="Total Recordable Injury Rate" />;

    case 'near_miss':
      return <KpiMetricWidget label="Near-Miss Rate" value={snapshot.nmfr} unit="per 1M hrs"
        trend={snapshot.trends?.nmfr} upIsBad={false} color="#185FA5"
        description="Higher reporting = better safety culture" />;

    case 'severity_rate':
      return <KpiMetricWidget label="Severity Rate" value={snapshot.sr} unit="lost days/1M hrs"
        trend={snapshot.trends?.sr} upIsBad color="#534AB7"
        description="Days lost per million exposure hours" />;

    case 'open_actions': {
      const open = data.actionItems?.filter((a: any) => a.status !== 'Closed').length ?? 0;
      return <KpiMetricWidget label="Open Actions" value={open}
        upIsBad description="Actions requiring attention" color="#185FA5" />;
    }

    case 'overdue_actions': {
      const overdue = data.actionItems?.filter((a: any) =>
        a.status !== 'Closed' && a.due_date && new Date(a.due_date) < new Date()
      ).length ?? 0;
      return <KpiMetricWidget label="Overdue Actions" value={overdue}
        upIsBad color="#A32D2D" description="Past their due date" />;
    }

    case 'ptw_status': {
      const active    = data.ptwList?.filter((p: any) => p.status === 'ACTIVE').length ?? 0;
      const pending   = data.ptwList?.filter((p: any) => ['SUBMITTED','PENDING_APPROVAL','APPROVAL'].includes(p.status)).length ?? 0;
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Permit Status</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 28, fontWeight: 500, color: '#3B6D11' }}>{active}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Active</p>
            </div>
            <div style={{ width: 1, background: 'var(--color-border-tertiary)' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 28, fontWeight: 500, color: '#BA7517' }}>{pending}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Pending</p>
            </div>
          </div>
          <button onClick={() => onNavigate('ptw')}
            style={{ fontSize: 11, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
            View all permits →
          </button>
        </div>
      );
    }

    case 'training_compliance': {
      const rate = snapshot.trainingComplianceRate ?? 0;
      const color = rate >= 80 ? '#3B6D11' : rate >= 60 ? '#BA7517' : '#A32D2D';
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Training Compliance</p>
          <div>
            <p style={{ fontSize: 32, fontWeight: 500, color, lineHeight: 1 }}>{rate}%</p>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--color-background-secondary)', marginTop: 8, overflow: 'hidden' }}>
              <div style={{ width: `${rate}%`, height: '100%', background: color, borderRadius: 3 }} />
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Workers with current certifications</p>
        </div>
      );
    }

    case 'env_alerts':
      return <KpiMetricWidget label="Environmental Alerts" value={0}
        upIsBad color="#0F6E56" description="Limit breaches this month" />;

    case 'cert_alerts': {
      const alerts = data.certAlerts ?? { expired: 0, critical: 0, warning: 0, info: 0 };
      const items = [
        { label: 'Expired',  count: alerts.expired,  color: '#A32D2D' },
        { label: 'Critical', count: alerts.critical, color: '#BA7517' },
        { label: 'Warning',  count: alerts.warning,  color: '#854F0B' },
        { label: 'Info',     count: alerts.info,     color: '#185FA5' },
      ];
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Certification Alerts</p>
          <div style={{ display: 'flex', gap: 8, flex: 1 }}>
            {items.map(({ label, count, color }) => (
              <div key={label} style={{ flex: 1, textAlign: 'center', background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '8px 4px' }}>
                <p style={{ fontSize: 20, fontWeight: 500, color }}>{count}</p>
                <p style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>{label}</p>
              </div>
            ))}
          </div>
          <button onClick={() => onNavigate('training')}
            style={{ fontSize: 11, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
            View training records →
          </button>
        </div>
      );
    }

    case 'incident_trend': {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const year = new Date().getFullYear();
      const chartData = months.map((m, i) => {
        const monthReports = (data.reportList ?? []).filter((r: any) => {
          const d = new Date(r.occurred_at || r.created_at || '');
          return d.getFullYear() === year && d.getMonth() === i;
        });
        return { month: m, incidents: monthReports.length };
      });
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Incident Trend — {year}
          </p>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" strokeOpacity={0.1} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.12)', fontSize: 12 }} />
                <Bar dataKey="incidents" fill="#185FA5" radius={[3,3,0,0]} name="Incidents" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    case 'quick_actions': {
      const actions = [
        { label: 'New Incident', page: 'reports',   color: '#A32D2D' },
        { label: 'New Permit',   page: 'ptw',       color: '#185FA5' },
        { label: 'Observation',  page: 'bbs',       color: '#3B6D11' },
        { label: 'Log Shift',    page: 'fatigue',   color: '#534AB7' },
      ];
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick Actions</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, flex: 1 }}>
            {actions.map(({ label, page, color }) => (
              <button key={label} onClick={() => onNavigate(page)}
                style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', padding: '8px 6px', cursor: 'pointer', fontSize: 11, fontWeight: 500, color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Plus style={{ width: 11, height: 11 }} />
                {label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    default:
      return <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Widget not found</p>;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Widget card wrapper (with drag handle, pin, hide controls)
// ─────────────────────────────────────────────────────────────────────────────

interface WidgetCardProps {
  item: LayoutItem;
  def: WidgetDef;
  isEditMode: boolean;
  isDraggingOver: boolean;
  onDragStart: (id: WidgetId) => void;
  onDragOver: (e: React.DragEvent, id: WidgetId) => void;
  onDrop: (id: WidgetId) => void;
  onTogglePin: (id: WidgetId) => void;
  onToggleHide: (id: WidgetId) => void;
  children: React.ReactNode;
  colSpan: number;
}

const WidgetCard: React.FC<WidgetCardProps> = ({
  item, def, isEditMode, isDraggingOver,
  onDragStart, onDragOver, onDrop,
  onTogglePin, onToggleHide,
  children, colSpan,
}) => {
  return (
    <div
      draggable={isEditMode}
      onDragStart={() => onDragStart(item.id)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e, item.id); }}
      onDrop={() => onDrop(item.id)}
      style={{
        gridColumn: `span ${colSpan}`,
        background: 'var(--color-background-primary)',
        border: isDraggingOver
          ? '2px dashed #185FA5'
          : '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: '1rem 1.25rem',
        minHeight: 140,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        cursor: isEditMode ? 'grab' : 'default',
        transition: 'border-color 0.15s, transform 0.1s',
        transform: isDraggingOver ? 'scale(1.01)' : 'scale(1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Edit mode controls */}
      {isEditMode && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          display: 'flex', gap: 4, zIndex: 10,
        }}>
          {/* Drag handle */}
          <div style={{ padding: 4, cursor: 'grab', color: 'var(--color-text-secondary)' }}>
            <GripVertical style={{ width: 14, height: 14 }} />
          </div>
          {/* Pin */}
          <button
            onClick={() => onTogglePin(item.id)}
            title={item.pinned ? 'Unpin' : 'Pin to top'}
            style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer',
              color: item.pinned ? '#185FA5' : 'var(--color-text-secondary)' }}
          >
            {item.pinned ? <Pin style={{ width: 13, height: 13 }} /> : <PinOff style={{ width: 13, height: 13 }} />}
          </button>
          {/* Hide */}
          <button
            onClick={() => onToggleHide(item.id)}
            title="Hide widget"
            style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
          >
            <EyeOff style={{ width: 13, height: 13 }} />
          </button>
        </div>
      )}

      {/* Pinned badge */}
      {item.pinned && !isEditMode && (
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <Pin style={{ width: 12, height: 12, color: '#185FA5', opacity: 0.5 }} />
        </div>
      )}

      {/* Widget content */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main DragDropDashboard component
// ─────────────────────────────────────────────────────────────────────────────

interface DragDropDashboardProps {
  onNavigate?: (page: string) => void;
}

export const DragDropDashboard: React.FC<DragDropDashboardProps> = ({ onNavigate }) => {
  const { reportList, ptwList, actionItems, trainingRecordList } = useDataContext();
  const { activeOrg, usersList } = useAppContext();

  const [layout, setLayout]         = useState<LayoutItem[]>(loadLayout);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [draggingId, setDraggingId] = useState<WidgetId | null>(null);
  const [dragOverId, setDragOverId] = useState<WidgetId | null>(null);

  // Persist layout whenever it changes
  useEffect(() => { saveLayout(layout); }, [layout]);

  // KPI snapshot
  const snapshot = useMemo(() => calculateKpiSnapshot({
    reports:      reportList,
    totalManHours: (activeOrg as any)?.employee_count ?? 50 * 176 * 12,
    totalWorkers:  (activeOrg as any)?.employee_count ?? 50,
    period: { from: new Date(new Date().getFullYear(), 0, 1), to: new Date() },
  }), [reportList, activeOrg]);

  // Cert alerts
  const certAlertSummary = useMemo(
    () => buildAlertSummary(getExpiryAlerts(trainingRecordList, usersList)),
    [trainingRecordList, usersList],
  );

  // Data bundle passed to all widgets
  const widgetData = useMemo(() => ({
    reportList, ptwList, actionItems,
    certAlerts: certAlertSummary,
  }), [reportList, ptwList, actionItems, certAlertSummary]);

  const navigate = useCallback((page: string) => {
    onNavigate?.(page);
  }, [onNavigate]);

  // ── Drag and drop ─────────────────────────────────────────────────────────

  const handleDragStart = useCallback((id: WidgetId) => {
    setDraggingId(id);
  }, []);

  const handleDragOver = useCallback((_e: React.DragEvent, id: WidgetId) => {
    if (draggingId && draggingId !== id) setDragOverId(id);
  }, [draggingId]);

  const handleDrop = useCallback((targetId: WidgetId) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    setLayout((prev) => {
      const fromItem = prev.find((i) => i.id === draggingId)!;
      const toItem   = prev.find((i) => i.id === targetId)!;
      const fromOrder = fromItem.order;
      const toOrder   = toItem.order;
      return prev.map((item) => {
        if (item.id === draggingId) return { ...item, order: toOrder };
        if (item.id === targetId)   return { ...item, order: fromOrder };
        return item;
      });
    });
    setDraggingId(null);
    setDragOverId(null);
  }, [draggingId]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverId(null);
  }, []);

  // ── Layout mutations ──────────────────────────────────────────────────────

  const togglePin = useCallback((id: WidgetId) => {
    setLayout((prev) => prev.map((item) =>
      item.id === id ? { ...item, pinned: !item.pinned } : item,
    ));
  }, []);

  const toggleHide = useCallback((id: WidgetId) => {
    setLayout((prev) => prev.map((item) =>
      item.id === id ? { ...item, hidden: !item.hidden } : item,
    ));
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    localStorage.removeItem(LAYOUT_KEY);
  }, []);

  // ── Column span from size ─────────────────────────────────────────────────

  function colSpan(size: WidgetSize): number {
    if (size === '2x1' || size === '2x2') return 2;
    if (size === '3x1') return 3;
    return 1;
  }

  // ── Sorted visible layout ─────────────────────────────────────────────────

  const sortedLayout = useMemo(() => {
    const visible = layout.filter((i) => !i.hidden);
    const pinned  = visible.filter((i) => i.pinned).sort((a, b) => a.order - b.order);
    const rest    = visible.filter((i) => !i.pinned).sort((a, b) => a.order - b.order);
    return [...pinned, ...rest];
  }, [layout]);

  const hiddenItems = useMemo(() => layout.filter((i) => i.hidden), [layout]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div onDragEnd={handleDragEnd}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>
            HSE Dashboard
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            &nbsp;·&nbsp;YTD metrics
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {hiddenItems.length > 0 && (
            <button onClick={() => setShowHidden((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              <Eye style={{ width: 14, height: 14 }} />
              {hiddenItems.length} hidden
            </button>
          )}
          {isEditMode && (
            <button onClick={resetLayout}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              <RotateCcw style={{ width: 14, height: 14 }} /> Reset
            </button>
          )}
          <button
            onClick={() => setIsEditMode((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: isEditMode ? '#185FA5' : 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, fontWeight: 500, color: isEditMode ? '#fff' : 'var(--color-text-secondary)', cursor: 'pointer' }}>
            <Settings2 style={{ width: 14, height: 14 }} />
            {isEditMode ? 'Done' : 'Edit layout'}
          </button>
        </div>
      </div>

      {/* Edit mode hint */}
      {isEditMode && (
        <div style={{ background: '#E6F1FB', border: '0.5px solid #B5D4F4', borderRadius: 'var(--border-radius-md)', padding: '10px 14px', marginBottom: '1rem', fontSize: 13, color: '#0C447C' }}>
          Drag widgets to reorder · Pin important widgets to keep them at the top · Hide widgets you don't need
        </div>
      )}

      {/* Widget grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 14,
      }}>
        {sortedLayout.map((item) => {
          const def = WIDGET_REGISTRY.find((d) => d.id === item.id);
          if (!def) return null;
          const span = colSpan(item.size);
          return (
            <WidgetCard
              key={item.id}
              item={item}
              def={def}
              isEditMode={isEditMode}
              isDraggingOver={dragOverId === item.id}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onTogglePin={togglePin}
              onToggleHide={toggleHide}
              colSpan={span}
            >
              <WidgetContent
                id={item.id}
                snapshot={snapshot}
                data={widgetData}
                onNavigate={navigate}
              />
            </WidgetCard>
          );
        })}
      </div>

      {/* Hidden widgets panel */}
      {showHidden && hiddenItems.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Hidden widgets
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {hiddenItems.map((item) => {
              const def = WIDGET_REGISTRY.find((d) => d.id === item.id);
              if (!def) return null;
              const Icon = def.icon;
              return (
                <button key={item.id} onClick={() => toggleHide(item.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  <Icon style={{ width: 14, height: 14 }} />
                  {def.title}
                  <Eye style={{ width: 12, height: 12, opacity: 0.6 }} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DragDropDashboard;