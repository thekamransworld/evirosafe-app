import React, { useState } from 'react';
import { logoSrc } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext, useDataContext } from '../contexts';
import { NotificationsPanel } from './NotificationsPanel';
import { Bell } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
}

// --- Icons Data ---
const icons: Record<string, JSX.Element> = {
  dashboard: <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />,
  'ai-insights': <path d="M13 10V3L4 14h7v7l9-11h-7z" />,
  'hse-statistics': <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />,
  'site-map': <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />,
  reports: <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 9V3.5L18.5 9H14z" />,
  actions: <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
  inspections: <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
  ptw: <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  checklists: <path d="M5 13l4 4L19 7" />,
  plans: <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
  rams: <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
  signage: <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
  tbt: <path d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />,
  training: <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
  people: <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
  settings: <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
  certification: <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
};

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
      <div
        className={`w-5 h-5 shrink-0 relative z-10 ${
          isActive
            ? 'text-cyan-300'
            : 'text-slate-500 group-hover:text-slate-200'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          {icons[view] || icons.dashboard}
        </svg>
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
  const { notifications } = useDataContext();
  const { activeUser } = useAppContext();
  const [showNotifications, setShowNotifications] = useState(false);

  // Calculate unread notifications for the current user
  const unreadCount = notifications.filter(n => n.user_id === activeUser?.id && !n.is_read).length;

  const menuItems = [
    { label: 'Dashboard', view: 'dashboard' },
    { label: 'AI Insights', view: 'ai-insights' },
    { label: 'HSE Statistics', view: 'hse-statistics' },
    { label: 'Site Map', view: 'site-map' },
    { label: 'My Certificate', view: 'certification' },
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
    { label: 'Organizations', view: 'organizations' },
    // Projects removed from here to enforce Organization -> Project workflow
    { label: 'Settings', view: 'settings' },
  ];

  return (
    <>
    <div
      className={`shrink-0 h-screen flex flex-col transition-all duration-300 z-50
        border-r border-slate-800/60
        bg-slate-950/80 backdrop-blur-xl
        ${isOpen ? 'w-64' : 'w-20'}
      `}
    >
      {/* Header / Logo */}
      <div
        className={`flex items-center h-16 border-b border-slate-800/60 shrink-0
          ${isOpen ? 'px-6' : 'justify-center'}
        `}
      >
        <img src={logoSrc} alt="Logo" className="w-8 h-8 rounded-lg" />
        {isOpen && (
          <span className="ml-3 text-lg font-semibold text-slate-50 tracking-wide">
            EviroSafe
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700/70 space-y-0.5">
        {menuItems.map((item) => (
          <NavItem
            key={item.view}
            label={item.label}
            view={item.view}
            isOpen={isOpen}
            currentView={currentView}
            setCurrentView={setCurrentView}
          />
        ))}
      </nav>

      {/* Notification & Toggle */}
      <div className="p-2 border-t border-slate-800/60 bg-slate-950/70 flex flex-col gap-2">
        
        {/* Notification Button */}
        <button
          onClick={() => setShowNotifications(true)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 transition-colors relative"
        >
          <Bell className="w-5 h-5" />
          {isOpen && <span className="ml-3 text-sm">Notifications</span>}
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 md:top-2 md:right-2 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </button>

        <button
          onClick={() => setOpen(!isOpen)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 transition-colors"
        >
          <svg
            className={`w-5 h-5 transition-transform ${
              !isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* User Footer */}
      <div
        className={`p-4 border-t border-slate-800/60 bg-slate-950/80 ${
          !isOpen && 'flex flex-col items-center'
        }`}
      >
        <div
          className={`flex items-center gap-3 mb-4 ${
            isOpen ? 'px-2' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-slate-900 font-bold text-xs shrink-0 shadow-md">
            {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          {isOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-100 truncate">
                {currentUser?.email}
              </p>
              <p className="text-xs text-slate-500 truncate">Admin</p>
            </div>
          )}
        </div>
        <button
          onClick={() => logout()}
          className="w-full flex items-center justify-center p-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-medium"
        >
          Sign Out
        </button>
      </div>
    </div>

    {/* Notification Panel Overlay */}
    {showNotifications && (
        <NotificationsPanel onClose={() => setShowNotifications(false)} />
    )}
    </>
  );
};