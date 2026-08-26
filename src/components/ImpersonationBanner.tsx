import React from 'react';
import { Eye, LogOut } from 'lucide-react';
import { useAppContext } from '../contexts';

// Shows whenever an ADMIN is viewing the app as another user (see
// AppContext.impersonateUser / stopImpersonating in contexts.tsx). Renders
// nothing otherwise. Deliberately full-width and high-contrast (unlike the
// muted DemoBanner) since acting as someone else is a sensitive capability
// that should never be easy to miss or forget you're in.
export const ImpersonationBanner: React.FC = () => {
  const { impersonatedUser, stopImpersonating } = useAppContext();

  if (!impersonatedUser) return null;

  return (
    <div className="w-full bg-purple-600 text-white text-sm">
      <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 flex-shrink-0" />
          <p className="font-medium">
            Viewing as <span className="font-semibold">{impersonatedUser.name}</span>
            {impersonatedUser.role && <span className="opacity-80"> ({impersonatedUser.role})</span>}
            <span className="opacity-80"> — this is not your account.</span>
          </p>
        </div>
        <button
          onClick={stopImpersonating}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 font-semibold text-xs transition-colors flex-shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          Exit
        </button>
      </div>
    </div>
  );
};