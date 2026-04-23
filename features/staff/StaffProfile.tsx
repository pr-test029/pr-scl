
import React, { useState } from 'react';
import { Card, Input, Button } from '../../components/ui/Common';
import { useSchool } from '../../App';
import { StaffMember } from '../../types';
import * as api from '../../services/firebase';
import { THEME_HEX_COLORS } from '../../constants';

export const StaffProfile: React.FC = () => {
    const { session, settings, updateSettings, logout, updateLocalTheme, updateLocalMode, localTheme, localMode } = useSchool();
    
    // Find current staff member in settings
    const currentStaff = settings.staff?.find(s => s.matricule === session?.matricule);
    
    const [localInfo, setLocalInfo] = useState<Partial<StaffMember>>(currentStaff || {
        nom: session?.display_name?.split(' ')[1] || '',
        prenom: session?.display_name?.split(' ')[0] || '',
        email: session?.email || '',
    });
    const [loading, setLoading] = useState(false);

    if (!currentStaff && session?.role !== 'dirigeant') {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500">Profil introuvable. Veuillez contacter l'administrateur.</p>
                <Button onClick={logout} className="mt-4">Se déconnecter</Button>
            </div>
        );
    }

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const updatedStaffList = settings.staff.map(s => 
                s.matricule === session?.matricule ? { ...s, ...localInfo } : s
            );
            const updatedSettings = { ...settings, staff: updatedStaffList };
            
            updateSettings(updatedSettings);
            alert("Profil mis à jour avec succès !");
        } catch (error) {
            alert("Erreur lors de la mise à jour.");
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setLocalInfo(prev => ({ ...prev, photo: ev.target?.result as string }));
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <Card title="Mon Profil Personnel">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Photo Section */}
                    <div className="w-full md:w-1/3 flex flex-col items-center gap-4">
                        <div className="relative group">
                            <div className="w-40 h-40 rounded-3xl bg-blue-600 overflow-hidden shadow-2xl ring-4 ring-white dark:ring-white/10 group-hover:ring-blue-400 transition-all">
                                {localInfo.photo ? (
                                    <img src={localInfo.photo} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-6xl text-white font-bold">
                                        {localInfo.prenom?.[0]}{localInfo.nom?.[0]}
                                    </div>
                                )}
                            </div>
                            <label className="absolute bottom-2 right-2 w-10 h-10 bg-white dark:bg-gray-800 rounded-xl shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                                <i className="fas fa-camera text-blue-600"></i>
                                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                            </label>
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-black dark:text-white">{localInfo.prenom} {localInfo.nom}</h2>
                            <p className="text-blue-600 font-bold uppercase tracking-widest text-xs mt-1">{session?.role}</p>
                            <p className="text-gray-400 font-mono text-sm mt-2">{session?.matricule}</p>
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="flex-1 space-y-4 w-full">
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Prénom" value={localInfo.prenom || ''} onChange={e => setLocalInfo({...localInfo, prenom: e.target.value})} />
                            <Input label="Nom" value={localInfo.nom || ''} onChange={e => setLocalInfo({...localInfo, nom: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Email" type="email" value={localInfo.email || ''} onChange={e => setLocalInfo({...localInfo, email: e.target.value})} />
                            <Input label="Téléphone" value={localInfo.telephone || ''} onChange={e => setLocalInfo({...localInfo, telephone: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Date de naissance" type="date" value={localInfo.dateNaissance || ''} onChange={e => setLocalInfo({...localInfo, dateNaissance: e.target.value})} />
                            <Input label="Nationalité" value={localInfo.nationalite || ''} onChange={e => setLocalInfo({...localInfo, nationalite: e.target.value})} />
                        </div>
                        
                        <div className="pt-6 flex justify-between items-center border-t dark:border-white/10">
                            <Button variant="danger" onClick={logout} icon={<i className="fas fa-sign-out-alt"></i>}>Se déconnecter</Button>
                            <Button onClick={handleUpdate} disabled={loading}>{loading ? "Enregistrement..." : "Enregistrer les modifications"}</Button>
                        </div>
                    </div>
                </div>
            </Card>

            <Card title="Préférences d'affichage">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h4 className="font-bold mb-4 dark:text-gray-200">Couleur de l'application</h4>
                        <div className="flex gap-4">
                            {(['blue', 'green', 'purple', 'red'] as const).map(c => (
                                <button
                                    key={c}
                                    onClick={() => updateLocalTheme(c)}
                                    className={`w-12 h-12 rounded-2xl transition-all border-4 ${
                                        (localTheme || settings.theme) === c ? 'border-white dark:border-white/50 scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                                    }`}
                                    style={{ backgroundColor: THEME_HEX_COLORS[c].primary }}
                                    title={c.charAt(0).toUpperCase() + c.slice(1)}
                                />
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4 dark:text-gray-200">Mode d'affichage</h4>
                        <div className="flex gap-4">
                            <button
                                onClick={() => updateLocalMode('light')}
                                className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                                    (localMode || settings.mode) === 'light' 
                                    ? 'bg-white text-blue-600 border-blue-500 font-bold shadow-lg' 
                                    : 'bg-gray-50 text-gray-400 border-transparent dark:bg-white/5'
                                }`}
                            >
                                <i className="fas fa-sun"></i> Clair
                            </button>
                            <button
                                onClick={() => updateLocalMode('dark')}
                                className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                                    (localMode || settings.mode) === 'dark' 
                                    ? 'bg-slate-800 text-white border-blue-400 font-bold shadow-lg' 
                                    : 'bg-gray-50 text-gray-400 border-transparent dark:bg-white/5'
                                }`}
                            >
                                <i className="fas fa-moon"></i> Sombre
                            </button>
                        </div>
                    </div>
                </div>
                <p className="mt-6 text-xs text-gray-400 italic">
                    Note : Ces préférences sont enregistrées localement sur votre appareil et ne modifient pas l'apparence pour les autres utilisateurs.
                </p>
            </Card>

            {currentStaff?.role === 'professeur' && (
                <Card title="Classes Assignées">
                    <div className="flex flex-wrap gap-2">
                        {currentStaff.assignedClasses?.map(cls => (
                            <div key={cls} className="px-4 py-2 bg-blue-50 dark:bg-white/5 border dark:border-white/10 rounded-xl text-blue-700 dark:text-blue-300 font-bold">
                                {cls}
                            </div>
                        ))}
                        {(!currentStaff.assignedClasses || currentStaff.assignedClasses.length === 0) && (
                            <p className="text-gray-500 italic">Aucune classe assignée pour le moment.</p>
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
};
