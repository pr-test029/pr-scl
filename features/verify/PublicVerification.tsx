import React, { useEffect, useState } from 'react';
import { fetchPublicStudentData, fetchPublicSettings } from '../../services/firebase';
import { Student, AppSettings } from '../../types';
import { Card, Button } from '../../components/ui/Common';

interface PublicVerificationProps {
    studentId: string;
    schoolId: string;
}

export const PublicVerification: React.FC<PublicVerificationProps> = ({ studentId, schoolId }) => {
    const [student, setStudent] = useState<Student | null>(null);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [sData, schSettings] = await Promise.all([
                    fetchPublicStudentData(schoolId, studentId),
                    fetchPublicSettings(schoolId)
                ]);

                if (!sData) {
                    setError("Aucun élève trouvé avec cet identifiant.");
                } else {
                    setStudent(sData);
                    setSettings(schSettings);
                }
            } catch (err) {
                console.error("Verification error", err);
                setError("Une erreur est survenue lors de la vérification.");
            } finally {
                setLoading(false);
            }
        };

        if (studentId && schoolId) {
            loadData();
        } else {
            setError("Paramètres de vérification manquants.");
            setLoading(false);
        }
    }, [studentId, schoolId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Vérification en cours...</p>
                </div>
            </div>
        );
    }

    if (error || !student) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                <Card className="max-w-md w-full text-center p-8">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-times text-red-600 text-2xl"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Échec de la Vérification</h2>
                    <p className="text-gray-600 mb-6">{error || "Document non authentifié."}</p>
                    <Button variant="primary" onClick={() => window.location.href = '/'}>Retour à l'accueil</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                {/* School Header */}
                <div className="text-center mb-8">
                    {settings?.logo && (
                        <img src={settings.logo} alt="Logo" className="h-24 w-24 object-contain mx-auto mb-4 bg-white p-2 rounded-xl shadow-sm border" />
                    )}
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{settings?.appName || "PR-SCL"}</h1>
                    <p className="text-blue-600 font-bold text-sm tracking-widest mt-1">CERTIFICATION OFFICIELLE</p>
                </div>

                <Card className="overflow-hidden border-2 border-green-500/20 shadow-2xl relative">
                    {/* Authenticity Watermark */}
                    <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-green-200">
                        <i className="fas fa-check-circle"></i> BULLETIN AUTHENTIFIÉ
                    </div>

                    <div className="p-8">
                        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                            {/* Profile Image */}
                            <div className="relative">
                                <img 
                                    src={student.photo || 'https://via.placeholder.com/150'} 
                                    alt="Profil" 
                                    className="w-40 h-40 rounded-2xl object-cover shadow-lg border-4 border-white"
                                />
                            </div>

                            <div className="flex-1 space-y-4">
                                <div>
                                    <h2 className="text-3xl font-black text-gray-900 leading-tight">
                                        {student.nom.toUpperCase()} <br/>
                                        <span className="text-gray-600 font-bold">{student.prenom}</span>
                                    </h2>
                                    <p className="text-blue-600 font-bold text-lg mt-1">{student.classe} {student.serie ? `(${student.serie})` : ''}</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Matricule</p>
                                        <p className="font-mono text-gray-800 font-bold text-lg">{student.id.toUpperCase()}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Date de Naissance</p>
                                        <p className="text-gray-800 font-bold text-lg">{student.dateNaissance}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Cycle</p>
                                        <p className="text-gray-800 font-bold text-lg uppercase">{student.cycle.replace('_', ' ')}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Statut</p>
                                        <p className="text-green-600 font-bold text-lg italic">Élève Régulier</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Security Footer */}
                        <div className="mt-10 pt-6 border-t border-dashed text-center">
                            <div className="flex items-center justify-center gap-2 text-gray-400 mb-2">
                                <i className="fas fa-shield-alt"></i>
                                <span className="text-[10px] items-center font-bold uppercase tracking-widest">Certifié via la plateforme PR-SCL</span>
                            </div>
                            <p className="text-[9px] text-gray-300 italic">Code de vérification numérique : {studentId.substring(0,6).toUpperCase()}-{schoolId.substring(0,6).toUpperCase()}</p>
                        </div>
                    </div>
                </Card>

                <div className="text-center mt-8">
                    <p className="text-gray-400 text-xs">Ces informations sont issues des registres officiels de <strong>{settings?.appName}</strong>.</p>
                </div>
            </div>
        </div>
    );
};
