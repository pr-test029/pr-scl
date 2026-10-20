
import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, Button, Input, Modal, Select } from '../../components/ui/Common';
import { useSchool } from '../../App';
import { Student, Cycle, Payment } from '../../types';
import { generateMatricule } from '../../services/firebase';
import { StudentDetails } from './StudentDetails';
import { StudentForm } from './StudentForm';
import { StudentBadgeModal } from './StudentBadgeModal';

export const StudentList: React.FC = () => {
  const { students, cycles, deleteStudent, session, settings, addStudent, addPayment, selectedAcademicYear } = useSchool();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCycle, setSelectedCycle] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  
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
      return matchesSearch && matchesCycle && matchesClass;
    });
  }, [students, searchTerm, selectedCycle, selectedClass, session, staffRecord]);

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
             <div className="w-full sm:w-48">
                <Select 
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    options={[
                        { value: 'all', label: 'Toutes les Classes' },
                        ...availableClasses.map(c => ({ value: c, label: c }))
                    ]}
                />
             </div>
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
