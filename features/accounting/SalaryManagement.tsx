import React, { useState, useMemo } from 'react';
import { Card, Input, Button, Select, Modal } from '../../components/ui/Common';
import { useSchool } from '../../App';
import { StaffMember, SalaryPayment, TimetableSlot, AttendanceRecord, Expense } from '../../types';

export const SalaryManagement: React.FC = () => {
    const { settings, updateSettings, addExpense, session, selectedAcademicYear } = useSchool();

    const staffList: StaffMember[] = settings.staff || [];
    const salarySettings = settings.salarySettings || {};
    const classSalaries = salarySettings.classSalaries || {};
    const roleMonthlySalaries = salarySettings.roleMonthlySalaries || {};
    const staffCustomSalaries = salarySettings.staffCustomSalaries || {};
    const timetable: TimetableSlot[] = settings.timetable || [];
    const attendanceList: AttendanceRecord[] = settings.attendance || [];

    // Filter by period (month) for payment & simulation
    const currentMonthStr = useMemo(() => {
        const d = new Date();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${d.getFullYear()}-${m}`;
    }, []);

    const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
    const [selectedStaffMatricule, setSelectedStaffMatricule] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    // Payment modal state
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [targetStaff, setTargetStaff] = useState<StaffMember | null>(null);
    const [payAmount, setPayAmount] = useState<number>(0);
    const [payMethod, setPayMethod] = useState<SalaryPayment['paymentMethod']>('cash');
    const [payNotes, setPayNotes] = useState('');

    // Statistics date range filter for forward projection
    const [statStartDate, setStatStartDate] = useState<string>(`${selectedAcademicYear.split('-')[0]}-10-01`);
    const [statEndDate, setStatEndDate] = useState<string>(`${selectedAcademicYear.split('-')[1] || '2026'}-06-30`);
    const [statRoleFilter, setStatRoleFilter] = useState<string>('all');

    // Helper: conversion minutes -> heures décimales
    const minutesToHours = (min: number) => min / 60;

    // Calcul des heures validées et du salaire pour un membre du personnel
    const getStaffSalaryBreakdown = (staff: StaffMember, monthFilter: string) => {
        const customSalary = staffCustomSalaries[staff.matricule];
        const defaultRoleSalary = roleMonthlySalaries[staff.role] || 0;

        // Si l'employé a un salaire personnalisé fixe ou un rôle non-professeur
        if (customSalary !== undefined && customSalary > 0) {
            return {
                type: 'fixed' as const,
                baseSalary: customSalary,
                hoursWorked: 0,
                calculatedAmount: customSalary,
                details: 'Salaire mensuel nominatif fixe'
            };
        }

        // Rôles administratifs (surveillant, gestionnaire, directeur, etc.)
        if (staff.role !== 'professeur') {
            return {
                type: 'fixed' as const,
                baseSalary: defaultRoleSalary,
                hoursWorked: 0,
                calculatedAmount: defaultRoleSalary,
                details: `Salaire mensuel fixe pour le rôle (${staff.role})`
            };
        }

        // Cas des professeurs : vérifier si classes primaire/maternelle (fixe) ou secondaire (taux horaire)
        const assignedClasses = staff.assignedClasses || [];
        let totalHourlyAmount = 0;
        let totalHours = 0;
        let fixedSum = 0;
        let hasFixed = false;
        let hasHourly = false;

        assignedClasses.forEach(cls => {
            const conf = classSalaries[cls];
            if (conf && conf.type === 'fixed' && conf.fixedMonthlySalary) {
                fixedSum += conf.fixedMonthlySalary;
                hasFixed = true;
            }
        });

        // Calculer les heures pointées (présentes) dans le mois sélectionné
        const monthAttendance = attendanceList.filter(a => {
            if (a.teacherMatricule !== staff.matricule || !a.present) return false;
            return a.date.startsWith(monthFilter);
        });

        monthAttendance.forEach(record => {
            const clsConf = classSalaries[record.classe];
            const hourlyRate = clsConf?.hourlyRate || 0;
            const hours = minutesToHours(record.durationMinutes);
            totalHours += hours;
            totalHourlyAmount += hours * hourlyRate;
            if (hourlyRate > 0) hasHourly = true;
        });

        if (hasFixed && !hasHourly) {
            return {
                type: 'fixed' as const,
                baseSalary: fixedSum,
                hoursWorked: totalHours,
                calculatedAmount: fixedSum,
                details: `Salaire fixe cycle préscolaire/primaire (${assignedClasses.join(', ')})`
            };
        }

        if (hasHourly) {
            const total = totalHourlyAmount + fixedSum;
            return {
                type: 'hourly' as const,
                baseSalary: totalHourlyAmount,
                hoursWorked: totalHours,
                calculatedAmount: total,
                details: `${totalHours.toFixed(1)} h validées sur ${monthFilter} à taux horaire par classe${fixedSum > 0 ? ` + fixe ${fixedSum} FCFA` : ''}`
            };
        }

        // Fallback si aucun taux horaire n'a encore été configuré
        return {
            type: 'fixed' as const,
            baseSalary: defaultRoleSalary,
            hoursWorked: totalHours,
            calculatedAmount: defaultRoleSalary,
            details: defaultRoleSalary > 0 ? 'Salaire de base du rôle' : 'Taux horaires de cours non encore configurés dans les paramètres'
        };
    };

    // Paiements de salaires enregistrés (stockés dans settings ou dans expenses de type 'Salaire')
    const recordedSalaryPayments = useMemo(() => {
        // Liste des dépenses étiquetées comme salaires
        return (settings.accounting as any)?.salaryPayments || [];
    }, [settings.accounting]);

    // Déclencher le paiement
    const handleOpenPayment = (staff: StaffMember) => {
        const breakdown = getStaffSalaryBreakdown(staff, selectedMonth);
        setTargetStaff(staff);
        setPayAmount(breakdown.calculatedAmount);
        setPayMethod('cash');
        setPayNotes(`Paiement salaire ${selectedMonth} - ${staff.prenom} ${staff.nom}`);
        setIsPayModalOpen(true);
    };

    const handleConfirmPayment = () => {
        if (!targetStaff || payAmount <= 0) {
            alert("Veuillez saisir un montant valide.");
            return;
        }

        const breakdown = getStaffSalaryBreakdown(targetStaff, selectedMonth);
        const newPayment: SalaryPayment = {
            id: `sal_${Date.now()}`,
            staffId: targetStaff.id,
            staffMatricule: targetStaff.matricule,
            staffName: `${targetStaff.prenom} ${targetStaff.nom}`,
            role: targetStaff.role,
            periodMonth: selectedMonth,
            amount: payAmount,
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod: payMethod,
            notes: payNotes,
            recordedBy: session?.display_name || 'Comptable',
            recordedAt: new Date().toISOString(),
            hoursWorked: breakdown.hoursWorked
        };

        // 1. Enregistrer automatiquement comme décaissement comptable pour la traçabilité
        const expenseDoc: Expense = {
            id: `exp_sal_${Date.now()}`,
            label: `Salaire : ${targetStaff.prenom} ${targetStaff.nom} (${selectedMonth})`,
            amount: payAmount,
            date: new Date().toISOString(),
            category: 'salaire',
            recorded_by_id: session?.user_id || 'system',
            recorded_by_name: session?.display_name || 'Comptable',
            academic_year: selectedAcademicYear
        };
        addExpense(expenseDoc);

        // 2. Mettre à jour l'historique des salaires dans les réglages
        const existingPayments = (settings.accounting as any)?.salaryPayments || [];
        const updatedPayments = [newPayment, ...existingPayments];

        updateSettings({
            ...settings,
            accounting: {
                ...settings.accounting,
                salaryPayments: updatedPayments
            } as any
        });

        alert(`✅ Paiement de ${payAmount.toLocaleString()} FCFA validé pour ${targetStaff.prenom} ${targetStaff.nom}. Le décaissement correspondant a été consigné dans la comptabilité.`);
        setIsPayModalOpen(false);
        setTargetStaff(null);
    };

    // Filtrage du personnel
    const filteredStaff = useMemo(() => {
        return staffList.filter(s => {
            const matchesSearch = `${s.nom} ${s.prenom} ${s.matricule}`.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = statRoleFilter === 'all' ? true : s.role === statRoleFilter;
            return matchesSearch && matchesRole;
        });
    }, [staffList, searchTerm, statRoleFilter]);

    // Calcul de la masse salariale prévisionnelle pour le mois
    const totalMonthlyPayroll = useMemo(() => {
        return staffList.reduce((acc, s) => {
            const b = getStaffSalaryBreakdown(s, selectedMonth);
            return acc + b.calculatedAmount;
        }, 0);
    }, [staffList, selectedMonth, classSalaries, roleMonthlySalaries, staffCustomSalaries, attendanceList]);

    // Projection de plusieurs mois entre deux dates
    const projectionMonths = useMemo(() => {
        if (!statStartDate || !statEndDate) return [];
        const start = new Date(statStartDate);
        const end = new Date(statEndDate);
        const months: string[] = [];
        const cur = new Date(start.getFullYear(), start.getMonth(), 1);

        while (cur <= end) {
            const y = cur.getFullYear();
            const m = String(cur.getMonth() + 1).padStart(2, '0');
            months.push(`${y}-${m}`);
            cur.setMonth(cur.getMonth() + 1);
        }
        return months;
    }, [statStartDate, statEndDate]);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Top Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-xl">
                    <p className="text-xs uppercase font-bold tracking-wider opacity-80">Masse Salariale Mensuelle ({selectedMonth})</p>
                    <h3 className="text-3xl font-black mt-2">
                        {totalMonthlyPayroll.toLocaleString()} FCFA
                    </h3>
                    <p className="text-xs opacity-70 mt-2">
                        {staffList.length} membre(s) du personnel éligible(s)
                    </p>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-xl">
                    <p className="text-xs uppercase font-bold tracking-wider opacity-80">Heures Pointées Validées ({selectedMonth})</p>
                    <h3 className="text-3xl font-black mt-2">
                        {attendanceList
                            .filter(a => a.present && a.date.startsWith(selectedMonth))
                            .reduce((sum, a) => sum + minutesToHours(a.durationMinutes), 0)
                            .toFixed(1)} h
                    </h3>
                    <p className="text-xs opacity-70 mt-2">
                        Enseignants prestataires contrôlés par le surveillant
                    </p>
                </Card>

                <Card className="bg-white dark:bg-white/5 border dark:border-white/10 shadow-sm flex flex-col justify-center">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1">Mois de Paie Actuel :</label>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="p-2.5 rounded-xl border dark:border-white/10 bg-gray-50 dark:bg-white/5 font-bold text-sm dark:text-white"
                    />
                </Card>
            </div>

            {/* Main Table: Gestion des Paiements de Salaires */}
            <Card title="Gestion des Paiements & Rémunérations du Personnel">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Input
                            placeholder="Rechercher employé ou matricule..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64"
                        />
                        <Select
                            value={statRoleFilter}
                            onChange={e => setStatRoleFilter(e.target.value)}
                            options={[
                                { value: 'all', label: 'Tous les rôles' },
                                { value: 'professeur', label: 'Professeurs' },
                                { value: 'surveillant_general', label: 'Surveillants Généraux' },
                                { value: 'gestionnaire', label: 'Gestionnaires' },
                                { value: 'directeur', label: 'Directeurs' }
                            ]}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 uppercase">
                            <tr>
                                <th className="py-3 px-4">Personnel</th>
                                <th className="py-3 px-4">Rôle</th>
                                <th className="py-3 px-4">Type Calcul</th>
                                <th className="py-3 px-4">Heures Validées</th>
                                <th className="py-3 px-4">Montant Dû ({selectedMonth})</th>
                                <th className="py-3 px-4">Détails & Base</th>
                                <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                            {filteredStaff.map(staff => {
                                const breakdown = getStaffSalaryBreakdown(staff, selectedMonth);
                                return (
                                    <tr key={staff.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                                        <td className="py-3 px-4">
                                            <p className="font-bold text-sm text-gray-900 dark:text-white">
                                                {staff.prenom} {staff.nom}
                                            </p>
                                            <p className="font-mono text-[11px] text-blue-600">{staff.matricule}</p>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="font-semibold px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-white/10 capitalize">
                                                {staff.role === 'surveillant_general' ? 'Surveillant Général' : staff.role}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                breakdown.type === 'hourly'
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                            }`}>
                                                {breakdown.type === 'hourly' ? 'Horaire Prestataire' : 'Fixe Mensuel'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 font-mono font-bold">
                                            {breakdown.hoursWorked > 0 ? `${breakdown.hoursWorked.toFixed(1)} h` : '—'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                                {breakdown.calculatedAmount.toLocaleString()} FCFA
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-500 max-w-xs truncate" title={breakdown.details}>
                                            {breakdown.details}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <Button
                                                onClick={() => handleOpenPayment(staff)}
                                                size="sm"
                                                variant="primary"
                                                disabled={breakdown.calculatedAmount <= 0}
                                            >
                                                <i className="fas fa-money-bill-wave mr-1.5"></i> Payer Salaire
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredStaff.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-gray-400 italic">
                                        Aucun membre du personnel trouvé.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Projection & Grille Salariale sur une Plage de Dates */}
            <Card title="Grille Salariale Prévisionnelle par Période (Statistiques & Projection)">
                <div className="flex flex-wrap items-center gap-4 mb-6 pb-4 border-b dark:border-white/10">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-500">Du :</label>
                        <input
                            type="date"
                            value={statStartDate}
                            onChange={e => setStatStartDate(e.target.value)}
                            className="p-2 rounded-xl border dark:border-white/10 bg-white dark:bg-white/5 text-xs font-bold"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-500">Au :</label>
                        <input
                            type="date"
                            value={statEndDate}
                            onChange={e => setStatEndDate(e.target.value)}
                            className="p-2 rounded-xl border dark:border-white/10 bg-white dark:bg-white/5 text-xs font-bold"
                        />
                    </div>
                    <p className="text-xs text-gray-400 ml-auto">
                        Projection sur {projectionMonths.length} mois sélectionnés
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 uppercase">
                            <tr>
                                <th className="py-3 px-4">Employé</th>
                                <th className="py-3 px-4">Rôle</th>
                                {projectionMonths.slice(0, 10).map(m => (
                                    <th key={m} className="py-3 px-4 text-center font-mono">{m}</th>
                                ))}
                                <th className="py-3 px-4 text-right">Total Période</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                            {filteredStaff.map(staff => {
                                let totalPeriod = 0;
                                return (
                                    <tr key={staff.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                                        <td className="py-2.5 px-4 font-bold dark:text-white">
                                            {staff.prenom} {staff.nom}
                                        </td>
                                        <td className="py-2.5 px-4 text-gray-500 capitalize">{staff.role}</td>
                                        {projectionMonths.slice(0, 10).map(m => {
                                            const b = getStaffSalaryBreakdown(staff, m);
                                            totalPeriod += b.calculatedAmount;
                                            return (
                                                <td key={m} className="py-2.5 px-4 text-center font-mono font-semibold">
                                                    {b.calculatedAmount.toLocaleString()}
                                                </td>
                                            );
                                        })}
                                        <td className="py-2.5 px-4 text-right font-black text-indigo-600 dark:text-indigo-400 font-mono">
                                            {totalPeriod.toLocaleString()} FCFA
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal de Validation du Paiement de Salaire */}
            {isPayModalOpen && targetStaff && (
                <Modal
                    isOpen={true}
                    onClose={() => setIsPayModalOpen(false)}
                    title={`Paiement Salaire : ${targetStaff.prenom} ${targetStaff.nom}`}
                    maxWidth="max-w-lg"
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Mois :</span>
                                <strong className="font-mono text-emerald-800 dark:text-emerald-300">{selectedMonth}</strong>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Rôle :</span>
                                <strong className="capitalize">{targetStaff.role}</strong>
                            </div>
                        </div>

                        <Input
                            label="Montant à décaisser (FCFA)"
                            type="number"
                            min="0"
                            value={payAmount}
                            onChange={e => setPayAmount(parseInt(e.target.value) || 0)}
                            className="text-lg font-bold"
                        />

                        <Select
                            label="Mode de règlement"
                            value={payMethod}
                            onChange={e => setPayMethod(e.target.value as any)}
                            options={[
                                { value: 'cash', label: 'Espèces (Cash)' },
                                { value: 'transfer', label: 'Virement bancaire' },
                                { value: 'mobile_money', label: 'Mobile Money (Airtel / MTN / Wave)' },
                                { value: 'cheque', label: 'Chèque' }
                            ]}
                        />

                        <Input
                            label="Libellé / Note justificative"
                            value={payNotes}
                            onChange={e => setPayNotes(e.target.value)}
                        />

                        <div className="flex justify-end gap-2 pt-4 border-t dark:border-white/10">
                            <Button variant="secondary" onClick={() => setIsPayModalOpen(false)}>Annuler</Button>
                            <Button variant="primary" onClick={handleConfirmPayment}>Valider le Décaissement</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};
