import React, { useState } from 'react';
import { Card, Button, Input } from './ui/Common';
import { UserRole, UserSession } from '../types';
import { verifyOfflineAuthCode } from '../services/offlineAuthService';

interface OfflineCodeVerificationFormProps {
  schoolId: string;
  schoolName: string;
  role: UserRole;
  onSuccess: (session: UserSession, daysRemaining: number) => void;
  onCancel: () => void;
}

export const OfflineCodeVerificationForm: React.FC<OfflineCodeVerificationFormProps> = ({
  schoolId,
  schoolName,
  role,
  onSuccess,
  onCancel,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRoleTitle = () => {
    switch (role) {
      case 'dirigeant':
        return 'Dirigeant';
      case 'directeur':
        return 'Directeur de cycle';
      case 'gestionnaire':
        return 'Gestionnaire';
      case 'professeur':
        return 'Professeur';
      case 'eleve':
        return 'Élève';
      default:
        return role;
    }
  };

  const getRoleIcon = () => {
    switch (role) {
      case 'dirigeant':
        return 'user-tie';
      case 'directeur':
        return 'building-columns';
      case 'gestionnaire':
        return 'user-cog';
      case 'professeur':
        return 'chalkboard-teacher';
      case 'eleve':
        return 'user-graduate';
      default:
        return 'key';
    }
  };

  const getPlaceholder = () => {
    if (role === 'dirigeant') return 'Code ou mot de passe dirigeant';
    if (role === 'eleve') return 'Matricule élève (ex: SCL-001)';
    return 'Matricule personnel (ex: ENS-001)';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await verifyOfflineAuthCode(schoolId, role, code);
      if (result.success && result.session) {
        onSuccess(result.session, result.daysRemaining || 15);
      } else {
        setError(result.error || 'Identifiant invalide ou expiré.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la vérification hors ligne.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-4 min-h-screen">
      <div className="max-w-md w-full">
        <button
          onClick={onCancel}
          className="mb-6 text-gray-500 hover:text-blue-600 flex items-center gap-2 font-medium"
        >
          <i className="fas fa-arrow-left"></i> Changer de rôle
        </button>

        <Card className="shadow-2xl border-0 ring-1 ring-amber-200 dark:ring-amber-500/20">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 mb-3">
              <i className="fas fa-wifi-slash"></i> Mode Hors Ligne Actif
            </div>

            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-3 shadow">
              <i className={`fas fa-${getRoleIcon()}`}></i>
            </div>

            <h2 className="text-2xl font-black text-gray-900 dark:text-white capitalize">
              Connexion {getRoleTitle()}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Établissement : <span className="font-semibold text-gray-700 dark:text-gray-300">{schoolName}</span>
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-200/50 dark:border-amber-700/30">
              <i className="fas fa-shield-alt mr-1"></i>
              Vérification cryptographique locale sécurisée (Validité max : 15 jours).
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type={role === 'dirigeant' ? 'password' : 'text'}
              label={role === 'dirigeant' ? 'Code d\'accès dirigeant' : 'Matricule unique'}
              placeholder={getPlaceholder()}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
              className="text-center font-mono text-xl tracking-wider uppercase"
            />

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-200 p-4 rounded-xl text-sm border border-red-200 flex items-start gap-3">
                <i className="fas fa-exclamation-triangle mt-0.5"></i>
                <div className="flex-1">{error}</div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-amber-600 hover:bg-amber-700 text-white"
              disabled={loading || !code.trim()}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-circle-notch fa-spin"></i> Vérification sécurisée...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-check-circle"></i> Valider et déverrouiller
                </span>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
