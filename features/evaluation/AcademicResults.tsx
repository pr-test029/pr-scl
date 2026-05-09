import React, { useState, useMemo } from 'react';
import { Card, Button, Select } from '../../components/ui/Common';
import { useSchool } from '../../App';
import { Student, Grade, Subject } from '../../types';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export const AcademicResults: React.FC = () => {
    const { students, grades, settings, cycles, subjects } = useSchool();
    const [selectedCycle, setSelectedCycle] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [activeTrimestre, setActiveTrimestre] = useState<string>('1');

    // Filtered Classes for selected cycle
    const availableClasses = useMemo(() => {
        if (!selectedCycle || !cycles[selectedCycle]) return [];
        const cycle = cycles[selectedCycle];
        
        if (cycle.type === 'series' && cycle.series && cycle.series.length > 0) {
            const combinations: string[] = [];
            cycle.levels.forEach(l => {
                cycle.series.forEach(s => combinations.push(`${l} ${s}`));
            });
            return combinations;
        }
        
        if (cycle.type === 'specialites' && cycle.specialites && cycle.specialites.length > 0) {
            const combinations: string[] = [];
            cycle.levels.forEach(l => {
                cycle.specialites.forEach(s => combinations.push(`${l} ${s.name || s}`));
            });
            return combinations;
        }
        
        return cycle.levels;
    }, [selectedCycle, cycles]);

    // Rankings Calculation
    const rankings = useMemo(() => {
        if (!selectedCycle || !selectedClass) return [];

        const cycle = cycles[selectedCycle];
        let classStudents: Student[] = [];

        if (cycle.type === 'series') {
            const parts = selectedClass.split(' ');
            const level = parts[0];
            const serie = parts.slice(1).join(' ');
            classStudents = students.filter(s => s.cycle === selectedCycle && s.classe === level && s.serie === serie);
        } else if (cycle.type === 'specialites') {
            const parts = selectedClass.split(' ');
            const level = parts[0];
            const spec = parts.slice(1).join(' ');
            classStudents = students.filter(s => s.cycle === selectedCycle && s.classe === level && s.specialite === spec);
        } else {
            classStudents = students.filter(s => s.cycle === selectedCycle && s.classe === selectedClass);
        }
        
        const studentAverages = classStudents.map(student => {
            const studentGrades = grades.filter(g => g.studentId === student.id && g.trimestre === activeTrimestre);
            if (studentGrades.length === 0) return { ...student, average: 0, hasGrades: false };

            const subData: Record<string, { total: number, count: number, coeff: number, compoNote: number | null }> = {};
            studentGrades.forEach(g => {
                if (!subData[g.matiere]) {
                    const subKey = student.serie ? `${student.classe} ${student.serie}` : student.classe;
                    const subInfo = (subjects[subKey] || []).find(sub => sub.nom === g.matiere);
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

        // Sort by average descending
        return studentAverages.sort((a, b) => b.average - a.average);
    }, [students, grades, activeTrimestre, selectedCycle, selectedClass, subjects]);

    const handlePrint = () => {
        const content = document.getElementById('results-print-content')?.outerHTML;
        if (!content) return;
        
        const printWindow = window.open('', '', 'width=900,height=800');
        if (!printWindow) {
            alert("Veuillez autoriser les pop-ups pour imprimer la liste.");
            return;
        }
        
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(el => el.outerHTML)
            .join('');

        printWindow.document.write(`
            <html>
            <head>
                <title>Résultats Scolaires - ${selectedClass}</title>
                ${styles}
                <style>
                    body { background: white; padding: 40px; margin: 0; font-family: serif; color: black; }
                    .print-header { margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #000; padding: 10px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .text-center { text-align: center; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    @page { margin: 10mm; }
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

    const handleDownloadPDF = () => {
        const element = document.getElementById('results-print-content');
        if (!element) return;
        
        const opt = {
            margin:       10,
            filename:     `Resultats_${selectedClass}_T${activeTrimestre}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save();
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Header & Filters */}
            <div className="bg-white dark:bg-white/5 p-8 rounded-3xl shadow-xl border dark:border-white/10 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Résultats Scolaires</h2>
                        <p className="text-gray-500 font-medium">Classement général et export des notes</p>
                    </div>
                    <div className="flex bg-gray-100 dark:bg-white/10 p-1.5 rounded-2xl self-center">
                        {['1', '2', '3'].map(p => (
                            <button 
                                key={p} 
                                onClick={() => setActiveTrimestre(p)} 
                                className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTrimestre === p ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Trimestre {p}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Select 
                        label="1. Choisir le Cycle"
                        value={selectedCycle}
                        onChange={e => { setSelectedCycle(e.target.value); setSelectedClass(''); }}
                        options={[
                            { value: '', label: 'Sélectionner un cycle' },
                            ...Object.values(cycles).map(c => ({ value: c.id, label: c.name }))
                        ]}
                    />
                    <Select 
                        label="2. Choisir la Classe"
                        value={selectedClass}
                        onChange={e => setSelectedClass(e.target.value)}
                        options={[
                            { value: '', label: 'Sélectionner une classe' },
                            ...availableClasses.map(l => ({ value: l, label: l }))
                        ]}
                        disabled={!selectedCycle}
                    />
                </div>
            </div>

            {selectedClass ? (
                <Card title={`Résultats Scolaires - ${selectedClass}`} className="overflow-hidden shadow-2xl border dark:border-white/10">
                    <div className="flex justify-end gap-3 p-4 bg-gray-50 dark:bg-white/5 border-b dark:border-white/10">
                        <Button variant="secondary" size="sm" onClick={handleDownloadPDF} icon={<i className="fas fa-file-pdf"></i>}>Enregistrer en PDF</Button>
                        <Button variant="primary" size="sm" onClick={handlePrint} icon={<i className="fas fa-print"></i>}>Imprimer la liste</Button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                            <thead className="bg-gray-50 dark:bg-white/5">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Rang</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Nom et Prénom</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Matricule</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Moyenne</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-white/10">
                                {rankings.map((s, idx) => (
                                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-yellow-400 text-white shadow-lg' : idx === 1 ? 'bg-gray-200 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}>
                                                {idx + 1}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                                            {s.nom} {s.prenom}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-blue-600 dark:text-blue-400">
                                            {s.matricule}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className={`text-lg font-black ${s.average >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                                                {s.average.toFixed(2)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {rankings.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">
                                            Aucune note enregistrée pour cette classe au Trimestre {activeTrimestre}.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Hidden Content for PDF/Print */}
                    <div className="hidden">
                        <div id="results-print-content" style={{ fontFamily: 'serif', color: 'black', background: 'white' }}>
                            {/* Header Block */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '30px', borderBottom: '2px solid black', paddingBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    {settings.logo && <img src={settings.logo} style={{ width: '80px', height: '80px', objectFit: 'contain' }} />}
                                    <div>
                                        <h1 style={{ fontSize: '24px', fontWeight: '900', textTransform: 'uppercase', margin: 0 }}>{settings.appName}</h1>
                                        <p style={{ fontSize: '10px', fontWeight: 'bold', fontStyle: 'italic', margin: '5px 0' }}>{settings.bulletin.schoolMotto}</p>
                                        <p style={{ fontSize: '10px', margin: 0 }}>{settings.bulletin.schoolLocation}</p>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <h2 style={{ fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', margin: 0 }}>{settings.bulletin.republicName}</h2>
                                    <p style={{ fontSize: '10px', fontStyle: 'italic', margin: '2px 0' }}>"{settings.bulletin.republicMotto}"</p>
                                    <div style={{ marginTop: '15px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                        Année Académique : 2023-2024
                                    </div>
                                </div>
                            </div>

                            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '900', textTransform: 'uppercase', textDecoration: 'underline', margin: 0 }}>
                                    RÉSULTAT SCOLAIRE
                                </h2>
                                <p style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '10px' }}>
                                    {activeTrimestre === '1' ? '1ER TRIMESTRE' : activeTrimestre + 'ÈME TRIMESTRE'}
                                </p>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f2f2f2' }}>
                                        <th style={{ border: '1px solid black', padding: '10px', textAlign: 'center', width: '60px' }}>RANG</th>
                                        <th style={{ border: '1px solid black', padding: '10px', textAlign: 'left' }}>NOM ET PRÉNOM</th>
                                        <th style={{ border: '1px solid black', padding: '10px', textAlign: 'center', width: '150px' }}>MATRICULE</th>
                                        <th style={{ border: '1px solid black', padding: '10px', textAlign: 'center', width: '120px' }}>MOYENNE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rankings.map((s, idx) => (
                                        <tr key={s.id}>
                                            <td style={{ border: '1px solid black', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                                            <td style={{ border: '1px solid black', padding: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>{s.nom} {s.prenom}</td>
                                            <td style={{ border: '1px solid black', padding: '10px', textAlign: 'center', fontFamily: 'monospace' }}>{s.matricule}</td>
                                            <td style={{ border: '1px solid black', padding: '10px', textAlign: 'center', fontWeight: '900' }}>{s.average.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', padding: '0 40px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '12px', fontWeight: 'bold', textDecoration: 'underline' }}>Le Conseil des Professeurs</p>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '12px', fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>Le Directeur de l'école</p>
                                    <div style={{ height: '80px' }}></div>
                                    <p style={{ fontSize: '10px', fontStyle: 'italic', color: '#666' }}>(Signature et Cachet)</p>
                                </div>
                            </div>

                            <div style={{ marginTop: '80px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                                <p style={{ fontSize: '8px', color: '#999', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>
                                    DOCUMENT GÉNÉRÉ PAR {settings.appName} - SYSTÈME DE GESTION SCOLAIRE
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            ) : (
                <div className="bg-white dark:bg-white/5 p-20 rounded-3xl border-2 border-dashed dark:border-white/10 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 text-4xl shadow-inner">
                        <i className="fas fa-list-ol"></i>
                    </div>
                    <div>
                        <h3 className="text-xl font-black dark:text-white uppercase">Prêt pour le palmarès</h3>
                        <p className="text-gray-500 max-w-sm">Sélectionnez un cycle et une classe pour afficher le classement des élèves et exporter la liste.</p>
                    </div>
                </div>
            )}
        </div>
    );
};
