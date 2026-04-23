import React, { useState, useMemo } from 'react';
import { Card, Input, Button, Select, Modal } from '../../components/ui/Common';
import { useSchool } from '../../App';
import { Student, Payment, Cycle } from '../../types';

export const Accounting: React.FC = () => {
    const { students, payments, cycles, settings, addPayment, session } = useSchool();
    
    // State for filtering
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCycle, setSelectedCycle] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('');
    
    // State for selected student details
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    
    // Payment Form State
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<Payment['method']>('cash');
    const [paymentNotes, setPaymentNotes] = useState('');

    // Receipt State
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastPayment, setLastPayment] = useState<Payment | null>(null);

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

        students.forEach(s => {
            const monthlyFee = settings.accounting?.classFees[s.classe] || 0;
            const annualFee = monthlyFee * 9;
            totalExpected += annualFee;
            totalCollected += (s.totalPaid || 0);
        });

        const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;
        
        return {
            totalExpected,
            totalCollected,
            totalRemaining: totalExpected - totalCollected,
            collectionRate: Math.round(collectionRate)
        };
    }, [students, settings.accounting]);

    const handleRecordPayment = () => {
        if (!selectedStudent || paymentAmount <= 0) return;
        
        const monthlyFee = settings.accounting?.classFees[selectedStudent.classe] || 0;
        const annualFee = monthlyFee * 9;
        const remaining = annualFee - (selectedStudent.totalPaid || 0);

        if (paymentAmount > remaining) {
            alert(`Le montant dépasse le solde annuel restant (${remaining} FCFA).`);
            return;
        }

        const newPayment: Payment = {
            id: Date.now().toString(),
            studentId: selectedStudent.id,
            amount: paymentAmount,
            date: new Date().toLocaleString('fr-FR'),
            method: paymentMethod,
            notes: paymentNotes,
            recorded_by: session?.user_id,
            recorded_by_name: session?.display_name || 'Inconnu'
        };

        const p: Payment = newPayment;
        addPayment(p);
        setIsPaymentModalOpen(false);
        setPaymentAmount(0);
        setPaymentNotes('');
        // No longer showing receipt automatically
        alert("Paiement enregistré avec succès !");
    };

    const getStudentAnnualFee = (student: Student) => {
        const monthlyFee = settings.accounting?.classFees[student.classe] || 0;
        return monthlyFee * 9;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Global Stats Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
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
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/30">
                                    <p className="text-xs text-green-600 dark:text-green-400 font-bold uppercase">Encaissé</p>
                                    <p className="text-lg font-bold dark:text-white">{stats.totalCollected.toLocaleString()} <span className="text-[10px]">FCFA</span></p>
                                </div>
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase">Attendu (Total)</p>
                                    <p className="text-lg font-bold dark:text-white">{stats.totalExpected.toLocaleString()} <span className="text-[10px]">FCFA</span></p>
                                </div>
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/30">
                                    <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase">Reste à Recouvrer</p>
                                    <p className="text-lg font-bold dark:text-white">{stats.totalRemaining.toLocaleString()} <span className="text-[10px]">FCFA</span></p>
                                </div>
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800/30">
                                    <p className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase">Taux de Recouvrement</p>
                                    <p className="text-lg font-bold dark:text-white">{stats.collectionRate}%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

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
            </div>

            {/* Students List with Payment Status */}
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
                                        <td className={`px-4 py-4 whitespace-nowrap text-sm font-bold ${remaining === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {remaining === 0 ? 'SOLDÉ' : `${remaining.toLocaleString()} FCFA`}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right">
                                            <Button 
                                                size="sm" 
                                                variant={remaining === 0 ? "secondary" : "primary"}
                                                onClick={() => { setSelectedStudent(s); setIsPaymentModalOpen(true); }}
                                                disabled={annual === 0}
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

            {/* Payment Modal */}
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
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                    {payments.filter(p => p.studentId === selectedStudent.id).reverse().map(p => (
                                        <div key={p.id} className="flex justify-between items-center p-3 bg-white dark:bg-white/5 border dark:border-white/10 rounded-xl text-xs transition-transform hover:scale-[1.02]">
                                            <div className="flex-1">
                                                <p className="font-bold dark:text-white">{p.amount.toLocaleString()} FCFA</p>
                                                <p className="text-gray-500 dark:text-gray-400">{p.date} • <span className="capitalize">{p.method.replace('_', ' ')}</span></p>
                                                {p.notes && <p className="text-[10px] italic mt-0.5 text-gray-400">{p.notes}</p>}
                                            </div>
                                            <button 
                                                onClick={() => { setLastPayment(p); setShowReceipt(true); }}
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Imprimer le reçu"
                                            >
                                                <i className="fas fa-print"></i>
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
                            </div>
                            
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center italic">
                                Note : Un versement peut être une avance mensuelle ou un paiement groupé, du moment qu'il ne dépasse pas le solde annuel de l'élève.
                            </p>
                        </div>
                    </div>
                </Modal>
            )}
            {/* Receipt Modal */}
            {showReceipt && selectedStudent && lastPayment && (
                <ReceiptModal 
                    student={selectedStudent}
                    payment={lastPayment}
                    schoolName={settings.appName}
                    logo={settings.logo}
                    annualFee={getStudentAnnualFee(selectedStudent)}
                    onClose={() => setShowReceipt(false)}
                />
            )}
        </div>
    );
};

// --- Professional Receipt Component ---

const ReceiptModal: React.FC<{
    student: Student;
    payment: Payment;
    schoolName: string;
    logo?: string;
    annualFee: number;
    onClose: () => void;
}> = ({ student, payment, schoolName, logo, annualFee, onClose }) => {
    const remaining = annualFee - (student.totalPaid || 0);
    
    const qrData = JSON.stringify({
        st: `${student.nom} ${student.prenom}`,
        am: payment.amount,
        re: remaining,
        dt: payment.date,
        sc: schoolName,
        id: payment.id.slice(-6),
        by: payment.recorded_by_name || 'Inconnu'
    });

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&ecc=M&margin=1&data=${encodeURIComponent(qrData)}`;

    const handlePrint = () => {
        window.print();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Reçu de Paiement" maxWidth="max-w-2xl">
            <div id="receipt-content" className="p-8 bg-white text-gray-800 rounded-lg shadow-inner border border-gray-100 print:shadow-none print:border-none print:p-0">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-gray-100 pb-6 mb-6">
                    <div className="flex items-center gap-4">
                        {logo ? (
                            <img src={logo} alt="Logo" className="h-16 w-16 object-contain rounded-lg border p-1" />
                        ) : (
                            <div className="h-16 w-16 bg-blue-600 rounded-lg flex items-center justify-center text-white text-2xl">
                                <i className="fas fa-graduation-cap"></i>
                            </div>
                        )}
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight text-blue-900">{schoolName}</h2>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Reçu de Caisse Officiel</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-gray-400">N° {payment.id.slice(-6)}</p>
                        <p className="text-sm font-medium">{payment.date}</p>
                    </div>
                </div>

                {/* Content */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-black mb-1">Élève</p>
                            <p className="font-bold text-lg">{student.nom} {student.prenom}</p>
                            <p className="text-sm text-gray-600">Matricule : <span className="font-mono">{student.matricule}</span></p>
                            <p className="text-sm text-gray-600">Classe : {student.classe}</p>
                        </div>
                        <div>
                            <p className="font-bold capitalize">{payment.method.replace('_', ' ')}</p>
                        </div>
                        {payment.recorded_by_name && (
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-black mb-1">Encaissé par</p>
                                <p className="text-sm font-bold">{payment.recorded_by_name}</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Montant Versé :</span>
                            <span className="font-black text-blue-600">{payment.amount.toLocaleString()} FCFA</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Déjà Payé :</span>
                            <span className="font-bold text-green-600">{(student.totalPaid || 0).toLocaleString()} FCFA</span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                            <span className="font-bold">Reste à Payer :</span>
                            <span className="font-black text-red-600">{remaining.toLocaleString()} FCFA</span>
                        </div>
                    </div>
                </div>

                {/* QR & Footer */}
                <div className="flex justify-between items-end border-t border-dashed border-gray-200 pt-6 mt-6">
                    <div>
                        <p className="text-[10px] text-gray-400 font-bold mb-2">SCANNER POUR VÉRIFIER</p>
                        <img src={qrUrl} alt="QR Code Verification" className="w-24 h-24 border p-1 rounded-md bg-white shadow-sm" />
                    </div>
                    <div className="text-right space-y-1">
                        <div className="h-16 w-32 border-b-2 border-gray-100 mb-2 flex items-center justify-center italic text-gray-300 text-xs">
                            Cachet & Signature
                        </div>
                        <p className="text-[10px] text-gray-400 italic">ID Transaction: {payment.id}</p>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 print:hidden">
                <Button variant="secondary" onClick={onClose}>Fermer</Button>
                <Button variant="secondary" onClick={handlePrint} icon={<i className="fas fa-file-pdf"></i>}>Exporter PDF</Button>
                <Button variant="primary" onClick={handlePrint} icon={<i className="fas fa-print"></i>}>Imprimer le Reçu</Button>
            </div>

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body * { visibility: hidden; }
                    #receipt-content, #receipt-content * { visibility: visible; }
                    #receipt-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 20px;
                        border: none !important;
                        box-shadow: none !important;
                    }
                    .print\\:hidden { display: none !important; }
                }
            `}} />
        </Modal>
    );
};
