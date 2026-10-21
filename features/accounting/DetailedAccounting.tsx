import React, { useState, useMemo } from 'react';
import { Card, Select } from '../../components/ui/Common';
import { Student, Payment, Expense, Cycle } from '../../types';

interface DetailedAccountingProps {
    students: Student[];
    payments: Payment[];
    expenses: Expense[];
    cycles: Record<string, Cycle>;
    accountingSettings: any;
}

type PeriodType = 'monthly' | 'quarterly' | 'annual';
type ChartType = 'bar' | 'donut' | 'line' | 'area';

export const DetailedAccounting: React.FC<DetailedAccountingProps> = ({
    students,
    payments,
    expenses,
    cycles,
    accountingSettings
}) => {
    // 1. Period Granularity & Double Selection (Intervalle ou comparaison de périodes)
    const [periodType, setPeriodType] = useState<PeriodType>('monthly');
    const [periodStart, setPeriodStart] = useState<string>('09'); // Mois ou trimestre ou année
    const [periodEnd, setPeriodEnd] = useState<string>('06');

    // 2. Filters
    const [filterCycle, setFilterCycle] = useState<string>('');
    const [filterClass, setFilterClass] = useState<string>('');
    const [filterRoom, setFilterRoom] = useState<string>('');

    // 3. Chart Type (4 types)
    const [chartType, setChartType] = useState<ChartType>('bar');
    const [activeChartPoint, setActiveChartPoint] = useState<{
        index: number;
        label: string;
        encaisse: number;
        decaisse: number;
        solde: number;
        xPct: number;
    } | null>(null);

    // Months reference for school year
    const schoolMonths = useMemo(() => [
        { key: '09', label: 'Septembre', order: 1 },
        { key: '10', label: 'Octobre', order: 2 },
        { key: '11', label: 'Novembre', order: 3 },
        { key: '12', label: 'Décembre', order: 4 },
        { key: '01', label: 'Janvier', order: 5 },
        { key: '02', label: 'Février', order: 6 },
        { key: '03', label: 'Mars', order: 7 },
        { key: '04', label: 'Avril', order: 8 },
        { key: '05', label: 'Mai', order: 9 },
        { key: '06', label: 'Juin', order: 10 },
        { key: '07', label: 'Juillet', order: 11 },
        { key: '08', label: 'Août', order: 12 },
    ], []);

    const quarters = useMemo(() => [
        { key: 'T1', label: 'Trimestre 1 (Sept - Nov)', months: ['09', '10', '11'] },
        { key: 'T2', label: 'Trimestre 2 (Déc - Fév)', months: ['12', '01', '02'] },
        { key: 'T3', label: 'Trimestre 3 (Mars - Mai)', months: ['03', '04', '05'] },
        { key: 'T4', label: 'Trimestre 4 / Clôture (Juin - Août)', months: ['06', '07', '08'] },
    ], []);

    // Filter available classes
    const availableClasses = useMemo(() => {
        let classes: string[] = [];
        if (filterCycle && cycles[filterCycle]) {
            const cycle = cycles[filterCycle];
            if (cycle.type === 'simple') {
                classes = cycle.levels;
            } else {
                const suffixes = cycle.type === 'series' ? cycle.series : cycle.specialites;
                if (suffixes && suffixes.length > 0) {
                    cycle.levels.forEach(lvl => suffixes.forEach(s => classes.push(`${lvl} ${s}`)));
                } else {
                    classes = cycle.levels;
                }
            }
        } else {
            classes = Array.from(new Set(students.map(s => s.serie ? `${s.classe} ${s.serie}` : s.classe)));
        }
        return classes.sort();
    }, [filterCycle, cycles, students]);

    // Filter available rooms
    const availableRooms = useMemo(() => {
        let rooms: string[] = [];
        let pool = students;
        if (filterCycle) pool = pool.filter(s => s.cycle === filterCycle);
        if (filterClass) pool = pool.filter(s => (s.serie ? `${s.classe} ${s.serie}` : s.classe) === filterClass || s.classe === filterClass);
        rooms = Array.from(new Set(pool.filter(s => !!s.salle).map(s => s.salle!))).sort();
        return rooms;
    }, [students, filterCycle, filterClass]);

    // Student ID set based on Cycle, Class, and Room filter
    const matchingStudentIds = useMemo(() => {
        return new Set(
            students
                .filter(s => {
                    const matchCycle = filterCycle ? s.cycle === filterCycle : true;
                    const fullClass = s.serie ? `${s.classe} ${s.serie}` : s.classe;
                    const matchClass = filterClass ? (fullClass === filterClass || s.classe === filterClass) : true;
                    const matchRoom = filterRoom ? s.salle === filterRoom : true;
                    return matchCycle && matchClass && matchRoom;
                })
                .map(s => s.id)
        );
    }, [students, filterCycle, filterClass, filterRoom]);

    // Helper to test if a date string falls within selected period interval
    const isDateInSelectedPeriod = (dateStr: string) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return false;

        const monthNum = String(d.getMonth() + 1).padStart(2, '0');

        if (periodType === 'annual') {
            return true; // Tous les mois de l'année scolaire sélectionnée
        }

        if (periodType === 'monthly') {
            const startOrder = schoolMonths.find(m => m.key === periodStart)?.order || 1;
            const endOrder = schoolMonths.find(m => m.key === periodEnd)?.order || 12;
            const currentOrder = schoolMonths.find(m => m.key === monthNum)?.order || 0;

            const minO = Math.min(startOrder, endOrder);
            const maxO = Math.max(startOrder, endOrder);
            return currentOrder >= minO && currentOrder <= maxO;
        }

        if (periodType === 'quarterly') {
            const qStartIdx = quarters.findIndex(q => q.key === periodStart);
            const qEndIdx = quarters.findIndex(q => q.key === periodEnd);
            const minQ = Math.min(qStartIdx >= 0 ? qStartIdx : 0, qEndIdx >= 0 ? qEndIdx : 3);
            const maxQ = Math.max(qStartIdx >= 0 ? qStartIdx : 0, qEndIdx >= 0 ? qEndIdx : 3);

            const activeMonths = quarters.slice(minQ, maxQ + 1).flatMap(q => q.months);
            return activeMonths.includes(monthNum);
        }

        return true;
    };

    // Filtered Payments & Expenses
    const periodFilteredPayments = useMemo(() => {
        return payments.filter(p => {
            // Apply period check
            if (!isDateInSelectedPeriod(p.date)) return false;
            // Apply student scope
            if (p.studentId === 'divers') {
                // Divers payments only show when not filtering by specific class/room
                return !filterClass && !filterRoom;
            }
            return matchingStudentIds.has(p.studentId);
        });
    }, [payments, periodType, periodStart, periodEnd, matchingStudentIds, filterClass, filterRoom]);

    const periodFilteredExpenses = useMemo(() => {
        // Expenses apply to school as a whole unless filtering strictly by student entity
        if (filterClass || filterRoom || filterCycle) {
            // When filtering by a class/room/cycle, global expenses are not attributable
            return [];
        }
        return expenses.filter(e => isDateInSelectedPeriod(e.date));
    }, [expenses, periodType, periodStart, periodEnd, filterClass, filterRoom, filterCycle]);

    // Financial Metrics
    const metrics = useMemo(() => {
        const totalEncaisse = periodFilteredPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
        const totalDecaisse = periodFilteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
        const soldeNet = totalEncaisse - totalDecaisse;

        // Breakdown by payment methods
        const methodsBreakdown: Record<string, number> = {
            cash: 0,
            wave: 0,
            mobile_money: 0,
            check: 0,
            card: 0
        };
        periodFilteredPayments.forEach(p => {
            const m = p.method || 'cash';
            methodsBreakdown[m] = (methodsBreakdown[m] || 0) + (p.amount || 0);
        });

        // Grouped by Month bucket for timelines/charts
        const timelineBuckets: Record<string, { label: string; encaisse: number; decaisse: number; order: number }> = {};
        schoolMonths.forEach(m => {
            timelineBuckets[m.key] = { label: m.label, encaisse: 0, decaisse: 0, order: m.order };
        });

        periodFilteredPayments.forEach(p => {
            const d = new Date(p.date);
            if (!isNaN(d.getTime())) {
                const mk = String(d.getMonth() + 1).padStart(2, '0');
                if (timelineBuckets[mk]) {
                    timelineBuckets[mk].encaisse += (p.amount || 0);
                }
            }
        });

        periodFilteredExpenses.forEach(e => {
            const d = new Date(e.date);
            if (!isNaN(d.getTime())) {
                const mk = String(d.getMonth() + 1).padStart(2, '0');
                if (timelineBuckets[mk]) {
                    timelineBuckets[mk].decaisse += (e.amount || 0);
                }
            }
        });

        // Filter timeline buckets according to active period selection
        const timelineData = Object.entries(timelineBuckets)
            .filter(([key]) => {
                const dummyDate = `2025-${key}-15T12:00:00Z`;
                return isDateInSelectedPeriod(dummyDate);
            })
            .sort((a, b) => a[1].order - b[1].order)
            .map(([_, v]) => v);

        return {
            totalEncaisse,
            totalDecaisse,
            soldeNet,
            methodsBreakdown,
            timelineData
        };
    }, [periodFilteredPayments, periodFilteredExpenses, schoolMonths]);

    // Max value for scaling SVG charts
    const maxTimelineValue = useMemo(() => {
        const values = metrics.timelineData.flatMap(d => [d.encaisse, d.decaisse]);
        return Math.max(1, ...values);
    }, [metrics.timelineData]);

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header & Controls */}
            <div className="bg-white dark:bg-white/5 p-6 rounded-3xl shadow-xl border dark:border-white/10 space-y-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                                <i className="fas fa-chart-line text-lg"></i>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    Analyses & Statistiques Financières Avancées
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold">
                                    Filtrez par intervalle de temps, cycle, classe et salle avec visualisations graphiques
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Chart Type Selector */}
                    <div className="flex bg-gray-100 dark:bg-white/10 p-1.5 rounded-2xl border dark:border-white/5 self-stretch lg:self-auto justify-center">
                        <button
                            onClick={() => setChartType('bar')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${chartType === 'bar' ? 'bg-indigo-600 text-white shadow-md scale-105' : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600'}`}
                            title="Graphique en Bâtons (Histogramme)"
                        >
                            <i className="fas fa-chart-bar"></i> Bâtons
                        </button>
                        <button
                            onClick={() => setChartType('line')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${chartType === 'line' ? 'bg-indigo-600 text-white shadow-md scale-105' : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600'}`}
                            title="Graphique en Courbe"
                        >
                            <i className="fas fa-chart-line"></i> Courbe
                        </button>
                        <button
                            onClick={() => setChartType('area')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${chartType === 'area' ? 'bg-indigo-600 text-white shadow-md scale-105' : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600'}`}
                            title="Graphique en Aire / Surface"
                        >
                            <i className="fas fa-chart-area"></i> Aire
                        </button>
                        <button
                            onClick={() => setChartType('donut')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${chartType === 'donut' ? 'bg-indigo-600 text-white shadow-md scale-105' : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600'}`}
                            title="Graphique Circulaire (Donut)"
                        >
                            <i className="fas fa-chart-pie"></i> Circulaire
                        </button>
                    </div>
                </div>

                {/* Filtres de Période & Intervalle */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-800/30">
                    {/* 1. Type de période */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-purple-700 dark:text-purple-300 tracking-wider mb-1.5">
                            Échelle Temporelle
                        </label>
                        <div className="flex bg-white dark:bg-white/10 rounded-xl p-1 border dark:border-white/10">
                            <button
                                onClick={() => {
                                    setPeriodType('monthly');
                                    setPeriodStart('09');
                                    setPeriodEnd('06');
                                }}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${periodType === 'monthly' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}
                            >
                                Mensuel
                            </button>
                            <button
                                onClick={() => {
                                    setPeriodType('quarterly');
                                    setPeriodStart('T1');
                                    setPeriodEnd('T3');
                                }}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${periodType === 'quarterly' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}
                            >
                                Trimestriel
                            </button>
                            <button
                                onClick={() => setPeriodType('annual')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${periodType === 'annual' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}
                            >
                                Annuel
                            </button>
                        </div>
                    </div>

                    {/* 2. Période de début */}
                    {periodType !== 'annual' && (
                        <div>
                            <label className="block text-[10px] font-black uppercase text-purple-700 dark:text-purple-300 tracking-wider mb-1.5">
                                Période Début (Borne A)
                            </label>
                            <Select
                                value={periodStart}
                                onChange={e => setPeriodStart(e.target.value)}
                                options={
                                    periodType === 'monthly'
                                        ? schoolMonths.map(m => ({ value: m.key, label: m.label }))
                                        : quarters.map(q => ({ value: q.key, label: q.label }))
                                }
                            />
                        </div>
                    )}

                    {/* 3. Période de fin */}
                    {periodType !== 'annual' && (
                        <div>
                            <label className="block text-[10px] font-black uppercase text-purple-700 dark:text-purple-300 tracking-wider mb-1.5">
                                Période Fin (Borne B)
                            </label>
                            <Select
                                value={periodEnd}
                                onChange={e => setPeriodEnd(e.target.value)}
                                options={
                                    periodType === 'monthly'
                                        ? schoolMonths.map(m => ({ value: m.key, label: m.label }))
                                        : quarters.map(q => ({ value: q.key, label: q.label }))
                                }
                            />
                        </div>
                    )}

                    {/* Indicateur de période couverte */}
                    <div className="flex flex-col justify-center">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                            Intervalle analysé
                        </span>
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mt-1">
                            {periodType === 'annual' 
                                ? "Toute l'année scolaire en cours" 
                                : `De [${periodType === 'monthly' ? schoolMonths.find(m => m.key === periodStart)?.label : periodStart}] à [${periodType === 'monthly' ? schoolMonths.find(m => m.key === periodEnd)?.label : periodEnd}]`}
                        </p>
                    </div>
                </div>

                {/* Filtres par Cycle, Classe et Salle */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    {/* Cycle */}
                    <Select
                        label="Cycle"
                        value={filterCycle}
                        onChange={e => {
                            setFilterCycle(e.target.value);
                            setFilterClass('');
                            setFilterRoom('');
                        }}
                        options={[
                            { value: '', label: 'Tous les Cycles' },
                            ...Object.values(cycles).map(c => ({ value: c.id, label: c.name }))
                        ]}
                    />

                    {/* Classe */}
                    <Select
                        label="Classe spécifique"
                        value={filterClass}
                        onChange={e => {
                            setFilterClass(e.target.value);
                            setFilterRoom('');
                        }}
                        options={[
                            { value: '', label: 'Toutes les Classes' },
                            ...availableClasses.map(c => ({ value: c, label: c }))
                        ]}
                    />

                    {/* Salle */}
                    <Select
                        label="Salle attribuée"
                        value={filterRoom}
                        onChange={e => setFilterRoom(e.target.value)}
                        options={[
                            { value: '', label: 'Toutes les Salles' },
                            ...availableRooms.map(r => ({ value: r, label: `Salle : ${r}` }))
                        ]}
                    />
                </div>
            </div>

            {/* Cartes Métriques Stylées avec Calcul Automatique Animé */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Total Encaissé */}
                <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white shadow-xl shadow-emerald-500/20 transform hover:-translate-y-1 transition-all duration-300 group">
                    <div className="absolute top-0 right-0 -mr-6 -mt-6 w-28 h-28 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-all"></div>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs uppercase font-black tracking-widest text-emerald-100">
                            Total Encaissé
                        </span>
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <i className="fas fa-hand-holding-usd text-lg"></i>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-3xl font-black tracking-tight animate-pulse">
                            {metrics.totalEncaisse.toLocaleString()} <span className="text-sm font-bold">FCFA</span>
                        </h4>
                        <p className="text-[11px] text-emerald-100 font-medium">
                            {periodFilteredPayments.length} versement(s) enregistré(s)
                        </p>
                    </div>
                </div>

                {/* 2. Total Décaissements */}
                <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-rose-500 via-red-600 to-rose-700 text-white shadow-xl shadow-rose-500/20 transform hover:-translate-y-1 transition-all duration-300 group">
                    <div className="absolute top-0 right-0 -mr-6 -mt-6 w-28 h-28 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-all"></div>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs uppercase font-black tracking-widest text-rose-100">
                            Total Décaissements
                        </span>
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <i className="fas fa-file-invoice-dollar text-lg"></i>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-3xl font-black tracking-tight animate-pulse">
                            {metrics.totalDecaisse.toLocaleString()} <span className="text-sm font-bold">FCFA</span>
                        </h4>
                        <p className="text-[11px] text-rose-100 font-medium">
                            {periodFilteredExpenses.length} dépense(s) décaissée(s)
                        </p>
                    </div>
                </div>

                {/* 3. Solde Net */}
                <div className={`relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br ${metrics.soldeNet >= 0 ? 'from-indigo-600 via-blue-600 to-indigo-800 shadow-indigo-500/20' : 'from-amber-600 via-orange-600 to-amber-800 shadow-amber-500/20'} text-white shadow-xl transform hover:-translate-y-1 transition-all duration-300 group`}>
                    <div className="absolute top-0 right-0 -mr-6 -mt-6 w-28 h-28 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-all"></div>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs uppercase font-black tracking-widest opacity-80">
                            Solde Net Périodique
                        </span>
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <i className={`fas ${metrics.soldeNet >= 0 ? 'fa-scale-balanced' : 'fa-triangle-exclamation'} text-lg`}></i>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-3xl font-black tracking-tight">
                            {metrics.soldeNet.toLocaleString()} <span className="text-sm font-bold">FCFA</span>
                        </h4>
                        <p className="text-[11px] opacity-80 font-medium">
                            {metrics.soldeNet >= 0 ? 'Excédent / Balance positive' : 'Déficit sur la période'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Visualisations Graphiques */}
            <Card 
                title={
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            <i className="fas fa-chart-pie text-indigo-500"></i>
                            <span>Représentation Graphique ({chartType.toUpperCase()})</span>
                        </div>
                        <span className="text-xs font-bold text-gray-400">
                            {metrics.timelineData.length} période(s) représentée(s)
                        </span>
                    </div>
                }
                className="shadow-2xl overflow-hidden"
            >
                <div className="p-4">
                    {/* 1. Graphique BÂTONS (Histogramme double : Encaissements vs Décaissements) */}
                    {chartType === 'bar' && (
                        <div className="space-y-6">
                            <div className="h-72 flex items-end gap-3 sm:gap-6 pt-10 px-4 border-b border-l border-gray-200 dark:border-white/10 overflow-x-auto">
                                {metrics.timelineData.map((d, i) => {
                                    const hEnc = Math.max(8, Math.round((d.encaisse / maxTimelineValue) * 200));
                                    const hDec = Math.max(8, Math.round((d.decaisse / maxTimelineValue) * 200));
                                    return (
                                        <div key={i} className="flex-1 min-w-[50px] flex flex-col items-center gap-2 group">
                                            {/* Barres */}
                                            <div className="w-full flex items-end justify-center gap-1.5 h-56">
                                                {/* Barre Encaissement */}
                                                <div 
                                                    style={{ height: `${hEnc}px` }} 
                                                    className="w-1/2 max-w-[24px] bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-lg shadow-sm hover:brightness-110 transition-all duration-700 ease-out group-hover:scale-105 relative cursor-pointer"
                                                    title={`Encaissé : ${d.encaisse.toLocaleString()} FCFA`}
                                                >
                                                    <span className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                                                        +{d.encaisse.toLocaleString()}
                                                    </span>
                                                </div>
                                                {/* Barre Décaissement */}
                                                <div 
                                                    style={{ height: `${hDec}px` }} 
                                                    className="w-1/2 max-w-[24px] bg-gradient-to-t from-rose-600 to-red-400 rounded-t-lg shadow-sm hover:brightness-110 transition-all duration-700 ease-out group-hover:scale-105 relative cursor-pointer"
                                                    title={`Décaissé : ${d.decaisse.toLocaleString()} FCFA`}
                                                >
                                                    <span className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                                                        -{d.decaisse.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Label Période */}
                                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate max-w-[65px] text-center">
                                                {d.label.slice(0, 4)}.
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Légende */}
                            <div className="flex items-center justify-center gap-8 text-xs font-bold">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-gradient-to-r from-emerald-600 to-teal-400"></div>
                                    <span className="text-gray-700 dark:text-gray-300">Recettes (Encaissé)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-gradient-to-r from-rose-600 to-red-400"></div>
                                    <span className="text-gray-700 dark:text-gray-300">Dépenses (Décaissé)</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. Graphique COURBE (Line Chart SVG stylé & interactif) */}
                    {chartType === 'line' && (
                        <div className="space-y-6">
                            {/* Bannière d'information interactive au survol / clic */}
                            <div className="min-h-[50px] p-3 rounded-2xl bg-gradient-to-r from-slate-50 via-gray-100 to-slate-50 dark:from-white/5 dark:via-white/10 dark:to-white/5 border border-gray-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4 transition-all duration-300">
                                {activeChartPoint ? (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <span className="w-3 h-3 rounded-full bg-blue-500 animate-ping"></span>
                                            <span className="text-xs font-black uppercase text-gray-500 dark:text-gray-400">Période :</span>
                                            <span className="text-sm font-black text-gray-900 dark:text-white px-2.5 py-0.5 rounded-lg bg-white dark:bg-white/10 shadow-sm">{activeChartPoint.label}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                                <i className="fas fa-arrow-down"></i>
                                                <span>Encaissé:</span>
                                                <span className="font-black text-sm">{activeChartPoint.encaisse.toLocaleString()} FCFA</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                                                <i className="fas fa-arrow-up"></i>
                                                <span>Décaissé:</span>
                                                <span className="font-black text-sm">{activeChartPoint.decaisse.toLocaleString()} FCFA</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                                <span>Solde:</span>
                                                <span className="font-black">{activeChartPoint.solde.toLocaleString()} FCFA</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full flex items-center justify-center gap-2 text-xs font-medium text-gray-400">
                                        <i className="fas fa-mouse-pointer animate-bounce text-blue-500"></i>
                                        <span>Survolez ou cliquez sur les points du graphique pour inspecter les résultats détaillés de chaque mois.</span>
                                    </div>
                                )}
                            </div>

                            <div className="relative w-full h-80 border-b border-l border-gray-200 dark:border-white/10 p-4">
                                <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                                    {/* Grille avec repères de valeurs */}
                                    <line x1="0" y1="20" x2="500" y2="20" stroke="#888" strokeDasharray="3 3" opacity="0.15" />
                                    <text x="5" y="16" fontSize="7" fill="#888" fontWeight="bold">{maxTimelineValue.toLocaleString()} FCFA</text>
                                    <line x1="0" y1="65" x2="500" y2="65" stroke="#888" strokeDasharray="3 3" opacity="0.1" />
                                    <line x1="0" y1="110" x2="500" y2="110" stroke="#888" strokeDasharray="3 3" opacity="0.1" />
                                    <text x="5" y="106" fontSize="7" fill="#888" fontWeight="bold">{Math.round(maxTimelineValue / 2).toLocaleString()} FCFA</text>
                                    <line x1="0" y1="155" x2="500" y2="155" stroke="#888" strokeDasharray="3 3" opacity="0.1" />
                                    <line x1="0" y1="180" x2="500" y2="180" stroke="#888" opacity="0.25" />

                                    {/* Ligne verticale indicatrice active */}
                                    {activeChartPoint && (() => {
                                        const count = metrics.timelineData.length;
                                        if (count < 2) return null;
                                        const step = 500 / (count - 1);
                                        const activeX = activeChartPoint.index * step;
                                        return (
                                            <line x1={activeX} y1="0" x2={activeX} y2="180" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.8" />
                                        );
                                    })()}

                                    {/* Courbe Recettes (Vert Émeraude lumineux) */}
                                    {(() => {
                                        const count = metrics.timelineData.length;
                                        if (count < 2) return null;
                                        const step = 500 / (count - 1);
                                        const points = metrics.timelineData.map((d, idx) => {
                                            const x = idx * step;
                                            const y = 180 - (d.encaisse / maxTimelineValue) * 160;
                                            return `${x},${y}`;
                                        }).join(' ');

                                        return (
                                            <>
                                                <polyline
                                                    fill="none"
                                                    stroke="#10b981"
                                                    strokeWidth="4"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    points={points}
                                                    filter="drop-shadow(0px 3px 6px rgba(16, 185, 129, 0.35))"
                                                    className="transition-all duration-700 ease-out"
                                                />
                                                {metrics.timelineData.map((d, idx) => {
                                                    const x = idx * step;
                                                    const y = 180 - (d.encaisse / maxTimelineValue) * 160;
                                                    const isSelected = activeChartPoint?.index === idx;
                                                    return (
                                                        <g key={`p-enc-${idx}`} className="cursor-pointer"
                                                           onMouseEnter={() => setActiveChartPoint({ index: idx, label: d.label, encaisse: d.encaisse, decaisse: d.decaisse, solde: d.encaisse - d.decaisse, xPct: (idx / (count - 1)) * 100 })}
                                                           onClick={() => setActiveChartPoint({ index: idx, label: d.label, encaisse: d.encaisse, decaisse: d.decaisse, solde: d.encaisse - d.decaisse, xPct: (idx / (count - 1)) * 100 })}>
                                                            <circle cx={x} cy={y} r={isSelected ? "9" : "6"} fill="#10b981" stroke="#ffffff" strokeWidth="2.5" className="transition-all duration-300 drop-shadow-md" />
                                                            {isSelected && <circle cx={x} cy={y} r="13" fill="#10b981" opacity="0.25" className="animate-ping" />}
                                                        </g>
                                                    );
                                                })}
                                            </>
                                        );
                                    })()}

                                    {/* Courbe Dépenses (Rose Corail vibrant) */}
                                    {(() => {
                                        const count = metrics.timelineData.length;
                                        if (count < 2) return null;
                                        const step = 500 / (count - 1);
                                        const points = metrics.timelineData.map((d, idx) => {
                                            const x = idx * step;
                                            const y = 180 - (d.decaisse / maxTimelineValue) * 160;
                                            return `${x},${y}`;
                                        }).join(' ');

                                        return (
                                            <>
                                                <polyline
                                                    fill="none"
                                                    stroke="#f43f5e"
                                                    strokeWidth="4"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    points={points}
                                                    filter="drop-shadow(0px 3px 6px rgba(244, 63, 94, 0.35))"
                                                    className="transition-all duration-700 ease-out"
                                                />
                                                {metrics.timelineData.map((d, idx) => {
                                                    const x = idx * step;
                                                    const y = 180 - (d.decaisse / maxTimelineValue) * 160;
                                                    const isSelected = activeChartPoint?.index === idx;
                                                    return (
                                                        <g key={`p-dec-${idx}`} className="cursor-pointer"
                                                           onMouseEnter={() => setActiveChartPoint({ index: idx, label: d.label, encaisse: d.encaisse, decaisse: d.decaisse, solde: d.encaisse - d.decaisse, xPct: (idx / (count - 1)) * 100 })}
                                                           onClick={() => setActiveChartPoint({ index: idx, label: d.label, encaisse: d.encaisse, decaisse: d.decaisse, solde: d.encaisse - d.decaisse, xPct: (idx / (count - 1)) * 100 })}>
                                                            <circle cx={x} cy={y} r={isSelected ? "9" : "6"} fill="#f43f5e" stroke="#ffffff" strokeWidth="2.5" className="transition-all duration-300 drop-shadow-md" />
                                                            {isSelected && <circle cx={x} cy={y} r="13" fill="#f43f5e" opacity="0.25" className="animate-ping" />}
                                                        </g>
                                                    );
                                                })}
                                            </>
                                        );
                                    })()}
                                </svg>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-4 px-2">
                                <div className="flex items-center gap-6 text-xs font-bold">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
                                        <span className="text-gray-700 dark:text-gray-300">Courbe Recettes (Encaissé)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></div>
                                        <span className="text-gray-700 dark:text-gray-300">Courbe Dépenses (Décaissé)</span>
                                    </div>
                                </div>
                                <div className="text-[11px] text-gray-400 font-medium italic">
                                    Affichage dynamique au survol et au clic
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. Graphique AIRE / SURFACE (Area Chart SVG stylé & interactif) */}
                    {chartType === 'area' && (
                        <div className="space-y-6">
                            {/* Bannière d'information interactive */}
                            <div className="min-h-[50px] p-3 rounded-2xl bg-gradient-to-r from-slate-50 via-gray-100 to-slate-50 dark:from-white/5 dark:via-white/10 dark:to-white/5 border border-gray-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4 transition-all duration-300">
                                {activeChartPoint ? (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <span className="w-3 h-3 rounded-full bg-indigo-500 animate-ping"></span>
                                            <span className="text-xs font-black uppercase text-gray-500 dark:text-gray-400">Période :</span>
                                            <span className="text-sm font-black text-gray-900 dark:text-white px-2.5 py-0.5 rounded-lg bg-white dark:bg-white/10 shadow-sm">{activeChartPoint.label}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                                <i className="fas fa-layer-group"></i>
                                                <span>Recettes:</span>
                                                <span className="font-black text-sm">{activeChartPoint.encaisse.toLocaleString()} FCFA</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                                                <i className="fas fa-layer-group"></i>
                                                <span>Dépenses:</span>
                                                <span className="font-black text-sm">{activeChartPoint.decaisse.toLocaleString()} FCFA</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                                                <span>Balance:</span>
                                                <span className="font-black">{activeChartPoint.solde.toLocaleString()} FCFA</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full flex items-center justify-center gap-2 text-xs font-medium text-gray-400">
                                        <i className="fas fa-hand-pointer animate-bounce text-indigo-500"></i>
                                        <span>Survolez ou cliquez sur les jalons de l'aire pour voir les détails chiffrés.</span>
                                    </div>
                                )}
                            </div>

                            <div className="relative w-full h-80 border-b border-l border-gray-200 dark:border-white/10 p-4">
                                <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                                    <defs>
                                        <linearGradient id="areaGradientEnc" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.75" />
                                            <stop offset="50%" stopColor="#10b981" stopOpacity="0.3" />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                                        </linearGradient>
                                        <linearGradient id="areaGradientDec" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.65" />
                                            <stop offset="50%" stopColor="#f43f5e" stopOpacity="0.25" />
                                            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
                                        </linearGradient>
                                    </defs>

                                    {/* Grille */}
                                    <line x1="0" y1="20" x2="500" y2="20" stroke="#888" strokeDasharray="3 3" opacity="0.15" />
                                    <text x="5" y="16" fontSize="7" fill="#888" fontWeight="bold">{maxTimelineValue.toLocaleString()} FCFA</text>
                                    <line x1="0" y1="65" x2="500" y2="65" stroke="#888" strokeDasharray="3 3" opacity="0.1" />
                                    <line x1="0" y1="110" x2="500" y2="110" stroke="#888" strokeDasharray="3 3" opacity="0.1" />
                                    <text x="5" y="106" fontSize="7" fill="#888" fontWeight="bold">{Math.round(maxTimelineValue / 2).toLocaleString()} FCFA</text>
                                    <line x1="0" y1="155" x2="500" y2="155" stroke="#888" strokeDasharray="3 3" opacity="0.1" />
                                    <line x1="0" y1="180" x2="500" y2="180" stroke="#888" opacity="0.25" />

                                    {/* Ligne verticale indicatrice */}
                                    {activeChartPoint && (() => {
                                        const count = metrics.timelineData.length;
                                        if (count < 2) return null;
                                        const step = 500 / (count - 1);
                                        const activeX = activeChartPoint.index * step;
                                        return (
                                            <line x1={activeX} y1="0" x2={activeX} y2="180" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.8" />
                                        );
                                    })()}

                                    {/* Aire Encaissements */}
                                    {(() => {
                                        const count = metrics.timelineData.length;
                                        if (count < 2) return null;
                                        const step = 500 / (count - 1);
                                        const pts = metrics.timelineData.map((d, idx) => {
                                            const x = idx * step;
                                            const y = 180 - (d.encaisse / maxTimelineValue) * 160;
                                            return `${x},${y}`;
                                        });
                                        const areaPoints = `0,180 ${pts.join(' ')} 500,180`;
                                        const linePoints = pts.join(' ');
                                        return (
                                            <>
                                                <polygon points={areaPoints} fill="url(#areaGradientEnc)" />
                                                <polyline fill="none" stroke="#10b981" strokeWidth="3" points={linePoints} strokeLinecap="round" strokeLinejoin="round" />
                                            </>
                                        );
                                    })()}

                                    {/* Aire Décaissements */}
                                    {(() => {
                                        const count = metrics.timelineData.length;
                                        if (count < 2) return null;
                                        const step = 500 / (count - 1);
                                        const pts = metrics.timelineData.map((d, idx) => {
                                            const x = idx * step;
                                            const y = 180 - (d.decaisse / maxTimelineValue) * 160;
                                            return `${x},${y}`;
                                        });
                                        const areaPoints = `0,180 ${pts.join(' ')} 500,180`;
                                        const linePoints = pts.join(' ');
                                        return (
                                            <>
                                                <polygon points={areaPoints} fill="url(#areaGradientDec)" />
                                                <polyline fill="none" stroke="#f43f5e" strokeWidth="3" points={linePoints} strokeLinecap="round" strokeLinejoin="round" />
                                                {/* Jalons interactifs */}
                                                {metrics.timelineData.map((d, idx) => {
                                                    const x = idx * step;
                                                    const yEnc = 180 - (d.encaisse / maxTimelineValue) * 160;
                                                    const yDec = 180 - (d.decaisse / maxTimelineValue) * 160;
                                                    const isSelected = activeChartPoint?.index === idx;
                                                    return (
                                                        <g key={`area-pt-${idx}`} className="cursor-pointer"
                                                           onMouseEnter={() => setActiveChartPoint({ index: idx, label: d.label, encaisse: d.encaisse, decaisse: d.decaisse, solde: d.encaisse - d.decaisse, xPct: (idx / (count - 1)) * 100 })}
                                                           onClick={() => setActiveChartPoint({ index: idx, label: d.label, encaisse: d.encaisse, decaisse: d.decaisse, solde: d.encaisse - d.decaisse, xPct: (idx / (count - 1)) * 100 })}>
                                                            <circle cx={x} cy={yEnc} r={isSelected ? "8" : "5"} fill="#10b981" stroke="#ffffff" strokeWidth="2" className="transition-all duration-300 drop-shadow" />
                                                            <circle cx={x} cy={yDec} r={isSelected ? "8" : "5"} fill="#f43f5e" stroke="#ffffff" strokeWidth="2" className="transition-all duration-300 drop-shadow" />
                                                        </g>
                                                    );
                                                })}
                                            </>
                                        );
                                    })()}
                                </svg>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-4 px-2">
                                <div className="flex items-center gap-6 text-xs font-bold">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded bg-gradient-to-t from-emerald-500/20 to-emerald-500/70 border border-emerald-500"></div>
                                        <span className="text-gray-700 dark:text-gray-300">Surface Dégradée Recettes</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded bg-gradient-to-t from-rose-500/20 to-rose-500/70 border border-rose-500"></div>
                                        <span className="text-gray-700 dark:text-gray-300">Surface Dégradée Dépenses</span>
                                    </div>
                                </div>
                                <div className="text-[11px] text-gray-400 font-medium italic">
                                    Graphique immersif haute lisibilité
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. Graphique CIRCULAIRE / DONUT (Répartition des modes de paiement) */}
                    {chartType === 'donut' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center p-4">
                            {/* Donut SVG */}
                            <div className="relative w-56 h-56 mx-auto flex items-center justify-center">
                                {(() => {
                                    const total = metrics.totalEncaisse || 1;
                                    const methods = [
                                        { key: 'cash', label: 'Espèces', color: '#10b981', val: metrics.methodsBreakdown.cash },
                                        { key: 'mobile_money', label: 'Mobile Money', color: '#3b82f6', val: metrics.methodsBreakdown.mobile_money },
                                        { key: 'wave', label: 'Wave', color: '#06b6d4', val: metrics.methodsBreakdown.wave },
                                        { key: 'card', label: 'Carte', color: '#8b5cf6', val: metrics.methodsBreakdown.card },
                                        { key: 'check', label: 'Chèque', color: '#f59e0b', val: metrics.methodsBreakdown.check },
                                    ].filter(m => m.val > 0);

                                    let accumulatedPercent = 0;

                                    return (
                                        <>
                                            <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90">
                                                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e5e7eb" strokeWidth="5" className="dark:stroke-white/10" />
                                                {methods.map((m, idx) => {
                                                    const pct = (m.val / total) * 100;
                                                    const strokeDash = `${pct} ${100 - pct}`;
                                                    const strokeOffset = -accumulatedPercent;
                                                    accumulatedPercent += pct;
                                                    return (
                                                        <circle
                                                            key={idx}
                                                            cx="21" cy="21" r="15.915"
                                                            fill="transparent"
                                                            stroke={m.color}
                                                            strokeWidth="5"
                                                            strokeDasharray={strokeDash}
                                                            strokeDashoffset={strokeOffset}
                                                            className="transition-all duration-1000 ease-out"
                                                        />
                                                    );
                                                })}
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Encaissé</span>
                                                <span className="text-base font-black text-gray-900 dark:text-white">
                                                    {metrics.totalEncaisse.toLocaleString()}
                                                </span>
                                                <span className="text-[9px] font-bold text-emerald-500">FCFA</span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Détail Modes de paiement */}
                            <div className="space-y-3">
                                <h5 className="text-xs font-black uppercase text-gray-400 tracking-wider">
                                    Répartition par canal de paiement
                                </h5>
                                {[
                                    { label: 'Espèces (Cash)', color: 'bg-emerald-500', val: metrics.methodsBreakdown.cash },
                                    { label: 'Mobile Money (Airtel/MTN)', color: 'bg-blue-500', val: metrics.methodsBreakdown.mobile_money },
                                    { label: 'Wave', color: 'bg-cyan-500', val: metrics.methodsBreakdown.wave },
                                    { label: 'Carte Bancaire', color: 'bg-purple-500', val: metrics.methodsBreakdown.card },
                                    { label: 'Chèque', color: 'bg-amber-500', val: metrics.methodsBreakdown.check },
                                ].map((item, idx) => {
                                    const pct = metrics.totalEncaisse > 0 ? Math.round((item.val / metrics.totalEncaisse) * 100) : 0;
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl border dark:border-white/5">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{item.label}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-black text-gray-900 dark:text-white">{item.val.toLocaleString()} FCFA</span>
                                                <span className="text-[10px] text-gray-400 ml-2 font-bold">({pct}%)</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};
