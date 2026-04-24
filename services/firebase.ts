
import { initializeApp } from "firebase/app";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signInAnonymously
} from "firebase/auth";

export { signInAnonymously };
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp,
    writeBatch,
    enableIndexedDbPersistence,
    onSnapshot,
    orderBy,
    Timestamp,
    limit
} from "firebase/firestore";
import { Student, Grade, AppSettings, Cycle, Subject, UserSession, School, Payment } from '../types';
import { INITIAL_CYCLES, INITIAL_SUBJECTS, INITIAL_SETTINGS } from '../constants';

// --- CONFIGURATION FIREBASE RÉELLE ---
const firebaseConfig = {
    apiKey: "AIzaSyAW5yXw_vBhe_pheA3wyCLcJs_k-f_eTEo",
    authDomain: "pr-scl-cluster-2026.firebaseapp.com",
    projectId: "pr-scl-cluster-2026",
    storageBucket: "pr-scl-cluster-2026.firebasestorage.app",
    messagingSenderId: "954480116911",
    appId: "1:954480116911:web:042940fb0b9c0579f0405a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Activer la persistance offline pour éviter les pertes de données au rafraîchissement
/*
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
    } else if (err.code === 'unimplemented-extension') {
        console.warn("The current browser doesn't support all of the features needed to enable persistence.");
    }
});
*/

const googleProvider = new GoogleAuthProvider();

// Email de l'administrateur
const ADMIN_EMAIL = 'powerfulreach029@gmail.com';

// Vérifier si l'utilisateur est admin
export const isAdmin = (email: string | null | undefined): boolean => {
    return email === ADMIN_EMAIL;
};

// Variable locale persistée pour stocker l'ID de l'école
let currentSchoolId: string | null = localStorage.getItem('pr_scl_school_id');
let currentSchoolName: string | null = localStorage.getItem('pr_scl_school_name');

// Utilitaire pour nettoyer les objets des valeurs 'undefined' qui font planter Firestore
const cleanData = (obj: any): any => {
    const newObj: any = Array.isArray(obj) ? [] : {};
    Object.keys(obj).forEach(key => {
        if (obj[key] === undefined) return;
        if (obj[key] !== null && typeof obj[key] === 'object') {
            newObj[key] = cleanData(obj[key]);
        } else {
            newObj[key] = obj[key];
        }
    });
    return newObj;
};

// --- AUTHENTIFICATION ---

const setupNewSchoolProfile = async (user: any, schoolName: string) => {
    // Générer un ID d'école unique
    const schoolId = `school_${user.uid}`;

    // Créer l'école avec les champs d'abonnement
    await setDoc(doc(db, "schools", schoolId), {
        name: schoolName,
        owner_id: user.uid,
        owner_email: user.email,
        created_at: serverTimestamp(),
        subscription_plan: 'free',
        subscription_expires_at: null,
        subscription_status: 'free'
    });

    // Créer le profil utilisateur avec rôle et informations Google
    await setDoc(doc(db, "profiles", user.uid), {
        school_id: schoolId,
        email: user.email,
        display_name: user.displayName || null,
        photo_url: user.photoURL || null,
        role: 'dirigeant', // Le créateur est toujours dirigeant
        created_at: serverTimestamp()
    });

    currentSchoolId = schoolId;
    currentSchoolName = schoolName;
    localStorage.setItem('pr_scl_school_id', schoolId);
    localStorage.setItem('pr_scl_school_name', schoolName);
    return schoolId;
};

export const signUp = async (email: string, password: string, schoolName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await setupNewSchoolProfile(userCredential.user, schoolName);
    return userCredential.user;
};

export const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
};

export const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Vérifier si le profil existe déjà
    const profileDoc = await getDoc(doc(db, "profiles", user.uid));
    if (!profileDoc.exists()) {
        // Si c'est un nouvel utilisateur via Google, on crée une école par défaut
        await setupNewSchoolProfile(user, "Mon École Google");
    }
    return user;
};

// Vérifier l'abonnement d'une école
export const checkSchoolSubscription = async (schoolId: string, currentUserEmail?: string | null): Promise<{ isExpired: boolean, daysRemaining: number | null, ownerEmail?: string }> => {
    try {
        // Exemption globale pour l'admin maître
        if (currentUserEmail === ADMIN_EMAIL) {
            return { isExpired: false, daysRemaining: 999 };
        }

        const schoolDoc = await getDoc(doc(db, "schools", schoolId));
        if (!schoolDoc.exists()) return { isExpired: true, daysRemaining: null };
        
        const school = schoolDoc.data();
        
        // Exemption si l'école appartient à l'admin (cas où l'école est la sienne)
        if (school.owner_email === ADMIN_EMAIL) {
            return { isExpired: false, daysRemaining: 999, ownerEmail: school.owner_email };
        }
        
        const now = new Date();
        let isExpired = false;
        let daysRemaining: number | null = null;

        // Si le statut est explicitement 'active', on vérifie la date
        if (school.subscription_status === 'active') {
            if (!school.subscription_expires_at) {
                // Par sécurité, si c'est 'active' mais pas de date, on laisse passer (ou on met une date par défaut)
                isExpired = false;
                daysRemaining = 30;
            } else {
                const expiryDate = school.subscription_expires_at.toDate();
                const timeDiff = expiryDate.getTime() - now.getTime();
                daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                isExpired = daysRemaining <= 0;
            }
        } else {
            // Pour tous les autres statuts (free, expired, null), on bloque
            isExpired = true;
        }

        return { isExpired, daysRemaining, ownerEmail: school.owner_email };
    } catch (error) {
        console.error("checkSchoolSubscription error:", error);
        return { isExpired: true, daysRemaining: null };
    }
};

// Recherche d'identité (Élève ou Personnel) par matricule
export const findIdentityByMatricule = async (matriculeInput: string, schoolId?: string): Promise<{ type: 'eleve' | 'staff', data: any, schoolId: string } | null> => {
    const matricule = matriculeInput.trim();
    console.log("findIdentityByMatricule: Début de recherche pour", matricule, schoolId ? `dans l'école ${schoolId}` : "globale");
    try {
        // S'assurer qu'on est authentifié (même anonymement) pour passer les règles de sécurité
        if (!auth.currentUser) {
            console.log("findIdentityByMatricule: Pas d'utilisateur, tentative de connexion anonyme...");
            await signInAnonymously(auth);
            console.log("findIdentityByMatricule: Connecté anonymement sous UID", auth.currentUser?.uid);
        } else {
            console.log("findIdentityByMatricule: Utilisateur déjà connecté sous UID", auth.currentUser?.uid);
        }

        // 1. Chercher dans les élèves
        let studentsQ = query(collection(db, "students"), where("matricule", "==", matricule));
        if (schoolId) {
            studentsQ = query(collection(db, "students"), where("school_id", "==", schoolId), where("matricule", "==", matricule));
        }
        
        const studentsSnap = await getDocs(studentsQ);
        if (!studentsSnap.empty) {
            const student = studentsSnap.docs[0].data();
            console.log("findIdentityByMatricule: Élève trouvé", student.prenom);
            return { type: 'eleve', data: student, schoolId: student.school_id };
        }

        // 2. Chercher dans le personnel
        console.log("findIdentityByMatricule: Recherche dans le personnel...");
        let staffQ;
        if (schoolId) {
            // Si on a l'école, on cherche directement son document de config
            const docRef = doc(db, "app_config", `${schoolId}_settings`);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const settings = docSnap.data().data as AppSettings;
                const staffMember = settings.staff?.find(s => s.matricule === matricule);
                if (staffMember) {
                    return { type: 'staff', data: staffMember, schoolId: schoolId };
                }
            }
        } else {
            // Recherche globale (fallback)
            staffQ = query(collection(db, "app_config"), where("key", "==", "settings"), limit(100));
            const staffSnap = await getDocs(staffQ);
            for (const docSnap of staffSnap.docs) {
                const settings = docSnap.data().data as AppSettings;
                const staffMember = settings.staff?.find(s => s.matricule === matricule);
                if (staffMember) {
                    console.log("findIdentityByMatricule: Personnel trouvé", staffMember.prenom);
                    return { type: 'staff', data: staffMember, schoolId: docSnap.data().school_id };
                }
            }
        }

        console.log("findIdentityByMatricule: Aucune identité trouvée.");
        return null;
    } catch (error) {
        console.error("findIdentityByMatricule Error:", error);
        throw error;
    }
};

export const loginWithMatricule = async (matriculeInput: string, schoolId?: string): Promise<UserSession | null> => {
    const matricule = matriculeInput.trim();
    // 1. Trouver l'identité
    const identity = await findIdentityByMatricule(matricule, schoolId);
    if (!identity) throw new Error("Matricule non trouvé.");

    // 2. Authentification Anonyme Firebase si nécessaire
    // Cela permet d'avoir un request.auth.uid valide pour les règles de sécurité
    let user = auth.currentUser;
    if (!user) {
        const userCredential = await signInAnonymously(auth);
        user = userCredential.user;
    }

    // 3. Créer le document de session dans Firestore pour les règles de sécurité
    // Cela DOIT être fait avant de lire d'autres documents car les règles se basent sur cette session
    const role = identity.type === 'eleve' ? 'eleve' : identity.data.role;
    
    await setDoc(doc(db, "sessions", user.uid), {
        school_id: identity.schoolId,
        role: role,
        matricule: matricule,
        created_at: serverTimestamp()
    });

    // 4. Maintenant que la session est créée, on peut lire les infos de l'école
    const schoolDoc = await getDoc(doc(db, "schools", identity.schoolId));
    const schoolName = schoolDoc.exists() ? schoolDoc.data().name : "Mon École";

    const session: UserSession = {
        user_id: user.uid,
        email: identity.data.email || null,
        display_name: `${identity.data.prenom} ${identity.data.nom}`,
        photo_url: identity.data.photo || null,
        school_id: identity.schoolId,
        school_name: schoolName,
        role: role,
        matricule: matricule
    };

    // Stocker localement pour persistance rapide
    localStorage.setItem('pr_scl_matricule_session', JSON.stringify(session));
    localStorage.setItem('pr_scl_school_id', identity.schoolId);
    localStorage.setItem('pr_scl_school_name', schoolName);
    
    return session;
};

export const signOut = async () => {
    await firebaseSignOut(auth);
    // On ne réinitialise PAS currentSchoolId/Name pour permettre le retour au choix des rôles
    localStorage.removeItem('pr_scl_matricule_session');
    localStorage.removeItem('pr_scl_user_uid');
};

// Récupérer le mot de passe dirigeant d'une école (depuis app_config)
export const getSchoolManagerPassword = async (schoolId: string): Promise<string | null> => {
    try {
        const docRef = doc(db, "app_config", `${schoolId}_settings`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const settings = docSnap.data().data as AppSettings;
            return settings.managerPassword || null;
        }
        return null;
    } catch (error) {
        console.error("getSchoolManagerPassword error:", error);
        return null;
    }
};

export const fetchUserSession = async (): Promise<UserSession | null> => {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe();
            if (!user) {
                // Tentative de restauration via localStorage uniquement si Auth est déconnecté
                // (Peut arriver si la session anonyme a expiré mais qu'on a gardé le local)
                const localSession = localStorage.getItem('pr_scl_matricule_session');
                if (localSession) {
                    try {
                        const parsed = JSON.parse(localSession);
                        currentSchoolId = parsed.school_id;
                        currentSchoolName = parsed.school_name;
                        resolve(parsed);
                        return;
                    } catch (e) { resolve(null); return; }
                }
                resolve(null);
                return;
            }

            try {
                if (user.isAnonymous) {
                    // Session Élève / Staff
                    const sessionDoc = await getDoc(doc(db, "sessions", user.uid));
                    const localSession = localStorage.getItem('pr_scl_matricule_session');
                    
                    if (sessionDoc.exists()) {
                        const sessionData = sessionDoc.data();
                        const schoolDoc = await getDoc(doc(db, "schools", sessionData.school_id));
                        const schoolName = schoolDoc.exists() ? schoolDoc.data().name : "Mon École";
                        
                        currentSchoolId = sessionData.school_id;
                        currentSchoolName = schoolName;

                        const session: UserSession = localSession ? JSON.parse(localSession) : {
                            user_id: user.uid,
                            school_id: sessionData.school_id,
                            school_name: schoolName,
                            role: sessionData.role,
                            matricule: sessionData.matricule,
                            display_name: "Utilisateur"
                        };
                        resolve(session);
                        return;
                    }
                } else {
                    // Session Dirigeant
                    const profileDoc = await getDoc(doc(db, "profiles", user.uid));
                    if (profileDoc.exists()) {
                        const profileData = profileDoc.data();
                        const schoolDoc = await getDoc(doc(db, "schools", profileData.school_id));
                        const schoolName = schoolDoc.exists() ? schoolDoc.data().name : "Mon École";
                        
                        currentSchoolId = profileData.school_id;
                        currentSchoolName = schoolName;

                        resolve({
                            user_id: user.uid,
                            email: user.email,
                            display_name: user.displayName || profileData.display_name,
                            photo_url: user.photoURL || profileData.photo_url,
                            school_id: profileData.school_id,
                            school_name: schoolName,
                            role: profileData.role || 'dirigeant'
                        });
                        return;
                    }
                }
                resolve(null);
            } catch (e) {
                console.error("fetchUserSession error", e);
                resolve(null);
            }
        });
    });
};

// Fonction interne pour garantir que currentSchoolId est chargé avant une opération
const ensureSchoolId = async () => {
    // Vérifier si le cache appartient au bon utilisateur
    const matriculeSession = localStorage.getItem('pr_scl_matricule_session');
    if (matriculeSession) {
        const session = JSON.parse(matriculeSession);
        return session.school_id;
    }

    const cachedUid = localStorage.getItem('pr_scl_user_uid');
    if (currentSchoolId && cachedUid === auth.currentUser?.uid) return currentSchoolId;

    const session = await fetchUserSession();
    return session?.school_id || null;
};

// --- UTILITAIRES ---
export const generateMatricule = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SCL-${result}`;
};

// --- API STUDENTS ---

export const fetchStudents = async (): Promise<Student[]> => {
    const schoolId = await ensureSchoolId();
    if (!schoolId) {
        console.warn("fetchStudents: No schoolId found");
        return [];
    }
    try {
        const q = query(collection(db, "students"), where("school_id", "==", schoolId));
        const querySnapshot = await getDocs(q);
        const students = querySnapshot.docs.map(doc => doc.data() as Student);
        return students;
    } catch (error) {
        console.error("fetchStudents Error:", error);
        return [];
    }
};

export const subscribeToStudents = (schoolId: string, callback: (students: Student[]) => void): (() => void) => {
    const q = query(collection(db, "students"), where("school_id", "==", schoolId));
    return onSnapshot(q, (snapshot) => {
        const students = snapshot.docs.map(doc => doc.data() as Student);
        callback(students);
    }, (error) => {
        console.error("subscribeToStudents Error:", error);
    });
};

export const addStudentDB = async (student: Student) => {
    const schoolId = await ensureSchoolId();
    if (!schoolId) {
        console.warn("addStudentDB: No schoolId found");
        return;
    }
    const docId = `${schoolId}_${student.id}`;
    const dataToSave = {
        ...student,
        school_id: schoolId,
        id: student.id
    };

    try {
        await setDoc(doc(db, "students", docId), cleanData(dataToSave));
    } catch (error: any) {
        // Si l'erreur est liée à la taille du document (limite Firestore de 1Mo)
        if (error.code === 'invalid-argument' || error.message?.includes('too large') || error.code === 'resource-exhausted') {
            console.warn("Données d'élève trop volumineuses (probablement la photo), tentative d'enregistrement sans la photo...");
            
            const fallbackData = { ...dataToSave };
            delete fallbackData.photo;
            
            try {
                await setDoc(doc(db, "students", docId), cleanData(fallbackData));
                alert("Attention : La photo était trop volumineuse et n'a pas été enregistrée. L'élève a tout de même été enregistré sans sa photo.");
            } catch (fallbackError) {
                console.error("Échec de l'enregistrement même sans photo:", fallbackError);
                throw fallbackError;
            }
        } else {
            console.error("addStudentDB Error:", error);
            throw error;
        }
    }
};

export const updateStudentDB = async (student: Student) => {
    const schoolId = await ensureSchoolId();
    if (!schoolId) return;
    const docId = `${schoolId}_${student.id}`;
    try {
        await updateDoc(doc(db, "students", docId), cleanData(student));
    } catch (error: any) {
        if (error.code === 'invalid-argument' || error.message?.includes('too large') || error.code === 'resource-exhausted') {
            console.warn("Mise à jour trop volumineuse, tentative sans la photo...");
            const fallbackData = { ...student };
            delete fallbackData.photo;
            try {
                await updateDoc(doc(db, "students", docId), cleanData(fallbackData));
                alert("Attention : La nouvelle photo était trop volumineuse. Les autres informations ont été mises à jour, mais la photo n'a pas été modifiée.");
            } catch (fallbackError) {
                throw fallbackError;
            }
        } else {
            throw error;
        }
    }
};

export const deleteStudentDB = async (id: string) => {
    const schoolId = await ensureSchoolId();
    if (!schoolId) return;
    const docId = `${schoolId}_${id}`;
    await deleteDoc(doc(db, "students", docId));
};

// --- API GRADES ---

export const fetchGrades = async (): Promise<Grade[]> => {
    const schoolId = await ensureSchoolId();
    if (!schoolId) {
        console.warn("fetchGrades: No schoolId found");
        return [];
    }
    try {
        const q = query(collection(db, "grades"), where("school_id", "==", schoolId));
        const querySnapshot = await getDocs(q);
        const grades = querySnapshot.docs.map(doc => doc.data() as Grade);
        return grades;
    } catch (error) {
        console.error("fetchGrades Error:", error);
        return [];
    }
};

export const subscribeToGrades = (schoolId: string, callback: (grades: Grade[]) => void): (() => void) => {
    const q = query(collection(db, "grades"), where("school_id", "==", schoolId));
    return onSnapshot(q, (snapshot) => {
        const grades = snapshot.docs.map(doc => doc.data() as Grade);
        callback(grades);
    }, (error) => {
        console.error("subscribeToGrades Error:", error);
    });
};

export const addGradeDB = async (grade: Grade) => {
    const schoolId = await ensureSchoolId();
    if (!schoolId) {
        console.warn("addGradeDB: No schoolId found");
        return;
    }
    try {
        const docId = `${schoolId}_${grade.id}`;
        const dataToSave = {
            ...grade,
            school_id: schoolId,
            id: grade.id
        };
        await setDoc(doc(db, "grades", docId), cleanData(dataToSave));
    } catch (error) {
        console.error("addGradeDB Error:", error);
        throw error;
    }
};

export const updateGradeDB = async (grade: Grade) => {
    const schoolId = await ensureSchoolId();
    if (!schoolId) return;
    const docId = `${schoolId}_${grade.id}`;
    await updateDoc(doc(db, "grades", docId), cleanData(grade));
};

export const deleteGradeDB = async (id: string) => {
    const schoolId = await ensureSchoolId();
    if (!schoolId) return;
    const docId = `${schoolId}_${id}`;
    await deleteDoc(doc(db, "grades", docId));
};

// --- API CONFIG ---

const fetchConfig = async <T>(key: string, defaultValue: T): Promise<T> => {
    const schoolId = await ensureSchoolId();
    if (!schoolId) return defaultValue;
    try {
        const docRef = doc(db, "app_config", `${schoolId}_${key}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            console.log(`fetchConfig: Loaded ${key} for school ${schoolId}`);
            return docSnap.data().data as T;
        }
        return defaultValue;
    } catch (error) {
        console.error(`fetchConfig Error (${key}):`, error);
        return defaultValue;
    }
};

const saveConfig = async (key: string, data: any) => {
    const schoolId = await ensureSchoolId();
    if (!schoolId) return;
    try {
        const docRef = doc(db, "app_config", `${schoolId}_${key}`);
        await setDoc(docRef, { school_id: schoolId, key, data: cleanData(data) });
        console.log(`saveConfig: Saved ${key} for school ${schoolId}`);
    } catch (error) {
        console.error(`saveConfig Error (${key}):`, error);
        throw error;
    }
};

export const fetchSettings = () => fetchConfig<AppSettings>('settings', INITIAL_SETTINGS);
export const saveSettingsDB = (settings: AppSettings) => saveConfig('settings', settings);
export const fetchCycles = () => fetchConfig<Record<string, Cycle>>('cycles', INITIAL_CYCLES);
export const saveCyclesDB = (cycles: Record<string, Cycle>) => saveConfig('cycles', cycles);
export const fetchSubjects = () => fetchConfig<Record<string, Subject[]>>('subjects', INITIAL_SUBJECTS);
export const saveSubjectsDB = (subjects: Record<string, Subject[]>) => saveConfig('subjects', subjects);

export const subscribeToConfig = <T>(schoolId: string, key: string, defaultValue: T, callback: (data: T) => void): (() => void) => {
    const docRef = doc(db, "app_config", `${schoolId}_${key}`);
    return onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
            callback(snap.data().data as T);
        } else {
            callback(defaultValue);
        }
    }, (error) => {
        console.error(`subscribeToConfig Error (${key}):`, error);
    });
};

export const clearDB = async () => {
    if (!currentSchoolId) return;

    // Suppression par lots (Batch) pour plus d'efficacité
    const batch = writeBatch(db);

    const studentsQuery = query(collection(db, "students"), where("school_id", "==", currentSchoolId));
    const studentsSnap = await getDocs(studentsQuery);
    studentsSnap.forEach(snapDoc => batch.delete(snapDoc.ref));

    const gradesQuery = query(collection(db, "grades"), where("school_id", "==", currentSchoolId));
    const gradesSnap = await getDocs(gradesQuery);
    gradesSnap.forEach(snapDoc => batch.delete(snapDoc.ref));

    const configQuery = query(collection(db, "app_config"), where("school_id", "==", currentSchoolId));
    const configSnap = await getDocs(configQuery);
    configSnap.forEach(snapDoc => batch.delete(snapDoc.ref));

    await batch.commit();
};

// --- API ACCOUNTING ---

export const fetchPayments = async (): Promise<Payment[]> => {
    const schoolId = await ensureSchoolId();
    if (!schoolId) return [];
    try {
        const q = query(collection(db, "payments"), where("school_id", "==", schoolId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as Payment);
    } catch (error) {
        console.error("fetchPayments Error:", error);
        return [];
    }
};

export const subscribeToPayments = (schoolId: string, callback: (payments: Payment[]) => void): (() => void) => {
    const q = query(collection(db, "payments"), where("school_id", "==", schoolId));
    return onSnapshot(q, (snapshot) => {
        const payments = snapshot.docs.map(doc => doc.data() as Payment);
        callback(payments);
    }, (error) => {
        console.error("subscribeToPayments Error:", error);
    });
};

export const addPaymentDB = async (payment: Payment) => {
    const schoolId = await ensureSchoolId();
    if (!schoolId) return;
    try {
        const docId = `${schoolId}_${payment.id}`;
        const dataToSave = {
            ...payment,
            school_id: schoolId,
            id: payment.id
        };
        await setDoc(doc(db, "payments", docId), cleanData(dataToSave));
        
        // Update student totalPaid
        const studentDocId = `${schoolId}_${payment.studentId}`;
        const studentDoc = await getDoc(doc(db, "students", studentDocId));
        if (studentDoc.exists()) {
            const currentTotal = studentDoc.data().totalPaid || 0;
            await updateDoc(doc(db, "students", studentDocId), {
                totalPaid: currentTotal + payment.amount
            });
        }
    } catch (error) {
        console.error("addPaymentDB Error:", error);
        throw error;
    }
};

export const migrateExistingStudents = async (students: Student[]): Promise<boolean> => {
    const schoolId = await ensureSchoolId();
    if (!schoolId) return false;

    const studentsToMigrate = students.filter(s => !s.matricule);
    if (studentsToMigrate.length === 0) return false;

    console.log(`Migrating ${studentsToMigrate.length} students...`);
    const batch = writeBatch(db);
    
    studentsToMigrate.forEach(student => {
        const docId = `${schoolId}_${student.id}`;
        batch.update(doc(db, "students", docId), {
            matricule: generateMatricule(),
            totalPaid: student.totalPaid || 0
        });
    });

    await batch.commit();
    return true;
};

// --- API ADMIN ---

// Récupérer toutes les écoles (admin seulement)
export const getAllSchools = async (): Promise<School[]> => {
    try {
        const schoolsQuery = query(collection(db, "schools"));
        const querySnapshot = await getDocs(schoolsQuery);
        const schools = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                owner_id: data.owner_id,
                owner_email: data.owner_email || 'N/A',
                created_at: data.created_at?.toDate() || null,
                subscription_plan: data.subscription_plan || 'free',
                subscription_expires_at: data.subscription_expires_at?.toDate() || null,
                subscription_status: data.subscription_status || 'free'
            } as School;
        });
        return schools;
    } catch (error) {
        console.error("getAllSchools Error:", error);
        return [];
    }
};

// Souscription temps réel aux écoles (admin seulement)
export const subscribeToSchools = (callback: (schools: School[]) => void): (() => void) => {
    const schoolsQuery = query(collection(db, "schools"));

    return onSnapshot(schoolsQuery, (snapshot) => {
        const schools = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                owner_id: data.owner_id,
                owner_email: data.owner_email || 'N/A',
                created_at: data.created_at?.toDate() || null,
                subscription_plan: data.subscription_plan || 'free',
                subscription_expires_at: data.subscription_expires_at?.toDate() || null,
                subscription_status: data.subscription_status || 'free'
            } as School;
        });
        callback(schools);
    }, (error) => {
        console.error("subscribeToSchools Error:", error);
    });
};

// Définir l'abonnement d'une école
export const setSubscription = async (
    schoolId: string,
    plan: 'monthly' | 'quarterly' | 'annual'
): Promise<void> => {
    const now = new Date();
    let expiresAt: Date;

    switch (plan) {
        case 'monthly':
            expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 jours
            break;
        case 'quarterly':
            expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // +90 jours
            break;
        case 'annual':
            expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // +365 jours
            break;
    }

    await updateDoc(doc(db, "schools", schoolId), {
        subscription_plan: plan,
        subscription_expires_at: Timestamp.fromDate(expiresAt),
        subscription_status: 'active'
    });
};

// --- API PROFILES ---

// Interface pour les profils utilisateurs
export interface UserProfile {
    uid: string;
    email: string;
    display_name: string | null;
    photo_url: string | null;
    school_id: string;
    role: 'admin' | 'user';
    created_at: Date | null;
}

// Récupérer tous les profils utilisateurs (admin seulement)
export const getAllUserProfiles = async (): Promise<UserProfile[]> => {
    try {
        const profilesQuery = query(collection(db, "profiles"));
        const querySnapshot = await getDocs(profilesQuery);
        const profiles = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                uid: doc.id,
                email: data.email || 'N/A',
                display_name: data.display_name || null,
                photo_url: data.photo_url || null,
                school_id: data.school_id,
                role: data.role || 'user',
                created_at: data.created_at?.toDate() || null
            } as UserProfile;
        });
        return profiles;
    } catch (error) {
        console.error("getAllUserProfiles Error:", error);
        return [];
    }
};

// Souscription temps réel aux profils (admin seulement)
export const subscribeToUserProfiles = (callback: (profiles: UserProfile[]) => void): (() => void) => {
    const profilesQuery = query(collection(db, "profiles"));

    return onSnapshot(profilesQuery, (snapshot) => {
        const profiles = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                uid: doc.id,
                email: data.email || 'N/A',
                display_name: data.display_name || null,
                photo_url: data.photo_url || null,
                school_id: data.school_id,
                role: data.role || 'user',
                created_at: data.created_at?.toDate() || null
            } as UserProfile;
        });
        callback(profiles);
    }, (error) => {
        console.error("subscribeToUserProfiles Error:", error);
    });
};

// Mettre à jour le rôle d'un utilisateur (admin seulement)
export const updateUserRole = async (userId: string, newRole: 'admin' | 'user'): Promise<void> => {
    await updateDoc(doc(db, "profiles", userId), {
        role: newRole
    });
};
