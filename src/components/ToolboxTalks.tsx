import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext } from '../contexts';
import { Plus, Users, Clock, MapPin, CheckCircle, X, Search, Megaphone, Calendar, ChevronRight, UserCheck } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TbtTopicCategory =
  | 'working_at_height' | 'electrical' | 'fire' | 'manual_handling'
  | 'chemical' | 'ppe' | 'emergency' | 'housekeeping' | 'environment'
  | 'permit_to_work' | 'risk_assessment' | 'incident_review' | 'other';

export interface TbtAttendee {
  id:            string;
  name:          string;
  company:       string;
  trade:         string;
  signed:        boolean;
}

export interface ToolboxTalk {
  id:             string;
  title:          string;
  topic_category: TbtTopicCategory;
  content:        string;
  conducted_by:   string;
  conducted_at:   string;
  duration_mins:  number;
  location:       string;
  attendees:      TbtAttendee[];
  status:         'draft' | 'delivered' | 'archived';
  weather:        string;
  notes:          string;
}

// ─── Topic config ─────────────────────────────────────────────────────────────

const TOPICS: Record<TbtTopicCategory, { label: string; color: string }> = {
  working_at_height: { label: 'Working at Height',  color: 'red' },
  electrical:        { label: 'Electrical Safety',  color: 'yellow' },
  fire:              { label: 'Fire Safety',         color: 'red' },
  manual_handling:   { label: 'Manual Handling',    color: 'blue' },
  chemical:          { label: 'Chemical Safety',    color: 'purple' },
  ppe:               { label: 'PPE',                color: 'green' },
  emergency:         { label: 'Emergency Response', color: 'red' },
  housekeeping:      { label: 'Housekeeping',       color: 'gray' },
  environment:       { label: 'Environment',        color: 'green' },
  permit_to_work:    { label: 'Permit to Work',     color: 'blue' },
  risk_assessment:   { label: 'Risk Assessment',    color: 'yellow' },
  incident_review:   { label: 'Incident Review',    color: 'amber' },
  other:             { label: 'Other',              color: 'gray' },
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_TBTS: ToolboxTalk[] = [
  {
    id: 'tbt-001', title: 'Working at Height — Harness Inspection & Anchor Points',
    topic_category: 'working_at_height', conducted_by: 'Ahmed Al-Rashid',
    conducted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    duration_mins: 20, location: 'Tower A — Level 3 Staging Area', weather: 'Clear, 28°C',
    status: 'delivered', notes: 'Workers shown harness D-ring inspection points.',
    content: `## Working at Height Safety\n\n**Key Points Covered:**\n- Always inspect harness before use — check D-rings, stitching, buckles\n- Anchor points must be rated to 15kN minimum\n- 100% tie-off rule when working above 1.8m\n- Never use damaged equipment — tag out immediately\n\n**Incident Review:** Near-miss last week on Level 5 — anchor point not rated. Reminder that all anchor points must be engineering-approved.\n\n**Questions from team:** Discussed safe working load of man-baskets and MEWP pre-use checks.`,
    attendees: [
      { id: 'a1', name: 'Carlos Rivera',   company: 'SteelCo',    trade: 'Steel Fixer',   signed: true },
      { id: 'a2', name: 'James Okafor',    company: 'SteelCo',    trade: 'Rigger',        signed: true },
      { id: 'a3', name: 'Priya Sharma',    company: 'FormworkPro', trade: 'Carpenter',    signed: true },
      { id: 'a4', name: 'Mohamed Hassan',  company: 'SteelCo',    trade: 'Labourer',      signed: false },
      { id: 'a5', name: 'David Chen',      company: 'FormworkPro', trade: 'Steel Fixer',  signed: true },
    ],
  },
  {
    id: 'tbt-002', title: 'Hot Work — Fire Watch Responsibilities',
    topic_category: 'fire', conducted_by: 'Sarah Mitchell',
    conducted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    duration_mins: 15, location: 'Fabrication Yard', weather: 'Partly cloudy, 25°C',
    status: 'delivered', notes: '',
    content: `## Hot Work Fire Watch\n\n**Fire Watch Duties:**\n- Monitor work area during and 30 minutes after hot work stops\n- Keep fire extinguisher within 3m of hot work\n- Know how to raise alarm and muster points\n- Check combustibles within 10m radius\n\n**Permit Requirements:** Hot Work PTW must be issued before any grinding, welding, or cutting operations.`,
    attendees: [
      { id: 'b1', name: 'Tony Mensah',    company: 'WeldPro',    trade: 'Welder',     signed: true },
      { id: 'b2', name: 'Lisa Wong',      company: 'WeldPro',    trade: 'Welder',     signed: true },
      { id: 'b3', name: 'Omar Abdullah',  company: 'SteelCo',    trade: 'Grinder',    signed: true },
    ],
  },
  {
    id: 'tbt-003', title: 'PPE — Correct Selection and Inspection',
    topic_category: 'ppe', conducted_by: 'Ahmed Al-Rashid',
    conducted_at: new Date().toISOString(),
    duration_mins: 10, location: 'Site Entrance — Welfare Area', weather: 'Sunny, 32°C',
    status: 'draft', notes: 'Scheduled for morning briefing.',
    content: `## PPE Selection & Inspection\n\n**Mandatory PPE on this site:**\n- Hard hat (EN 397) — replace after any impact\n- Safety footwear (S3 rated) — inspect daily\n- High-vis vest — class 2 minimum\n- Safety glasses — required in all work areas\n\n**Task-specific PPE:**\n- Chemical work: face shield + chemical gloves + apron\n- Grinding: face shield over safety glasses\n- Confined space: air monitoring + rescue equipment`,
    attendees: [],
  },
];

// ─── Attendee Row ─────────────────────────────────────────────────────────────

const AttendeeRow: React.FC<{
  attendee: TbtAttendee;
  onToggleSign: (id: string) => void;
  editable: boolean;
}> = ({ attendee, onToggleSign, editable }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-background rounded-lg">
    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-sm">
      {attendee.name.charAt(0)}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{attendee.name}</p>
      <p className="text-xs text-gray-500">{attendee.trade} — {attendee.company}</p>
    </div>
    {editable ? (
      <button onClick={() => onToggleSign(attendee.id)}
        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all ${attendee.signed ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-green-100 hover:text-green-700'}`}>
        <CheckCircle className="w-3 h-3" />
        {attendee.signed ? 'Signed' : 'Sign'}
      </button>
    ) : (
      <Badge color={attendee.signed ? 'green' : 'gray'}>
        {attendee.signed ? 'Signed' : 'Absent'}
      </Badge>
    )}
  </div>
);

// ─── Detail Modal ─────────────────────────────────────────────────────────────

const TbtDetailModal: React.FC<{
  tbt: ToolboxTalk;
  onClose: () => void;
  onUpdate: (tbt: ToolboxTalk) => void;
}> = ({ tbt, onClose, onUpdate }) => {
  const [local, setLocal]   = useState<ToolboxTalk>(JSON.parse(JSON.stringify(tbt)));
  const [newName, setNewName]     = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newTrade, setNewTrade]   = useState('');
  const editable = local.status === 'draft';

  const toggleSign = (id: string) =>
    setLocal(prev => ({ ...prev, attendees: prev.attendees.map(a => a.id === id ? { ...a, signed: !a.signed } : a) }));

  const addAttendee = () => {
    if (!newName) return;
    setLocal(prev => ({
      ...prev,
      attendees: [...prev.attendees, { id: `a-${Date.now()}`, name: newName, company: newCompany, trade: newTrade, signed: false }]
    }));
    setNewName(''); setNewCompany(''); setNewTrade('');
  };

  const deliver = () => setLocal(prev => ({ ...prev, status: 'delivered' }));
  const signedCount = local.attendees.filter(a => a.signed).length;
  const topic = TOPICS[local.topic_category];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-6 border-b dark:border-dark-border flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge color={topic.color as any}>{topic.label}</Badge>
              <Badge color={local.status === 'delivered' ? 'green' : local.status === 'draft' ? 'yellow' : 'gray'}>
                {local.status.charAt(0).toUpperCase() + local.status.slice(1)}
              </Badge>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{local.title}</h2>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" />{local.conducted_by}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{local.duration_mins} mins</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{local.location}</span>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Content */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase">Talk Content</h3>
              <div className="prose prose-sm dark:prose-invert max-w-none bg-gray-50 dark:bg-dark-background p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap">
                {local.content}
              </div>
            </div>

            {/* Attendance */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase">
                  Attendance ({signedCount}/{local.attendees.length} signed)
                </h3>
              </div>
              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                {local.attendees.map(a => (
                  <AttendeeRow key={a.id} attendee={a} onToggleSign={toggleSign} editable={editable} />
                ))}
                {local.attendees.length === 0 && (
                  <p className="text-sm text-gray-400 italic text-center py-4">No attendees added yet</p>
                )}
              </div>

              {editable && (
                <div className="border-t dark:border-dark-border pt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Add Attendee</p>
                  <div className="space-y-2">
                    <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name *" className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={newCompany} onChange={e => setNewCompany(e.target.value)} placeholder="Company" className="p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
                      <input value={newTrade} onChange={e => setNewTrade(e.target.value)} placeholder="Trade" className="p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
                    </div>
                    <Button variant="outline" size="sm" onClick={addAttendee} className="w-full">
                      <Plus className="w-3 h-3 mr-1" />Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="p-4 border-t dark:border-dark-border flex justify-between items-center">
          <p className="text-xs text-gray-400">
            {new Date(local.conducted_at).toLocaleString()} · {local.weather}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            {editable && (
              <>
                <Button variant="outline" onClick={() => { onUpdate(local); onClose(); }}>Save Draft</Button>
                <Button onClick={() => { deliver(); onUpdate({ ...local, status: 'delivered' }); onClose(); }}>
                  <CheckCircle className="w-4 h-4 mr-2" />Mark Delivered
                </Button>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

// ─── New TBT Modal ────────────────────────────────────────────────────────────

const NewTbtModal: React.FC<{ onClose: () => void; onSave: (tbt: ToolboxTalk) => void }> = ({ onClose, onSave }) => {
  const { activeUser } = useAppContext();
  const [form, setForm] = useState({
    title: '', topic_category: 'other' as TbtTopicCategory,
    content: '', duration_mins: 15, location: '', weather: '', notes: '',
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.title || !form.content) { alert('Title and content required.'); return; }
    onSave({
      id: `tbt-${Date.now()}`, ...form,
      conducted_by: activeUser?.name || 'HSE Officer',
      conducted_at: new Date().toISOString(),
      attendees: [], status: 'draft',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <header className="p-6 border-b dark:border-dark-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Toolbox Talk</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </header>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white text-sm" placeholder="e.g. Hot Work Safety — Fire Watch Duties" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Topic Category</label>
              <select value={form.topic_category} onChange={e => set('topic_category', e.target.value)} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white text-sm">
                {(Object.entries(TOPICS)).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Duration (mins)</label>
              <input type="number" value={form.duration_mins} onChange={e => set('duration_mins', +e.target.value)} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white text-sm" min={5} max={60} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white text-sm" placeholder="e.g. Site entrance" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Weather Conditions</label>
              <input value={form.weather} onChange={e => set('weather', e.target.value)} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white text-sm" placeholder="e.g. Clear, 28°C" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Talk Content * (Markdown supported)</label>
            <textarea value={form.content} onChange={e => set('content', e.target.value)} rows={6} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white text-sm font-mono" placeholder="## Key Points&#10;- Point 1&#10;- Point 2" />
          </div>
        </div>
        <footer className="p-4 border-t dark:border-dark-border flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Talk</Button>
        </footer>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const ToolboxTalks: React.FC = () => {
  const { can } = useAppContext();
  const [tbts, setTbts]         = useState<ToolboxTalk[]>(MOCK_TBTS);
  const [selected, setSelected] = useState<ToolboxTalk | null>(null);
  const [showNew, setShowNew]   = useState(false);
  const [search, setSearch]     = useState('');
  const [topicFilter, setTopicFilter] = useState<TbtTopicCategory | 'all'>('all');

  const filtered = useMemo(() => tbts.filter(t => {
    const sMatch = !search || (t.title || '').toLowerCase().includes(search.toLowerCase()) || (t.conducted_by || '').toLowerCase().includes(search.toLowerCase());
    const tMatch = topicFilter === 'all' || t.topic_category === topicFilter;
    return sMatch && tMatch;
  }), [tbts, search, topicFilter]);

  const stats = useMemo(() => ({
    total:      tbts.length,
    delivered:  tbts.filter(t => t.status === 'delivered').length,
    attendees:  tbts.reduce((s, t) => s + t.attendees.length, 0),
    thisWeek:   tbts.filter(t => new Date(t.conducted_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
  }), [tbts]);

  const handleUpdate = (updated: ToolboxTalk) =>
    setTbts(prev => prev.map(t => t.id === updated.id ? updated : t));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">Toolbox Talks</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Daily safety briefings with digital attendance</p>
        </div>
        {can('create', 'reports') && (
          <Button onClick={() => setShowNew(true)} leftIcon={<Plus className="w-4 h-4" />}>New Talk</Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Talks',    value: stats.total,     icon: Megaphone,   color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'This Week',      value: stats.thisWeek,  icon: Calendar,    color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Delivered',      value: stats.delivered, icon: CheckCircle, color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Total Attendees',value: stats.attendees, icon: Users,       color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-4 flex items-center gap-4`}>
            <stat.icon className={`w-8 h-8 ${stat.color}`} />
            <div>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search talks..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setTopicFilter('all')} className={`px-3 py-1 rounded-full text-xs font-semibold ${topicFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}>All Topics</button>
            {(Object.entries(TOPICS) as [TbtTopicCategory, { label: string; color: string }][]).map(([k, v]) => (
              <button key={k} onClick={() => setTopicFilter(k)}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${topicFilter === k ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {filtered.map(tbt => {
          const topic = TOPICS[tbt.topic_category];
          const signedCount = tbt.attendees.filter(a => a.signed).length;
          return (
            <div key={tbt.id} onClick={() => setSelected(tbt)}
              className="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border p-4 cursor-pointer hover:shadow-md transition-all flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                <Megaphone className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge color={topic.color as any}>{topic.label}</Badge>
                  <Badge color={tbt.status === 'delivered' ? 'green' : 'yellow'}>
                    {tbt.status.charAt(0).toUpperCase() + tbt.status.slice(1)}
                  </Badge>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white truncate">{tbt.title}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" />{tbt.conducted_by}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tbt.duration_mins}m</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{signedCount}/{tbt.attendees.length} signed</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(tbt.conducted_at).toLocaleDateString()}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No toolbox talks found</p>
          </div>
        )}
      </div>

      {selected && <TbtDetailModal tbt={selected} onClose={() => setSelected(null)} onUpdate={handleUpdate} />}
      {showNew && <NewTbtModal onClose={() => setShowNew(false)} onSave={t => setTbts(prev => [t, ...prev])} />}
    </div>
  );
};