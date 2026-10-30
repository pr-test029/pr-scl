
import { Cycle, Subject, AppSettings } from './types';

export const INITIAL_CYCLES: Record<string, Cycle> = {
  "primaire": {
    id: "primaire",
    name: "Primaire",
    levels: ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"],
    series: [],
    specialites: [],
    classrooms: [
      { id: "salle_p1", name: "Salle CP" },
      { id: "salle_p2", name: "Salle CE" },
      { id: "salle_p3", name: "Salle CM" }
    ],
    type: "simple",
    maxGrade: 10
  },
  "college": {
    id: "college",
    name: "Collège",
    levels: ["6ème", "5ème", "4ème", "3ème"],
    series: [],
    specialites: [],
    classrooms: [
      { id: "salle_101", name: "Salle 101" },
      { id: "salle_102", name: "Salle 102" }
    ],
    type: "simple",
    maxGrade: 20
  },
  "lycee": {
    id: "lycee",
    name: "Lycée Général",
    levels: ["Seconde", "Première", "Terminale"],
    series: ["A", "C", "D"],
    specialites: [],
    classrooms: [
      { id: "salle_201", name: "Amphi A" },
      { id: "labo_phys", name: "Labo Physique" }
    ],
    type: "series",
    maxGrade: 20
  },
  "lycee_technique": {
    id: "lycee_technique",
    name: "Lycée Technique",
    type: "series",
    levels: ["Seconde", "Première", "Terminale"],
    series: ["G1", "G2", "G3"],
    specialites: [],
    classrooms: [],
    maxGrade: 20
  },
  "universite": {
    id: "universite",
    name: "Université",
    type: "specialites",
    levels: ["Licence 1", "Licence 2", "Licence 3", "Master 1", "Master 2", "Doctorat"],
    series: [],
    specialites: [],
    classrooms: [],
    maxGrade: 20
  }
};

export const INITIAL_SUBJECTS: Record<string, Subject[]> = {
  // --- 1. PRIMAIRE ---
  // CP1 & CP2
  "CP1": [
    { id: "cp1_1", nom: "Dictée", coefficient: 1 },
    { id: "cp1_2", nom: "Copie", coefficient: 1 },
    { id: "cp1_3", nom: "Écriture", coefficient: 1 },
    { id: "cp1_4", nom: "Orthographe", coefficient: 1 },
    { id: "cp1_5", nom: "Grammaire", coefficient: 1 },
    { id: "cp1_6", nom: "Lecture", coefficient: 1 },
    { id: "cp1_7", nom: "Poésie", coefficient: 1 },
    { id: "cp1_8", nom: "Numération", coefficient: 1 },
    { id: "cp1_9", nom: "Opération", coefficient: 1 },
    { id: "cp1_10", nom: "Calcul rapide", coefficient: 1 },
    { id: "cp1_11", nom: "Géométrie", coefficient: 1 },
    { id: "cp1_12", nom: "Problème", coefficient: 1 },
    { id: "cp1_13", nom: "Art plastique", coefficient: 1 }
  ],
  "CP2": [
    { id: "cp2_1", nom: "Dictée", coefficient: 1 },
    { id: "cp2_2", nom: "Copie", coefficient: 1 },
    { id: "cp2_3", nom: "Écriture", coefficient: 1 },
    { id: "cp2_4", nom: "Orthographe", coefficient: 1 },
    { id: "cp2_5", nom: "Grammaire", coefficient: 1 },
    { id: "cp2_6", nom: "Lecture", coefficient: 1 },
    { id: "cp2_7", nom: "Poésie", coefficient: 1 },
    { id: "cp2_8", nom: "Numération", coefficient: 1 },
    { id: "cp2_9", nom: "Opération", coefficient: 1 },
    { id: "cp2_10", nom: "Calcul rapide", coefficient: 1 },
    { id: "cp2_11", nom: "Géométrie", coefficient: 1 },
    { id: "cp2_12", nom: "Problème", coefficient: 1 },
    { id: "cp2_13", nom: "Art plastique", coefficient: 1 }
  ],

  // CE1
  "CE1": [
    { id: "ce1_1", nom: "Dictée", coefficient: 1 },
    { id: "ce1_2", nom: "Question", coefficient: 1 },
    { id: "ce1_3", nom: "Écriture", coefficient: 1 },
    { id: "ce1_4", nom: "Expression écrite", coefficient: 1 },
    { id: "ce1_5", nom: "Orthographe", coefficient: 1 },
    { id: "ce1_6", nom: "Grammaire", coefficient: 1 },
    { id: "ce1_7", nom: "Vocabulaire", coefficient: 1 },
    { id: "ce1_8", nom: "Conjugaison", coefficient: 1 },
    { id: "ce1_9", nom: "Lecture", coefficient: 1 },
    { id: "ce1_10", nom: "Poésie", coefficient: 1 },
    { id: "ce1_11", nom: "Numération", coefficient: 1 },
    { id: "ce1_12", nom: "Opération", coefficient: 1 },
    { id: "ce1_13", nom: "Calcul rapide", coefficient: 1 },
    { id: "ce1_14", nom: "Géométrie", coefficient: 1 },
    { id: "ce1_15", nom: "Mesure", coefficient: 1 },
    { id: "ce1_16", nom: "Problème", coefficient: 1 },
    { id: "ce1_17", nom: "ECMP", coefficient: 1 },
    { id: "ce1_18", nom: "Éducation pour la santé", coefficient: 1 },
    { id: "ce1_19", nom: "Activité d'observation et d'éveil", coefficient: 1 },
    { id: "ce1_20", nom: "Art plastique", coefficient: 1 }
  ],

  // CE2
  "CE2": [
    { id: "ce2_1", nom: "Dictée", coefficient: 1 },
    { id: "ce2_2", nom: "Question", coefficient: 1 },
    { id: "ce2_3", nom: "Écriture", coefficient: 1 },
    { id: "ce2_4", nom: "Expression écrite", coefficient: 1 },
    { id: "ce2_5", nom: "Orthographe", coefficient: 1 },
    { id: "ce2_6", nom: "Grammaire", coefficient: 1 },
    { id: "ce2_7", nom: "Vocabulaire", coefficient: 1 },
    { id: "ce2_8", nom: "Conjugaison", coefficient: 1 },
    { id: "ce2_9", nom: "Lecture", coefficient: 1 },
    { id: "ce2_10", nom: "Poésie", coefficient: 1 },
    { id: "ce2_11", nom: "Numération", coefficient: 1 },
    { id: "ce2_12", nom: "Opération", coefficient: 1 },
    { id: "ce2_13", nom: "Calcul rapide", coefficient: 1 },
    { id: "ce2_14", nom: "Géométrie", coefficient: 1 },
    { id: "ce2_15", nom: "Mesure", coefficient: 1 },
    { id: "ce2_16", nom: "Problème", coefficient: 1 },
    { id: "ce2_17", nom: "Physique-chimie", coefficient: 1 },
    { id: "ce2_18", nom: "SVT", coefficient: 1 },
    { id: "ce2_19", nom: "Technologie", coefficient: 1 },
    { id: "ce2_20", nom: "Initiation à la production", coefficient: 1 },
    { id: "ce2_21", nom: "Histoire-Géo", coefficient: 1 },
    { id: "ce2_22", nom: "Éducation civique", coefficient: 1 },
    { id: "ce2_23", nom: "Éducation morale", coefficient: 1 },
    { id: "ce2_24", nom: "Éducation pour la vie familiale", coefficient: 1 },
    { id: "ce2_25", nom: "Éducation pour la paix", coefficient: 1 },
    { id: "ce2_26", nom: "Éducation pour la santé", coefficient: 1 },
    { id: "ce2_27", nom: "Art plastique", coefficient: 1 }
  ],

  // CM1
  "CM1": [
    { id: "cm1_1", nom: "Dictée", coefficient: 1 },
    { id: "cm1_2", nom: "Question", coefficient: 1 },
    { id: "cm1_3", nom: "Écriture", coefficient: 1 },
    { id: "cm1_4", nom: "Expression écrite", coefficient: 1 },
    { id: "cm1_5", nom: "Orthographe", coefficient: 1 },
    { id: "cm1_6", nom: "Grammaire", coefficient: 1 },
    { id: "cm1_7", nom: "Vocabulaire", coefficient: 1 },
    { id: "cm1_8", nom: "Conjugaison", coefficient: 1 },
    { id: "cm1_9", nom: "Lecture", coefficient: 1 },
    { id: "cm1_10", nom: "Poésie", coefficient: 1 },
    { id: "cm1_11", nom: "Numération", coefficient: 1 },
    { id: "cm1_12", nom: "Opération", coefficient: 1 },
    { id: "cm1_13", nom: "Calcul rapide", coefficient: 1 },
    { id: "cm1_14", nom: "Géométrie", coefficient: 1 },
    { id: "cm1_15", nom: "Mesure", coefficient: 1 },
    { id: "cm1_16", nom: "Proportionnalité", coefficient: 1 },
    { id: "cm1_17", nom: "Problème", coefficient: 1 },
    { id: "cm1_18", nom: "Problème pratique", coefficient: 1 },
    { id: "cm1_19", nom: "Physique-chimie", coefficient: 1 },
    { id: "cm1_20", nom: "SVT", coefficient: 1 },
    { id: "cm1_21", nom: "Technologie", coefficient: 1 },
    { id: "cm1_22", nom: "Initiation à la production", coefficient: 1 },
    { id: "cm1_23", nom: "Histoire-Géo", coefficient: 1 },
    { id: "cm1_24", nom: "Éducation civique", coefficient: 1 },
    { id: "cm1_25", nom: "Éducation morale", coefficient: 1 },
    { id: "cm1_26", nom: "Éducation pour la vie familiale", coefficient: 1 },
    { id: "cm1_27", nom: "Éducation pour la paix", coefficient: 1 },
    { id: "cm1_28", nom: "Éducation pour la santé", coefficient: 1 },
    { id: "cm1_29", nom: "Art plastique", coefficient: 1 }
  ],

  // CM2
  "CM2": [
    { id: "cm2_1", nom: "Dictée", coefficient: 1 },
    { id: "cm2_2", nom: "Question", coefficient: 1 },
    { id: "cm2_3", nom: "Écriture", coefficient: 1 },
    { id: "cm2_4", nom: "Expression écrite", coefficient: 1 },
    { id: "cm2_5", nom: "Question de cours", coefficient: 1 },
    { id: "cm2_6", nom: "Lecture", coefficient: 1 },
    { id: "cm2_7", nom: "Poésie", coefficient: 1 },
    { id: "cm2_8", nom: "Mathématiques", coefficient: 1 },
    { id: "cm2_9", nom: "Calcul rapide", coefficient: 1 },
    { id: "cm2_10", nom: "Physique", coefficient: 1 },
    { id: "cm2_11", nom: "Technologie", coefficient: 1 },
    { id: "cm2_12", nom: "Art plastique", coefficient: 1 }
  ],

  // --- 2. COLLÈGE (6ème à 3ème) ---
  "6ème": [
    { id: "c6_1", nom: "Français", coefficient: 3 },
    { id: "c6_2", nom: "Anglais", coefficient: 2 },
    { id: "c6_3", nom: "Mathématiques", coefficient: 3 },
    { id: "c6_4", nom: "Physique-Chimie", coefficient: 2 },
    { id: "c6_5", nom: "SVT", coefficient: 2 },
    { id: "c6_6", nom: "Histoire-Géo", coefficient: 2 },
    { id: "c6_7", nom: "ECMP", coefficient: 1 },
    { id: "c6_8", nom: "Art plastique", coefficient: 1 },
    { id: "c6_9", nom: "EPS", coefficient: 1 }
  ],
  "5ème": [
    { id: "c5_1", nom: "Français", coefficient: 3 },
    { id: "c5_2", nom: "Anglais", coefficient: 2 },
    { id: "c5_3", nom: "Mathématiques", coefficient: 3 },
    { id: "c5_4", nom: "Physique-Chimie", coefficient: 2 },
    { id: "c5_5", nom: "SVT", coefficient: 2 },
    { id: "c5_6", nom: "Histoire-Géo", coefficient: 2 },
    { id: "c5_7", nom: "ECMP", coefficient: 1 },
    { id: "c5_8", nom: "Art plastique", coefficient: 1 },
    { id: "c5_9", nom: "EPS", coefficient: 1 }
  ],
  "4ème": [
    { id: "c4_1", nom: "Français", coefficient: 3 },
    { id: "c4_2", nom: "Anglais", coefficient: 2 },
    { id: "c4_3", nom: "Mathématiques", coefficient: 3 },
    { id: "c4_4", nom: "Physique-Chimie", coefficient: 2 },
    { id: "c4_5", nom: "SVT", coefficient: 2 },
    { id: "c4_6", nom: "Histoire-Géo", coefficient: 2 },
    { id: "c4_7", nom: "ECMP", coefficient: 1 },
    { id: "c4_8", nom: "Art plastique", coefficient: 1 },
    { id: "c4_9", nom: "EPS", coefficient: 1 }
  ],
  "3ème": [
    { id: "c3_1", nom: "Français", coefficient: 3 },
    { id: "c3_2", nom: "Anglais", coefficient: 2 },
    { id: "c3_3", nom: "Mathématiques", coefficient: 3 },
    { id: "c3_4", nom: "Physique-Chimie", coefficient: 2 },
    { id: "c3_5", nom: "SVT", coefficient: 2 },
    { id: "c3_6", nom: "Histoire-Géo", coefficient: 2 },
    { id: "c3_7", nom: "EPS", coefficient: 1 }
  ],

  // --- 3. LYCÉE (Seconde à Terminale) ---
  // Seconde
  "Seconde": [
    { id: "sec_1", nom: "Français", coefficient: 3 },
    { id: "sec_2", nom: "Anglais", coefficient: 2 },
    { id: "sec_3", nom: "Espagnol", coefficient: 2 },
    { id: "sec_4", nom: "Mathématiques", coefficient: 3 },
    { id: "sec_5", nom: "Physique-Chimie", coefficient: 2 },
    { id: "sec_6", nom: "SVT", coefficient: 2 },
    { id: "sec_7", nom: "Histoire-Géo", coefficient: 2 },
    { id: "sec_8", nom: "Philosophie", coefficient: 2 },
    { id: "sec_9", nom: "EPS", coefficient: 1 }
  ],
  "Seconde A": [
    { id: "sec_a_1", nom: "Français", coefficient: 3 },
    { id: "sec_a_2", nom: "Anglais", coefficient: 2 },
    { id: "sec_a_3", nom: "Espagnol", coefficient: 2 },
    { id: "sec_a_4", nom: "Mathématiques", coefficient: 3 },
    { id: "sec_a_5", nom: "Physique-Chimie", coefficient: 2 },
    { id: "sec_a_6", nom: "SVT", coefficient: 2 },
    { id: "sec_a_7", nom: "Histoire-Géo", coefficient: 2 },
    { id: "sec_a_8", nom: "Philosophie", coefficient: 2 },
    { id: "sec_a_9", nom: "EPS", coefficient: 1 }
  ],
  "Seconde C": [
    { id: "sec_c_1", nom: "Français", coefficient: 3 },
    { id: "sec_c_2", nom: "Anglais", coefficient: 2 },
    { id: "sec_c_3", nom: "Espagnol", coefficient: 2 },
    { id: "sec_c_4", nom: "Mathématiques", coefficient: 3 },
    { id: "sec_c_5", nom: "Physique-Chimie", coefficient: 2 },
    { id: "sec_c_6", nom: "SVT", coefficient: 2 },
    { id: "sec_c_7", nom: "Histoire-Géo", coefficient: 2 },
    { id: "sec_c_8", nom: "Philosophie", coefficient: 2 },
    { id: "sec_c_9", nom: "EPS", coefficient: 1 }
  ],
  "Seconde D": [
    { id: "sec_d_1", nom: "Français", coefficient: 3 },
    { id: "sec_d_2", nom: "Anglais", coefficient: 2 },
    { id: "sec_d_3", nom: "Espagnol", coefficient: 2 },
    { id: "sec_d_4", nom: "Mathématiques", coefficient: 3 },
    { id: "sec_d_5", nom: "Physique-Chimie", coefficient: 2 },
    { id: "sec_d_6", nom: "SVT", coefficient: 2 },
    { id: "sec_d_7", nom: "Histoire-Géo", coefficient: 2 },
    { id: "sec_d_8", nom: "Philosophie", coefficient: 2 },
    { id: "sec_d_9", nom: "EPS", coefficient: 1 }
  ],

  // Première
  "Première": [
    { id: "1ere_1", nom: "Français", coefficient: 3 },
    { id: "1ere_2", nom: "Anglais", coefficient: 2 },
    { id: "1ere_3", nom: "Mathématiques", coefficient: 3 },
    { id: "1ere_4", nom: "Physique-Chimie", coefficient: 2 },
    { id: "1ere_5", nom: "SVT", coefficient: 2 },
    { id: "1ere_6", nom: "Histoire-Géo", coefficient: 2 },
    { id: "1ere_7", nom: "Philosophie", coefficient: 2 },
    { id: "1ere_8", nom: "EPS", coefficient: 1 }
  ],
  "Première A": [
    { id: "1ere_a_1", nom: "Français", coefficient: 4 },
    { id: "1ere_a_2", nom: "Anglais", coefficient: 3 },
    { id: "1ere_a_3", nom: "Espagnol", coefficient: 3 },
    { id: "1ere_a_4", nom: "Mathématiques", coefficient: 2 },
    { id: "1ere_a_5", nom: "Histoire-Géo", coefficient: 3 },
    { id: "1ere_a_6", nom: "Philosophie", coefficient: 3 },
    { id: "1ere_a_7", nom: "EPS", coefficient: 1 }
  ],
  "Première C": [
    { id: "1ere_c_1", nom: "Français", coefficient: 3 },
    { id: "1ere_c_2", nom: "Anglais", coefficient: 2 },
    { id: "1ere_c_3", nom: "Mathématiques", coefficient: 5 },
    { id: "1ere_c_4", nom: "Physique-Chimie", coefficient: 4 },
    { id: "1ere_c_5", nom: "SVT", coefficient: 2 },
    { id: "1ere_c_6", nom: "Histoire-Géo", coefficient: 2 },
    { id: "1ere_c_7", nom: "Philosophie", coefficient: 2 },
    { id: "1ere_c_8", nom: "EPS", coefficient: 1 }
  ],
  "Première D": [
    { id: "1ere_d_1", nom: "Français", coefficient: 3 },
    { id: "1ere_d_2", nom: "Anglais", coefficient: 2 },
    { id: "1ere_d_3", nom: "Mathématiques", coefficient: 4 },
    { id: "1ere_d_4", nom: "Physique-Chimie", coefficient: 4 },
    { id: "1ere_d_5", nom: "SVT", coefficient: 4 },
    { id: "1ere_d_6", nom: "Histoire-Géo", coefficient: 2 },
    { id: "1ere_d_7", nom: "Philosophie", coefficient: 2 },
    { id: "1ere_d_8", nom: "EPS", coefficient: 1 }
  ],

  // Terminale
  "Terminale": [
    { id: "term_1", nom: "Français", coefficient: 3 },
    { id: "term_2", nom: "Anglais", coefficient: 2 },
    { id: "term_3", nom: "Mathématiques", coefficient: 3 },
    { id: "term_4", nom: "Physique-Chimie", coefficient: 2 },
    { id: "term_5", nom: "SVT", coefficient: 2 },
    { id: "term_6", nom: "Histoire-Géo", coefficient: 2 },
    { id: "term_7", nom: "Philosophie", coefficient: 3 },
    { id: "term_8", nom: "EPS", coefficient: 1 }
  ],
  "Terminale A": [
    { id: "term_a_1", nom: "Français", coefficient: 4 },
    { id: "term_a_2", nom: "Anglais", coefficient: 3 },
    { id: "term_a_3", nom: "Espagnol", coefficient: 3 },
    { id: "term_a_4", nom: "Mathématiques", coefficient: 2 },
    { id: "term_a_5", nom: "Histoire-Géo", coefficient: 3 },
    { id: "term_a_6", nom: "Philosophie", coefficient: 4 },
    { id: "term_a_7", nom: "EPS", coefficient: 1 }
  ],
  "Terminale C": [
    { id: "term_c_1", nom: "Français", coefficient: 3 },
    { id: "term_c_2", nom: "Anglais", coefficient: 2 },
    { id: "term_c_3", nom: "Mathématiques", coefficient: 5 },
    { id: "term_c_4", nom: "Physique-Chimie", coefficient: 5 },
    { id: "term_c_5", nom: "SVT", coefficient: 2 },
    { id: "term_c_6", nom: "Histoire-Géo", coefficient: 2 },
    { id: "term_c_7", nom: "Philosophie", coefficient: 2 },
    { id: "term_c_8", nom: "EPS", coefficient: 1 }
  ],
  "Terminale D": [
    { id: "term_d_1", nom: "Français", coefficient: 3 },
    { id: "term_d_2", nom: "Anglais", coefficient: 2 },
    { id: "term_d_3", nom: "Mathématiques", coefficient: 4 },
    { id: "term_d_4", nom: "Physique-Chimie", coefficient: 4 },
    { id: "term_d_5", nom: "SVT", coefficient: 5 },
    { id: "term_d_6", nom: "Histoire-Géo", coefficient: 2 },
    { id: "term_d_7", nom: "Philosophie", coefficient: 2 },
    { id: "term_d_8", nom: "EPS", coefficient: 1 }
  ]
};

export const INITIAL_SETTINGS: AppSettings = {
  appName: "PR-SGS",
  currentAcademicYear: '2025-2026',
  availableAcademicYears: ['2024-2025', '2025-2026', '2026-2027'],
  theme: 'blue',
  mode: 'light', // Par défaut
  logo: "",
  bulletin: {
    showTeacher: true,
    showClassAvg: true,
    showAppreciation: true,
    customHeaderText: "Établissement d'Enseignement Général et Technique",
    appreciationRules: [
      { min: 18, max: 21, text: "Excellent travail" },
      { min: 16, max: 18, text: "Très Bien" },
      { min: 14, max: 16, text: "Bien" },
      { min: 12, max: 14, text: "Assez Bien" },
      { min: 10, max: 12, text: "Passable" },
      { min: 8, max: 10, text: "Insuffisant" },
      { min: 0, max: 8, text: "Faible" }
    ],
    republicName: "RÉPUBLIQUE DU CONGO",
    republicMotto: "Unité - Travail - Progrès",
    ministryName: "MINISTÈRE DE L'ENSEIGNEMENT PRÉSCOLAIRE, PRIMAIRE, SECONDAIRE ET DE L'ALPHABÉTISATION",
    departmentalDirection: "DIRECTION DÉPARTEMENTALE DE L'ENSEIGNEMENT PRÉSCOLAIRE, PRIMAIRE, SECONDAIRE ET DE L'ALPHABÉTISATION DE BRAZZAVILLE",
    inspectionName: "INSPECTION DES COLLÈGES D'ENSEIGNEMENT GÉNÉRAL",
    schoolLocation: "BRAZZAVILLE II",
    schoolMotto: "Discipline - Travail - Succès"
  },
  accounting: {
    classFees: {}
  },
  staff: [], // Initialisation du personnel
  staffRoles: ['professeur', 'gestionnaire', 'surveillant_general']
};

// Couleurs Hexadécimales pour les variables CSS
export const THEME_HEX_COLORS: Record<string, { primary: string, hover: string }> = {
  blue: { primary: '#2563eb', hover: '#1d4ed8' },
  green: { primary: '#16a34a', hover: '#15803d' },
  purple: { primary: '#9333ea', hover: '#7e22ce' },
  red: { primary: '#dc2626', hover: '#b91c1c' },
  emerald: { primary: '#059669', hover: '#047857' },
  amber: { primary: '#d97706', hover: '#b45309' },
  indigo: { primary: '#4f46e5', hover: '#4338ca' },
  crimson: { primary: '#be123c', hover: '#9f1239' },
  slate: { primary: '#475569', hover: '#334155' },
};

export const THEME_COLORS: Record<string, string> = {
  blue: 'bg-blue-600',
  green: 'bg-green-600',
  purple: 'bg-purple-600',
  red: 'bg-red-600',
  emerald: 'bg-emerald-600',
  amber: 'bg-amber-600',
  indigo: 'bg-indigo-600',
  crimson: 'bg-rose-700',
  slate: 'bg-slate-600',
};

export const THEME_TEXT_COLORS: Record<string, string> = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  red: 'text-red-600',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  indigo: 'text-indigo-600',
  crimson: 'text-rose-700',
  slate: 'text-slate-600',
};

export const THEME_HOVER_COLORS: Record<string, string> = {
  blue: 'hover:bg-blue-700',
  green: 'hover:bg-green-700',
  purple: 'hover:bg-purple-700',
  red: 'hover:bg-red-700',
  emerald: 'hover:bg-emerald-700',
  amber: 'hover:bg-amber-700',
  indigo: 'hover:bg-indigo-700',
  crimson: 'hover:bg-rose-800',
  slate: 'hover:bg-slate-700',
};
