/**
 * FILE: src/components/offline/OfflineSync.tsx
 * PASTE AT: src/components/offline/OfflineSync.tsx
 *           (create offline/ folder inside src/components/)
 *
 * ── HOW TO WIRE INTO YOUR APP ─────────────────────────────────────────────────
 *
 * STEP 1 — Wrap your root layout with the provider (in src/App.tsx):
 *
 *   import { OfflineSyncProvider, OfflineStatusBar } from './components/offline/OfflineSync';
 *
 *   // Wrap AppContent (the outermost rendered component):
 *   <OfflineSyncProvider>
 *     <OfflineStatusBar />       ← shows "Offline — X items queued" banner
 *     <AppContent />
 *   </OfflineSyncProvider>
 *
 * STEP 2 — Use the hook anywhere to queue writes:
 *
 *   import { useOfflineQueue } from './components/offline/OfflineSync';
 *
 *   const { queueWrite, isOnline } = useOfflineQueue();
 *
 *   // Instead of calling setDoc directly:
 *   await queueWrite({
 *     collection: 'reports',
 *     docId:      newReport.id,
 *     data:       newReport,
 *     operation:  'set',
 *   });
 *
 * STEP 3 — In DataContext, replace raw setDoc/updateDoc calls with queueWrite:
 *
 *   // OLD:
 *   await writeDoc('reports', newReport.id, newReport);
 *
 *   // NEW:
 *   await queueWrite({ collection: 'reports', docId: newReport.id, data: newReport, operation: 'set' });
 *
 *   The queue drains automatically when the device goes back online.
 *   Firestore's built-in offline cache handles reads automatically.
 *
 * ── HOW IT WORKS ──────────────────────────────────────────────────────────────
 *
 * Firestore SDK already caches reads and queues writes offline — for most cases
 * you don't need extra handling. However, Firestore's offline write queue is
 * lost if the app is closed before reconnecting. This module adds a persistent
 * IndexedDB layer so queued writes survive app restarts.
 *
 * Flow:
 *   1. Write attempted → check navigator.onLine
 *   2. If online:  write directly to Firestore (fast path)
 *   3. If offline: write to IndexedDB queue + update React state immediately
 *   4. On reconnect: drain IndexedDB queue → write all pending docs to Firestore
 *   5. On success: remove from IndexedDB queue
 *   6. On failure: mark as failed, expose retry UI
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  Wifi, WifiOff, CloudOff, 
  RefreshCw, CheckCircle2, AlertTriangle, X,
} from 'lucide-react';
import {
  doc, setDoc, updateDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type QueueOperation = 'set' | 'update' | 'delete';

export interface QueuedWrite {
  id: string;                  // unique queue entry ID
  collection: string;
  docId: string;
  data?: Record<string, any>;  // undefined for delete
  operation: QueueOperation;
  org_id: string;
  queued_at: string;
  retry_count: number;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

interface OfflineSyncContextValue {
  isOnline: boolean;
  queuedCount: number;
  failedCount: number;
  isSyncing: boolean;
  queueWrite: (params: Omit<QueuedWrite, 'id' | 'queued_at' | 'retry_count' | 'status'>) => Promise<void>;
  retryFailed: () => void;
  clearQueue: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// IndexedDB helpers
// ─────────────────────────────────────────────────────────────────────────────

const IDB_NAME    = 'evirosafe_offline';
const IDB_VERSION = 1;
const STORE_NAME  = 'write_queue';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status',    'status',    { unique: false });
        store.createIndex('queued_at', 'queued_at', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbGetAll(): Promise<QueuedWrite[]> {
  const db  = await openDb();
  const tx  = db.transaction(STORE_NAME, 'readonly');
  const req = tx.objectStore(STORE_NAME).getAll();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror   = () => reject(req.error);
  });
}

async function idbPut(item: QueuedWrite): Promise<void> {
  const db  = await openDb();
  const tx  = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(item);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

async function idbDelete(id: string): Promise<void> {
  const db  = await openDb();
  const tx  = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

async function idbClear(): Promise<void> {
  const db  = await openDb();
  const tx  = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Firestore write executor
// ─────────────────────────────────────────────────────────────────────────────

async function executeWrite(item: QueuedWrite): Promise<void> {
  const ref = doc(db, item.collection, item.docId);
  switch (item.operation) {
    case 'set':
      await setDoc(ref, { ...item.data, org_id: item.org_id });
      break;
    case 'update':
      await updateDoc(ref, item.data ?? {});
      break;
    case 'delete':
      await deleteDoc(ref);
      break;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const OfflineSyncContext = createContext<OfflineSyncContextValue>({
  isOnline:    true,
  queuedCount: 0,
  failedCount: 0,
  isSyncing:   false,
  queueWrite:  async () => {},
  retryFailed: () => {},
  clearQueue:  () => {},
});

export const useOfflineQueue = () => useContext(OfflineSyncContext);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export const OfflineSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline,  setIsOnline]  = useState(navigator.onLine);
  const [queue,     setQueue]     = useState<QueuedWrite[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncLock = useRef(false);

  // ── Load queue from IndexedDB on mount ───────────────────────────────────
  useEffect(() => {
    idbGetAll()
      .then(setQueue)
      .catch((e) => console.error('[OfflineSync] Failed to load queue:', e));
  }, []);

  // ── Network status listeners ──────────────────────────────────────────────
  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Drain queue when network returns ─────────────────────────────────────
  const drainQueue = useCallback(async () => {
    if (syncLock.current) return;
    syncLock.current = true;
    setIsSyncing(true);

    try {
      const pending = await idbGetAll();
      const toSync  = pending.filter((item) => item.status !== 'failed' || item.retry_count < 3);

      for (const item of toSync) {
        // Mark as syncing in IDB
        const syncing = { ...item, status: 'syncing' as const };
        await idbPut(syncing);
        setQueue((prev) => prev.map((q) => q.id === item.id ? syncing : q));

        try {
          await executeWrite(item);
          // Success — remove from queue
          await idbDelete(item.id);
          setQueue((prev) => prev.filter((q) => q.id !== item.id));
        } catch (err: any) {
          // Failure — increment retry count
          const failed: QueuedWrite = {
            ...item,
            status:      'failed',
            retry_count: item.retry_count + 1,
            error:       err?.message ?? 'Unknown error',
          };
          await idbPut(failed);
          setQueue((prev) => prev.map((q) => q.id === item.id ? failed : q));
          console.error('[OfflineSync] Failed to sync item:', item.id, err);
        }
      }
    } finally {
      syncLock.current = false;
      setIsSyncing(false);
    }
  }, []);

  // Drain when coming back online
  useEffect(() => {
    if (isOnline) {
      drainQueue();
    }
  }, [isOnline, drainQueue]);

  // ── Queue a write ─────────────────────────────────────────────────────────
  const queueWrite = useCallback(async (
    params: Omit<QueuedWrite, 'id' | 'queued_at' | 'retry_count' | 'status'>,
  ): Promise<void> => {
    if (isOnline) {
      // Fast path: write directly
      try {
        await executeWrite({ ...params, id: '', queued_at: '', retry_count: 0, status: 'pending' });
        return;
      } catch (err) {
        console.warn('[OfflineSync] Online write failed, queuing:', err);
        // Fall through to queue
      }
    }

    // Offline path: queue to IndexedDB
    const item: QueuedWrite = {
      ...params,
      id:          `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      queued_at:   new Date().toISOString(),
      retry_count: 0,
      status:      'pending',
    };

    try {
      await idbPut(item);
      setQueue((prev) => [...prev, item]);
    } catch (e) {
      console.error('[OfflineSync] Failed to queue write:', e);
    }
  }, [isOnline]);

  const retryFailed = useCallback(() => {
    if (isOnline) drainQueue();
  }, [isOnline, drainQueue]);

  const clearQueue = useCallback(async () => {
    await idbClear();
    setQueue([]);
  }, []);

  const queuedCount = queue.filter((q) => q.status === 'pending' || q.status === 'syncing').length;
  const failedCount = queue.filter((q) => q.status === 'failed').length;

  return (
    <OfflineSyncContext.Provider value={{
      isOnline, queuedCount, failedCount, isSyncing,
      queueWrite, retryFailed, clearQueue,
    }}>
      {children}
    </OfflineSyncContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Offline status bar — shows at the top of the screen when offline
// ─────────────────────────────────────────────────────────────────────────────

export const OfflineStatusBar: React.FC = () => {
  const { isOnline, queuedCount, failedCount, isSyncing, retryFailed } = useOfflineQueue();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when going offline
  useEffect(() => {
    if (!isOnline) setDismissed(false);
  }, [isOnline]);

  // When online and nothing queued — no bar needed
  if (isOnline && queuedCount === 0 && failedCount === 0) return null;

  // User dismissed the bar
  if (dismissed && isOnline) return null;

  const isOffline = !isOnline;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium w-full ${
        isOffline
          ? 'bg-slate-900 dark:bg-slate-950 text-white'
          : failedCount > 0
          ? 'bg-red-600 text-white'
          : 'bg-emerald-600 text-white'
      }`}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {isOffline ? (
          <WifiOff className="w-4 h-4" />
        ) : isSyncing ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : failedCount > 0 ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <CheckCircle2 className="w-4 h-4" />
        )}
      </div>

      {/* Message */}
      <p className="flex-1">
        {isOffline && queuedCount === 0 && (
          'You are offline. Data will be saved locally and synced when you reconnect.'
        )}
        {isOffline && queuedCount > 0 && (
          `You are offline. ${queuedCount} item${queuedCount !== 1 ? 's' : ''} queued for sync.`
        )}
        {!isOffline && isSyncing && (
          `Syncing ${queuedCount} item${queuedCount !== 1 ? 's' : ''} to the cloud…`
        )}
        {!isOffline && !isSyncing && failedCount > 0 && (
          `${failedCount} item${failedCount !== 1 ? 's' : ''} failed to sync.`
        )}
        {!isOffline && !isSyncing && failedCount === 0 && queuedCount === 0 && (
          'All changes synced.'
        )}
      </p>

      {/* Retry button */}
      {!isOffline && failedCount > 0 && (
        <button
          onClick={retryFailed}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      )}

      {/* Dismiss (only when online) */}
      {!isOffline && (
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-white/20 rounded-lg flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Queue viewer — for debugging / admin view
// ─────────────────────────────────────────────────────────────────────────────

export const OfflineQueueViewer: React.FC = () => {
  const { isOnline, queuedCount, failedCount, isSyncing, retryFailed, clearQueue } = useOfflineQueue();
  const [items, setItems] = useState<QueuedWrite[]>([]);

  useEffect(() => {
    idbGetAll().then(setItems).catch(console.error);
  }, [queuedCount, failedCount]);

  if (items.length === 0) {
    return (
      <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
        <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-3" />
        <p className="text-sm text-slate-500">Sync queue is empty — all changes are saved.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Offline Write Queue
          </h3>
          <p className="text-xs text-slate-400">
            {queuedCount} pending · {failedCount} failed · {isSyncing ? 'Syncing…' : isOnline ? 'Online' : 'Offline'}
          </p>
        </div>
        <div className="flex gap-2">
          {failedCount > 0 && isOnline && (
            <button
              onClick={retryFailed}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Failed
            </button>
          )}
          <button
            onClick={clearQueue}
            className="px-3 py-1.5 text-xs bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 font-medium"
          >
            Clear Queue
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-3.5 rounded-xl border ${
              item.status === 'failed'
                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                : item.status === 'syncing'
                ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
            }`}
          >
            {/* Status icon */}
            <div className="flex-shrink-0 mt-0.5">
              {item.status === 'failed'  && <AlertTriangle className="w-4 h-4 text-red-500" />}
              {item.status === 'syncing' && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
              {item.status === 'pending' && <CloudOff className="w-4 h-4 text-slate-400" />}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {item.operation.toUpperCase()} → {item.collection}/{item.docId}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Queued: {new Date(item.queued_at).toLocaleString('en-GB')}
                {item.retry_count > 0 && ` · Retried ${item.retry_count}×`}
              </p>
              {item.error && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                  Error: {item.error}
                </p>
              )}
            </div>

            {/* Status badge */}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
              item.status === 'failed'  ? 'bg-red-100 text-red-700' :
              item.status === 'syncing' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
            }`}>
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Network status indicator — small dot for navbar
// ─────────────────────────────────────────────────────────────────────────────

export const NetworkStatusDot: React.FC = () => {
  const { isOnline, queuedCount, isSyncing } = useOfflineQueue();

  return (
    <div
      className="flex items-center gap-1.5"
      title={isOnline ? (queuedCount > 0 ? `Syncing ${queuedCount} items` : 'Connected') : 'Offline'}
    >
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
        !isOnline ? 'bg-red-500' :
        isSyncing ? 'bg-amber-400 animate-pulse' :
        queuedCount > 0 ? 'bg-amber-400' :
        'bg-emerald-500'
      }`} />
      {!isOnline && (
        <span className="text-xs font-medium text-red-500 hidden sm:block">Offline</span>
      )}
      {isOnline && queuedCount > 0 && (
        <span className="text-xs font-medium text-amber-500 hidden sm:block">
          {isSyncing ? 'Syncing…' : `${queuedCount} queued`}
        </span>
      )}
    </div>
  );
};