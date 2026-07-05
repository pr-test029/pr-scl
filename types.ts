
export interface Student {
  id: string;
  matricule: string; // ID unique alphanumérique
  academic_year: string; // Année scolaire (ex: '2025-2026')
  nom: string;
  prenom: string;
  dateNaissance: string;
  genre: string;
  adresse: string;
  ville: string;
  telephone: string;
  email?: string;
  cycle: string;
  classe: string;
  serie?: string;
  photo?: string;
  notes_info?: string;
  dateInscription: string;
  totalPaid: number; // Montant total payé à ce jour
}

export interface Payment {
  id: string;
  studentId: string;
  academic_year: string; // Année scolaire (ex: '2025-2026')
  amount: number;
  date: string;
  method: 'cash' | 'card' | 'wave' | 'mobile_money' | 'check';
  notes?: string;
  recorded_by?: string; // UID de celui qui a encaissé
  recorded_by_name?: string; // Nom de celui qui a encaissé
}

export interface Expense {
  id: string;
  academic_year: string; // Année scolaire
  label: string; // Libellé de la dépense
  amount: number; // Montant de la dépense
  date: string;
  recorded_by?: string; // UID de celui qui a décaissé
  recorded_by_name?: string; // Nom de celui qui a décaissé
}

export interface Grade {
  id: string;
  studentId: string;
  academic_year: string; // Année scolaire (ex: '2025-2026')
  trimestre: string; // '1', '2', '3' ou 'S1', 'S2'
  type: string; // 'devoir', 'composition', 'departemental' ou 'dst', 'session'
  matiere: string;
  valeur: number;
  coefficient: number;
  mention?: string;
  commentaire?: string;
  date?: string;
}

export interface Subject {
  id: string;
  nom: string;
  coefficient: number;
  teacher?: string; // Nom de l'enseignant
}

export interface Classroom {
  id: string;
  name: string;
  capacity?: number;
}

export interface BulletinHeaderSettings {
  republicName?: string;
  republicMotto?: string;
  ministryName?: string;
  departmentalDirection?: string;
  inspectionName?: string;
  schoolLocation?: string;
  schoolMotto?: string;
  appreciationRules?: AppreciationRule[];
}

export interface Cycle {
  id: string;
  name: string;
  type: 'simple' | 'series' | 'specialites';
  levels: string[]; // Ex: ["6ème", "5ème"] ou ["Seconde", "Première"]
  series: string[]; // Ex: ["A", "C", "D"]
  specialites: string[]; // Ex: ["Maths", "Physique"]
  classrooms: Classroom[]; // Salles de classe
  bulletinHeader?: BulletinHeaderSettings; // Configuration de l'entête spécifique au cycle
}

export interface AppreciationRule {
  min: number;
  max: number;
  text: string;
}

export interface BulletinSettings {
  showTeacher: boolean;
  showClassAvg: boolean;
  showAppreciation: boolean;
  customHeaderText?: string; // Texte supplémentaire sous le nom de l'école
  appreciationRules: AppreciationRule[];
  
  // Convention Nationale (Congo-Brazzaville)
  republicName?: string;
  republicMotto?: string;
  ministryName?: string;
  departmentalDirection?: string;
  inspectionName?: string;
  schoolLocation?: string;
  schoolMotto?: string;
}

export interface AccountingSettings {
  classFees: Record<string, number>; // Monthly fee per class ID (9 months assumed)
  registrationFee?: number; // Frais d'inscription globaux
  reRegistrationFee?: number; // Frais de réinscription globaux
}

export type UserRole = 'dirigeant' | 'gestionnaire' | 'eleve' | 'professeur' | 'directeur';

export interface TeacherAssignment {
  classe: string; // Ex: "6ème" or "Terminale C"
  subjects: string[]; // List of subject names. Empty = all subjects (primary school)
}

export interface StaffMember {
  id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  dateNaissance?: string;
  nationalite?: string;
  photo?: string;
  role: string; // Permettre des rôles personnalisés
  matricule: string;
  activeYears?: string[]; // Années scolaires où ce membre est actif
  assignedClasses: string[]; // Kept for quick access/display
  assignments?: TeacherAssignment[]; // Detailed assignments
  assignedCycles?: string[]; // IDs des cycles gérés (pour le rôle directeur)
}

export interface AppSettings {
  appName: string;
  currentAcademicYear: string; // Année scolaire par défaut (ex: '2025-2026')
  availableAcademicYears: string[]; // Liste des années disponibles
  theme: 'blue' | 'green' | 'purple' | 'red';
  mode: 'light' | 'dark';
  logo?: string;
  bulletin: BulletinSettings;
  accounting: AccountingSettings;
  staff: StaffMember[]; // Liste du personnel de l'école
  staffRoles?: string[]; // Liste des rôles personnalisés (ex: Surveillant, Comptable, etc.)
  managerPassword?: string; // Mot de passe pour le rôle Dirigeant
}

export type View = 'dashboard' | 'students' | 'inscription' | 'settings' | 'admin' | 'accounting' | 'student_portal' | 'personnel' | 'profile' | 'evaluation' | 'academic_results';

// Nouveau type pour la session utilisateur
export interface UserSession {
  user_id: string;
  email: string | null;
  display_name: string | null;
  photo_url: string | null;
  school_id: string;
  school_name: string;
  role: UserRole;
  matricule?: string; // Présent pour les élèves et le personnel
  allowed_academic_years: string[]; // Années scolaires que l'utilisateur peut voir
  assignedCycles?: string[]; // IDs des cycles accessibles (pour le rôle directeur)
}

// Type pour les écoles (gestion admin)
export interface School {
  id: string;
  name: string;
  owner_id: string;
  owner_email: string;
  owner_name?: string | null;  // Nom du propriétaire (Google displayName)
  owner_photo?: string | null; // Photo du propriétaire (Google photoURL)
  created_at: Date | null;
  subscription_plan: 'free' | 'monthly' | 'quarterly' | 'annual';
  subscription_expires_at: Date | null;
  subscription_status: 'active' | 'expired' | 'free';
}

export interface SchoolContextType {
  session: UserSession | null;
  school: School | null;
  selectedAcademicYear: string;
  setSelectedAcademicYear: (year: string) => void;
  students: Student[];
  grades: Grade[];
  cycles: Record<string, Cycle>;
  subjects: Record<string, Subject[]>;
  settings: AppSettings;
  payments: Payment[];
  expenses: Expense[];
  addStudent: (student: Student) => void;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  addGrade: (grade: Grade) => void;
  updateGrade: (grade: Grade) => void;
  deleteGrade: (id: string) => void;
  addPayment: (payment: Payment) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  updateSettings: (settings: AppSettings) => void;
  updateCycles: (cycles: Record<string, Cycle>) => void;
  updateSubjects: (className: string, subjects: Subject[]) => void;
  resetData: () => void;
  logout: () => void;
  isAdmin: boolean;
  refreshSchool: () => Promise<void>;
  updateLocalTheme: (theme: string) => void;
  updateLocalMode: (mode: 'light' | 'dark') => void;
  localTheme: string | null;
  localMode: 'light' | 'dark' | null;
}
