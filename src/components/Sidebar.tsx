import React from 'react';
import { logoSrc } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts';
import { 
  Home, Activity, Map, FileText, CheckSquare, ClipboardList, 
  FileCheck, AlertTriangle, Users, Settings, BookOpen, 
  Building2, Award, Zap
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
}

// Map view names to Lucide Icons
const iconMap: Record<string, React.ReactNode> = {
  'dashboard': <Home size={20} />,
  'ai-insights': <Zap size={20} />,
  'site-map': <Map size={20} />,
  'reports': <FileText size={20} />,
  'actions': <Activity size={20} />,
  'inspections': <ClipboardList size={20} />,
  'ptw': <FileCheck size={20} />,
  'checklists': <CheckSquare size={20} />,
  'plans': <BookOpen size={20} />,
  'rams': <ShieldIcon />,
  'signage': <AlertTriangle size={20} />,
  'tbt': <MegaphoneIcon />,
  'training': <Award size={20} />,
  'people': <Users size={20} />,
  'roles': <LockIcon />,
  'organizations': <Building2 size={20} />, 
  'projects': <BriefcaseIcon />,
  'settings': <Settings size={20} />,
  'housekeeping': <BroomIcon />,
  'certification': <BadgeCheckIcon />,
};

// Custom Icons 
function ShieldIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function MegaphoneIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>; }
function LockIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
function BriefcaseIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>; }
function BroomIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.6 12.4 12 18"/><path d="m14.8 15.2 2.8-2.8a2.5 2.5 0 0 0 0-3.5l-3.5-3.5a2.5 2.5 0 0 0-3.5 0L7.8 8.2"/><path d="m8 18 2 2 2-2"/></svg>; }
// Fixed Typo Here: strokeWidth={2}
function BadgeCheckIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 2 2 0 0 0 2.5-2.5"/></svg>; }

const NavItem: React.FC<{
  label: string;
  view: string;
  currentView: string;
  setCurrentView: (view: string) => void;
  isOpen: boolean;
}> = ({ label, view, currentView, setCurrentView, isOpen }) => {
  const isActive = currentView === view;

  return (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex items-center w-full transition-all duration-200 group relative overflow-hidden mb-1
        ${isOpen ? 'px-4 py-3 mx-2 rounded-xl w-auto' : 'h-12 w-12 justify-center mx-auto rounded-xl'}
        ${isActive
          ? 'bg-primary-500/10 text-primary-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}
      `}
      title={!isOpen ? label : ''}
    >
      {isActive && (
        <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary-500" />
      )}
      <div className={`shrink-0 relative z-10 ${isActive ? 'text-primary-400' : ''}`}>
        {iconMap[view] || <Home size={20} />}
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
  const { activeUser } = useAppContext();

  // Define menu items with required roles
  const menuItems = [
    { label: 'Dashboard', view: 'dashboard' },
    { label: 'AI Insights', view: 'ai-insights' },
    { label: 'Site Map', view: 'site-map' },
    
    { type: 'divider', label: 'Operations' },
    { label: 'Reporting', view: 'reports' },
    { label: 'Action Tracker', view: 'actions' },
    { label: 'Inspections', view: 'inspections' },
    { label: 'Permit to Work', view: 'ptw' },
    
    { type: 'divider', label: 'Docs & Plans' },
    { label: 'Checklists', view: 'checklists' },
    { label: 'Plans', view: 'plans' },
    { label: 'RAMS', view: 'rams' },
    { label: 'Signage', view: 'signage' },
    
    { type: 'divider', label: 'Learning' },
    { label: 'Toolbox Talks', view: 'tbt' },
    { label: 'Training', view: 'training' },
    { label: 'My Certificate', view: 'certification' },
    
    { type: 'divider', label: 'Management' },
    { label: 'Housekeeping', view: 'housekeeping' },
    { label: 'People', view: 'people' },
    { label: 'Projects', view: 'projects' },
    
    // Only show Organizations and Roles to Admins
    ...(activeUser?.role === 'ADMIN' || activeUser?.role === 'ORG_ADMIN' ? [
        { label: 'Organizations', view: 'organizations' },
        { label: 'Roles & Permissions', view: 'roles' }
    ] : []),

    { label: 'Settings', view: 'settings' },
  ];

  return (
    <div
      className={`shrink-0 h-screen flex flex-col transition-all duration-300 z-50
        border-r border-slate-800/60
        bg-slate-950/95 backdrop-blur-xl
        ${isOpen ? 'w-72' : 'w-20'}
      `}
    >
      {/* Header */}
      <div
        className={`flex items-center h-20 border-b border-slate-800/60 shrink-0
          ${isOpen ? 'px-6' : 'justify-center'}
        `}
      >
        <div className="flex items-center gap-3">
            <img src={logoSrc} alt="Logo" className="w-9 h-9 rounded-lg shadow-lg shadow-primary-500/20" />
            {isOpen && (
            <div>
                <span className="block text-lg font-bold text-slate-100 tracking-wide">
                EviroSafe
                </span>
                <span className="block text-[10px] text-primary-500 font-mono tracking-widest uppercase">
                Enterprise
                </span>
            </div>
            )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar space-y-1 px-0">
        {menuItems.map((item, index) => {
            if (item.type === 'divider') {
                return isOpen ? (
                    <div key={index} className="px-6 py-3 mt-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        {item.label}
                    </div>
                ) : <div key={index} className="h-4" />;
            }
            return (
                <NavItem
                    key={item.view}
                    label={item.label || ''}
                    view={item.view || ''}
                    isOpen={isOpen}
                    currentView={currentView}
                    setCurrentView={setCurrentView}
                />
            );
        })}
      </nav>

      {/* Footer Toggle */}
      <div className="p-2 border-t border-slate-800/60 bg-slate-950/50">
        <button
          onClick={() => setOpen(!isOpen)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors"
        >
          <svg
            className={`w-5 h-5 transition-transform duration-300 ${!isOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* User Profile */}
      <div className={`p-4 border-t border-slate-800/60 bg-slate-900/50 ${!isOpen && 'flex flex-col items-center'}`}>
        <div className={`flex items-center gap-3 mb-3 ${isOpen ? 'px-1' : ''}`}>
          <div className="relative">
             <img 
                src={activeUser?.avatar_url || "https://i.pravatar.cc/150?u=user"} 
                className="w-10 h-10 rounded-full border-2 border-slate-700 shadow-sm object-cover"
                alt="Profile"
             />
             <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-slate-900 rounded-full"></div>
          </div>
          
          {isOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">
                {activeUser?.name || currentUser?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-slate-500 truncate capitalize">{activeUser?.role?.replace('_', ' ').toLowerCase() || 'Guest'}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => logout()}
          className={`
            flex items-center justify-center p-2 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20
            ${isOpen ? 'w-full' : 'w-10 h-10'}
          `}
          title="Sign Out"
        >
          {isOpen ? 'Sign Out' : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>}
        </button>
      </div>
    </div>
  );
};