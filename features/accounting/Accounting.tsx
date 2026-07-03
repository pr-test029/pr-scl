import React, { useState, useMemo, useRef } from 'react';
import { Card, Input, Button, Select, Modal } from '../../components/ui/Common';
import { useSchool } from '../../App';
import { Student, Payment, Expense } from '../../types';
import { ReceiptGenerator, ReceiptData, ReceiptGeneratorRef } from './ReceiptGenerator';

export const Accounting: React.FC = () => {
    const { students, payments, expenses, cycles, settings, addPayment, addExpense, deleteExpense, session, selectedAcademicYear } = useSchool();
    
    // Tabs
    const [activeTab, setActiveTab] = useState<'encaissements' | 'decaissements'>('encaissements');

    // -- ENCAISSEMENTS STATE --
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCycle, setSelectedCycle] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<Payment['method']>('cash');
    const [paymentNotes, setPaymentNotes] = useState('');

    // -- DÉCAISSEMENTS STATE --
    const [expenseLabel, setExpenseLabel] = useState('');
    const [expenseAmount, setExpenseAmount] = useState<number>(0);

    // Receipt Generator Ref
    const receiptGenRef = useRef<ReceiptGeneratorRef>(null);

    // Filtering logic
    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchesSearch = s.nom.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 s.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 s.matricule.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCycle = selectedCycle ? s.cycle === selectedCycle : true;
            const matchesClass = selectedClass ? s.classe === selectedClass : true;
            return matchesSearch && matchesCycle && matchesClass;
        });
    }, [students, searchQuery, selectedCycle, selectedClass]);

    // Financial Stats
    const stats = useMemo(() => {
        let totalExpected = 0;
        let totalCollected = 0;
        let totalExpenses = 0;

        students.forEach(s => {
            const fullClassName = s.serie ? `${s.classe} ${s.serie}` : s.classe;
            const monthlyFee = settings.accounting?.classFees[fullClassName] || 0;
            const annualFee = monthlyFee * 9;
            totalExpected += annualFee;
            totalCollected += (s.totalPaid || 0);
        });

        expenses.forEach(e => {
            totalExpenses += (e.amount || 0);
        });

        const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;
        const balance = totalCollected - totalExpenses;
        
        return {
            totalExpected,
            totalCollected,
            totalRemaining: totalExpected - totalCollected,
            collectionRate: Math.round(collectionRate),
            totalExpenses,
            balance
        };
    }, [students, expenses, settings.accounting]);

    const getStudentAnnualFee = (student: Student) => {
        const fullClassName = student.serie ? `${student.classe} ${student.serie}` : student.classe;
        const monthlyFee = settings.accounting?.classFees[fullClassName] || 0;
        return monthlyFee * 9;
    };

    const handleRecordPayment = () => {
        if (!selectedStudent || paymentAmount <= 0) return;
        
        const fullClassName = selectedStudent.serie ? `${selectedStudent.classe} ${selectedStudent.serie}` : selectedStudent.classe;
        const monthlyFee = settings.accounting?.classFees[fullClassName] || 0;
        const annualFee = monthlyFee * 9;
        const remaining = annualFee - (selectedStudent.totalPaid || 0);

        if (paymentAmount > remaining) {
            alert(`Le montant dépasse le solde annuel restant (${remaining} FCFA).`);
            return;
        }

        const p: Payment = {
            id: Date.now().toString(),
            studentId: selectedStudent.id,
            academic_year: selectedAcademicYear,
            amount: paymentAmount,
            date: new Date().toISOString(),
            method: paymentMethod,
            notes: paymentNotes,
            recorded_by: session?.user_id,
            recorded_by_name: session?.display_name || 'Inconnu'
        };

        addPayment(p);
        setIsPaymentModalOpen(false);
        setPaymentAmount(0);
        setPaymentNotes('');
        alert("Paiement enregistré avec succès !");
    };

    const handleGenerateReceipt = (type: 'ENCAISSEMENT' | 'DÉCAISSEMENT', item: Payment | Expense, student?: Student) => {
        if (!receiptGenRef.current) return;
        
        let label = (item as Expense).label || '';
        if (type === 'ENCAISSEMENT') {
            label = student ? `Scolarité : ${student.nom} ${student.prenom} - ${(item as Payment).notes || 'Versement'}` : 'Paiement scolarité';
        }

        const receiptData: ReceiptData = {
            type,
            id: item.id,
            date: item.date,
            amount: item.amount,
            label,
            recordedBy: item.recorded_by_name || 'Inconnu',
            schoolName: settings.appName
        };
        receiptGenRef.current.generateReceipt(receiptData);
    };

    const handleRecordExpense = () => {
        if (!expenseLabel || expenseAmount <= 0) {
            alert("Veuillez remplir le libellé et le montant.");
            return;
        }
        
        const e: Expense = {
            id: Date.now().toString(),
            academic_year: selectedAcademicYear,
            label: expenseLabel,
            amount: expenseAmount,
            date: new Date().toISOString(),
            recorded_by: session?.user_id,
            recorded_by_name: session?.display_name || 'Inconnu'
        };
        
        addExpense(e);
        setExpenseLabel('');
        setExpenseAmount(0);
        alert("Dépense enregistrée avec succès !");
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Global Stats Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="lg:col-span-4">
                    <div className="flex flex-col md:flex-row items-center gap-8 p-4">
                        <div className="relative w-40 h-40">
                            {/* SVG Doughnut Chart */}
                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#e2e8f0" strokeWidth="3" />
                                <circle 
                                    cx="18" cy="18" r="15.915" fill="transparent" 
                                    stroke="var(--primary-color)" strokeWidth="3" 
                                    strokeDasharray={`${stats.collectionRate} ${100 - stats.collectionRate}`}
                                    strokeDashoffset="0"
                                    className="transition-all duration-1000 ease-out"
                                />
                                <text x="18" y="20.5" textAnchor="middle" className="text-[6px] font-bold fill-gray-800 dark:fill-white transform rotate-90" style={{ transformOrigin: '18px 18px' }}>
                                    {stats.collectionRate}%
                                </text>
                            </svg>
                        </div>
                        <div className="flex-1 space-y-4 w-full">
                            <h3 className="text-xl font-bold dark:text-white">Santé Financière Globale</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/30">
                                    <p className="text-xs text-green-600 dark:text-green-400 font-bold uppercase">Encaissé</p>
                                    <p className="text-lg font-bold dark:text-white">{stats.totalCollected.toLocaleString()} <span className="text-[10px]">FCFA</span></p>
                                </div>
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/30">
                                    <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase">Décaissements</p>
                                    <p className="text-lg font-bold dark:text-white">{stats.totalExpenses.toLocaleString()} <span className="text-[10px]">FCFA</span></p>
                                </div>
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase">Solde Caisse</p>
                                    <p className="text-lg font-bold dark:text-white">{stats.balance.toLocaleString()} <span className="text-[10px]">FCFA</span></p>
                                </div>
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800/30">
                                    <p className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase">Reste à Recouvrer</p>
                                    <p className="text-lg font-bold dark:text-white">{stats.totalRemaining.toLocaleString()} <span className="text-[10px]">FCFA</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200 dark:border-white/10 pb-4">
                <button
                    className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'encaissements' ? 'bg-[var(--primary-color)] text-white shadow-lg' : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300'}`}
                    onClick={() => setActiveTab('encaissements')}
                >
                    <i className="fas fa-hand-holding-usd mr-2"></i> Encaissements (Scolarité)
                </button>
                <button
                    className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'decaissements' ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300'}`}
                    onClick={() => setActiveTab('decaissements')}
                >
                    <i className="fas fa-file-invoice-dollar mr-2"></i> Décaissements (Dépenses)
                </button>
            </div>

            {/* Hidden Receipt Generator component */}
            <ReceiptGenerator ref={receiptGenRef} />

            {/* TAB CONTENT: ENCAISSEMENTS */}
            {activeTab === 'encaissements' && (
                <div className="space-y-6 animate-fade-in">
                    <Card title="Accès Rapide" className="flex flex-col justify-center">
                        <div className="space-y-4">
                            <Input 
                                placeholder="Rechercher par Nom ou Matricule..." 
                                icon={<i className="fas fa-search"></i>}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Select 
                                    value={selectedCycle}
                                    onChange={e => setSelectedCycle(e.target.value)}
                                    options={[
                                        { value: '', label: 'Tous Cycles' },
                                        ...Object.values(cycles).map(c => ({ value: c.id, label: c.name }))
                                    ]}
                                />
                                <Select 
                                    value={selectedClass}
                                    onChange={e => setSelectedClass(e.target.value)}
                                    options={[
                                        { value: '', label: 'Toutes Classes' },
                                        ...(selectedCycle ? cycles[selectedCycle].levels.map(l => ({ value: l, label: l })) : [])
                                    ]}
                                    disabled={!selectedCycle}
                                />
                            </div>
                        </div>
                    </Card>

                    <Card title={`Liste des Élèves (${filteredStudents.length})`}>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                                <thead className="bg-gray-50 dark:bg-white/5">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Matricule</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Nom & Prénom</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Classe</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Progression</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Solde</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-white/10">
                                    {filteredStudents.map(s => {
                                        const annual = getStudentAnnualFee(s);
                                        const paid = s.totalPaid || 0;
                                        const remaining = annual - paid;
                                        const progress = annual > 0 ? Math.round((paid / annual) * 100) : 0;

                                        return (
                                            <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-mono font-bold text-[var(--primary-color)] dark:text-blue-300">
                                                    {s.matricule}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        {s.photo ? <img src={s.photo} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold">{s.nom[0]}</div>}
                                                        <span className="text-sm font-medium dark:text-white">{s.nom} {s.prenom}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                    {s.classe}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="w-32">
                                                        <div className="flex justify-between text-[10px] mb-1 dark:text-gray-400">
                                                            <span>{progress}%</span>
                                                            <span>{paid.toLocaleString()} FCFA</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                                            <div 
                                                                className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-[var(--primary-color)]'}`} 
                                                                style={{ width: `${progress}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={`px-4 py-4 whitespace-nowrap text-sm font-bold ${annual === 0 ? 'text-orange-500' : remaining === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {annual === 0 ? 'Non Configuré' : remaining === 0 ? 'SOLDÉ' : `${remaining.toLocaleString()} FCFA`}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-right">
                                                    <Button 
                                                        size="sm" 
                                                        variant={remaining === 0 && annual > 0 ? "secondary" : "primary"}
                                                        onClick={() => { setSelectedStudent(s); setIsPaymentModalOpen(true); }}
                                                    >
                                                        <i className="fas fa-receipt mr-2"></i> Gérer
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredStudents.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-12 text-center text-gray-500 italic">
                                                Aucun élève trouvé avec ces critères.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB CONTENT: DÉCAISSEMENTS */}
            {activeTab === 'decaissements' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                    <Card title="Enregistrer une dépense" className="md:col-span-1 h-fit">
                        <div className="space-y-4">
                            <Input 
                                label="Libellé / Achat matériel" 
                                value={expenseLabel} 
                                onChange={e => setExpenseLabel(e.target.value)}
                                placeholder="Ex: Achat de craies, Facture d'eau..."
                            />
                            <Input 
                                label="Montant décaissé (FCFA)" 
                                type="number" 
                                value={expenseAmount || ''} 
                                onChange={e => setExpenseAmount(parseInt(e.target.value) || 0)}
                                placeholder="Ex: 15000"
                                className="text-lg font-bold text-red-600"
                            />
                            <Button 
                                variant="primary" 
                                className="w-full !bg-red-600 hover:!bg-red-700 mt-2 shadow-lg shadow-red-500/20"
                                onClick={handleRecordExpense}
                            >
                                <i className="fas fa-minus-circle mr-2"></i> Valider la dépense
                            </Button>
                        </div>
                    </Card>

                    <Card title="Historique des Décaissements" className="md:col-span-2">
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(e => (
                                <div key={e.id} className="flex justify-between items-center p-4 bg-white dark:bg-white/5 border dark:border-white/10 rounded-xl transition-all hover:border-red-200 dark:hover:border-red-900/50">
                                    <div>
                                        <p className="font-bold text-gray-800 dark:text-white text-lg">{e.label}</p>
                                        <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                            <span><i className="far fa-clock mr-1"></i> {new Date(e.date).toLocaleDateString('fr-FR')} à {new Date(e.date).toLocaleTimeString('fr-FR')}</span>
                                            <span><i className="far fa-user mr-1"></i> {e.recorded_by_name}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-black text-red-600 dark:text-red-400 text-xl">
                                            - {e.amount.toLocaleString()} FCFA
                                        </span>
                                        <button 
                                            onClick={() => handleGenerateReceipt('DÉCAISSEMENT', e)}
                                            className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-colors"
                                            title="Générer un reçu PDF"
                                        >
                                            <i className="fas fa-file-pdf"></i>
                                        </button>
                                        <button 
                                            onClick={() => {
                                                if(confirm('Supprimer cette dépense ?')) {
                                                    deleteExpense(e.id);
                                                }
                                            }}
                                            className="w-10 h-10 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                                            title="Supprimer"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {expenses.length === 0 && (
                                <div className="text-center py-10 text-gray-400 italic">
                                    <i className="fas fa-file-invoice-dollar text-4xl mb-3 opacity-20 block"></i>
                                    Aucune dépense enregistrée.
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* Payment Modal (Encaissements only) */}
            {isPaymentModalOpen && selectedStudent && (
                <Modal 
                    isOpen={true} 
                    onClose={() => setIsPaymentModalOpen(false)} 
                    title={`Compte de : ${selectedStudent.nom} ${selectedStudent.prenom}`}
                    maxWidth="max-w-4xl"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Summary & Progress */}
                        <div className="space-y-6">
                            <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-2xl border dark:border-white/10">
                                <h4 className="font-bold text-gray-700 dark:text-white mb-4 flex items-center gap-2">
                                    <i className="fas fa-id-card text-blue-500"></i> Situation Financière
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Matricule :</span>
                                        <span className="font-bold font-mono text-blue-600 dark:text-blue-400">{selectedStudent.matricule}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Mensualité Normale :</span>
                                        <span className="font-bold text-gray-800 dark:text-gray-200">{(getStudentAnnualFee(selectedStudent) / 9).toLocaleString()} FCFA</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Total Annuel :</span>
                                        <span className="font-bold dark:text-white">{getStudentAnnualFee(selectedStudent).toLocaleString()} FCFA</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Total Payé :</span>
                                        <span className="font-bold text-green-600 dark:text-green-400">{(selectedStudent.totalPaid || 0).toLocaleString()} FCFA</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-2 border-t dark:border-white/10">
                                        <span className="font-bold text-gray-700 dark:text-white">Solde Restant :</span>
                                        <span className="font-bold text-red-600 dark:text-red-400">{(getStudentAnnualFee(selectedStudent) - (selectedStudent.totalPaid || 0)).toLocaleString()} FCFA</span>
                                    </div>
                                </div>

                                {/* Radial Progress UI */}
                                <div className="mt-8 flex justify-center">
                                    <div className="relative w-32 h-32">
                                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                            <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#e2e8f0" strokeWidth="2.5" />
                                            <circle 
                                                cx="18" cy="18" r="15.915" fill="transparent" 
                                                stroke="var(--primary-color)" strokeWidth="2.5" 
                                                strokeDasharray={`${Math.round(((selectedStudent.totalPaid || 0) / getStudentAnnualFee(selectedStudent)) * 100)} ${100 - Math.round(((selectedStudent.totalPaid || 0) / getStudentAnnualFee(selectedStudent)) * 100)}`}
                                                strokeDashoffset="0"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-xl font-black dark:text-white">{Math.round(((selectedStudent.totalPaid || 0) / getStudentAnnualFee(selectedStudent)) * 100)}%</span>
                                            <span className="text-[8px] uppercase font-bold text-gray-400 tracking-widest">Payé</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Payments for this student */}
                            <div>
                                <h4 className="font-bold text-gray-700 dark:text-white mb-3 text-sm">Historique Récent</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                    {payments.filter(p => p.studentId === selectedStudent.id).reverse().map(p => (
                                        <div key={p.id} className="flex justify-between items-center p-3 bg-white dark:bg-white/5 border dark:border-white/10 rounded-xl text-xs transition-transform hover:scale-[1.02]">
                                            <div className="flex-1">
                                                <p className="font-bold dark:text-white">{p.amount.toLocaleString()} FCFA</p>
                                                <p className="text-gray-500 dark:text-gray-400">{new Date(p.date).toLocaleDateString('fr-FR')} • <span className="capitalize">{p.method.replace('_', ' ')}</span></p>
                                                {p.notes && <p className="text-[10px] italic mt-0.5 text-gray-400">{p.notes}</p>}
                                            </div>
                                            <button 
                                                onClick={() => handleGenerateReceipt('ENCAISSEMENT', p, selectedStudent)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Générer un reçu PDF avec QR Code"
                                            >
                                                <i className="fas fa-file-pdf"></i> PDF
                                            </button>
                                        </div>
                                    ))}
                                    {payments.filter(p => p.studentId === selectedStudent.id).length === 0 && (
                                        <p className="text-center text-gray-500 italic text-sm py-4">Aucun paiement enregistré.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* New Payment Form */}
                        <div className="space-y-6">
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                                <h4 className="font-bold text-blue-700 dark:text-blue-300 mb-4 flex items-center gap-2">
                                    <i className="fas fa-plus-circle"></i> Enregistrer un Versement
                                </h4>
                                {getStudentAnnualFee(selectedStudent) === 0 ? (
                                    <div className="bg-orange-100 text-orange-800 p-4 rounded-xl text-sm border border-orange-200">
                                        <i className="fas fa-exclamation-triangle mr-2"></i>
                                        Les frais de scolarité pour la classe <strong>{selectedStudent.serie ? `${selectedStudent.classe} ${selectedStudent.serie}` : selectedStudent.classe}</strong> ne sont pas configurés. Veuillez vous rendre dans les <strong>Paramètres</strong> pour définir le montant mensuel de cette classe avant d'enregistrer un paiement.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <Input 
                                            label="Montant du versement (FCFA)" 
                                            type="number" 
                                            value={paymentAmount || ''} 
                                            onChange={e => setPaymentAmount(parseInt(e.target.value) || 0)}
                                            placeholder="Entrez le montant..."
                                            className="text-lg font-bold"
                                        />
                                    <Select 
                                        label="Mode de paiement"
                                        value={paymentMethod}
                                        onChange={e => setPaymentMethod(e.target.value as any)}
                                        options={[
                                            { value: 'cash', label: 'Espèces (Cash)' },
                                            { value: 'wave', label: 'Wave' },
                                            { value: 'mobile_money', label: 'Mobile Money' },
                                            { value: 'check', label: 'Chèque' },
                                            { value: 'card', label: 'Carte Bancaire' }
                                        ]}
                                    />
                                    <Input 
                                        label="Notes / Référence (Facultatif)" 
                                        value={paymentNotes} 
                                        onChange={e => setPaymentNotes(e.target.value)}
                                        placeholder="Ex: Frais de Novembre..."
                                    />
                                    
                                    <div className="pt-2">
                                        <Button 
                                            variant="success" 
                                            className="w-full h-12 text-lg shadow-lg shadow-green-500/20"
                                            onClick={handleRecordPayment}
                                            disabled={paymentAmount <= 0}
                                        >
                                            Valider le Paiement
                                        </Button>
                                    </div>
                                </div>
                                )}
                            </div>
                            
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center italic">
                                Note : Un versement peut être une avance mensuelle ou un paiement groupé, du moment qu'il ne dépasse pas le solde annuel de l'élève.
                            </p>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};
