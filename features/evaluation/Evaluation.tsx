import React, { useState, useMemo } from 'react';
import { Card, Button, Select } from '../../components/ui/Common';
import { useSchool } from '../../App';
import { Student, Grade } from '../../types';

export const Evaluation: React.FC = () => {
    const { students, grades, payments, settings, subjects } = useSchool();
    const [activeTrimestre, setActiveTrimestre] = useState<string>('1');
    const [selectedMonth, setSelectedMonth] = useState<number>(1); // 1 to 9
    const [selectedCycle, setSelectedCycle] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('');

    const months = [
        { id: 1, label: 'Octobre' },
        { id: 2, label: 'Novembre' },
        { id: 3, label: 'Décembre' },
        { id: 4, label: 'Janvier' },
        { id: 5, label: 'Février' },
        { id: 6, label: 'Mars' },
        { id: 7, label: 'Avril' },
        { id: 8, label: 'Mai' },
        { id: 9, label: 'Juin' }
    ];

    // 1. Academic Ranking
    const academicStats = useMemo(() => {
        const studentAverages = students.map(student => {
            const studentGrades = grades.filter(g => g.studentId === student.id && g.trimestre === activeTrimestre);
            if (studentGrades.length === 0) return { ...student, average: 0, hasGrades: false };

            const subData: Record<string, { total: number, count: number, coeff: number, compoNote: number | null }> = {};
            studentGrades.forEach(g => {
                if (!subData[g.matiere]) {
                    const subInfo = (subjects[student.serie ? `${student.classe} ${student.serie}` : student.classe] || []).find(sub => sub.nom === g.matiere);
                    subData[g.matiere] = { total: 0, count: 0, coeff: subInfo?.coefficient || g.coefficient || 1, compoNote: null };
                }
                const gType = (g.type || '').trim().toLowerCase();
                if (gType.includes('compo') || gType.includes('session') || gType.includes('examen')) {
                    subData[g.matiere].compoNote = g.valeur;
                } else {
                    subData[g.matiere].total += g.valeur;
                    subData[g.matiere].count += 1;
                }
            });

            const points = Object.values(subData).reduce((acc, d) => {
                const moyDev = d.count > 0 ? d.total / d.count : (d.compoNote || 0);
                const final = d.compoNote !== null ? (moyDev + d.compoNote) / 2 : moyDev;
                return acc + (final * d.coeff);
            }, 0);

            const totalCoeffs = Object.values(subData).reduce((acc, d) => acc + d.coeff, 0);
            const average = totalCoeffs > 0 ? points / totalCoeffs : 0;

            return { ...student, average, hasGrades: true };
        });

        const studentsWithGrades = studentAverages.filter(s => s.hasGrades);
        const top5 = [...studentsWithGrades].sort((a, b) => b.average - a.average).slice(0, 5);
        const bottom10 = [...studentsWithGrades].sort((a, b) => a.average - b.average).slice(0, 10);

        return { top5, bottom10 };
    }, [students, grades, activeTrimestre, subjects]);

    // 2. Financial Recovery Data Preparation
    const recoveryData = useMemo(() => {
        const debtors = students.filter(student => {
            const fullClassName = student.serie ? `${student.classe} ${student.serie}` : student.classe;
            const monthlyFee = settings.accounting?.classFees[fullClassName] || 0;
            const expectedUpToNow = monthlyFee * selectedMonth;
            return (student.totalPaid || 0) < expectedUpToNow;
        });

        const cyclesFound = Array.from(new Set(debtors.map(s => s.cycle)));
        const classesInCycle = selectedCycle ? Array.from(new Set(debtors.filter(s => s.cycle === selectedCycle).map(s => s.classe))) : [];
        const studentsToDisplay = (selectedCycle && selectedClass) 
            ? debtors.filter(s => s.cycle === selectedCycle && s.classe === selectedClass)
            : [];

        return { debtors, cyclesFound, classesInCycle, studentsToDisplay };
    }, [students, selectedMonth, selectedCycle, selectedClass, settings.accounting]);

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            {/* Header with Trimestre Switch */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white dark:bg-white/5 p-6 rounded-3xl shadow-xl border dark:border-white/10">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Suivi Académique</h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Classement général de l'établissement</p>
                </div>
                <div className="flex bg-gray-100 dark:bg-white/10 p-1.5 rounded-2xl">
                    {['1', '2', '3'].map(p => (
                        <button 
                            key={p} 
                            onClick={() => setActiveTrimestre(p)} 
                            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTrimestre === p ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'}`}
                        >
                            Trimestre {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Top 5 & Bottom 10 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top 5 */}
                <Card className="border-t-4 border-green-500 shadow-2xl overflow-hidden" title={
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                            <i className="fas fa-crown text-lg"></i>
                        </div>
                        <span className="font-black uppercase tracking-tight">Tableau d'Honneur (Top 5)</span>
                    </div>
                }>
                    <div className="divide-y dark:divide-white/5">
                        {academicStats.top5.map((s, idx) => (
                            <div key={s.id} className="flex items-center justify-between p-4 hover:bg-green-50/30 dark:hover:bg-green-900/5 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-yellow-400 text-white shadow-yellow-200' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-green-600 transition-colors">{s.nom} {s.prenom}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.classe} • {s.cycle}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-green-600 tracking-tighter">{s.average.toFixed(2)}</p>
                                    <p className="text-[8px] font-black uppercase text-gray-400">Moyenne</p>
                                </div>
                            </div>
                        ))}
                        {academicStats.top5.length === 0 && <p className="p-10 text-center text-gray-400 italic">Aucune donnée disponible</p>}
                    </div>
                </Card>

                {/* Bottom 10 */}
                <Card className="border-t-4 border-red-500 shadow-2xl overflow-hidden" title={
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
                            <i className="fas fa-exclamation-triangle text-lg"></i>
                        </div>
                        <span className="font-black uppercase tracking-tight">Suivi de Soutien (Derniers 10)</span>
                    </div>
                }>
                    <div className="divide-y dark:divide-white/5">
                        {academicStats.bottom10.map((s, idx) => (
                            <div key={s.id} className="flex items-center justify-between p-4 hover:bg-red-50/30 dark:hover:bg-red-900/5 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center font-black text-xs">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-red-600 transition-colors">{s.nom} {s.prenom}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.classe} • {s.cycle}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-red-600 tracking-tighter">{s.average.toFixed(2)}</p>
                                    <p className="text-[8px] font-black uppercase text-gray-400">Moyenne</p>
                                </div>
                            </div>
                        ))}
                        {academicStats.bottom10.length === 0 && <p className="p-10 text-center text-gray-400 italic">Aucune donnée disponible</p>}
                    </div>
                </Card>
            </div>

            {/* Financial Recovery Section */}
            <div className="bg-white dark:bg-white/5 p-8 rounded-3xl shadow-2xl border dark:border-white/10 space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Recouvrement des Frais</h2>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Suivi des impayés par mois</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                        {months.map(m => (
                            <button 
                                key={m.id} 
                                onClick={() => {
                                    setSelectedMonth(m.id);
                                    // Reset filters when month changes to avoid confusion
                                    setSelectedCycle('');
                                    setSelectedClass('');
                                }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${selectedMonth === m.id ? 'bg-red-600 text-white shadow-lg scale-105' : 'bg-gray-100 dark:bg-white/10 text-gray-500 hover:bg-gray-200'}`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Filter Section */}
                    <div className="flex flex-col md:flex-row gap-6 items-end p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border dark:border-white/10">
                        <div className="flex-1 space-y-3 w-full">
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">1. Choisir le Cycle</p>
                            <div className="flex flex-wrap gap-2">
                                {recoveryData.cyclesFound.length === 0 && <p className="text-xs text-gray-400 italic">Aucun impayé trouvé pour ce mois.</p>}
                                {recoveryData.cyclesFound.map(cycle => (
                                    <button
                                        key={cycle}
                                        onClick={() => {
                                            setSelectedCycle(cycle);
                                            setSelectedClass('');
                                        }}
                                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${selectedCycle === cycle ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-400 border dark:border-white/10 hover:border-blue-300'}`}
                                    >
                                        {cycle}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedCycle && (
                            <div className="w-full md:w-64 space-y-3 animate-slide-in">
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">2. Choisir la Classe</p>
                                <Select
                                    value={selectedClass}
                                    onChange={e => setSelectedClass(e.target.value)}
                                    options={[
                                        { value: '', label: 'Sélectionner une classe' },
                                        ...recoveryData.classesInCycle.map(c => ({ value: c, label: c }))
                                    ]}
                                />
                            </div>
                        )}
                    </div>

                    {/* Results Section */}
                    <div className="animate-fade-in">
                        {!selectedCycle ? (
                            <div className="text-center py-16 text-gray-400 italic bg-gray-50/50 dark:bg-white/5 rounded-3xl border border-dashed dark:border-white/10">
                                <i className="fas fa-filter text-3xl mb-4 opacity-20"></i>
                                <p>Veuillez sélectionner un cycle pour voir les impayés</p>
                            </div>
                        ) : !selectedClass ? (
                            <div className="text-center py-16 text-gray-400 italic bg-gray-50/50 dark:bg-white/5 rounded-3xl border border-dashed dark:border-white/10">
                                <i className="fas fa-chalkboard text-3xl mb-4 opacity-20"></i>
                                <p>Veuillez sélectionner une classe de {selectedCycle}</p>
                            </div>
                        ) : recoveryData.studentsToDisplay.length === 0 ? (
                            <div className="text-center py-16 text-green-500 italic bg-green-50/20 dark:bg-green-900/5 rounded-3xl border border-dashed border-green-200 dark:border-green-800/20">
                                <i className="fas fa-check-circle text-3xl mb-4"></i>
                                <p className="font-black uppercase tracking-widest text-xs">Félicitations ! Aucun impayé pour cette classe.</p>
                            </div>
                        ) : (
                            <Card title={`${selectedClass} - ${recoveryData.studentsToDisplay.length} élève(s) en retard`} className="border-l-4 border-red-500 shadow-xl">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
                                    {recoveryData.studentsToDisplay.map(s => {
                                        const fullClassName = s.serie ? `${s.classe} ${s.serie}` : s.classe;
                                        const monthlyFee = settings.accounting?.classFees[fullClassName] || 0;
                                        const debt = (monthlyFee * selectedMonth) - (s.totalPaid || 0);
                                        return (
                                            <div key={s.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl flex justify-between items-center border dark:border-white/10 group hover:border-red-300 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-all">
                                                <div>
                                                    <p className="font-black text-sm uppercase dark:text-white tracking-tight">{s.nom} {s.prenom}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Dette :</span>
                                                        <span className="text-xs font-black text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-lg">{debt.toLocaleString()} FCFA</span>
                                                    </div>
                                                </div>
                                                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 shadow-sm group-hover:scale-110 transition-transform">
                                                    <i className="fas fa-exclamation-circle"></i>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
