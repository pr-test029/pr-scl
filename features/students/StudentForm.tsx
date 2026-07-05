import React, { useState, useEffect } from 'react';
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
  const [pendingStudent, setPendingStudent] = useState<Student | null>(null);
  const receiptRef = React.useRef<HTMLDivElement>(null);

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
      setShowValidationModal(true);
    }
  };

  const handlePrintReceipt = () => {
    if (!receiptRef.current || !pendingStudent) return;
    const element = receiptRef.current;
    html2pdf().from(element).set({
        margin: 10,
        filename: `recu_inscription_${pendingStudent.matricule}.pdf`,
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save();
  };

  const handleFinish = () => {
    if (!pendingStudent) return;
    
    // 1. Sauvegarder l'élève
    addStudent(pendingStudent);
    
    // 2. Sauvegarder le paiement d'inscription
    const regFee = settings.accounting?.registrationFee || 0;
    if (regFee > 0) {
        const payment: Payment = {
            id: Date.now().toString(),
            studentId: pendingStudent.id,
            academic_year: selectedAcademicYear,
            amount: regFee,
            date: new Date().toISOString(),
            method: 'cash',
            notes: 'Frais d\'inscription',
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

  const activeCycle = formData.cycle ? cycles[formData.cycle] : null;
  const isEditing = !!initialData;

  return (
    <>
      <Card title={isEditing ? "Modifier les informations" : "Inscription d'un élève"} className="animate-fade-in">
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

      {showValidationModal && pendingStudent && (
          <Modal isOpen={true} onClose={() => setShowValidationModal(false)} title="Validation de l'inscription" maxWidth="max-w-2xl">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {/* Receipt Content */}
                  <div ref={receiptRef} className="p-8 bg-white text-black border border-gray-200 rounded-lg shadow-sm" style={{ width: '100%', minHeight: '400px' }}>
                      <div className="flex justify-between items-start mb-8 border-b pb-4">
                          <div className="flex items-center gap-4">
                              {settings.logo && <img src={settings.logo} alt="Logo" className="w-16 h-16 object-contain rounded" />}
                              <div>
                                  <h2 className="text-xl font-bold uppercase text-[var(--primary-color)]">{settings.appName || 'École'}</h2>
                                  <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider">Reçu d'inscription</p>
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
                              <p><strong className="text-gray-600">Nom & Prénom:</strong> <br/>{pendingStudent.nom} {pendingStudent.prenom}</p>
                              <p><strong className="text-gray-600">Matricule:</strong> <br/>{pendingStudent.matricule}</p>
                              <p><strong className="text-gray-600">Classe:</strong> <br/>{pendingStudent.classe} {pendingStudent.serie ? `(Série/Spé: ${pendingStudent.serie})` : ''}</p>
                              <p><strong className="text-gray-600">Année Scolaire:</strong> <br/>{selectedAcademicYear}</p>
                          </div>
                      </div>

                      <div className="mb-8">
                          <h3 className="text-lg font-bold border-b border-gray-100 pb-2 mb-3 text-gray-800">Détail du Paiement</h3>
                          <div className="flex justify-between items-center py-3 bg-gray-50 px-4 rounded-lg">
                              <span className="font-semibold text-gray-700">Frais d'inscription</span>
                              <span className="font-bold text-xl text-green-700">{settings.accounting?.registrationFee || 0} FCFA</span>
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
                                  value={`Reçu N°${Date.now().toString().slice(-6)}\nÉlève: ${pendingStudent.nom} ${pendingStudent.prenom}\nMatricule: ${pendingStudent.matricule}\nFrais: ${settings.accounting?.registrationFee || 0} FCFA\nDate: ${new Date().toLocaleString('fr-FR')}`}
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
      )}
    </>
  );
};
