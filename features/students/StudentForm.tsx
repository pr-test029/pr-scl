import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, Input, Select, Button, Modal } from '../../components/ui/Common';
import { useSchool } from '../../App';
import { generateMatricule } from '../../services/firebase';
import { Student, Cycle, Payment } from '../../types';
import { QRCodeSVG } from 'qrcode.react';
import html2pdf from 'html2pdf.js';

interface StudentFormProps {
  onSuccess?: () => void;
  initialData?: Student; // Données pour l'édition
  onCancel?: () => void; // Pour annuler l'édition
}

export const StudentForm: React.FC<StudentFormProps> = ({ onSuccess, initialData, onCancel }) => {
  const { cycles, addStudent, updateStudent, selectedAcademicYear, settings, addPayment, session } = useSchool();
  
  // Initialisation de l'état
  const [formData, setFormData] = useState<Partial<Student>>({
    genre: 'Masculin',
    dateInscription: new Date().toLocaleDateString('fr-FR'),
    totalPaid: 0
  });
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [enrollmentType, setEnrollmentType] = useState<'inscription' | 'reinscription'>('inscription');
  const [pendingStudent, setPendingStudent] = useState<Student | null>(null);
  const receiptRef = React.useRef<HTMLDivElement>(null);

  // States pour l'importation de fichiers
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importReport, setImportReport] = useState<{ total: number; success: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effet pour charger les données initiales si on est en mode édition
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      if (initialData.photo) {
        setSelectedFile(initialData.photo);
      }
    }
  }, [initialData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSelectedFile(ev.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Reset dependent fields when cycle changes
  useEffect(() => {
    if (formData.cycle && (!initialData || formData.cycle !== initialData.cycle)) {
      const isInitialLoad = initialData && formData.cycle === initialData.cycle;
      if (!isInitialLoad) {
          setFormData(prev => ({ ...prev, classe: '', serie: '' }));
      }
    }
  }, [formData.cycle]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.prenom || !formData.classe || !formData.cycle) {
      alert("Veuillez remplir les champs obligatoires");
      return;
    }

    if (formData.cycle) {
      const currentCycle = cycles[formData.cycle];
      if (currentCycle && currentCycle.type !== 'simple') {
        const hasOptions = currentCycle.type === 'series' ? currentCycle.series.length > 0 : currentCycle.specialites.length > 0;
        if (hasOptions && !formData.serie) {
          alert(`Veuillez choisir une ${currentCycle.type === 'series' ? 'série' : 'spécialité'} pour cet élève.`);
          return;
        }
      }
    }

    const studentToSave: Student = {
      id: initialData ? initialData.id : Date.now().toString(),
      academic_year: initialData ? initialData.academic_year : selectedAcademicYear,
      nom: formData.nom,
      prenom: formData.prenom,
      dateNaissance: formData.dateNaissance || '',
      genre: formData.genre || 'Masculin',
      adresse: formData.adresse || '',
      ville: formData.ville || '',
      telephone: formData.telephone || '',
      email: formData.email,
      cycle: formData.cycle,
      classe: formData.classe,
      serie: formData.serie,
      salle: formData.salle,
      photo: selectedFile || undefined,
      notes_info: formData.notes_info,
      dateInscription: formData.dateInscription || new Date().toLocaleDateString('fr-FR'),
      totalPaid: formData.totalPaid || 0,
      matricule: initialData ? initialData.matricule : (formData.matricule || '')
    };

    // Si nouveau, on génère un matricule s'il n'existe pas
    if (!initialData && !studentToSave.matricule) {
      studentToSave.matricule = generateMatricule();
    }

    if (initialData) {
      updateStudent(studentToSave);
      alert("Informations de l'élève modifiées avec succès !");
      if (onSuccess) onSuccess();
    } else {
      setPendingStudent(studentToSave);
      setShowTypeModal(true); // Étape 1 : choisir inscription ou réinscription
    }
  };

  const handleSelectType = (type: 'inscription' | 'reinscription') => {
    setEnrollmentType(type);
    setShowTypeModal(false);
    setShowValidationModal(true);
  };

  const handlePrintReceipt = () => {
    if (!receiptRef.current || !pendingStudent) return;
    const element = receiptRef.current;
    html2pdf().from(element).set({
        margin: 10,
        filename: `recu_${enrollmentType}_${pendingStudent.matricule}.pdf`,
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save();
  };

  const handleFinish = () => {
    if (!pendingStudent) return;
    
    // 1. Sauvegarder l'élève
    addStudent(pendingStudent);
    
    // 2. Calculer le frais selon la classe et le type
    const className = pendingStudent.serie
      ? `${pendingStudent.classe} ${pendingStudent.serie}`
      : pendingStudent.classe;
    const classFees = enrollmentType === 'inscription'
      ? (settings.accounting?.classRegistrationFees || {})
      : (settings.accounting?.classReRegistrationFees || {});
    const regFee = classFees[className]
      ?? classFees[pendingStudent.classe]
      ?? (enrollmentType === 'inscription'
          ? (settings.accounting?.registrationFee || 0)
          : (settings.accounting?.reRegistrationFee || 0));

    if (regFee > 0) {
        const payment: Payment = {
            id: Date.now().toString(),
            studentId: pendingStudent.id,
            academic_year: selectedAcademicYear,
            amount: regFee,
            date: new Date().toISOString(),
            method: 'cash',
            type: enrollmentType === 'inscription' ? 'registration' : 're_registration',
            notes: enrollmentType === 'inscription' ? 'Frais d\'inscription' : 'Frais de réinscription',
            recorded_by: session?.user_id,
            recorded_by_name: session?.display_name || 'Inconnu'
        };
        addPayment(payment);
    }
    
    alert("Élève inscrit et frais enregistrés avec succès !");
    setShowValidationModal(false);
    setPendingStudent(null);
    setFormData({ genre: 'Masculin', dateInscription: new Date().toLocaleDateString('fr-FR'), totalPaid: 0 });
    setSelectedFile(null);
    if (onSuccess) onSuccess();
  };

  // Normalisation robuste des chaînes (enlève accents, espaces superflus, minuscules)
  const normalizeStr = (str: string): string => {
    return str
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\s\-_]+/g, "");
  };

  // Résolution intelligente du cycle pour éviter les doublons (ex: "college" = "Collège" = "COLLEGE")
  const resolveCycleId = (cycleInput: string): string => {
    if (!cycleInput) return Object.keys(cycles)[0] || '';
    const normInput = normalizeStr(cycleInput);

    // 1. Match direct par clé/ID
    for (const [id, cycle] of Object.entries(cycles)) {
      if (normalizeStr(id) === normInput || normalizeStr(cycle.name) === normInput) {
        return id;
      }
    }

    // 2. Match partiel (ex: "primaire" dans "Cycle Primaire")
    for (const [id, cycle] of Object.entries(cycles)) {
      const normName = normalizeStr(cycle.name);
      if (normName.includes(normInput) || normInput.includes(normName)) {
        return id;
      }
    }

    // 3. Fallback sur le premier cycle disponible
    return Object.keys(cycles)[0] || '';
  };

  // Résolution intelligente de la classe et série (ex: "cp1" => "CP1", "terminale c" => classe="Terminale", serie="C")
  const resolveClassAndSerie = (cycleId: string, classInput: string, serieInput?: string): { classe: string; serie?: string } => {
    const cycle = cycles[cycleId];
    if (!cycle) return { classe: classInput.trim(), serie: serieInput?.trim() };

    const normClassInput = normalizeStr(classInput);
    const normSerieInput = serieInput ? normalizeStr(serieInput) : '';

    // Chercher si la chaîne classe contient déjà la série (ex: "Terminale C", "Premiere A", "Seconde C")
    let matchedLevel: string | null = null;
    let matchedSerie: string | null = null;

    // 1. Tenter un match exact sur les niveaux du cycle (insensible à la casse/accents : "cp1" == "CP1", "6eme" == "6ème")
    for (const lvl of cycle.levels) {
      if (normalizeStr(lvl) === normClassInput) {
        matchedLevel = lvl;
        break;
      }
    }

    // 2. Si le cycle a des séries/spécialités, vérifier si la série est séparée ou collée
    const validSeries = cycle.type === 'series' ? cycle.series : cycle.specialites;

    if (!matchedLevel && validSeries && validSeries.length > 0) {
      for (const lvl of cycle.levels) {
        const normLvl = normalizeStr(lvl);
        if (normClassInput.startsWith(normLvl)) {
          matchedLevel = lvl;
          const remainder = normClassInput.slice(normLvl.length);
          for (const s of validSeries) {
            if (normalizeStr(s) === remainder) {
              matchedSerie = s;
              break;
            }
          }
          break;
        }
      }
    }

    // Si on a une entrée de série explicite
    if (!matchedSerie && normSerieInput && validSeries) {
      for (const s of validSeries) {
        if (normalizeStr(s) === normSerieInput) {
          matchedSerie = s;
          break;
        }
      }
    }

    // Si aucun niveau officiel n'a matché exactement, faire une comparaison souple
    if (!matchedLevel) {
      for (const lvl of cycle.levels) {
        const normLvl = normalizeStr(lvl);
        if (normClassInput.includes(normLvl) || normLvl.includes(normClassInput)) {
          matchedLevel = lvl;
          break;
        }
      }
    }

    return {
      classe: matchedLevel || classInput.trim().toUpperCase(),
      serie: matchedSerie || (serieInput ? serieInput.trim() : undefined)
    };
  };

  // Modèle Excel à télécharger
  const handleDownloadTemplate = () => {
    const firstCycle = Object.values(cycles)[0];
    const sampleCycleName = firstCycle ? firstCycle.name : "Collège";
    const sampleClass = firstCycle ? (firstCycle.levels[0] || "6ème") : "6ème";

    const templateRows = [
      {
        "Nom": "MOUKOKO",
        "Prénom": "Grace",
        "Date de Naissance": "2010-05-14",
        "Genre": "Féminin",
        "Cycle": sampleCycleName,
        "Classe": sampleClass,
        "Série / Spécialité": "",
        "Adresse": "Plateau des 15 ans",
        "Ville": "Brazzaville",
        "Téléphone": "+242 06 123 45 67",
        "Email": "grace.moukoko@example.com",
        "Nom Tuteur": "Moukoko Jean",
        "Relation Tuteur": "Père",
        "Téléphone Tuteur": "+242 05 555 44 33",
        "Email Tuteur": "jean.moukoko@example.com",
        "Remarques / Notes": "RAS",
        "Statut Spécial": "NON"
      },
      {
        "Nom": "NGOMA",
        "Prénom": "Christian",
        "Date de Naissance": "2009-11-20",
        "Genre": "Masculin",
        "Cycle": sampleCycleName,
        "Classe": sampleClass,
        "Série / Spécialité": "",
        "Adresse": "Moungali",
        "Ville": "Brazzaville",
        "Téléphone": "+242 06 987 65 43",
        "Email": "",
        "Nom Tuteur": "Ngoma Marie",
        "Relation Tuteur": "Mère",
        "Téléphone Tuteur": "+242 04 444 33 22",
        "Email Tuteur": "",
        "Remarques / Notes": "Boursier d'excellence",
        "Statut Spécial": "OUI"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Modèle_Import");
    XLSX.writeFile(workbook, "Modele_Import_Eleves.xlsx");
  };

  // Traitement de l'import de fichier
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportReport(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          alert("Le fichier est vide ou mal formaté.");
          setIsImporting(false);
          return;
        }

        let successCount = 0;
        const errors: string[] = [];
        const registrationDateStr = new Date().toLocaleDateString('fr-FR');
        const nowIso = new Date().toISOString();

        for (let i = 0; i < rawJson.length; i++) {
          const row = rawJson[i];
          const lineNum = i + 2;

          const nom = (row["Nom"] || row["nom"] || '').toString().trim();
          const prenom = (row["Prénom"] || row["Prenom"] || row["prenom"] || '').toString().trim();
          const rawClass = (row["Classe"] || row["classe"] || '').toString().trim();

          if (!nom || !prenom) {
            errors.push(`Ligne ${lineNum} : Le nom et le prénom sont obligatoires.`);
            continue;
          }

          if (!rawClass) {
            errors.push(`Ligne ${lineNum} (${nom} ${prenom}) : La classe est obligatoire.`);
            continue;
          }

          const rawCycle = (row["Cycle"] || row["cycle"] || '').toString().trim();
          const cycleId = resolveCycleId(rawCycle);

          const rawSerie = (row["Série / Spécialité"] || row["Série"] || row["Serie"] || row["Spécialité"] || row["Specialite"] || row["serie"] || '').toString().trim();
          // Résolution renforcée pour faire correspondre exactement aux classes et séries de l'application (ex: cp1 -> CP1)
          const { classe, serie } = resolveClassAndSerie(cycleId, rawClass, rawSerie);

          let dateNaissance = (row["Date de Naissance"] || row["dateNaissance"] || row["DateNaissance"] || '').toString().trim();
          if (dateNaissance instanceof Date) {
            dateNaissance = (dateNaissance as Date).toISOString().split('T')[0];
          }

          const rawGenre = (row["Genre"] || row["genre"] || 'Masculin').toString().trim().toLowerCase();
          const genre = (rawGenre.startsWith('f') || rawGenre === 'feminin' || rawGenre === 'féminin') ? 'Féminin' : 'Masculin';

          const adresse = (row["Adresse"] || row["adresse"] || '').toString().trim();
          const ville = (row["Ville"] || row["ville"] || '').toString().trim();
          const telephone = (row["Téléphone"] || row["Telephone"] || row["telephone"] || '').toString().trim();
          const email = (row["Email"] || row["email"] || '').toString().trim();

          const tuteurNom = (row["Nom Tuteur"] || row["TuteurNom"] || row["tuteurNom"] || '').toString().trim();
          const tuteurRelation = (row["Relation Tuteur"] || row["TuteurRelation"] || row["tuteurRelation"] || '').toString().trim();
          const tuteurTelephone = (row["Téléphone Tuteur"] || row["TuteurTelephone"] || row["tuteurTelephone"] || '').toString().trim();
          const tuteurEmail = (row["Email Tuteur"] || row["TuteurEmail"] || row["tuteurEmail"] || '').toString().trim();
          const notes_info = (row["Remarques / Notes"] || row["Notes"] || row["notes_info"] || '').toString().trim();

          const rawSpecial = (row["Statut Spécial"] || row["Special"] || row["isSpecial"] || '').toString().trim().toLowerCase();
          const isSpecial = (rawSpecial === 'oui' || rawSpecial === 'true' || rawSpecial === '1' || rawSpecial === 'yes');

          const newStudentId = (Date.now() + i).toString();
          const matricule = generateMatricule();

          const newStudent: Student = {
            id: newStudentId,
            academic_year: selectedAcademicYear,
            matricule,
            nom,
            prenom,
            dateNaissance,
            genre,
            adresse,
            ville,
            telephone,
            email: email || undefined,
            cycle: cycleId,
            classe,
            serie: serie || undefined,
            tuteurNom: tuteurNom || undefined,
            tuteurRelation: tuteurRelation || undefined,
            tuteurTelephone: tuteurTelephone || undefined,
            tuteurEmail: tuteurEmail || undefined,
            notes_info: notes_info || undefined,
            dateInscription: registrationDateStr,
            totalPaid: 0,
            isSpecial
          };

          // 1. Sauvegarde de l'élève
          await addStudent(newStudent);

          // 2. Calcul et imputation automatique des frais d'inscription
          const fullClassName = serie ? `${classe} ${serie}` : classe;
          const classFees = settings.accounting?.classRegistrationFees || {};
          const regFee = classFees[fullClassName]
            ?? classFees[classe]
            ?? (settings.accounting?.registrationFee || 0);

          if (regFee > 0) {
            const payment: Payment = {
              id: (Date.now() + i + 5000).toString(),
              studentId: newStudentId,
              academic_year: selectedAcademicYear,
              amount: regFee,
              date: nowIso,
              method: 'cash',
              type: 'registration',
              notes: "Frais d'inscription (Importation)",
              recorded_by: session?.user_id,
              recorded_by_name: session?.display_name || 'Import Automatique'
            };
            addPayment(payment);
          }

          successCount++;
        }

        setImportReport({
          total: rawJson.length,
          success: successCount,
          errors
        });
      } catch (err: any) {
        console.error("Import error:", err);
        alert("Erreur lors de la lecture du fichier : " + err.message);
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  const activeCycle = formData.cycle ? cycles[formData.cycle] : null;
  const isEditing = !!initialData;

  return (
    <>
      <Card 
        title={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <span>{isEditing ? "Modifier les informations" : "Inscription d'un élève"}</span>
            {!isEditing && session?.role !== 'professeur' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setImportReport(null);
                  setShowImportModal(true);
                }}
                className="rounded-xl border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs shadow-sm"
                icon={<i className="fas fa-file-import text-emerald-600"></i>}
              >
                Importer des élèves (Excel / CSV)
              </Button>
            )}
          </div>
        } 
        helpKey="inscription" 
        className="animate-fade-in"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input name="nom" label="Nom *" value={formData.nom || ''} onChange={handleChange} required />
            <Input name="prenom" label="Prénom *" value={formData.prenom || ''} onChange={handleChange} required />
            {formData.matricule && <Input name="matricule" label="Matricule" value={formData.matricule} disabled />}
            <Input type="date" name="dateNaissance" label="Date de naissance *" value={formData.dateNaissance || ''} onChange={handleChange} required />
            <Select 
              name="genre" 
              label="Genre *" 
              options={[{ value: 'Masculin', label: 'Masculin' }, { value: 'Féminin', label: 'Féminin' }]} 
              value={formData.genre} 
              onChange={handleChange} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input name="adresse" label="Adresse" value={formData.adresse || ''} onChange={handleChange} />
            <Input name="ville" label="Ville" value={formData.ville || ''} onChange={handleChange} />
            <Input type="tel" name="telephone" label="Téléphone" value={formData.telephone || ''} onChange={handleChange} />
            <Input type="email" name="email" label="Email" value={formData.email || ''} onChange={handleChange} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Select 
              name="cycle" 
              label="Cycle *" 
              options={[
                { value: '', label: 'Sélectionnez...' },
                ...Object.values(cycles).map((c: Cycle) => ({ value: c.id, label: c.name }))
              ]}
              value={formData.cycle || ''}
              onChange={handleChange}
              required
            />
            
            <Select 
              name="classe" 
              label="Classe/Niveau *" 
              options={[
                { value: '', label: 'Sélectionnez...' },
                ...(activeCycle ? activeCycle.levels.map(c => ({ value: c, label: c })) : [])
              ]}
              value={formData.classe || ''}
              onChange={handleChange}
              disabled={!activeCycle}
              required
            />

            {(activeCycle?.type === 'series' || activeCycle?.type === 'specialites') && (
              <Select 
                name="serie" 
                label={activeCycle.type === 'series' ? "Série *" : "Spécialité *"} 
                options={[
                  { value: '', label: 'Sélectionnez...' },
                  ...(activeCycle.type === 'series' ? activeCycle.series : activeCycle.specialites).map(s => ({ value: s, label: s }))
                ]}
                value={formData.serie || ''}
                onChange={handleChange}
                required={(activeCycle.type === 'series' ? activeCycle.series.length > 0 : activeCycle.specialites.length > 0)}
              />
            )}

            {/* Salle de classe */}
            {activeCycle && (
              <Select 
                name="salle" 
                label="Salle de classe" 
                options={[
                  { value: '', label: 'Aucune salle attribuée (ou par défaut)' },
                  ...(() => {
                    if (!activeCycle.classrooms || activeCycle.classrooms.length === 0) return [];
                    const fullClass = formData.serie ? `${formData.classe} ${formData.serie}` : (formData.classe || '');
                    // Salles liées à cette classe spécifique ou ouvertes à tout le cycle si aucune classe spécifiée
                    const matchingRooms = activeCycle.classrooms.filter(room => {
                      if (!room.assignedClasses || room.assignedClasses.length === 0) return true;
                      return room.assignedClasses.includes(fullClass) || (formData.classe && room.assignedClasses.includes(formData.classe));
                    });
                    const roomsToDisplay = matchingRooms.length > 0 ? matchingRooms : activeCycle.classrooms;
                    return roomsToDisplay.map(r => ({ value: r.name, label: r.name }));
                  })()
                ]}
                value={formData.salle || ''}
                onChange={handleChange}
                disabled={!formData.classe}
              />
            )}
          </div>

          {/* Section Informations Parentales / Tuteur */}
          <div className="pt-4 border-t border-gray-200 dark:border-white/10">
            <h4 className="text-sm font-black uppercase text-gray-400 tracking-wider mb-4 flex items-center gap-2">
              <i className="fas fa-user-shield text-blue-600"></i> Informations Parentales / Tuteur
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                name="tuteurNom" 
                label="Nom et Prénom du Tuteur" 
                placeholder="Ex: Jean Dupont" 
                value={formData.tuteurNom || ''} 
                onChange={handleChange} 
              />
              <Select 
                name="tuteurRelation" 
                label="Relation avec l'élève" 
                options={[
                  { value: '', label: 'Sélectionnez la relation...' },
                  { value: 'Père', label: 'Père' },
                  { value: 'Mère', label: 'Mère' },
                  { value: 'Tuteur légal', label: 'Tuteur légal' },
                  { value: 'Grand-parent', label: 'Grand-parent' },
                  { value: 'Oncle / Tante', label: 'Oncle / Tante' },
                  { value: 'Frère / Sœur', label: 'Frère / Sœur' },
                  { value: 'Autre', label: 'Autre' }
                ]} 
                value={formData.tuteurRelation || ''} 
                onChange={handleChange} 
              />
              <Input 
                type="tel" 
                name="tuteurTelephone" 
                label="Numéro de téléphone du tuteur" 
                placeholder="Ex: +242 06 123 45 67" 
                value={formData.tuteurTelephone || ''} 
                onChange={handleChange} 
              />
              <Input 
                type="email" 
                name="tuteurEmail" 
                label="Email du tuteur" 
                placeholder="tuteur@exemple.com" 
                value={formData.tuteurEmail || ''} 
                onChange={handleChange} 
              />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700/50 transition-colors">
            {selectedFile ? (
              <div className="text-center">
                <img src={selectedFile} alt="Preview" className="w-32 h-32 object-cover rounded-full mx-auto mb-4 border-4 border-white dark:border-gray-600 shadow-md" />
                <Button type="button" variant="secondary" size="sm" onClick={() => setSelectedFile(null)}>Supprimer la photo</Button>
              </div>
            ) : (
              <div className="text-center">
                 <i className="fas fa-camera text-4xl text-gray-400 mb-2"></i>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Ajouter une photo</p>
                 <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-[var(--primary-color)] hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-white dark:text-gray-400"/>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 gap-3">
             {isEditing && <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>}
             <Button type="submit" variant="primary" icon={<i className="fas fa-save"></i>}>
               {isEditing ? "Enregistrer les modifications" : "Enregistrer l'élève"}
             </Button>
          </div>
        </form>
      </Card>

      {/* --- Modal choix : Inscription ou Réinscription --- */}
      {showTypeModal && pendingStudent && (
        <Modal isOpen={true} onClose={() => setShowTypeModal(false)} title="Type d'enregistrement" maxWidth="max-w-md">
          <div className="p-6 space-y-4">
            <p className="text-gray-600 dark:text-gray-300 text-center">
              S'agit-il d'une <strong>nouvelle inscription</strong> ou d'une <strong>réinscription</strong> ?
            </p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <button
                onClick={() => handleSelectType('inscription')}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:border-purple-400 transition-all group"
              >
                <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="fas fa-user-plus text-2xl text-purple-600 dark:text-purple-300"></i>
                </div>
                <span className="font-bold text-purple-800 dark:text-purple-200 text-sm text-center">Nouvelle<br/>Inscription</span>
              </button>
              <button
                onClick={() => handleSelectType('reinscription')}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 hover:border-green-400 transition-all group"
              >
                <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="fas fa-redo text-2xl text-green-600 dark:text-green-300"></i>
                </div>
                <span className="font-bold text-green-800 dark:text-green-200 text-sm text-center">Réinscription</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* --- Modal validation + reçu --- */}
      {showValidationModal && pendingStudent && (() => {
          const cn = pendingStudent.serie
            ? `${pendingStudent.classe} ${pendingStudent.serie}`
            : pendingStudent.classe;
          const feeMap = enrollmentType === 'inscription'
            ? (settings.accounting?.classRegistrationFees || {})
            : (settings.accounting?.classReRegistrationFees || {});
          const fee = feeMap[cn]
            ?? feeMap[pendingStudent.classe]
            ?? (enrollmentType === 'inscription'
                ? (settings.accounting?.registrationFee || 0)
                : (settings.accounting?.reRegistrationFee || 0));
          const feeLabel = enrollmentType === 'inscription' ? "Frais d'inscription" : "Frais de réinscription";
          return (
            <Modal isOpen={true} onClose={() => setShowValidationModal(false)} title="Validation de l'inscription" maxWidth="max-w-2xl">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {/* Receipt Content */}
                    <div ref={receiptRef} className="p-8 bg-white text-black border border-gray-200 rounded-lg shadow-sm" style={{ width: '100%', minHeight: '400px' }}>
                        <div className="flex justify-between items-start mb-8 border-b pb-4">
                            <div className="flex items-center gap-4">
                                {settings.logo && <img src={settings.logo} alt="Logo" className="w-16 h-16 object-contain rounded" />}
                                <div>
                                    <h2 className="text-xl font-bold uppercase text-[var(--primary-color)]">{settings.appName || 'École'}</h2>
                                    <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider">
                                      {enrollmentType === 'inscription' ? "Reçu d'inscription" : "Reçu de réinscription"}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold">Reçu N° {Date.now().toString().slice(-6)}</p>
                                <p className="text-xs text-gray-500">Date: {new Date().toLocaleDateString('fr-FR')}</p>
                                <p className="text-xs text-gray-500">Heure: {new Date().toLocaleTimeString('fr-FR')}</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-lg font-bold border-b border-gray-100 pb-2 mb-3 text-gray-800">Informations de l'Élève</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <p><strong className="text-gray-600">Nom &amp; Prénom:</strong> <br/>{pendingStudent.nom} {pendingStudent.prenom}</p>
                                <p><strong className="text-gray-600">Matricule:</strong> <br/>{pendingStudent.matricule}</p>
                                <p><strong className="text-gray-600">Classe:</strong> <br/>{pendingStudent.classe} {pendingStudent.serie ? `(Série/Spé: ${pendingStudent.serie})` : ''}</p>
                                <p><strong className="text-gray-600">Année Scolaire:</strong> <br/>{selectedAcademicYear}</p>
                                {pendingStudent.tuteurNom && (
                                  <p className="col-span-2"><strong className="text-gray-600">Tuteur ({pendingStudent.tuteurRelation || 'Parent'}):</strong> <br/>{pendingStudent.tuteurNom} {pendingStudent.tuteurTelephone ? `— Tél: ${pendingStudent.tuteurTelephone}` : ''}</p>
                                )}
                            </div>
                        </div>

                        <div className="mb-8">
                            <h3 className="text-lg font-bold border-b border-gray-100 pb-2 mb-3 text-gray-800">Détail du Paiement</h3>
                            <div className="flex justify-between items-center py-3 bg-gray-50 px-4 rounded-lg">
                                <span className="font-semibold text-gray-700">{feeLabel}</span>
                                <span className="font-bold text-xl text-green-700">{fee} FCFA</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
                                <i className="fas fa-money-bill-wave text-green-600"></i> 
                                <strong>Mode de paiement:</strong> Espèces
                            </p>
                        </div>

                        <div className="mt-12 pt-6 border-t flex justify-between items-end">
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Enregistré par</p>
                                <p className="font-bold text-gray-800">{session?.display_name || 'Gestionnaire'}</p>
                            </div>
                            <div className="p-2 border rounded-lg shadow-sm">
                                <QRCodeSVG 
                                    value={`Reçu N°${Date.now().toString().slice(-6)}\nÉlève: ${pendingStudent.nom} ${pendingStudent.prenom}\nMatricule: ${pendingStudent.matricule}\n${feeLabel}: ${fee} FCFA\nDate: ${new Date().toLocaleString('fr-FR')}`}
                                    size={72}
                                    level="M"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-4">
                        <Button variant="secondary" onClick={handlePrintReceipt} icon={<i className="fas fa-print"></i>}>Imprimer le reçu</Button>
                        <Button variant="primary" onClick={handleFinish} icon={<i className="fas fa-check"></i>}>Terminer</Button>
                    </div>
                </div>
            </Modal>
          );
      })()}

      {/* Modal Import Excel / CSV */}
      {showImportModal && (
        <Modal 
          isOpen={true} 
          onClose={() => {
            if (!isImporting) {
              setShowImportModal(false);
              setImportReport(null);
            }
          }} 
          title="Importer de nouveaux élèves (Excel ou CSV)"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-sm text-emerald-900 dark:text-emerald-200 space-y-2">
              <div className="font-bold flex items-center gap-2">
                <i className="fas fa-check-circle text-emerald-600"></i> Conformité & Rapprochement Automatique :
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs opacity-90">
                <li>Le fichier intègre l'ensemble des rubriques de la page d'inscription (Nom, Prénom, Classe, Cycle, Date de naissance, Contacts, Tuteur, etc.).</li>
                <li><strong>Reconnaissance renforcée sans doublon :</strong> Les classes et cycles sont automatiquement normalisés (ex: <code>cp1</code> = <code>CP1</code>, <code>6eme</code> = <code>6ème</code>, <code>terminale c</code> = Terminale série C).</li>
                <li>Un <strong>matricule officiel unique</strong> est automatiquement généré pour chaque élève.</li>
                <li>Les <strong>frais d'inscription de sa classe</strong> sont automatiquement enregistrés en comptabilité.</li>
              </ul>
            </div>

            {/* Télécharger modèle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border dark:border-white/10">
              <div>
                <div className="font-bold text-sm text-gray-800 dark:text-white">Modèle type pré-rempli</div>
                <div className="text-xs text-gray-400">Téléchargez ce modèle avec les colonnes exactes.</div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadTemplate}
                icon={<i className="fas fa-file-excel text-emerald-600"></i>}
              >
                Télécharger le Modèle
              </Button>
            </div>

            {/* Input fichier */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500 rounded-2xl p-8 text-center bg-gray-50/50 dark:bg-white/2 transition-all">
              <i className="fas fa-cloud-upload-alt text-4xl text-emerald-600 mb-3 block"></i>
              <p className="font-bold text-gray-800 dark:text-white mb-1">Sélectionnez votre fichier Excel (.xlsx, .xls) ou .csv</p>
              <p className="text-xs text-gray-400 mb-4">Glissez-déposez ou parcourez vos documents</p>
              
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileImport}
                disabled={isImporting}
                className="hidden" 
                id="excel-student-import-form"
              />
              <label htmlFor="excel-student-import-form">
                <span className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm shadow-md hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2">
                  {isImporting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Traitement en cours...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-folder-open"></i> Parcourir mes fichiers
                    </>
                  )}
                </span>
              </label>
            </div>

            {/* Rapport d'importation */}
            {importReport && (
              <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-800 dark:text-white">Résultat de l'importation :</span>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold text-xs rounded-full">
                    {importReport.success} / {importReport.total} élève(s) importé(s) avec succès
                  </span>
                </div>

                {importReport.errors.length > 0 && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-xs text-red-700 dark:text-red-300 space-y-1 max-h-36 overflow-y-auto">
                    <div className="font-bold">Avertissements / Erreurs :</div>
                    {importReport.errors.map((err, idx) => (
                      <div key={idx}>• {err}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t dark:border-white/10">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowImportModal(false);
                  setImportReport(null);
                }}
                disabled={isImporting}
              >
                Fermer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
