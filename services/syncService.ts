import { doc, setDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import {
  getPendingMutations,
  removeMutation,
  markMutationFailed,
  getPendingCount,
  PendingMutation
} from './offlineStore';

export interface SyncResult {
  total: number;
  synced: number;
  failed: number;
}

let isSyncing = false;
const syncListeners: Set<(count: number) => void> = new Set();

export const subscribeToPendingCount = (callback: (count: number) => void) => {
  syncListeners.add(callback);
  // Direct notification of initial count
  getPendingCount().then(callback);
  return () => {
    syncListeners.delete(callback);
  };
};

const notifyListeners = async () => {
  const count = await getPendingCount();
  syncListeners.forEach(cb => cb(count));
};

export const registerBackgroundSync = async () => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-offline-actions');
    } catch (err) {
      console.warn('[SyncService] Background sync registration failed or not supported:', err);
    }
  }
};

export const flushSyncQueue = async (): Promise<SyncResult> => {
  if (isSyncing || !navigator.onLine) {
    const count = await getPendingCount();
    return { total: count, synced: 0, failed: 0 };
  }

  isSyncing = true;
  const pending = await getPendingMutations();
  let synced = 0;
  let failed = 0;

  for (const mutation of pending) {
    if (!mutation.id) continue;
    try {
      const docRef = doc(db, mutation.collectionName, mutation.docId);

      if (mutation.type === 'CREATE' || mutation.type === 'UPDATE') {
        // Simple conflict resolution: check existing server timestamp if present
        const remoteSnap = await getDoc(docRef);
        if (remoteSnap.exists()) {
          const remoteData = remoteSnap.data();
          const remoteUpdatedAt = remoteData.updated_at?.toMillis?.() || remoteData.updated_at || 0;
          if (remoteUpdatedAt > mutation.timestamp) {
            console.warn(`[SyncService] Conflict resolved for ${mutation.docId}: Remote data is newer.`);
            await removeMutation(mutation.id);
            synced++;
            continue;
          }
        }

        const payload = {
          ...mutation.data,
          updated_at: serverTimestamp(),
        };

        await setDoc(docRef, payload, { merge: true });
        await removeMutation(mutation.id);
        synced++;
      } else if (mutation.type === 'DELETE') {
        await deleteDoc(docRef);
        await removeMutation(mutation.id);
        synced++;
      }
    } catch (err) {
      console.error(`[SyncService] Failed to sync item ${mutation.id}:`, err);
      await markMutationFailed(mutation.id);
      failed++;
    }
  }

  isSyncing = false;
  await notifyListeners();
  return { total: pending.length, synced, failed };
};

// Automatic retry when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[SyncService] Connection restored. Flushing sync queue...');
    flushSyncQueue();
  });
}
