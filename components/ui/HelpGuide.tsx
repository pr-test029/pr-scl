import React, { useState } from 'react';
import { Modal, Button } from './Common';

export interface HelpStep {
  title: string;
  description: string;
  icon: string;
  badge?: string;
}

export interface HelpTip {
  title: string;
  content: string;
  icon?: string;
  type?: 'tip' | 'warning' | 'info';
}

export interface HelpAction {
  label: string;
  icon: string;
  color: string;
  purpose: string;
}

export interface PageGuideData {
  title: string;
  subtitle: string;
  icon: string;
  headerColor?: string;
  purpose: string;
  targetAudience?: string;
  steps: HelpStep[];
  actions?: HelpAction[];
  tips?: HelpTip[];
}

export const PAGE_GUIDES: Record<string, PageGuideData> = {
  dashboard: {
    title: "Tableau de Bord",
    subtitle: "Vue synthétique & pilotage en temps réel de votre école",
    icon: "fa-chart-pie",
    headerColor: "from-blue-600 to-indigo-600",
    purpose: "Le tableau de bord centralise en un coup d'œil toutes les métriques vitales de votre établissement : effectifs totaux, répartition par cycle, situation financière globale et alertes prioritaires.",
    targetAudience: "Direction, Gestionnaires & Administrateurs",
    steps: [
      {
        title: "1. Analyser les statistiques d'effectifs",
        description: "Observez le nombre total d'élèves inscrits, le ratio garçons/filles et la répartition par niveau scolaire.",
        icon: "fa-users",
        badge: "Effectifs"
      },
      {
        title: "2. Suivre la santé financière",
        description: "Visualisez le montant total encaissé, les dépenses et le reste à recouvrer pour l'année scolaire en cours.",
        icon: "fa-wallet",
        badge: "Finances"
      },
      {
        title: "3. Utiliser les raccourcis d'actions",
        description: "Accédez en un clic aux opérations fréquentes : Inscrire un élève, Encaisser un versement ou Saisir des notes.",
        icon: "fa-bolt",
        badge: "Raccourcis"
      },
      {
        title: "4. Changer d'année académique",
        description: "Utilisez le sélecteur d'année en haut à droite pour consulter l'historique ou basculer sur une session antérieure.",
        icon: "fa-calendar-alt",
        badge: "Période"
      }
    ],
    actions: [
      { label: "Sélecteur d'année", icon: "fa-calendar", color: "bg-blue-500", purpose: "Bascule l'affichage sur une autre année scolaire" },
      { label: "Inscrire un élève", icon: "fa-user-plus", color: "bg-green-500", purpose: "Ouvre immédiatement le formulaire d'inscription" },
      { label: "Comptabilité", icon: "fa-money-bill-wave", color: "bg-purple-500", purpose: "Accède au suivi détaillé des paiements et dépenses" }
    ],
    tips: [
      {
        title: "Mise à jour en temps réel",
        content: "Toutes les statistiques sont recalculées instantanément à chaque nouvelle inscription ou encaissement, même hors-ligne.",
        icon: "fa-sync",
        type: "tip"
      }
    ]
  },

  inscription: {
    title: "Inscription d'un Nouvel Élève",
    subtitle: "Formulaire d'enregistrement et création du dossier scolaire",
    icon: "fa-user-plus",
    headerColor: "from-emerald-600 to-teal-600",
    purpose: "Cette page permet d'enregistrer administrativement un nouvel apprenant dans l'établissement, de lui attribuer un matricule unique, une classe, une photo d'identité et les coordonnées des parents.",
    targetAudience: "Secrétariat, Gestionnaires & Direction",
    steps: [
      {
        title: "1. Renseigner l'identité de l'élève",
        description: "Saisissez le Nom, Prénom, la Date et le Lieu de naissance, ainsi que le Sexe de l'élève.",
        icon: "fa-id-card",
        badge: "Identité"
      },
      {
        title: "2. Ajouter la photo d'identité",
        description: "Téléversez une photo depuis votre appareil ou prenez directement un cliché via la caméra web/mobile.",
        icon: "fa-camera",
        badge: "Photo"
      },
      {
        title: "3. Assigner le Cycle et la Classe",
        description: "Sélectionnez le cycle (ex: Primaire, Collège, Lycée) puis la classe et la série (A, C, D, etc.).",
        icon: "fa-chalkboard-teacher",
        badge: "Scolarité"
      },
      {
        title: "4. Enregistrer les contacts des tuteurs",
        description: "Renseignez le nom des parents et leurs numéros de téléphone pour les notifications et bulletins.",
        icon: "fa-phone-alt",
        badge: "Parents"
      },
      {
        title: "5. Valider l'inscription",
        description: "Cliquez sur 'Enregistrer l'élève'. Un matricule unique lui sera automatiquement assigné.",
        icon: "fa-check-circle",
        badge: "Validation"
      }
    ],
    actions: [
      { label: "Prendre / Choisir Photo", icon: "fa-image", color: "bg-blue-500", purpose: "Importe le portrait d'identité pour la carte scolaire" },
      { label: "Enregistrer l'élève", icon: "fa-save", color: "bg-emerald-600", purpose: "Sauvegarde le dossier et synchronise les bases de données" }
    ],
    tips: [
      {
        title: "Matricule automatique",
        content: "Le matricule scolaire est généré selon le format configuré dans les Paramètres de l'école.",
        icon: "fa-magic",
        type: "tip"
      },
      {
        title: "Fonctionnement hors-ligne",
        content: "Vous pouvez inscrire des élèves en pleine zone blanche : les dossiers seront synchronisés dès le retour du réseau.",
        icon: "fa-wifi",
        type: "info"
      }
    ]
  },

  students: {
    title: "Gestion & Liste des Élèves",
    subtitle: "Répertoire complet, recherche, filtrage et fiches scolaires",
    icon: "fa-users",
    headerColor: "from-blue-600 to-cyan-600",
    purpose: "Cette page regroupe l'ensemble des élèves inscrits. Vous pouvez rechercher rapidement un élève, filtrer par classe, consulter son dossier complet, imprimer sa carte d'identité ou exporter des listes.",
    targetAudience: "Tout le personnel autorisé",
    steps: [
      {
        title: "1. Rechercher et filtrer les élèves",
        description: "Utilisez la barre de recherche (par nom, prénom ou matricule) ou filtrez par cycle et par classe.",
        icon: "fa-search",
        badge: "Recherche"
      },
      {
        title: "2. Consulter la fiche complète d'un élève",
        description: "Cliquez sur la ligne d'un élève pour ouvrir sa fiche détaillée : notes, absences, paiements et documents.",
        icon: "fa-address-card",
        badge: "Détails"
      },
      {
        title: "3. Imprimer les cartes et listes",
        description: "Générez en PDF les badges scolaires avec QR Code ou exportez la liste de classe pour l'appel.",
        icon: "fa-print",
        badge: "Impression"
      },
      {
        title: "4. Modifier ou transférer un élève",
        description: "Mettez à jour les informations, changez la classe d'affectation ou archivez un élève ayant quitté l'école.",
        icon: "fa-edit",
        badge: "Gestion"
      }
    ],
    actions: [
      { label: "Barre de Recherche", icon: "fa-search", color: "bg-slate-700", purpose: "Filtre instantanément la liste des apprenants" },
      { label: "Fiche Élève", icon: "fa-eye", color: "bg-blue-600", purpose: "Ouvre le dossier complet de l'apprenant" },
      { label: "Cartes Scolaires", icon: "fa-id-badge", color: "bg-indigo-600", purpose: "Imprime les badges d'identité avec QR Code" }
    ],
    tips: [
      {
        title: "QR Code de sécurité",
        content: "Chaque élève possède un QR Code unique sur sa carte permettant de vérifier son identité ou d'accéder à son portail.",
        icon: "fa-qrcode",
        type: "tip"
      }
    ]
  },

  accounting: {
    title: "Comptabilité & Frais de Scolarité",
    subtitle: "Encaissements, gestion des versements, dépenses et reçus PDF",
    icon: "fa-wallet",
    headerColor: "from-purple-600 to-indigo-700",
    purpose: "Cette page est le cœur financier de votre établissement. Elle permet de suivre le paiement des frais de scolarité de chaque élève, d'enregistrer les dépenses quotidiennes et d'éditer des reçus de caisse certifiés.",
    targetAudience: "Comptables, Gestionnaires & Direction",
    steps: [
      {
        title: "1. Encaisser la scolarité d'un élève",
        description: "Dans l'onglet 'Scolarité', cherchez l'élève et cliquez sur 'Gérer' pour enregistrer un versement partiel ou total.",
        icon: "fa-hand-holding-usd",
        badge: "Scolarité"
      },
      {
        title: "2. Suivre le diagramme d'évolution",
        description: "Visualisez dans la fenêtre de l'élève le diagramme circulaire montrant la part déjà payée et le solde restant.",
        icon: "fa-chart-pie",
        badge: "Progression"
      },
      {
        title: "3. Générer le reçu officiel de caisse",
        description: "Après chaque paiement, cliquez sur 'Reçu' pour générer un reçu PDF sécurisé avec QR Code de traçabilité.",
        icon: "fa-file-invoice-dollar",
        badge: "Reçu PDF"
      },
      {
        title: "4. Enregistrer une dépense (Décaissement)",
        description: "Dans l'onglet 'Décaissements', indiquez le libellé et le montant décaissé (achats, salaires, maintenance).",
        icon: "fa-minus-circle",
        badge: "Dépenses"
      },
      {
        title: "5. Enregistrer un encaissement divers",
        description: "Utilisez le bouton 'Autre Encaissement' pour les rentrées d'argent hors scolarité (uniformes, cantine, dons).",
        icon: "fa-coins",
        badge: "Divers"
      }
    ],
    actions: [
      { label: "Gérer le compte", icon: "fa-receipt", color: "bg-blue-600", purpose: "Ouvre l'état financier et permet d'ajouter un versement" },
      { label: "Autre Encaissement", icon: "fa-plus-circle", color: "bg-teal-600", purpose: "Enregistre des recettes diverses" },
      { label: "Valider la dépense", icon: "fa-minus-circle", color: "bg-red-600", purpose: "Déduit le montant de la caisse avec libellé" }
    ],
    tips: [
      {
        title: "Configuration préalable des frais",
        content: "Assurez-vous que les tarifs mensuels par classe sont bien configurés dans les Paramètres pour activer les calculs.",
        icon: "fa-exclamation-triangle",
        type: "warning"
      },
      {
        title: "Santé financière globale",
        content: "Le diagramme circulaire en haut de page illustre en temps réel le taux de recouvrement de l'ensemble de l'école.",
        icon: "fa-chart-line",
        type: "tip"
      }
    ]
  },

  evaluation: {
    title: "Suivi des Notes & Évaluations",
    subtitle: "Saisie des notes, calculs de moyennes et génération des bulletins",
    icon: "fa-chart-line",
    headerColor: "from-blue-600 to-indigo-800",
    purpose: "Cette page permet aux enseignants et à l'administration de saisir les notes d'interrogations, devoirs et compositions, de calculer automatiquement les moyennes pondérées et d'éditer les bulletins scolaires.",
    targetAudience: "Enseignants, Directeurs des Études & Gestionnaires",
    steps: [
      {
        title: "1. Sélectionner la Classe, Période et Matière",
        description: "Choisissez la classe, le trimestre/semestre, et la matière concernée dans les menus déroulants.",
        icon: "fa-filter",
        badge: "Filtres"
      },
      {
        title: "2. Saisir les notes des apprenants",
        description: "Remplissez les notes sur 20 dans la grille pour chaque élève. Le système valide automatiquement les valeurs.",
        icon: "fa-edit",
        badge: "Saisie"
      },
      {
        title: "3. Sauvegarder les évaluations",
        description: "Cliquez sur 'Enregistrer' pour sauvegarder les notes en local et les synchroniser en base de données.",
        icon: "fa-save",
        badge: "Sauvegarde"
      },
      {
        title: "4. Éditer les Bulletins de Notes",
        description: "Générez en un clic les bulletins scolaires complets avec moyennes, rangs, coefficients et appréciations.",
        icon: "fa-file-pdf",
        badge: "Bulletins"
      }
    ],
    actions: [
      { label: "Enregistrer les Notes", icon: "fa-save", color: "bg-emerald-600", purpose: "Valide la grille de notes pour la matière" },
      { label: "Générer les Bulletins", icon: "fa-file-pdf", color: "bg-indigo-600", purpose: "Produit les bulletins complets de toute la classe" }
    ],
    tips: [
      {
        title: "Coefficients automatiques",
        content: "Les moyennes tiennent compte des coefficients définis dans les Paramètres pour chaque matière.",
        icon: "fa-calculator",
        type: "tip"
      }
    ]
  },

  academic_results: {
    title: "Palmarès & Résultats Académiques",
    subtitle: "Classements généraux, tableaux d'honneur et analyse de performance",
    icon: "fa-list-ol",
    headerColor: "from-amber-500 to-orange-600",
    purpose: "Cette page présente les classements par ordre de mérite des élèves par classe et par cycle, les tableaux d'honneur, ainsi que les taux de réussite globaux.",
    targetAudience: "Direction, Conseils de classe & Enseignants",
    steps: [
      {
        title: "1. Choisir la classe et la période",
        description: "Sélectionnez le niveau et le trimestre pour charger le récapitulatif complet.",
        icon: "fa-chalkboard",
        badge: "Classe"
      },
      {
        title: "2. Examiner le classement d'excellence",
        description: "Consultez les moyennes générales, les rangs (1er, 2e...) et les mentions attribuées.",
        icon: "fa-trophy",
        badge: "Rangs"
      },
      {
        title: "3. Imprimer le Procès-Verbal",
        description: "Exportez le procès-verbal récapitulatif pour les conseils de classe ou les archives officielles.",
        icon: "fa-print",
        badge: "Export"
      }
    ],
    actions: [
      { label: "Tableau d'Honneur", icon: "fa-award", color: "bg-amber-500", purpose: "Affiche les meilleurs élèves avec félicitations" },
      { label: "Imprimer PV", icon: "fa-file-alt", color: "bg-slate-700", purpose: "Génère le document officiel du conseil de classe" }
    ]
  },

  personnel: {
    title: "Gestion du Personnel & Enseignants",
    subtitle: "Comptes utilisateurs, attribution des matières et autorisations",
    icon: "fa-users-cog",
    headerColor: "from-slate-700 to-slate-900",
    purpose: "Permet de gérer l'équipe pédagogique et administrative : création des accès, assignation des matières et classes pour chaque enseignant, et contrôle des rôles.",
    targetAudience: "Direction & Administrateurs",
    steps: [
      {
        title: "1. Ajouter un membre du personnel",
        description: "Remplissez le formulaire avec son Nom, Email, Numéro et Rôle (Professeur, Gestionnaire, Directeur).",
        icon: "fa-user-plus",
        badge: "Création"
      },
      {
        title: "2. Assigner les matières et classes",
        description: "Spécifiez les classes et disciplines qu'enseigne chaque professeur pour lui restreindre l'accès à ses seules matières.",
        icon: "fa-book-reader",
        badge: "Affectation"
      },
      {
        title: "3. Définir les droits d'accès",
        description: "Configurez si le membre a le droit de saisir des notes, encaisser des paiements ou modifier les élèves.",
        icon: "fa-shield-alt",
        badge: "Droits"
      }
    ],
    actions: [
      { label: "Nouveau Membre", icon: "fa-plus", color: "bg-blue-600", purpose: "Ouvre la création d'un profil collaborateur" },
      { label: "Modifier Affectations", icon: "fa-tasks", color: "bg-teal-600", purpose: "Met à jour les classes enseignées" }
    ]
  },

  settings: {
    title: "Paramètres de l'Établissement",
    subtitle: "Configuration globale : Identité, Cycles, Matières & Tarifs",
    icon: "fa-cogs",
    headerColor: "from-blue-700 to-indigo-900",
    purpose: "Ce panneau configure l'ensemble des règles de fonctionnement de l'application : nom de l'école, logo officiel, structure des cycles, matières, barèmes de coefficients et grille tarifaire.",
    targetAudience: "Direction & Administrateurs",
    steps: [
      {
        title: "1. Informations de l'École",
        description: "Renseignez le nom officiel, le logo (qui devient l'icône de l'application mobile), l'adresse et la devise.",
        icon: "fa-school",
        badge: "Identité"
      },
      {
        title: "2. Cycles & Classes",
        description: "Créez les cycles (Maternelle, Primaire, Collège, Lycée) et définissez les classes actives pour l'année.",
        icon: "fa-layer-group",
        badge: "Structure"
      },
      {
        title: "3. Matières & Coefficients",
        description: "Ajoutez les matières enseignées et leurs coefficients pour automatiser le calcul des bulletins.",
        icon: "fa-book",
        badge: "Pédagogie"
      },
      {
        title: "4. Frais de Scolarité",
        description: "Indiquez les frais mensuels ou annuels par classe pour automatiser le module Comptabilité.",
        icon: "fa-coins",
        badge: "Tarifs"
      }
    ],
    actions: [
      { label: "Importer le Logo", icon: "fa-upload", color: "bg-blue-500", purpose: "Change l'icône de l'application et l'en-tête des reçus" },
      { label: "Sauvegarder les Paramètres", icon: "fa-save", color: "bg-emerald-600", purpose: "Applique les réglages à toute l'école" }
    ],
    tips: [
      {
        title: "Icône d'application dynamique",
        content: "En changeant le logo ici, l'application met à jour automatiquement son icône d'installation sur vos téléphones et ordinateurs !",
        icon: "fa-mobile-alt",
        type: "tip"
      }
    ]
  },

  student_portal: {
    title: "Portail Élève & Famille",
    subtitle: "Consultation des notes, état des paiements et téléchargements",
    icon: "fa-user-graduate",
    headerColor: "from-cyan-600 to-blue-700",
    purpose: "Espace sécurisé permettant à l'élève et à ses parents de suivre l'évolution scolaire, de vérifier les paiements de scolarité et de télécharger les bulletins de notes en toute autonomie.",
    targetAudience: "Élèves & Parents",
    steps: [
      {
        title: "1. Consulter les dernières notes",
        description: "Accédez aux résultats des devoirs et compositions dès leur publication par les professeurs.",
        icon: "fa-star",
        badge: "Notes"
      },
      {
        title: "2. Vérifier la situation financière",
        description: "Vérifiez les montants déjà versés et les échéances restant dues.",
        icon: "fa-receipt",
        badge: "Paiements"
      },
      {
        title: "3. Télécharger son bulletin PDF",
        description: "Téléchargez ou imprimez le bulletin officiel trimestriel avec QR Code certifié.",
        icon: "fa-download",
        badge: "Bulletin"
      }
    ]
  },

  admin: {
    title: "Panneau d'Administration Système",
    subtitle: "Gestion multi-écoles, licences et abonnements",
    icon: "fa-shield-alt",
    headerColor: "from-slate-800 to-black",
    purpose: "Supervision centrale de la plateforme : activation des écoles, gestion des abonnements et suivi de la sécurité.",
    targetAudience: "Super Administrateurs",
    steps: [
      {
        title: "1. Gérer les écoles clientes",
        description: "Créez ou modifiez les fiches des établissements utilisant la plateforme.",
        icon: "fa-building",
        badge: "Écoles"
      },
      {
        title: "2. Activer les abonnements",
        description: "Validez les clés d'activation et gérez les dates de validité des licences logicielles.",
        icon: "fa-key",
        badge: "Licences"
      }
    ]
  },

  profile: {
    title: "Mon Profil Utilisateur",
    subtitle: "Informations de compte, sécurité et préférences",
    icon: "fa-user-circle",
    headerColor: "from-blue-600 to-slate-700",
    purpose: "Consultez vos informations personnelles, changez votre mot de passe et configurez vos préférences d'affichage.",
    targetAudience: "Tous les utilisateurs connectés",
    steps: [
      {
        title: "1. Vérifier vos coordonnées",
        description: "Assurez-vous que votre adresse email et votre nom d'affichage sont exacts.",
        icon: "fa-user",
        badge: "Compte"
      },
      {
        title: "2. Sécuriser votre mot de passe",
        description: "Modifiez régulièrement votre mot de passe pour garantir la sécurité des données scolaires.",
        icon: "fa-lock",
        badge: "Sécurité"
      }
    ]
  }
};

interface HelpGuideProps {
  guideKey?: string;
  customGuide?: PageGuideData;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  buttonLabel?: string;
  variant?: 'badge' | 'button' | 'icon';
}

export const HelpGuide: React.FC<HelpGuideProps> = ({
  guideKey,
  customGuide,
  size = 'md',
  className = '',
  buttonLabel,
  variant = 'badge'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const guide = customGuide || (guideKey ? PAGE_GUIDES[guideKey] : null);

  if (!guide) return null;

  return (
    <>
      {/* Trigger Button */}
      {variant === 'badge' && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`group relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg hover:scale-110 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
            size === 'sm' ? 'w-6 h-6 text-[10px]' : size === 'lg' ? 'w-10 h-10 text-base' : 'w-7 h-7 text-xs'
          } ${className}`}
          title="Guide d'aide : Comment utiliser cette page ?"
          aria-label="Guide et aide"
        >
          {/* Subtle pulsating animation ring */}
          <span className="absolute -inset-0.5 rounded-full bg-blue-400 opacity-40 group-hover:opacity-75 animate-ping"></span>
          <i className="fas fa-question relative z-10 font-bold"></i>
        </button>
      )}

      {variant === 'icon' && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center justify-center p-2 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all hover:scale-105 active:scale-95 ${className}`}
          title="Aide & Fonctionnement"
        >
          <i className="fas fa-question-circle text-lg mr-1.5"></i>
          {buttonLabel && <span className="text-xs font-bold">{buttonLabel}</span>}
        </button>
      )}

      {variant === 'button' && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-all border border-blue-200 dark:border-blue-800/40 shadow-sm hover:shadow ${className}`}
        >
          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
            <i className="fas fa-question"></i>
          </div>
          <span>{buttonLabel || "Comment utiliser cette page ?"}</span>
        </button>
      )}

      {/* Interactive Modal Pop-up */}
      {isOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsOpen(false)}
          title=""
          maxWidth="max-w-2xl"
        >
          <div className="-mt-4 -mx-6 sm:-mx-6">
            {/* Header with Visual Banner */}
            <div className={`p-6 sm:p-8 bg-gradient-to-r ${guide.headerColor || 'from-blue-600 to-indigo-600'} text-white rounded-t-2xl relative overflow-hidden`}>
              <div className="absolute right-0 top-0 translate-x-6 -translate-y-4 opacity-10 pointer-events-none">
                <i className={`fas ${guide.icon} text-9xl`}></i>
              </div>
              <div className="relative z-10 flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-2xl shadow-inner border border-white/30 flex-shrink-0">
                  <i className={`fas ${guide.icon}`}></i>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
                      <i className="fas fa-info-circle mr-1"></i> Guide Interactif
                    </span>
                    {guide.targetAudience && (
                      <span className="px-2.5 py-0.5 rounded-full bg-black/20 text-[10px] font-medium backdrop-blur-sm">
                        {guide.targetAudience}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight">{guide.title}</h3>
                  <p className="text-sm text-white/90 font-medium mt-0.5">{guide.subtitle}</p>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
              {/* Purpose Section */}
              <div className="p-4 bg-blue-50/70 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <i className="fas fa-bullseye text-blue-500"></i> À quoi sert cette page ?
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed font-normal">
                  {guide.purpose}
                </p>
              </div>

              {/* Step-by-Step Instructions */}
              <div>
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <i className="fas fa-list-ol text-[var(--primary-color)]"></i> Ce qu'il faut faire (Étape par Étape)
                </h4>
                <div className="space-y-3">
                  {guide.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 text-base font-bold shadow-sm group-hover:scale-105 transition-transform">
                        <i className={`fas ${step.icon}`}></i>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <h5 className="font-bold text-sm text-gray-800 dark:text-white">
                            {step.title}
                          </h5>
                          {step.badge && (
                            <span className="text-[10px] px-2 py-0.5 font-bold uppercase rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {step.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Actions Breakdown (if available) */}
              {guide.actions && guide.actions.length > 0 && (
                <div>
                  <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <i className="fas fa-mouse-pointer text-emerald-500"></i> Actions Clés & Boutons
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {guide.actions.map((act, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border dark:border-white/10 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${act.color} text-white flex items-center justify-center text-xs flex-shrink-0 shadow`}>
                          <i className={`fas ${act.icon}`}></i>
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-xs text-gray-800 dark:text-white truncate">{act.label}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">{act.purpose}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pro Tips / Notes */}
              {guide.tips && guide.tips.length > 0 && (
                <div className="space-y-3">
                  {guide.tips.map((tip, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border flex items-start gap-3 ${
                        tip.type === 'warning'
                          ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                          : tip.type === 'info'
                          ? 'bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-900/40 text-cyan-900 dark:text-cyan-200'
                          : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                      }`}
                    >
                      <i className={`fas ${tip.icon || 'fa-lightbulb'} mt-0.5 text-base flex-shrink-0`}></i>
                      <div className="text-xs">
                        <strong className="block font-bold mb-0.5">{tip.title}</strong>
                        <span>{tip.content}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 dark:bg-slate-800/80 border-t dark:border-white/10 flex justify-end">
              <Button
                variant="primary"
                onClick={() => setIsOpen(false)}
                className="!px-6 shadow-md shadow-blue-500/20"
              >
                <i className="fas fa-check mr-2"></i> J'ai compris
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
