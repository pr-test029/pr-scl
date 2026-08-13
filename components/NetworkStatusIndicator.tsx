import React, { useState, useEffect } from 'react';
import { flushSyncQueue, subscribeToPendingCount } from '../services/syncService';

export const NetworkStatusIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleManualSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = subscribeToPendingCount((count) => {
      setPendingCount(count);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const handleManualSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    setSyncMessage('Synchronisation en cours...');
    try {
      const res = await flushSyncQueue();
      if (res.synced > 0) {
        setSyncMessage(`${res.synced} modification(s) synchronisée(s) avec succès.`);
      } else {
        setSyncMessage('Tout est déjà à jour.');
      }
    } catch (e) {
      setSyncMessage('Erreur lors de la synchronisation.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  if (isOnline && pendingCount === 0 && !syncMessage) {
    return null; // Discrete state: hide when online and fully synced
  }

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 text-white text-xs px-4 py-2 flex items-center justify-between shadow-sm transition-all duration-300 z-50">
      <div className="flex items-center space-x-2">
        <span className="relative flex h-2.5 w-2.5">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isOnline ? 'bg-amber-400' : 'bg-rose-500'
            }`}
          ></span>
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              isOnline ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          ></span>
        </span>

        {!isOnline ? (
          <span className="font-medium text-amber-200">
            <i className="fas fa-wifi-slash mr-1.5 text-rose-400"></i> Mode Hors-Ligne
            {pendingCount > 0 && (
              <span className="ml-1 bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                {pendingCount} action(s) en attente
              </span>
            )}
          </span>
        ) : isSyncing ? (
          <span className="font-medium text-blue-300 animate-pulse">
            <i className="fas fa-sync fa-spin mr-1.5 text-blue-400"></i> Synchronisation des données...
          </span>
        ) : syncMessage ? (
          <span className="font-medium text-emerald-300">
            <i className="fas fa-check-circle mr-1.5 text-emerald-400"></i> {syncMessage}
          </span>
        ) : (
          <span className="font-medium text-slate-300">
            {pendingCount > 0 ? `${pendingCount} action(s) en attente de synchronisation` : 'Connecté'}
          </span>
        )}
      </div>

      {isOnline && pendingCount > 0 && (
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-2.5 py-1 rounded transition-colors flex items-center space-x-1"
        >
          <i className={`fas fa-sync ${isSyncing ? 'fa-spin' : ''}`}></i>
          <span>Synchroniser maintenant</span>
        </button>
      )}
    </div>
  );
};
