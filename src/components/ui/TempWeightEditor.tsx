import React, { useState } from 'react';
import { Button, Input } from '../../components/ui/Common';

interface TempWeightEditorProps {
  initialWeight: { devoir: number; composition: number };
  onSave: (newWeight: { devoir: number; composition: number }) => void;
}

export const TempWeightEditor: React.FC<TempWeightEditorProps> = ({ initialWeight, onSave }) => {
  const [devoir, setDevoir] = useState(initialWeight.devoir);
  const [composition, setComposition] = useState(initialWeight.composition);

  const handleSave = () => {
    const total = Number(devoir) + Number(composition);
    if (total !== 100) {
      alert('La somme des poids doit être égale à 100 %');
      return;
    }
    onSave({ devoir: Number(devoir), composition: Number(composition) });
  };

  return (
    <div className="space-y-4">
      <Input
        label="Pourcentage devoir"
        type="number"
        value={devoir}
        onChange={e => setDevoir(e.target.value)}
      />
      <Input
        label="Pourcentage composition"
        type="number"
        value={composition}
        onChange={e => setComposition(e.target.value)}
      />
      <Button onClick={handleSave}>Enregistrer</Button>
    </div>
  );
};
