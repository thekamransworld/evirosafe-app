import React from 'react';
import { logoSrc } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, Sparkles, Map, Award, FileText, 
  CheckSquare, ClipboardList, FileSpreadsheet, ShieldAlert, 
  Signpost, Megaphone, GraduationCap, Users, Settings, 
  Building2, Activity 
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
}

const NavItem: React.FC<{
  label: string;
  view: string;
  icon: React.ReactNode;
  currentView: string;
  setCurrentView: (view: string) => void;
  isOpen: boolean;
}> = ({ label, view, icon, currentView, setCurrentView, isOpen }) => {
  const isActive = currentView === view;

  return (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex items-center w-full rounded-xl transition-all duration-200 group relative overflow-hidden mb-1
        ${isActive
          ? 'bg-cyan-500/20 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
          : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-50'}
        ${isOpen ? 'px-4 py-2.5 mx-2 w-auto' : 'h-10 w-10 justify-center mx-auto'}
      `}
    >
      {isActive && (
        <div className="absolute left-0 top-1 bottom-1 w-1 rounded-r-full bg-cyan-400" />
      )}
      <div className={`w-5 h-5 shrink-0 relative z-10 ${isActive ? 'text-cyan-300' : 'text-slate-500 group-hover:text-slate-200'}`}>
        {icon}
      </div>
      {isOpen && (
        <span className="ml-3 text-sm font-medium tracking-wide truncate relative z-10">
          {label}
        </span>
      )}
    </button>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  isOpen,
  setOpen,
}) => {
  const { logout, currentUser } = useAuth();

  const menuItems = [
    { label: 'Dashboard', view: 'dashboard', icon: <LayoutDashboard /> },
    { label: 'AI Insights', view: 'ai-insights', icon: <Sparkles /> },
    { label: 'Site Map', view: 'site-map', icon: <Map /> },
    { label: 'My Certificate', view: 'certification', icon: <Award /> },
    { label: 'Reporting', view: 'reports', icon: <FileText /> },
    { label: 'Action Tracker', view: 'actions', icon: <Activity /> },
    { label: 'Inspections', view: 'inspections', icon: <ClipboardList /> },
    { label: 'Permit to Work', view: 'ptw', icon: <CheckSquare /> },
    { label: 'Checklists', view: 'checklists', icon: <CheckSquare /> },
    { label: 'Plans', view: 'plans', icon: <FileSpreadsheet /> },
    { label: 'RAMS', view: 'rams', icon: <ShieldAlert /> },
    { label: 'Signage', view: 'signage', icon: <Signpost /> },
    { label: 'Toolbox Talks', view: 'tbt', icon: <Megaphone /> },
    { label: 'Training', view: 'training', icon: <GraduationCap /> },
    { label: 'Organizations', view: 'organizations', icon: <Building2 /> }, // Projects live here now
    { label: 'People', view: 'people', icon: <Users /> },
    { label: 'Settings', view: 'settings', icon: <Settings /> },
  ];

  return (
    <div className={`shrink-0 h-screen flex flex-col transition-all duration-300 z-50 border-r border-slate-800/60 bg-slate-950/80 backdrop-blur-xl ${isOpen ? 'w-64' : 'w-20'}`}>
      <div className={`flex items-center h-16 border-b border-slate-800/60 shrink-0 ${isOpen ? 'px-6' : 'justify-center'}`}>
        <img src={logoSrc} alt="Logo" className="w-8 h-8 rounded-lg" />
        {isOpen && <span className="ml-3 text-lg font-semibold text-slate-100 tracking-wide">EviroSafe</span>}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700/70 space-y-0.5">
        {menuItems.map((item) => (
          <NavItem
            key={item.view}
            label={item.label}
            view={item.view}
            icon={item.icon}
            isOpen={isOpen}
            currentView={currentView}
            setCurrentView={setCurrentView}
          />
        ))}
      </nav>

      <div className="p-2 border-t border-slate-800/60 bg-slate-950/70">
        <button onClick={() => setOpen(!isOpen)} className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 transition-colors">
          <svg className={`w-5 h-5 transition-transform ${!isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className={`p-4 border-t border-slate-800/60 bg-slate-950/80 ${!isOpen && 'flex flex-col items-center'}`}>
        <div className={`flex items-center gap-3 mb-4 ${isOpen ? 'px-2' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-slate-900 font-bold text-xs shrink-0 shadow-md">
            {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          {isOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-100 truncate">{currentUser?.email}</p>
              <p className="text-xs text-slate-500 truncate">Admin</p>
            </div>
          )}
        </div>
        <button onClick={() => logout()} className="w-full flex items-center justify-center p-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-medium">
          Sign Out
        </button>
      </div>
    </div>
  );
};