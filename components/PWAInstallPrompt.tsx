import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAInstallPromptProps {
  logo?: string;
  appName?: string;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ logo, appName = 'PR-SGS' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 1. Check if app is already running in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      return;
    }

    // 2. Check if user dismissed prompt recently (within 7 days)
    const dismissedTime = localStorage.getItem('pr_scl_install_dismissed');
    if (dismissedTime) {
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (now - parseInt(dismissedTime, 10) < sevenDays) {
        return;
      }
    }

    // 3. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // Show iOS banner after a short delay
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // 4. Capture beforeinstallprompt for Android/Chrome/Edge/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    // Show the native browser install prompt
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      console.log('[PWA] User accepted install prompt');
    } else {
      console.log('[PWA] User dismissed install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    localStorage.setItem('pr_scl_install_dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <>
      {/* Floating PWA Install Banner */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 text-white rounded-2xl shadow-2xl p-4 z-[999] animate-bounce-subtle">
        <div className="flex items-start space-x-3">
          {/* Logo / App Icon */}
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
            {logo ? (
              <img src={logo} alt={appName} className="w-full h-full object-contain p-1" />
            ) : (
              <i className="fas fa-graduation-cap text-2xl text-blue-400"></i>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-white truncate flex items-center gap-1.5">
              <span>Installer {appName}</span>
              <span className="bg-blue-500/20 text-blue-300 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border border-blue-500/30">
                App Native
              </span>
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-snug">
              Installez l'application sur votre écran d'accueil pour un accès rapide et hors-ligne.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-md transition-all active:scale-95 flex items-center space-x-1.5"
              >
                <i className="fas fa-download text-xs"></i>
                <span>Installer maintenant</span>
              </button>

              <button
                onClick={handleDismiss}
                className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                Plus tard
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 transition-colors"
            title="Fermer"
          >
            <i className="fas fa-times text-xs"></i>
          </button>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <i className="fab fa-apple text-xl text-slate-300"></i> Installation sur iOS
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-white"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Pour installer <strong>{appName}</strong> sur votre iPhone ou iPad :
            </p>

            <ol className="text-xs text-slate-200 space-y-2 list-decimal list-inside bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
              <li>
                Appuyez sur le bouton <span className="font-semibold text-blue-400">Partager</span> (<i className="fas fa-share-square text-blue-400 mx-1"></i> en bas de Safari).
              </li>
              <li>
                Faites défiler vers le bas et sélectionnez <span className="font-semibold text-blue-400 font-medium">Sur l'écran d'accueil</span> (<i className="far fa-plus-square text-blue-400 mx-1"></i>).
              </li>
              <li>
                Appuyez sur <span className="font-semibold text-blue-400">Ajouter</span> en haut à droite.
              </li>
            </ol>

            <button
              onClick={handleDismiss}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 rounded-xl transition-all"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
};
