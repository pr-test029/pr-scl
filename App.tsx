
import React, { useState, useEffect, useContext, createContext } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import {
  Student, Grade, Cycle, Subject, AppSettings, View, SchoolContextType, UserSession, School, Payment
} from './types';
import {
  INITIAL_CYCLES, INITIAL_SUBJECTS, INITIAL_SETTINGS, THEME_HEX_COLORS
} from './constants';
import * as api from './services/firebase';
import { db, auth } from './services/firebase';

// Feature Components
import { Dashboard } from './features/dashboard/Dashboard';
import { StudentList } from './features/students/StudentList';
import { StudentForm } from './features/students/StudentForm';
import { Settings } from './features/settings/Settings';
import { LoginScreen } from './features/auth/LoginScreen';
import { AdminPanel } from './features/admin/AdminPanel';
import { SubscriptionGuard } from './features/subscription/SubscriptionGuard';
import { Accounting } from './features/accounting/Accounting';
import { StudentPortal } from './features/students/StudentPortal';
import { StaffProfile } from './features/staff/StaffProfile';
import { PersonnelManagement } from './features/staff/PersonnelManagement';
import { Evaluation } from './features/evaluation/Evaluation';
import { Button } from './components/ui/Common';

// Context creation
const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const useSchool = () => {
  const context = useContext(SchoolContext);
  if (!context) throw new Error("useSchool must be used within a SchoolProvider");
  return context;
};

const App: React.FC = () => {
  // Session State
  const [session, setSession] = useState<UserSession | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [localTheme, setLocalTheme] = useState<string | null>(localStorage.getItem('pr_scl_local_theme'));
  const [localMode, setLocalMode] = useState<'light' | 'dark' | null>(localStorage.getItem('pr_scl_local_mode') as any);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [cycles, setCycles] = useState<Record<string, Cycle>>(INITIAL_CYCLES);
  const [subjects, setSubjects] = useState<Record<string, Subject[]>>(INITIAL_SUBJECTS);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Check auth on load
  useEffect(() => {
    const checkSession = async () => {
      const userSession = await api.fetchUserSession();
      if (userSession) {
        setSession(userSession);
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  // Migration and Data Post-Processing
  useEffect(() => {
    if (students.length > 0 && session) {
      const runMigration = async () => {
        const migrated = await api.migrateExistingStudents(students);
        if (migrated) {
          const updatedStudents = await api.fetchStudents();
          setStudents(updatedStudents);
        }
      };
      runMigration();
    }
  }, [students.length, session]);

  useEffect(() => {
    let unsubscribes: (() => void)[] = [];

    const loadRealtimeData = async () => {
      const schoolId = session?.school_id;
      if (!schoolId) return;

      setLoading(true);
      try {
        // School Info
        const schoolDoc = await getDoc(doc(db, "schools", schoolId));
        if (schoolDoc.exists()) {
          const schoolData = schoolDoc.data();
          setSchool({
            id: schoolDoc.id,
            name: schoolData.name,
            owner_id: schoolData.owner_id,
            owner_email: schoolData.owner_email || 'N/A',
            created_at: schoolData.created_at?.toDate() || null,
            subscription_plan: schoolData.subscription_plan || 'free',
            subscription_expires_at: schoolData.subscription_expires_at?.toDate() || null,
            subscription_status: schoolData.subscription_status || 'free'
          } as School);
        }

        // Subscriptions
        unsubscribes.push(api.subscribeToStudents(schoolId, setStudents));
        unsubscribes.push(api.subscribeToGrades(schoolId, setGrades));
        unsubscribes.push(api.subscribeToPayments(schoolId, setPayments));
        unsubscribes.push(api.subscribeToConfig(schoolId, 'settings', INITIAL_SETTINGS, setSettings));
        unsubscribes.push(api.subscribeToConfig(schoolId, 'cycles', INITIAL_CYCLES, setCycles));
        unsubscribes.push(api.subscribeToConfig(schoolId, 'subjects', INITIAL_SUBJECTS, setSubjects));

      } catch (e) {
        console.error("Realtime load error", e);
        setError("Erreur de synchronisation en temps réel.");
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      loadRealtimeData();
    } else {
      setSchool(null);
      setStudents([]);
      setGrades([]);
      setPayments([]);
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [session]);

  const refreshSchool = async () => {
    const user = auth.currentUser;
    if (user) {
      const profileDoc = await getDoc(doc(db, "profiles", user.uid));
      if (profileDoc.exists()) {
        const profileData = profileDoc.data();
        const schoolDoc = await getDoc(doc(db, "schools", profileData.school_id));
        if (schoolDoc.exists()) {
          const schoolData = schoolDoc.data();
          setSchool({
            id: schoolDoc.id,
            name: schoolData.name,
            owner_id: schoolData.owner_id,
            owner_email: schoolData.owner_email || 'N/A',
            created_at: schoolData.created_at?.toDate() || null,
            subscription_plan: schoolData.subscription_plan || 'free',
            subscription_expires_at: schoolData.subscription_expires_at?.toDate() || null,
            subscription_status: schoolData.subscription_status || 'free'
          } as School);
        }
      }
    }
  };

  const handleLoginSuccess = async (newSession: UserSession) => {
    setSession(newSession);
    // Redirection basée sur le rôle
    if (newSession.role === 'admin') {
      setCurrentView('admin');
    } else if (newSession.role === 'eleve') {
      setCurrentView('student_portal');
    } else if (newSession.role === 'professeur') {
      setCurrentView('students');
    } else if (newSession.role === 'gestionnaire') {
      setCurrentView('inscription');
    } else {
      setCurrentView('dashboard');
    }
  };

  // Sécurité : Redirection forcée et protection des vues
  useEffect(() => {
    if (session) {
      if (session.role === 'eleve' && currentView !== 'student_portal' && currentView !== 'profile') {
        setCurrentView('student_portal');
      }
    }
  }, [session, currentView]);

  const handleLogout = async () => {
    // Déconnexion complète : on oublie aussi l'école pour éviter les vérifs auto
    localStorage.removeItem('pr_scl_school_id');
    localStorage.removeItem('pr_scl_school_name');
    await api.signOut();
    setSession(null);
    setCurrentView('dashboard');
  };

  // Actions (Update UI Optimistically + Call DB)
  const addStudent = async (s: Student) => {
    try {
      setStudents(prev => [...prev, s]);
      await api.addStudentDB(s);
    } catch (e: any) {
      console.error("Failed to save student", e);
      alert("Erreur lors de l'enregistrement de l'élève dans la base de données : " + e.message);
      setStudents(prev => prev.filter(p => p.id !== s.id));
    }
  };

  const updateStudent = async (s: Student) => {
    try {
      setStudents(prev => prev.map(p => p.id === s.id ? s : p));
      await api.updateStudentDB(s);
    } catch (e: any) {
      console.error("Failed to update student", e);
      alert("Erreur lors de la modification : " + e.message);
    }
  };

  const deleteStudent = async (id: string) => {
    if (!confirm("Supprimer cet élève ?")) return;
    try {
      const oldStudents = [...students];
      setStudents(prev => prev.filter(p => p.id !== id));
      await api.deleteStudentDB(id);
    } catch (e: any) {
      alert("Erreur lors de la suppression : " + e.message);
    }
  };

  const addGrade = async (g: Grade) => {
    try {
      setGrades(prev => [...prev, g]);
      await api.addGradeDB(g);
    } catch (e: any) {
      alert("Erreur lors de l'ajout de la note : " + e.message);
      setGrades(prev => prev.filter(prevG => prevG.id !== g.id));
    }
  };

  const updateGrade = async (g: Grade) => {
    try {
      setGrades(prev => prev.map(prevG => prevG.id === g.id ? g : prevG));
      await api.updateGradeDB(g);
    } catch (e: any) {
      alert("Erreur lors de la modification de la note : " + e.message);
    }
  };

  const deleteGrade = async (id: string) => {
    try {
      setGrades(prev => prev.filter(g => g.id !== id));
      await api.deleteGradeDB(id);
    } catch (e: any) {
      alert("Erreur lors de la suppression de la note : " + e.message);
    }
  };

  const addPayment = async (p: Payment) => {
    try {
      setPayments(prev => [...prev, p]);
      // Mise à jour optimiste de l'élève
      setStudents(prev => prev.map(s => s.id === p.studentId ? { ...s, totalPaid: (s.totalPaid || 0) + p.amount } : s));
      await api.addPaymentDB(p);
    } catch (e: any) {
      alert("Erreur lors de l'enregistrement du paiement : " + e.message);
    }
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    api.saveSettingsDB(newSettings);
  };

  const handleUpdateCycles = (newCycles: Record<string, Cycle>) => {
    setCycles(newCycles);
    api.saveCyclesDB(newCycles);
  };

  const handleUpdateSubjects = (cls: string, subs: Subject[]) => {
    const newSubjects = { ...subjects, [cls]: subs };
    setSubjects(newSubjects);
    api.saveSubjectsDB(newSubjects);
  };

  const resetData = async () => {
    if (confirm("Êtes-vous sûr de vouloir réinitialiser la base de données de CETTE ÉCOLE ?")) {
      setLoading(true);
      await api.clearDB();

      await api.saveSettingsDB(INITIAL_SETTINGS);
      await api.saveCyclesDB(INITIAL_CYCLES);
      await api.saveSubjectsDB(INITIAL_SUBJECTS);
    }
  };

  const isAdmin = session?.role === 'admin' || session?.email === 'powerfulreach029@gmail.com';

  const contextValue: SchoolContextType = {
    session,
    school,
    students, grades, cycles, subjects, settings, payments,
    addStudent, updateStudent, deleteStudent,
    addGrade, updateGrade, deleteGrade,
    addPayment,
    updateSettings: handleUpdateSettings,
    updateCycles: handleUpdateCycles,
    updateSubjects: handleUpdateSubjects,
    resetData,
    logout: handleLogout,
    isAdmin,
    refreshSchool,
    updateLocalTheme: (t: string) => {
      setLocalTheme(t);
      localStorage.setItem('pr_scl_local_theme', t);
    },
    updateLocalMode: (m: 'light' | 'dark') => {
      setLocalMode(m);
      localStorage.setItem('pr_scl_local_mode', m);
    },
    localTheme,
    localMode
  };

  // Theme Logic (School defaults vs Personal preferences)
  const currentTheme = (session?.role !== 'dirigeant' && localTheme) ? (localTheme as string) : (settings.theme || 'blue');
  const currentMode = (session?.role !== 'dirigeant' && localMode) ? (localMode as any) : (settings.mode || 'light');

  const activeThemeColors = THEME_HEX_COLORS[currentTheme] || THEME_HEX_COLORS.blue;
  const themeStyles = {
    '--primary-color': activeThemeColors.primary,
    '--primary-hover': activeThemeColors.hover,
  } as React.CSSProperties;

  // Render Login Screen if not connected
  if (!session && !loading) {
    return (
      <div
        className={`min-h-screen transition-all duration-300 ${currentMode === 'dark' ? 'dark starry-bg text-gray-100' : 'bg-gray-100 text-gray-800'}`}
        style={themeStyles}
      >
        <div className="relative z-10 min-h-screen">
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${currentMode === 'dark' ? 'dark starry-bg' : 'bg-gray-100'}`}>
        <div className="flex flex-col items-center relative z-10">
          <div className="w-16 h-16 border-4 border-[var(--primary-color)] border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_var(--primary-color)]"></div>
          <h2 className="text-xl font-bold text-gray-700 dark:text-white drop-shadow-md">Chargement...</h2>
        </div>
      </div>
    );
  }

  // Error Screen with Retry
  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${currentMode === 'dark' ? 'dark starry-bg' : 'bg-gray-100'}`} style={themeStyles}>
        <div className="bg-white dark:bg-slate-900/80 dark:glass-card p-8 rounded-xl shadow-xl max-w-md text-center relative z-10 border dark:border-white/10">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-wifi text-red-500 text-2xl"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Erreur de connexion</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={handleLogout}>Se déconnecter</Button>
            <Button variant="primary" onClick={() => window.location.reload()} icon={<i className="fas fa-sync-alt"></i>}>Réessayer</Button>
          </div>
        </div>
      </div>
    );
  }

  // On ne retourne plus en mode "early exit" pour l'AdminPanel pour garder le menu latéral


  return (
    <SchoolContext.Provider value={contextValue}>
      <div
        className={`min-h-screen transition-all duration-300 ${currentMode === 'dark' ? 'dark starry-bg text-gray-100' : 'bg-gray-100 text-gray-800'}`}
        style={themeStyles}
      >
        <SubscriptionGuard school={school} isAdmin={isAdmin}>
          <div className="flex flex-col md:flex-row font-sans min-h-screen relative z-10">

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 w-full z-50 h-16 bg-[var(--primary-color)] dark:bg-slate-900/90 dark:backdrop-blur-xl text-white px-5 flex justify-between items-center shadow-lg border-b dark:border-white/10 transition-all">
              <div className="flex items-center gap-3 font-bold text-lg tracking-tight">
                <div className="p-1 bg-white rounded-lg shadow-inner">
                  {settings.logo ? <img src={settings.logo} className="h-6 w-6 object-contain" /> : <i className="fas fa-graduation-cap text-[var(--primary-color)]"></i>}
                </div>
                <span className="truncate max-w-[150px]">{settings.appName}</span>
              </div>
              <button 
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-all" 
                onClick={() => {
                  const nav = document.getElementById('mobile-nav');
                  const overlay = document.getElementById('mobile-overlay');
                  nav?.classList.remove('-translate-x-full');
                  overlay?.classList.remove('hidden');
                }}
              >
                <i className="fas fa-bars text-xl"></i>
              </button>
            </div>

            {/* Mobile Navigation Drawer Overlay */}
            <div 
              id="mobile-overlay"
              className="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden transition-opacity"
              onClick={() => {
                const nav = document.getElementById('mobile-nav');
                const overlay = document.getElementById('mobile-overlay');
                nav?.classList.add('-translate-x-full');
                overlay?.classList.add('hidden');
              }}
            ></div>

            {/* Combined Sidebar/Drawer Navigation */}
            <nav 
              id="mobile-nav" 
              className={`fixed md:sticky top-0 left-0 h-screen z-[70] md:z-40 transition-all duration-350 ease-[cubic-bezier(0.4,0,0.2,1)] bg-[var(--primary-color)] dark:bg-slate-900/95 dark:backdrop-blur-2xl text-white shadow-2xl md:shadow-xl border-r dark:border-white/10 flex flex-col
                ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'} 
                -translate-x-full md:translate-x-0 w-[280px]`}
            >
              <div className="p-6 border-b border-white/10 hidden md:flex items-center justify-between overflow-hidden h-20">
                <div className={`flex items-center gap-3 font-bold text-xl tracking-tight transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0 scale-0' : 'opacity-100 w-auto scale-100'}`}>
                  {settings.logo ? <img src={settings.logo} className="h-10 w-10 object-contain bg-white rounded-xl p-1.5 shadow-lg" /> : <i className="fas fa-graduation-cap text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"></i>}
                  <span className="dark:text-white truncate">{settings.appName}</span>
                </div>
                <button 
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 transition-all shadow-inner"
                  title={isSidebarCollapsed ? "Déplier" : "Replier"}
                >
                  <i className={`fas ${isSidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-sm`}></i>
                </button>
              </div>

              {/* Mobile Only Header inside Drawer */}
              <div className="md:hidden p-6 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3 font-bold text-xl">
                   <i className="fas fa-graduation-cap text-white"></i>
                   <span>Menu</span>
                </div>
                <button onClick={() => {
                  document.getElementById('mobile-nav')?.classList.add('-translate-x-full');
                  document.getElementById('mobile-overlay')?.classList.add('hidden');
                }} className="text-white/60 hover:text-white p-2"><i className="fas fa-times text-xl"></i></button>
              </div>

              <div className="flex-1 py-6 space-y-1.5 px-3 overflow-y-auto custom-scrollbar">
                {session?.role === 'eleve' && (
                  <NavItem icon="fa-user-graduate" label="Mon Portail" active={currentView === 'student_portal'} collapsed={isSidebarCollapsed} onClick={() => setCurrentView('student_portal')} />
                )}
                
                {(session?.role === 'dirigeant' || session?.role === 'admin') && (
                  <NavItem icon="fa-chart-pie" label="Tableau de bord" active={currentView === 'dashboard'} collapsed={isSidebarCollapsed} onClick={() => setCurrentView('dashboard')} />
                )}
                
                {(session?.role === 'dirigeant' || session?.role === 'gestionnaire') && (
                  <NavItem icon="fa-user-plus" label="Inscription" active={currentView === 'inscription'} collapsed={isSidebarCollapsed} onClick={() => setCurrentView('inscription')} />
                )}
                
                {['dirigeant', 'gestionnaire', 'professeur', 'admin'].includes(session?.role || '') && (
                  <NavItem icon="fa-users" label="Liste des élèves" active={currentView === 'students'} collapsed={isSidebarCollapsed} onClick={() => setCurrentView('students')} />
                )}
                
                {(session?.role === 'dirigeant' || session?.role === 'gestionnaire') && (
                  <NavItem icon="fa-wallet" label="Comptabilité" active={currentView === 'accounting'} collapsed={isSidebarCollapsed} onClick={() => setCurrentView('accounting')} />
                )}

                {(session?.role === 'dirigeant' || session?.role === 'gestionnaire' || session?.role === 'admin') && (
                  <NavItem icon="fa-chart-line" label="Suivi & Éval." active={currentView === 'evaluation'} collapsed={isSidebarCollapsed} onClick={() => setCurrentView('evaluation')} />
                )}
                
                {(session?.role === 'dirigeant' || session?.role === 'admin') && (
                  <NavItem icon="fa-users-cog" label="Personnel" active={currentView === 'personnel'} collapsed={isSidebarCollapsed} onClick={() => setCurrentView('personnel')} />
                )}
                
                {(session?.role === 'dirigeant' || session?.role === 'admin') && (
                  <NavItem icon="fa-cogs" label="Paramètres" active={currentView === 'settings'} collapsed={isSidebarCollapsed} onClick={() => setCurrentView('settings')} />
                )}

                {session?.role !== 'eleve' && session?.role !== 'admin' && session?.role !== 'dirigeant' && (
                  <NavItem icon="fa-user-circle" label="Mon Profil" active={currentView === 'profile'} collapsed={isSidebarCollapsed} onClick={() => setCurrentView('profile')} />
                )}

                {isAdmin && (
                  <NavItem icon="fa-shield-alt" label="Administration" active={currentView === 'admin'} collapsed={isSidebarCollapsed} onClick={() => setCurrentView('admin')} />
                )}
              </div>

              <div className={`p-6 border-t border-white/10 transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 h-0 p-0 overflow-hidden' : 'opacity-100'}`}>
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
                   <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-lg shadow-lg">
                      {session?.display_name?.[0]}
                   </div>
                   <div className="overflow-hidden">
                      <p className="font-bold text-sm truncate">{session?.display_name}</p>
                      <p className="text-[10px] text-white/50 uppercase tracking-widest">{session?.role}</p>
                   </div>
                </div>
              </div>
            </nav>

            {/* Main Content */}
            <main className={`flex-1 w-full pt-16 md:pt-0 min-h-screen transition-all duration-300`}>
              <div className="p-4 md:p-10 max-w-7xl mx-auto pb-24 safe-area-bottom">
                <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="animate-fade-in">
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                      {currentView === 'dashboard' && 'Tableau de bord'}
                      {currentView === 'inscription' && 'Inscription'}
                      {currentView === 'students' && 'Élèves'}
                      {currentView === 'accounting' && 'Comptabilité'}
                      {currentView === 'settings' && 'Paramètres'}
                      {currentView === 'student_portal' && 'Mon Portail'}
                      {currentView === 'personnel' && 'Personnel'}
                      {currentView === 'profile' && 'Mon Profil'}
                      {currentView === 'admin' && 'Administration'}
                      {currentView === 'evaluation' && 'Suivi & Évaluation'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
                       {currentView === 'dashboard' && `Bienvenue, ${session?.display_name?.split(' ')[0]}`}
                       {currentView !== 'dashboard' && 'Espace de gestion institutionnelle'}
                    </p>
                  </div>
                  <div className="hidden lg:flex items-center gap-4 bg-white dark:bg-white/5 px-5 py-3 rounded-2xl shadow-sm border dark:border-white/10 animate-fade-in">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                      <i className="far fa-calendar-alt"></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Aujourd'hui</p>
                      <span className="text-sm font-bold dark:text-gray-200">{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                </header>

                <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  {currentView === 'dashboard' && (session?.role === 'dirigeant' || session?.role === 'gestionnaire' || session?.role === 'admin') && <Dashboard />}
                  {currentView === 'inscription' && <StudentForm onSuccess={() => setCurrentView('students')} />}
                  {currentView === 'students' && <StudentList />}
                  {currentView === 'accounting' && <Accounting />}
                  {currentView === 'settings' && <Settings />}
                  {currentView === 'student_portal' && <StudentPortal />}
                  {currentView === 'personnel' && <PersonnelManagement />}
                  {currentView === 'profile' && <StaffProfile />}
                  {currentView === 'admin' && isAdmin && <AdminPanel onBack={() => setCurrentView('dashboard')} userRole={session?.role} />}
                  {currentView === 'evaluation' && <Evaluation />}
                </div>
              </div>
            </main>
          </div>
        </SubscriptionGuard>
      </div>
    </SchoolContext.Provider>
  );
};

const NavItem: React.FC<{ icon: string; label: string; active: boolean; collapsed?: boolean; onClick: () => void }> = ({ icon, label, active, collapsed, onClick }) => (
  <button
    onClick={() => {
      onClick();
      if (window.innerWidth < 768) {
          document.getElementById('mobile-nav')?.classList.add('-translate-x-full');
          document.getElementById('mobile-overlay')?.classList.add('hidden');
      }
    }}
    title={collapsed ? label : undefined}
    className={`w-full flex items-center transition-all duration-300 text-left relative group ${collapsed ? 'justify-center px-0 py-4' : 'px-4 py-3.5 gap-4'} rounded-2xl ${active ? 'bg-white text-[var(--primary-color)] font-black shadow-lg scale-[1.02]' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
  >
    {active && !collapsed && <div className="absolute left-0 w-1.5 h-6 bg-[var(--primary-color)] rounded-r-full"></div>}
    <i className={`fas ${icon} w-6 text-center text-lg transition-transform group-hover:scale-110 ${active ? 'text-[var(--primary-color)]' : 'opacity-70'}`}></i>
    {!collapsed && <span className="truncate tracking-tight">{label}</span>}
    {active && collapsed && <div className="absolute right-0 w-1.5 h-6 bg-[var(--primary-color)] rounded-l-full"></div>}
  </button>
);

export default App;
