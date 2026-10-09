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

export interface OfflineCredential {
  id: string; // ex: schoolId_matricule ou schoolId_dirigeant
  schoolId: string;
  role: string; // 'dirigeant' | 'directeur' | 'gestionnaire' | 'professeur' | 'eleve'
  codeHash: string; // Hash SHA-256 avec salt
  salt: string; // Salt aléatoire
  displayName: string;
  email?: string;
  photoUrl?: string;
  matricule?: string;
  assignedCycles?: string[];
  syncedAt: number; // Date de synchronisation
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
  offline_credentials: {
    key: string; // id
    value: OfflineCredential;
    indexes: {
      'by-school': string;
      'by-role': string;
      'by-school-role': [string, string];
    };
  };
}

const DB_NAME = 'pr_sgs_offline_db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<PRSGSDB>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<PRSGSDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
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
        if (!db.objectStoreNames.contains('offline_credentials')) {
          const credStore = db.createObjectStore('offline_credentials', {
            keyPath: 'id',
          });
          credStore.createIndex('by-school', 'schoolId');
          credStore.createIndex('by-role', 'role');
          credStore.createIndex('by-school-role', ['schoolId', 'role']);
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

// --- AUTHENTIFICATION HORS LIGNE (CREDENTIALS & SESSION) ---

export const saveOfflineCredential = async (cred: OfflineCredential): Promise<void> => {
  try {
    const db = await getDB();
    await db.put('offline_credentials', cred);
  } catch (error) {
    console.warn('[OfflineStore] Failed to save offline credential:', cred.id, error);
  }
};

export const saveOfflineCredentialsBatch = async (credentials: OfflineCredential[]): Promise<void> => {
  try {
    const db = await getDB();
    const tx = db.transaction('offline_credentials', 'readwrite');
    for (const cred of credentials) {
      await tx.store.put(cred);
    }
    await tx.done;
  } catch (error) {
    console.warn('[OfflineStore] Failed to batch save offline credentials:', error);
  }
};

export const getOfflineCredential = async (id: string): Promise<OfflineCredential | null> => {
  try {
    const db = await getDB();
    const entry = await db.get('offline_credentials', id);
    return entry || null;
  } catch (error) {
    console.warn('[OfflineStore] Failed to get offline credential:', id, error);
    return null;
  }
};

export const getOfflineCredentialsByRole = async (schoolId: string, role: string): Promise<OfflineCredential[]> => {
  try {
    const db = await getDB();
    const results = await db.getAllFromIndex('offline_credentials', 'by-school-role', [schoolId, role]);
    return results;
  } catch (error) {
    console.warn('[OfflineStore] Failed to get credentials by role:', error);
    return [];
  }
};

export const getOfflineCredentialsBySchool = async (schoolId: string): Promise<OfflineCredential[]> => {
  try {
    const db = await getDB();
    return await db.getAllFromIndex('offline_credentials', 'by-school', schoolId);
  } catch (error) {
    console.warn('[OfflineStore] Failed to get credentials by school:', error);
    return [];
  }
};

export const clearOfflineCredentials = async (): Promise<void> => {
  try {
    const db = await getDB();
    await db.clear('offline_credentials');
  } catch (error) {
    console.warn('[OfflineStore] Failed to clear offline credentials:', error);
  }
};

// Durée de validité maximale d'une session hors ligne : 15 jours (en millisecondes)
export const OFFLINE_SESSION_MAX_DAYS = 15;
export const OFFLINE_SESSION_MAX_MS = OFFLINE_SESSION_MAX_DAYS * 24 * 60 * 60 * 1000;

export interface OfflineSessionStorage {
  userSession: any;
  createdAt: number; // Date de création de la session
  lastOnlineSyncAt: number; // Dernière date de synchronisation en ligne
  expiresAt: number; // createdAt + OFFLINE_SESSION_MAX_MS
}

export const saveOfflineSession = (session: any, lastSyncAt: number = Date.now()): void => {
  const now = Date.now();
  const sessionData: OfflineSessionStorage = {
    userSession: session,
    createdAt: now,
    lastOnlineSyncAt: lastSyncAt,
    expiresAt: now + OFFLINE_SESSION_MAX_MS,
  };
  localStorage.setItem('pr_scl_offline_session', JSON.stringify(sessionData));
  localStorage.setItem('pr_scl_matricule_session', JSON.stringify(session));
};

export const getValidOfflineSession = (): { session: any; daysRemaining: number } | null => {
  const raw = localStorage.getItem('pr_scl_offline_session');
  if (!raw) return null;

  try {
    const data: OfflineSessionStorage = JSON.parse(raw);
    const now = Date.now();

    if (now > data.expiresAt) {
      console.warn('[OfflineStore] La session hors ligne a dépassé la limite autorisée de 15 jours.');
      localStorage.removeItem('pr_scl_offline_session');
      localStorage.removeItem('pr_scl_matricule_session');
      return null;
    }

    const msRemaining = data.expiresAt - now;
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

    return {
      session: data.userSession,
      daysRemaining,
    };
  } catch {
    return null;
  }
};

export const clearOfflineSession = (): void => {
  localStorage.removeItem('pr_scl_offline_session');
  localStorage.removeItem('pr_scl_matricule_session');
};

