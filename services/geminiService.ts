import { GoogleGenerativeAI } from "@google/generative-ai";

export const sendMessageToGemini = async (
  message: string,
  context: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[]
): Promise<string> => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    console.log("[GeminiService] Vérification de la clé API...");
    
    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
      console.warn("[GeminiService] Clé API manquante ou placeholder.");
      return "L'IA n'est pas encore configurée. Veuillez ajouter votre clé VITE_GEMINI_API_KEY dans le fichier .env.local.";
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Utilisation du modèle gemini-3.1-flash-lite-preview comme demandé
    const modelId = "gemini-3.1-flash-lite-preview";
    console.log(`[GeminiService] Utilisation du modèle: ${modelId}`);

    const model = genAI.getGenerativeModel({ 
      model: modelId,
      systemInstruction: `Tu es un assistant intelligent pour l'application PR-SCL (Système de Gestion Scolaire). 
        
        INFORMATIONS SUR LE CRÉATEUR :
        - Créé par le Groupe "POWERFUL REACH".
        - Fondateur : Monsieur Paul Roger GOSSAKI NDAMBA.
        - Contact WhatsApp : +242 06 769 61 57 / +242 05 013 32 71.
        - Emails : powerfulreach029@gmail.com / paulndamba2@gmail.com.

        RÈGLES DE RÉPONSE :
        1. Sois COURT, PRÉCIS et PROFESSIONNEL.
        2. Utilise le Markdown (**gras**, listes à puces).
        3. Aide l'utilisateur avec ses données d'école (élèves, notes, cycles).
        4. Ne donne jamais de conseils médicaux ou juridiques.
        5. Pour toute action complexe (suppression, modification), explique comment faire dans l'interface de l'application.
        
        CONTEXTE ACTUEL DE L'ÉCOLE :
        ${context}`
    });

    console.log("[GeminiService] Démarrage du chat avec l'historique...");
    const chat = model.startChat({
      history: history.length > 0 ? history : [],
    });

    console.log("[GeminiService] Envoi du message au modèle...");
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();
    console.log("[GeminiService] Réponse texte générée avec succès.");
    return text || "Désolé, je n'ai pas pu générer de réponse.";
  } catch (error: any) {
    console.error("[GeminiService] Erreur attrapée :", error);
    if (error.message?.includes("API key not valid")) {
      return "Clé API invalide. Veuillez vérifier votre clé dans le fichier .env.local.";
    }
    return `Erreur Gemini : ${error.message || "Une erreur inconnue s'est produite"}`;
  }
};