import React, { useState, useMemo } from 'react';
import { Card, Button, Select } from '../../components/ui/Common';
import { HelpGuide } from '../../components/ui/HelpGuide';
import { useSchool } from '../../App';
import { Student, Grade } from '../../types';

export const Evaluation: React.FC = () => {
    const { students, grades, payments, settings, subjects, cycles } = useSchool();
    
    // Onglet par défaut : 'recouvrement'
    const [activeTab, setActiveTab] = useState<'recouvrement' | 'academique'>('recouvrement');
    const [activeTrimestre, setActiveTrimestre] = useState<string>('1');
    const [selectedMonth, setSelectedMonth] = useState<number>(1); // 1 to 9
    const [selectedCycle, setSelectedCycle] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedRoom, setSelectedRoom] = useState<string>('');

    // États pliables pour Tableau d'Honneur et Suivi de Soutien
    const [isTop5Expanded, setIsTop5Expanded] = useState<boolean>(true);
    const [isBottom10Expanded, setIsBottom10Expanded] = useState<boolean>(true);

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

    // Helper pour le tarif mensuel d'un élève (statut spécial ou normal)
    const getStudentMonthlyFee = (student: Student) => {
        const fullClassName = student.serie ? `${student.classe} ${student.serie}` : student.classe;
        if (student.isSpecial) {
            if (student.specialMonthlyFee !== undefined && student.specialMonthlyFee >= 0) {
                return student.specialMonthlyFee;
            }
            const classSpecialFee = settings.accounting?.classSpecialFees?.[fullClassName] ?? settings.accounting?.classSpecialFees?.[student.classe];
            if (classSpecialFee !== undefined && classSpecialFee >= 0) {
                return classSpecialFee;
            }
        }
        return settings.accounting?.classFees?.[fullClassName] ?? settings.accounting?.classFees?.[student.classe] ?? 0;
    };

    // 1. Academic Ranking (Top 5 et Derniers 10 strictement disjoints)
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

            const rawW = settings.gradeWeights?.[student.cycle] ?? { devoir: 50, composition: 50 };
            const wDev = rawW.devoir > 1 ? rawW.devoir / 100 : rawW.devoir;
            const wCompo = rawW.composition > 1 ? rawW.composition / 100 : rawW.composition;

            const points = Object.values(subData).reduce((acc, d) => {
                const hasDev = d.count > 0;
                const hasCompo = d.compoNote !== null;
                let final = 0;
                if (hasDev && hasCompo) {
                    final = (d.total / d.count) * wDev + d.compoNote! * wCompo;
                } else if (hasDev) {
                    final = d.total / d.count;
                } else if (hasCompo) {
                    final = d.compoNote!;
                }
                return acc + (final * d.coeff);
            }, 0);

            const totalCoeffs = Object.values(subData).reduce((acc, d) => acc + d.coeff, 0);
            const average = totalCoeffs > 0 ? points / totalCoeffs : 0;

            return { ...student, average, hasGrades: true };
        });

        const studentsWithGrades = studentAverages.filter(s => s.hasGrades);
        const sortedDesc = [...studentsWithGrades].sort((a, b) => b.average - a.average);
        
        // Top 5 (Tableau d'Honneur)
        const top5 = sortedDesc.slice(0, 5);
        const top5Ids = new Set(top5.map(s => s.id));

        // Les élèves affichés dans le tableau d'honneur NE DOIVENT PLUS S'AFFICHER au suivi de soutien
        const remainingStudents = sortedDesc.filter(s => !top5Ids.has(s.id));
        const bottom10 = remainingStudents.slice(-10).reverse(); // plus faible moyenne en premier

        return { top5, bottom10 };
    }, [students, grades, activeTrimestre, subjects, settings.gradeWeights]);

    // 2. Financial Recovery Data Preparation
    const recoveryData = useMemo(() => {
        const debtors = students.filter(student => {
            const monthlyFee = getStudentMonthlyFee(student);
            const expectedUpToNow = monthlyFee * selectedMonth;
            // Ne comptabiliser que les paiements de scolarité (hors frais d'inscription/réinscription)
            const tuitionPaid = payments
                .filter(p => {
                    if (p.studentId !== student.id) return false;
                    if (p.type === 'registration' || p.type === 're_registration') return false;
                    if (p.notes && /inscription/i.test(p.notes)) return false;
                    return true;
                })
                .reduce((acc, p) => acc + (p.amount || 0), 0);
            return tuitionPaid < expectedUpToNow;
        });

        const cyclesFound = Array.from(new Set(debtors.map(s => s.cycle)));
        const classesInCycle = selectedCycle ? Array.from(new Set(debtors.filter(s => s.cycle === selectedCycle).map(s => s.classe))) : [];
        
        // Salles contenant les élèves de la classe sélectionnée
        const availableRoomsForClass = (selectedCycle && selectedClass)
            ? Array.from(new Set(
                students
                    .filter(s => s.cycle === selectedCycle && s.classe === selectedClass && !!s.salle)
                    .map(s => s.salle!)
              )).sort()
            : [];

        const studentsToDisplay = (selectedCycle && selectedClass) 
            ? debtors.filter(s => {
                const matchCycle = s.cycle === selectedCycle;
                const matchClass = s.classe === selectedClass;
                const matchRoom = selectedRoom ? s.salle === selectedRoom : true;
                return matchCycle && matchClass && matchRoom;
            })
            : [];

        return { debtors, cyclesFound, classesInCycle, availableRoomsForClass, studentsToDisplay };
    }, [students, selectedMonth, selectedCycle, selectedClass, selectedRoom, settings.accounting]);

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Header avec sélection des onglets */}
            <div className="bg-white dark:bg-white/5 p-6 rounded-3xl shadow-xl border dark:border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                            {activeTab === 'recouvrement' ? 'Recouvrement des Frais' : 'Suivi Académique'}
                        </h2>
                        <HelpGuide guideKey="evaluation" size="sm" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium text-sm mt-1">
                        {activeTab === 'recouvrement' 
                            ? 'Suivi des impayés et recouvrement par période, cycle, classe et salle' 
                            : 'Palmarès et suivi pédagogique individualisé'}
                    </p>
                </div>

                {/* Sélecteur d'onglets principal */}
                <div className="flex bg-gray-100 dark:bg-white/10 p-1.5 rounded-2xl w-full md:w-auto">
                    <button
                        onClick={() => setActiveTab('recouvrement')}
                        className={`flex-1 md:flex-initial px-6 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-2 ${
                            activeTab === 'recouvrement'
                                ? 'bg-[var(--primary-color)] text-white shadow-lg scale-105'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        <i className="fas fa-hand-holding-usd"></i>
                        <span>Recouvrement des frais</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('academique')}
                        className={`flex-1 md:flex-initial px-6 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-2 ${
                            activeTab === 'academique'
                                ? 'bg-blue-600 text-white shadow-lg scale-105'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        <i className="fas fa-graduation-cap"></i>
                        <span>Suivi académique</span>
                    </button>
                </div>
            </div>

            {/* CONTENU ONGLET 1 : RECOUVREMENT DES FRAIS */}
            {activeTab === 'recouvrement' && (
                <div className="bg-white dark:bg-white/5 p-8 rounded-3xl shadow-2xl border dark:border-white/10 space-y-8 animate-fade-in">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                Impayés de Scolarité
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
                                Sélectionnez le mois pour évaluer l'état du recouvrement
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                            {months.map(m => (
                                <button 
                                    key={m.id} 
                                    onClick={() => {
                                        setSelectedMonth(m.id);
                                        setSelectedCycle('');
                                        setSelectedClass('');
                                        setSelectedRoom('');
                                    }}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${
                                        selectedMonth === m.id 
                                            ? 'bg-red-600 text-white shadow-lg scale-105' 
                                            : 'bg-gray-100 dark:bg-white/10 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/20'
                                    }`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Section Filtres : Cycle, Classe et Salle */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border dark:border-white/10">
                            {/* Étape 1 : Cycle */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                                    1. Choisir le Cycle
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {recoveryData.cyclesFound.length === 0 && (
                                        <p className="text-xs text-gray-400 italic">Aucun impayé trouvé pour ce mois.</p>
                                    )}
                                    {recoveryData.cyclesFound.map(cycle => (
                                        <button
                                            key={cycle}
                                            onClick={() => {
                                                setSelectedCycle(cycle);
                                                setSelectedClass('');
                                                setSelectedRoom('');
                                            }}
                                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                                                selectedCycle === cycle 
                                                    ? 'bg-blue-600 text-white shadow-md' 
                                                    : 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-400 border dark:border-white/10 hover:border-blue-300'
                                            }`}
                                        >
                                            {cycle}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Étape 2 : Classe */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                                    2. Choisir la Classe
                                </p>
                                <Select
                                    value={selectedClass}
                                    onChange={e => {
                                        setSelectedClass(e.target.value);
                                        setSelectedRoom('');
                                    }}
                                    disabled={!selectedCycle}
                                    options={[
                                        { value: '', label: selectedCycle ? 'Sélectionner une classe' : 'Choisissez d\'abord un cycle' },
                                        ...recoveryData.classesInCycle.map(c => ({ value: c, label: c }))
                                    ]}
                                />
                            </div>

                            {/* Étape 3 : Salle (salles contenant les élèves de cette classe) */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                                    3. Filtrer par Salle (optionnel)
                                </p>
                                <Select
                                    value={selectedRoom}
                                    onChange={e => setSelectedRoom(e.target.value)}
                                    disabled={!selectedClass}
                                    options={[
                                        { value: '', label: selectedClass ? 'Toutes les salles de cette classe' : 'Choisissez une classe' },
                                        ...recoveryData.availableRoomsForClass.map(r => ({ value: r, label: `Salle : ${r}` }))
                                    ]}
                                />
                            </div>
                        </div>

                        {/* Résultats du recouvrement */}
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
                                    <p className="font-black uppercase tracking-widest text-xs">
                                        Félicitations ! Aucun impayé pour cette sélection {selectedRoom ? `(Salle ${selectedRoom})` : ''}.
                                    </p>
                                </div>
                            ) : (
                                <Card 
                                    title={
                                        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                                            <span>
                                                {selectedClass} {selectedRoom ? `• Salle ${selectedRoom}` : ''} — {recoveryData.studentsToDisplay.length} élève(s) en retard
                                            </span>
                                            <span className="text-xs font-bold text-red-600 bg-red-100 dark:bg-red-950/60 px-3 py-1 rounded-xl">
                                                Total dû : {recoveryData.studentsToDisplay.reduce((sum, s) => {
                                                    const fee = getStudentMonthlyFee(s);
                                                    const tuitionPaid = payments
                                                        .filter(p => {
                                                            if (p.studentId !== s.id) return false;
                                                            if (p.type === 'registration' || p.type === 're_registration') return false;
                                                            if (p.notes && /inscription/i.test(p.notes)) return false;
                                                            return true;
                                                        })
                                                        .reduce((acc, p) => acc + (p.amount || 0), 0);
                                                    return sum + ((fee * selectedMonth) - tuitionPaid);
                                                }, 0).toLocaleString()} FCFA
                                            </span>
                                        </div>
                                    } 
                                    className="border-l-4 border-red-500 shadow-xl"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
                                        {recoveryData.studentsToDisplay.map(s => {
                                            const monthlyFee = getStudentMonthlyFee(s);
                                            const tuitionPaid = payments
                                                .filter(p => {
                                                    if (p.studentId !== s.id) return false;
                                                    if (p.type === 'registration' || p.type === 're_registration') return false;
                                                    if (p.notes && /inscription/i.test(p.notes)) return false;
                                                    return true;
                                                })
                                                .reduce((acc, p) => acc + (p.amount || 0), 0);
                                            const debt = (monthlyFee * selectedMonth) - tuitionPaid;
                                            return (
                                                <div key={s.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl flex justify-between items-center border dark:border-white/10 group hover:border-red-300 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-all">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-black text-sm uppercase dark:text-white tracking-tight">{s.nom} {s.prenom}</p>
                                                            {s.isSpecial && (
                                                                <span className="text-[9px] bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-black">SPÉCIAL</span>
                                                            )}
                                                        </div>
                                                        {s.salle && (
                                                            <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                                                                <i className="fas fa-door-closed mr-1"></i>Salle : {s.salle}
                                                            </p>
                                                        )}
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
            )}

            {/* CONTENU ONGLET 2 : SUIVI ACADÉMIQUE */}
            {activeTab === 'academique' && (
                <div className="space-y-8 animate-fade-in">
                    {/* Trimestre Switch */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-white/5 p-6 rounded-3xl shadow-xl border dark:border-white/10">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                Période d'évaluation
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
                                Choisissez le trimestre pour actualiser le classement
                            </p>
                        </div>
                        <div className="flex bg-gray-100 dark:bg-white/10 p-1.5 rounded-2xl">
                            {['1', '2', '3'].map(p => (
                                <button 
                                    key={p} 
                                    onClick={() => setActiveTrimestre(p)} 
                                    className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                                        activeTrimestre === p 
                                            ? 'bg-blue-600 text-white shadow-lg scale-105' 
                                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                                >
                                    Trimestre {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sections Pliables : Tableau d'Honneur et Suivi de Soutien */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* 1. Tableau d'Honneur (Top 5) - Pliable */}
                        <div className="bg-white dark:bg-white/5 rounded-3xl border-t-4 border-green-500 shadow-2xl overflow-hidden border dark:border-white/10">
                            <div className="p-5 flex items-center justify-between border-b dark:border-white/5 bg-green-50/30 dark:bg-green-950/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600">
                                        <i className="fas fa-crown text-lg"></i>
                                    </div>
                                    <div>
                                        <span className="font-black uppercase tracking-tight text-gray-900 dark:text-white">
                                            Tableau d'Honneur (Top 5)
                                        </span>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                            {academicStats.top5.length} élève(s) d'élite
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsTop5Expanded(!isTop5Expanded)}
                                    className="p-2 rounded-xl bg-white dark:bg-white/10 hover:bg-green-100 dark:hover:bg-green-900/40 text-gray-600 dark:text-gray-200 shadow-sm transition-all"
                                    title={isTop5Expanded ? "Replier la section" : "Déplier la section"}
                                >
                                    <i className={`fas ${isTop5Expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                                </button>
                            </div>

                            {isTop5Expanded && (
                                <div className="divide-y dark:divide-white/5 animate-fade-in">
                                    {academicStats.top5.map((s, idx) => (
                                        <div key={s.id} className="flex items-center justify-between p-4 hover:bg-green-50/30 dark:hover:bg-green-900/5 transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-yellow-400 text-white shadow-yellow-200' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}>
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-green-600 transition-colors">
                                                        {s.nom} {s.prenom}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                        {s.classe} {s.salle ? `• Salle ${s.salle}` : ''} • {s.cycle}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-green-600 tracking-tighter">{s.average.toFixed(2)}</p>
                                                <p className="text-[8px] font-black uppercase text-gray-400">Moyenne</p>
                                            </div>
                                        </div>
                                    ))}
                                    {academicStats.top5.length === 0 && (
                                        <p className="p-10 text-center text-gray-400 italic">Aucune note enregistrée pour ce trimestre.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 2. Suivi de Soutien (Derniers 10 disjoints du Top 5) - Pliable */}
                        <div className="bg-white dark:bg-white/5 rounded-3xl border-t-4 border-red-500 shadow-2xl overflow-hidden border dark:border-white/10">
                            <div className="p-5 flex items-center justify-between border-b dark:border-white/5 bg-red-50/30 dark:bg-red-950/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600">
                                        <i className="fas fa-exclamation-triangle text-lg"></i>
                                    </div>
                                    <div>
                                        <span className="font-black uppercase tracking-tight text-gray-900 dark:text-white">
                                            Suivi de Soutien (Derniers 10)
                                        </span>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                            Élèves nécessitant un accompagnement (exclut le top 5)
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsBottom10Expanded(!isBottom10Expanded)}
                                    className="p-2 rounded-xl bg-white dark:bg-white/10 hover:bg-red-100 dark:hover:bg-red-900/40 text-gray-600 dark:text-gray-200 shadow-sm transition-all"
                                    title={isBottom10Expanded ? "Replier la section" : "Déplier la section"}
                                >
                                    <i className={`fas ${isBottom10Expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                                </button>
                            </div>

                            {isBottom10Expanded && (
                                <div className="divide-y dark:divide-white/5 animate-fade-in">
                                    {academicStats.bottom10.map((s, idx) => (
                                        <div key={s.id} className="flex items-center justify-between p-4 hover:bg-red-50/30 dark:hover:bg-red-900/5 transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center font-black text-xs">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-red-600 transition-colors">
                                                        {s.nom} {s.prenom}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                        {s.classe} {s.salle ? `• Salle ${s.salle}` : ''} • {s.cycle}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-red-600 tracking-tighter">{s.average.toFixed(2)}</p>
                                                <p className="text-[8px] font-black uppercase text-gray-400">Moyenne</p>
                                            </div>
                                        </div>
                                    ))}
                                    {academicStats.bottom10.length === 0 && (
                                        <p className="p-10 text-center text-gray-400 italic">Aucun élève nécessitant un soutien particulier pour ce trimestre.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

