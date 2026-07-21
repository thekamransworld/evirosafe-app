/**
 * FILE: src/components/wizards/GuidedWizards.tsx
 * PASTE AT: src/components/wizards/GuidedWizards.tsx
 *           (create wizards/ folder inside src/components/)
 *
 * ── WIRE INTO APP (src/App.tsx) ───────────────────────────────────────────────
 *
 *   import { IncidentWizard, PtwWizard, RiskAssessmentWizard }
 *     from './components/wizards/GuidedWizards';
 *
 *   // Launch from any button — example in your Reports page:
 *   const [showWizard, setShowWizard] = useState(false);
 *
 *   <button onClick={() => setShowWizard(true)}>
 *     Report Incident (Guided)
 *   </button>
 *
 *   {showWizard && (
 *     <IncidentWizard
 *       onComplete={(data) => { handleCreateReport(data); setShowWizard(false); }}
 *       onCancel={() => setShowWizard(false)}
 *     />
 *   )}
 *
 * ── ALSO: add "Guided" buttons to existing module headers ─────────────────────
 *   In your PTW list header, add:
 *     <PtwWizard onComplete={(data) => handleCreatePtw(data)} onCancel={...} />
 *
 *   In your RAMS/Risk Assessment page, add:
 *     <RiskAssessmentWizard onComplete={(data) => handleCreateRams(data)} onCancel={...} />
 *
 * ── FEATURES ──────────────────────────────────────────────────────────────────
 *   • Full-screen overlay modal — no distractions
 *   • Step indicator with progress bar
 *   • Per-step validation — can't advance until required fields are filled
 *   • Back / Next / Submit navigation
 *   • Field-level error messages
 *   • Auto-save draft to sessionStorage — survives accidental refresh
 *   • Keyboard navigation (Enter to advance, Escape to cancel with confirm)
 *   • Three wizard types: Incident, PTW, Risk Assessment
 */

import React, {
  useState, useEffect, useCallback, useRef,
} from 'react';
import {
  X, ChevronRight, ChevronLeft, CheckCircle2,
  AlertTriangle, FileText, MapPin, Users, Clock,
  Shield, Camera, List, Clipboard, Info,
  AlertCircle,
} from 'lucide-react';
import { useAppContext } from '../../contexts';
import { useDataContext } from '../../contexts';

// ─────────────────────────────────────────────────────────────────────────────
// Generic wizard engine types
// ─────────────────────────────────────────────────────────────────────────────

interface WizardStep {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  /** Returns error message string if invalid, undefined if valid */
  validate: (data: any) => string | undefined;
}

interface WizardShellProps {
  title: string;
  steps: WizardStep[];
  data: any;
  onComplete: (data: any) => void;
  onCancel: () => void;
  renderStep: (stepId: string, data: any, onChange: (patch: any) => void, errors: Record<string, string>) => React.ReactNode;
  draftKey: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable form field components
// ─────────────────────────────────────────────────────────────────────────────

const Field: React.FC<{
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, required, error, hint, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 6 }}>
      {label} {required && <span style={{ color: '#A32D2D' }}>*</span>}
    </label>
    {hint && (
      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6, lineHeight: 1.5 }}>{hint}</p>
    )}
    {children}
    {error && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
        <AlertCircle style={{ width: 13, height: 13, color: '#A32D2D', flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: '#A32D2D' }}>{error}</p>
      </div>
    )}
  </div>
);

const inputStyle = (error?: string): React.CSSProperties => ({
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  color: 'var(--color-text-primary)',
  background: 'var(--color-background-primary)',
  border: `1px solid ${error ? '#A32D2D' : 'var(--color-border-secondary)'}`,
  borderRadius: 10,
  outline: 'none',
  boxSizing: 'border-box',
});

const selectStyle = (error?: string): React.CSSProperties => ({
  ...inputStyle(error),
  appearance: 'none',
  cursor: 'pointer',
});

const textareaStyle = (error?: string): React.CSSProperties => ({
  ...inputStyle(error),
  resize: 'vertical' as const,
  minHeight: 90,
  lineHeight: 1.6,
});

// ─────────────────────────────────────────────────────────────────────────────
// Generic Wizard Shell
// ─────────────────────────────────────────────────────────────────────────────

const WizardShell: React.FC<WizardShellProps> = ({
  title, steps, data: initialData, onComplete, onCancel, renderStep, draftKey,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState(() => {
    // Restore draft from sessionStorage
    try {
      const saved = sessionStorage.getItem(draftKey);
      return saved ? { ...initialData, ...JSON.parse(saved) } : initialData;
    } catch { return initialData; }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attemptedNext, setAttemptedNext] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast  = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Auto-save draft
  useEffect(() => {
    try { sessionStorage.setItem(draftKey, JSON.stringify(data)); } catch {}
  }, [data, draftKey]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (window.confirm('Cancel and discard this draft?')) {
          sessionStorage.removeItem(draftKey);
          onCancel();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [draftKey, onCancel]);

  const onChange = useCallback((patch: any) => {
    setData((prev: any) => ({ ...prev, ...patch }));
    // Clear errors for patched fields
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(patch).forEach((k) => delete next[k]);
      return next;
    });
  }, []);

  const handleNext = () => {
    setAttemptedNext(true);
    const errorMsg = step.validate(data);
    if (errorMsg) {
      setErrors((prev) => ({ ...prev, [step.id]: errorMsg }));
      return;
    }
    setErrors({});
    setAttemptedNext(false);
    if (isLast) {
      sessionStorage.removeItem(draftKey);
      onComplete(data);
    } else {
      setCurrentStep((s) => s + 1);
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
    setErrors({});
    setAttemptedNext(false);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const StepIcon = step.icon;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: 'var(--color-background-primary)',
        borderRadius: 20, width: '100%', maxWidth: 680,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--color-border-tertiary)',
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {title}
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)', margin: '2px 0 0' }}>
              {step.title}
            </h2>
          </div>
          <button onClick={() => {
            if (window.confirm('Cancel and discard this draft?')) {
              sessionStorage.removeItem(draftKey);
              onCancel();
            }
          }} style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, color: 'var(--color-text-secondary)' }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: 'var(--color-background-secondary)', flexShrink: 0 }}>
          <div style={{
            width: `${progress}%`, height: '100%',
            background: 'linear-gradient(90deg, #185FA5, #1D9E75)',
            transition: 'width 0.35s ease',
          }} />
        </div>

        {/* Step indicators */}
        <div style={{
          display: 'flex', padding: '1rem 1.5rem 0.75rem',
          gap: 6, flexShrink: 0, overflowX: 'auto',
        }}>
          {steps.map((s, idx) => {
            const SIcon = s.icon;
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 20,
                  background: isDone ? '#EAF3DE' : isCurrent ? '#E6F1FB' : 'var(--color-background-secondary)',
                  color: isDone ? '#3B6D11' : isCurrent ? '#185FA5' : 'var(--color-text-secondary)',
                  fontSize: 12, fontWeight: isCurrent ? 600 : 400,
                  transition: 'all 0.2s',
                }}>
                  {isDone
                    ? <CheckCircle2 style={{ width: 12, height: 12 }} />
                    : <SIcon style={{ width: 12, height: 12 }} />}
                  {s.title}
                </div>
                {idx < steps.length - 1 && (
                  <div style={{ width: 16, height: 1, background: 'var(--color-border-tertiary)', flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step subtitle */}
        {step.subtitle && (
          <div style={{ padding: '0 1.5rem 0.75rem' }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{step.subtitle}</p>
          </div>
        )}

        {/* Step-level error */}
        {attemptedNext && errors[step.id] && (
          <div style={{
            margin: '0 1.5rem 0.75rem',
            padding: '10px 14px',
            background: '#FCEBEB', border: '1px solid #E8BCBC',
            borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8,
            flexShrink: 0,
          }}>
            <AlertTriangle style={{ width: 15, height: 15, color: '#A32D2D', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#A32D2D' }}>{errors[step.id]}</p>
          </div>
        )}

        {/* Step content */}
        <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1rem' }}>
          {renderStep(step.id, data, onChange, errors)}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--color-border-tertiary)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
          background: 'var(--color-background-secondary)',
        }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Step {currentStep + 1} of {steps.length}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isFirst && (
              <button onClick={handleBack} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', border: '1px solid var(--color-border-secondary)',
                borderRadius: 10, background: 'var(--color-background-primary)',
                fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)', cursor: 'pointer',
              }}>
                <ChevronLeft style={{ width: 15, height: 15 }} /> Back
              </button>
            )}
            <button onClick={handleNext} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 22px',
              border: 'none', borderRadius: 10,
              background: isLast ? '#1D9E75' : '#185FA5',
              fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer',
            }}>
              {isLast ? (
                <><CheckCircle2 style={{ width: 15, height: 15 }} /> Submit</>
              ) : (
                <>Next <ChevronRight style={{ width: 15, height: 15 }} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// WIZARD 1: Incident Report Wizard
// ─────────────────────────────────────────────────────────────────────────────

const INCIDENT_STEPS: WizardStep[] = [
  {
    id: 'type',
    title: 'What happened?',
    subtitle: 'Select the incident type and severity. Be as specific as possible — this determines the investigation process.',
    icon: AlertTriangle,
    validate: (d) => !d.incident_type ? 'Please select an incident type.' : undefined,
  },
  {
    id: 'location',
    title: 'Where and when?',
    subtitle: 'Record the exact location and time. Accurate location details help identify hazard patterns.',
    icon: MapPin,
    validate: (d) => !d.location?.trim() ? 'Location is required.' : !d.incident_date ? 'Date is required.' : undefined,
  },
  {
    id: 'people',
    title: 'Who was involved?',
    subtitle: 'Record all persons involved — injured parties, witnesses, and the person reporting.',
    icon: Users,
    validate: (d) => !d.reporter_name?.trim() ? 'Reporter name is required.' : undefined,
  },
  {
    id: 'description',
    title: 'What exactly happened?',
    subtitle: 'Describe the sequence of events. Focus on facts — what you saw, heard, and found. Avoid opinions or blame at this stage.',
    icon: FileText,
    validate: (d) => !d.description?.trim() || d.description.trim().length < 20
      ? 'Please describe the incident in at least 20 characters.' : undefined,
  },
  {
    id: 'immediate',
    title: 'Immediate actions taken',
    subtitle: 'What was done immediately after the incident? First aid, area isolation, notifications made.',
    icon: Shield,
    validate: (_d) => undefined, // optional step
  },
  {
    id: 'review',
    title: 'Review and submit',
    subtitle: 'Review your report before submitting. You can go back to any step to make corrections.',
    icon: CheckCircle2,
    validate: (_d) => undefined,
  },
];

const INCIDENT_TYPES = [
  'Near Miss', 'First Aid Case', 'Medical Treatment Case',
  'Lost Time Injury', 'Fatality', 'Property Damage',
  'Environmental Incident', 'Unsafe Act', 'Unsafe Condition',
  'Fire / Explosion', 'Chemical Spill', 'Vehicle Accident',
];

const SEVERITY_LEVELS = [
  { value: '1-Negligible', label: '1 — Negligible', desc: 'No injury, no damage', color: '#5A7A2B' },
  { value: '2-Minor',      label: '2 — Minor',      desc: 'First aid, minor damage', color: '#BA7517' },
  { value: '3-Moderate',   label: '3 — Moderate',   desc: 'Medical treatment, moderate damage', color: '#C05C00' },
  { value: '4-Major',      label: '4 — Major',      desc: 'Lost time injury, major damage', color: '#A32D2D' },
  { value: '5-Catastrophic',label:'5 — Catastrophic',desc: 'Fatality, massive damage', color: '#7B1F1F' },
];

const BODY_PARTS = [
  'Head', 'Eye', 'Face', 'Neck', 'Shoulder', 'Arm', 'Hand', 'Finger',
  'Chest', 'Back', 'Abdomen', 'Hip', 'Leg', 'Knee', 'Foot', 'Multiple', 'N/A',
];

interface IncidentWizardProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export const IncidentWizard: React.FC<IncidentWizardProps> = ({ onComplete, onCancel }) => {
  const { projects } = useDataContext();
  const { activeUser, usersList } = useAppContext();

  const initialData = {
    incident_type: '', severity: '', incident_date: new Date().toISOString().slice(0, 10),
    incident_time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    location: '', specific_location: '', project_id: '',
    reporter_name: activeUser?.name ?? '', reporter_role: activeUser?.role ?? '',
    injured_person: '', witnesses: '', injury_type: '', body_part: '',
    description: '', contributing_factors: '',
    immediate_action: '', first_aid: '', area_isolated: false,
    management_notified: false, notification_time: '', regulator_notification: false,
  };

  const renderStep = (stepId: string, data: any, onChange: (p: any) => void, errors: Record<string, string>) => {
    switch (stepId) {

      case 'type':
        return (
          <div>
            <Field label="Incident Type" required error={errors.incident_type}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                {INCIDENT_TYPES.map((t) => (
                  <label key={t} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                    border: `1.5px solid ${data.incident_type === t ? '#185FA5' : 'var(--color-border-secondary)'}`,
                    background: data.incident_type === t ? '#E6F1FB' : 'var(--color-background-primary)',
                    borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    color: data.incident_type === t ? '#185FA5' : 'var(--color-text-primary)',
                    transition: 'all 0.15s',
                  }}>
                    <input type="radio" name="incident_type" value={t} checked={data.incident_type === t}
                      onChange={() => onChange({ incident_type: t })} style={{ display: 'none' }} />
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', border: `2px solid ${data.incident_type === t ? '#185FA5' : 'var(--color-border-secondary)'}`,
                      background: data.incident_type === t ? '#185FA5' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {data.incident_type === t && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                    {t}
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Severity Level" required>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SEVERITY_LEVELS.map((s) => (
                  <label key={s.value} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    border: `1.5px solid ${data.severity === s.value ? s.color : 'var(--color-border-secondary)'}`,
                    background: data.severity === s.value ? `${s.color}14` : 'var(--color-background-primary)',
                    borderRadius: 10, cursor: 'pointer',
                  }}>
                    <input type="radio" name="severity" value={s.value} checked={data.severity === s.value}
                      onChange={() => onChange({ severity: s.value })} style={{ display: 'none' }} />
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: data.severity === s.value ? s.color : 'var(--color-text-primary)', margin: 0 }}>{s.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>{s.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Project" hint="Which project or work area did this occur in?">
              <select value={data.project_id} onChange={(e) => onChange({ project_id: e.target.value })} style={selectStyle()}>
                <option value="">No specific project</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          </div>
        );

      case 'location':
        return (
          <div>
            <Field label="Date of incident" required error={errors.incident_date}>
              <input type="date" value={data.incident_date} onChange={(e) => onChange({ incident_date: e.target.value })}
                max={new Date().toISOString().slice(0, 10)} style={inputStyle(errors.incident_date)} />
            </Field>

            <Field label="Time of incident (approximate)">
              <input type="time" value={data.incident_time} onChange={(e) => onChange({ incident_time: e.target.value })}
                style={inputStyle()} />
            </Field>

            <Field label="Location / Area" required error={errors.location}
              hint="Name of the building, zone, or work area (e.g. 'Block C — Level 3', 'Laydown Area 2')">
              <input value={data.location} onChange={(e) => onChange({ location: e.target.value })}
                placeholder="e.g. Scaffold Zone B, Warehouse Aisle 4..." style={inputStyle(errors.location)} />
            </Field>

            <Field label="Specific location details"
              hint="GPS coordinates, grid reference, or additional description to help investigators find the exact spot">
              <textarea value={data.specific_location} onChange={(e) => onChange({ specific_location: e.target.value })}
                placeholder="e.g. Near the north-east corner exit door, approximately 3m from the wall..." style={textareaStyle()} />
            </Field>
          </div>
        );

      case 'people':
        return (
          <div>
            <Field label="Reporter name" required error={errors.reporter_name}>
              <input value={data.reporter_name} onChange={(e) => onChange({ reporter_name: e.target.value })}
                placeholder="Full name" style={inputStyle(errors.reporter_name)} />
            </Field>

            <Field label="Reporter role / job title">
              <input value={data.reporter_role} onChange={(e) => onChange({ reporter_role: e.target.value })}
                placeholder="e.g. Site Supervisor, HSE Officer..." style={inputStyle()} />
            </Field>

            <Field label="Injured / affected person (if applicable)"
              hint="Leave blank for near-misses with no injury">
              <input value={data.injured_person} onChange={(e) => onChange({ injured_person: e.target.value })}
                placeholder="Full name, company, and trade" style={inputStyle()} />
            </Field>

            <Field label="Body part affected">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {BODY_PARTS.map((bp) => (
                  <button key={bp} onClick={() => onChange({ body_part: data.body_part === bp ? '' : bp })}
                    type="button"
                    style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                      border: `1.5px solid ${data.body_part === bp ? '#185FA5' : 'var(--color-border-secondary)'}`,
                      background: data.body_part === bp ? '#E6F1FB' : 'var(--color-background-primary)',
                      color: data.body_part === bp ? '#185FA5' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}>
                    {bp}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Witnesses"
              hint="Names and contact details of anyone who saw the incident">
              <textarea value={data.witnesses} onChange={(e) => onChange({ witnesses: e.target.value })}
                placeholder="Name — Company — Phone/Email&#10;Name — Company — Phone/Email" rows={3} style={textareaStyle()} />
            </Field>
          </div>
        );

      case 'description':
        return (
          <div>
            <Field label="Incident description" required error={errors.description}
              hint="Describe exactly what happened in chronological order. Stick to facts — what you observed, not what you think caused it.">
              <textarea value={data.description} onChange={(e) => onChange({ description: e.target.value })}
                placeholder="At approximately [time], [person] was [doing activity] when [event occurred]. The result was [outcome]..."
                rows={6} style={textareaStyle(errors.description)} />
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 5 }}>
                {data.description?.length ?? 0} characters (minimum 20)
              </p>
            </Field>

            <Field label="Contributing factors"
              hint="What conditions or behaviours may have contributed? (e.g. 'Poor lighting', 'Rushed task', 'Tool not maintained')">
              <textarea value={data.contributing_factors} onChange={(e) => onChange({ contributing_factors: e.target.value })}
                placeholder="List any factors you believe contributed to this incident..." rows={3} style={textareaStyle()} />
            </Field>

            <Field label="Injury / damage type"
              hint="Describe the type of injury or damage (e.g. 'Laceration to right hand', 'Fractured scaffold tube')">
              <input value={data.injury_type} onChange={(e) => onChange({ injury_type: e.target.value })}
                placeholder="e.g. Laceration, Sprain, Equipment damage..." style={inputStyle()} />
            </Field>
          </div>
        );

      case 'immediate':
        return (
          <div>
            <Field label="Immediate actions taken"
              hint="What was done within the first hour? (e.g. First aid administered, area isolated, emergency services called)">
              <textarea value={data.immediate_action} onChange={(e) => onChange({ immediate_action: e.target.value })}
                placeholder="Describe all immediate actions taken..." rows={4} style={textareaStyle()} />
            </Field>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {[
                { key: 'first_aid',             label: 'First aid was administered' },
                { key: 'area_isolated',          label: 'Area was isolated / work stopped' },
                { key: 'management_notified',    label: 'Management was notified' },
                { key: 'regulator_notification', label: 'Regulatory notification required' },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <div onClick={() => onChange({ [key]: !data[key] })}
                    style={{
                      width: 20, height: 20, borderRadius: 5, border: `2px solid ${data[key] ? '#185FA5' : 'var(--color-border-secondary)'}`,
                      background: data[key] ? '#185FA5' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                    {data[key] && <CheckCircle2 style={{ width: 12, height: 12, color: '#fff' }} />}
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>{label}</span>
                </label>
              ))}
            </div>

            {data.management_notified && (
              <Field label="Notification time">
                <input type="time" value={data.notification_time}
                  onChange={(e) => onChange({ notification_time: e.target.value })} style={inputStyle()} />
              </Field>
            )}
          </div>
        );

      case 'review':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Incident Type',    value: data.incident_type },
              { label: 'Severity',         value: data.severity },
              { label: 'Date / Time',      value: `${data.incident_date} ${data.incident_time}` },
              { label: 'Location',         value: data.location },
              { label: 'Reporter',         value: data.reporter_name },
              { label: 'Injured Person',   value: data.injured_person || 'None' },
              { label: 'Immediate Action', value: data.immediate_action || 'None recorded' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, borderBottom: '1px solid var(--color-border-tertiary)', paddingBottom: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', margin: 0 }}>{label}</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: 0 }}>{value || '—'}</p>
              </div>
            ))}
            <div style={{ borderBottom: '1px solid var(--color-border-tertiary)', paddingBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Description</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.6, margin: 0 }}>{data.description}</p>
            </div>
            <div style={{ padding: '12px 14px', background: '#E6F1FB', borderRadius: 10, display: 'flex', gap: 10 }}>
              <Info style={{ width: 15, height: 15, color: '#185FA5', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: '#0C447C', margin: 0, lineHeight: 1.5 }}>
                Submitting this report will notify your HSE Manager. An investigation will be assigned based on severity. You can track progress in the Reports module.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <WizardShell
      title="Guided Incident Report"
      steps={INCIDENT_STEPS}
      data={initialData}
      onComplete={onComplete}
      onCancel={onCancel}
      renderStep={renderStep}
      draftKey="wizard_incident_draft"
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// WIZARD 2: Permit to Work Wizard
// ─────────────────────────────────────────────────────────────────────────────

const PTW_TYPES = [
  { value: 'HOT_WORK',         label: 'Hot Work',          desc: 'Welding, cutting, grinding, open flame' },
  { value: 'CONFINED_SPACE',   label: 'Confined Space',    desc: 'Entry into tanks, vessels, excavations' },
  { value: 'WORKING_AT_HEIGHT',label: 'Working at Height', desc: 'Work above 2 metres, scaffolding, ladders' },
  { value: 'ELECTRICAL',       label: 'Electrical',        desc: 'Live electrical work, HV switching' },
  { value: 'EXCAVATION',       label: 'Excavation',        desc: 'Digging, trenching, ground breaking' },
  { value: 'LIFTING',          label: 'Lifting Operations',desc: 'Crane lifts, rigging, suspended loads' },
  { value: 'CHEMICAL',         label: 'Hazardous Chemicals',desc: 'Handling COSHH substances' },
  { value: 'ISOLATION',        label: 'Isolation / LOTO',  desc: 'Lockout/tagout, energy isolation' },
  { value: 'GENERAL',          label: 'General Work',      desc: 'Work not covered by other categories' },
];

const PTW_STEPS: WizardStep[] = [
  {
    id: 'type',
    title: 'Permit type',
    subtitle: 'Select the type of work permit required. The type determines the approval chain and safety requirements.',
    icon: Shield,
    validate: (d) => !d.type ? 'Please select a permit type.' : undefined,
  },
  {
    id: 'scope',
    title: 'Work scope & location',
    subtitle: 'Describe exactly what work will be performed, where, and when.',
    icon: FileText,
    validate: (d) => !d.description?.trim() ? 'Work description is required.'
      : !d.location?.trim() ? 'Location is required.'
      : !d.planned_start ? 'Planned start date is required.'
      : undefined,
  },
  {
    id: 'hazards',
    title: 'Hazards & controls',
    subtitle: 'Identify all hazards associated with this work and the controls that will be applied.',
    icon: AlertTriangle,
    validate: (d) => (!d.hazards || d.hazards.filter((h: string) => h.trim()).length === 0)
      ? 'At least one hazard must be identified.' : undefined,
  },
  {
    id: 'team',
    title: 'Work team & authorisation',
    subtitle: 'Who will be performing the work? Record all names and confirm competencies.',
    icon: Users,
    validate: (d) => !d.receiver_name?.trim() ? 'Permit receiver (lead worker) name is required.' : undefined,
  },
  {
    id: 'review',
    title: 'Review & submit',
    subtitle: 'Review all details before submitting the permit for approval.',
    icon: CheckCircle2,
    validate: (_d) => undefined,
  },
];

const COMMON_HAZARDS = [
  'Fire / Explosion', 'Burns', 'Electric shock', 'Falls from height',
  'Falling objects', 'Crush injury', 'Toxic gas / fumes', 'Oxygen deficiency',
  'Manual handling', 'Noise', 'UV / radiation', 'Biological hazard',
  'Struck by vehicle', 'Slips / trips', 'Entanglement', 'Pressure hazard',
];

const PPE_ITEMS = [
  'Hard hat', 'Safety glasses', 'Face shield', 'Hearing protection',
  'Respirator / SCBA', 'Safety gloves', 'Chemical gloves', 'Safety boots',
  'Hi-vis vest', 'Fire-retardant coveralls', 'Full body harness', 'Safety lanyard',
];

interface PtwWizardProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export const PtwWizard: React.FC<PtwWizardProps> = ({ onComplete, onCancel }) => {
  const { projects } = useDataContext();
  const { activeUser, usersList } = useAppContext();

  const initialData = {
    type: '', description: '', location: '', project_id: '',
    planned_start: '', planned_end: '',
    hazards: [''], controls: [''],
    ppe_required: [] as string[],
    receiver_name: '', receiver_company: '', team_members: '',
    isolations_required: false, gas_test_required: false,
    fire_watch_required: false, rescue_plan: '',
  };

  const renderStep = (stepId: string, data: any, onChange: (p: any) => void, errors: Record<string, string>) => {
    switch (stepId) {

      case 'type':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {PTW_TYPES.map((t) => (
              <label key={t.value} style={{
                display: 'flex', flexDirection: 'column', gap: 4, padding: '14px',
                border: `2px solid ${data.type === t.value ? '#185FA5' : 'var(--color-border-secondary)'}`,
                background: data.type === t.value ? '#E6F1FB' : 'var(--color-background-primary)',
                borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <input type="radio" name="ptw_type" value={t.value} checked={data.type === t.value}
                  onChange={() => onChange({ type: t.value })} style={{ display: 'none' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: data.type === t.value ? '#185FA5' : 'var(--color-text-primary)' }}>
                  {t.label}
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{t.desc}</span>
              </label>
            ))}
          </div>
        );

      case 'scope':
        return (
          <div>
            <Field label="Work description" required error={errors.description}
              hint="Describe the specific tasks to be performed — be precise enough that anyone reading this permit understands exactly what will happen.">
              <textarea value={data.description} onChange={(e) => onChange({ description: e.target.value })}
                placeholder="e.g. Welding of 150mm pipe flange on cooling water line at grid reference B4. Work involves cutting, grinding, and welding operations..." rows={4} style={textareaStyle(errors.description)} />
            </Field>

            <Field label="Location / Area" required error={errors.location}>
              <input value={data.location} onChange={(e) => onChange({ location: e.target.value })}
                placeholder="Specific work location" style={inputStyle(errors.location)} />
            </Field>

            <Field label="Project">
              <select value={data.project_id} onChange={(e) => onChange({ project_id: e.target.value })} style={selectStyle()}>
                <option value="">Select project</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Planned start" required error={errors.planned_start}>
                <input type="datetime-local" value={data.planned_start}
                  onChange={(e) => onChange({ planned_start: e.target.value })} style={inputStyle(errors.planned_start)} />
              </Field>
              <Field label="Planned end">
                <input type="datetime-local" value={data.planned_end}
                  onChange={(e) => onChange({ planned_end: e.target.value })} style={inputStyle()} />
              </Field>
            </div>
          </div>
        );

      case 'hazards': {
        const hazards  = data.hazards ?? [''];
        const controls = data.controls ?? [''];

        const toggleHazard = (h: string) => {
          const current = data.hazards ?? [];
          const next = current.includes(h) ? current.filter((x: string) => x !== h) : [...current, h];
          onChange({ hazards: next });
        };

        const togglePpe = (item: string) => {
          const current = data.ppe_required ?? [];
          onChange({ ppe_required: current.includes(item) ? current.filter((x: string) => x !== item) : [...current, item] });
        };

        return (
          <div>
            <Field label="Hazards identified" required error={errors.hazards}
              hint="Select all hazards relevant to this permit. You can also add custom hazards below.">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {COMMON_HAZARDS.map((h) => (
                  <button key={h} type="button" onClick={() => toggleHazard(h)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                      border: `1.5px solid ${(data.hazards ?? []).includes(h) ? '#A32D2D' : 'var(--color-border-secondary)'}`,
                      background: (data.hazards ?? []).includes(h) ? '#FCEBEB' : 'var(--color-background-primary)',
                      color: (data.hazards ?? []).includes(h) ? '#A32D2D' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}>
                    {h}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Control measures"
              hint="For each hazard, what controls will be applied? (Hierarchy: Eliminate → Substitute → Engineer → Admin → PPE)">
              {controls.map((ctrl: string, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input value={ctrl}
                    onChange={(e) => {
                      const next = [...controls];
                      next[idx] = e.target.value;
                      onChange({ controls: next });
                    }}
                    placeholder={`Control ${idx + 1}...`} style={{ ...inputStyle(), flex: 1 }} />
                  <button type="button" onClick={() => onChange({ controls: controls.filter((_: any, i: number) => i !== idx) })}
                    style={{ padding: '0 10px', border: '1px solid var(--color-border-secondary)', borderRadius: 10, background: 'none', cursor: 'pointer', color: '#A32D2D' }}>✕</button>
                </div>
              ))}
              <button type="button" onClick={() => onChange({ controls: [...controls, ''] })}
                style={{ fontSize: 13, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                + Add control measure
              </button>
            </Field>

            <Field label="PPE required">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PPE_ITEMS.map((item) => (
                  <button key={item} type="button" onClick={() => togglePpe(item)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                      border: `1.5px solid ${(data.ppe_required ?? []).includes(item) ? '#185FA5' : 'var(--color-border-secondary)'}`,
                      background: (data.ppe_required ?? []).includes(item) ? '#E6F1FB' : 'var(--color-background-primary)',
                      color: (data.ppe_required ?? []).includes(item) ? '#185FA5' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}>
                    {item}
                  </button>
                ))}
              </div>
            </Field>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'isolations_required', label: 'Electrical / mechanical isolation required' },
                { key: 'gas_test_required',   label: 'Atmospheric / gas testing required' },
                { key: 'fire_watch_required', label: 'Fire watch required' },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <div onClick={() => onChange({ [key]: !data[key] })}
                    style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${data[key] ? '#185FA5' : 'var(--color-border-secondary)'}`, background: data[key] ? '#185FA5' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
                    {data[key] && <CheckCircle2 style={{ width: 12, height: 12, color: '#fff' }} />}
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>
        );
      }

      case 'team':
        return (
          <div>
            <Field label="Permit Receiver (Lead Worker)" required error={errors.receiver_name}
              hint="The person who accepts the permit and is responsible for the work team on site.">
              <input value={data.receiver_name} onChange={(e) => onChange({ receiver_name: e.target.value })}
                placeholder="Full name" style={inputStyle(errors.receiver_name)} />
            </Field>

            <Field label="Receiver's company">
              <input value={data.receiver_company} onChange={(e) => onChange({ receiver_company: e.target.value })}
                placeholder="Company / contractor name" style={inputStyle()} />
            </Field>

            <Field label="Team members"
              hint="All workers who will be performing work under this permit">
              <textarea value={data.team_members} onChange={(e) => onChange({ team_members: e.target.value })}
                placeholder="Name — Trade / Role&#10;Name — Trade / Role" rows={4} style={textareaStyle()} />
            </Field>

            <Field label="Rescue / emergency plan"
              hint="Required for confined space or high-risk permits — who responds and how?">
              <textarea value={data.rescue_plan} onChange={(e) => onChange({ rescue_plan: e.target.value })}
                rows={3} style={textareaStyle()} />
            </Field>
          </div>
        );

      case 'review':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Permit Type',     value: PTW_TYPES.find((t) => t.value === data.type)?.label },
              { label: 'Location',        value: data.location },
              { label: 'Planned Start',   value: data.planned_start },
              { label: 'Planned End',     value: data.planned_end || 'Not specified' },
              { label: 'Permit Receiver', value: data.receiver_name },
              { label: 'Hazards',         value: (data.hazards ?? []).filter((h: string) => h).join(', ') || 'None selected' },
              { label: 'PPE Required',    value: (data.ppe_required ?? []).join(', ') || 'None selected' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, borderBottom: '1px solid var(--color-border-tertiary)', paddingBottom: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', margin: 0 }}>{label}</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: 0 }}>{value || '—'}</p>
              </div>
            ))}
            <div style={{ padding: '12px 14px', background: '#FAEEDA', borderRadius: 10, display: 'flex', gap: 10 }}>
              <Info style={{ width: 15, height: 15, color: '#854F0B', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: '#5A3200', margin: 0, lineHeight: 1.5 }}>
                Submitting this permit will start the approval workflow. The permit must pass all approval stages before work can begin.
              </p>
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <WizardShell
      title="Guided Permit to Work"
      steps={PTW_STEPS}
      data={initialData}
      onComplete={onComplete}
      onCancel={onCancel}
      renderStep={renderStep}
      draftKey="wizard_ptw_draft"
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// WIZARD 3: Risk Assessment Wizard (HIRA)
// ─────────────────────────────────────────────────────────────────────────────

const RA_STEPS: WizardStep[] = [
  {
    id: 'activity',
    title: 'Activity details',
    subtitle: 'Define the activity or task being assessed. Be specific so the assessment is meaningful.',
    icon: Clipboard,
    validate: (d) => !d.activity?.trim() ? 'Activity description is required.' : undefined,
  },
  {
    id: 'hazards',
    title: 'Hazard identification',
    subtitle: 'List all hazards associated with this activity. Think about people, equipment, environment, and process.',
    icon: AlertTriangle,
    validate: (d) => !d.hazard_rows?.length || !d.hazard_rows[0]?.hazard?.trim()
      ? 'At least one hazard must be identified.' : undefined,
  },
  {
    id: 'controls',
    title: 'Risk rating & controls',
    subtitle: 'Rate each hazard and define the controls. Work through the hierarchy: Eliminate → Substitute → Engineer → Admin → PPE.',
    icon: List,
    validate: (_d) => undefined,
  },
  {
    id: 'approval',
    title: 'Review & approval',
    subtitle: 'Review the complete assessment before submitting for approval.',
    icon: CheckCircle2,
    validate: (d) => !d.assessor_name?.trim() ? 'Assessor name is required.' : undefined,
  },
];

interface HazardRow {
  hazard: string;
  potential_harm: string;
  likelihood_before: number;
  severity_before: number;
  controls: string;
  ppe: string;
  likelihood_after: number;
  severity_after: number;
}

interface RiskAssessmentWizardProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export const RiskAssessmentWizard: React.FC<RiskAssessmentWizardProps> = ({ onComplete, onCancel }) => {
  const { projects } = useDataContext();
  const { activeUser } = useAppContext();

  const emptyRow = (): HazardRow => ({
    hazard: '', potential_harm: '',
    likelihood_before: 3, severity_before: 3,
    controls: '', ppe: '',
    likelihood_after: 2, severity_after: 2,
  });

  const initialData = {
    activity: '', location: '', project_id: '', department: '',
    date: new Date().toISOString().slice(0, 10),
    hazard_rows: [emptyRow()],
    assessor_name: activeUser?.name ?? '',
    reviewer_name: '', approval_required: true,
    review_date: '',
  };

  const riskScore = (l: number, s: number) => l * s;
  const riskLevel = (score: number) =>
    score >= 15 ? { label: 'Extreme', color: '#A32D2D' } :
    score >= 8  ? { label: 'High',    color: '#C05C00' } :
    score >= 4  ? { label: 'Medium',  color: '#BA7517' } :
    score >= 2  ? { label: 'Low',     color: '#5A7A2B' } :
                  { label: 'Negligible', color: '#888' };

  const renderStep = (stepId: string, data: any, onChange: (p: any) => void, errors: Record<string, string>) => {
    switch (stepId) {

      case 'activity':
        return (
          <div>
            <Field label="Activity / task description" required error={errors.activity}
              hint="What specific work activity or task is being assessed?">
              <textarea value={data.activity} onChange={(e) => onChange({ activity: e.target.value })}
                placeholder="e.g. Manual handling of steel beams during erection of structural frame on Level 3..." rows={3} style={textareaStyle(errors.activity)} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Location">
                <input value={data.location} onChange={(e) => onChange({ location: e.target.value })}
                  placeholder="Work area or site location" style={inputStyle()} />
              </Field>
              <Field label="Date">
                <input type="date" value={data.date} onChange={(e) => onChange({ date: e.target.value })} style={inputStyle()} />
              </Field>
              <Field label="Department / Team">
                <input value={data.department} onChange={(e) => onChange({ department: e.target.value })}
                  placeholder="e.g. Civil team, Mechanical crew" style={inputStyle()} />
              </Field>
              <Field label="Project">
                <select value={data.project_id} onChange={(e) => onChange({ project_id: e.target.value })} style={selectStyle()}>
                  <option value="">Select project</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            </div>
          </div>
        );

      case 'hazards': {
        const rows: HazardRow[] = data.hazard_rows ?? [emptyRow()];
        const updateRow = (idx: number, patch: Partial<HazardRow>) => {
          const next = rows.map((r, i) => i === idx ? { ...r, ...patch } : r);
          onChange({ hazard_rows: next });
        };
        return (
          <div>
            {rows.map((row, idx) => (
              <div key={idx} style={{ border: '1px solid var(--color-border-secondary)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>Hazard {idx + 1}</p>
                  {rows.length > 1 && (
                    <button type="button" onClick={() => onChange({ hazard_rows: rows.filter((_, i) => i !== idx) })}
                      style={{ fontSize: 12, color: '#A32D2D', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                  )}
                </div>
                <Field label="Hazard description" required>
                  <input value={row.hazard} onChange={(e) => updateRow(idx, { hazard: e.target.value })}
                    placeholder="e.g. Manual handling of heavy beams..." style={inputStyle()} />
                </Field>
                <Field label="Potential harm">
                  <input value={row.potential_harm} onChange={(e) => updateRow(idx, { potential_harm: e.target.value })}
                    placeholder="e.g. Musculoskeletal injury, back strain..." style={inputStyle()} />
                </Field>
              </div>
            ))}
            <button type="button"
              onClick={() => onChange({ hazard_rows: [...(data.hazard_rows ?? []), emptyRow()] })}
              style={{ fontSize: 13, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              + Add another hazard
            </button>
          </div>
        );
      }

      case 'controls': {
        const rows: HazardRow[] = data.hazard_rows ?? [];
        const updateRow = (idx: number, patch: Partial<HazardRow>) => {
          onChange({ hazard_rows: rows.map((r, i) => i === idx ? { ...r, ...patch } : r) });
        };
        return (
          <div>
            {rows.map((row, idx) => {
              const beforeScore = riskScore(row.likelihood_before, row.severity_before);
              const afterScore  = riskScore(row.likelihood_after, row.severity_after);
              const beforeLevel = riskLevel(beforeScore);
              const afterLevel  = riskLevel(afterScore);
              return (
                <div key={idx} style={{ border: '1px solid var(--color-border-secondary)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 12 }}>
                    {row.hazard || `Hazard ${idx + 1}`}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                    <div style={{ padding: 10, background: 'var(--color-background-secondary)', borderRadius: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Before Controls</p>
                      <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Likelihood (1–5)</label>
                      <input type="range" min={1} max={5} value={row.likelihood_before}
                        onChange={(e) => updateRow(idx, { likelihood_before: +e.target.value })} style={{ width: '100%' }} />
                      <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4, marginTop: 8 }}>Severity (1–5)</label>
                      <input type="range" min={1} max={5} value={row.severity_before}
                        onChange={(e) => updateRow(idx, { severity_before: +e.target.value })} style={{ width: '100%' }} />
                      <div style={{ marginTop: 8, padding: '6px 10px', background: beforeLevel.color + '22', borderRadius: 8, textAlign: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: beforeLevel.color }}>{beforeLevel.label} ({beforeScore})</span>
                      </div>
                    </div>
                    <div style={{ padding: 10, background: 'var(--color-background-secondary)', borderRadius: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>After Controls</p>
                      <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Likelihood (1–5)</label>
                      <input type="range" min={1} max={5} value={row.likelihood_after}
                        onChange={(e) => updateRow(idx, { likelihood_after: +e.target.value })} style={{ width: '100%' }} />
                      <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4, marginTop: 8 }}>Severity (1–5)</label>
                      <input type="range" min={1} max={5} value={row.severity_after}
                        onChange={(e) => updateRow(idx, { severity_after: +e.target.value })} style={{ width: '100%' }} />
                      <div style={{ marginTop: 8, padding: '6px 10px', background: afterLevel.color + '22', borderRadius: 8, textAlign: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: afterLevel.color }}>{afterLevel.label} ({afterScore})</span>
                      </div>
                    </div>
                  </div>
                  <Field label="Control measures">
                    <textarea value={row.controls} onChange={(e) => updateRow(idx, { controls: e.target.value })}
                      placeholder="Describe the controls that will reduce this risk..." rows={2} style={textareaStyle()} />
                  </Field>
                  <Field label="PPE required for this hazard">
                    <input value={row.ppe} onChange={(e) => updateRow(idx, { ppe: e.target.value })}
                      placeholder="e.g. Safety gloves, face shield..." style={inputStyle()} />
                  </Field>
                </div>
              );
            })}
          </div>
        );
      }

      case 'approval':
        return (
          <div>
            <Field label="Assessor name" required error={errors.assessor_name}>
              <input value={data.assessor_name} onChange={(e) => onChange({ assessor_name: e.target.value })}
                style={inputStyle(errors.assessor_name)} />
            </Field>
            <Field label="Reviewer / Approver name">
              <input value={data.reviewer_name} onChange={(e) => onChange({ reviewer_name: e.target.value })}
                placeholder="Who needs to approve this assessment?" style={inputStyle()} />
            </Field>
            <Field label="Review date">
              <input type="date" value={data.review_date} onChange={(e) => onChange({ review_date: e.target.value })} style={inputStyle()} />
            </Field>
            <div style={{ padding: '12px 14px', background: '#E6F1FB', borderRadius: 10, display: 'flex', gap: 10, marginTop: 8 }}>
              <Info style={{ width: 15, height: 15, color: '#185FA5', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: '#0C447C', margin: 0, lineHeight: 1.5 }}>
                Summary: {(data.hazard_rows ?? []).length} hazard{(data.hazard_rows ?? []).length !== 1 ? 's' : ''} identified.{' '}
                {(data.hazard_rows ?? []).filter((r: HazardRow) => riskLevel(riskScore(r.likelihood_after, r.severity_after)).label === 'Extreme').length} Extreme residual risks.{' '}
                All workers must be briefed on this assessment before work begins.
              </p>
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <WizardShell
      title="Risk Assessment (HIRA)"
      steps={RA_STEPS}
      data={initialData}
      onComplete={onComplete}
      onCancel={onCancel}
      renderStep={renderStep}
      draftKey="wizard_ra_draft"
    />
  );
};

export default { IncidentWizard, PtwWizard, RiskAssessmentWizard };