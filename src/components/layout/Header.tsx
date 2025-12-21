
import React, { useState, useRef, useEffect } from 'react';
import type { Organization, User, Notification } from '../../types';
import { useDataContext, useAppContext } from '../../contexts';
import { useAuth } from '../../contexts/AuthContext';
import { supportedLanguages } from '../../config';

interface HeaderProps {
  activeOrg: Organization;
  setActiveOrg: (org: Organization) => void;
  organizations: Organization[];
  user: User;
  toggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeOrg, setActiveOrg, organizations, user, toggleSidebar }) => {
  const { notifications } = useDataContext();
  const { language, handleUpdateUser, logout: clearLocalSession, theme, toggleTheme } = useAppContext();
  const { logout } = useAuth();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  
  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) {
        setOrgDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target as Node)) {
        setNotificationDropdownOpen(false);
      }
       if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setLanguageDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadNotifications = notifications.filter(n => !n.is_read);

  return (
    <header className="flex items-center justify-between h-16 px-6 glass-header shrink-0 z-40 relative transition-all duration-200">
       <div className="flex items-center">
            <button onClick={toggleSidebar} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white focus:outline-none md:hidden mr-4">
                 <MenuIcon className="w-6 h-6" />
            </button>
            <div ref={orgDropdownRef} className="relative">
                <button onClick={() => setOrgDropdownOpen(!orgDropdownOpen)} className="flex items-center space-x-2 py-1.5 px-2 rounded hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <div className="h-6 w-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {activeOrg.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="hidden sm:inline font-semibold text-sm text-slate-700 dark:text-slate-200">{activeOrg.name}</span>
                    <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                </button>
                {orgDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-60 bg-white dark:bg-dark-card rounded-lg shadow-lg border border-border-color dark:border-dark-border z-50">
                        <div className="p-1">
                            {organizations.map(org => (
                                <button
                                    key={org.id}
                                    onClick={() => {
                                        setActiveOrg(org);
                                        setOrgDropdownOpen(false);
                                    }}
                                    className="flex items-center w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md"
                                >
                                    <div className="h-5 w-5 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 mr-3">
                                        {org.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span>{org.name}</span>
                                    {org.id === activeOrg.id && <CheckIcon className="w-4 h-4 ml-auto text-primary-600" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
       </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
         {/* Theme Toggle */}
         <button 
            onClick={toggleTheme} 
            className="p-2 rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
         >
            {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
         </button>

         <div ref={languageDropdownRef} className="relative">
            <button
                onClick={() => setLanguageDropdownOpen(prev => !prev)}
                className="p-2 rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white transition-colors"
                title="Language"
            >
                <LanguageIcon className="w-5 h-5" />
            </button>
             {languageDropdownOpen && (
                <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-dark-card rounded-lg shadow-lg border border-border-color dark:border-dark-border z-50">
                    <div className="p-1">
                        {supportedLanguages.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => {
                                    handleUpdateUser({ ...user, preferences: { ...user.preferences, language: lang.code }});
                                    setLanguageDropdownOpen(false);
                                }}
                                className="flex items-center w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md"
                            >
                                <span>{lang.name}</span>
                                {lang.code === language && <CheckIcon className="w-4 h-4 ml-auto text-primary-600" />}
                            </button>
                        ))}
                    </div>
                </div>
             )}
        </div>

        <div ref={notificationDropdownRef} className="relative">
          <button onClick={() => setNotificationDropdownOpen(prev => !prev)} className="relative p-2 rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white transition-colors">
              <BellIcon className="w-5 h-5"/>
              {unreadNotifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-dark-card"></span>
              )}
          </button>
          {notificationDropdownOpen && (
            <div className="absolute right-0 mt-1 w-80 bg-white dark:bg-dark-card rounded-lg shadow-lg border border-border-color dark:border-dark-border z-50">
                <div className="px-4 py-3 font-semibold text-sm border-b border-border-color dark:border-dark-border text-slate-800 dark:text-slate-200">Notifications</div>
                <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(notif => (
                        <div key={notif.id} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 border-b border-slate-50 dark:border-dark-border last:border-0 cursor-pointer">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{notif.message}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{new Date(notif.timestamp).toLocaleString()}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-sm text-slate-500 py-8">No new notifications.</p>
                    )}
                </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>

        <div ref={userDropdownRef} className="relative">
          <button onClick={() => setUserDropdownOpen(!userDropdownOpen)} className="flex items-center space-x-3 pl-2">
            <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-tight">{user.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{user.role.replace('_', ' ')}</span>
            </div>
            <img className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-600" src={user.avatar_url} alt="Avatar" />
          </button>
          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-card rounded-lg shadow-lg border border-border-color dark:border-dark-border z-50">
                <div className="p-1">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-dark-border mb-1 sm:hidden">
                        <p className="font-medium text-slate-900 dark:text-slate-200">{user.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                    <a href="#" className="block px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md">Profile Settings</a>
                    <a href="#" className="block px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md">Help & Support</a>
                    <div className="my-1 border-t border-slate-100 dark:border-dark-border"></div>
                    <button onClick={async () => { await logout(); clearLocalSession(); }} className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md">Sign Out</button>
                </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// SVG Icons
const MoonIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>;
const SunIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>;
const LanguageIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" /></svg>;
const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);
const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);
const BellIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
);
const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);