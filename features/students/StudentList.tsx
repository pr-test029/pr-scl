
import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
declare const qrcode: any;
import { Card, Button, Input, Modal, Select } from '../../components/ui/Common';
import { useSchool } from '../../App';
import { Student, Cycle, Payment } from '../../types';
import { generateMatricule } from '../../services/firebase';
import { StudentDetails } from './StudentDetails';
import { StudentForm } from './StudentForm';
import { StudentBadgeModal } from './StudentBadgeModal';

export const StudentList: React.FC = () => {
  const { students, cycles, deleteStudent, session, settings, addStudent, addPayment, selectedAcademicYear, grades, subjects } = useSchool();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCycle, setSelectedCycle] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [isExportingBulletins, setIsExportingBulletins] = useState(false);
  const [bulletinProgress, setBulletinProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkBulletinPeriod, setBulkBulletinPeriod] = useState<string>('1');
  const [showBulkBulletinModal, setShowBulkBulletinModal] = useState(false);
  
  // Trouver les informations de personnel si c'est un prof
  const staffRecord = useMemo(() => 
    settings.staff?.find(s => s.matricule === session?.matricule),
  [settings.staff, session]);
  
  // States pour la navigation
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [badgeStudent, setBadgeStudent] = useState<Student | null>(null);

  // States pour l'exportation
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'cycle' | 'classe'>('all');
  const [exportCycle, setExportCycle] = useState<string>('');
  const [exportClass, setExportClass] = useState<string>('');

  // Filter Logic
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Restriction Professeur : Voir uniquement ses classes assignées
      if (session?.role === 'professeur' && staffRecord) {
        if (!staffRecord.assignedClasses.includes(student.classe)) return false;
      }

      const matchesSearch = (student.nom + ' ' + student.prenom).toLowerCase().includes(searchTerm.toLowerCase()) || 
                           student.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.matricule?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCycle = selectedCycle === 'all' || student.cycle === selectedCycle;
      const fullStudentClass = student.serie ? `${student.classe} ${student.serie}` : student.classe;
      const matchesClass = selectedClass === 'all' || fullStudentClass === selectedClass || student.classe === selectedClass;
      const matchesRoom = selectedRoom === 'all' || student.salle === selectedRoom;
      return matchesSearch && matchesCycle && matchesClass && matchesRoom;
    });
  }, [students, searchTerm, selectedCycle, selectedClass, selectedRoom, session, staffRecord]);

  // Salles disponibles selon la classe sélectionnée
  const availableRoomsForClass = useMemo(() => {
    if (selectedClass === 'all') return [];
    const rooms = new Set<string>();
    students.forEach(s => {
      const fullClass = s.serie ? `${s.classe} ${s.serie}` : s.classe;
      if ((fullClass === selectedClass || s.classe === selectedClass) && s.salle) {
        rooms.add(s.salle);
      }
    });
    // Compléter également avec les salles éventuellement configurées pour cette classe dans settings.classRooms
    if (settings.classRooms && settings.classRooms[selectedClass]) {
      settings.classRooms[selectedClass].forEach((r: string) => rooms.add(r));
    }
    return Array.from(rooms).filter(Boolean).sort();
  }, [students, selectedClass, settings.classRooms]);

  // Handle Export Excel
  const handleExportExcel = () => {
    let listToExport = [...students];

    let scopeLabel = "Tous_les_eleves";
    if (exportScope === 'cycle' && exportCycle) {
      listToExport = listToExport.filter(s => s.cycle === exportCycle);
      scopeLabel = `Cycle_${cycles[exportCycle]?.name || exportCycle}`.replace(/\s+/g, '_');
    } else if (exportScope === 'classe' && exportClass) {
      listToExport = listToExport.filter(s => {
        const fullClassName = s.serie ? `${s.classe} ${s.serie}` : s.classe;
        return fullClassName === exportClass || s.classe === exportClass;
      });
      scopeLabel = `Classe_${exportClass}`.replace(/\s+/g, '_');
    }

    if (listToExport.length === 0) {
      alert("Aucun élève trouvé pour les critères de sélection choisis.");
      return;
    }

    const dataRows = listToExport.map(s => ({
      "Matricule": s.matricule || '',
      "Nom": s.nom || '',
      "Prénom": s.prenom || '',
      "Date de Naissance": s.dateNaissance || '',
      "Genre": s.genre || '',
      "Adresse": s.adresse || '',
      "Ville": s.ville || '',
      "Téléphone": s.telephone || '',
      "Email": s.email || '',
      "Cycle": cycles[s.cycle]?.name || s.cycle || '',
      "Classe": s.classe || '',
      "Série / Spécialité": s.serie || '',
      "Nom Tuteur": s.tuteurNom || '',
      "Relation Tuteur": s.tuteurRelation || '',
      "Téléphone Tuteur": s.tuteurTelephone || '',
      "Email Tuteur": s.tuteurEmail || '',
      "Remarques / Notes": s.notes_info || '',
      "Date d'Inscription": s.dateInscription || '',
      "Statut Spécial": s.isSpecial ? "OUI" : "NON",
      "Année Scolaire": s.academic_year || selectedAcademicYear
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Élèves");
    
    // Auto-fit column widths
    const columnWidths = Object.keys(dataRows[0] || {}).map(key => ({
      wch: Math.max(key.length + 3, 14)
    }));
    worksheet['!cols'] = columnWidths;

    const fileName = `Export_Eleves_${scopeLabel}_${selectedAcademicYear}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    setShowExportModal(false);
  };

  // Obtenir les classes uniques pour le filtre (selon le cycle sélectionné)
  const availableClasses = useMemo(() => {
      let baseClasses: string[] = [];
      
      const getFullClass = (s: Student) => s.serie ? `${s.classe} ${s.serie}` : s.classe;

      if (selectedCycle === 'all') {
          baseClasses = Array.from(new Set(students.map(getFullClass)));
      } else {
          // Utiliser les classes réelles des élèves de ce cycle
          const cycleStudentsClasses = Array.from(new Set(students.filter(s => s.cycle === selectedCycle).map(getFullClass)));
          
          // Ajouter les classes théoriques du cycle
          const cycle = cycles[selectedCycle];
          let theoreticalClasses: string[] = [];
          if (cycle) {
              if (cycle.type === 'simple') {
                  theoreticalClasses = cycle.levels;
              } else {
                  const suffixes = cycle.type === 'series' ? cycle.series : cycle.specialites;
                  if (suffixes && suffixes.length > 0) {
                      cycle.levels.forEach(lvl => suffixes.forEach(s => theoreticalClasses.push(`${lvl} ${s}`)));
                  } else {
                      theoreticalClasses = cycle.levels;
                  }
              }
          }
          
          baseClasses = Array.from(new Set([...theoreticalClasses, ...cycleStudentsClasses]));
      }

      // Restriction Professeur
      if (session?.role === 'professeur' && staffRecord) {
          return baseClasses.filter(c => staffRecord.assignedClasses.includes(c)).sort();
      }

      return baseClasses.filter(Boolean).sort();
  }, [selectedCycle, cycles, students, session, staffRecord]);

  // Filtrer les cycles visibles pour les profs
  const visibleCycles = useMemo(() => {
    const allCycles = Object.values(cycles);
    if (session?.role === 'professeur' && staffRecord) {
        return allCycles.filter(cycle => {
            // Un cycle est visible si au moins une classe assignée appartient à ce cycle
            return staffRecord.assignedClasses.some(assignedClass => 
                cycle.levels.some(lvl => assignedClass.startsWith(lvl))
            );
        });
    }
    return allCycles;
  }, [cycles, session, staffRecord]);


  // Fonction de génération groupée des bulletins de la classe
  const handleBulkDownloadBulletins = async (chosenPeriod: string) => {
    if (selectedClass === 'all') return;
    const targetStudents = students.filter(s => {
      const full = s.serie ? `${s.classe} ${s.serie}` : s.classe;
      const classMatch = full === selectedClass || s.classe === selectedClass;
      const roomMatch = selectedRoom === 'all' || s.salle === selectedRoom;
      return classMatch && roomMatch;
    });

    if (targetStudents.length === 0) {
      alert("Aucun élève trouvé dans cette classe/salle pour générer les bulletins.");
      return;
    }

    setIsExportingBulletins(true);
    setShowBulkBulletinModal(false);

    try {
      const container = document.createElement('div');
      container.id = 'bulk-bulletins-container';
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '850px';
      container.style.background = '#ffffff';
      document.body.appendChild(container);

      const classStudents = students.filter(s => {
        const full = s.serie ? `${s.classe} ${s.serie}` : s.classe;
        return full === selectedClass || s.classe === selectedClass;
      });

      const getWeights = (cKey: string) => {
        const raw = settings.gradeWeights?.[cKey] ?? { devoir: 50, composition: 50 };
        const d = raw.devoir > 1 ? raw.devoir / 100 : raw.devoir;
        const c = raw.composition > 1 ? raw.composition / 100 : raw.composition;
        return { devoir: d, composition: c };
      };

      const calculateStudentAverage = (s: Student, p: string) => {
        const sGrades = grades.filter(g => g.studentId === s.id && g.trimestre === p);
        if (sGrades.length === 0) return { average: 0, totalPoints: 0, totalCoeffs: 0, subjects: [] };
        const subData: Record<string, { total: number, count: number, coeff: number, compoNote: number | null }> = {};
        sGrades.forEach(g => {
          if (!subData[g.matiere]) {
            const sKey = s.serie ? `${s.classe} ${s.serie}` : s.classe;
            const subInfo = (subjects[sKey] || []).find(sub => sub.nom === g.matiere);
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
        const w = getWeights(s.cycle);
        const detailed = Object.entries(subData).map(([name, d]) => {
          const hasDev = d.count > 0;
          const hasCompo = d.compoNote !== null;
          const moyDev = hasDev ? d.total / d.count : null;
          let final = 0;
          if (hasDev && hasCompo) {
            final = moyDev! * w.devoir + d.compoNote! * w.composition;
          } else if (hasDev) {
            final = moyDev!;
          } else if (hasCompo) {
            final = d.compoNote!;
          }
          return { name, moyDevoirs: moyDev, compoNote: d.compoNote, average: final, coefficient: d.coeff };
        });
        const pts = detailed.reduce((acc, sub) => acc + (sub.average * sub.coefficient), 0);
        const cfs = detailed.reduce((acc, sub) => acc + sub.coefficient, 0);
        return { average: cfs > 0 ? pts / cfs : 0, totalPoints: pts, totalCoeffs: cfs, subjects: detailed };
      };

      const allClassAverages = classStudents.map(s => ({
        id: s.id,
        ...calculateStudentAverage(s, chosenPeriod)
      })).sort((a, b) => b.average - a.average);

      let html = '';

      targetStudents.forEach((student, index) => {
        const studentCycle = cycles[student.cycle];
        const cycleHeader = studentCycle?.bulletinHeader || {};
        const bh = {
          ministryName: cycleHeader.ministryName || settings.bulletin.ministryName,
          departmentalDirection: cycleHeader.departmentalDirection || settings.bulletin.departmentalDirection,
          inspectionName: cycleHeader.inspectionName || settings.bulletin.inspectionName,
          republicName: cycleHeader.republicName || settings.bulletin.republicName,
          republicMotto: cycleHeader.republicMotto || settings.bulletin.republicMotto,
          schoolMotto: cycleHeader.schoolMotto || settings.bulletin.schoolMotto,
          appreciationRules: (cycleHeader.appreciationRules && cycleHeader.appreciationRules.length > 0) ? cycleHeader.appreciationRules : settings.bulletin.appreciationRules,
        };

        const isPrimary = student.cycle.toLowerCase().includes('primaire') || (studentCycle && (studentCycle.maxGrade === 10 || studentCycle.name.toLowerCase().includes('primaire')));
        const cycleMaxScale = studentCycle?.maxGrade || (isPrimary ? 10 : 20);
        const passingThreshold = cycleMaxScale / 2;

        const isUniv = student.cycle === 'universite';
        const rank = allClassAverages.findIndex(a => a.id === student.id) + 1;
        const studentCalc = allClassAverages.find(a => a.id === student.id) || { average: 0, totalPoints: 0, totalCoeffs: 0, subjects: [] };

        let qrDataUrl = '';
        if (typeof qrcode !== 'undefined') {
          try {
            const qr = qrcode(0, 'M');
            qr.addData(JSON.stringify({
              eleve: `${student.prenom} ${student.nom}`,
              classe: student.classe,
              periode: chosenPeriod,
              moyenne: studentCalc.average.toFixed(2),
              ecole: settings.appName
            }));
            qr.make();
            qrDataUrl = qr.createDataURL(3);
          } catch (e) {
            console.error('QR error', e);
          }
        }

        const subjectsRows = studentCalc.subjects.map(s => {
          const appreciation = bh.appreciationRules.find((r: any) => s.average >= r.min && s.average <= r.max)?.text || '-';
          return `
            <tr style="height: 24px; border-bottom: 1px solid #d1d5db;">
              <td style="border-left: 1px solid #000; border-right: 1px solid #000; padding: 2px 8px; font-weight: bold; text-transform: uppercase;">${s.name}</td>
              <td style="border-right: 1px solid #000; text-align: center;">${s.moyDevoirs !== null ? s.moyDevoirs.toFixed(2) : '-'}</td>
              <td style="border-right: 1px solid #000; text-align: center;">${s.compoNote !== null ? s.compoNote.toFixed(2) : '-'}</td>
              <td style="border-right: 1px solid #000; text-align: center; font-weight: bold;">${s.average.toFixed(2)}</td>
              <td style="border-right: 1px solid #000; text-align: center;">${s.coefficient}</td>
              <td style="border-right: 1px solid #000; text-align: center;">${(s.average * s.coefficient).toFixed(2)}</td>
              <td style="border-right: 1px solid #000; padding: 2px 8px; font-style: italic; font-size: 9px;">${appreciation}</td>
            </tr>
          `;
        }).join('');

        const decision = studentCalc.subjects.length === 0 ? "Données insuffisantes" : (
          studentCalc.average >= passingThreshold 
            ? (student.genre === 'Fille' || student.genre === 'F' ? "Admise" : "Admis")
            : "Echoué"
        );

        const pageBreak = index < targetStudents.length - 1 ? 'page-break-after: always; break-after: page;' : '';

        html += `
          <div class="bulletin-page" style="width: 800px; padding: 30px; margin: 0 auto; background: #ffffff; color: #1a1a1a; font-family: serif; font-size: 11px; ${pageBreak}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
              <div style="width: 50%; text-align: center;">
                <p style="font-size: 13px; font-weight: 900; text-transform: uppercase; margin: 0;">${bh.ministryName}</p>
                <div style="width: 30px; height: 1px; background: #000; margin: 4px auto;"></div>
                <p style="font-size: 10px; font-weight: bold; text-transform: uppercase; margin: 0;">${bh.departmentalDirection}<br/>${bh.inspectionName}</p>
                <div style="margin-top: 8px;">
                  ${settings.logo ? `<img src="${settings.logo}" style="width: 60px; height: 60px; object-fit: contain; margin: 0 auto;" />` : ''}
                  <h1 style="font-size: 15px; font-weight: 900; text-transform: uppercase; margin: 4px 0 0 0;">${settings.appName}</h1>
                  <p style="font-size: 9px; font-style: italic; font-weight: bold; margin: 0;">${bh.schoolMotto}</p>
                </div>
              </div>
              <div style="width: 40%; text-align: center;">
                <div style="border-top: 1px solid #000; padding-top: 4px;">
                  <h2 style="font-size: 13px; font-weight: 900; text-transform: uppercase; margin: 0;">${bh.republicName}</h2>
                  <p style="font-size: 10px; font-style: italic; margin: 2px 0 0 0;">"${bh.republicMotto}"</p>
                </div>
                <div style="margin-top: 8px;">
                  ${qrDataUrl ? `<img src="${qrDataUrl}" style="width: 65px; height: 65px; margin: 0 auto;" />` : ''}
                  <p style="font-size: 7px; font-weight: bold; color: #888; text-transform: uppercase; margin: 2px 0;">Vérification Officielle</p>
                  <p style="font-size: 9px; margin: 0;">Année : <b>${selectedAcademicYear}</b></p>
                  <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; text-decoration: underline; margin: 2px 0 0 0;">
                    ${isUniv ? `Semestre ${chosenPeriod}` : `${chosenPeriod === '1' ? '1ER' : chosenPeriod + 'ÈME'} TRIMESTRE`}
                  </p>
                </div>
              </div>
            </div>

            <div style="width: 100%; height: 2px; background: #000; margin-bottom: 12px;"></div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f8f9fa; padding: 10px; border: 1px solid #e5e7eb; margin-bottom: 12px; font-size: 11px;">
              <div>
                <p style="margin: 2px 0;"><span style="color: #666;">Nom :</span> <b>${student.nom}</b></p>
                <p style="margin: 2px 0;"><span style="color: #666;">Prénom :</span> <b>${student.prenom}</b></p>
                <p style="margin: 2px 0;"><span style="color: #666;">Matricule :</span> <b style="color: #2563eb;">${student.matricule || '-'}</b></p>
              </div>
              <div>
                <p style="margin: 2px 0;"><span style="color: #666;">Classe :</span> <b>${student.serie ? `${student.classe} ${student.serie}` : student.classe}</b></p>
                <p style="margin: 2px 0;"><span style="color: #666;">Cycle :</span> <b>${studentCycle?.name || student.cycle}</b> ${student.salle ? `(Salle: ${student.salle})` : ''}</p>
                <p style="margin: 2px 0;"><span style="color: #666;">Date d'édition :</span> <b>${new Date().toLocaleDateString('fr-FR')}</b></p>
              </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 10px; margin-bottom: 12px;">
              <thead>
                <tr style="background: #fff;">
                  <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; width: 28%; text-transform: uppercase;">Matière</th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: center;">Moy. Devoir</th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: center;">Note Compo</th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: center;">Moy. Trimestre</th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: center;">Coeff</th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: center;">Total</th>
                  <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; width: 22%;">Appréciation</th>
                </tr>
              </thead>
              <tbody>
                ${subjectsRows || '<tr><td colspan="7" style="text-align: center; padding: 12px;">Aucune note enregistrée</td></tr>'}
              </tbody>
              <tfoot>
                <tr style="font-weight: 900; text-align: right; border-top: 1px solid #000;">
                  <td colspan="4" style="border-right: 1px solid #000; padding: 4px; text-transform: uppercase; font-size: 9px;">TOTAUX</td>
                  <td style="border-right: 1px solid #000; text-align: center; padding: 4px;">${studentCalc.totalCoeffs}</td>
                  <td style="border-right: 1px solid #000; text-align: center; padding: 4px;">${studentCalc.totalPoints.toFixed(2)}</td>
                  <td></td>
                </tr>
                <tr style="background: #1e293b; color: #fff; font-weight: 900; height: 32px; text-transform: uppercase; font-size: 10px;">
                  <td colspan="3" style="text-align: center; letter-spacing: 1px;">MOYENNE GÉNÉRALE (/${cycleMaxScale})</td>
                  <td colspan="4" style="text-align: left; padding-left: 16px; font-size: 14px;">${studentCalc.average.toFixed(2)} / ${cycleMaxScale}</td>
                </tr>
              </tfoot>
            </table>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 10px;">
              <div style="border: 1px solid #e5e7eb; padding: 10px; border-radius: 4px; min-height: 100px; background: #fdfdfd;">
                <h3 style="font-size: 11px; font-weight: 900; text-transform: uppercase; text-decoration: underline; margin: 0 0 6px 0;">Décision du conseil</h3>
                <p style="font-size: 14px; font-weight: 900; margin: 0 0 4px 0;">${decision}</p>
                <p style="font-size: 11px; margin: 0;">Rang : <b style="color: #2563eb;">${rank}${rank === 1 ? 'er' : 'ème'}</b> sur ${classStudents.length} élèves</p>
                <p style="font-size: 9px; color: #888; text-transform: uppercase; margin: 8px 0 2px 0;">Observations :</p>
                <div style="width: 100%; height: 1px; background: #e5e7eb; margin-top: 12px;"></div>
              </div>
              <div style="border: 1px solid #e5e7eb; padding: 10px; border-radius: 4px; text-align: center; min-height: 100px; display: flex; flex-direction: column; justify-content: space-between; background: #fdfdfd;">
                <div>
                  <h3 style="font-size: 11px; font-weight: 900; text-transform: uppercase; text-decoration: underline; margin: 0;">Le Directeur</h3>
                  <div style="width: 40px; height: 1px; background: #000; margin: 4px auto;"></div>
                </div>
                <p style="font-size: 9px; font-style: italic; color: #888; margin: 0 0 4px 0;">(Signature et Cachet)</p>
              </div>
            </div>

            <div style="margin-top: 16px; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 6px;">
              <p style="font-size: 7px; font-weight: bold; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin: 0;">
                DOCUMENT OFFICIEL GÉNÉRÉ PAR ${settings.appName}
              </p>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;

      const opt = {
        margin: [5, 5, 5, 5],
        filename: `Bulletins_${selectedClass.replace(/\s+/g, '_')}_${selectedAcademicYear}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 1.8, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await (html2pdf as any)().set(opt).from(container).save();
      document.body.removeChild(container);
    } catch (err) {
      console.error("Erreur génération groupée des bulletins:", err);
      alert("Une erreur est survenue lors de la génération des bulletins.");
    } finally {
      setIsExportingBulletins(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`ATTENTION : Êtes-vous sûr de vouloir supprimer définitivement l'élève ${name} ?\n\nCette action supprimera également toutes ses notes et son historique. Cette action est irréversible.`)) {
      deleteStudent(id);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
  };

  if (selectedStudentId) {
    const student = students.find(s => s.id === selectedStudentId);
    if (student) {
      return <StudentDetails student={student} onBack={() => setSelectedStudentId(null)} />;
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Card title="Répertoire des Élèves" helpKey="students">
        <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center mb-8">
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <Button 
              variant={selectedCycle === 'all' ? 'primary' : 'secondary'} 
              size="sm"
              onClick={() => { setSelectedCycle('all'); setSelectedClass('all'); }}
              className="rounded-xl"
            >
              Tous
            </Button>
            {visibleCycles.map((cycle: Cycle) => (
              <Button
                key={cycle.id}
                variant={selectedCycle === cycle.id ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => { setSelectedCycle(cycle.id); setSelectedClass('all'); }}
                className="rounded-xl"
              >
                {cycle.name}
              </Button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
             <div className="w-full sm:w-44">
                <Select 
                    value={selectedClass}
                    onChange={(e) => { setSelectedClass(e.target.value); setSelectedRoom("all"); }}
                    options={[
                        { value: 'all', label: 'Toutes les Classes' },
                        ...availableClasses.map(c => ({ value: c, label: c }))
                    ]}
                />
             </div>
             {selectedClass !== 'all' && (
               <div className="w-full sm:w-40 animate-fade-in">
                  <Select 
                      value={selectedRoom}
                      onChange={(e) => setSelectedRoom(e.target.value)}
                      options={[
                          { value: 'all', label: 'Toutes les Salles' },
                          ...availableRoomsForClass.map(r => ({ value: r, label: `Salle ${r}` }))
                      ]}
                  />
               </div>
             )}
             <div className="w-full sm:w-72">
                <Input 
                    placeholder="Rechercher un élève..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={<i className="fas fa-search"></i>}
                />
             </div>
           </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setExportScope(selectedClass !== 'all' ? 'classe' : selectedCycle !== 'all' ? 'cycle' : 'all');
                setExportCycle(selectedCycle !== 'all' ? selectedCycle : (Object.keys(cycles)[0] || ''));
                setExportClass(selectedClass !== 'all' ? selectedClass : (availableClasses[0] || ''));
                setShowExportModal(true);
              }}
              className="rounded-xl border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 shadow-sm"
              icon={<i className="fas fa-file-excel text-emerald-600"></i>}
            >
              Exporter en Excel
            </Button>

            {selectedClass !== 'all' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowBulkBulletinModal(true)}
                disabled={isExportingBulletins || filteredStudents.length === 0}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md active:scale-95 transition-all"
                icon={isExportingBulletins ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-print"></i>}
              >
                {isExportingBulletins ? "Génération PDF en cours..." : "Télécharger tous les bulletins de la classe"}
              </Button>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl text-sm font-bold shadow-sm">
            Total : {filteredStudents.length} élève{filteredStudents.length > 1 ? 's' : ''}
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-20 bg-gray-50/50 dark:bg-white/2 rounded-[2rem] border-2 border-dashed dark:border-white/5">
            <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-user-slash text-3xl text-gray-300 dark:text-gray-600"></i>
            </div>
            <h3 className="text-xl font-bold dark:text-white">Aucun résultat</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Essayez d'ajuster vos filtres de recherche.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden border dark:border-white/10 rounded-3xl shadow-sm">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-white/5">
                <thead className="bg-gray-50/50 dark:bg-white/5">
                  <tr>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Élève</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Classe & Cycle</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {filteredStudents.map(student => (
                    <tr key={student.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors group">
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12 relative">
                            <img className="h-12 w-12 rounded-2xl object-cover border-2 border-white dark:border-gray-800 shadow-sm" src={student.photo || `https://ui-avatars.com/api/?name=${student.prenom}+${student.nom}&background=random`} alt="" />
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${student.genre === 'Masculin' ? 'bg-blue-500' : 'bg-pink-500'}`}></div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-black text-gray-900 dark:text-white">{student.nom} {student.prenom}</div>
                            <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold uppercase tracking-tighter">ID: {student.matricule || student.id.slice(-8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-200">{student.serie ? `${student.classe} ${student.serie}` : student.classe}</div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                          <span>{cycles[student.cycle]?.name}</span>
                          {student.salle && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 font-bold text-[9px] border border-green-200 dark:border-green-800/40">
                              <i className="fas fa-door-closed text-[8px]"></i> {student.salle}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{student.telephone || '-'}</div>
                        <div className="text-[10px] font-bold text-gray-400">{student.ville}</div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-right space-x-2">
                        <button onClick={() => setSelectedStudentId(student.id)} className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90" title="Bulletin">
                          <i className="fas fa-file-invoice"></i>
                        </button>
                        <button onClick={() => setBadgeStudent(student)} className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 hover:bg-purple-600 hover:text-white transition-all shadow-sm active:scale-90" title="Badge étudiant">
                          <i className="fas fa-id-card"></i>
                        </button>
                        {session?.role !== 'professeur' && (
                          <>
                            <button onClick={() => handleEdit(student)} className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-600 hover:text-white transition-all shadow-sm active:scale-90" title="Modifier">
                              <i className="fas fa-pen"></i>
                            </button>
                            <button onClick={() => handleDelete(student.id, student.nom)} className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-90" title="Supprimer">
                              <i className="fas fa-trash"></i>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
               {filteredStudents.map(student => (
                  <div key={student.id} className="p-5 bg-white dark:bg-white/5 border dark:border-white/10 rounded-3xl shadow-sm space-y-4 animate-fade-in">
                      <div className="flex items-center gap-4">
                          <div className="relative">
                            <img className="h-14 w-14 rounded-2xl object-cover border-2 border-white dark:border-gray-800 shadow-md" src={student.photo || `https://ui-avatars.com/api/?name=${student.prenom}+${student.nom}&background=random`} alt="" />
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${student.genre === 'Masculin' ? 'bg-blue-500' : 'bg-pink-500'}`}></div>
                          </div>
                          <div>
                            <h4 className="font-black text-gray-900 dark:text-white">{student.nom} {student.prenom}</h4>
                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                              {student.serie ? `${student.classe} ${student.serie}` : student.classe} • {cycles[student.cycle]?.name}
                              {student.salle && <span className="ml-2 font-semibold text-green-600 dark:text-green-400">({student.salle})</span>}
                            </p>
                          </div>
                      </div>
                      <div className="flex gap-2">
                         <Button fullWidth variant="secondary" size="sm" onClick={() => setSelectedStudentId(student.id)} icon={<i className="fas fa-file-invoice"></i>}>Bulletin</Button>
                         <Button variant="secondary" size="sm" onClick={() => setBadgeStudent(student)} className="aspect-square p-0 w-12" title="Badge"><i className="fas fa-id-card"></i></Button>
                         {session?.role !== 'professeur' && (
                           <>
                             <Button variant="secondary" size="sm" onClick={() => handleEdit(student)} className="aspect-square p-0 w-12"><i className="fas fa-pen"></i></Button>
                             <Button variant="danger" size="sm" onClick={() => handleDelete(student.id, student.nom)} className="aspect-square p-0 w-12"><i className="fas fa-trash"></i></Button>
                           </>
                         )}
                      </div>
                  </div>
               ))}
            </div>
          </>
        )}
      </Card>

      {/* Modal badge etudiant */}
      <StudentBadgeModal student={badgeStudent} onClose={() => setBadgeStudent(null)} />

      {/* Modal d'édition */}
      {editingStudent && (
        <Modal isOpen={!!editingStudent} onClose={() => setEditingStudent(null)} title="Modification de l'élève" maxWidth="max-w-4xl">
          <StudentForm 
            initialData={editingStudent} 
            onSuccess={() => setEditingStudent(null)} 
            onCancel={() => setEditingStudent(null)}
          />
        </Modal>
      )}
      
      {/* Modal choix période pour impression groupée des bulletins */}
      {showBulkBulletinModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowBulkBulletinModal(false)}
          title="Téléchargement des bulletins de la classe"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
              <div className="text-sm font-bold text-blue-900 dark:text-blue-100">
                Classe : <span className="font-black uppercase text-blue-600 dark:text-blue-400">{selectedClass}</span>
                {selectedRoom !== 'all' && <span className="ml-2 font-medium">(Salle {selectedRoom})</span>}
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Génération d'un fichier PDF unique contenant le bulletin complet de chacun des {filteredStudents.length} élève{filteredStudents.length > 1 ? 's' : ''} de cette sélection.
              </p>
            </div>

            <div>
              <Select
                label="Période scolaire"
                value={bulkBulletinPeriod}
                onChange={(e) => setBulkBulletinPeriod(e.target.value)}
                options={[
                  { value: '1', label: '1er Trimestre (ou Semestre 1)' },
                  { value: '2', label: '2ème Trimestre (ou Semestre 2)' },
                  { value: '3', label: '3ème Trimestre' }
                ]}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t dark:border-white/10">
              <Button variant="secondary" onClick={() => setShowBulkBulletinModal(false)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={() => handleBulkDownloadBulletins(bulkBulletinPeriod)}
                icon={<i className="fas fa-file-pdf mr-1"></i>}
              >
                Générer les {filteredStudents.length} bulletins
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Export Excel */}
      {showExportModal && (
        <Modal 
          isOpen={true} 
          onClose={() => setShowExportModal(false)} 
          title="Exporter les élèves en fichier Excel (.xlsx)"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Choisissez le périmètre des élèves que vous souhaitez exporter :
            </p>

            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 rounded-xl border dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
                <input 
                  type="radio" 
                  name="exportScope" 
                  checked={exportScope === 'all'} 
                  onChange={() => setExportScope('all')}
                  className="w-4 h-4 text-emerald-600"
                />
                <div>
                  <div className="font-bold text-sm text-gray-800 dark:text-white">Tous les élèves</div>
                  <div className="text-xs text-gray-400">Exporter la totalité des élèves enregistrés ({students.length})</div>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-xl border dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
                <input 
                  type="radio" 
                  name="exportScope" 
                  checked={exportScope === 'cycle'} 
                  onChange={() => setExportScope('cycle')}
                  className="w-4 h-4 text-emerald-600"
                />
                <div className="flex-1">
                  <div className="font-bold text-sm text-gray-800 dark:text-white">Par Cycle spécifique</div>
                  <div className="text-xs text-gray-400">Exporter les élèves d'un cycle précis</div>
                </div>
              </label>
              {exportScope === 'cycle' && (
                <div className="pl-6 pt-1">
                  <Select 
                    label="Choisir le cycle"
                    value={exportCycle}
                    onChange={e => setExportCycle(e.target.value)}
                    options={Object.values(cycles).map(c => ({ value: c.id, label: c.name }))}
                  />
                </div>
              )}

              <label className="flex items-center gap-2 p-3 rounded-xl border dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
                <input 
                  type="radio" 
                  name="exportScope" 
                  checked={exportScope === 'classe'} 
                  onChange={() => setExportScope('classe')}
                  className="w-4 h-4 text-emerald-600"
                />
                <div className="flex-1">
                  <div className="font-bold text-sm text-gray-800 dark:text-white">Par Classe en particulier</div>
                  <div className="text-xs text-gray-400">Exporter uniquement les élèves d'une classe</div>
                </div>
              </label>
              {exportScope === 'classe' && (
                <div className="pl-6 pt-1">
                  <Select 
                    label="Choisir la classe"
                    value={exportClass}
                    onChange={e => setExportClass(e.target.value)}
                    options={availableClasses.map(c => ({ value: c, label: c }))}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t dark:border-white/10">
              <Button variant="secondary" onClick={() => setShowExportModal(false)}>Annuler</Button>
              <Button 
                variant="primary" 
                onClick={handleExportExcel}
                className="!bg-emerald-600 hover:!bg-emerald-700"
                icon={<i className="fas fa-download mr-1"></i>}
              >
                Télécharger le fichier Excel
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
