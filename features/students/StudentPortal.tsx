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
        
        const fullClassName = student.serie ? `${student.classe} ${student.serie}` : student.classe;
        const monthlyFee = settings.accounting.classFees[fullClassName] || 0;
        const annualFee = monthlyFee * 9;
        const paid = student.totalPaid || 0;
        const balance = Math.max(0, annualFee - paid);
        const percent = annualFee > 0 ? Math.min(100, Math.round((paid / annualFee) * 100)) : 0;
        
        return { totalDue: annualFee, paid, balance, percent };
    }, [student, settings.accounting.classFees]);

    // Filtrer les notes
    const studentGrades = useMemo(() => 
        grades.filter(g => g.studentId === student?.id),
    [grades, student]);

    // Grouper les notes par trimestre puis par matière
    const groupedGrades = useMemo(() => {
        const termGroups: Record<string, Record<string, { devoir?: Grade, composition?: Grade, coefficient: number }>> = {};
        
        studentGrades.forEach(g => {
            if (!termGroups[g.trimestre]) termGroups[g.trimestre] = {};
            if (!termGroups[g.trimestre][g.matiere]) {
                termGroups[g.trimestre][g.matiere] = { coefficient: g.coefficient };
            }
            if (g.type === 'devoir') termGroups[g.trimestre][g.matiere].devoir = g;
            if (g.type === 'composition') termGroups[g.trimestre][g.matiere].composition = g;
        });
        
        return termGroups;
    }, [studentGrades]);

    // Calculer les moyennes par trimestre
    const termAverages = useMemo(() => {
        const averages: Record<string, number> = {};
        Object.entries(groupedGrades).forEach(([term, subjects]) => {
            let totalWeightedPoints = 0;
            let totalCoeffs = 0;
            
            Object.values(subjects).forEach(s => {
                const devoir = s.devoir?.valeur;
                const compo = s.composition?.valeur;
                
                let subAvg = 0;
                if (devoir !== undefined && compo !== undefined) {
                    subAvg = (devoir + compo) / 2;
                } else if (devoir !== undefined) {
                    subAvg = devoir;
                } else if (compo !== undefined) {
                    subAvg = compo;
                }
                
                totalWeightedPoints += subAvg * s.coefficient;
                totalCoeffs += s.coefficient;
            });
            
            averages[term] = totalCoeffs > 0 ? Number((totalWeightedPoints / totalCoeffs).toFixed(2)) : 0;
        });
        return averages;
    }, [groupedGrades]);

    const activeTheme = localTheme || settings.theme || 'blue';
    const themeHex = THEME_HEX_COLORS[activeTheme as keyof typeof THEME_HEX_COLORS] || THEME_HEX_COLORS.blue;

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
            <Card 
                className="overflow-hidden border-0 shadow-2xl p-0 relative"
                style={{ 
                    background: (localMode || settings.mode) === 'dark' 
                        ? `linear-gradient(135deg, ${themeHex.primary} 0%, ${themeHex.hover} 100%)`
                        : `${themeHex.primary}` 
                }}
            >
                <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8 relative z-10">
                    <div className="relative group">
                        <div className="w-28 h-28 md:w-32 md:h-32 rounded-3xl bg-white/30 backdrop-blur-md flex items-center justify-center text-5xl border-4 border-white/40 shadow-2xl overflow-hidden transition-transform group-hover:scale-105 duration-300">
                            {student.photo ? (
                                <img src={student.photo} alt={student.nom} className="w-full h-full object-cover" />
                            ) : (
                                <i className="fas fa-user-graduate text-white"></i>
                            )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-green-400 w-8 h-8 rounded-full border-4 flex items-center justify-center text-[10px]" style={{ borderColor: themeHex.primary }} title="En ligne">
                            <i className="fas fa-circle text-white animate-pulse"></i>
                        </div>
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <h2 className="text-3xl md:text-4xl font-black mb-3 uppercase tracking-tight text-white drop-shadow-lg">
                            {student.prenom} {student.nom}
                        </h2>
                        <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-3">
                            <span className="px-3 py-1.5 bg-white/20 rounded-xl text-xs md:text-sm font-bold backdrop-blur-md border border-white/20 text-white">
                                <i className="fas fa-id-card mr-2 opacity-70"></i> {student.matricule}
                            </span>
                            <span className="px-3 py-1.5 bg-white/20 rounded-xl text-xs md:text-sm font-bold backdrop-blur-md border border-white/20 text-white">
                                <i className="fas fa-school mr-2 opacity-70"></i> {student.classe} {student.serie || ''}
                            </span>
                            <span className="px-3 py-1.5 bg-white/90 text-gray-900 rounded-xl text-xs md:text-sm font-black border border-white/20 shadow-lg">
                                <i className="fas fa-star mr-2 text-yellow-500"></i> ÉLÈVE ACTIF
                            </span>
                        </div>
                    </div>
                    {/* Logout Button */}
                    <div className="w-full md:w-auto">
                        <button 
                            onClick={logout}
                            className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 bg-white/20 hover:bg-white text-white hover:text-red-600 transition-all rounded-2xl border border-white/30 font-bold group shadow-lg"
                        >
                            <i className="fas fa-power-off group-hover:rotate-12 transition-transform"></i>
                            <span>Déconnexion</span>
                        </button>
                    </div>
                </div>
                <div className="bg-black/20 backdrop-blur-sm p-3 px-8 flex flex-col md:flex-row justify-between items-center text-[10px] md:text-xs font-bold text-white uppercase tracking-widest gap-2">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                        Connecté sur PR-SCL Portal
                    </div>
                    <span className="opacity-90">Session ID: {student.id.substring(0, 12)}...</span>
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

                        {Object.keys(groupedGrades).length === 0 ? (
                            <div className="py-20 text-center opacity-50">
                                <i className="fas fa-file-invoice text-4xl mb-4"></i>
                                <p>Aucune note enregistrée pour le moment.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {Object.entries(groupedGrades).sort().map(([trimestre, subjects]) => (
                                    <div key={trimestre} className="space-y-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <span className="px-4 py-1 bg-indigo-600 text-white rounded-full text-xs font-black uppercase">Trimestre {trimestre}</span>
                                                <div className="h-px w-24 bg-gray-100 dark:bg-white/10"></div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Moyenne :</span>
                                                <span className={`text-lg font-black px-3 py-1 rounded-lg ${termAverages[trimestre] >= 10 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    {termAverages[trimestre]}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="overflow-x-auto -mx-6 px-6 scrollbar-hide">
                                            <table className="w-full text-left min-w-[550px] md:min-w-full">
                                                <thead>
                                                    <tr className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-white/5">
                                                        <th className="pb-3 px-2">Discipline</th>
                                                        <th className="pb-3 px-2 text-center">Devoir</th>
                                                        <th className="pb-3 px-2 text-center">Compo.</th>
                                                        <th className="pb-3 px-2 text-center">Coeff</th>
                                                        <th className="pb-3 px-2 text-right">Moyenne</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                                    {Object.entries(subjects).map(([subject, data], idx) => {
                                                        const d = data.devoir?.valeur;
                                                        const c = data.composition?.valeur;
                                                        let subAvg = 0;
                                                        if (d !== undefined && c !== undefined) subAvg = (d + c) / 2;
                                                        else if (d !== undefined) subAvg = d;
                                                        else if (c !== undefined) subAvg = c;

                                                        return (
                                                            <tr key={idx} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                                <td className="py-4 px-2 font-bold text-gray-800 dark:text-gray-100 text-sm md:text-base whitespace-nowrap">{subject}</td>
                                                                <td className="py-4 px-2 text-center">
                                                                    <div className={`inline-flex items-center justify-center w-10 h-8 md:w-12 md:h-9 rounded-lg text-sm font-black ${d !== undefined ? (d >= 10 ? 'bg-green-50 text-green-600 dark:bg-green-900/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20') : 'bg-gray-50 text-gray-300 dark:bg-white/5'}`}>
                                                                        {d !== undefined ? d : '--'}
                                                                    </div>
                                                                </td>
                                                                <td className="py-4 px-2 text-center">
                                                                    <div className={`inline-flex items-center justify-center w-10 h-8 md:w-12 md:h-9 rounded-lg text-sm font-black ${c !== undefined ? (c >= 10 ? 'bg-green-50 text-green-600 dark:bg-green-900/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20') : 'bg-gray-50 text-gray-300 dark:bg-white/5'}`}>
                                                                        {c !== undefined ? c : '--'}
                                                                    </div>
                                                                </td>
                                                                <td className="py-4 px-2 text-center text-xs md:text-sm font-bold text-gray-400">{data.coefficient}</td>
                                                                <td className="py-4 px-2 text-right">
                                                                    <span className={`text-sm md:text-base font-black ${subAvg >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {subAvg.toFixed(2)}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                            
                                            {/* Mobile Summary (Averages) */}
                                            <div className="md:hidden mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5 p-4 rounded-2xl">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Trimestre {trimestre}</span>
                                                    <span className="text-sm font-black text-gray-800 dark:text-white">Rapport Global</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-gray-500">Moyenne:</span>
                                                    <span className={`text-xl font-black px-4 py-2 rounded-xl shadow-lg ${termAverages[trimestre] >= 10 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                                        {termAverages[trimestre]}
                                                    </span>
                                                </div>
                                            </div>
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
