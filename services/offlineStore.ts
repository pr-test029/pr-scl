import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface PendingMutation {
  id?: number;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  collectionName: string;
  docId: string;
  data?: any;
  timestamp: number;
  schoolId: string;
  status: 'pending' | 'failed';
  attempts?: number;
}

interface PRSGSDB extends DBSchema {
  app_cache: {
    key: string;
    value: {
      key: string;
      data: any;
      updatedAt: number;
    };
  };
  sync_queue: {
    key: number;
    value: PendingMutation;
    indexes: {
      'by-status': string;
      'by-school': string;
    };
  };
}

const DB_NAME = 'pr_sgs_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PRSGSDB>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<PRSGSDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('app_cache')) {
          db.createObjectStore('app_cache', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          const queueStore = db.createObjectStore('sync_queue', {
            keyPath: 'id',
            autoIncrement: true,
          });
          queueStore.createIndex('by-status', 'status');
          queueStore.createIndex('by-school', 'schoolId');
        }
      },
    });
  }
  return dbPromise;
};

// --- CACHE METIER ---

export const cacheData = async (key: string, data: any): Promise<void> => {
  try {
    const db = await getDB();
    await db.put('app_cache', {
      key,
      data,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.warn('[OfflineStore] Failed to cache data for key:', key, error);
  }
};

export const getCachedData = async <T>(key: string): Promise<T | null> => {
  try {
    const db = await getDB();
    const entry = await db.get('app_cache', key);
    return entry ? (entry.data as T) : null;
  } catch (error) {
    console.warn('[OfflineStore] Failed to retrieve cached data for key:', key, error);
    return null;
  }
};

export const clearCache = async (): Promise<void> => {
  try {
    const db = await getDB();
    await db.clear('app_cache');
  } catch (error) {
    console.warn('[OfflineStore] Failed to clear app_cache:', error);
  }
};

// --- FILE D'ATTENTE DE SYNCHRONISATION ---

export const enqueueMutation = async (
  mutation: Omit<PendingMutation, 'id' | 'timestamp' | 'status'>
): Promise<number> => {
  const db = await getDB();
  const item: PendingMutation = {
    ...mutation,
    timestamp: Date.now(),
    status: 'pending',
    attempts: 0,
  };
  const id = await db.add('sync_queue', item);
  return id;
};

export const getPendingMutations = async (): Promise<PendingMutation[]> => {
  try {
    const db = await getDB();
    return await db.getAllFromIndex('sync_queue', 'by-status', 'pending');
  } catch (error) {
    console.warn('[OfflineStore] Failed to fetch pending mutations:', error);
    return [];
  }
};

export const removeMutation = async (id: number): Promise<void> => {
  try {
    const db = await getDB();
    await db.delete('sync_queue', id);
  } catch (error) {
    console.warn('[OfflineStore] Failed to delete mutation:', id, error);
  }
};

export const markMutationFailed = async (id: number): Promise<void> => {
  try {
    const db = await getDB();
    const item = await db.get('sync_queue', id);
    if (item) {
      item.status = 'failed';
      item.attempts = (item.attempts || 0) + 1;
      await db.put('sync_queue', item);
    }
  } catch (error) {
    console.warn('[OfflineStore] Failed to update mutation status:', id, error);
  }
};

export const getPendingCount = async (): Promise<number> => {
  try {
    const db = await getDB();
    const pending = await db.getAllFromIndex('sync_queue', 'by-status', 'pending');
    return pending.length;
  } catch (error) {
    return 0;
  }
};
