import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, Input, Button, Select, Modal } from '../../components/ui/Common';
import { TempWeightEditor } from '../../components/ui/TempWeightEditor';
import { useSchool } from '../../App';
import { AppSettings, Cycle, Subject, Classroom, AppreciationRule, StaffMember, BulletinHeaderSettings } from '../../types';
import { INITIAL_CYCLES, INITIAL_SUBJECTS } from '../../constants';


export const Settings: React.FC = () => {
  const { settings, updateSettings, cycles, updateCycles, subjects, updateSubjects, resetData, session, logout } = useSchool();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);
  
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'structure' | 'accounting' | 'salaries' | 'personnel'>('general');
  const [modalTab, setModalTab] = useState<'general' | 'structure' | 'subjects' | 'bulletin'>('general');
  const [newCycleName, setNewCycleName] = useState('');
  const [newRoleName, setNewRoleName] = useState('');

  const [newAppreciation, setNewAppreciation] = useState<AppreciationRule>({ min: 0, max: 0, text: '' });
  const [newAcademicYear, setNewAcademicYear] = useState('');

  const handleSaveSettings = () => {
  updateSettings(localSettings);
  alert('Paramètres enregistrés !');
};





  const handleAddRole = () => {
    if (!newRoleName) return;
    const currentRoles = localSettings.staffRoles || ['professeur', 'gestionnaire', 'surveillant_general'];
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
    if (['professeur', 'gestionnaire', 'surveillant_general'].includes(role.toLowerCase())) {
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
              <button onClick={() => setActiveTab('salaries')} className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'salaries' ? 'border-b-2 border-[var(--primary-color)] text-[var(--primary-color)] dark:text-white dark:border-white dark:drop-shadow-[0_0_5px_white]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Salaires</button>
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        <div className="space-y-6">
                            <h4 className="font-bold dark:text-white flex items-center gap-2">
                                <i className="fas fa-image text-[var(--primary-color)]"></i> Logo de l'établissement
                            </h4>
                            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border-2 border-dashed dark:border-white/10 transition-all hover:border-[var(--primary-color)]">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center border-4 border-white dark:border-slate-700 shadow-xl overflow-hidden group-hover:scale-105 transition-transform">
                                        {localSettings.logo ? (
                                            <img src={localSettings.logo} className="w-full h-full object-contain" />
                                        ) : (
                                            <i className="fas fa-graduation-cap text-3xl text-gray-300"></i>
                                        )}
                                    </div>
                                    {localSettings.logo && (
                                        <button 
                                            onClick={() => setLocalSettings({...localSettings, logo: ''})}
                                            className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 active:scale-90 transition-all"
                                            title="Supprimer le logo"
                                        >
                                            <i className="fas fa-times text-xs"></i>
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1 space-y-3">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Formats: PNG, JPG, WEBP. Taille max: 500 Ko.
                                        Ce logo apparaîtra sur les bulletins, reçus et dans l'entête de l'application.
                                    </p>
                                    <label className="inline-block cursor-pointer">
                                        <span className="px-4 py-2 bg-[var(--primary-color)] text-white rounded-xl font-bold text-sm shadow-lg shadow-[var(--primary-color)]/20 hover:scale-105 active:scale-95 transition-all">
                                            {localSettings.logo ? 'Modifier le logo' : 'Choisir un logo'}
                                        </span>
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept="image/*" 
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                if (file.size > 512 * 1024) {
                                                    alert("L'image est trop lourde (max 512Ko)");
                                                    return;
                                                }
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setLocalSettings({ ...localSettings, logo: reader.result as string });
                                                };
                                                reader.readAsDataURL(file);
                                            }} 
                                        />
                                    </label>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 italic">
                                Le logo est automatiquement défini comme icône principale de l'application et favicon du navigateur.
                            </p>

                            <div className="pt-4 border-t border-gray-100 dark:border-white/10 space-y-3">
                                <h4 className="font-bold dark:text-white flex items-center gap-2">
                                    <i className="fas fa-mobile-alt text-[var(--primary-color)]"></i> Application PWA Native
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Installez PR-SGS directement sur votre ordinateur ou smartphone pour un accès rapide depuis l'écran d'accueil.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                      localStorage.removeItem('pr_scl_install_dismissed');
                                      window.location.reload();
                                    }}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold text-xs shadow transition-all inline-flex items-center gap-2"
                                >
                                    <i className="fas fa-download text-blue-400"></i>
                                    <span>Proposer l'installation de l'application</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border dark:border-white/10">
                             <h4 className="font-bold mb-4 dark:text-white flex items-center gap-2">
                                <i className="fas fa-adjust text-[var(--primary-color)]"></i> Mode d'affichage
                             </h4>
                             <div className="flex gap-8">
                                 <label className="flex items-center gap-3 cursor-pointer group">
                                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${localSettings.mode === 'light' ? 'bg-[var(--primary-color)] text-white shadow-lg' : 'bg-white dark:bg-white/10 text-gray-400'}`}>
                                         <i className="fas fa-sun"></i>
                                     </div>
                                     <input type="radio" className="hidden" checked={localSettings.mode === 'light'} onChange={() => setLocalSettings({...localSettings, mode: 'light'})} /> 
                                     <span className={`font-bold transition-colors ${localSettings.mode === 'light' ? 'text-[var(--primary-color)] dark:text-white' : 'text-gray-400'}`}>Clair</span>
                                 </label>
                                 <label className="flex items-center gap-3 cursor-pointer group">
                                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${localSettings.mode === 'dark' ? 'bg-[var(--primary-color)] text-white shadow-lg' : 'bg-white dark:bg-white/10 text-gray-400'}`}>
                                         <i className="fas fa-moon"></i>
                                     </div>
                                     <input type="radio" className="hidden" checked={localSettings.mode === 'dark'} onChange={() => setLocalSettings({...localSettings, mode: 'dark'})} /> 
                                     <span className={`font-bold transition-colors ${localSettings.mode === 'dark' ? 'text-[var(--primary-color)] dark:text-white' : 'text-gray-400'}`}>Sombre</span>
                                 </label>
                             </div>
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

                      {session?.role === 'dirigeant' && (
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
                      )}

                      <div className="bg-purple-50/50 dark:bg-white/5 p-6 rounded-2xl border dark:border-white/10 space-y-4 mt-6">
                            <h4 className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                                <i className="fas fa-calendar-alt"></i> Années Scolaires
                            </h4>
                            {/* Année scolaire par défaut */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Année Scolaire par défaut</label>
                                <select
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/50 dark:text-white"
                                    value={localSettings.currentAcademicYear || '2025-2026'}
                                    onChange={(e) => setLocalSettings({ ...localSettings, currentAcademicYear: e.target.value })}
                                >
                                    {localSettings.availableAcademicYears?.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            {/* Ajouter une nouvelle année scolaire */}
                            <div className="flex items-center gap-2 mt-4">
                                <Input
                                    label="Nouvelle année scolaire (ex: 2025-2026)"
                                    value={newAcademicYear}
                                    onChange={e => setNewAcademicYear(e.target.value)}
                                    placeholder="AAAA-AAAA"
                                />
                                <Button
                                    onClick={() => {
                                        const trimmed = newAcademicYear.trim();
                                        const regex = /^\d{4}-\d{4}$/;
                                        if (!regex.test(trimmed)) {
                                            alert("Format d'année invalide. Utilisez AAAA-AAAA.");
                                            return;
                                        }
                                        const [start, end] = trimmed.split('-').map(Number);
                                        if (end !== start + 1) {
                                            alert("L'année finale doit être l'année suivante.");
                                            return;
                                        }
                                        const updated = [...(localSettings.availableAcademicYears || []), trimmed];
                                        setLocalSettings({ ...localSettings, availableAcademicYears: Array.from(new Set(updated)) });
                                        setNewAcademicYear('');
                                    }}
                                    variant="secondary"
                                >
                                    Ajouter
                                </Button>
                            </div>
                            {/* Liste des années disponibles */}
                            <div className="mt-4">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Années disponibles</label>
                                <ul className="list-disc list-inside text-gray-600 dark:text-gray-300">
                                    {(localSettings.availableAcademicYears || []).map(y => (
                                        <li key={y}>{y}</li>
                                    ))}
                                </ul>
                            </div>
                            <p className="text-sm text-purple-600 dark:text-purple-400 mb-3">
                                Attention : Si vous venez d'activer la gestion des années scolaires, vous devez migrer vos anciennes données vers l'année {localSettings.currentAcademicYear || '2025-2026'}.
                            </p>
                            <Button variant="outline" onClick={async () => {
                                if (confirm("Voulez-vous migrer toutes les données existantes sans année vers l'année scolaire 2025-2026 ? Cette opération est irréversible.")) {
                                    const { migrateToAcademicYear } = await import('../../services/firebase');
                                    await migrateToAcademicYear();
                                }
                            }}>
                                <i className="fas fa-database mr-2"></i> Migrer les anciennes données
                            </Button>
                        </div>

                      <div className="flex justify-end mt-6">
                          <Button onClick={handleSaveSettings}>Enregistrer les modifications</Button>
                      </div>
                  </div>
              )}

              {activeTab === 'structure' && (
                  <div className="space-y-6 animate-fade-in">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                              <h3 className="font-bold dark:text-white">Gestion des Cycles</h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Configurez les cycles, niveaux, classes et matières de votre établissement</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                              <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                      if (confirm("Charger les cycles et toutes les matières officielles (Primaire, Collège, Lycée, etc.) ? Vos classes existantes seront enrichies.")) {
                                          updateCycles({ ...INITIAL_CYCLES, ...cycles });
                                          // Charger les matières par classe
                                          Object.entries(INITIAL_SUBJECTS).forEach(([cls, subs]) => {
                                              updateSubjects(cls, subs);
                                          });
                                          alert("Catalogue officiel des cycles et matières chargé avec succès !");
                                      }
                                  }}
                                  className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              >
                                  <i className="fas fa-wand-magic-sparkles mr-1.5 text-emerald-600"></i> Charger catalogue officiel
                              </Button>
                              <div className="flex gap-2">
                                  <Input placeholder="Nom du cycle..." value={newCycleName} onChange={e => setNewCycleName(e.target.value)} />
                                  <Button onClick={handleAddCycle}>Créer</Button>
                              </div>
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

              {activeTab === 'salaries' && (
                  <div className="animate-fade-in space-y-6">
                    <SalarySettingsEditor
                        cycles={cycles}
                        settings={localSettings}
                        onUpdateSettings={setLocalSettings}
                    />
                    <div className="mt-8 flex justify-end">
                        <Button onClick={handleSaveSettings}>Enregistrer les configurations salariales</Button>
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
                              {(localSettings.staffRoles || ['professeur', 'gestionnaire', 'surveillant_general']).map(role => (
                                  <div key={role} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-white/5 border dark:border-white/10 rounded-lg">
                                      <span className="font-medium dark:text-gray-200 capitalize">
                                          {role === 'surveillant_general' ? 'Surveillant Général' : role}
                                      </span>
                                      {!['professeur', 'gestionnaire', 'surveillant_general'].includes(role.toLowerCase()) && (
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
              activeTab={modalTab}
              setActiveTab={setModalTab}
              allSubjects={subjects}
              onUpdateCycle={(updated) => updateCycles({...cycles, [updated.id]: updated})}
              onUpdateSubjects={updateSubjects}
              weight={localSettings.gradeWeights?.[editingCycleId] ?? { devoir: 50, composition: 50 }}
              onWeightChange={(newWeight) => {
                  const total = newWeight.devoir + newWeight.composition;
                  if (total !== 100) {
                      alert('La somme des poids doit être égale à 100 %');
                      return;
                  }
                  const updatedWeights = { ...(localSettings.gradeWeights || {}), [editingCycleId]: newWeight };
                  const newSettings = { ...localSettings, gradeWeights: updatedWeights };
                  setLocalSettings(newSettings);
                  updateSettings(newSettings);
              }}
           />
      )}
    </div>
  );
};

// --- Sub-components for Cycle Configuration ---

interface CycleConfigModalProps {
    cycle: Cycle;
    onClose: () => void;
    activeTab: 'general' | 'structure' | 'subjects' | 'bulletin';
    setActiveTab: (tab: 'general' | 'structure' | 'subjects' | 'bulletin') => void;
    allSubjects: Record<string, Subject[]>;
    onUpdateCycle: (c: Cycle) => void;
    onUpdateSubjects: (className: string, subjects: Subject[]) => void;
    // New props for grade weight handling per cycle
    weight: { devoir: number; composition: number };
    onWeightChange: (newWeight: { devoir: number; composition: number }) => void;
}

const CycleConfigModal: React.FC<CycleConfigModalProps> = ({ cycle, onClose, activeTab, setActiveTab, allSubjects, onUpdateCycle, onUpdateSubjects, weight, onWeightChange }) => {
    return (
        <Modal isOpen={true} onClose={onClose} title={`Configuration : ${cycle.name}`} maxWidth="max-w-4xl">
            <div className="flex border-b dark:border-white/10 mb-6 overflow-x-auto">
                <button onClick={() => setActiveTab('general')} className={`px-4 py-2 font-medium transition-colors ${activeTab === 'general' ? 'border-b-2 border-[var(--primary-color)] text-[var(--primary-color)] dark:text-white dark:border-white dark:drop-shadow-[0_0_5px_white]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Général</button>
                <button onClick={() => setActiveTab('structure')} className={`px-4 py-2 font-medium transition-colors ${activeTab === 'structure' ? 'border-b-2 border-[var(--primary-color)] text-[var(--primary-color)] dark:text-white dark:border-white dark:drop-shadow-[0_0_5px_white]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Structure (Classes & Salles)</button>
                <button onClick={() => setActiveTab('subjects')} className={`px-4 py-2 font-medium transition-colors ${activeTab === 'subjects' ? 'border-b-2 border-[var(--primary-color)] text-[var(--primary-color)] dark:text-white dark:border-white dark:drop-shadow-[0_0_5px_white]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Matières & Enseignants</button>
                <button onClick={() => setActiveTab('bulletin')} className={`px-4 py-2 font-medium transition-colors ${activeTab === 'bulletin' ? 'border-b-2 border-[var(--primary-color)] text-[var(--primary-color)] dark:text-white dark:border-white dark:drop-shadow-[0_0_5px_white]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Bulletin</button>
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'general' && (
                    <div className="space-y-4">
                        <Input label="Nom du cycle" value={cycle.name} onChange={e => onUpdateCycle({...cycle, name: e.target.value})} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <Select 
                                label="Barème de notation (Moyenne maximale)" 
                                options={[
                                    {value: '20', label: 'Moyenne sur 20 (Secondaire / Supérieur / Général) - Admis >= 10'},
                                    {value: '10', label: 'Moyenne sur 10 (Primaire) - Admis >= 5'},
                                ]}
                                value={(cycle.maxGrade || (cycle.id.toLowerCase().includes('primaire') || cycle.name.toLowerCase().includes('primaire') ? 10 : 20)).toString()}
                                onChange={e => onUpdateCycle({...cycle, maxGrade: parseInt(e.target.value) || 20})}
                            />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-300 bg-gray-50 dark:bg-white/5 dark:border dark:border-white/10 p-3 rounded">
                            <i className="fas fa-info-circle mr-2"></i>
                            <strong>Barème Primaire (sur 10) :</strong> La moyenne maximale est de 10. Les élèves ayant 5/10 ou plus sont admis, ceux en dessous de 5 sont échoués.<br/>
                            <strong>Barème Standard (sur 20) :</strong> La moyenne maximale est de 20. Les élèves ayant 10/20 ou plus sont admis.
                        </p>
                    </div>
                )}

                {activeTab === 'structure' && (
                    <StructureEditor cycle={cycle} onUpdate={onUpdateCycle} />
                )}

                {activeTab === 'subjects' && (
                    <SubjectsEditor cycle={cycle} allSubjects={allSubjects} onUpdateSubjects={onUpdateSubjects} />
                )}

                {activeTab === 'bulletin' && (
                <div className="space-y-4">
                    {/* Bulletin Tab */}
                    <TempWeightEditor
                        initialWeight={weight}
                        onSave={onWeightChange}
                    />
                    <BulletinCycleEditor cycle={cycle} onUpdateCycle={onUpdateCycle} />
                </div>
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
    const [editingItem, setEditingItem] = useState<{ 
        type: 'level' | 'serie' | 'specialite' | 'classroom'; 
        oldValue: string; 
        currentValue: string; 
        classroomId?: string;
        assignedClasses?: string[];
    } | null>(null);

    // List of all classes in this cycle
    const allCycleClasses = useMemo(() => {
        if (cycle.type === 'simple') return cycle.levels;
        const suffixes = cycle.type === 'series' ? cycle.series : cycle.specialites;
        const combos: string[] = [];
        cycle.levels.forEach(lvl => {
            if (suffixes.length > 0) {
                suffixes.forEach(s => combos.push(`${lvl} ${s}`));
            } else {
                combos.push(lvl);
            }
        });
        return combos;
    }, [cycle]);

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
            const newRoom: Classroom = { id: `room_${Date.now()}`, name: newItem, assignedClasses: [] };
            onUpdate({...cycle, classrooms: [...cycle.classrooms, newRoom]});
            setNewItem('');
        }
    };

    const handleSaveEdit = () => {
        if (!editingItem || !editingItem.currentValue.trim()) return;
        const val = editingItem.currentValue.trim();

        if (editingItem.type === 'level') {
            const updated = cycle.levels.map(l => l === editingItem.oldValue ? val : l);
            onUpdate({ ...cycle, levels: updated });
        } else if (editingItem.type === 'serie') {
            const updated = cycle.series.map(s => s === editingItem.oldValue ? val : s);
            onUpdate({ ...cycle, series: updated });
        } else if (editingItem.type === 'specialite') {
            const updated = cycle.specialites.map(s => s === editingItem.oldValue ? val : s);
            onUpdate({ ...cycle, specialites: updated });
        } else if (editingItem.type === 'classroom') {
            const updated = cycle.classrooms.map(c => c.id === editingItem.classroomId ? { 
                ...c, 
                name: val, 
                assignedClasses: editingItem.assignedClasses || [] 
            } : c);
            onUpdate({ ...cycle, classrooms: updated });
        }

        setEditingItem(null);
    };

    return (
        <div className="space-y-8">
            {/* Levels */}
            <div>
                <h4 className="font-bold mb-2 flex items-center gap-2 dark:text-gray-200"><i className="fas fa-layer-group text-blue-500"></i> Classes / Niveaux</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                    {cycle.levels.map(lvl => (
                        <div key={lvl} className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-100 border dark:border-blue-500/30 px-3 py-1.5 rounded-full flex items-center gap-2">
                            <span className="font-medium text-sm">{lvl}</span>
                            <button 
                                onClick={() => setEditingItem({ type: 'level', oldValue: lvl, currentValue: lvl })} 
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-white transition-colors"
                                title="Modifier"
                            >
                                <i className="fas fa-pencil-alt text-xs"></i>
                            </button>
                            <button 
                                onClick={() => onUpdate({...cycle, levels: cycle.levels.filter(l => l !== lvl)})} 
                                className="text-blue-400 hover:text-red-500 transition-colors ml-1"
                                title="Supprimer"
                            >
                                &times;
                            </button>
                        </div>
                    ))}
                    {cycle.levels.length === 0 && <span className="text-gray-400 text-sm italic">Aucun niveau défini</span>}
                </div>
                <div className="flex gap-2 max-w-md">
                    <Input placeholder="Ajouter niveau (ex: CP1, 6ème)" value={newItem} onChange={e => setNewItem(e.target.value)} />
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
                            <div key={item} className="bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-100 border dark:border-purple-500/30 px-3 py-1.5 rounded-full flex items-center gap-2">
                                <span className="font-medium text-sm">{item}</span>
                                <button 
                                    onClick={() => setEditingItem({ type: cycle.type === 'series' ? 'serie' : 'specialite', oldValue: item, currentValue: item })} 
                                    className="text-purple-600 hover:text-purple-800 dark:text-purple-300 dark:hover:text-white transition-colors"
                                    title="Modifier"
                                >
                                    <i className="fas fa-pencil-alt text-xs"></i>
                                </button>
                                <button onClick={() => {
                                    if(cycle.type === 'series') onUpdate({...cycle, series: cycle.series.filter(s => s !== item)});
                                    else onUpdate({...cycle, specialites: cycle.specialites.filter(s => s !== item)});
                                }} className="text-purple-400 hover:text-red-500 transition-colors ml-1" title="Supprimer">&times;</button>
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
                <h4 className="font-bold mb-2 flex items-center gap-2 dark:text-gray-200"><i className="fas fa-door-open text-green-500"></i> Salles de classe</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Créez des salles et associez-les aux classes de ce cycle. Plusieurs classes peuvent partager la même salle.
                </p>
                <div className="flex flex-col gap-2.5 mb-3">
                    {cycle.classrooms.map(room => (
                        <div key={room.id} className="p-3 bg-green-50/70 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-green-900 dark:text-green-200 flex items-center gap-1.5">
                                    <i className="fas fa-door-closed text-xs text-green-600"></i> {room.name}
                                </span>
                                {room.assignedClasses && room.assignedClasses.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {room.assignedClasses.map(cls => (
                                            <span key={cls} className="text-[10px] font-bold bg-green-200 dark:bg-green-900/60 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-lg">
                                                {cls}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-[10px] italic text-gray-400 dark:text-gray-500">(Toutes les classes ou non assignée)</span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 self-end sm:self-auto">
                                <button 
                                    onClick={() => setEditingItem({ 
                                        type: 'classroom', 
                                        oldValue: room.name, 
                                        currentValue: room.name, 
                                        classroomId: room.id,
                                        assignedClasses: room.assignedClasses || []
                                    })} 
                                    className="p-1.5 px-2.5 rounded-lg bg-green-100 hover:bg-green-200 dark:bg-green-900/40 dark:hover:bg-green-900/70 text-green-700 dark:text-green-300 transition-colors text-xs font-semibold flex items-center gap-1"
                                    title="Modifier la salle et les classes liées"
                                >
                                    <i className="fas fa-pencil-alt text-xs"></i> Configurer
                                </button>
                                <button 
                                    onClick={() => onUpdate({...cycle, classrooms: cycle.classrooms.filter(c => c.id !== room.id)})} 
                                    className="p-1.5 px-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-xs" 
                                    title="Supprimer la salle"
                                >
                                    <i className="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                    {cycle.classrooms.length === 0 && <span className="text-gray-400 text-sm italic">Aucune salle définie pour ce cycle</span>}
                </div>
                <div className="flex gap-2 max-w-md">
                    <Input placeholder="Nom de la salle (ex: Salle 101)" value={newItem} onChange={e => setNewItem(e.target.value)} />
                    <Button size="sm" onClick={addClassroom}>Ajouter</Button>
                </div>
            </div>

            {/* Modal de réédition en place */}
            {editingItem && (
                <Modal 
                    isOpen={true} 
                    onClose={() => setEditingItem(null)} 
                    title={editingItem.type === 'classroom' ? `Configuration Salle : ${editingItem.oldValue}` : `Modifier : ${editingItem.oldValue}`}
                    maxWidth="max-w-lg"
                >
                    <div className="space-y-4">
                        <Input 
                            label={editingItem.type === 'classroom' ? "Nom de la salle" : "Nouvelle valeur"} 
                            value={editingItem.currentValue} 
                            onChange={e => setEditingItem({ ...editingItem, currentValue: e.target.value })} 
                            autoFocus
                        />

                        {editingItem.type === 'classroom' && (
                            <div className="space-y-2 pt-2 border-t dark:border-white/10">
                                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                                    Classes liées à cette salle (plusieurs classes possibles)
                                </label>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Cochez les classes autorisées à occuper ou être affectées à cette salle.
                                </p>
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-white/5 rounded-xl border dark:border-white/10">
                                    {allCycleClasses.map(cls => {
                                        const isChecked = (editingItem.assignedClasses || []).includes(cls);
                                        return (
                                            <label 
                                                key={cls} 
                                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs font-bold transition-colors ${isChecked ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-800' : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'}`}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={isChecked}
                                                    onChange={e => {
                                                        const current = editingItem.assignedClasses || [];
                                                        const next = e.target.checked 
                                                            ? [...current, cls]
                                                            : current.filter(c => c !== cls);
                                                        setEditingItem({ ...editingItem, assignedClasses: next });
                                                    }}
                                                    className="w-4 h-4 text-green-600 rounded"
                                                />
                                                <span className="truncate">{cls}</span>
                                            </label>
                                        );
                                    })}
                                    {allCycleClasses.length === 0 && (
                                        <p className="col-span-2 text-center text-xs text-gray-400 py-3 italic">
                                            Aucune classe définie dans ce cycle pour le moment.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-4 border-t dark:border-white/10">
                            <Button variant="secondary" onClick={() => setEditingItem(null)}>Annuler</Button>
                            <Button variant="primary" onClick={handleSaveEdit}>Enregistrer les modifications</Button>
                        </div>
                    </div>
                </Modal>
            )}
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
    const [editingSub, setEditingSub] = useState<Subject | null>(null);

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

    const handleSaveEditSubject = () => {
        if (!editingSub || !selectedClass) return;
        const updatedList = currentSubjects.map(s => s.id === editingSub.id ? editingSub : s);
        onUpdateSubjects(selectedClass, updatedList);
        setEditingSub(null);
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                    <h4 className="font-bold dark:text-gray-200">2. Matières pour : <span className="text-[var(--primary-color)] dark:text-white dark:drop-shadow-[0_0_5px_var(--primary-color)]">{selectedClass || '...'}</span></h4>
                    {selectedClass && (
                        <div className="flex items-center gap-2">
                            {INITIAL_SUBJECTS[selectedClass] && (
                                <button
                                    onClick={() => {
                                        if (confirm(`Remplacer les matières de la classe "${selectedClass}" par le programme officiel standardisé (${INITIAL_SUBJECTS[selectedClass].length} matières) ?`)) {
                                            onUpdateSubjects(selectedClass, INITIAL_SUBJECTS[selectedClass]);
                                        }
                                    }}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 transition-colors shadow-sm flex items-center gap-1.5"
                                    title="Charger le catalogue officiel pour cette classe"
                                >
                                    <i className="fas fa-book-bookmark text-emerald-600"></i> Programme officiel
                                </button>
                            )}
                            {currentSubjects.length > 0 && (
                                <button
                                    onClick={() => {
                                        if (confirm(`Effacer toutes les matières configurées pour "${selectedClass}" ?`)) {
                                            onUpdateSubjects(selectedClass, []);
                                        }
                                    }}
                                    className="px-2 py-1 text-xs font-semibold rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                    title="Vider la liste des matières"
                                >
                                    <i className="fas fa-trash-can mr-1"></i> Vider
                                </button>
                            )}
                        </div>
                    )}
                </div>
                
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
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => setEditingSub(sub)} 
                                                        className="text-blue-500 hover:text-blue-700 dark:text-blue-400 p-1"
                                                        title="Modifier la matière"
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button 
                                                        onClick={() => removeSubject(sub.id)} 
                                                        className="text-red-500 hover:text-red-700 dark:text-red-400 p-1"
                                                        title="Supprimer la matière"
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
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

                        {/* Modal d'édition de matière */}
                        {editingSub && (
                            <Modal
                                isOpen={true}
                                onClose={() => setEditingSub(null)}
                                title={`Modifier la matière : ${editingSub.nom}`}
                                maxWidth="max-w-md"
                            >
                                <div className="space-y-4">
                                    <Input
                                        label="Nom de la matière"
                                        value={editingSub.nom}
                                        onChange={e => setEditingSub({ ...editingSub, nom: e.target.value })}
                                        autoFocus
                                    />
                                    <Input
                                        label="Coefficient"
                                        type="number"
                                        min="1"
                                        value={editingSub.coefficient}
                                        onChange={e => setEditingSub({ ...editingSub, coefficient: Math.max(1, parseInt(e.target.value) || 1) })}
                                    />
                                    <Input
                                        label="Enseignant (facultatif)"
                                        value={editingSub.teacher || ''}
                                        onChange={e => setEditingSub({ ...editingSub, teacher: e.target.value })}
                                    />
                                    <div className="flex justify-end gap-2 pt-4 border-t dark:border-white/10">
                                        <Button variant="secondary" onClick={() => setEditingSub(null)}>Annuler</Button>
                                        <Button variant="primary" onClick={handleSaveEditSubject} disabled={!editingSub.nom.trim()}>Enregistrer</Button>
                                    </div>
                                </div>
                            </Modal>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// --- Salary Settings Component ---

const SalarySettingsEditor: React.FC<{
    cycles: Record<string, Cycle>;
    settings: AppSettings;
    onUpdateSettings: (s: AppSettings) => void;
}> = ({ cycles, settings, onUpdateSettings }) => {
    const [selectedCycleId, setSelectedCycleId] = useState<string>(Object.keys(cycles)[0] || '');

    const salarySettings = settings.salarySettings || {};
    const classSalaries = salarySettings.classSalaries || {};
    const roleMonthlySalaries = salarySettings.roleMonthlySalaries || {};
    const staffCustomSalaries = salarySettings.staffCustomSalaries || {};

    const cycle = cycles[selectedCycleId];

    const getClassCombinations = (c: Cycle) => {
        if (!c) return [];
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

    // Vérifie si un cycle relève du préscolaire/primaire (salaires fixes) ou collège/lycée/université (salaires horaires)
    const isFixedCycle = (c?: Cycle) => {
        if (!c) return false;
        const name = (c.name || '').toLowerCase();
        const id = (c.id || '').toLowerCase();
        return name.includes('primaire') || name.includes('maternelle') || name.includes('préscolaire') || id.includes('primaire') || id.includes('maternelle');
    };

    const handleClassSalaryChange = (className: string, field: 'fixed' | 'hourly', value: number) => {
        const current = classSalaries[className] || { type: isFixedCycle(cycle) ? 'fixed' : 'hourly' };
        const updated = {
            ...classSalaries,
            [className]: {
                ...current,
                type: isFixedCycle(cycle) ? 'fixed' : 'hourly',
                ...(field === 'fixed' ? { fixedMonthlySalary: value } : { hourlyRate: value })
            }
        };
        onUpdateSettings({
            ...settings,
            salarySettings: {
                ...salarySettings,
                classSalaries: updated
            }
        });
    };

    const handleRoleSalaryChange = (role: string, amount: number) => {
        const updated = { ...roleMonthlySalaries, [role]: amount };
        onUpdateSettings({
            ...settings,
            salarySettings: {
                ...salarySettings,
                roleMonthlySalaries: updated
            }
        });
    };

    const handleStaffCustomSalaryChange = (staffMatricule: string, amount: number) => {
        const updated = { ...staffCustomSalaries, [staffMatricule]: amount };
        onUpdateSettings({
            ...settings,
            salarySettings: {
                ...salarySettings,
                staffCustomSalaries: updated
            }
        });
    };

    const availableRoles = useMemo(() => {
        const base = ['gestionnaire', 'surveillant_general', 'directeur', 'professeur'];
        const custom = settings.staffRoles || [];
        return Array.from(new Set([...base, ...custom]));
    }, [settings.staffRoles]);

    const formatRoleLabel = (r: string) => {
        if (r === 'surveillant_general') return 'Surveillant Général';
        if (r === 'gestionnaire') return 'Gestionnaire';
        if (r === 'directeur') return 'Directeur';
        if (r === 'professeur') return 'Professeur Titulaire (Fixe mensuel)';
        return r.charAt(0).toUpperCase() + r.slice(1);
    };

    return (
        <div className="space-y-8">
            {/* Section 1 : Tarifs par classe (Fixe vs Taux horaire) */}
            <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border dark:border-white/10 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h4 className="font-bold text-lg dark:text-white flex items-center gap-2">
                            <i className="fas fa-chalkboard-teacher text-blue-600"></i> Grille Salariale des Enseignants par Classe
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Cycle Préscolaire & Primaire = Salaire fixe mensuel • Cycle Collège, Lycée & Université = Taux horaire (paiement par heure effectuée)
                        </p>
                    </div>
                    {/* Choix du cycle */}
                    <div className="flex gap-2 flex-wrap">
                        {Object.values(cycles).map(c => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedCycleId(c.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                    selectedCycleId === c.id
                                        ? 'bg-blue-600 text-white border-blue-600 shadow'
                                        : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-200'
                                }`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                </div>

                {cycle && (
                    <div className="mt-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl mb-4 border border-blue-200 dark:border-blue-900/50 flex items-center gap-2 text-xs text-blue-800 dark:text-blue-300">
                            <i className="fas fa-info-circle text-sm"></i>
                            {isFixedCycle(cycle) ? (
                                <span>Cycle <strong>{cycle.name}</strong> : Les enseignants perçoivent un <strong>salaire fixe mensuel</strong> par classe.</span>
                            ) : (
                                <span>Cycle <strong>{cycle.name}</strong> : Enseignants prestataires rémunérés au <strong>taux horaire (FCFA / heure)</strong>. (ex: 1h30 = tarif + 50%).</span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {getClassCombinations(cycle).map(cls => {
                                const conf = classSalaries[cls] || {};
                                return (
                                    <div key={cls} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border dark:border-white/10 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-sm dark:text-white">{cls}</span>
                                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                                                {isFixedCycle(cycle) ? 'Fixe mensuel' : 'Taux horaire'}
                                            </span>
                                        </div>
                                        {isFixedCycle(cycle) ? (
                                            <Input
                                                label="Salaire fixe (FCFA / mois)"
                                                type="number"
                                                min="0"
                                                value={conf.fixedMonthlySalary || ''}
                                                onChange={e => handleClassSalaryChange(cls, 'fixed', Math.max(0, parseInt(e.target.value) || 0))}
                                                placeholder="Ex: 80000"
                                            />
                                        ) : (
                                            <Input
                                                label="Prix par heure (FCFA / h)"
                                                type="number"
                                                min="0"
                                                value={conf.hourlyRate || ''}
                                                onChange={e => handleClassSalaryChange(cls, 'hourly', Math.max(0, parseInt(e.target.value) || 0))}
                                                placeholder="Ex: 2500"
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Section 2 : Salaires mensuels par rôle administratif & surveillant */}
            <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border dark:border-white/10 shadow-sm space-y-4">
                <div>
                    <h4 className="font-bold text-lg dark:text-white flex items-center gap-2">
                        <i className="fas fa-users-cog text-emerald-600"></i> Salaires Mensuels par Rôle du Personnel
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Définissez le salaire mensuel de base attribué à chaque fonction de l'école (Surveillant Général, Gestionnaire, etc.).
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableRoles.map(role => (
                        <div key={role} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border dark:border-white/10 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-sm dark:text-white">{formatRoleLabel(role)}</span>
                                <span className="text-[10px] text-gray-400 font-mono">Mensuel</span>
                            </div>
                            <Input
                                label="Salaire mensuel (FCFA)"
                                type="number"
                                min="0"
                                value={roleMonthlySalaries[role] || ''}
                                onChange={e => handleRoleSalaryChange(role, Math.max(0, parseInt(e.target.value) || 0))}
                                placeholder="Ex: 100000"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Section 3 : Salaires personnalisés nominatifs par membre du personnel */}
            {settings.staff && settings.staff.length > 0 && (
                <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border dark:border-white/10 shadow-sm space-y-4">
                    <div>
                        <h4 className="font-bold text-lg dark:text-white flex items-center gap-2">
                            <i className="fas fa-id-card text-purple-600"></i> Rémunération Nominative Spécifique (Optionnelle)
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Personnalisez le salaire mensuel fixe d'un employé particulier si celui-ci diffère du salaire standard de son rôle.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 uppercase">
                                <tr>
                                    <th className="py-2.5 px-3">Matricule</th>
                                    <th className="py-2.5 px-3">Nom & Prénom</th>
                                    <th className="py-2.5 px-3">Rôle</th>
                                    <th className="py-2.5 px-3">Salaire Standard Rôle</th>
                                    <th className="py-2.5 px-3">Salaire Spécifique (FCFA)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                                {settings.staff.map(member => {
                                    const defaultRoleSalary = roleMonthlySalaries[member.role] || 0;
                                    const custom = staffCustomSalaries[member.matricule] || '';
                                    return (
                                        <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                                            <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{member.matricule}</td>
                                            <td className="py-2.5 px-3 font-semibold dark:text-white">{member.prenom} {member.nom}</td>
                                            <td className="py-2.5 px-3 capitalize text-gray-500 dark:text-gray-400">{formatRoleLabel(member.role)}</td>
                                            <td className="py-2.5 px-3 text-gray-500">{defaultRoleSalary.toLocaleString()} FCFA</td>
                                            <td className="py-2.5 px-3">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={custom}
                                                    onChange={e => handleStaffCustomSalaryChange(member.matricule, Math.max(0, parseInt(e.target.value) || 0))}
                                                    placeholder={`Par défaut (${defaultRoleSalary.toLocaleString()} FCFA)`}
                                                    className="w-48 px-3 py-1.5 rounded-lg border dark:border-white/10 bg-white dark:bg-white/5 text-xs font-bold"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};


const AccountingSettingsEditor: React.FC<{ 
    cycles: Record<string, Cycle>; 
    settings: AppSettings; 
    onUpdateSettings: (s: AppSettings) => void 
}> = ({ cycles, settings, onUpdateSettings }) => {
    const [selectedCycleId, setSelectedCycleId] = useState<string>(Object.keys(cycles)[0] || '');
    
    const cycle = cycles[selectedCycleId];
    const classFees = settings.accounting?.classFees || {};
    const classSpecialFees = settings.accounting?.classSpecialFees || {};
    const classRegistrationFees = settings.accounting?.classRegistrationFees || {};
    const classReRegistrationFees = settings.accounting?.classReRegistrationFees || {};

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

    const handleSpecialFeeChange = (className: string, fee: number) => {
        const updated = { ...classSpecialFees, [className]: fee };
        onUpdateSettings({
            ...settings,
            accounting: {
                ...settings.accounting,
                classSpecialFees: updated
            }
        });
    };

    const handleRegFeeChange = (className: string, fee: number) => {
        const updated = { ...classRegistrationFees, [className]: fee };
        onUpdateSettings({
            ...settings,
            accounting: { ...settings.accounting, classRegistrationFees: updated }
        });
    };

    const handleReRegFeeChange = (className: string, fee: number) => {
        const updated = { ...classReRegistrationFees, [className]: fee };
        onUpdateSettings({
            ...settings,
            accounting: { ...settings.accounting, classReRegistrationFees: updated }
        });
    };

    const combinations = cycle ? getClassCombinations(cycle) : [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold dark:text-white">Frais Scolaires par Classe</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Définissez les tarifs mensuels standards, les tarifs mensuels spéciaux, ainsi que les frais d'inscription et de réinscription pour chaque classe.</p>
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
                    Les calculs annuels sont basés sur une période de <strong>9 mois</strong>. Le <strong>Tarif Mensuel Spécial</strong> est appliqué automatiquement aux élèves de la classe marqués avec le statut "Élève Spécial" (ex: boursiers, cas particuliers, fratrie).
                </p>
            </div>

            {cycle ? (
                <div className="overflow-x-auto overflow-hidden border rounded-xl dark:border-white/10 shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                        <thead className="bg-gray-100 dark:bg-white/10">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Classe</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tarif Mensuel Standard</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                    <i className="fas fa-star mr-1"></i>Tarif Mensuel Spécial
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Annuel Standard (9 mois)</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Annuel Spécial (9 mois)</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                                    <i className="fas fa-user-plus mr-1"></i>Inscription
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                                    <i className="fas fa-redo mr-1"></i>Réinscription
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-white/10">
                            {combinations.map(cls => (
                                <tr key={cls} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{cls}</td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="w-32">
                                            <Input 
                                                type="number" 
                                                placeholder="0" 
                                                value={classFees[cls] || ''} 
                                                onChange={e => handleFeeChange(cls, parseInt(e.target.value) || 0)}
                                                className="font-mono text-sm"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="w-32">
                                            <Input 
                                                type="number" 
                                                placeholder="0" 
                                                value={classSpecialFees[cls] || ''} 
                                                onChange={e => handleSpecialFeeChange(cls, parseInt(e.target.value) || 0)}
                                                className="font-mono text-sm border-amber-300 dark:border-amber-700/60 focus:border-amber-500"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300 font-mono font-bold">
                                        {((classFees[cls] || 0) * 9).toLocaleString()} FCFA
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-xs text-amber-600 dark:text-amber-400 font-mono font-bold">
                                        {((classSpecialFees[cls] || 0) * 9).toLocaleString()} FCFA
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="w-32">
                                            <Input 
                                                type="number" 
                                                placeholder="0" 
                                                value={classRegistrationFees[cls] || ''} 
                                                onChange={e => handleRegFeeChange(cls, parseInt(e.target.value) || 0)}
                                                className="font-mono text-sm"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="w-32">
                                            <Input 
                                                type="number" 
                                                placeholder="0" 
                                                value={classReRegistrationFees[cls] || ''} 
                                                onChange={e => handleReRegFeeChange(cls, parseInt(e.target.value) || 0)}
                                                className="font-mono text-sm"
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {combinations.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500 italic">
                                        Aucune classe configurée pour ce cycle. Allez dans l'onglet "Cycles &amp; Matières" pour ajouter des niveaux.
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


// --- Bulletin Header & Appreciation Rules Editor per Cycle ---

const BulletinCycleEditor: React.FC<{ cycle: Cycle; onUpdateCycle: (c: Cycle) => void }> = ({ cycle, onUpdateCycle }) => {
    // Keep a local copy of the bulletin header to allow free editing.
    const initialHeader = cycle.bulletinHeader || {};
    const [localHeader, setLocalHeader] = useState(() => ({ ...initialHeader }));
    const rules = localHeader.appreciationRules || [];
    const [newRule, setNewRule] = useState<AppreciationRule>({ min: 0, max: 0, text: '' });

    // Sync when the selected cycle changes (e.g., after Firestore fetch).
    useEffect(() => {
        setLocalHeader({ ...initialHeader });
    }, [cycle.id, initialHeader]);

    // Update a field locally; changes are persisted only when the user clicks "Enregistrer".
    const updateHeader = (field: string, value: string) => {
        setLocalHeader(prev => ({ ...prev, [field]: value }));
    };

    const addRule = () => {
        if (!newRule.text || newRule.min >= newRule.max) {
            alert("Vérifiez les valeurs (min < max) et le texte de l'appréciation.");
            return;
        }
        const updatedRules = [...rules, newRule];
        const updatedHeader = { ...localHeader, appreciationRules: updatedRules };
        setLocalHeader(updatedHeader);
        setNewRule({ min: 0, max: 0, text: '' });
    };

    // Save button handler – envoie le header complet et affiche une alerte de succès
    const handleSave = () => {
        onUpdateCycle({ ...cycle, bulletinHeader: localHeader });
        // Utilisez une alerte native ou un toast UI selon votre design ; ici on utilise alert pour la simplicité
        alert('Enregistrement du bulletin réussi !');
    };

    const removeRule = (index: number) => {
        const updatedRules = rules.filter((_, i) => i !== index);
        const updatedHeader = { ...localHeader, appreciationRules: updatedRules };
        setLocalHeader(updatedHeader);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-blue-50/50 dark:bg-white/5 p-6 rounded-2xl border dark:border-white/10 space-y-4">
                <h4 className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <i className="fas fa-file-invoice"></i> Entête du Bulletin — {cycle.name}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Ces informations apparaîtront sur les bulletins des élèves de ce cycle. Si un champ est vide, la valeur globale des paramètres sera utilisée.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="République" value={localHeader.republicName || ''} onChange={e => updateHeader('republicName', e.target.value)} placeholder="Ex: République du Congo" />
                    <Input label="Devise" value={localHeader.republicMotto || ''} onChange={e => updateHeader('republicMotto', e.target.value)} placeholder="Ex: Unité - Travail - Progrès" />
                </div>
                <Input label="Ministère" value={localHeader.ministryName || ''} onChange={e => updateHeader('ministryName', e.target.value)} placeholder="Ex: Ministère de l'Enseignement..." />
                <Input label="Direction Départementale" value={localHeader.departmentalDirection || ''} onChange={e => updateHeader('departmentalDirection', e.target.value)} />
                <Input label="Inspection" value={localHeader.inspectionName || ''} onChange={e => updateHeader('inspectionName', e.target.value)} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Lieu de l'école" value={localHeader.schoolLocation || ''} onChange={e => updateHeader('schoolLocation', e.target.value)} placeholder="Ex: Brazzaville" />
                    <Input label="Devise de l'école" value={localHeader.schoolMotto || ''} onChange={e => updateHeader('schoolMotto', e.target.value)} placeholder="Ex: L'excellence pour tous" />
                </div>
                <Button onClick={handleSave} variant="primary" className="mt-4">
                    Enregistrer les modifications du bulletin
                </Button>
            </div>

            <div className="bg-amber-50/50 dark:bg-white/5 p-6 rounded-2xl border border-amber-100 dark:border-white/10 space-y-4">
                <h4 className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <i className="fas fa-star-half-alt"></i> Règles d'Appréciation — {cycle.name}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Définissez les appréciations qui apparaîtront sur le bulletin en fonction de la moyenne de l'élève. Si aucune règle n'est définie ici, les règles globales seront utilisées.
                </p>

                {rules.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b dark:border-white/10">
                                    <th className="text-left py-2 px-3 font-bold text-gray-600 dark:text-gray-300">Min</th>
                                    <th className="text-left py-2 px-3 font-bold text-gray-600 dark:text-gray-300">Max</th>
                                    <th className="text-left py-2 px-3 font-bold text-gray-600 dark:text-gray-300">Appréciation</th>
                                    <th className="py-2 px-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rules.map((rule, idx) => (
                                    <tr key={idx} className="border-b dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5">
                                        <td className="py-2 px-3 dark:text-gray-200">{rule.min}</td>
                                        <td className="py-2 px-3 dark:text-gray-200">{rule.max}</td>
                                        <td className="py-2 px-3 dark:text-gray-200 font-medium">{rule.text}</td>
                                        <td className="py-2 px-3">
                                            <button onClick={() => removeRule(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <Input label="Min" type="number" value={newRule.min} onChange={e => setNewRule({ ...newRule, min: parseFloat(e.target.value) || 0 })} />
                    <Input label="Max" type="number" value={newRule.max} onChange={e => setNewRule({ ...newRule, max: parseFloat(e.target.value) || 0 })} />
                    <Input label="Appréciation" value={newRule.text} onChange={e => setNewRule({ ...newRule, text: e.target.value })} placeholder="Ex: Très Bien" />
                    <Button onClick={addRule} variant="secondary">Ajouter</Button>
                </div>
            </div>
        </div>
    );
};
