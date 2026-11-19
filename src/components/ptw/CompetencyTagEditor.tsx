import React from 'react';
import { COMPETENCY_KEYS, COMPETENCY_LABEL } from '../../lib/ptw/model';

/**
 * Tick the competencies a training course proves. A permit then checks that the
 * people on its team hold a current certificate for a course tagged with the
 * competency it needs. Until a course is tagged, the permit can only warn.
 */
export const CompetencyTagEditor: React.FC<{ value: string[]; onChange: (value: string[]) => void; disabled?: boolean }> = ({ value = [], onChange, disabled }) => {
  const toggle = (k: string) => onChange(value.includes(k) ? value.filter(x => x !== k) : [...value, k]);
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Competencies this course proves" data-testid="competency-tags">
      {COMPETENCY_KEYS.map(k => {
        const on = value.includes(k);
        return (
          <button key={k} type="button" disabled={disabled} onClick={() => toggle(k)} aria-pressed={on}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors disabled:opacity-50 ${on
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-emerald-500'}`}>
            {on ? '✓ ' : ''}{COMPETENCY_LABEL[k]}
          </button>
        );
      })}
    </div>
  );
};
