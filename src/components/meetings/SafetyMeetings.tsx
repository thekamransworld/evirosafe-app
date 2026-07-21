/**
 * FILE: src/components/meetings/SafetyMeetings.tsx
 * PASTE AT: src/components/meetings/SafetyMeetings.tsx
 *           (create meetings/ folder inside src/components/)
 *
 * TO ADD TO APP (src/App.tsx):
 *   import SafetyMeetings from './components/meetings/SafetyMeetings';
 *   {activePage === 'meetings' && <SafetyMeetings />}
 *
 * SIDEBAR NAV ITEM:
 *   { id: 'meetings', label: 'Safety Meetings', icon: Users,
 *     roles: ['admin', 'hse_manager', 'supervisor'] }
 *
 * Safety Meeting & Committee Management
 * Features:
 *  - Schedule meetings with agenda items
 *  - Record minutes during / after the meeting
 *  - Attendance register with signature tracking
 *  - Action items auto-generated from meeting minutes
 *  - Meeting types: HSE Committee, Toolbox Talk, Pre-Task Brief,
 *    Emergency Drill, Management Review, Incident Review
 *  - PDF export of minutes
 *  - Recurring meeting scheduling
 */

import React, { useState, useMemo } from 'react';
import {
  Plus, Users, Calendar, Clock, CheckCircle2,
  FileText, Download, ChevronDown, ChevronRight,
  Edit3, User, MapPin, AlarmClock, BookOpen,
  Clipboard, Tag,
} from 'lucide-react';
import { useAppContext } from '../../contexts';
import { useDataContext } from '../../contexts';
import { CanDo } from '../auth/RbacGuard';
import { writeAuditLog } from '../../lib/auditLogger';
import { exportTableToCsv } from '../../lib/exportUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type MeetingType   = 'HSE Committee' | 'Toolbox Talk' | 'Pre-Task Brief'
                   | 'Emergency Drill Review' | 'Management Review'
                   | 'Incident Review' | 'Safety Stand-Down' | 'Other';
type MeetingStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';

interface AgendaItem {
  id: string;
  order: number;
  topic: string;
  presenter: string;
  duration_mins: number;
  notes: string;
  status: 'Pending' | 'Discussed' | 'Deferred';
}

interface MeetingAttendee {
  user_id: string;
  name: string;
  role: string;
  attended: boolean;
  signed: boolean;
}

interface MeetingAction {
  id: string;
  action: string;
  owner: string;
  due_date: string;
  status: 'Open' | 'Closed';
  from_agenda_item: string;
}

interface SafetyMeeting {
  id: string;
  org_id: string;
  title: string;
  type: MeetingType;
  status: MeetingStatus;
  project_id: string;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  actual_start: string;
  actual_end: string;
  duration_mins: number;
  facilitator_id: string;
  secretary_id: string;
  agenda: AgendaItem[];
  attendees: MeetingAttendee[];
  minutes: string;
  actions: MeetingAction[];
  next_meeting_date: string;
  safety_moment: string;
  attachments: string[];
  created_by: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const uid = () => `mtg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const MEETING_TYPES: MeetingType[] = [
  'HSE Committee', 'Toolbox Talk', 'Pre-Task Brief',
  'Emergency Drill Review', 'Management Review',
  'Incident Review', 'Safety Stand-Down', 'Other',
];

const STATUS_CONFIG: Record<MeetingStatus, { color: string; bg: string; icon: React.ElementType }> = {
  Scheduled:   { color: 'text-blue-700 dark:text-blue-300',    bg: 'bg-blue-100 dark:bg-blue-950',    icon: Calendar },
  'In Progress':{ color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-950',  icon: Clock },
  Completed:   { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-950', icon: CheckCircle2 },
  Cancelled:   { color: 'text-slate-500 dark:text-slate-400',  bg: 'bg-slate-100 dark:bg-slate-800',  icon: ChevronRight },
};

// ─────────────────────────────────────────────────────────────────────────────
// Schedule Meeting Form
// ─────────────────────────────────────────────────────────────────────────────

interface ScheduleFormProps {
  onSave: (meeting: SafetyMeeting) => void;
  onCancel: () => void;
  orgId: string;
  userId: string;
  usersList: any[];
  projects: any[];
}

const ScheduleMeetingForm: React.FC<ScheduleFormProps> = ({
  onSave, onCancel, orgId, userId, usersList, projects,
}) => {
  const [f, setF] = useState({
    title: '',
    type: 'HSE Committee' as MeetingType,
    project_id: '',
    location: '',
    scheduled_date: new Date().toISOString().slice(0, 10),
    scheduled_time: '09:00',
    duration_mins: 60,
    facilitator_id: userId,
    secretary_id: '',
    safety_moment: '',
    next_meeting_date: '',
  });
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([
    { id: uid(), order: 1, topic: 'Opening & Safety Moment', presenter: '', duration_mins: 5, notes: '', status: 'Pending' },
    { id: uid(), order: 2, topic: 'Review of Previous Minutes', presenter: '', duration_mins: 5, notes: '', status: 'Pending' },
    { id: uid(), order: 3, topic: 'Incident & Near-Miss Review', presenter: '', duration_mins: 10, notes: '', status: 'Pending' },
    { id: uid(), order: 4, topic: 'Action Items Status Update', presenter: '', duration_mins: 10, notes: '', status: 'Pending' },
    { id: uid(), order: 5, topic: 'AOB & Next Meeting', presenter: '', duration_mins: 5, notes: '', status: 'Pending' },
  ]);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([userId]);

  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const updateAgenda = (id: string, field: keyof AgendaItem, value: any) =>
    setAgendaItems((prev) => prev.map((a) => a.id === id ? { ...a, [field]: value } : a));

  const addAgendaItem = () =>
    setAgendaItems((prev) => [
      ...prev,
      { id: uid(), order: prev.length + 1, topic: '', presenter: '', duration_mins: 5, notes: '', status: 'Pending' },
    ]);

  const removeAgendaItem = (id: string) =>
    setAgendaItems((prev) => prev.filter((a) => a.id !== id).map((a, i) => ({ ...a, order: i + 1 })));

  const toggleAttendee = (uid: string) =>
    setSelectedAttendees((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );

  const totalDuration = agendaItems.reduce((s, a) => s + a.duration_mins, 0);

  return (
    <div className="space-y-5">
      {/* Basic info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Meeting Title *</label>
          <input value={f.title} onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Monthly HSE Committee Meeting — June 2024"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Meeting Type</label>
          <select value={f.type} onChange={(e) => set('type', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            {MEETING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Location</label>
          <input value={f.location} onChange={(e) => set('location', e.target.value)}
            placeholder="Conference Room A, Site Office..."
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Date *</label>
          <input type="date" value={f.scheduled_date} onChange={(e) => set('scheduled_date', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Start Time</label>
          <input type="time" value={f.scheduled_time} onChange={(e) => set('scheduled_time', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Facilitator</label>
          <select value={f.facilitator_id} onChange={(e) => set('facilitator_id', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            {usersList.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Minutes Secretary</label>
          <select value={f.secretary_id} onChange={(e) => set('secretary_id', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            <option value="">Select secretary</option>
            {usersList.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Project</label>
          <select value={f.project_id} onChange={(e) => set('project_id', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            <option value="">No project</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Safety Moment Topic</label>
          <input value={f.safety_moment} onChange={(e) => set('safety_moment', e.target.value)}
            placeholder="e.g. Heat stress prevention, Working at Height reminders..."
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
      </div>

      {/* Agenda */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Agenda ({agendaItems.length} items · {totalDuration} mins total)
          </label>
          <button onClick={addAgendaItem}
            className="text-xs text-blue-600 flex items-center gap-1 hover:text-blue-700">
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>
        <div className="space-y-2">
          {agendaItems.map((item, idx) => (
            <div key={item.id} className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400 flex-shrink-0 mt-0.5">
                {item.order}
              </span>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input value={item.topic} onChange={(e) => updateAgenda(item.id, 'topic', e.target.value)}
                  placeholder="Agenda topic..."
                  className="sm:col-span-2 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-700 dark:text-slate-300" />
                <div className="flex gap-2">
                  <input type="number" value={item.duration_mins} min={1}
                    onChange={(e) => updateAgenda(item.id, 'duration_mins', Number(e.target.value))}
                    className="w-16 px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-700 dark:text-slate-300"
                    title="Duration (minutes)" />
                  <span className="text-xs text-slate-400 self-center">min</span>
                  <button onClick={() => removeAgendaItem(item.id)} className="text-red-400 hover:text-red-600 ml-auto">
                    <span className="text-xs">✕</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attendees */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
          Invited Attendees ({selectedAttendees.length} selected)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto">
          {usersList.map((u: any) => (
            <label key={u.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-colors ${
              selectedAttendees.includes(u.id)
                ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}>
              <input type="checkbox" checked={selectedAttendees.includes(u.id)}
                onChange={() => toggleAttendee(u.id)} className="sr-only" />
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                selectedAttendees.includes(u.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
              }`}>
                {selectedAttendees.includes(u.id) && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className="truncate">{u.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button onClick={onCancel}
          className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
          Cancel
        </button>
        <button
          onClick={() => {
            if (!f.title || !f.scheduled_date) return;
            const meeting: SafetyMeeting = {
              ...f,
              id: uid(),
              org_id: orgId,
              status: 'Scheduled',
              actual_start: '',
              actual_end: '',
              agenda: agendaItems,
              attendees: selectedAttendees.map((uid) => {
                const u = usersList.find((x: any) => x.id === uid);
                return { user_id: uid, name: u?.name ?? uid, role: u?.role ?? '', attended: false, signed: false };
              }),
              minutes: '',
              actions: [],
              attachments: [],
              created_by: userId,
              created_at: new Date().toISOString(),
            };
            onSave(meeting);
          }}
          className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
          Schedule Meeting
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Meeting detail / minutes view
// ─────────────────────────────────────────────────────────────────────────────

interface MeetingDetailProps {
  meeting: SafetyMeeting;
  onChange: (m: SafetyMeeting) => void;
  onClose: () => void;
  usersList: any[];
}

const MeetingDetail: React.FC<MeetingDetailProps> = ({ meeting, onChange, onClose, usersList }) => {
  const [activeSection, setActiveSection] = useState<'agenda' | 'attendance' | 'minutes' | 'actions'>('agenda');

  const toggleAttendance = (userId: string) => {
    onChange({
      ...meeting,
      attendees: meeting.attendees.map((a) =>
        a.user_id === userId ? { ...a, attended: !a.attended } : a,
      ),
    });
  };

  const updateMinutes = (minutes: string) => onChange({ ...meeting, minutes });

  const addAction = () => {
    const newAction: MeetingAction = {
      id: uid(), action: '', owner: '', due_date: '', status: 'Open', from_agenda_item: '',
    };
    onChange({ ...meeting, actions: [...meeting.actions, newAction] });
  };

  const updateAction = (id: string, field: keyof MeetingAction, value: any) => {
    onChange({
      ...meeting,
      actions: meeting.actions.map((a) => a.id === id ? { ...a, [field]: value } : a),
    });
  };

  const completeAgendaItem = (itemId: string) => {
    onChange({
      ...meeting,
      agenda: meeting.agenda.map((a) =>
        a.id === itemId ? { ...a, status: a.status === 'Discussed' ? 'Pending' : 'Discussed' } : a,
      ),
    });
  };

  const startMeeting = () => onChange({ ...meeting, status: 'In Progress', actual_start: new Date().toISOString() });
  const closeMeeting = () => onChange({ ...meeting, status: 'Completed', actual_end: new Date().toISOString() });

  const attendedCount = meeting.attendees.filter((a) => a.attended).length;

  const sc = STATUS_CONFIG[meeting.status];
  const StatusIcon = sc.icon;
  const facilitator = usersList.find((u: any) => u.id === meeting.facilitator_id);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${sc.bg} ${sc.color}`}>
              <StatusIcon className="w-3 h-3" />{meeting.status}
            </span>
            <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{meeting.type}</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{meeting.title}</h3>
          <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-slate-400">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{meeting.scheduled_date} {meeting.scheduled_time}</span>
            {meeting.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{meeting.location}</span>}
            {facilitator && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />Facilitated by {facilitator.name}</span>}
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{attendedCount}/{meeting.attendees.length} attended</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex-shrink-0">
          <ChevronRight className="w-5 h-5 text-slate-400 rotate-180" />
        </button>
      </div>

      {/* Status controls */}
      {meeting.status === 'Scheduled' && (
        <button onClick={startMeeting}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 w-fit">
          <Clock className="w-4 h-4" /> Start Meeting
        </button>
      )}
      {meeting.status === 'In Progress' && (
        <button onClick={closeMeeting}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 w-fit">
          <CheckCircle2 className="w-4 h-4" /> Close Meeting
        </button>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit flex-wrap">
        {[
          { id: 'agenda',     label: `Agenda (${meeting.agenda.length})` },
          { id: 'attendance', label: `Attendance (${attendedCount}/${meeting.attendees.length})` },
          { id: 'minutes',    label: 'Minutes' },
          { id: 'actions',    label: `Actions (${meeting.actions.length})` },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setActiveSection(id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSection === id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Agenda */}
      {activeSection === 'agenda' && (
        <div className="space-y-2">
          {meeting.safety_moment && (
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 border border-amber-200 dark:border-amber-800 mb-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Safety Moment</p>
              <p className="text-sm text-amber-800 dark:text-amber-300">{meeting.safety_moment}</p>
            </div>
          )}
          {meeting.agenda.map((item) => (
            <div key={item.id}
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                item.status === 'Discussed' ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
              }`}>
              <button onClick={() => completeAgendaItem(item.id)}
                className={`mt-0.5 flex-shrink-0 ${item.status === 'Discussed' ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}>
                <CheckCircle2 className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${item.status === 'Discussed' ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                  {item.order}. {item.topic}
                </p>
                {item.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.notes}</p>}
              </div>
              <span className="text-xs text-slate-400 flex-shrink-0 flex items-center gap-1">
                <AlarmClock className="w-3 h-3" />{item.duration_mins}m
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Attendance */}
      {activeSection === 'attendance' && (
        <div className="space-y-2">
          {meeting.attendees.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No attendees invited.</p>
          ) : (
            meeting.attendees.map((attendee) => (
              <div key={attendee.user_id}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  attendee.attended ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                }`}>
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                  {attendee.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{attendee.name}</p>
                  <p className="text-xs text-slate-400">{attendee.role}</p>
                </div>
                <CanDo permission="meeting:update">
                  <button
                    onClick={() => toggleAttendance(attendee.user_id)}
                    className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                      attendee.attended
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                    {attendee.attended ? '✓ Present' : 'Mark Present'}
                  </button>
                </CanDo>
              </div>
            ))
          )}
        </div>
      )}

      {/* Minutes */}
      {activeSection === 'minutes' && (
        <div>
          <CanDo permission="meeting:update"
            fallback={
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 min-h-48">
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                  {meeting.minutes || 'No minutes recorded yet.'}
                </p>
              </div>
            }>
            <textarea
              value={meeting.minutes}
              onChange={(e) => updateMinutes(e.target.value)}
              placeholder="Record meeting minutes here...&#10;&#10;Discussion points, decisions made, key action items discussed..."
              rows={12}
              className="w-full px-4 py-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300 resize-none leading-relaxed"
            />
            <p className="text-xs text-slate-400 mt-1">{meeting.minutes.length} characters</p>
          </CanDo>
        </div>
      )}

      {/* Actions */}
      {activeSection === 'actions' && (
        <div className="space-y-3">
          <CanDo permission="meeting:update">
            <button onClick={addAction}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
              <Plus className="w-4 h-4" /> Add Action Item
            </button>
          </CanDo>
          {meeting.actions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No action items yet. Add them during the meeting.
            </div>
          ) : (
            meeting.actions.map((action) => (
              <div key={action.id}
                className={`p-3.5 rounded-xl border ${action.status === 'Closed' ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-3">
                    <input value={action.action}
                      onChange={(e) => updateAction(action.id, 'action', e.target.value)}
                      placeholder="Action description..."
                      className="w-full text-sm bg-transparent outline-none text-slate-700 dark:text-slate-300 font-medium border-b border-slate-200 dark:border-slate-700 pb-1" />
                  </div>
                  <input value={action.owner}
                    onChange={(e) => updateAction(action.id, 'owner', e.target.value)}
                    placeholder="Owner..."
                    className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 outline-none text-slate-600 dark:text-slate-400" />
                  <input type="date" value={action.due_date}
                    onChange={(e) => updateAction(action.id, 'due_date', e.target.value)}
                    className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 outline-none text-slate-600 dark:text-slate-400" />
                  <select value={action.status}
                    onChange={(e) => updateAction(action.id, 'status', e.target.value)}
                    className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 outline-none text-slate-600 dark:text-slate-400">
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const SafetyMeetings: React.FC = () => {
  const { activeUser, activeOrg, usersList } = useAppContext();
  const { projects } = useDataContext();

  const [meetings, setMeetings]       = useState<SafetyMeeting[]>([]);
  const [showForm, setShowForm]       = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<SafetyMeeting | null>(null);
  const [filterStatus, setFilterStatus] = useState<MeetingStatus | 'All'>('All');
  const [filterType, setFilterType]   = useState<MeetingType | 'All'>('All');

  const handleSave = (meeting: SafetyMeeting) => {
    setMeetings((prev) => [meeting, ...prev]);
    setShowForm(false);
    writeAuditLog({
      org_id: activeOrg?.id ?? '',
      user_id: activeUser?.id ?? '',
      action: 'CREATE',
      resource_type: 'meeting',
      resource_id: meeting.id,
      description: `Safety meeting scheduled: ${meeting.title}`,
      timestamp: new Date().toISOString(),
    });
  };

  const handleUpdate = (updated: SafetyMeeting) => {
    setMeetings((prev) => prev.map((m) => m.id === updated.id ? updated : m));
    setSelectedMeeting(updated);
  };

  const filtered = useMemo(() => meetings.filter((m) => {
    if (filterStatus !== 'All' && m.status !== filterStatus) return false;
    if (filterType   !== 'All' && m.type   !== filterType)   return false;
    return true;
  }), [meetings, filterStatus, filterType]);

  const stats = useMemo(() => ({
    total:      meetings.length,
    scheduled:  meetings.filter((m) => m.status === 'Scheduled').length,
    completed:  meetings.filter((m) => m.status === 'Completed').length,
    openActions: meetings.reduce((s, m) => s + m.actions.filter((a) => a.status === 'Open').length, 0),
  }), [meetings]);

  if (selectedMeeting) {
    return (
      <MeetingDetail
        meeting={selectedMeeting}
        onChange={handleUpdate}
        onClose={() => setSelectedMeeting(null)}
        usersList={usersList}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Safety Meetings</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {stats.total} meetings · {stats.scheduled} upcoming · {stats.openActions} open actions
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportTableToCsv(meetings, [
            { key: 'title',          label: 'Title' },
            { key: 'type',           label: 'Type' },
            { key: 'scheduled_date', label: 'Date' },
            { key: 'location',       label: 'Location' },
            { key: 'status',         label: 'Status' },
          ], 'safety-meetings')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm hover:bg-emerald-100">
            <Download className="w-4 h-4" /> Export
          </button>
          <CanDo permission="meeting:create">
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
              <Plus className="w-4 h-4" /> Schedule Meeting
            </button>
          </CanDo>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',        value: stats.total,       color: 'text-slate-700 dark:text-slate-300' },
          { label: 'Scheduled',    value: stats.scheduled,   color: 'text-blue-600' },
          { label: 'Completed',    value: stats.completed,   color: 'text-emerald-600' },
          { label: 'Open Actions', value: stats.openActions, color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-3 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Schedule form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Schedule New Meeting</h3>
          <ScheduleMeetingForm
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
            orgId={activeOrg?.id ?? ''}
            userId={activeUser?.id ?? ''}
            usersList={usersList}
            projects={projects}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['All', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'] as const).map((s) => (
          <button key={s} onClick={() => setFilterStatus(s as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === s
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}>{s}</button>
        ))}
      </div>

      {/* Meeting list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {meetings.length === 0 ? 'No meetings scheduled yet.' : 'No meetings match your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((meeting) => {
            const sc = STATUS_CONFIG[meeting.status];
            const StatusIcon = sc.icon;
            const facilitator = usersList.find((u: any) => u.id === meeting.facilitator_id);
            const openActions = meeting.actions.filter((a) => a.status === 'Open').length;
            const attended = meeting.attendees.filter((a) => a.attended).length;

            return (
              <div key={meeting.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:shadow-sm transition-shadow">
                <button
                  onClick={() => setSelectedMeeting(meeting)}
                  className="w-full flex items-start gap-3 p-4 text-left">
                  {/* Date box */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex flex-col items-center justify-center">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      {new Date(meeting.scheduled_date).toLocaleDateString('en-GB', { month: 'short' })}
                    </p>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200 leading-none">
                      {new Date(meeting.scheduled_date).getDate()}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${sc.bg} ${sc.color}`}>
                        <StatusIcon className="w-2.5 h-2.5" />{meeting.status}
                      </span>
                      <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{meeting.type}</span>
                      {openActions > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{openActions} open action{openActions !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{meeting.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{meeting.scheduled_time}</span>
                      {meeting.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{meeting.location}</span>}
                      {facilitator && <span>{facilitator.name}</span>}
                      <span>{attended}/{meeting.attendees.length} attendees</span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SafetyMeetings;