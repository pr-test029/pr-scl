import React from 'react';
import { Button } from '../components/ui/Common';

const NotFound: React.FC<{ onHome: () => void }> = ({ onHome }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-slate-900 text-center p-8">
      <img
        src="file:///C:/Users/Dell/.gemini/antigravity/brain/08b61932-1c8a-467a-9b50-3aaa9ab3dd1f/error_404_illustration_1783601990571.png"
        alt="404 illustration"
        className="w-64 h-64 mb-8 object-contain"
      />
      <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">Page non trouvée</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">Désolé, la page que vous cherchez n'existe pas.</p>
      <Button variant="primary" onClick={onHome}>Retour à l'accueil</Button>
    </div>
  );
};

export default NotFound;
