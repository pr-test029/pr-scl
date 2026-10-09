// Service de synchronisation et de vérification d'authentification hors ligne
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { generateSalt, hashAuthCode, verifyAuthCode } from './offlineAuthCrypto';
import {
  OfflineCredential,
  saveOfflineCredentialsBatch,
  getOfflineCredential,
  getOfflineCredentialsByRole,
  getOfflineCredentialsBySchool,
  saveOfflineSession,
  getValidOfflineSession,
  clearOfflineSession,
  OFFLINE_SESSION_MAX_DAYS
} from './offlineStore';
import { UserSession, UserRole, AppSettings } from '../types';

/**
 * Synchronise et hache les identifiants de l'école dans IndexedDB lors d'une connexion en ligne.
 * Hache de façon sécurisée (SHA-256 avec Salt unique par compte) :
 * - Le mot de passe dirigeant (s'il existe)
 * - Les matricules du personnel (directeur, gestionnaire, professeur, etc.)
 * - Les matricules des élèves
 */
export const syncSchoolCredentialsOffline = async (schoolId: string): Promise<{ syncedCount: number }> => {
  if (!schoolId) return { syncedCount: 0 };
  console.log(`[OfflineAuth] Début de la synchronisation des identifiants sécurisés pour l'école : ${schoolId}`);

  const credentialsToSave: OfflineCredential[] = [];
  const now = Date.now();

  try {
    // 1. Synchroniser le dirigeant / manager password
    const settingsDocRef = doc(db, 'app_config', `${schoolId}_settings`);
    const settingsSnap = await getDoc(settingsDocRef);
    let managerPassword = '';
    let staffList: any[] = [];

    if (settingsSnap.exists()) {
      const settingsData = settingsSnap.data().data as AppSettings;
      if (settingsData) {
        managerPassword = settingsData.managerPassword || '';
        staffList = settingsData.staff || [];
      }
    }

    // Récupérer le nom de l'école
    const schoolDoc = await getDoc(doc(db, 'schools', schoolId));
    const schoolName = schoolDoc.exists() ? schoolDoc.data().name : 'Mon École';

    // Stocker le credential pour le rôle dirigeant
    // Si un mot de passe est défini, on le hache. Si aucun mot de passe n'est requis, on crée un hash pour un code vide ou "ADMIN".
    const dirigenteSalt = generateSalt();
    const dirigenteCode = managerPassword && managerPassword.trim() !== '' ? managerPassword.trim() : 'DIRIGEANT';
    const dirigenteHash = await hashAuthCode(dirigenteCode, dirigenteSalt);

    credentialsToSave.push({
      id: `${schoolId}_role_dirigeant`,
      schoolId,
      role: 'dirigeant',
      codeHash: dirigenteHash,
      salt: dirigenteSalt,
      displayName: 'Dirigeant / Direction',
      matricule: dirigenteCode,
      syncedAt: now,
    });

    // 2. Synchroniser le personnel (directeurs, gestionnaires, professeurs, etc.)
    for (const member of staffList) {
      if (member.matricule) {
        const staffSalt = generateSalt();
        const staffHash = await hashAuthCode(member.matricule, staffSalt);
        const memberRole = member.role || 'professeur';

        credentialsToSave.push({
          id: `${schoolId}_staff_${member.matricule.trim().toUpperCase()}`,
          schoolId,
          role: memberRole,
          codeHash: staffHash,
          salt: staffSalt,
          displayName: `${member.prenom || ''} ${member.nom || ''}`.trim() || 'Personnel',
          email: member.email,
          photoUrl: member.photo,
          matricule: member.matricule.trim().toUpperCase(),
          assignedCycles: member.assignedCycles || [],
          syncedAt: now,
        });
      }
    }

    // 3. Synchroniser les élèves
    const studentsQ = query(collection(db, 'students'), where('school_id', '==', schoolId));
    const studentsSnap = await getDocs(studentsQ);

    for (const studentDoc of studentsSnap.docs) {
      const student = studentDoc.data();
      if (student.matricule) {
        const studentSalt = generateSalt();
        const studentHash = await hashAuthCode(student.matricule, studentSalt);

        credentialsToSave.push({
          id: `${schoolId}_eleve_${student.matricule.trim().toUpperCase()}`,
          schoolId,
          role: 'eleve',
          codeHash: studentHash,
          salt: studentSalt,
          displayName: `${student.prenom || ''} ${student.nom || ''}`.trim() || 'Élève',
          email: student.email,
          photoUrl: student.photo,
          matricule: student.matricule.trim().toUpperCase(),
          syncedAt: now,
        });
      }
    }

    // Enregistrer en lot dans IndexedDB
    if (credentialsToSave.length > 0) {
      await saveOfflineCredentialsBatch(credentialsToSave);
    }

    // Mettre à jour l'horodatage de la dernière synchronisation en ligne
    localStorage.setItem(`pr_scl_last_auth_sync_${schoolId}`, String(now));
    console.log(`[OfflineAuth] Synchronisation terminée : ${credentialsToSave.length} identifiants sécurisés mis en cache.`);
    return { syncedCount: credentialsToSave.length };
  } catch (error) {
    console.error('[OfflineAuth] Erreur lors de la synchronisation des identifiants hors ligne :', error);
    return { syncedCount: 0 };
  }
};

/**
 * Authentifie un utilisateur hors ligne en comparant le code saisi aux hashes stockés dans la base locale.
 * Valide le rôle et respecte la limite de validité maximale de 15 jours.
 */
export const verifyOfflineAuthCode = async (
  schoolId: string,
  role: UserRole,
  inputCode: string
): Promise<{ success: boolean; session?: UserSession; error?: string; daysRemaining?: number }> => {
  const code = inputCode.trim().toUpperCase();
  if (!code) {
    return { success: false, error: 'Veuillez saisir votre code ou matricule.' };
  }

  // 1. Récupérer les identifiants pour cette école et ce rôle
  let candidates: OfflineCredential[] = [];

  if (role === 'dirigeant') {
    const cred = await getOfflineCredential(`${schoolId}_role_dirigeant`);
    if (cred) candidates.push(cred);
  } else {
    // Chercher par rôle pour cette école
    candidates = await getOfflineCredentialsByRole(schoolId, role);

    // Si pas de match direct (ex: rôle directeur/gestionnaire/professeur regroupé ou variantes)
    if (candidates.length === 0) {
      const allSchoolCreds = await getOfflineCredentialsBySchool(schoolId);
      candidates = allSchoolCreds.filter(c => c.role === role);
    }
  }

  if (candidates.length === 0) {
    return {
      success: false,
      error: `Aucun identifiant hors ligne enregistré pour le rôle "${role}". Une première connexion en ligne est nécessaire.`
    };
  }

  // 2. Tester le code haché par rapport aux candidats
  let matchedCredential: OfflineCredential | null = null;

  for (const candidate of candidates) {
    const isValid = await verifyAuthCode(code, candidate.codeHash, candidate.salt);
    if (isValid) {
      matchedCredential = candidate;
      break;
    }
  }

  if (!matchedCredential) {
    return {
      success: false,
      error: 'Code ou matricule invalide pour ce rôle en mode hors ligne.'
    };
  }

  // 3. Vérifier la validité de synchronisation (15 jours max)
  const now = Date.now();
  const maxValidityMs = OFFLINE_SESSION_MAX_DAYS * 24 * 60 * 60 * 1000;
  const ageMs = now - matchedCredential.syncedAt;

  if (ageMs > maxValidityMs) {
    return {
      success: false,
      error: `Votre session hors ligne a expiré (limite de 15 jours atteinte). Veuillez vous connecter à Internet pour renouveler vos autorisations.`
    };
  }

  const daysRemaining = Math.max(1, Math.ceil((maxValidityMs - ageMs) / (24 * 60 * 60 * 1000)));

  // 4. Créer la session utilisateur
  const schoolName = localStorage.getItem('pr_scl_school_name') || 'Mon École';
  const session: UserSession = {
    user_id: `offline_${matchedCredential.matricule || matchedCredential.role}_${Date.now()}`,
    email: matchedCredential.email || null,
    display_name: matchedCredential.displayName,
    photo_url: matchedCredential.photoUrl || null,
    school_id: schoolId,
    school_name: schoolName,
    role: role,
    matricule: matchedCredential.matricule,
    allowed_academic_years: ['2025-2026'],
    assignedCycles: matchedCredential.assignedCycles
  };

  // 5. Sauvegarder la session avec expiration sous 15 jours
  saveOfflineSession(session, matchedCredential.syncedAt);

  return {
    success: true,
    session,
    daysRemaining
  };
};

export {
  saveOfflineSession,
  getValidOfflineSession,
  clearOfflineSession,
  OFFLINE_SESSION_MAX_DAYS
};
