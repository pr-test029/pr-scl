import React, { useMemo } from 'react';
import { Card } from '../../components/ui/Common';
import { useSchool } from '../../App';
import { Student, Grade, Payment } from '../../types';
import { THEME_HEX_COLORS } from '../../constants';

export const StudentPortal: React.FC = () => {
    const { session, students, grades, payments, settings, updateLocalTheme, updateLocalMode, localTheme, localMode, logout } = useSchool();
    
    // Trouver l'élève correspondant à la session
    const student = useMemo(() => 
        students.find(s => s.matricule === session?.matricule),
    [students, session]);

    // Calculs financiers
    const financialData = useMemo(() => {
        if (!student) return { totalDue: 0, paid: 0, balance: 0, percent: 0 };
        
        const annualFee = settings.accounting.classFees[student.classe] || 0;
        const paid = student.totalPaid || 0;
        const balance = Math.max(0, annualFee - paid);
        const percent = annualFee > 0 ? Math.min(100, Math.round((paid / annualFee) * 100)) : 0;
        
        return { totalDue: annualFee, paid, balance, percent };
    }, [student, settings.accounting.classFees]);

    // Filtrer les notes
    const studentGrades = useMemo(() => 
        grades.filter(g => g.studentId === student?.id),
    [grades, student]);

    // Grouper par trimestre
    const gradesByTrimestre = useMemo(() => {
        const groups: Record<string, Grade[]> = {};
        studentGrades.forEach(g => {
            if (!groups[g.trimestre]) groups[g.trimestre] = [];
            groups[g.trimestre].push(g);
        });
        return groups;
    }, [studentGrades]);

    if (!student) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mb-4 animate-bounce">
                    <i className="fas fa-exclamation-triangle"></i>
                </div>
                <h2 className="text-2xl font-bold">Erreur de profil</h2>
                <p className="text-gray-500">Impossible de charger vos données d'élève.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Profil */}
            <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-0">
                <div className="p-8 flex flex-col md:flex-row items-center gap-8">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-5xl border-4 border-white/30 shadow-2xl overflow-hidden">
                            {student.photo ? (
                                <img src={student.photo} alt={student.nom} className="w-full h-full object-cover" />
                            ) : (
                                <i className="fas fa-user-graduate"></i>
                            )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-green-400 w-8 h-8 rounded-full border-4 border-indigo-700 flex items-center justify-center text-[10px]" title="En ligne">
                            <i className="fas fa-circle text-white animate-pulse"></i>
                        </div>
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <h2 className="text-4xl font-black mb-2 uppercase tracking-tight">{student.prenom} {student.nom}</h2>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <span className="px-4 py-1.5 bg-white/20 rounded-full text-sm font-bold backdrop-blur-md border border-white/20">
                                <i className="fas fa-id-card mr-2 opacity-70"></i> {student.matricule}
                            </span>
                            <span className="px-4 py-1.5 bg-white/20 rounded-full text-sm font-bold backdrop-blur-md border border-white/20">
                                <i className="fas fa-school mr-2 opacity-70"></i> {student.classe}
                            </span>
                            <span className="px-4 py-1.5 bg-yellow-400 text-indigo-900 rounded-full text-sm font-black border border-yellow-200">
                                <i className="fas fa-star mr-2"></i> ÉLÈVE ACTIF
                            </span>
                        </div>
                    </div>
                    {/* Logout Button */}
                    <div className="md:ml-auto">
                        <button 
                            onClick={logout}
                            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-red-500 transition-all rounded-2xl border border-white/20 font-bold group"
                        >
                            <i className="fas fa-sign-out-alt group-hover:rotate-12 transition-transform"></i>
                            <span>Déconnexion</span>
                        </button>
                    </div>
                </div>
                <div className="bg-black/10 backdrop-blur-sm p-4 px-8 flex justify-between items-center text-sm font-medium">
                    <span>Dernière connexion : Aujourd'hui</span>
                    <span className="opacity-70 italic">ID: {student.id}</span>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Situation Financière */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="h-full border-0 shadow-lg ring-1 ring-gray-100 dark:ring-white/5">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold flex items-center gap-3">
                                <i className="fas fa-wallet text-blue-600"></i>
                                Situation Financière
                            </h3>
                            <span className="text-xs font-black px-2 py-1 bg-blue-100 text-blue-600 rounded">ANNUEL</span>
                        </div>

                        <div className="flex flex-col items-center justify-center mb-8 relative">
                            {/* Graphique SVG Donut */}
                            <svg className="w-48 h-48 transform -rotate-90">
                                <circle
                                    cx="96"
                                    cy="96"
                                    r="80"
                                    fill="transparent"
                                    stroke="currentColor"
                                    strokeWidth="16"
                                    className="text-gray-100 dark:text-gray-800"
                                />
                                <circle
                                    cx="96"
                                    cy="96"
                                    r="80"
                                    fill="transparent"
                                    stroke="var(--primary-color)"
                                    strokeWidth="16"
                                    strokeDasharray={2 * Math.PI * 80}
                                    strokeDashoffset={2 * Math.PI * 80 * (1 - financialData.percent / 100)}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black text-gray-800 dark:text-white">{financialData.percent}%</span>
                                <span className="text-xs font-bold text-gray-400 uppercase">Payé</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
                                <span className="text-gray-500 font-medium">Total dû</span>
                                <span className="text-lg font-black">{financialData.totalDue.toLocaleString()} FCFA</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                <span className="text-green-600 font-medium">Déjà payé</span>
                                <span className="text-lg font-black text-green-600">{financialData.paid.toLocaleString()} FCFA</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                                <span className="text-red-600 font-medium">Reste à payer</span>
                                <span className="text-lg font-black text-red-600">{financialData.balance.toLocaleString()} FCFA</span>
                            </div>
                        </div>

                        {financialData.balance > 0 && (
                            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl flex items-start gap-3">
                                <i className="fas fa-info-circle text-amber-600 mt-1"></i>
                                <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                                    Pensez à régulariser votre situation avant la fin du trimestre pour éviter tout désagrément.
                                </p>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Résultats Scolaires */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="h-full border-0 shadow-lg ring-1 ring-gray-100 dark:ring-white/5">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <i className="fas fa-graduation-cap text-indigo-600"></i>
                            Résultats Scolaires
                        </h3>

                        {Object.keys(gradesByTrimestre).length === 0 ? (
                            <div className="py-20 text-center opacity-50">
                                <i className="fas fa-file-invoice text-4xl mb-4"></i>
                                <p>Aucune note enregistrée pour le moment.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {Object.entries(gradesByTrimestre).sort().map(([trimestre, items]) => (
                                    <div key={trimestre} className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <span className="px-4 py-1 bg-indigo-600 text-white rounded-full text-xs font-black uppercase">Trimestre {trimestre}</span>
                                            <div className="h-px flex-1 bg-gray-100 dark:bg-white/10"></div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {items.map((grade, idx) => (
                                                <div key={idx} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-white/5 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                                                    <div>
                                                        <h4 className="font-bold text-gray-800 dark:text-gray-100">{grade.matiere}</h4>
                                                        <p className="text-xs text-gray-400 capitalize">{grade.type} • Coeff: {grade.coefficient}</p>
                                                    </div>
                                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-black shadow-inner ${grade.valeur >= 10 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                        {grade.valeur}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Infos supplémentaires */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InfoCard icon="phone" label="Téléphone" value={student.telephone || 'Non renseigné'} color="blue" />
                <InfoCard icon="map-marker-alt" label="Ville" value={student.ville} color="green" />
                <InfoCard icon="calendar-alt" label="Date d'inscription" value={new Date(student.dateInscription).toLocaleDateString('fr-FR')} color="purple" />
            </div>

            <Card title="Personnalisation de l'affichage">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <i className="fas fa-palette text-blue-500"></i> Couleur préférée
                            </h4>
                            <div className="flex flex-wrap gap-4">
                                {(['blue', 'green', 'purple', 'red'] as const).map(c => (
                                    <button
                                        key={c}
                                        onClick={() => updateLocalTheme(c)}
                                        className={`w-14 h-14 rounded-2xl transition-all border-4 shadow-sm hover:shadow-xl hover:-translate-y-1 ${
                                            (localTheme || settings.theme) === c ? 'border-white dark:border-white/50 scale-110 ring-4 ring-blue-400/30' : 'border-transparent opacity-50 hover:opacity-100'
                                        }`}
                                        style={{ backgroundColor: THEME_HEX_COLORS[c].primary }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <i className="fas fa-circle-half-stroke text-indigo-500"></i> Ambiance
                        </h4>
                        <div className="flex gap-4">
                            <button
                                onClick={() => updateLocalMode('light')}
                                className={`flex-1 flex flex-col items-center gap-2 p-6 rounded-3xl border-2 transition-all ${
                                    (localMode || settings.mode) === 'light' 
                                    ? 'bg-white text-blue-600 border-blue-500 font-bold shadow-xl -translate-y-1' 
                                    : 'bg-gray-50 text-gray-400 border-transparent dark:bg-white/5'
                                }`}
                            >
                                <i className="fas fa-sun text-2xl"></i>
                                <span>Clair</span>
                            </button>
                            <button
                                onClick={() => updateLocalMode('dark')}
                                className={`flex-1 flex flex-col items-center gap-2 p-6 rounded-3xl border-2 transition-all ${
                                    (localMode || settings.mode) === 'dark' 
                                    ? 'bg-slate-800 text-white border-blue-400 font-bold shadow-xl -translate-y-1' 
                                    : 'bg-gray-50 text-gray-400 border-transparent dark:bg-white/5'
                                }`}
                            >
                                <i className="fas fa-moon text-2xl"></i>
                                <span>Sombre</span>
                            </button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

const InfoCard: React.FC<{ icon: string, label: string, value: string, color: string }> = ({ icon, label, value, color }) => (
    <Card className="flex items-center gap-4 p-5 border-0 shadow-sm ring-1 ring-gray-100 dark:ring-white/5">
        <div className={`w-12 h-12 bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 rounded-xl flex items-center justify-center text-xl`}>
            <i className={`fas fa-${icon}`}></i>
        </div>
        <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
            <p className="text-lg font-bold text-gray-800 dark:text-white">{value}</p>
        </div>
    </Card>
);
