import React, { useState, useMemo } from "react";
import { useDataContext, useAppContext } from "../contexts";
import { ChecklistRunModal }    from "./ChecklistRunModal";
import { ChecklistDetailModal } from "./ChecklistDetailModal";
import type { ChecklistTemplate, ChecklistRun } from "../types";
import { Plus, Search, ClipboardList, CheckCircle, ChevronRight, Zap, Eye, BarChart2, X } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useToast } from "./ui/Toast";

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  "completed":   { label: "Completed",   color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  "in_progress": { label: "In Progress", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
};
const getStatus = (s: string) => STATUS_CFG[s] || STATUS_CFG["in_progress"];
const scoreColor = (s: number) => s >= 85 ? "#10b981" : s >= 70 ? "#f59e0b" : "#ef4444";

const tplTitle = (t: ChecklistTemplate) =>
  typeof t.title === "string" ? t.title : Object.values(t.title || {})[0] || "Untitled";

// ─── New Template Modal ───────────────────────────────────────────────────────
const NewTemplateModal: React.FC<{ onClose: () => void; onCreate: (data: any) => void }> = ({ onClose, onCreate }) => {
  const [name, setName]     = useState("");
  const [category, setCategory] = useState("General");
  const [items, setItems]   = useState([{ text: "" }]);
  const [busy, setBusy]     = useState(false);

  const addItem    = () => setItems(p => [...p, { text: "" }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const setQ       = (i: number, v: string) => setItems(p => p.map((x, idx) => idx === i ? { text: v } : x));

  const handleSubmit = () => {
    if (!name.trim()) return;
    setBusy(true);
    const data = {
      category,
      title: { en: name.trim() },
      items: items.filter(i => i.text.trim()).map((item, idx) => ({
        id:          `item_${idx}_${Date.now()}`,
        text:        { en: item.text },
        description: { en: "" },
        category:    category,
      })),
    };
    onCreate(data);
    setBusy(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)" }}>
      <div className="giq-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>New Checklist Template</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "var(--text-muted)" }} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-muted)" }}>Template Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Daily Site Inspection" className="giq-input w-full" autoFocus />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-muted)" }}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="giq-input w-full">
              {["General", "Safety", "Fire", "Electrical", "Housekeeping", "PPE", "Equipment", "Environmental"].map(c =>
                <option key={c} value={c}>{c}</option>
              )}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Checklist Items</label>
              <button onClick={addItem} className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>+ Add Item</button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={item.text} onChange={e => setQ(i, e.target.value)}
                    placeholder={`Item ${i + 1}...`} className="giq-input flex-1 text-sm" />
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} className="p-1.5 hover:bg-white/5 rounded-lg">
                      <X className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="giq-btn-secondary flex-1">Cancel</button>
          <button onClick={handleSubmit} disabled={!name.trim() || busy} className="giq-btn-primary flex-1">
            {busy ? "Creating…" : "Create Template"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Checklists component ────────────────────────────────────────────────
export const Checklists: React.FC = () => {
  const { checklistTemplates, checklistRunList, setChecklistRunList, projects, handleCreateChecklistTemplate } = useDataContext();
  const { error: toastError } = useToast();
  const { activeOrg, activeUser, can }  = useAppContext();

  const [tab, setTab]     = useState<"templates" | "runs">("templates");
  const [search, setSearch] = useState("");

  const [runTemplate,    setRunTemplate]    = useState<ChecklistTemplate | null>(null);
  const [detailTemplate, setDetailTemplate] = useState<ChecklistTemplate | null>(null);
  const [showNewTpl,     setShowNewTpl]     = useState(false);

  const filteredTemplates = useMemo(() =>
    checklistTemplates.filter(t => !search || tplTitle(t).toLowerCase().includes(search.toLowerCase())),
    [checklistTemplates, search]);

  const filteredRuns = useMemo(() =>
    checklistRunList.filter(r => {
      if (!search) return true;
      const tpl = checklistTemplates.find(t => t.id === r.template_id);
      return tpl ? tplTitle(tpl).toLowerCase().includes(search.toLowerCase()) : false;
    }),
    [checklistRunList, checklistTemplates, search]);

  const stats = useMemo(() => ({
    templates:  checklistTemplates.length,
    completed:  checklistRunList.filter(r => r.status === "completed").length,
    inProgress: checklistRunList.filter(r => r.status === "in_progress").length,
    avgScore:   (() => {
      const scored = checklistRunList.filter(r => r.score != null);
      return scored.length > 0 ? Math.round(scored.reduce((s, r) => s + (r.score || 0), 0) / scored.length) : 0;
    })(),
  }), [checklistTemplates, checklistRunList]);

  const handleRunSubmit = async (data: Omit<ChecklistRun, "id" | "org_id" | "executed_by_id" | "executed_at">) => {
    const run: ChecklistRun = {
      ...data,
      id:             `run_${Date.now()}`,
      org_id:         (activeOrg as any).id,
      executed_by_id: activeUser?.id ?? "",
      executed_at:    new Date().toISOString(),
    };
    setChecklistRunList(prev => [run, ...prev]);
    try {
      await setDoc(doc(db, "checklist_runs", run.id), run);
    } catch (err) {
      // Previously an empty catch here - a failed save looked identical to a
      // successful one, since the optimistic update above was never rolled
      // back and nothing told the user anything had gone wrong.
      console.error('[Checklists] Failed to save checklist run:', err);
      setChecklistRunList(prev => prev.filter(r => r.id !== run.id));
      toastError('Could not save the checklist run. Please try again.');
    }
    setRunTemplate(null);
  };

  const defaultProject = projects[0];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="giq-page-title">Checklists</h1>
          <p className="giq-page-subtitle mt-1">Templates and inspection run history</p>
        </div>
        {can("create", "reports") && (
          <button className="giq-btn-primary" onClick={() => setShowNewTpl(true)}>
            <Plus className="w-4 h-4" />New Template
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Templates",   value: stats.templates,  color: "#3b82f6", icon: ClipboardList },
          { label: "Completed",   value: stats.completed,  color: "#10b981", icon: CheckCircle },
          { label: "In Progress", value: stats.inProgress, color: "#f59e0b", icon: ClipboardList },
          { label: "Avg Score",   value: stats.avgScore > 0 ? `${stats.avgScore}%` : "—", color: "#8b5cf6", icon: BarChart2 },
        ].map(s => (
          <div key={s.label} className="giq-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search checklists..."
            className="giq-input w-full pl-9" />
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
          {(["templates", "runs"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={tab === t ? { background: "#10b981", color: "white" } : { color: "var(--text-secondary)" }}>
              {t === "templates" ? `Templates (${stats.templates})` : `Run History (${filteredRuns.length})`}
            </button>
          ))}
        </div>
      </div>

      {tab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(t => (
            <div key={t.id} className="giq-card p-5 transition-all hover:-translate-y-0.5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)" }}>
                  <ClipboardList className="w-4 h-4" style={{ color: "#10b981" }} />
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                  {t.items?.length || 0} items
                </span>
              </div>
              <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--text-primary)" }}>{tplTitle(t)}</h3>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>{t.category}</p>
              <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--border-default)" }}>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {checklistRunList.filter(r => r.template_id === t.id).length} runs
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setDetailTemplate(t)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                    <Eye className="w-3 h-3" />View
                  </button>
                  <button onClick={() => setRunTemplate(t)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1"
                    style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                    <Zap className="w-3 h-3" />Start
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredTemplates.length === 0 && (
            <div className="col-span-3 giq-card py-16 text-center">
              <ClipboardList className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
              <p className="font-semibold" style={{ color: "var(--text-secondary)" }}>No templates found</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Click "New Template" to create one</p>
            </div>
          )}
        </div>
      )}

      {tab === "runs" && (
        <div className="space-y-3">
          {filteredRuns.map(run => {
            const tpl  = checklistTemplates.find(t => t.id === run.template_id);
            const sCfg = getStatus(run.status);
            const sc   = run.score != null ? Math.round(run.score) : null;
            return (
              <div key={run.id}
                className="giq-card p-4 flex items-center gap-4 transition-all">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: sCfg.bg }}>
                  <ClipboardList className="w-5 h-5" style={{ color: sCfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: sCfg.bg, color: sCfg.color }}>{sCfg.label}</span>
                  </div>
                  <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{tpl ? tplTitle(tpl) : "Checklist Run"}</p>
                  {run.executed_at && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{new Date(run.executed_at).toLocaleDateString("en-GB")}</p>
                  )}
                  {sc !== null && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--border-default)" }}>
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${sc}%`, background: scoreColor(sc) }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: scoreColor(sc) }}>{sc}%</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
              </div>
            );
          })}
          {filteredRuns.length === 0 && (
            <div className="giq-card py-16 text-center">
              <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
              <p className="font-semibold" style={{ color: "var(--text-secondary)" }}>No runs yet</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Start a template to create a run</p>
            </div>
          )}
        </div>
      )}

      {showNewTpl && (
        <NewTemplateModal
          onClose={() => setShowNewTpl(false)}
          onCreate={data => handleCreateChecklistTemplate(data)}
        />
      )}

      {runTemplate && activeUser && (
        <ChecklistRunModal
          template={runTemplate}
          project={defaultProject || ({ id: "", org_id: (activeOrg as any).id, name: "General", status: "active" } as any)}
          user={activeUser}
          onClose={() => setRunTemplate(null)}
          onSubmit={handleRunSubmit}
        />
      )}

      {detailTemplate && activeUser && (
        <ChecklistDetailModal
          template={detailTemplate}
          organization={activeOrg as any}
          project={defaultProject || ({ id: "", org_id: (activeOrg as any).id, name: "General", status: "active" } as any)}
          user={activeUser}
          onClose={() => setDetailTemplate(null)}
        />
      )}
    </div>
  );
};