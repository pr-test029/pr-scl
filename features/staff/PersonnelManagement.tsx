
import React, { useState, useMemo } from 'react';
import { Card, Input, Button, Select, Modal } from '../../components/ui/Common';
import { useSchool } from '../../App';
import { AppSettings, Cycle, StaffMember, TeacherAssignment, Subject } from '../../types';

export const PersonnelManagement: React.FC = () => {
    const { settings, updateSettings, cycles, subjects } = useSchool();
    const [activeTab, setActiveTab] = useState<'liste' | 'inscription'>('liste');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<'tous' | 'gestionnaire' | 'professeur'>('tous');
    const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

    const [newStaff, setNewStaff] = useState<Partial<StaffMember>>({
        role: 'professeur',
        assignedClasses: [],
        nationalite: 'Congolaise'
    });

    const roles = useMemo(() => {
        const base = ['gestionnaire', 'professeur'];
        const custom = settings.staffRoles || [];
        return Array.from(new Set([...base, ...custom]));
    }, [settings.staffRoles]);

    const staffList = settings.staff || [];

    const filteredStaff = useMemo(() => {
        return staffList.filter(s => {
            const matchesSearch = `${s.nom} ${s.prenom} ${s.matricule}`.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = filterRole === 'tous' || s.role === filterRole;
            return matchesSearch && matchesRole;
        }).sort((a, b) => a.nom.localeCompare(b.nom));
    }, [staffList, searchTerm, filterRole]);

    const generateStaffMatricule = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
        return `STF-${result}`;
    };

    const handleUpdateStaff = (updatedMember: StaffMember) => {
        const updatedStaffList = staffList.map(s => s.id === updatedMember.id ? updatedMember : s);
        updateSettings({ ...settings, staff: updatedStaffList });
        alert("Informations mises à jour !");
        setEditingStaff(null);
    };

    const removeStaff = (id: string) => {
        if (confirm("Supprimer ce membre du personnel ?")) {
            const updatedSettings = { ...settings, staff: staffList.filter(s => s.id !== id) };
            updateSettings(updatedSettings);
        }
    };

    const allAvailableClasses = useMemo(() => {
        const classes: string[] = [];
        Object.values(cycles).forEach(cycle => {
            if (cycle.type === 'simple') {
                classes.push(...cycle.levels);
            } else {
                const suffixes = cycle.type === 'series' ? cycle.series : cycle.specialites;
                cycle.levels.forEach(lvl => {
                    suffixes.forEach(s => classes.push(`${lvl} ${s}`));
                });
            }
        });
        return classes;
    }, [cycles]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black dark:text-white">Gestion du Personnel</h1>
                    <p className="text-gray-500">Administrez les membres de votre équipe.</p>
                </div>
                <div className="flex bg-white dark:bg-white/5 p-1 rounded-xl border dark:border-white/10 shadow-sm">
                    <button 
                        onClick={() => setActiveTab('liste')}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'liste' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        Liste du personnel
                    </button>
                    <button 
                        onClick={() => setActiveTab('inscription')}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'inscription' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        Nouvelle inscription
                    </button>
                </div>
            </div>

            {activeTab === 'liste' ? (
                <Card>
                    <div className="flex flex-col lg:flex-row gap-6 mb-10">
                        <div className="flex-1">
                            <Input 
                                placeholder="Rechercher par nom, prénom ou matricule..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)}
                                icon={<i className="fas fa-search"></i>}
                            />
                        </div>
                        <div className="w-full lg:w-72">
                            <Select 
                                value={filterRole}
                                onChange={e => setFilterRole(e.target.value as any)}
                                options={[
                                    { value: 'tous', label: 'Tous les rôles' },
                                    ...roles.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))
                                ]}
                            />
                        </div>
                    </div>

                    {filteredStaff.length === 0 ? (
                        <div className="py-20 text-center bg-gray-50/50 dark:bg-white/2 rounded-[2rem] border-2 border-dashed dark:border-white/5">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                              <i className="fas fa-users-slash text-3xl text-gray-300 dark:text-gray-600"></i>
                            </div>
                            <h3 className="text-xl font-bold dark:text-white">Aucun membre</h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Aucun personnel ne correspond à votre recherche.</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop View */}
                            <div className="hidden md:block overflow-hidden border dark:border-white/10 rounded-3xl">
                                <table className="w-full border-collapse">
                                    <thead className="bg-gray-50/50 dark:bg-white/5">
                                        <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <th className="px-6 py-5">Membre</th>
                                            <th className="px-6 py-5">Identifiant</th>
                                            <th className="px-6 py-5">Rôle & Assignations</th>
                                            <th className="px-6 py-5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                        {filteredStaff.map(s => (
                                            <tr key={s.id} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors">
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border-2 border-white dark:border-gray-800 flex items-center justify-center text-blue-600 font-black shadow-sm">
                                                            {s.photo ? <img src={s.photo} className="w-full h-full rounded-2xl object-cover" /> : s.prenom[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-gray-900 dark:text-white">{s.prenom} {s.nom}</p>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.nationalite || 'Non renseigné'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="font-mono text-sm font-black text-blue-600">{s.matricule}</span>
                                                        <span className="text-[10px] text-gray-400 truncate max-w-[150px]">{s.email || '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-2">
                                                        <span className={`w-fit px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
                                                            s.role === 'gestionnaire' ? 'bg-amber-100 text-amber-700' : 
                                                            s.role === 'professeur' ? 'bg-indigo-100 text-indigo-700' : 
                                                            'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                            {s.role}
                                                        </span>
                                                        {s.role === 'professeur' && s.assignments && s.assignments.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {s.assignments.map((a, idx) => (
                                                                    <span key={idx} className="text-[9px] font-bold bg-white dark:bg-white/5 px-2 py-1 rounded-lg border dark:border-white/10 dark:text-gray-400 shadow-sm">
                                                                        {a.classe}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setEditingStaff(s)} className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-600 hover:text-white transition-all shadow-sm" title="Modifier">
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button onClick={() => removeStaff(s.id)} className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm" title="Supprimer">
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View */}
                            <div className="md:hidden space-y-4">
                                {filteredStaff.map(s => (
                                    <div key={s.id} className="p-6 bg-white dark:bg-white/5 border dark:border-white/10 rounded-[2rem] shadow-sm space-y-6 animate-fade-in">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-black shadow-md">
                                                {s.photo ? <img src={s.photo} className="w-full h-full rounded-2xl object-cover" /> : s.prenom[0]}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-gray-900 dark:text-white">{s.prenom} {s.nom}</h4>
                                                <p className="text-xs font-mono font-bold text-blue-600">{s.matricule}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-3 py-1 bg-gray-100 dark:bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest dark:text-gray-300">
                                                {s.role}
                                            </span>
                                            {s.assignments?.map((a, i) => (
                                                <span key={i} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full text-[10px] font-bold text-blue-600">
                                                    {a.classe}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <Button fullWidth variant="secondary" size="sm" onClick={() => setEditingStaff(s)} icon={<i className="fas fa-edit"></i>}>Modifier</Button>
                                            <Button variant="danger" size="sm" onClick={() => removeStaff(s.id)} className="aspect-square p-0 w-12"><i className="fas fa-trash"></i></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </Card>
            ) : (
                <div className="max-w-4xl mx-auto">
                    <Card title="Nouvelle Inscription">
                        <StaffForm 
                            initialData={newStaff}
                            allAvailableClasses={allAvailableClasses}
                            cycles={cycles}
                            subjects={subjects}
                            roles={roles}
                            onSave={(data) => {
                                const staffMember: StaffMember = {
                                    ...data,
                                    matricule: generateStaffMatricule()
                                };
                                updateSettings({ ...settings, staff: [...staffList, staffMember] });
                                alert(`Personnel ajouté ! Matricule : ${staffMember.matricule}`);
                                setNewStaff({ role: roles[0] || 'professeur', assignedClasses: [], nationalite: 'Congolaise' });
                                setActiveTab('liste');
                            }}
                            onCancel={() => setActiveTab('liste')}
                        />
                    </Card>
                </div>
            )}

            {/* Modal de Modification */}
            {editingStaff && (
                <Modal isOpen={!!editingStaff} onClose={() => setEditingStaff(null)} title="Modifier le membre du personnel" maxWidth="max-w-4xl">
                    <StaffForm 
                        initialData={editingStaff} 
                        allAvailableClasses={allAvailableClasses}
                        cycles={cycles}
                        subjects={subjects}
                        roles={roles}
                        onSave={handleUpdateStaff}
                        onCancel={() => setEditingStaff(null)}
                    />
                </Modal>
            )}
        </div>
    );
};

// Composant Interne pour le Formulaire (réutilisable pour Inscription et Edition)
const StaffForm: React.FC<{
    initialData: Partial<StaffMember>,
    allAvailableClasses: string[],
    cycles: Record<string, Cycle>,
    subjects: Record<string, Subject[]>,
    roles: string[],
    onSave: (data: StaffMember) => void,
    onCancel?: () => void
}> = ({ initialData, allAvailableClasses, cycles, subjects, roles, onSave, onCancel }) => {
    const [staff, setStaff] = useState<Partial<StaffMember>>(initialData);
    const [assignments, setAssignments] = useState<TeacherAssignment[]>(initialData.assignments || []);

    const handleSubmit = () => {
        if (!staff.nom || !staff.prenom) return;
        onSave({
            ...staff,
            id: staff.id || `staff_${Date.now()}`,
            nom: staff.nom,
            prenom: staff.prenom,
            role: staff.role || (roles[0] || 'professeur'),
            matricule: staff.matricule || '', 
            assignedClasses: assignments.map(a => a.classe),
            assignments: assignments
        } as StaffMember);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Prénom" value={staff.prenom || ''} onChange={e => setStaff({...staff, prenom: e.target.value})} required />
                <Input label="Nom" value={staff.nom || ''} onChange={e => setStaff({...staff, nom: e.target.value})} required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Select 
                    label="Rôle"
                    value={staff.role}
                    onChange={e => setStaff({...staff, role: e.target.value})}
                    options={roles.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))}
                />
                <Input label="Date de Naissance" type="date" value={staff.dateNaissance || ''} onChange={e => setStaff({...staff, dateNaissance: e.target.value})} />
                <Input label="Nationalité" value={staff.nationalite || ''} onChange={e => setStaff({...staff, nationalite: e.target.value})} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Email Professionnel" type="email" value={staff.email || ''} onChange={e => setStaff({...staff, email: e.target.value})} />
                <Input label="Téléphone" value={staff.telephone || ''} onChange={e => setStaff({...staff, telephone: e.target.value})} />
            </div>

            {staff.role === 'professeur' && (
                <div className="space-y-6">
                    <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                        <h3 className="font-bold mb-4 flex items-center gap-2 dark:text-white">
                            <i className="fas fa-chalkboard-teacher text-blue-600"></i>
                            Assignations des Classes & Matières
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Choisir les classes</p>
                                <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-2">
                                    {allAvailableClasses.map(cls => (
                                        <label key={cls} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                                            assignments.some(a => a.classe === cls) 
                                            ? 'bg-blue-600 text-white border-blue-400 shadow-md' 
                                            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-white/5 text-gray-600 dark:text-gray-300 hover:border-blue-400'
                                        }`}>
                                            <input 
                                                type="checkbox" 
                                                className="hidden"
                                                checked={assignments.some(a => a.classe === cls)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setAssignments([...assignments, { classe: cls, subjects: [] }]);
                                                    else setAssignments(assignments.filter(a => a.classe !== cls));
                                                }}
                                            />
                                            <i className={`fas ${assignments.some(a => a.classe === cls) ? 'fa-check-circle' : 'fa-circle opacity-20'} text-sm`}></i>
                                            <span className="text-sm font-bold">{cls}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Détails des matières</p>
                                {assignments.length === 0 ? (
                                    <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl text-gray-400 italic text-sm text-center p-6">
                                        <i className="fas fa-hand-pointer text-2xl mb-2 opacity-20"></i>
                                        <p>Sélectionnez une classe à gauche.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                                        {assignments.map(assignment => {
                                            const cycle = Object.values(cycles).find(cy => cy.levels.some(lvl => assignment.classe.startsWith(lvl)));
                                            const isPrimary = cycle?.type === 'simple';
                                            const availableSubjects = subjects[assignment.classe] || [];

                                            return (
                                                <div key={assignment.classe} className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="font-bold text-blue-600">{assignment.classe}</span>
                                                    </div>
                                                    {isPrimary ? (
                                                        <p className="text-xs text-gray-500 italic">Toutes les matières.</p>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {availableSubjects.map((sub: Subject) => (
                                                                <button
                                                                    key={sub.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const isSelected = assignment.subjects.includes(sub.nom);
                                                                        setAssignments(assignments.map(a => a.classe === assignment.classe 
                                                                            ? { ...a, subjects: isSelected ? a.subjects.filter(s => s !== sub.nom) : [...a.subjects, sub.nom] }
                                                                            : a
                                                                        ));
                                                                    }}
                                                                    className={`px-2 py-1 rounded text-[10px] font-bold border ${assignment.subjects.includes(sub.nom) ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-gray-50 dark:bg-white/5 dark:text-gray-400'}`}
                                                                >
                                                                    {sub.nom}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-4 pt-8 border-t dark:border-white/10">
                {onCancel && <Button variant="secondary" onClick={onCancel}>Annuler</Button>}
                <Button onClick={handleSubmit} disabled={!staff.nom || !staff.prenom}>
                    {staff.id ? "Mettre à jour" : "Enregistrer"}
                </Button>
            </div>
        </div>
    );
};
