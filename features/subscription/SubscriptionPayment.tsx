import React, { useState, useEffect } from 'react';
import { setSubscription } from '../../services/firebase';
import { initiatePayment, checkPaymentStatus } from '../../services/moneyFusion';

interface SubscriptionPaymentProps {
    schoolId: string;
    onPaymentSuccess: () => void;
}

const PLANS = [
    {
        id: 'monthly' as const,
        name: 'Mensuel',
        price: 20000,
        desc: '30 jours',
        icon: 'fa-calendar-day',
        color: 'from-sky-500 to-blue-600'
    },
    {
        id: 'quarterly' as const,
        name: 'Trimestriel',
        price: 50000,
        desc: '90 jours',
        icon: 'fa-calendar-week',
        color: 'from-violet-500 to-purple-600'
    },
    {
        id: 'annual' as const,
        name: 'Annuel',
        price: 180000,
        desc: '365 jours',
        icon: 'fa-calendar',
        color: 'from-amber-500 to-orange-600'
    },
];

export const SubscriptionPayment: React.FC<SubscriptionPaymentProps> = ({ schoolId, onPaymentSuccess }) => {
    const [selectedPlan, setSelectedPlan] = useState(PLANS[0]);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paymentToken, setPaymentToken] = useState<string | null>(null);
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
    const [pollingActive, setPollingActive] = useState(false);

    const handleInitiatePayment = async () => {
        if (!phoneNumber.trim()) {
            setError('Veuillez entrer votre numéro de téléphone Mobile Money.');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const response = await initiatePayment({
                totalPrice: selectedPlan.price,
                numeroSend: phoneNumber.trim(),
                nomclient: `Ecole ${schoolId}`,
                article: [{ [selectedPlan.name]: selectedPlan.price }],
                personal_Info: [{ schoolId }],
            });

            if (response.statut && response.token && response.url) {
                setPaymentToken(response.token);
                setPaymentUrl(response.url);
                setPollingActive(true);
                window.open(response.url, '_blank');
            } else {
                setError(response.message || "Erreur lors de l'initiation du paiement.");
            }
        } catch (err: any) {
            setError(err.message || "Erreur de connexion avec MoneyFusion.");
        } finally {
            setLoading(false);
        }
    };

    // Polling du statut de paiement toutes les 5 secondes
    useEffect(() => {
        if (!paymentToken || !pollingActive) return;

        const intervalId = setInterval(async () => {
            try {
                const status = await checkPaymentStatus(paymentToken);
                if (status.statut === true || status.statut === 'success') {
                    clearInterval(intervalId);
                    await setSubscription(schoolId, selectedPlan.id);
                    onPaymentSuccess();
                } else if (status.statut === false || status.statut === 'failed') {
                    clearInterval(intervalId);
                    setPollingActive(false);
                    setError("Le paiement a échoué ou a été annulé. Veuillez réessayer.");
                    setPaymentToken(null);
                }
            } catch (err) {
                console.error("Erreur lors du polling:", err);
            }
        }, 5000);

        return () => clearInterval(intervalId);
    }, [paymentToken, pollingActive, schoolId, selectedPlan, onPaymentSuccess]);

    // Écran d'attente de paiement
    if (paymentToken) {
        return (
            <div className="text-center py-4">
                <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-6 text-blue-500 text-3xl">
                    <i className="fas fa-spinner fa-spin"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Paiement en attente...</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                    Finalisez le paiement de <strong>{selectedPlan.price.toLocaleString('fr-FR')} FCFA</strong> sur la page MoneyFusion qui s'est ouverte.
                    L'accès sera débloqué automatiquement dès confirmation.
                </p>
                {paymentUrl && (
                    <a
                        href={paymentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-600 underline text-sm mb-6 font-medium"
                    >
                        <i className="fas fa-external-link-alt"></i>
                        Ouvrir la page de paiement
                    </a>
                )}
                <button
                    onClick={() => { setPaymentToken(null); setPollingActive(false); }}
                    className="w-full py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-all border border-gray-200 dark:border-white/5"
                >
                    Annuler et réessayer
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Sélection du plan */}
            <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 ml-1">Choisissez votre forfait</p>
                <div className="grid grid-cols-3 gap-2">
                    {PLANS.map(plan => (
                        <button
                            key={plan.id}
                            type="button"
                            onClick={() => setSelectedPlan(plan)}
                            className={`p-3 rounded-2xl border-2 text-center transition-all duration-200 ${
                                selectedPlan.id === plan.id
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-700'
                            }`}
                        >
                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mx-auto mb-2 text-white text-xs`}>
                                <i className={`fas ${plan.icon}`}></i>
                            </div>
                            <p className="font-bold text-sm text-gray-900 dark:text-white">{plan.name}</p>
                            <p className="text-blue-600 dark:text-blue-400 font-black text-xs">{plan.price.toLocaleString('fr-FR')} F</p>
                            <p className="text-gray-400 text-[10px]">{plan.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Numéro de téléphone */}
            <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 ml-1">
                    Numéro Mobile Money
                </label>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <i className="fas fa-mobile-alt"></i>
                    </div>
                    <input
                        type="tel"
                        placeholder="Ex: 050123456"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        className="w-full pl-11 pr-4 h-12 bg-white dark:bg-slate-900/50 border-2 border-gray-100 dark:border-white/5 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-all"
                    />
                </div>
            </div>

            {/* Erreur */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm">
                    <i className="fas fa-exclamation-circle mr-2"></i>{error}
                </div>
            )}

            {/* Bouton payer */}
            <button
                onClick={handleInitiatePayment}
                disabled={loading || !phoneNumber.trim()}
                className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-base shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
                {loading ? (
                    <><i className="fas fa-circle-notch fa-spin"></i> Connexion en cours...</>
                ) : (
                    <><i className="fas fa-lock-open"></i> Payer {selectedPlan.price.toLocaleString('fr-FR')} FCFA</>
                )}
            </button>

            <p className="text-center text-xs text-gray-400 dark:text-gray-600">
                <i className="fas fa-shield-alt mr-1"></i>
                Paiement sécurisé via <strong>MoneyFusion</strong>
            </p>
        </div>
    );
};
