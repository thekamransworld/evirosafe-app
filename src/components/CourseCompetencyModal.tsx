import React, { useEffect, useState } from 'react';
import type { TrainingCourse } from '../types';
import { Button } from './ui/Button';
import { CompetencyTagEditor } from './ptw/CompetencyTagEditor';

/** Edit which permit-to-work competencies an existing course proves. */
export const CourseCompetencyModal: React.FC<{
  course: TrainingCourse | null;
  onClose: () => void;
  onSave: (course: TrainingCourse) => void;
}> = ({ course, onClose, onSave }) => {
  const [tags, setTags] = useState<string[]>([]);
  useEffect(() => { setTags(course?.competencies ?? []); }, [course]);
  if (!course) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="competency-title">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div>
          <h3 id="competency-title" className="text-lg font-bold text-gray-900 dark:text-white">Competency tags</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{course.title}</p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">Tick what this course proves. Permits to work then check that each worker holds a current certificate from a course carrying the tag they need.</p>
        <CompetencyTagEditor value={tags} onChange={setTags} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave({ ...course, competencies: tags }); onClose(); }} data-testid="save-tags">Save tags</Button>
        </div>
      </div>
    </div>
  );
};
