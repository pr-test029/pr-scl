
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Modal } from '../../components/ui/Common';
import { UserSession, UserRole } from '../../types';
import * as api from '../../services/firebase';

interface LoginScreenProps {
    onLoginSuccess: (session: UserSession) => void;
}

type AuthStep = 'school_login' | 'role_selection' | 'identity_verification';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
    const [step, setStep] = useState<AuthStep>('school_login');
    const [role, setRole] = useState<UserRole | null>(null);
    const [isLogin, setIsLogin] = useState(true);
    
    // School Auth State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [schoolName, setSchoolName] = useState('');
    const [schoolInfo, setSchoolInfo] = useState<{ id: string, name: string } | null>(null);
    
    // Identity State
    const [matricule, setMatricule] = useState('');
    const [identity, setIdentity] = useState<any>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Récupérer la session école existante au chargement
    useEffect(() => {
        const checkExistingSchool = async () => {
            const currentSchoolId = localStorage.getItem('pr_scl_school_id');
            const currentSchoolName = localStorage.getItem('pr_scl_school_name');
            
            if (currentSchoolId && currentSchoolName) {
                setSchoolInfo({ id: currentSchoolId, name: currentSchoolName });
                setStep('role_selection');
            }
        };
        checkExistingSchool();
    }, []);

    // Phase 1: School Connection
    const handleSchoolAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await api.signIn(email, password);
            } else {
                if (!schoolName) throw new Error("Veuillez saisir le nom de votre école.");
                await api.signUp(email, password, schoolName);
            }
            
            const session = await api.fetchUserSession();
            if (session) {
                setSchoolInfo({ id: session.school_id, name: session.school_name });
                localStorage.setItem('pr_scl_school_id', session.school_id);
                localStorage.setItem('pr_scl_school_name', session.school_name);
                setStep('role_selection');
            }
        } catch (err: any) {
            setError(err.message || "Identifiants école incorrects.");
        } finally {
            setLoading(false);
        }
    };

    // Phase 2: Role Chosen
    const handleRoleSelect = (selectedRole: UserRole) => {
        setRole(selectedRole);
        if (selectedRole === 'dirigeant') {
            const user = api.auth.currentUser;
            if (!user || user.isAnonymous) {
                // Not authenticated as owner, need to login again
                setStep('school_login');
            } else {
                finishLogin(selectedRole);
            }
        } else {
            setStep('identity_verification');
        }
    };

    // Phase 3: Identity Verification
    const handleIdentitySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!showConfirmation) {
                const result = await api.findIdentityByMatricule(matricule, schoolInfo?.id);
                if (!result) throw new Error("Matricule non reconnu dans cet établissement.");
                
                // Verify role match
                if (role === 'eleve' && result.type !== 'eleve') throw new Error("Ce matricule n'appartient pas à un élève.");
                if ((role === 'professeur' || role === 'gestionnaire') && result.type !== 'staff') throw new Error("Ce matricule n'appartient pas au personnel.");
                if (role === 'gestionnaire' && result.data.role !== 'gestionnaire') throw new Error("Ce matricule appartient à un professeur.");
                if (role === 'professeur' && result.data.role !== 'professeur') throw new Error("Ce matricule appartient à un gestionnaire.");

                setIdentity(result);
                setShowConfirmation(true);
            } else {
                const session = await api.loginWithMatricule(matricule, schoolInfo?.id);
                if (session) onLoginSuccess(session);
            }
        } catch (err: any) {
            setError(err.message || "Erreur de vérification.");
        } finally {
            setLoading(false);
        }
    };

    const finishLogin = async (finalRole: UserRole) => {
        setLoading(true);
        setError('');
        try {
            const session = await api.fetchUserSession();
            if (session) {
                if (finalRole === 'dirigeant' && session.role !== 'dirigeant' && session.role !== 'admin') {
                    setError("Vous n'avez pas les droits de dirigeant. Veuillez vous reconnecter.");
                    return;
                }
                onLoginSuccess({
                    ...session,
                    role: finalRole
                });
            } else {
                setError("Aucune session trouvée. Veuillez retourner à l'écran de connexion (Changer d'école).");
            }
        } catch (err: any) {
            setError(err.message || "Erreur lors de la récupération de la session.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            await api.signInWithGoogle();
            const session = await api.fetchUserSession();
            if (session) {
                setSchoolInfo({ id: session.school_id, name: session.school_name });
                setStep('role_selection');
            }
        } catch (err: any) {
            setError(err.message || "Erreur Google.");
        } finally {
            setLoading(false);
        }
    };

    // --- RENDERING ---

    if (step === 'school_login') {
        return (
            <div className="flex items-center justify-center p-4 min-h-screen">
                <div className="max-w-md w-full">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-4xl shadow-xl">
                            <i className="fas fa-school"></i>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Portail PR-SCL</h1>
                        <p className="text-gray-500">Connectez-vous au compte de l'établissement</p>
                    </div>

                    <Card className="shadow-2xl border-0 ring-1 ring-gray-200 dark:ring-white/10">
                        <form onSubmit={handleSchoolAuth} className="space-y-5">
                            {!isLogin && (
                                <Input
                                    label="Nom de l'établissement"
                                    placeholder="Ex: Lycée Technique"
                                    value={schoolName}
                                    onChange={e => setSchoolName(e.target.value)}
                                    required
                                />
                            )}
                            <Input
                                type="email"
                                label="Email de l'école"
                                placeholder="ecole@exemple.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                            <Input
                                type="password"
                                label="Mot de passe"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />

                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-200 p-4 rounded-xl text-sm border border-red-200 flex items-center gap-3">
                                    <i className="fas fa-exclamation-circle"></i>
                                    {error}
                                </div>
                            )}

                            <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                                {loading ? <i className="fas fa-spinner fa-spin"></i> : (isLogin ? "Accéder à l'école" : "Créer l'école")}
                            </Button>

                            {isLogin && (
                                <Button type="button" variant="secondary" className="w-full flex items-center justify-center gap-3 h-12" onClick={handleGoogleLogin}>
                                    <i className="fab fa-google text-red-500"></i> Continuer avec Google
                                </Button>
                            )}

                            <div className="text-center pt-4">
                                <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm font-semibold text-blue-600">
                                    {isLogin ? "Nouvel établissement ? S'inscrire" : "Déjà inscrit ? Se connecter"}
                                </button>
                            </div>
                        </form>
                    </Card>
                </div>
            </div>
        );
    }

    if (step === 'role_selection') {
        return (
            <div className="flex items-center justify-center p-4 min-h-screen">
                <div className="max-w-4xl w-full">
                    <div className="text-center mb-12">
                        <h2 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-2">{schoolInfo?.name}</h2>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white">Qui êtes-vous ?</h1>
                        <p className="text-gray-500 mt-2">Sélectionnez votre rôle pour continuer</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <RoleCard icon="user-tie" title="Dirigeant" desc="Gestion totale" onClick={() => handleRoleSelect('dirigeant')} />
                        <RoleCard icon="user-cog" title="Gestionnaire" desc="Inscriptions" onClick={() => handleRoleSelect('gestionnaire')} />
                        <RoleCard icon="chalkboard-teacher" title="Professeur" desc="Suivi classes" onClick={() => handleRoleSelect('professeur')} />
                        <RoleCard icon="user-graduate" title="Élève" desc="Espace élève" onClick={() => handleRoleSelect('eleve')} />
                    </div>

                    <div className="text-center mt-12">
                        <button onClick={() => { 
                            localStorage.removeItem('pr_scl_school_id');
                            localStorage.removeItem('pr_scl_school_name');
                            api.signOut(); 
                            setStep('school_login'); 
                        }} className="text-gray-500 hover:text-red-500 font-medium">
                            <i className="fas fa-sign-out-alt mr-2"></i> Changer d'école
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Step: Identity Verification (Matricule)
    return (
        <div className="flex items-center justify-center p-4 min-h-screen">
            <div className="max-w-md w-full">
                <button 
                    onClick={() => { setStep('role_selection'); setShowConfirmation(false); setIdentity(null); }}
                    className="mb-6 text-gray-500 hover:text-blue-600 flex items-center gap-2 font-medium"
                >
                    <i className="fas fa-arrow-left"></i> Retour
                </button>

                <Card className="shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                            <i className={`fas fa-${role === 'eleve' ? 'user-graduate' : 'user-cog'}`}></i>
                        </div>
                        <h2 className="text-2xl font-bold dark:text-white capitalize">Accès {role}</h2>
                        <p className="text-gray-500">Veuillez vous identifier</p>
                    </div>

                    <form onSubmit={handleIdentitySubmit} className="space-y-5">
                        {!showConfirmation ? (
                            <Input
                                label="Votre Matricule Unique"
                                placeholder="SCL-XXXXXX"
                                value={matricule}
                                onChange={e => setMatricule(e.target.value.toUpperCase())}
                                required
                                className="text-center font-mono text-xl tracking-widest uppercase"
                            />
                        ) : (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl text-center space-y-4">
                                <div className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
                                    {identity.data.prenom[0]}{identity.data.nom[0]}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                                        {identity.data.prenom} {identity.data.nom}
                                    </h3>
                                    <p className="text-sm text-gray-500">Confirmez votre identité</p>
                                </div>
                                <div className="flex gap-3">
                                    <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowConfirmation(false)}>Annuler</Button>
                                    <Button type="submit" className="flex-1">Continuer</Button>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-200 p-4 rounded-xl text-sm border border-red-200">
                                {error}
                            </div>
                        )}

                        {!showConfirmation && (
                            <Button type="submit" className="w-full h-12" disabled={loading}>
                                {loading ? <i className="fas fa-spinner fa-spin"></i> : "Vérifier Matricule"}
                            </Button>
                        )}
                    </form>
                </Card>

                <div className="mt-8 text-center">
                    <button 
                        onClick={() => {
                            localStorage.removeItem('pr_scl_school_id');
                            localStorage.removeItem('pr_scl_school_name');
                            window.location.reload();
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        Quitter l'établissement {schoolInfo?.name}
                    </button>
                </div>
            </div>
        </div>
    );
};

const RoleCard: React.FC<{ icon: string, title: string, desc: string, onClick: () => void }> = ({ icon, title, desc, onClick }) => (
    <button 
        onClick={onClick}
        className="group bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 hover:border-blue-500 hover:shadow-xl transition-all text-center"
    >
        <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center text-2xl mx-auto mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <i className={`fas fa-${icon}`}></i>
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-xs">{desc}</p>
    </button>
);
