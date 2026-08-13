import React, { useState, useEffect } from 'react';
import { setSubscription } from '../../services/firebase';

interface SubscriptionPaymentProps {
  schoolId: string;
  onPaymentSuccess: () => void;
}

// Mapping of Chariow product IDs to internal plan identifiers
const PRODUCT_IDS: Record<string, string> = {
  monthly: 'prd_612sq612', // provided ID
  quarterly: 'prd_quarterly_id', // replace with actual ID
  annual: 'prd_annual_id', // replace with actual ID
};

const PLANS = [
  {
    id: 'monthly' as const,
    name: 'Mensuel',
    price: 20000,
    desc: '30 jours',
    icon: 'fa-calendar-day',
    color: 'from-sky-500 to-blue-600',
  },
  {
    id: 'quarterly' as const,
    name: 'Trimestriel',
    price: 50000,
    desc: '90 jours',
    icon: 'fa-calendar-week',
    color: 'from-violet-500 to-purple-600',
  },
  {
    id: 'annual' as const,
    name: 'Annuel',
    price: 180000,
    desc: '365 jours',
    icon: 'fa-calendar',
    color: 'from-amber-500 to-orange-600',
  },
];

export const SubscriptionPayment: React.FC<SubscriptionPaymentProps> = ({ schoolId, onPaymentSuccess }) => {
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load Chariow widget script when the selected plan changes
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://js.chariowcdn.com/v1/widget.min.js';
    script.async = true;
    document.head.appendChild(script);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://js.chariowcdn.com/v1/widget.min.css';
    document.head.appendChild(link);
  }, [selectedPlan.id]);

  const renderWidget = () => {
    const productId = PRODUCT_IDS[selectedPlan.id];
    if (!productId) {
      setError('Produit Chariow non configuré pour ce forfait.');
      return null;
    }
    return (
      <div
        id="chariow-widget"
        data-product-id={productId}
        data-store-domain="avjgomms.mychariow.shop"
        data-style="tap"
        data-border-style="rounded"
        data-cta-width="xs"
        data-background-color="#FFFFFF"
        data-cta-animation="none"
        data-locale="fr"
        data-primary-color="#0047AB"
      />
    );
  };

  const handleSuccess = async () => {
    try {
      await setSubscription(schoolId, selectedPlan.id);
      onPaymentSuccess();
    } catch (e) {
      console.error('Failed to set subscription:', e);
    }
  };

  // Listen for Chariow checkout success event
  useEffect(() => {
    const onSuccess = () => handleSuccess();
    window.addEventListener('chariow:checkout:success', onSuccess as EventListener);
    return () => window.removeEventListener('chariow:checkout:success', onSuccess as EventListener);
  }, [selectedPlan.id, schoolId]);

  return (
    <div className="space-y-6">
      {/* Plan selection */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 ml-1">
          Choisissez votre forfait
        </p>
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
                <i className={`fas ${plan.icon}`} />
              </div>
              <p className="font-bold text-sm text-gray-900 dark:text-white">{plan.name}</p>
              <p className="text-blue-600 dark:text-blue-400 font-black text-xs">{plan.price.toLocaleString('fr-FR')} F</p>
              <p className="text-gray-400 text-[10px]">{plan.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Phone number input */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 ml-1">
          Numéro Mobile Money
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <i className="fas fa-mobile-alt" />
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

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm">
          <i className="fas fa-exclamation-circle mr-2" />{error}
        </div>
      )}

      {/* Chariow widget */}
      {renderWidget()}

      <p className="text-center text-xs text-gray-400 dark:text-gray-600">
        <i className="fas fa-shield-alt mr-1" />
        Paiement sécurisé via <strong>Chariow</strong>
      </p>
    </div>
  );
};
