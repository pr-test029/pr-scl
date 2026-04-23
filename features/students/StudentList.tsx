
import React, { useState, useMemo } from 'react';
import { Card, Button, Input, Modal, Select } from '../../components/ui/Common';
import { useSchool } from '../../App';
import { Student, Cycle } from '../../types';
import { StudentDetails } from './StudentDetails';
import { StudentForm } from './StudentForm';

export const StudentList: React.FC = () => {
  const { students, cycles, deleteStudent, session, settings } = useSchool();
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
      const matchesClass = selectedClass === 'all' || student.classe === selectedClass;
      return matchesSearch && matchesCycle && matchesClass;
    });
  }, [students, searchTerm, selectedCycle, selectedClass, session, staffRecord]);

  // Obtenir les classes uniques pour le filtre (selon le cycle sélectionné)
  const availableClasses = useMemo(() => {
      let baseClasses: string[] = [];
      
      if (selectedCycle === 'all') {
          baseClasses = Array.from(new Set(students.map(s => s.classe)));
      } else {
          baseClasses = cycles[selectedCycle]?.levels || [];
          // Si c'est un cycle à séries/spécialités, on doit reconstruire les noms complets
          const cycle = cycles[selectedCycle];
          if (cycle && cycle.type !== 'simple') {
              const suffixes = cycle.type === 'series' ? cycle.series : cycle.specialites;
              const expanded: string[] = [];
              cycle.levels.forEach(lvl => suffixes.forEach(s => expanded.push(`${lvl} ${s}`)));
              baseClasses = expanded;
          }
      }

      // Restriction Professeur
      if (session?.role === 'professeur' && staffRecord) {
          return baseClasses.filter(c => staffRecord.assignedClasses.includes(c)).sort();
      }

      return baseClasses.sort();
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
      <Card>
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
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-200">{student.classe}</div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          {cycles[student.cycle]?.name} 
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
                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{student.classe} • {cycles[student.cycle]?.name}</p>
                          </div>
                      </div>
                      <div className="flex gap-2">
                         <Button fullWidth variant="secondary" size="sm" onClick={() => setSelectedStudentId(student.id)} icon={<i className="fas fa-file-invoice"></i>}>Bulletin</Button>
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
    </div>
  );
};
