import React from 'react';
import type { View, Resource } from '../types'; // <--- FIXED (was ../../types)
import { logoSrc } from '../config';            // <--- FIXED (was ../../config)
import { useAppContext } from '../contexts';    // <--- FIXED (was ../../contexts)
import { useAuth } from '../contexts/AuthContext'; // <--- FIXED (was ../../contexts/AuthContext)

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
}

const NavItem: React.FC<{
  icon: React.ReactElement;
  label: string;
  view: View;
  currentView: View;
  setCurrentView: (view: View) => void;
  isOpen: boolean;
}> = ({ icon, label, view, currentView, setCurrentView, isOpen }) => {
  const isActive = currentView === view;
  return (
    <button
      onClick={() => setCurrentView(view)}
      title={label}
      className={`flex items-center w-full rounded-xl transition-all duration-200 group relative overflow-hidden ${
        isActive
          ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(0,243,255,0.15)] border border-neon-blue/30'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      } ${isOpen ? 'px-4 py-3 mb-1 mx-2 w-auto' : 'h-12 w-12 justify-center mb-2 mx-auto'}`}
    >
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-neon-blue shadow-[0_0_10px_#00f3ff]"></div>}
      {React.cloneElement(icon, { 
          className: `w-5 h-5 shrink-0 transition-colors duration-300 ${isActive ? 'text-neon-blue drop-shadow-[0_0_5px_rgba(0,243,255,0.6)]' : 'text-slate-500 group-hover:text-slate-300'}` 
      })}
      {isOpen && <span className="ml-3 text-sm font-medium tracking-wide truncate">{label}</span>}
    </button>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, isOpen, setOpen }) => {
    const { t, can, activeOrg, activeUser } = useAppContext(); 
    const { logout, currentUser } = useAuth(); 

    const mainNavItems: { icon: React.ReactElement, label: string, view: View }[] = [
        { icon: <HomeIcon />, label: t('sidebar.dashboard', 'Dashboard'), view: 'dashboard'},
        { icon: <SparklesIcon />, label: t('sidebar.ai_insights', 'AI Insights'), view: 'ai-insights'},
        { icon: <MapIcon />, label: t('sidebar.site_map', 'Site Map'), view: 'site-map'},
        { icon: <UserCircleIcon />, label: t('sidebar.certification', 'My Certificate'), view: 'certification'},
    ];

    const hseNavItems: { icon: React.ReactElement, label: string, view: View, resource: Resource }[] = [
        { icon: <DocumentTextIcon />, label: t('sidebar.reporting', 'Reporting'), view: 'reports', resource: 'reports'},
        { icon: <ListBulletIcon />, label: t('sidebar.actions', 'Action Tracker'), view: 'actions', resource: 'actions'},
        { icon: <ClipboardListIcon />, label: t('sidebar.inspections', 'Inspections'), view: 'inspections', resource: 'inspections'},
        { icon: <ClipboardDocumentCheckIcon />, label: t('sidebar.ptw', 'Permit to Work'), view: 'ptw', resource: 'ptw'},
        { icon: <CheckCircleIcon />, label: t('sidebar.checklists', 'Checklists'), view: 'checklists', resource: 'checklists'},
        { icon: <TrashIcon />, label: t('sidebar.housekeeping', 'Housekeeping'), view: 'housekeeping', resource: 'housekeeping' },
        { icon: <DocumentDuplicateIcon />, label: t('sidebar.plans', 'Plans'), view: 'plans', resource: 'plans'},
        { icon: <ExclamationTriangleIcon />, label: t('sidebar.rams', 'RAMS'), view: 'rams', resource: 'rams'},
        { icon: <MegaphoneIcon />, label: t('sidebar.signage', 'Signage'), view: 'signage', resource: 'signage'},
        { icon: <PresentationChartBarIcon />, label: t('sidebar.tbt', 'Toolbox Talks'), view: 'tbt', resource: 'tbt'},
        { icon: <AcademicCapIcon />, label: t('sidebar.training', 'Trainings'), view: 'training', resource: 'training'},
    ];

    const adminConsoleItems: { icon: React.ReactElement, label: string, view: View, resource: Resource }[] = [
        { icon: <BuildingOfficeIcon />, label: t('sidebar.organizations', 'Organizations'), view: 'organizations', resource: 'organizations' },
        { icon: <FolderIcon />, label: t('sidebar.projects', 'Projects'), view: 'projects', resource: 'projects'},
        { icon: <UsersIcon />, label: t('sidebar.people', 'People & Access'), view: 'people', resource: 'people'},
        { icon: <ShieldCheckIcon />, label: t('sidebar.roles', 'Roles & Permissions'), view: 'roles', resource: 'roles'},
        { icon: <CogIcon />, label: t('sidebar.settings', 'Settings & Logs'), view: 'settings', resource: 'settings'},
    ];


  return (
    <div className={`shrink-0 glass-panel h-screen flex flex-col transition-all duration-300 z-50 ${isOpen ? 'w-64' : 'w-20'}`}>
        <div className={`flex items-center h-16 border-b border-white/10 shrink-0 ${isOpen ? 'px-6' : 'justify-center'} relative`}>
            <div className="relative group cursor-pointer flex items-center">
                <div className="absolute inset-0 bg-neon-blue blur-xl opacity-10 rounded-full group-hover:opacity-20 transition-opacity duration-500"></div>
                <img src={logoSrc} alt="Logo" className="w-8 h-8 rounded-lg relative z-10 shadow-lg border border-white/10"/>
                {isOpen && (
                    <div className="ml-3 relative z-10">
                        <span className="block text-lg font-black text-white tracking-tighter">EviroSafe</span>
                    </div>
                )}
            </div>
        </div>

        <nav className="flex-1 py-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700/50 space-y-6">
            <div>
                <div className="space-y-1">
                    {mainNavItems.map(item => <NavItem key={item.view} {...item} isOpen={isOpen} currentView={currentView} setCurrentView={setCurrentView} />)}
                </div>
            </div>

            <div>
                {isOpen && <div className="px-6 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Operations</div>}
                <div className="space-y-1">
                    {hseNavItems.filter(item => can('read', item.resource)).map(item => <NavItem key={item.view} {...item} isOpen={isOpen} currentView={currentView} setCurrentView={setCurrentView} />)}
                </div>
            </div>

            <div>
                {isOpen && <div className="px-6 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">System</div>}
                <div className="space-y-1">
                    {adminConsoleItems.filter(item => can('read', item.resource)).map(item => <NavItem key={item.view} {...item} isOpen={isOpen} currentView={currentView} setCurrentView={setCurrentView} />)}
                </div>
            </div>
        </nav>
        
        {/* Collapse Toggle */}
        <div className="p-2 border-t border-white/10 bg-black/20 backdrop-blur-md">
            <button onClick={() => setOpen(!isOpen)} className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
                {isOpen ? <ChevronLeftIcon className="w-5 h-5"/> : <ChevronRightIcon className="w-5 h-5"/>}
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
                        <p className="text-xs text-slate-500 truncate">{activeUser?.role.replace('_', ' ') || 'User'}</p>
                    </div>
                )}
            </div>
            <button 
                onClick={() => logout()} 
                title="Sign Out"
                className={`w-full flex items-center ${isOpen ? 'justify-center' : 'justify-center'} p-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors`}
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                {isOpen && <span className="ml-2">Sign Out</span>}
            </button>
        </div>
    </div>
  );
};

// Icons
const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;
const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>);
const FolderIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>);
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-3-5.197M15 21a9 9 0 00-9-9" /></svg>);
const ShieldCheckIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944A12.02 12.02 0 0012 22a12.02 12.02 0 009-1.056v-1.123" /></svg>);
const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.624l-.259 1.035L16.38 20.624a3.375 3.375 0 00-2.455-2.455l-1.036-.259.259-1.035a3.375 3.375 0 002.456-2.456l.259-1.035.259 1.035a3.375 3.375 0 00-2.456 2.456l1.035.259-.259 1.035a3.375 3.375 0 00-2.456 2.456l1.035.259-.259 1.035a3.375 3.375 0 00-2.456 2.456l1.035.259-.259 1.035a3.375 3.375 0 00-2.456 2.456l1.035.259-.259 1.035a3.375 3.375 0 00-2.456 2.456" /></svg>);
const CogIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const MapIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg>);
const UserCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const ListBulletIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 17.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
const BuildingOfficeIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6h1.5m-1.5 3h1.5m-1.5 3h1.5M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>;
const DocumentTextIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const ClipboardListIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 4h.01M12 12h.01M12 16h.01M9 12h.01M9 16h.01" /></svg>;
const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const DocumentDuplicateIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>;
const ExclamationTriangleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const MegaphoneIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 100 15h8.05a1.5 1.5 0 001.442-1.182A4.5 4.5 0 0018 15.75V11.25a4.5 4.5 0 00-4.5-4.5h-3.75z" /></svg>;
const PresentationChartBarIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125h17.25c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h17.25m-17.25 0a1.125 1.125 0 00-1.125 1.125v1.5c0 .621.504 1.125 1.125-1.125h17.25c.621 0 1.125-.504 1.125-1.125v-1.5a1.125 1.125 0 00-1.125-1.125m-1.5-6.375V6.375c0-1.036-.84-1.875-1.875-1.875h-1.5c-1.036 0-1.875.84-1.875 1.875v6.75c0 1.036.84 1.875 1.875 1.875h1.5c1.036 0 1.875-.84 1.875-1.875m-6-3.75V6.375c0-1.036-.84-1.875-1.875-1.875h-1.5C6.84 4.5 6 5.34 6 6.375v3.375c0 1.036.84 1.875 1.875 1.875h1.5c1.036 0 1.875-.84 1.875-1.875m-6 3.75V6.375c0-1.036-.84-1.875-1.875-1.875h-1.5C2.84 4.5 2 5.34 2 6.375v10.125c0 1.036.84 1.875 1.875 1.875h1.5c1.036 0 1.875-.84 1.875-1.875" /></svg>;
const AcademicCapIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.2658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0l-3.352-2.126a50.002 50.002 0 0118.522-2.738L19.74 8.026m-15.482 0A50.002 50.002 0 0012 13.447a50.002 50.002 0 007.74-3.3" /></svg>;
const ClipboardDocumentCheckIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;