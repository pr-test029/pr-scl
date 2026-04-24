import React, { useState, useMemo, useEffect } from 'react';
import { Card, Input, Button, Select, Modal } from '../../components/ui/Common';
import { useSchool } from '../../App';
import { AppSettings, Cycle, Subject, Classroom, AppreciationRule, StaffMember } from '../../types';


export const Settings: React.FC = () => {
  const { settings, updateSettings, cycles, updateCycles, subjects, updateSubjects, resetData, session, logout } = useSchool();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);
  
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'structure' | 'accounting' | 'personnel'>('general');
  const [modalTab, setModalTab] = useState<'general' | 'structure' | 'subjects'>('general');
  const [newCycleName, setNewCycleName] = useState('');
  const [newRoleName, setNewRoleName] = useState('');

  const [newAppreciation, setNewAppreciation] = useState<AppreciationRule>({ min: 0, max: 0, text: '' });

  const handleSaveSettings = () => {
    updateSettings(localSettings);
    alert('Paramètres enregistrés !');
  };

  const handleAddRole = () => {
    if (!newRoleName) return;
    const currentRoles = localSettings.staffRoles || ['professeur', 'gestionnaire'];
    if (currentRoles.includes(newRoleName)) {
        alert("Ce rôle existe déjà");
        return;
    }
    setLocalSettings({
        ...localSettings,
        staffRoles: [...currentRoles, newRoleName]
    });
    setNewRoleName('');
  };

  const removeRole = (role: string) => {
    if (['professeur', 'gestionnaire'].includes(role.toLowerCase())) {
        alert("Les rôles de base ne peuvent pas être supprimés.");
        return;
    }
    if (confirm(`Supprimer le rôle "${role}" ?`)) {
        setLocalSettings({
            ...localSettings,
            staffRoles: (localSettings.staffRoles || []).filter(r => r !== role)
        });
    }
  };

  const handleAddCycle = () => {
    if (!newCycleName) return;
    const id = newCycleName.toLowerCase().replace(/\s+/g, '_');
    if (cycles[id]) {
        alert("Ce cycle existe déjà");
        return;
    }
    const newCycle: Cycle = {
        id,
        name: newCycleName,
        type: 'simple',
        levels: [],
        series: [],
        specialites: [],
        classrooms: []
    };
    updateCycles({ ...cycles, [id]: newCycle });
    setNewCycleName('');
    setEditingCycleId(id);
  };

  const deleteCycle = (id: string) => {
      if(confirm("Supprimer ce cycle ? Cela effacera toutes les configurations associées.")){
          const newCycles = {...cycles};
          delete newCycles[id];
          updateCycles(newCycles);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <Card title="Compte École">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                  <p className="font-bold text-lg dark:text-white drop-shadow-sm">{session?.school_name}</p>
                  <div className="text-sm text-gray-500 dark:text-gray-300 mt-1 space-y-1">
                      <p>Email: {session?.email}</p>
                      <p className="font-mono text-xs opacity-70">ID: {session?.school_id}</p>
                  </div>
              </div>
              <Button variant="secondary" onClick={logout} icon={<i className="fas fa-sign-out-alt"></i>}>Se Déconnecter</Button>
          </div>
      </Card>
      
      <Card>
          <div className="flex border-b dark:border-white/10 mb-6 overflow-x-auto">
              <button onClick={() => setActiveTab('general')} className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'general' ? 'border-b-2 border-[var(--primary-color)] text-[var(--primary-color)] dark:text-white dark:border-white dark:drop-shadow-[0_0_5px_white]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Général</button>
              <button onClick={() => setActiveTab('structure')} className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'structure' ? 'border-b-2 border-[var(--primary-color)] text-[var(--primary-color)] dark:text-white dark:border-white dark:drop-shadow-[0_0_5px_white]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Cycles & Matières</button>
              <button onClick={() => setActiveTab('accounting')} className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'accounting' ? 'border-b-2 border-[var(--primary-color)] text-[var(--primary-color)] dark:text-white dark:border-white dark:drop-shadow-[0_0_5px_white]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Comptabilité</button>
              <button onClick={() => setActiveTab('personnel')} className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'personnel' ? 'border-b-2 border-[var(--primary-color)] text-[var(--primary-color)] dark:text-white dark:border-white dark:drop-shadow-[0_0_5px_white]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Personnel</button>
          </div>

          <div className="min-h-[400px]">
              {activeTab === 'general' && (
                  <div className="space-y-8 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Input label="Nom de l'établissement" value={localSettings.appName} onChange={e => setLocalSettings({...localSettings, appName: e.target.value})} />
                          <Select 
                              label="Thème visuel"
                              options={[
                                  {value: 'blue', label: 'Bleu Royal'}, 
                                  {value: 'indigo', label: 'Indigo Moderne'},
                                  {value: 'green', label: 'Vert Nature'}, 
                                  {value: 'emerald', label: 'Émeraude'},
                                  {value: 'purple', label: 'Violet'}, 
                                  {value: 'amber', label: 'Ambre'},
                                  {value: 'red', label: 'Rouge Classique'},
                                  {value: 'crimson', label: 'Crimson'},
                                  {value: 'slate', label: 'Ardoise (Slate)'}
                              ]}
                              value={localSettings.theme}
                              onChange={e => setLocalSettings({...localSettings, theme: e.target.value as any})}
                          />
                      </div>
                      
                      <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border dark:border-white/10">
                           <h4 className="font-bold mb-3 dark:text-white">Mode d'affichage</h4>
                           <div className="flex gap-6">
                               <label className="flex items-center gap-2 cursor-pointer dark:text-gray-300"><input type="radio" checked={localSettings.mode === 'light'} onChange={() => setLocalSettings({...localSettings, mode: 'light'})} /> Clair</label>
                               <label className="flex items-center gap-2 cursor-pointer dark:text-gray-300"><input type="radio" checked={localSettings.mode === 'dark'} onChange={() => setLocalSettings({...localSettings, mode: 'dark'})} /> Sombre</label>
                           </div>
                      </div>

                      <div className="bg-blue-50/50 dark:bg-white/5 p-6 rounded-2xl border dark:border-white/10 space-y-4">
                          <h4 className="font-bold text-blue-700 dark:text-blue-300">Entête du Bulletin (Convention Nationale)</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Input label="République" value={localSettings.bulletin.republicName || ''} onChange={e => setLocalSettings({...localSettings, bulletin: {...localSettings.bulletin, republicName: e.target.value}})} />
                              <Input label="Devise" value={localSettings.bulletin.republicMotto || ''} onChange={e => setLocalSettings({...localSettings, bulletin: {...localSettings.bulletin, republicMotto: e.target.value}})} />
                          </div>
                          <Input label="Ministère" value={localSettings.bulletin.ministryName || ''} onChange={e => setLocalSettings({...localSettings, bulletin: {...localSettings.bulletin, ministryName: e.target.value}})} />
                          <Input label="Direction Départementale" value={localSettings.bulletin.departmentalDirection || ''} onChange={e => setLocalSettings({...localSettings, bulletin: {...localSettings.bulletin, departmentalDirection: e.target.value}})} />
                          <Input label="Inspection" value={localSettings.bulletin.inspectionName || ''} onChange={e => setLocalSettings({...localSettings, bulletin: {...localSettings.bulletin, inspectionName: e.target.value}})} />
                      </div>

                      <div className="bg-amber-50/50 dark:bg-white/5 p-6 rounded-2xl border border-amber-100 dark:border-white/10 space-y-4">
                          <h4 className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                              <i className="fas fa-key"></i> Accès Dirigeant
                          </h4>
                          <p className="text-sm text-amber-600 dark:text-amber-400">
                              Si défini, ce mot de passe sera demandé pour accéder au rôle Dirigeant. Laissez vide pour un accès direct.
                              Le mot de passe doit contenir des chiffres et des lettres en MAJUSCULE.
                          </p>
                          <Input 
                            label="Mot de passe Dirigeant (PIN)" 
                            placeholder="Ex: SCL2024" 
                            value={localSettings.managerPassword || ''} 
                            onChange={e => setLocalSettings({...localSettings, managerPassword: e.target.value.toUpperCase().replace(/\s/g, '')})} 
                          />
                      </div>

                      <div className="flex justify-end">
                          <Button onClick={handleSaveSettings}>Enregistrer les modifications</Button>
                      </div>
                  </div>
              )}

              {activeTab === 'structure' && (
                  <div className="space-y-6 animate-fade-in">
                      <div className="flex justify-between items-center">
                          <h3 className="font-bold dark:text-white">Gestion des Cycles</h3>
                          <div className="flex gap-2">
                              <Input placeholder="Nom..." value={newCycleName} onChange={e => setNewCycleName(e.target.value)} />
                              <Button onClick={handleAddCycle}>Créer</Button>
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Object.values(cycles).map(cycle => (
                              <div key={cycle.id} className="p-4 border dark:border-white/10 rounded-xl bg-white dark:bg-white/5 shadow-sm hover:shadow-md transition-all">
                                  <div className="flex justify-between items-start mb-4">
                                      <div>
                                          <h4 className="font-bold dark:text-white">{cycle.name}</h4>
                                          <p className="text-xs text-gray-400 uppercase tracking-tighter">{cycle.type}</p>
                                      </div>
                                      <button onClick={() => deleteCycle(cycle.id)} className="text-gray-300 hover:text-red-500"><i className="fas fa-trash"></i></button>
                                  </div>
                                  <Button size="sm" fullWidth onClick={() => { setEditingCycleId(cycle.id); setModalTab('general'); }}>Configurer</Button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {activeTab === 'accounting' && (
                  <div className="animate-fade-in">
                    <AccountingSettingsEditor 
                        cycles={cycles} 
                        settings={localSettings} 
                        onUpdateSettings={setLocalSettings} 
                    />
                    <div className="mt-8 flex justify-end">
                        <Button onClick={handleSaveSettings}>Enregistrer les tarifs</Button>
                    </div>
                  </div>
              )}

              {activeTab === 'personnel' && (
                  <div className="space-y-8 animate-fade-in">
                      <div>
                          <h3 className="font-bold dark:text-white mb-2">Gestion des Rôles du Personnel</h3>
                          <p className="text-sm text-gray-500 mb-6">Ajoutez des rôles personnalisés pour votre établissement (ex: Surveillant, Comptable, Bibliothécaire).</p>
                          
                          <div className="flex gap-2 max-w-md mb-6">
                              <Input placeholder="Nouveau rôle..." value={newRoleName} onChange={e => setNewRoleName(e.target.value)} />
                              <Button onClick={handleAddRole}>Ajouter</Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {(localSettings.staffRoles || ['professeur', 'gestionnaire']).map(role => (
                                  <div key={role} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-white/5 border dark:border-white/10 rounded-lg">
                                      <span className="font-medium dark:text-gray-200 capitalize">{role}</span>
                                      {!['professeur', 'gestionnaire'].includes(role.toLowerCase()) && (
                                          <button onClick={() => removeRole(role)} className="text-gray-400 hover:text-red-500 transition-colors">
                                              <i className="fas fa-times-circle"></i>
                                          </button>
                                      )}
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="flex justify-end pt-6 border-t dark:border-white/10">
                          <Button onClick={handleSaveSettings}>Enregistrer les rôles</Button>
                      </div>
                  </div>
              )}
          </div>
      </Card>

      {activeTab === 'general' && (
          <Card title="Zone de Danger" className="border-red-100 dark:border-red-900/30">
              <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">Réinitialiser toutes les données.</p>
                  <Button variant="danger" onClick={() => { if(confirm("TOUT EFFACER ?")) resetData(); }}>Réinitialiser</Button>
              </div>
          </Card>
      )}

      {/* Configuration Modal */}
      {editingCycleId && cycles[editingCycleId] && (
          <CycleConfigModal 
             cycle={cycles[editingCycleId]} 
             onClose={() => setEditingCycleId(null)} 
             activeTab={activeTab}
             setActiveTab={setActiveTab}
             allSubjects={subjects}
             onUpdateCycle={(updated) => updateCycles({...cycles, [updated.id]: updated})}
             onUpdateSubjects={updateSubjects}
          />
      )}
    </div>
  );
};

// --- Sub-components for Cycle Configuration ---

interface CycleConfigModalProps {
    cycle: Cycle;
    onClose: () => void;
    activeTab: 'general' | 'structure' | 'subjects';
    setActiveTab: (tab: 'general' | 'structure' | 'subjects') => void;
    allSubjects: Record<string, Subject[]>;
    onUpdateCycle: (c: Cycle) => void;
    onUpdateSubjects: (className: string, subjects: Subject[]) => void;
}

const CycleConfigModal: React.FC<CycleConfigModalProps> = ({ cycle, onClose, activeTab, setActiveTab, allSubjects, onUpdateCycle, onUpdateSubjects }) => {
    return (
        <Modal isOpen={true} onClose={onClose} title={`Configuration : ${cycle.name}`} maxWidth="max-w-4xl">
            <div className="flex border-b dark:border-white/10 mb-6 overflow-x-auto">
                <button onClick={() => setActiveTab('general')} className={`px-4 py-2 font-medium transition-colors ${activeTab === 'general' ? 'border-b-2 border-[var(--primary-color)] text-[var(--primary-color)] dark:text-white dark:border-white dark:drop-shadow-[0_0_5px_white]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Général</button>
                <button onClick={() => setActiveTab('structure')} className={`px-4 py-2 font-medium transition-colors ${activeTab === 'structure' ? 'border-b-2 border-[var(--primary-color)] text-[var(--primary-color)] dark:text-white dark:border-white dark:drop-shadow-[0_0_5px_white]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Structure (Classes & Salles)</button>
                <button onClick={() => setActiveTab('subjects')} className={`px-4 py-2 font-medium transition-colors ${activeTab === 'subjects' ? 'border-b-2 border-[var(--primary-color)] text-[var(--primary-color)] dark:text-white dark:border-white dark:drop-shadow-[0_0_5px_white]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Matières & Enseignants</button>
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'general' && (
                    <div className="space-y-4">
                        <Input label="Nom du cycle" value={cycle.name} onChange={e => onUpdateCycle({...cycle, name: e.target.value})} />
                        <Select 
                            label="Type de cycle" 
                            options={[
                                {value: 'simple', label: 'Simple (Classes uniques)'},
                                {value: 'series', label: 'Avec Séries (ex: A, C, D)'},
                                {value: 'specialites', label: 'Avec Spécialités'},
                            ]}
                            value={cycle.type}
                            onChange={e => onUpdateCycle({...cycle, type: e.target.value as any})}
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-300 bg-gray-50 dark:bg-white/5 dark:border dark:border-white/10 p-3 rounded">
                            <i className="fas fa-info-circle mr-2"></i>
                            <strong>Simple:</strong> Une classe par niveau (ex: 6ème, 5ème).<br/>
                            <strong>Séries/Spécialités:</strong> Les classes sont la combinaison d'un niveau et d'une série (ex: Terminale C, Première A).
                        </p>
                    </div>
                )}

                {activeTab === 'structure' && (
                    <StructureEditor cycle={cycle} onUpdate={onUpdateCycle} />
                )}

                {activeTab === 'subjects' && (
                    <SubjectsEditor cycle={cycle} allSubjects={allSubjects} onUpdateSubjects={onUpdateSubjects} />
                )}
            </div>
            
            <div className="flex justify-end pt-4 border-t dark:border-white/10 mt-4">
                <Button onClick={onClose} variant="secondary">Fermer</Button>
            </div>
        </Modal>
    );
};

const StructureEditor: React.FC<{ cycle: Cycle; onUpdate: (c: Cycle) => void }> = ({ cycle, onUpdate }) => {
    const [newItem, setNewItem] = useState('');

    const addLevel = () => {
        if (newItem && !cycle.levels.includes(newItem)) {
            onUpdate({...cycle, levels: [...cycle.levels, newItem]});
            setNewItem('');
        }
    };

    const addSerie = () => {
        if (newItem && !cycle.series.includes(newItem)) {
            onUpdate({...cycle, series: [...cycle.series, newItem]});
            setNewItem('');
        }
    };

    const addSpecialite = () => {
        if (newItem && !cycle.specialites.includes(newItem)) {
            onUpdate({...cycle, specialites: [...cycle.specialites, newItem]});
            setNewItem('');
        }
    };

    const addClassroom = () => {
        if (newItem) {
            const newRoom: Classroom = { id: `room_${Date.now()}`, name: newItem };
            onUpdate({...cycle, classrooms: [...cycle.classrooms, newRoom]});
            setNewItem('');
        }
    };

    return (
        <div className="space-y-8">
            {/* Levels */}
            <div>
                <h4 className="font-bold mb-2 flex items-center gap-2 dark:text-gray-200"><i className="fas fa-layer-group text-blue-500"></i> Classes / Niveaux</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                    {cycle.levels.map(lvl => (
                        <div key={lvl} className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-100 border dark:border-blue-500/30 px-3 py-1 rounded-full flex items-center gap-2">
                            <span>{lvl}</span>
                            <button onClick={() => onUpdate({...cycle, levels: cycle.levels.filter(l => l !== lvl)})} className="hover:text-red-500">&times;</button>
                        </div>
                    ))}
                    {cycle.levels.length === 0 && <span className="text-gray-400 text-sm italic">Aucun niveau défini</span>}
                </div>
                <div className="flex gap-2 max-w-md">
                    <Input placeholder="Ajouter niveau (ex: 6ème)" value={newItem} onChange={e => setNewItem(e.target.value)} />
                    <Button size="sm" onClick={addLevel}>Ajouter</Button>
                </div>
            </div>

            {/* Series / Specialties */}
            {(cycle.type === 'series' || cycle.type === 'specialites') && (
                <div>
                    <h4 className="font-bold mb-2 flex items-center gap-2 dark:text-gray-200">
                        <i className="fas fa-code-branch text-purple-500"></i> 
                        {cycle.type === 'series' ? 'Séries' : 'Spécialités'}
                    </h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {(cycle.type === 'series' ? cycle.series : cycle.specialites).map(item => (
                            <div key={item} className="bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-100 border dark:border-purple-500/30 px-3 py-1 rounded-full flex items-center gap-2">
                                <span>{item}</span>
                                <button onClick={() => {
                                    if(cycle.type === 'series') onUpdate({...cycle, series: cycle.series.filter(s => s !== item)});
                                    else onUpdate({...cycle, specialites: cycle.specialites.filter(s => s !== item)});
                                }} className="hover:text-red-500">&times;</button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 max-w-md">
                        <Input placeholder={`Ajouter ${cycle.type === 'series' ? 'série' : 'spécialité'}`} value={newItem} onChange={e => setNewItem(e.target.value)} />
                        <Button size="sm" onClick={cycle.type === 'series' ? addSerie : addSpecialite}>Ajouter</Button>
                    </div>
                </div>
            )}

            {/* Classrooms */}
            <div>
                <h4 className="font-bold mb-2 flex items-center gap-2 dark:text-gray-200"><i className="fas fa-door-open text-green-500"></i> Salles de classe (Facultatif)</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                    {cycle.classrooms.map(room => (
                        <div key={room.id} className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-100 border dark:border-green-500/30 px-3 py-1 rounded-full flex items-center gap-2">
                            <span>{room.name}</span>
                            <button onClick={() => onUpdate({...cycle, classrooms: cycle.classrooms.filter(c => c.id !== room.id)})} className="hover:text-red-500">&times;</button>
                        </div>
                    ))}
                    {cycle.classrooms.length === 0 && <span className="text-gray-400 text-sm italic">Aucune salle définie</span>}
                </div>
                <div className="flex gap-2 max-w-md">
                    <Input placeholder="Nom de la salle (ex: Salle 101)" value={newItem} onChange={e => setNewItem(e.target.value)} />
                    <Button size="sm" onClick={addClassroom}>Ajouter</Button>
                </div>
            </div>
        </div>
    );
};

const SubjectsEditor: React.FC<{ 
    cycle: Cycle; 
    allSubjects: Record<string, Subject[]>; 
    onUpdateSubjects: (cls: string, subs: Subject[]) => void 
}> = ({ cycle, allSubjects, onUpdateSubjects }) => {
    
    // Generate valid class combinations
    const getClassCombinations = () => {
        if (cycle.type === 'simple') return cycle.levels;
        const suffixes = cycle.type === 'series' ? cycle.series : cycle.specialites;
        const combos: string[] = [];
        cycle.levels.forEach(lvl => {
            if (suffixes.length > 0) {
                suffixes.forEach(s => combos.push(`${lvl} ${s}`));
            } else {
                combos.push(lvl); // Fallback if no series defined yet
            }
        });
        return combos;
    };

    const combinations = getClassCombinations();
    const [selectedClass, setSelectedClass] = useState<string>(combinations[0] || '');
    
    // Form State
    const [subName, setSubName] = useState('');
    const [subCoeff, setSubCoeff] = useState(1);
    const [subTeacher, setSubTeacher] = useState('');

    const currentSubjects = allSubjects[selectedClass] || [];

    const addSubject = () => {
        if (!subName || !selectedClass) return;
        const newSub: Subject = {
            id: Date.now().toString(),
            nom: subName,
            coefficient: subCoeff,
            teacher: subTeacher
        };
        onUpdateSubjects(selectedClass, [...currentSubjects, newSub]);
        setSubName('');
        setSubCoeff(1);
        setSubTeacher('');
    };

    const removeSubject = (id: string) => {
        onUpdateSubjects(selectedClass, currentSubjects.filter(s => s.id !== id));
    };

    return (
        <div className="flex flex-col md:flex-row gap-6">
            {/* Left: Select Class */}
            <div className="w-full md:w-1/3 border-r dark:border-white/10 pr-6">
                <h4 className="font-bold mb-4 dark:text-gray-200">1. Choisir la classe</h4>
                {combinations.length === 0 ? (
                    <p className="text-red-500 text-sm">Veuillez d'abord configurer les niveaux et séries dans l'onglet "Structure".</p>
                ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {combinations.map(c => (
                            <button
                                key={c}
                                onClick={() => setSelectedClass(c)}
                                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${selectedClass === c ? 'bg-blue-50 border-[var(--primary-color)] text-[var(--primary-color)] font-bold dark:bg-white/10 dark:text-blue-300 dark:border-blue-400' : 'hover:bg-gray-50 dark:hover:bg-white/5 dark:border-white/10 dark:text-gray-300'}`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Right: Manage Subjects */}
            <div className="w-full md:w-2/3">
                <h4 className="font-bold mb-4 dark:text-gray-200">2. Matières pour : <span className="text-[var(--primary-color)] dark:text-white dark:drop-shadow-[0_0_5px_var(--primary-color)]">{selectedClass || '...'}</span></h4>
                
                {selectedClass && (
                    <>
                        <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg mb-6 border dark:border-white/10">
                            <h5 className="font-semibold text-sm mb-3 dark:text-gray-300">Ajouter une matière</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                <Input placeholder="Nom (ex: Maths)" value={subName} onChange={e => setSubName(e.target.value)} />
                                <Input type="number" placeholder="Coeff" min="1" value={subCoeff} onChange={e => setSubCoeff(parseInt(e.target.value))} />
                                <Input placeholder="Enseignant (facultatif)" value={subTeacher} onChange={e => setSubTeacher(e.target.value)} />
                            </div>
                            <Button size="sm" onClick={addSubject} disabled={!subName}>Ajouter</Button>
                        </div>

                        <div className="overflow-hidden border rounded-lg dark:border-white/10">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                                <thead className="bg-gray-100 dark:bg-white/10">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">Matière</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">Coeff</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">Enseignant</th>
                                        <th className="px-4 py-2 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-white/10 bg-white dark:bg-transparent">
                                    {currentSubjects.map(sub => (
                                        <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors dark:text-gray-200">
                                            <td className="px-4 py-2">{sub.nom}</td>
                                            <td className="px-4 py-2 text-center">{sub.coefficient}</td>
                                            <td className="px-4 py-2 text-gray-500 dark:text-gray-400 text-sm">{sub.teacher || '-'}</td>
                                            <td className="px-4 py-2 text-right">
                                                <button onClick={() => removeSubject(sub.id)} className="text-red-500 hover:text-red-700 dark:text-red-400">
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {currentSubjects.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 italic">Aucune matière configurée pour cette classe.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// --- NEW Accounting Settings Component ---

const AccountingSettingsEditor: React.FC<{ 
    cycles: Record<string, Cycle>; 
    settings: AppSettings; 
    onUpdateSettings: (s: AppSettings) => void 
}> = ({ cycles, settings, onUpdateSettings }) => {
    const [selectedCycleId, setSelectedCycleId] = useState<string>(Object.keys(cycles)[0] || '');
    
    const cycle = cycles[selectedCycleId];
    const classFees = settings.accounting?.classFees || {};

    const getClassCombinations = (c: Cycle) => {
        if (c.type === 'simple') return c.levels;
        const suffixes = c.type === 'series' ? c.series : c.specialites;
        const combos: string[] = [];
        c.levels.forEach(lvl => {
            if (suffixes.length > 0) {
                suffixes.forEach(s => combos.push(`${lvl} ${s}`));
            } else {
                combos.push(lvl);
            }
        });
        return combos;
    };

    const handleFeeChange = (className: string, fee: number) => {
        const newClassFees = { ...classFees, [className]: fee };
        onUpdateSettings({
            ...settings,
            accounting: {
                ...settings.accounting,
                classFees: newClassFees
            }
        });
    };

    const combinations = cycle ? getClassCombinations(cycle) : [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold dark:text-white">Frais Scolaires par Classe</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Définissez les tarifs mensuels pour chaque niveau d'étude.</p>
                </div>
                <div className="w-full md:w-64">
                    <Select 
                        label="Filtrer par Cycle"
                        value={selectedCycleId}
                        onChange={e => setSelectedCycleId(e.target.value)}
                        options={Object.values(cycles).map(c => ({ value: c.id, label: c.name }))}
                    />
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    <i className="fas fa-info-circle mr-2"></i>
                    Les calculs annuels sont basés sur une période de <strong>9 mois</strong>. Les changements sont enregistrés automatiquement.
                </p>
            </div>

            {cycle ? (
                <div className="overflow-hidden border rounded-xl dark:border-white/10 shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                        <thead className="bg-gray-100 dark:bg-white/10">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Classe</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tarif Mensuel (FCFA)</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Annuel (9 mois)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-white/10">
                            {combinations.map(cls => (
                                <tr key={cls} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{cls}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="w-40">
                                            <Input 
                                                type="number" 
                                                placeholder="0" 
                                                value={classFees[cls] || ''} 
                                                onChange={e => handleFeeChange(cls, parseInt(e.target.value) || 0)}
                                                className="font-mono text-lg"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 font-mono font-bold">
                                        {(classFees[cls] || 0) * 9} FCFA
                                    </td>
                                </tr>
                            ))}
                            {combinations.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-10 text-center text-gray-500 italic">
                                        Aucune classe configurée pour ce cycle. Allez dans l'onglet "Cycles & Matières" pour ajouter des niveaux.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 dark:bg-white/5 rounded-xl border-2 border-dashed dark:border-white/10">
                    <p className="text-gray-500">Veuillez sélectionner un cycle pour configurer les frais.</p>
                </div>
            )}
        </div>
    );
};
