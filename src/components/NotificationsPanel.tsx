import React from 'react';
import { useAppContext, useDataContext } from '../contexts';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Bell, Check, Trash2 } from 'lucide-react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface NotificationsPanelProps {
  onClose: () => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ onClose }) => {
  const { notifications } = useDataContext();
  const { activeUser } = useAppContext(); // <--- FIXED: activeUser from AppContext

  // Filter notifications for the current user
  const myNotifications = notifications.filter(n => n.user_id === activeUser?.id);
  const unreadCount = myNotifications.filter(n => !n.is_read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { is_read: true });
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl border-l dark:border-slate-800 flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary-600" />
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">Notifications</h2>
            {unreadCount > 0 && (
              <Badge color="red">{unreadCount} New</Badge>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            ✕
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {myNotifications.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No notifications yet.</p>
            </div>
          ) : (
            myNotifications.map(notif => (
              <div 
                key={notif.id} 
                className={`p-3 rounded-lg border transition-all ${
                  notif.is_read 
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-70' 
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start">
                  <p className={`text-sm ${notif.is_read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white font-semibold'}`}>
                    {notif.message}
                  </p>
                  {!notif.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>}
                </div>
                
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-slate-400">
                    {new Date(notif.timestamp).toLocaleString()}
                  </span>
                  <div className="flex gap-2">
                    {!notif.is_read && (
                      <button 
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded text-blue-600"
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(notif.id)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-500"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <Button variant="secondary" className="w-full" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};