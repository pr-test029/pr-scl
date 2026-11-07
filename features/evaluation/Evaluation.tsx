import React, { useState, useMemo } from 'react';
import { Card, Button, Select, Modal, Input } from '../../components/ui/Common';
import { HelpGuide } from '../../components/ui/HelpGuide';
import { useSchool } from '../../App';
import { Student, Grade, Payment } from '../../types';

export const Evaluation: React.FC = () => {
    const { students, grades, payments, settings, subjects, cycles, addPayment, session, selectedAcademicYear } = useSchool();
    
    // Onglet par défaut : 'recouvrement'
    const [activeTab, setActiveTab] = useState<'recouvrement' | 'academique'>('recouvrement');
    const [activeTrimestre, setActiveTrimestre] = useState<string>('1');
    const [selectedMonth, setSelectedMonth] = useState<number>(1); // 1 to 9
    const [selectedCycle, setSelectedCycle] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedRoom, setSelectedRoom] = useState<string>('');

    // Modal d'encaissement immédiat
    const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
    const [collectingStudent, setCollectingStudent] = useState<Student | null>(null);
    const [collectAmount, setCollectAmount] = useState<number>(0);
    const [collectMethod, setCollectMethod] = useState<Payment['method']>('cash');
    const [collectNotes, setCollectNotes] = useState<string>('');

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

    // Helper pour le tarif mensuel d'un élève (extra > spécial > classe)
    const getStudentMonthlyFee = (student: Student) => {
        // Priorité 1 : Tarif personnalisé spécifique (Extra)
        if (student.customMonthlyFee !== undefined && student.customMonthlyFee !== null && student.customMonthlyFee >= 0) {
            return student.customMonthlyFee;
        }
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

    // Helpers pour la cohérence stricte avec la comptabilité
    const getStudentTuitionPaid = (studentId: string) => {
        return payments
            .filter(p => {
                if (p.studentId !== studentId) return false;
                if (p.type === 'registration' || p.type === 're_registration') return false;
                if (p.notes && /inscription/i.test(p.notes)) return false;
                return true;
            })
            .reduce((acc, p) => acc + (p.amount || 0), 0);
    };

    const getStudentDebt = (s: Student, monthNumber: number = selectedMonth) => {
        const monthlyFee = getStudentMonthlyFee(s);
        const annualFee = monthlyFee * 9;
        const expectedUpToNow = Math.min(monthlyFee * monthNumber, annualFee);
        const tuitionPaid = getStudentTuitionPaid(s.id);
        return Math.max(0, expectedUpToNow - tuitionPaid);
    };

    // 2. Financial Recovery Data Preparation
    const recoveryData = useMemo(() => {
        const debtors = students.filter(student => getStudentDebt(student, selectedMonth) > 0);

        // Cycles disponibles dans l'établissement
        const cyclesFound = Array.from(new Set([
            ...Object.keys(cycles),
            ...students.map(s => s.cycle)
        ])).filter(Boolean);

        // Construction complète des classes avec leurs séries (ex: Terminale A, Terminale C)
        let classesInCycle: string[] = [];
        if (selectedCycle) {
            const cycleObj = cycles[selectedCycle];
            const fromCycle: string[] = [];
            if (cycleObj?.classes) {
                cycleObj.classes.forEach(c => {
                    if (cycleObj.series && cycleObj.series.length > 0 && ['2nde', '1ere', 'tle', 'seconde', 'premiere', 'première', 'terminale'].some(l => c.toLowerCase().includes(l))) {
                        cycleObj.series.forEach(ser => fromCycle.push(`${c} ${ser}`));
                    } else {
                        fromCycle.push(c);
                    }
                });
            }
            const fromStudents = students
                .filter(s => s.cycle === selectedCycle)
                .map(s => s.serie ? `${s.classe} ${s.serie}` : s.classe);
            
            classesInCycle = Array.from(new Set([...fromCycle, ...fromStudents])).filter(Boolean).sort();
        }
        
        // Salles contenant les élèves de la classe sélectionnée
        const availableRoomsForClass = (selectedCycle && selectedClass)
            ? Array.from(new Set(
                students
                    .filter(s => {
                        const fullClass = s.serie ? `${s.classe} ${s.serie}` : s.classe;
                        return s.cycle === selectedCycle && fullClass === selectedClass && !!s.salle;
                    })
                    .map(s => s.salle!)
              )).sort()
            : [];

        const studentsToDisplay = (selectedCycle && selectedClass) 
            ? debtors.filter(s => {
                const fullClass = s.serie ? `${s.classe} ${s.serie}` : s.classe;
                const matchCycle = s.cycle === selectedCycle;
                const matchClass = fullClass === selectedClass;
                const matchRoom = selectedRoom ? s.salle === selectedRoom : true;
                return matchCycle && matchClass && matchRoom;
            })
            : [];

        return { debtors, cyclesFound, classesInCycle, availableRoomsForClass, studentsToDisplay };
    }, [students, payments, selectedMonth, selectedCycle, selectedClass, selectedRoom, settings.accounting, cycles]);

    // Handlers pour encaissement immédiat
    const handleOpenCollectModal = (student: Student, currentDebt: number) => {
        setCollectingStudent(student);
        setCollectAmount(currentDebt);
        setCollectMethod('cash');
        const monthObj = months.find(m => m.id === selectedMonth);
        setCollectNotes(`Frais scolarité : ${monthObj ? monthObj.label : `Mois ${selectedMonth}`}`);
        setIsCollectModalOpen(true);
    };

    const handleConfirmCollect = () => {
        if (!collectingStudent || collectAmount <= 0) {
            alert("Veuillez saisir un montant valide supérieur à 0.");
            return;
        }

        const monthObj = months.find(m => m.id === selectedMonth);
        const monthLabel = monthObj ? monthObj.label : `Mois ${selectedMonth}`;

        const payment: Payment = {
            id: Date.now().toString(),
            studentId: collectingStudent.id,
            academic_year: selectedAcademicYear,
            amount: collectAmount,
            date: new Date().toISOString(),
            method: collectMethod,
            type: 'tuition',
            notes: collectNotes || `Encaissement recouvrement - ${monthLabel}`,
            targetMonths: [monthLabel],
            recorded_by: session?.user_id,
            recorded_by_name: session?.display_name || 'Surveillance / Recouvrement'
        };

        addPayment(payment);
        setIsCollectModalOpen(false);
        setCollectingStudent(null);
        alert(`Encaissement de ${collectAmount.toLocaleString()} FCFA validé avec succès pour ${collectingStudent.nom} ${collectingStudent.prenom} !`);
    };

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
                                                    return sum + getStudentDebt(s, selectedMonth);
                                                }, 0).toLocaleString()} FCFA
                                            </span>
                                        </div>
                                    } 
                                    className="border-l-4 border-red-500 shadow-xl"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
                                        {recoveryData.studentsToDisplay.map(s => {
                                            const debt = getStudentDebt(s, selectedMonth);
                                            const monthlyFee = getStudentMonthlyFee(s);
                                            const totalPaid = getStudentTuitionPaid(s.id);
                                            const currentMonthLabel = months.find(m => m.id === selectedMonth)?.label || `Mois ${selectedMonth}`;

                                            return (
                                                <div key={s.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl flex flex-col justify-between border dark:border-white/10 group hover:border-red-300 hover:bg-red-50/20 dark:hover:bg-red-900/10 transition-all gap-3 shadow-sm">
                                                    <div>
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <p className="font-black text-sm uppercase dark:text-white tracking-tight">
                                                                        {s.nom} {s.prenom}
                                                                    </p>
                                                                    {s.isSpecial && (
                                                                        <span className="text-[9px] bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-black">
                                                                            SPÉCIAL
                                                                        </span>
                                                                    )}
                                                                    {s.customMonthlyFee !== undefined && s.customMonthlyFee >= 0 && (
                                                                        <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-black">
                                                                            EXTRA ({s.customMonthlyFee.toLocaleString()} F)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="font-mono text-[11px] text-blue-600 mt-0.5">{s.matricule}</p>
                                                                {s.salle && (
                                                                    <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                                                                        <i className="fas fa-door-closed mr-1"></i>Salle : {s.salle}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 shrink-0 shadow-sm">
                                                                <i className="fas fa-exclamation-circle text-sm"></i>
                                                            </div>
                                                        </div>

                                                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] bg-white dark:bg-white/5 p-2 rounded-xl border dark:border-white/10">
                                                            <div>
                                                                <span className="text-gray-400 block text-[9px] uppercase font-bold">Tarif mensuel</span>
                                                                <span className="font-bold text-gray-700 dark:text-gray-300">{monthlyFee.toLocaleString()} F</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-400 block text-[9px] uppercase font-bold">Total Réglé</span>
                                                                <span className="font-bold text-emerald-600">{totalPaid.toLocaleString()} F</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="pt-2 border-t dark:border-white/10 flex items-center justify-between gap-2">
                                                        <div>
                                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">
                                                                Dette à {currentMonthLabel} :
                                                            </span>
                                                            <span className="text-xs font-black text-red-600 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded-lg inline-block">
                                                                {debt.toLocaleString()} FCFA
                                                            </span>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="primary"
                                                            onClick={() => handleOpenCollectModal(s, debt)}
                                                            className="!px-3 !py-1 text-xs font-bold shadow-md shadow-blue-500/20"
                                                        >
                                                            <i className="fas fa-cash-register mr-1.5"></i> Encaisser
                                                        </Button>
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
            {/* Modal d'encaissement direct */}
            {isCollectModalOpen && collectingStudent && (
                <Modal
                    isOpen={isCollectModalOpen}
                    onClose={() => {
                        setIsCollectModalOpen(false);
                        setCollectingStudent(null);
                    }}
                    title="Encaisser le versement de l'élève"
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/50">
                            <p className="font-black text-base text-gray-900 dark:text-white uppercase">
                                {collectingStudent.nom} {collectingStudent.prenom}
                            </p>
                            <p className="font-mono text-xs text-blue-600">Matricule : {collectingStudent.matricule}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                Classe : <strong>{collectingStudent.serie ? `${collectingStudent.classe} ${collectingStudent.serie}` : collectingStudent.classe}</strong>
                                {collectingStudent.salle ? ` • Salle ${collectingStudent.salle}` : ''}
                            </p>
                            <div className="mt-2 pt-2 border-t border-blue-200/50 dark:border-blue-800/40 flex justify-between text-xs">
                                <span>Tarif mensuel : <strong>{getStudentMonthlyFee(collectingStudent).toLocaleString()} FCFA</strong></span>
                                <span className="text-red-600 font-bold">Dette calculée : {collectAmount.toLocaleString()} FCFA</span>
                            </div>
                        </div>

                        <div>
                            <Input
                                label="Montant à encaisser (FCFA)"
                                type="number"
                                value={collectAmount || ''}
                                onChange={e => setCollectAmount(Number(e.target.value))}
                                placeholder="Montant en FCFA"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                                Mode de règlement
                            </label>
                            <Select
                                value={collectMethod}
                                onChange={e => setCollectMethod(e.target.value as Payment['method'])}
                                options={[
                                    { value: 'cash', label: 'Espèces (Cash)' },
                                    { value: 'wave', label: 'Wave' },
                                    { value: 'mobile_money', label: 'Mobile Money (Orange/MTN/Moov)' },
                                    { value: 'check', label: 'Chèque' },
                                    { value: 'card', label: 'Carte Bancaire' }
                                ]}
                            />
                        </div>

                        <div>
                            <Input
                                label="Observations / Notes"
                                value={collectNotes}
                                onChange={e => setCollectNotes(e.target.value)}
                                placeholder="Ex: Paiement scolarité par parent"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t dark:border-white/10">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setIsCollectModalOpen(false);
                                    setCollectingStudent(null);
                                }}
                            >
                                Annuler
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleConfirmCollect}
                                disabled={collectAmount <= 0}
                            >
                                <i className="fas fa-check-circle mr-1.5"></i> Valider l'encaissement
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

