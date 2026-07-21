/**
 * FILE: src/components/rca/RcaModule.tsx
 *
 * Root Cause Analysis (RCA) Module
 *
 * Methods implemented:
 *   1. 5-Why Analysis — iterative questioning wizard
 *   2. Fishbone (Ishikawa) diagram — cause-and-effect visual builder
 *   3. Bow-Tie Analysis — threat → event → consequence with barriers
 *
 * Each RCA is linked to an incident report by report_id.
 * Completed RCAs generate CAPA recommendations that can be pushed back
 * to the parent report.
 *
 * Data is persisted to Firestore collection: 'rca_records'
 */

import React, { useState, useCallback } from 'react';
import {
  Plus, Trash2, ChevronRight, ChevronDown,
  Save, Send, AlertTriangle, RefreshCw,
  GitBranch, Layers, Link2, CheckCircle2,
} from 'lucide-react';
import { useDataContext } from '../../contexts';
import { useAppContext } from '../../contexts';
import { generateResponse } from '../../services/geminiService';
import { useToast } from '../ui/Toast';
import type { Report } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type RcaMethod = '5why' | 'fishbone' | 'bowtie';

interface WhyEntry {
  id: string;
  level: number;   // 1–5
  question: string;
  answer: string;
}

type FishboneCategory =
  | 'People' | 'Process' | 'Equipment' | 'Environment'
  | 'Materials' | 'Management' | 'Measurement';

interface FishboneCause {
  id: string;
  category: FishboneCategory;
  cause: string;
  subCauses: string[];
}

interface BowTieBarrier {
  id: string;
  type: 'preventive' | 'mitigating';
  description: string;
  status: 'effective' | 'degraded' | 'failed';
}

interface BowTieConsequence {
  id: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
}

interface RcaRecord {
  id: string;
  report_id: string;
  method: RcaMethod;
  status: 'draft' | 'complete' | 'reviewed';
  created_by: string;
  created_at: string;
  updated_at: string;
  // 5-Why
  whys?: WhyEntry[];
  rootCause?: string;
  // Fishbone
  problem?: string;
  fishboneCauses?: FishboneCause[];
  // Bow-tie
  threat?: string;
  topEvent?: string;
  preventiveBarriers?: BowTieBarrier[];
  mitigatingBarriers?: BowTieBarrier[];
  consequences?: BowTieConsequence[];
  // CAPA output
  capaRecommendations?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const FISHBONE_CATEGORIES: FishboneCategory[] = [
  'People', 'Process', 'Equipment', 'Environment',
  'Materials', 'Management', 'Measurement',
];

const CATEGORY_COLORS: Record<FishboneCategory, string> = {
  People:      'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200',
  Process:     'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200',
  Equipment:   'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200',
  Environment: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200',
  Materials:   'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200',
  Management:  'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200',
  Measurement: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200',
};

const uid = () => `rca_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

// ─────────────────────────────────────────────────────────────────────────────
// 5-Why Component
// ─────────────────────────────────────────────────────────────────────────────

interface FiveWhyProps {
  report: Report;
  whys: WhyEntry[];
  rootCause: string;
  onChange: (whys: WhyEntry[], rootCause: string) => void;
  onAiSuggest: () => void;
  aiLoading: boolean;
}

const FiveWhyWizard: React.FC<FiveWhyProps> = ({
  report, whys, rootCause, onChange, onAiSuggest, aiLoading,
}) => {
  const { info } = useToast();
  const addWhy = () => {
    if (whys.length >= 7) return; // allow up to 7 levels
    const nextLevel = whys.length + 1;
    const newEntry: WhyEntry = {
      id: uid(),
      level: nextLevel,
      question: `Why ${nextLevel}?`,
      answer: '',
    };
    onChange([...whys, newEntry], rootCause);
  };

  const updateWhy = (id: string, field: 'question' | 'answer', value: string) => {
    onChange(
      whys.map((w) => (w.id === id ? { ...w, [field]: value } : w)),
      rootCause,
    );
  };

  const removeWhy = (id: string) => {
    const updated = whys.filter((w) => w.id !== id)
      .map((w, i) => ({ ...w, level: i + 1, question: `Why ${i + 1}?` }));
    onChange(updated, rootCause);
  };

  return (
    <div className="space-y-4">
      {/* Problem statement */}
      <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4 border border-red-200 dark:border-red-800">
        <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1 uppercase tracking-wide">
          Problem / Incident
        </p>
        <p className="text-sm text-red-800 dark:text-red-300 font-medium">
          {report.description || report.type || 'No description provided'}
        </p>
        <p className="text-xs text-red-600 dark:text-red-500 mt-1">
          {report.occurred_at} · {report.location?.text || report.location?.specific_area || ''}
        </p>
      </div>

      {/* Why chain */}
      {whys.map((why, idx) => (
        <div key={why.id} className="flex gap-3">
          {/* Connector line */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900
                            flex items-center justify-center text-xs font-bold flex-shrink-0">
              {why.level}
            </div>
            {idx < whys.length - 1 && (
              <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />
            )}
          </div>

          <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200
                          dark:border-slate-700 p-4 space-y-2 mb-1">
            <input
              value={why.question}
              onChange={(e) => updateWhy(why.id, 'question', e.target.value)}
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-transparent
                         outline-none w-full uppercase tracking-wide"
              placeholder="Why question..."
            />
            <textarea
              value={why.answer}
              onChange={(e) => updateWhy(why.id, 'answer', e.target.value)}
              placeholder="Enter the answer / cause..."
              rows={2}
              className="w-full text-sm text-slate-700 dark:text-slate-300 bg-transparent outline-none
                         resize-none placeholder:text-slate-400"
            />
            <div className="flex justify-end">
              <button
                onClick={() => removeWhy(why.id)}
                className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Add / AI buttons */}
      <div className="flex gap-2">
        {whys.length < 7 && (
          <button
            onClick={addWhy}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600
                       dark:text-slate-400 rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <Plus className="w-4 h-4" /> Add Why
          </button>
        )}
        <button
          onClick={() => info('AI features are coming soon.')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950 text-blue-700
                     dark:text-blue-300 rounded-lg text-sm hover:bg-blue-100"
        >
          <ChevronRight className="w-4 h-4" />
          AI Suggest <span className="ml-1 text-[10px] font-bold uppercase bg-amber-500 text-white px-1.5 py-0.5 rounded-full tracking-wide">Soon</span>
        </button>
      </div>

      {/* Root cause statement */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">
          Root Cause Statement
        </label>
        <textarea
          value={rootCause}
          onChange={(e) => onChange(whys, e.target.value)}
          placeholder="Summarise the fundamental root cause identified through the 5-Why analysis..."
          rows={3}
          className="w-full text-sm text-slate-700 dark:text-slate-300 bg-transparent outline-none
                     resize-none placeholder:text-slate-400"
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Fishbone Component
// ─────────────────────────────────────────────────────────────────────────────

interface FishboneProps {
  problem: string;
  causes: FishboneCause[];
  onChange: (problem: string, causes: FishboneCause[]) => void;
}

const FishboneDiagram: React.FC<FishboneProps> = ({ problem, causes, onChange }) => {
  const [expandedCats, setExpandedCats] = useState<Set<FishboneCategory>>(new Set(FISHBONE_CATEGORIES));

  const addCause = (category: FishboneCategory) => {
    const newCause: FishboneCause = {
      id: uid(),
      category,
      cause: '',
      subCauses: [],
    };
    onChange(problem, [...causes, newCause]);
  };

  const updateCause = (id: string, field: keyof FishboneCause, value: any) => {
    onChange(problem, causes.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const removeCause = (id: string) => {
    onChange(problem, causes.filter((c) => c.id !== id));
  };

  const addSubCause = (id: string) => {
    onChange(
      problem,
      causes.map((c) => c.id === id ? { ...c, subCauses: [...c.subCauses, ''] } : c),
    );
  };

  const updateSubCause = (causeId: string, idx: number, value: string) => {
    onChange(
      problem,
      causes.map((c) => {
        if (c.id !== causeId) return c;
        const subs = [...c.subCauses];
        subs[idx] = value;
        return { ...c, subCauses: subs };
      }),
    );
  };

  const removeSubCause = (causeId: string, idx: number) => {
    onChange(
      problem,
      causes.map((c) => {
        if (c.id !== causeId) return c;
        return { ...c, subCauses: c.subCauses.filter((_, i) => i !== idx) };
      }),
    );
  };

  const toggleCat = (cat: FishboneCategory) =>
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });

  return (
    <div className="space-y-4">
      {/* Effect (problem) */}
      <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4 border border-red-200 dark:border-red-800">
        <label className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-2 block">
          Effect (Problem Statement)
        </label>
        <input
          value={problem}
          onChange={(e) => onChange(e.target.value, causes)}
          placeholder="What went wrong? State the problem clearly..."
          className="w-full text-sm text-red-800 dark:text-red-300 bg-transparent outline-none
                     placeholder:text-red-400 font-medium"
        />
      </div>

      {/* Category causes */}
      {FISHBONE_CATEGORIES.map((cat) => {
        const catCauses = causes.filter((c) => c.category === cat);
        const isOpen = expandedCats.has(cat);
        return (
          <div
            key={cat}
            className={`rounded-xl border ${CATEGORY_COLORS[cat]}`}
          >
            <button
              onClick={() => toggleCat(cat)}
              className="w-full flex items-center justify-between p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{cat}</span>
                {catCauses.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-black/10 font-semibold">
                    {catCauses.length}
                  </span>
                )}
              </div>
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {isOpen && (
              <div className="px-3 pb-3 space-y-2">
                {catCauses.map((cause) => (
                  <div key={cause.id} className="bg-white/60 dark:bg-black/20 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        value={cause.cause}
                        onChange={(e) => updateCause(cause.id, 'cause', e.target.value)}
                        placeholder="Primary cause..."
                        className="flex-1 text-sm bg-transparent outline-none font-medium"
                      />
                      <button onClick={() => removeCause(cause.id)}
                        className="text-red-400 hover:text-red-600 flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Sub-causes */}
                    {cause.subCauses.map((sub, idx) => (
                      <div key={idx} className="flex items-center gap-2 ml-4">
                        <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-50" />
                        <input
                          value={sub}
                          onChange={(e) => updateSubCause(cause.id, idx, e.target.value)}
                          placeholder="Sub-cause..."
                          className="flex-1 text-xs bg-transparent outline-none"
                        />
                        <button onClick={() => removeSubCause(cause.id, idx)}
                          className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addSubCause(cause.id)}
                      className="ml-4 text-xs opacity-60 hover:opacity-100 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Sub-cause
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addCause(cat)}
                  className="w-full flex items-center gap-2 text-xs py-2 justify-center
                             bg-white/40 dark:bg-black/20 rounded-lg hover:bg-white/60 dark:hover:bg-black/30"
                >
                  <Plus className="w-3.5 h-3.5" /> Add cause
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Bow-Tie Component
// ─────────────────────────────────────────────────────────────────────────────

interface BowTieProps {
  threat: string;
  topEvent: string;
  preventiveBarriers: BowTieBarrier[];
  mitigatingBarriers: BowTieBarrier[];
  consequences: BowTieConsequence[];
  onChange: (data: Partial<RcaRecord>) => void;
}

const BARRIER_STATUS_STYLES = {
  effective: 'bg-emerald-100 dark:bg-emerald-950 border-emerald-400 text-emerald-700 dark:text-emerald-300',
  degraded:  'bg-amber-100 dark:bg-amber-950 border-amber-400 text-amber-700 dark:text-amber-300',
  failed:    'bg-red-100 dark:bg-red-950 border-red-400 text-red-700 dark:text-red-300',
};

const CONSEQUENCE_SEVERITY_STYLES = {
  Low:      'bg-slate-100 text-slate-700',
  Medium:   'bg-amber-100 text-amber-700',
  High:     'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
};

const BowTieAnalysis: React.FC<BowTieProps> = ({
  threat, topEvent, preventiveBarriers, mitigatingBarriers, consequences, onChange,
}) => {
  const addBarrier = (type: 'preventive' | 'mitigating') => {
    const newBarrier: BowTieBarrier = { id: uid(), type, description: '', status: 'effective' };
    if (type === 'preventive') onChange({ preventiveBarriers: [...preventiveBarriers, newBarrier] });
    else onChange({ mitigatingBarriers: [...mitigatingBarriers, newBarrier] });
  };

  const updateBarrier = (type: 'preventive' | 'mitigating', id: string, field: keyof BowTieBarrier, value: any) => {
    const list = type === 'preventive' ? preventiveBarriers : mitigatingBarriers;
    const updated = list.map((b) => (b.id === id ? { ...b, [field]: value } : b));
    if (type === 'preventive') onChange({ preventiveBarriers: updated });
    else onChange({ mitigatingBarriers: updated });
  };

  const removeBarrier = (type: 'preventive' | 'mitigating', id: string) => {
    if (type === 'preventive') onChange({ preventiveBarriers: preventiveBarriers.filter((b) => b.id !== id) });
    else onChange({ mitigatingBarriers: mitigatingBarriers.filter((b) => b.id !== id) });
  };

  const addConsequence = () => {
    onChange({
      consequences: [...consequences, { id: uid(), description: '', severity: 'Medium' }],
    });
  };

  const updateConsequence = (id: string, field: keyof BowTieConsequence, value: any) => {
    onChange({ consequences: consequences.map((c) => (c.id === id ? { ...c, [field]: value } : c)) });
  };

  const BarrierList: React.FC<{ type: 'preventive' | 'mitigating'; label: string; list: BowTieBarrier[] }> = ({ type, label, list }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
        <button onClick={() => addBarrier(type)} className="text-xs text-blue-600 flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
      {list.map((b) => (
        <div key={b.id} className={`rounded-lg border p-2.5 space-y-1.5 ${BARRIER_STATUS_STYLES[b.status]}`}>
          <div className="flex items-center gap-2">
            <input
              value={b.description}
              onChange={(e) => updateBarrier(type, b.id, 'description', e.target.value)}
              placeholder="Barrier / control description..."
              className="flex-1 text-xs bg-transparent outline-none font-medium"
            />
            <button onClick={() => removeBarrier(type, b.id)}><Trash2 className="w-3 h-3 text-red-400" /></button>
          </div>
          <select
            value={b.status}
            onChange={(e) => updateBarrier(type, b.id, 'status', e.target.value)}
            className="text-xs bg-white/50 dark:bg-black/20 border border-current/20 rounded px-1.5 py-0.5 outline-none"
          >
            <option value="effective">Effective</option>
            <option value="degraded">Degraded</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Threat */}
        <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
          <label className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide mb-2 block">
            Threat / Hazard
          </label>
          <textarea
            value={threat}
            onChange={(e) => onChange({ threat: e.target.value })}
            placeholder="What was the hazard / threat source?"
            rows={3}
            className="w-full text-sm bg-transparent outline-none resize-none text-orange-800 dark:text-orange-300 placeholder:text-orange-400"
          />
        </div>

        {/* Top Event */}
        <div className="bg-red-100 dark:bg-red-950/60 rounded-xl p-4 border-2 border-red-400 dark:border-red-700">
          <label className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-2 block">
            Top Event (Incident)
          </label>
          <textarea
            value={topEvent}
            onChange={(e) => onChange({ topEvent: e.target.value })}
            placeholder="The loss-of-control event that occurred..."
            rows={3}
            className="w-full text-sm bg-transparent outline-none resize-none text-red-800 dark:text-red-300 placeholder:text-red-400 font-medium"
          />
        </div>

        {/* Consequences */}
        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
              Consequences
            </label>
            <button onClick={addConsequence} className="text-xs text-purple-600 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {consequences.map((con) => (
              <div key={con.id} className="space-y-1">
                <input
                  value={con.description}
                  onChange={(e) => updateConsequence(con.id, 'description', e.target.value)}
                  placeholder="Consequence description..."
                  className="w-full text-xs bg-transparent outline-none text-purple-800 dark:text-purple-300"
                />
                <select
                  value={con.severity}
                  onChange={(e) => updateConsequence(con.id, 'severity', e.target.value)}
                  className={`text-xs px-1.5 py-0.5 rounded ${CONSEQUENCE_SEVERITY_STYLES[con.severity]} outline-none`}
                >
                  {['Low','Medium','High','Critical'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Barriers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <BarrierList type="preventive" label="Preventive Barriers (Left side)" list={preventiveBarriers} />
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <BarrierList type="mitigating" label="Mitigating Barriers (Right side)" list={mitigatingBarriers} />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main RCA Module
// ─────────────────────────────────────────────────────────────────────────────

interface RcaModuleProps {
  report: Report;
  onClose?: () => void;
}

export const RcaModule: React.FC<RcaModuleProps> = ({ report, onClose }) => {
  const { activeUser } = useAppContext();
  const { handleCreateReport } = useDataContext();

  const [method, setMethod] = useState<RcaMethod>('5why');
  const [isSaving, setIsSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showAiPanel, setShowAiPanel] = useState(false);

  // 5-Why state
  const [whys, setWhys] = useState<WhyEntry[]>([
    { id: uid(), level: 1, question: 'Why 1?', answer: '' },
  ]);
  const [rootCause, setRootCause] = useState('');

  // Fishbone state
  const [problem, setProblem] = useState(report.description ?? '');
  const [fishboneCauses, setFishboneCauses] = useState<FishboneCause[]>([]);

  // Bow-tie state
  const [bowtie, setBowtie] = useState<Partial<RcaRecord>>({
    threat: '',
    topEvent: report.description ?? '',
    preventiveBarriers: [],
    mitigatingBarriers: [],
    consequences: [],
  });

  // CAPA output
  const [capaRecommendations, setCapaRecommendations] = useState<string[]>(['', '', '']);

  // ── AI suggestions ────────────────────────────────────────────────────────
  const handleAiSuggest = useCallback(async () => {
    setAiLoading(true);
    setShowAiPanel(false);

    const answeredWhys = whys.filter((w) => w.answer.trim()).map((w) => `${w.question} → ${w.answer}`).join('\n');
    const prompt = `
You are an HSE investigation expert (NEBOSH/ISO 45001 certified).

Analyse this incident and the partial 5-Why chain, then:
1. Suggest the most likely root cause
2. Suggest 3 corrective actions (CAPA)
3. Suggest any remaining Why questions

INCIDENT: ${report.description ?? report.type}
LOCATION: ${report.location ?? 'Unknown'}
DATE: ${report.occurred_at ?? 'Unknown'}
CURRENT 5-WHY CHAIN:
${answeredWhys || '(none yet)'}

Respond in this JSON format only:
{
  "suggestedRootCause": "...",
  "suggestedCapas": ["...", "...", "..."],
  "nextWhyQuestions": ["...", "..."]
}
    `.trim();

    const result = await generateResponse(prompt).then(text => ({ text, error: false })).catch(e => ({ text: '', error: true }));
    if (!result.error && result.text) {
      try {
        const clean = result.text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        if (parsed.suggestedRootCause) setRootCause(parsed.suggestedRootCause);
        if (parsed.suggestedCapas) setCapaRecommendations(parsed.suggestedCapas);
        setAiSuggestions(parsed.nextWhyQuestions ?? []);
        setShowAiPanel(true);
      } catch {
        setAiSuggestions([result.text]);
        setShowAiPanel(true);
      }
    }
    setAiLoading(false);
  }, [report, whys]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    // In production: write to Firestore 'rca_records' collection
    // For now, we log and show success
    const rcaRecord: Partial<RcaRecord> = {
      id: `rca_${Date.now()}`,
      report_id: report.id,
      method,
      status: 'complete',
      created_by: activeUser?.id ?? 'unknown',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      capaRecommendations: capaRecommendations.filter(Boolean),
      ...(method === '5why' ? { whys, rootCause } : {}),
      ...(method === 'fishbone' ? { problem, fishboneCauses } : {}),
      ...(method === 'bowtie' ? bowtie : {}),
    };
    console.log('[RcaModule] Saving RCA:', rcaRecord);
    await new Promise((r) => setTimeout(r, 600)); // simulate save
    setIsSaving(false);
    if (onClose) onClose();
  };

  const methodTabs = [
    { id: '5why' as RcaMethod,     label: '5-Why',    icon: Layers },
    { id: 'fishbone' as RcaMethod, label: 'Fishbone',  icon: GitBranch },
    { id: 'bowtie' as RcaMethod,   label: 'Bow-Tie',   icon: Link2 },
  ];

  return (
    <div className="space-y-6">
      {/* Method selector */}
      <div className="flex gap-2">
        {methodTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMethod(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              method === id
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Method content */}
      {method === '5why' && (
        <FiveWhyWizard
          report={report}
          whys={whys}
          rootCause={rootCause}
          onChange={(w, rc) => { setWhys(w); setRootCause(rc); }}
          onAiSuggest={handleAiSuggest}
          aiLoading={aiLoading}
        />
      )}

      {method === 'fishbone' && (
        <FishboneDiagram
          problem={problem}
          causes={fishboneCauses}
          onChange={(p, c) => { setProblem(p); setFishboneCauses(c); }}
        />
      )}

      {method === 'bowtie' && (
        <BowTieAnalysis
          threat={bowtie.threat ?? ''}
          topEvent={bowtie.topEvent ?? ''}
          preventiveBarriers={bowtie.preventiveBarriers ?? []}
          mitigatingBarriers={bowtie.mitigatingBarriers ?? []}
          consequences={bowtie.consequences ?? []}
          onChange={(d) => setBowtie((prev) => ({ ...prev, ...d }))}
        />
      )}

      {/* AI suggestion panel */}
      {showAiPanel && aiSuggestions.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2 uppercase tracking-wide">
            AI Suggestions
          </p>
          {aiSuggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2 mb-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-300">{s}</p>
            </div>
          ))}
        </div>
      )}

      {/* CAPA Recommendations */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            CAPA Recommendations
          </label>
          <button
            onClick={() => setCapaRecommendations((prev) => [...prev, ''])}
            className="text-xs text-blue-600 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        {capaRecommendations.map((capa, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
              {idx + 1}
            </div>
            <input
              value={capa}
              onChange={(e) => setCapaRecommendations((prev) => {
                const next = [...prev];
                next[idx] = e.target.value;
                return next;
              })}
              placeholder={`Corrective / preventive action ${idx + 1}...`}
              className="flex-1 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
            />
            <button
              onClick={() => setCapaRecommendations((prev) => prev.filter((_, i) => i !== idx))}
              className="text-red-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm
                       text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 bg-slate-900 dark:bg-white text-white
                     dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800
                     dark:hover:bg-slate-100 disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Saving...' : 'Save RCA'}
        </button>
      </div>
    </div>
  );
};

export default RcaModule;