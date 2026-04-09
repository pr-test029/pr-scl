
import React, { useState, useEffect } from 'react';
import { School } from '../../types';
import { Card, Button, Modal } from '../../components/ui/Common';
import {
    subscribeToSchools,
    setSubscription,
    isAdmin as checkIsAdmin
} from '../../services/firebase';
import { auth } from '../../services/firebase';

interface AdminPanelProps {
    onBack: () => void;
}

interface SchoolWithUser extends School {
    userCount?: number;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
    const [schools, setSchools] = useState<SchoolWithUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ school: School; months: number } | null>(null);
    const [processing, setProcessing] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user || !checkIsAdmin(user.email)) {
            setLoading(false);
            return;
        }

        const unsubscribe = subscribeToSchools((updatedSchools) => {
            setSchools(updatedSchools);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleAddSubscription = (school: School, months: number) => {
        setConfirmAction({ school, months });
        setShowConfirmModal(true);
    };

    const confirmSubscription = async () => {
        if (!confirmAction) return;

        setProcessing(true);
        const { school, months } = confirmAction;

        try {
            let plan: 'monthly' | 'quarterly' | 'annual';
            switch (months) {
                case 1:
                    plan = 'monthly';
                    break;
                case 3:
                    plan = 'quarterly';
                    break;
                case 12:
                    plan = 'annual';
                    break;
                default:
                    plan = 'monthly';
            }

            await setSubscription(school.id, plan);
            setShowConfirmModal(false);
            setConfirmAction(null);
        } catch (error) {
            console.error('Erreur lors de la mise à jour:', error);
            alert('Erreur lors de la mise à jour de l\'abonnement');
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadge = (school: School) => {
        const now = new Date();
        let status = school.subscription_status || 'free';
        let daysLeft = 0;

        if (school.subscription_expires_at) {
            const expiry = new Date(school.subscription_expires_at);
            daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 0) {
                status = 'expired';
            }
        }

        const statusConfig = {
            active: {
                bg: 'bg-emerald-100 dark:bg-emerald-500/20',
                text: 'text-emerald-700 dark:text-emerald-400',
                border: 'border-emerald-200 dark:border-emerald-500/30',
                icon: 'fa-check-circle',
                label: 'Actif'
            },
            expired: {
                bg: 'bg-rose-100 dark:bg-rose-500/20',
                text: 'text-rose-700 dark:text-rose-400',
                border: 'border-rose-200 dark:border-rose-500/30',
                icon: 'fa-times-circle',
                label: 'Expiré'
            },
            free: {
                bg: 'bg-slate-100 dark:bg-slate-500/20',
                text: 'text-slate-700 dark:text-slate-400',
                border: 'border-slate-200 dark:border-slate-500/30',
                icon: 'fa-minus-circle',
                label: 'Gratuit'
            }
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.free;

        return (
            <div className="flex flex-col items-start">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
                    <i className={`fas ${config.icon}`}></i>
                    {config.label}
                </span>
                {status === 'active' && daysLeft > 0 && daysLeft <= 7 && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                        {daysLeft} jour{daysLeft > 1 ? 's' : ''}
                    </span>
                )}
            </div>
        );
    };

    const getPlanBadge = (plan: string) => {
        const planConfig = {
            monthly: {
                bg: 'bg-blue-100 dark:bg-blue-500/20',
                text: 'text-blue-700 dark:text-blue-400',
                border: 'border-blue-200 dark:border-blue-500/30',
                label: 'Mensuel'
            },
            quarterly: {
                bg: 'bg-violet-100 dark:bg-violet-500/20',
                text: 'text-violet-700 dark:text-violet-400',
                border: 'border-violet-200 dark:border-violet-500/30',
                label: 'Trimestriel'
            },
            annual: {
                bg: 'bg-amber-100 dark:bg-amber-500/20',
                text: 'text-amber-700 dark:text-amber-400',
                border: 'border-amber-200 dark:border-amber-500/30',
                label: 'Annuel'
            },
            free: {
                bg: 'bg-gray-100 dark:bg-gray-500/20',
                text: 'text-gray-600 dark:text-gray-400',
                border: 'border-gray-200 dark:border-gray-500/30',
                label: 'Gratuit'
            }
        };

        const config = planConfig[plan as keyof typeof planConfig] || planConfig.free;

        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
                {config.label}
            </span>
        );
    };

    const formatDate = (date: Date | null | undefined) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const filteredSchools = schools.filter(school =>
        school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.owner_email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeCount = schools.filter(s => s.subscription_status === 'active').length;
    const expiredCount = schools.filter(s => {
        if (!s.subscription_expires_at) return false;
        return new Date(s.subscription_expires_at) < new Date();
    }).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="flex flex-col items-center">
                    <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Chargement des écoles...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header élégant */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/30">
                            <i className="fas fa-shield-alt text-2xl"></i>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Panneau d'Administration</h2>
                            <p className="text-blue-100">Gérez les abonnements et les écoles</p>
                        </div>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={onBack}
                        className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                    >
                        <i className="fas fa-arrow-left mr-2"></i>
                        Retour
                    </Button>
                </div>
            </div>

            {/* Statistiques modernes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon="fa-school"
                    label="Total Écoles"
                    value={schools.length}
                    gradient="from-blue-500 to-blue-600"
                    iconBg="bg-blue-100 dark:bg-blue-500/30"
                    iconColor="text-blue-600 dark:text-blue-400"
                />
                <StatCard
                    icon="fa-check-circle"
                    label="Actifs"
                    value={activeCount}
                    gradient="from-emerald-500 to-emerald-600"
                    iconBg="bg-emerald-100 dark:bg-emerald-500/30"
                    iconColor="text-emerald-600 dark:text-emerald-400"
                />
                <StatCard
                    icon="fa-exclamation-circle"
                    label="Expirés"
                    value={expiredCount}
                    gradient="from-rose-500 to-rose-600"
                    iconBg="bg-rose-100 dark:bg-rose-500/30"
                    iconColor="text-rose-600 dark:text-rose-400"
                />
                <StatCard
                    icon="fa-calendar-plus"
                    label="Ce mois"
                    value={schools.filter(s => {
                        if (!s.created_at) return false;
                        const now = new Date();
                        const created = new Date(s.created_at);
                        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                    }).length}
                    gradient="from-violet-500 to-violet-600"
                    iconBg="bg-violet-100 dark:bg-violet-500/30"
                    iconColor="text-violet-600 dark:text-violet-400"
                />
            </div>

            {/* Barre de recherche modernisée */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
                <div className="relative">
                    <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input
                        type="text"
                        placeholder="Rechercher par nom d'école ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>
            </div>

            {/* Tableau des écoles */}
            <Card className="overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700">
                            <tr>
                                <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider py-4 px-4">
                                    École & Contact
                                </th>
                                <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider py-4 px-4">
                                    Plan
                                </th>
                                <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider py-4 px-4">
                                    Statut
                                </th>
                                <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider py-4 px-4">
                                    Expiration
                                </th>
                                <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider py-4 px-4">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                            {filteredSchools.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12">
                                        <div className="flex flex-col items-center text-gray-400">
                                            <i className="fas fa-search text-4xl mb-3 opacity-50"></i>
                                            <p>Aucune école trouvée</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredSchools.map((school) => (
                                    <tr key={school.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                                    {school.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                        {school.name}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                                                        <i className="fas fa-envelope text-xs"></i>
                                                        <span className="truncate">{school.owner_email}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            {getPlanBadge(school.subscription_plan || 'free')}
                                        </td>
                                        <td className="py-4 px-4">
                                            {getStatusBadge(school)}
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                                    {formatDate(school.subscription_expires_at)}
                                                </span>
                                                {school.subscription_expires_at && (
                                                    <span className="text-xs text-gray-400">
                                                        {Math.ceil((new Date(school.subscription_expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} jours restants
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleAddSubscription(school, 1)}
                                                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium transition-all border border-blue-200 dark:border-blue-500/30 hover:shadow-sm"
                                                    title="Ajouter 1 mois"
                                                >
                                                    +1M
                                                </button>
                                                <button
                                                    onClick={() => handleAddSubscription(school, 3)}
                                                    className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-lg text-sm font-medium transition-all border border-violet-200 dark:border-violet-500/30 hover:shadow-sm"
                                                    title="Ajouter 3 mois"
                                                >
                                                    +3M
                                                </button>
                                                <button
                                                    onClick={() => handleAddSubscription(school, 12)}
                                                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg text-sm font-medium transition-all border border-amber-200 dark:border-amber-500/30 hover:shadow-sm"
                                                    title="Ajouter 12 mois"
                                                >
                                                    +12M
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal de confirmation */}
            <Modal
                isOpen={showConfirmModal}
                onClose={() => !processing && setShowConfirmModal(false)}
                title="Confirmer l'abonnement"
            >
                {confirmAction && (
                    <div className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                {confirmAction.school.name}
                            </h4>
                            <div className="space-y-1 text-sm">
                                <p className="text-gray-600 dark:text-gray-300">
                                    <i className="fas fa-envelope mr-2 text-gray-400"></i>
                                    {confirmAction.school.owner_email}
                                </p>
                                <p className="text-gray-600 dark:text-gray-300">
                                    <i className="fas fa-clock mr-2 text-gray-400"></i>
                                    Durée: <span className="font-semibold text-blue-600 dark:text-blue-400">{confirmAction.months} mois</span>
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            La nouvelle date d'expiration sera calculée à partir d'aujourd'hui.
                        </p>

                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="secondary"
                                onClick={() => setShowConfirmModal(false)}
                                disabled={processing}
                                className="flex-1"
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={confirmSubscription}
                                disabled={processing}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            >
                                {processing ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin mr-2"></i>
                                        Traitement...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-check mr-2"></i>
                                        Confirmer
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

const StatCard: React.FC<{
    icon: string;
    label: string;
    value: number;
    gradient: string;
    iconBg: string;
    iconColor: string;
}> = ({ icon, label, value, iconBg, iconColor }) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg ${iconBg} flex items-center justify-center ${iconColor}`}>
                <i className={`fas ${icon} text-xl`}></i>
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            </div>
        </div>
    </div>
);

export default AdminPanel;
