
import { initializeApp } from "firebase/app";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from "firebase/auth";
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
    enableIndexedDbPersistence
} from "firebase/firestore";
import { Student, Grade, AppSettings, Cycle, Subject, UserSession } from '../types';
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
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
    } else if (err.code === 'unimplemented-extension') {
        console.warn("The current browser doesn't support all of the features needed to enable persistence.");
    }
});

const googleProvider = new GoogleAuthProvider();

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

    // Créer l'école
    await setDoc(doc(db, "schools", schoolId), {
        name: schoolName,
        owner_id: user.uid,
        created_at: serverTimestamp()
    });

    // Créer le profil utilisateur
    await setDoc(doc(db, "profiles", user.uid), {
        school_id: schoolId,
        email: user.email
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

export const signOut = async () => {
    await firebaseSignOut(auth);
    currentSchoolId = null;
    currentSchoolName = null;
    localStorage.removeItem('pr_scl_school_id');
    localStorage.removeItem('pr_scl_school_name');
};

export const fetchUserSession = async (): Promise<UserSession | null> => {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe();
            if (!user) {
                console.log("fetchUserSession: No user authenticated");
                localStorage.removeItem('pr_scl_school_id');
                localStorage.removeItem('pr_scl_school_name');
                resolve(null);
                return;
            }

            try {
                const profileDoc = await getDoc(doc(db, "profiles", user.uid));
                if (!profileDoc.exists()) {
                    console.warn("fetchUserSession: Profile not found for UID", user.uid);
                    resolve(null);
                    return;
                }

                const profileData = profileDoc.data();
                currentSchoolId = profileData.school_id;

                const schoolDoc = await getDoc(doc(db, "schools", currentSchoolId!));
                currentSchoolName = schoolDoc.exists() ? schoolDoc.data().name : "Mon École";

                // Persistance locale sécurisée
                localStorage.setItem('pr_scl_school_id', currentSchoolId!);
                localStorage.setItem('pr_scl_school_name', currentSchoolName!);
                localStorage.setItem('pr_scl_user_uid', user.uid); // Track current UID

                console.log("fetchUserSession: Session established for", currentSchoolName);

                resolve({
                    user_id: user.uid,
                    email: user.email!,
                    school_id: currentSchoolId!,
                    school_name: currentSchoolName!
                });
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
    const cachedUid = localStorage.getItem('pr_scl_user_uid');
    if (currentSchoolId && cachedUid === auth.currentUser?.uid) return currentSchoolId;

    const session = await fetchUserSession();
    return session?.school_id || null;
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

export const addStudentDB = async (student: Student) => {
    const schoolId = await ensureSchoolId();
    if (!schoolId) {
        console.warn("addStudentDB: No schoolId found");
        return;
    }
    try {
        // Namespace l'ID du document pour éviter les collisions entre écoles
        const docId = `${schoolId}_${student.id}`;
        const dataToSave = {
            ...student,
            school_id: schoolId,
            id: student.id
        };

        // Log de taille si photo présente
        if (student.photo && student.photo.length > 500000) {
            console.warn("Large photo detected:", student.photo.length, "chars");
        }

        await setDoc(doc(db, "students", docId), cleanData(dataToSave));
    } catch (error) {
        console.error("addStudentDB Error:", error);
        throw error;
    }
};

export const updateStudentDB = async (student: Student) => {
    const schoolId = await ensureSchoolId();
    if (!schoolId) return;
    const docId = `${schoolId}_${student.id}`;
    await updateDoc(doc(db, "students", docId), cleanData(student));
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
