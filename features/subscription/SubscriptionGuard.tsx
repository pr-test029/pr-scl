
import React, { useState, useEffect } from 'react';
import { School } from '../../types';
import { auth } from '../../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface SubscriptionGuardProps {
    school: School | null;
    children: React.ReactNode;
}

const ADMIN_EMAIL = 'powerfulreach029@gmail.com';

const isUserAdmin = (email: string | null | undefined): boolean => {
    if (!email) return false;
    return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
};

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({ school, children }) => {
    const [showPaywall, setShowPaywall] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUserEmail(user.email);
            } else {
                setCurrentUserEmail(null);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const checkSubscription = () => {
            if (isUserAdmin(currentUserEmail)) {
                setShowPaywall(false);
                setIsChecking(false);
                return;
            }

            if (!school) {
                setIsChecking(false);
                return;
            }

            if (isUserAdmin(school.owner_email)) {
                setShowPaywall(false);
                setIsChecking(false);
                return;
            }

            const now = new Date();
            let isExpired = false;
            let daysLeft: number | null = null;

            if (!school.subscription_expires_at) {
                isExpired = true;
            } else {
                const expiryDate = new Date(school.subscription_expires_at);
                const timeDiff = expiryDate.getTime() - now.getTime();
                daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                isExpired = daysLeft <= 0;
            }

            if (school.subscription_status === 'expired' || school.subscription_status === 'free') {
                isExpired = true;
            }

            if (isExpired) {
                setShowPaywall(true);
            } else {
                setDaysRemaining(daysLeft);
                setShowPaywall(false);
            }

            setIsChecking(false);
        };

        checkSubscription();
    }, [school, currentUserEmail]);

    useEffect(() => {
        if (showPaywall) return;
        if (isUserAdmin(currentUserEmail)) return;

        const interval = setInterval(() => {
            const now = new Date();
            if (school?.subscription_expires_at) {
                const expiryDate = new Date(school.subscription_expires_at);
                if (now > expiryDate) {
                    setShowPaywall(true);
                }
            }
        }, 60000);

        return () => clearInterval(interval);
    }, [school, showPaywall, currentUserEmail]);

    if (isChecking) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100 dark:bg-slate-900">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300 text-lg">Vérification de votre abonnement...</p>
                </div>
            </div>
        );
    }

    if (showPaywall) {
        return <PaywallModal />;
    }

    const isAdminUser = isUserAdmin(currentUserEmail);

    return (
        <>
            {!isAdminUser && daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0 && (
                <div className="fixed top-4 right-4 z-40 bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span className="font-medium">
                        Expire dans {daysRemaining} jour{daysRemaining > 1 ? 's' : ''}
                    </span>
                </div>
            )}
            {children}
        </>
    );
};

const PaywallModal: React.FC = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-950 dark:to-slate-900 p-4">
            {/* Motif décoratif */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}></div>
            </div>

            <div className="max-w-md w-full relative">
                {/* Carte principale */}
                <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                    {/* Header avec dégradé */}
                    <div className="bg-gradient-to-r from-rose-500 to-orange-500 p-6 text-center">
                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border-2 border-white/30">
                            <i className="fas fa-lock text-white text-3xl"></i>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-1">
                            Accès Restreint
                        </h2>
                        <p className="text-white/80 text-sm">
                            Votre abonnement nécessite une mise à jour
                        </p>
                    </div>

                    {/* Contenu */}
                    <div className="p-6 text-center">
                        <div className="mb-6">
                            <p className="text-gray-600 dark:text-gray-300 mb-4 text-lg">
                                Votre abonnement est <span className="font-semibold text-rose-500">expiré</span> ou <span className="font-semibold text-rose-500">inexistant</span>.
                            </p>

                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <i className="fas fa-info-circle text-amber-500 mt-0.5"></i>
                                    <p className="text-sm text-amber-800 dark:text-amber-300 text-left">
                                        Contactez l'administrateur pour renouveler votre accès et continuer à utiliser l'application.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Bouton WhatsApp stylisé */}
                        <a
                            href="https://wa.me/242050133271"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center justify-center gap-3 w-full bg-gradient-to-r from-green-500 via-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transform hover:-translate-y-0.5"
                        >
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <i className="fab fa-whatsapp text-2xl"></i>
                            </div>
                            <div className="text-left">
                                <span className="block text-sm opacity-90">Contacter via</span>
                                <span className="font-bold">WhatsApp</span>
                            </div>
                            <i className="fas fa-external-link-alt ml-auto opacity-70 group-hover:translate-x-1 transition-transform"></i>
                        </a>

                        {/* Info contact */}
                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700">
                            <p className="text-gray-400 dark:text-gray-500 text-sm flex items-center justify-center gap-2">
                                <i className="fas fa-phone-alt text-xs"></i>
                                +242 05 01 33 271
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-400 text-sm mt-6">
                    PR-SCL - Gestion Scolaire Intelligente
                </p>
            </div>
        </div>
    );
};

export default SubscriptionGuard;
