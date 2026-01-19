import React, { useState, useRef, useEffect } from 'react';
import type { Organization, User } from '../../types';
import { useDataContext, useAppContext } from '../../contexts';
import { useAuth } from '../../contexts/AuthContext';
import { supportedLanguages } from '../../config';
import { 
  Menu as MenuIcon, 
  ChevronDown as ChevronDownIcon, 
  Check as CheckIcon, 
  Sun as SunIcon, 
  Moon as MoonIcon, 
  Globe as LanguageIcon, 
  Bell as BellIcon,
  WifiOff // <--- Added this
} from 'lucide-react';

interface HeaderProps {
  activeOrg: Organization;
  setActiveOrg: (org: Organization) => void;
  organizations: Organization[];
  user: User;
  toggleSidebar: () => void;
}

// --- OFFLINE INDICATOR COMPONENT ---
const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2 animate-pulse mr-2">
      <WifiOff className="w-3 h-3" />
      <span>Offline</span>
    </div>
  );
};

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
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) setOrgDropdownOpen(false);
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) setUserDropdownOpen(false);
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target as Node)) setNotificationDropdownOpen(false);
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) setLanguageDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const userRole = user?.role ? user.role.replace('_', ' ') : 'User';

  return (
    <header className="flex items-center justify-between h-16 px-6 glass-header shrink-0 z-40 relative transition-all duration-200">
       <div className="flex items-center">
            <button onClick={toggleSidebar} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white focus:outline-none md:hidden mr-4">
                 <MenuIcon className="w-6 h-6" />
            </button>
            <div ref={orgDropdownRef} className="relative">
                <button onClick={() => setOrgDropdownOpen(!orgDropdownOpen)} className="flex items-center space-x-2 py-1.5 px-2 rounded hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                    <div className="h-6 w-6 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                        {activeOrg?.name?.substring(0, 2).toUpperCase() || 'OR'}
                    </div>
                    <span className="hidden sm:inline font-semibold text-sm text-slate-700 dark:text-slate-200">{activeOrg?.name || 'Organization'}</span>
                    <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                </button>
                {orgDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-60 bg-white dark:bg-dark-card rounded-lg shadow-lg border border-slate-200 dark:border-dark-border z-50">
                        <div className="p-1">
                            {organizations.map(org => (
                                <button
                                    key={org.id}
                                    onClick={() => { setActiveOrg(org); setOrgDropdownOpen(false); }}
                                    className="flex items-center w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md"
                                >
                                    <div className="h-5 w-5 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 mr-3">
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
         {/* Offline Indicator */}
         <OfflineIndicator />

         {/* Theme Toggle */}
         <button 
            onClick={toggleTheme} 
            className="p-2 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
         >
            {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
         </button>

         <div ref={languageDropdownRef} className="relative">
            <button
                onClick={() => setLanguageDropdownOpen(prev => !prev)}
                className="p-2 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white transition-colors"
                title="Language"
            >
                <LanguageIcon className="w-5 h-5" />
            </button>
             {languageDropdownOpen && (
                <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-dark-card rounded-lg shadow-lg border border-slate-200 dark:border-dark-border z-50">
                    <div className="p-1">
                        {supportedLanguages.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => {
                                    handleUpdateUser({ ...user, preferences: { ...user.preferences, language: lang.code }});
                                    setLanguageDropdownOpen(false);
                                }}
                                className="flex items-center w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md"
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
          <button onClick={() => setNotificationDropdownOpen(prev => !prev)} className="relative p-2 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white transition-colors">
              <BellIcon className="w-5 h-5"/>
              {unreadNotifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-dark-card"></span>
              )}
          </button>
          {notificationDropdownOpen && (
            <div className="absolute right-0 mt-1 w-80 bg-white dark:bg-dark-card rounded-lg shadow-lg border border-slate-200 dark:border-dark-border z-50">
                <div className="px-4 py-3 font-semibold text-sm border-b border-slate-200 dark:border-dark-border text-slate-800 dark:text-slate-200">Notifications</div>
                <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(notif => (
                        <div key={notif.id} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 border-b border-slate-100 dark:border-dark-border last:border-0 cursor-pointer">
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
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-tight">{user?.name || 'User'}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{userRole}</span>
            </div>
            <img 
                className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-600" 
                src={user?.avatar_url || 'https://i.pravatar.cc/150'} 
                alt="Avatar"
                onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`;
                }}
            />
          </button>
          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-card rounded-lg shadow-lg border border-slate-200 dark:border-dark-border z-50">
                <div className="p-1">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-dark-border mb-1 sm:hidden">
                        <p className="font-medium text-slate-900 dark:text-slate-200">{user?.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
                    </div>
                    <a href="#" className="block px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md">Profile Settings</a>
                    <a href="#" className="block px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md">Help & Support</a>
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