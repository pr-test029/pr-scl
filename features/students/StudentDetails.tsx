
import React, { useState, useEffect, useMemo } from 'react';
import { Student, Grade } from '../../types';
import { Card, Button, Modal, Input, Select } from '../../components/ui/Common';
import { useSchool } from '../../App';

declare const qrcode: any; // Correct global variable for qrcode-generator
declare const html2pdf: any;

interface StudentDetailsProps {
    student: Student;
    onBack: () => void;
}

export const StudentDetails: React.FC<StudentDetailsProps> = ({ student, onBack }) => {
    const { session, students, grades, subjects, addGrade, deleteGrade, settings } = useSchool();

    // Détection du cycle universitaire
    const isUniversity = student.cycle === 'universite';
    const periods = isUniversity ? ['S1', 'S2'] : ['1', '2', '3'];
    const defaultPeriod = isUniversity ? 'S1' : '1';

    const [activeTrimestre, setActiveTrimestre] = useState<string>(defaultPeriod);
    const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
    const [isBulletinModalOpen, setIsBulletinModalOpen] = useState(false);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

    // Grade Form State
    const [gradeForm, setGradeForm] = useState<Partial<Grade>>({
        trimestre: defaultPeriod,
        type: isUniversity ? 'dst' : 'devoir',
        coefficient: 1,
        valeur: 0,
        matiere: ''
    });

    // Récupération dynamique des matières pour la classe de l'élève
    const subjectKey = student.serie ? `${student.classe} ${student.serie}` : student.classe;
    const allClassSubjects = subjects[subjectKey] || [];

    // Calculs complexes pour le bulletin
    const bulletinData = useMemo(() => {
        const classStudents = students.filter(s => s.classe === student.classe);
        
        const getPeriodAverage = (targetTrimestre: string) => {
            const studentGrades = grades.filter(g => g.studentId === student.id && g.trimestre === targetTrimestre);
            if (studentGrades.length === 0) return null;
            const subData: Record<string, { total: number, count: number, coeff: number, compoNote: number | null }> = {};
            studentGrades.forEach(g => {
                if (!subData[g.matiere]) {
                    const subInfo = (subjects[student.serie ? `${student.classe} ${student.serie}` : student.classe] || []).find(sub => sub.nom === g.matiere);
                    subData[g.matiere] = { total: 0, count: 0, coeff: subInfo?.coefficient || g.coefficient || 1, compoNote: null };
                }
                const gType = (g.type || '').trim().toLowerCase();
                if (gType.includes('compo') || gType.includes('session') || gType.includes('examen')) subData[g.matiere].compoNote = g.valeur;
                else { subData[g.matiere].total += g.valeur; subData[g.matiere].count += 1; }
            });
            const points = Object.values(subData).reduce((acc, d) => {
                const moyDev = d.count > 0 ? d.total / d.count : (d.compoNote || 0);
                const final = d.compoNote !== null ? (moyDev + d.compoNote) / 2 : moyDev;
                return acc + (final * d.coeff);
            }, 0);
            const coeffs = Object.values(subData).reduce((acc, d) => acc + d.coeff, 0);
            return coeffs > 0 ? points / coeffs : 0;
        };

        const t1Avg = getPeriodAverage('1');
        const t2Avg = getPeriodAverage('2');

        const classSubjectStats: Record<string, { totalPoints: number, count: number }> = {};
        const studentAverages = classStudents.map(s => {
            const studentGrades = grades.filter(g => g.studentId === s.id && g.trimestre === activeTrimestre);
            const subData: Record<string, { total: number, count: number, coeff: number, compoNote: number | null }> = {};
            studentGrades.forEach(g => {
                if (!subData[g.matiere]) {
                    const subInfo = (subjects[s.serie ? `${s.classe} ${s.serie}` : s.classe] || []).find(sub => sub.nom === g.matiere);
                    subData[g.matiere] = { total: 0, count: 0, coeff: subInfo?.coefficient || g.coefficient || 1, compoNote: null };
                }
                const gType = (g.type || '').trim().toLowerCase();
                if (gType.includes('compo') || gType.includes('session') || gType.includes('examen')) subData[g.matiere].compoNote = g.valeur;
                else { subData[g.matiere].total += g.valeur; subData[g.matiere].count += 1; }
            });
            const detailed = Object.entries(subData).map(([name, d]) => {
                const moyDev = d.count > 0 ? d.total / d.count : (d.compoNote || 0);
                const final = d.compoNote !== null ? (moyDev + d.compoNote) / 2 : moyDev;
                if (!classSubjectStats[name]) classSubjectStats[name] = { totalPoints: 0, count: 0 };
                classSubjectStats[name].totalPoints += final;
                classSubjectStats[name].count += 1;
                return { name, moyDevoirs: moyDev, compoNote: d.compoNote, average: final, coefficient: d.coeff };
            });
            const pts = detailed.reduce((acc, s) => acc + (s.average * s.coefficient), 0);
            const cfs = detailed.reduce((acc, s) => acc + s.coefficient, 0);
            return { id: s.id, average: cfs > 0 ? pts / cfs : 0, totalPoints: pts, totalCoeffs: cfs, subjects: detailed };
        });

        const sorted = [...studentAverages].sort((a, b) => b.average - a.average);
        const rank = sorted.findIndex(a => a.id === student.id) + 1;
        const currentData = studentAverages.find(a => a.id === student.id);
        const finalSubjects = (currentData?.subjects || []).map(s => ({
            ...s,
            classMoy: classSubjectStats[s.name].totalPoints / classSubjectStats[s.name].count
        }));

        let annualAvg = null;
        if (activeTrimestre === '3') {
            const avgs = [t1Avg, t2Avg, currentData?.average || 0].filter(a => a !== null && a !== undefined) as number[];
            if (avgs.length > 0) annualAvg = avgs.reduce((acc, v) => acc + v, 0) / avgs.length;
        }

        return { subjects: finalSubjects, generalAverage: currentData?.average || 0, totalPoints: currentData?.totalPoints || 0, totalCoeffs: currentData?.totalCoeffs || 0, rank, classSize: classStudents.length, t1Avg, t2Avg, annualAvg };
    }, [students, grades, activeTrimestre, student.id, student.classe, subjects]);

    // Restriction Professeur
    const staffRecord = useMemo(() => settings.staff?.find(s => s.matricule === session?.matricule), [settings.staff, session]);
    const teacherAssignment = useMemo(() => staffRecord?.assignments?.find(a => a.classe === student.classe), [staffRecord, student.classe]);
    const visibleSubjects = useMemo(() => {
        if (session?.role === 'professeur' && teacherAssignment) {
            if (teacherAssignment.subjects.length === 0) return allClassSubjects;
            return allClassSubjects.filter(s => teacherAssignment.subjects.includes(s.nom));
        }
        return allClassSubjects;
    }, [allClassSubjects, session, teacherAssignment]);

    const allStudentGrades = useMemo(() => grades.filter(g => g.studentId === student.id), [grades, student.id]);
    const currentTrimesterGrades = useMemo(() => allStudentGrades.filter(g => g.trimestre === activeTrimestre), [allStudentGrades, activeTrimestre]);

    const handleGradeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (gradeForm.valeur === undefined || !gradeForm.matiere) return;
        const newGrade: Grade = {
            id: `grade_${Date.now()}`,
            studentId: student.id,
            trimestre: activeTrimestre,
            matiere: gradeForm.matiere,
            valeur: Number(gradeForm.valeur),
            coefficient: Number(gradeForm.coefficient || 1),
            type: gradeForm.type || 'devoir',
            date: new Date().toISOString()
        };
        addGrade(newGrade);
        setIsGradeModalOpen(false);
        setGradeForm({ ...gradeForm, valeur: 0 });
    };

    const removeGrade = (id: string) => {
        if (confirm("Supprimer cette note ?")) {
            deleteGrade(id);
        }
    };

    useEffect(() => {
        if (isBulletinModalOpen && typeof qrcode !== 'undefined') {
            try {
                const qr = qrcode(0, 'M');
                const verificationData = {
                    eleve: `${student.prenom} ${student.nom}`,
                    classe: student.classe,
                    periode: activeTrimestre,
                    moyenne: bulletinData.generalAverage.toFixed(2),
                    ecole: settings.appName
                };
                qr.addData(JSON.stringify(verificationData));
                qr.make();
                setQrCodeDataUrl(qr.createDataURL(4));
            } catch (e) {
                console.error("QR Code Error", e);
            }
        }
    }, [isBulletinModalOpen, student.matricule, activeTrimestre, bulletinData.generalAverage, settings.appName]);

    const downloadPDF = () => {
        const element = document.getElementById('bulletin-content');
        if (!element) return;
        const opt = {
            margin: 0,
            filename: `Bulletin_${student.nom}_${student.prenom}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    const printBulletin = () => {
        const content = document.getElementById('bulletin-content')?.outerHTML;
        if (!content) return;
        
        const printWindow = window.open('', '', 'width=800,height=800');
        if (!printWindow) {
            alert("Veuillez autoriser les pop-ups pour imprimer le bulletin.");
            return;
        }
        
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(el => el.outerHTML)
            .join('');

        printWindow.document.write(`
            <html>
            <head>
                <title>Impression Bulletin - ${student.nom} ${student.prenom}</title>
                ${styles}
                <style>
                    body { background: white; padding: 20px; margin: 0; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                </style>
            </head>
            <body>
                ${content}
                <script>
                    window.onload = () => {
                        setTimeout(() => {
                            window.print();
                            window.close();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <Button variant="secondary" onClick={onBack} icon={<i className="fas fa-arrow-left"></i>}>
                    Retour à la liste
                </Button>
                <div className="flex gap-2">
                    {['dirigeant', 'gestionnaire', 'professeur'].includes(session?.role || '') && (
                        <Button onClick={() => setIsGradeModalOpen(true)} icon={<i className="fas fa-plus-circle"></i>}>
                            Ajouter une note
                        </Button>
                    )}
                    <Button variant="secondary" onClick={() => setIsBulletinModalOpen(true)} icon={<i className="fas fa-file-invoice"></i>}>
                        Voir Bulletin
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 border-t-4 border-blue-600">
                    <div className="flex flex-col items-center text-center p-4">
                        <div className="w-32 h-32 rounded-3xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-5xl text-blue-600 font-bold mb-4 shadow-inner overflow-hidden border-4 border-white dark:border-white/10">
                            {student.photo ? <img src={student.photo} className="w-full h-full object-cover" /> : student.prenom[0]}
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{student.prenom} {student.nom}</h2>
                        <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-black mt-2">
                            {student.matricule}
                        </span>
                        <div className="w-full mt-8 space-y-3 text-left">
                            <InfoRow label="Classe" value={student.classe} />
                            <InfoRow label="Cycle" value={student.cycle} />
                            <InfoRow label="Genre" value={student.genre} />
                        </div>
                    </div>
                </Card>

                <Card className="lg:col-span-2" title={
                    <div className="flex items-center justify-between w-full">
                        <span className="dark:text-white font-bold"><i className="fas fa-graduation-cap mr-2 text-blue-600"></i>Notes Périodiques</span>
                        <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-lg">
                            {periods.map(p => (
                                <button key={p} onClick={() => setActiveTrimestre(p)} className={`px-3 py-1 rounded text-xs font-black transition-all ${activeTrimestre === p ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500'}`}>
                                    {isUniversity ? `S${p}` : `T${p}`}
                                </button>
                            ))}
                        </div>
                    </div>
                }>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b dark:border-white/10 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="px-2 py-3">Matière</th>
                                    <th className="px-2 py-3">Type</th>
                                    <th className="px-2 py-3">Note</th>
                                    <th className="px-2 py-3">Coeff</th>
                                    <th className="px-2 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-white/5">
                                {currentTrimesterGrades.map(g => (
                                    <tr key={g.id} className="text-sm hover:bg-gray-50 dark:hover:bg-white/5">
                                        <td className="px-2 py-4 font-bold dark:text-white uppercase">{g.matiere}</td>
                                        <td className="px-2 py-4 capitalize text-gray-500">{g.type}</td>
                                        <td className="px-2 py-4"><span className={`font-black ${g.valeur >= 10 ? 'text-green-600' : 'text-red-600'}`}>{g.valeur}</span></td>
                                        <td className="px-2 py-4 text-gray-500">{g.coefficient}</td>
                                        <td className="px-2 py-4 text-right">
                                            {['dirigeant', 'admin', 'gestionnaire'].includes(session?.role || '') && (
                                                <button onClick={() => removeGrade(g.id)} className="text-gray-400 hover:text-red-600"><i className="fas fa-trash-alt"></i></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Modal Grade */}
            <Modal isOpen={isGradeModalOpen} onClose={() => setIsGradeModalOpen(false)} title="Ajouter une note">
                <form onSubmit={handleGradeSubmit} className="space-y-4">
                    <Select
                        label="Matière"
                        value={gradeForm.matiere}
                        onChange={e => {
                            const sub = allClassSubjects.find(s => s.nom === e.target.value);
                            setGradeForm({ ...gradeForm, matiere: e.target.value, coefficient: sub?.coefficient || 1 });
                        }}
                        options={[{ value: '', label: 'Choisir une matière' }, ...visibleSubjects.map(s => ({ value: s.nom, label: s.nom }))]}
                        required
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Type"
                            value={gradeForm.type}
                            onChange={e => setGradeForm({ ...gradeForm, type: e.target.value })}
                            options={isUniversity ? [{ value: 'dst', label: 'DST' }, { value: 'session', label: 'Session' }] : [{ value: 'devoir', label: 'Devoir' }, { value: 'composition', label: 'Composition' }]}
                        />
                        <Input label="Coefficient" type="number" value={gradeForm.coefficient || 1} onChange={e => setGradeForm({ ...gradeForm, coefficient: Number(e.target.value) })} />
                    </div>
                    <Input label="Note / 20" type="number" step="0.25" min="0" max="20" value={gradeForm.valeur} onChange={e => setGradeForm({ ...gradeForm, valeur: Number(e.target.value) })} required />
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="secondary" onClick={() => setIsGradeModalOpen(false)}>Annuler</Button>
                        <Button type="submit">Enregistrer</Button>
                    </div>
                </form>
            </Modal>

            {/* Modal Bulletin */}
            <Modal isOpen={isBulletinModalOpen} onClose={() => setIsBulletinModalOpen(false)} title="Aperçu du Bulletin" maxWidth="max-w-4xl">
                <div className="flex flex-col gap-6">
                    <div className="flex justify-end gap-3 print:hidden">
                        <Button variant="secondary" onClick={downloadPDF} icon={<i className="fas fa-file-pdf"></i>}>Télécharger en PDF</Button>
                        <Button variant="primary" onClick={printBulletin} icon={<i className="fas fa-print"></i>}>Imprimer le Bulletin</Button>
                    </div>
                    
                    <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
                        <div id="bulletin-content" className="bg-white text-[#1a1a1a] p-10 font-serif leading-tight shadow-xl min-w-[850px] mx-auto">
                        {/* 1. Header & Branding Blocks */}
                        <div className="flex justify-between items-start mb-6">
                            {/* Left Block: Institution + School Branding */}
                            <div className="w-1/2 flex flex-col items-center text-center space-y-4">
                                <div className="space-y-1">
                                    <p className="text-[14px] font-black uppercase leading-[1.2]">
                                        {settings.bulletin.ministryName}
                                    </p>
                                    <div className="w-8 h-[1px] bg-black mx-auto"></div>
                                    <p className="text-[10px] font-bold uppercase leading-tight">
                                        {settings.bulletin.departmentalDirection}<br/>
                                        {settings.bulletin.inspectionName}
                                    </p>
                                </div>
                                <div className="flex flex-col items-center pt-2">
                                    {settings.logo && <img src={settings.logo} className="w-24 h-24 object-contain mb-1" />}
                                    <h1 className="text-lg font-black tracking-tighter uppercase">{settings.appName}</h1>
                                    <p className="text-[9px] italic font-bold tracking-wide">{settings.bulletin.schoolMotto}</p>
                                </div>
                            </div>

                            {/* Right Block: Republic + QR Verification */}
                            <div className="w-[40%] flex flex-col items-center text-center space-y-4">
                                <div className="space-y-1 border-t border-black pt-1 w-full">
                                    <h2 className="text-[14px] font-black uppercase tracking-tight">{settings.bulletin.republicName}</h2>
                                    <p className="text-[11px] italic font-medium">"{settings.bulletin.republicMotto}"</p>
                                </div>
                                <div className="flex flex-col items-center pt-1">
                                    {qrCodeDataUrl && <img src={qrCodeDataUrl} className="w-24 h-24 border border-gray-100 p-0.5 mb-0.5 shadow-sm" />}
                                    <p className="text-[7px] font-bold text-gray-400 tracking-widest uppercase mb-2">Vérification Officielle</p>
                                    
                                    <div className="text-[10px] space-y-0.5">
                                        <p className="font-medium italic">Année Académique : <span className="font-bold">2023-2024</span></p>
                                        <p className="font-black uppercase underline">Période : {isUniversity ? `SEMESTRE ${activeTrimestre}` : `${activeTrimestre === '1' ? '1ER' : activeTrimestre + 'ÈME'} TRIMESTRE`}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-full h-[2px] bg-black mb-4"></div>

                        {/* 3. Student Info Box */}
                        <div className="grid grid-cols-2 gap-x-12 gap-y-2 bg-[#f8f9fa] p-4 border border-gray-200 rounded-sm mb-4 text-[12px]">
                            <div className="grid grid-cols-2 gap-1">
                                <span className="text-gray-500 font-medium">Nom :</span>
                                <span className="font-black uppercase">{student.nom}</span>
                                <span className="text-gray-500 font-medium">Prénom :</span>
                                <span className="font-bold">{student.prenom}</span>
                                <span className="text-gray-500 font-medium">Matricule :</span>
                                <span className="font-bold text-blue-600">{student.matricule}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                                <span className="text-gray-500 font-medium">Classe :</span>
                                <span className="font-black uppercase">{student.classe}</span>
                                <span className="text-gray-500 font-medium">Cycle :</span>
                                <span className="font-black uppercase">{student.cycle}</span>
                                <span className="text-gray-500 font-medium">Date d'édition :</span>
                                <span className="font-bold">{new Date().toLocaleDateString('fr-FR')}</span>
                            </div>
                        </div>

                        {/* 4. Grades Table */}
                        <table className="w-full border-collapse border border-black mb-0 text-[10px]">
                            <thead>
                                <tr className="bg-white">
                                    <th className="border border-black px-2 py-2 text-left font-black w-[25%] uppercase">Matière</th>
                                    <th className="border border-black px-1 py-2 text-center font-bold">Moy. Classe</th>
                                    <th className="border border-black px-1 py-2 text-center font-bold">Note Compo</th>
                                    <th className="border border-black px-1 py-2 text-center font-bold">Moy. Trimestre</th>
                                    <th className="border border-black px-1 py-2 text-center font-bold">Coeff</th>
                                    <th className="border border-black px-1 py-2 text-center font-bold">Total</th>
                                    <th className="border border-black px-2 py-2 text-left font-bold w-[25%]">Appréciation</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bulletinData.subjects.map((s, idx) => {
                                    const appreciation = settings.bulletin.appreciationRules.find(r => s.average >= r.min && s.average <= r.max)?.text || "-";
                                    return (
                                        <tr key={idx} className="h-6 border-b border-gray-300">
                                            <td className="border-x border-black px-2 font-bold uppercase">{s.name}</td>
                                            <td className="border-x border-black text-center font-medium">{s.moyDevoirs.toFixed(2)}</td>
                                            <td className="border-x border-black text-center font-medium">{s.compoNote !== null ? s.compoNote : '-'}</td>
                                            <td className="border-x border-black text-center font-bold">{s.average.toFixed(2)}</td>
                                            <td className="border-x border-black text-center">{s.coefficient}</td>
                                            <td className="border-x border-black text-center">{(s.average * s.coefficient).toFixed(2)}</td>
                                            <td className="border-x border-black px-2 italic text-[9px] leading-[1.1]">{appreciation}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-white font-black text-right border-t border-black">
                                     <td colSpan={4} className="border-x border-black px-2 py-1 uppercase text-[9px]">TOTAUX</td>
                                     <td className="border-x border-black text-center py-1">{bulletinData.totalCoeffs}</td>
                                     <td className="border-x border-black text-center py-1">{bulletinData.totalPoints.toFixed(2)}</td>
                                     <td className="border-x border-black"></td>
                                 </tr>
                                {activeTrimestre === '3' && (
                                    <tr className="bg-gray-50 text-[9px] font-bold border border-black">
                                        <td colSpan={2} className="px-2 text-center py-1 border-r border-black">MOYENNE T1: {bulletinData.t1Avg?.toFixed(2) || '-'}</td>
                                        <td colSpan={3} className="px-2 text-center py-1 border-r border-black">MOYENNE T2: {bulletinData.t2Avg?.toFixed(2) || '-'}</td>
                                        <td colSpan={3} className="px-2 text-center py-1 bg-yellow-50">MOYENNE ANNUELLE: {bulletinData.annualAvg?.toFixed(2) || '-'}</td>
                                    </tr>
                                )}
                                <tr className="bg-[#1e293b] text-white font-black h-10 uppercase text-[11px]">
                                    <td colSpan={3} className="text-center tracking-widest">MOYENNE GÉNÉRALE DU TRIMESTRE</td>
                                    <td colSpan={4} className="text-left pl-6 text-xl">{bulletinData.generalAverage.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>

                        {/* 5. Bottom Boxes */}
                        <div className="grid grid-cols-2 gap-8 mt-6">
                            <div className="border border-gray-200 p-4 rounded-md min-h-[140px] bg-[#fdfdfd]">
                                <h3 className="text-xs font-black uppercase underline mb-3">Décision du conseil</h3>
                                <div className="space-y-2 text-[11px]">
                                    <p className="font-black text-lg">
                                        {bulletinData.subjects.length === 0 ? "Données insuffisantes" : (
                                            bulletinData.generalAverage >= 10 
                                                ? (student.genre === 'Fille' || student.genre === 'F' ? "Admise" : "Admis")
                                                : "Echoué"
                                        )}
                                    </p>
                                    <p className="font-bold text-gray-800">
                                        Rang de l'élève : <span className="text-blue-600 text-lg">{bulletinData.rank}{bulletinData.rank === 1 ? 'er' : 'ème'}</span> sur {bulletinData.classSize} élèves.
                                    </p>
                                    <div className="pt-1">
                                        <p className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">Observations :</p>
                                        <div className="w-full h-[1px] bg-gray-100 mt-4"></div>
                                        <div className="w-full h-[1px] bg-gray-100 mt-3"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="border border-gray-200 p-4 rounded-md text-center flex flex-col justify-between min-h-[140px] bg-[#fdfdfd]">
                                <div>
                                    <h3 className="text-xs font-black uppercase underline">Le Directeur</h3>
                                    <div className="w-12 h-[1px] bg-black mx-auto mt-1"></div>
                                </div>
                                <p className="text-[9px] italic text-gray-400 mb-2">(Signature et Cachet)</p>
                            </div>
                        </div>

                        {/* 6. Footer */}
                        <div className="mt-8 text-center border-t border-gray-50 pt-3">
                            <p className="text-[7px] font-bold text-gray-300 uppercase tracking-widest">
                                DOCUMENT GÉNÉRÉ PAR {settings.appName} - SYSTÈME DE GESTION SCOLAIRE
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            </Modal>
        </div>
    );
};

const InfoRow: React.FC<{ label: string, value: string }> = ({ label, value }) => (
    <div className="flex justify-between items-center py-2 border-b dark:border-white/5 last:border-0">
        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{label}</span>
        <span className="text-sm font-bold dark:text-gray-200">{value}</span>
    </div>
);
