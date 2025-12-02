import React from 'react';
import { logoSrc } from '../config'; // Ensure this path is correct based on your folder structure
import { useAuth } from '../contexts/AuthContext';

// Simple types to avoid import errors
type View = string;

interface SidebarProps {
  currentView: any;
  setCurrentView: (view: any) => void;
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
}

const NavItem: React.FC<{
  icon: React.ReactElement;
  label: string;
  view: string;
  currentView: string;
  setCurrentView: (view: string) => void;
  isOpen: boolean;
}> = ({ icon, label, view, currentView, setCurrentView, isOpen }) => {
  const isActive = currentView === view;
  return (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex items-center w-full rounded-xl transition-all duration-200 group relative overflow-hidden mb-1 ${
        isActive
          ? 'bg-blue-600/20 text-white border border-blue-500/50'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      } ${isOpen ? 'px-4 py-3 mx-2 w-auto' : 'h-12 w-12 justify-center mx-auto'}`}
    >
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>}
      <div className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`}>
        {icon}
      </div>
      {isOpen && <span className="ml-3 text-sm font-medium tracking-wide truncate">{label}</span>}
    </button>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, isOpen, setOpen }) => {
    const { logout, currentUser } = useAuth(); 

    // Hardcoded menu items to bypass permissions check for now
    const menuItems = [
        { label: 'Dashboard', view: 'dashboard' },
        { label: 'AI Insights', view: 'ai-insights' },
        { label: 'Site Map', view: 'site-map' },
        { label: 'Reporting', view: 'reports' },
        { label: 'Action Tracker', view: 'actions' },
        { label: 'Inspections', view: 'inspections' },
        { label: 'Permit to Work', view: 'ptw' },
        { label: 'Checklists', view: 'checklists' },
        { label: 'Plans', view: 'plans' },
        { label: 'RAMS', view: 'rams' },
        { label: 'Signage', view: 'signage' },
        { label: 'Toolbox Talks', view: 'tbt' },
        { label: 'Training', view: 'training' },
        { label: 'People', view: 'people' },
        { label: 'Settings', view: 'settings' },
    ];

  return (
    <div className={`shrink-0 bg-slate-900 h-screen flex flex-col transition-all duration-300 z-50 border-r border-slate-800 ${isOpen ? 'w-64' : 'w-20'}`}>
        
        {/* Header / Logo */}
        <div className={`flex items-center h-16 border-b border-slate-800 shrink-0 ${isOpen ? 'px-6' : 'justify-center'}`}>
            <img src={logoSrc} alt="Logo" className="w-8 h-8 rounded-lg"/>
            {isOpen && <span className="ml-3 text-lg font-bold text-white">EviroSafe</span>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700/50 space-y-1">
            {menuItems.map(item => (
                <NavItem 
                    key={item.view} 
                    icon={<div className="w-4 h-4 bg-slate-600 rounded-full" />} // Placeholder icon
                    label={item.label} 
                    view={item.view} 
                    isOpen={isOpen} 
                    currentView={currentView} 
                    setCurrentView={setCurrentView} 
                />
            ))}
        </nav>
        
        {/* Toggle Button */}
        <div className="p-2 border-t border-slate-800 bg-slate-950/50">
            <button onClick={() => setOpen(!isOpen)} className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white transition-colors">
                {isOpen ? '<<' : '>>'}
            </button>
        </div>

        {/* User Footer */}
        <div className={`p-4 border-t border-slate-800 bg-slate-950 ${!isOpen && 'flex flex-col items-center'}`}>
            <div className={`flex items-center gap-3 mb-4 ${isOpen ? 'px-2' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                {isOpen && (
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{currentUser?.email}</p>
                    </div>
                )}
            </div>
            <button 
                onClick={() => logout()} 
                className={`w-full flex items-center ${isOpen ? 'justify-center' : 'justify-center'} p-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors`}
            >
                Sign Out
            </button>
        </div>
    </div>
  );
};