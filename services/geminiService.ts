import { GoogleGenerativeAI } from "@google/generative-ai";

export const sendMessageToGemini = async (
  message: string,
  context: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[]
): Promise<string> => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
      return "L'IA n'est pas encore configurée. Veuillez ajouter votre clé VITE_GEMINI_API_KEY dans le fichier .env.local.";
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Utilisation du modèle gemini-3.1-flash-lite-preview comme demandé
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.1-flash-lite-preview",
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

    // Formatting history for Google SDK
    const chat = model.startChat({
      history: history.length > 0 ? history : [],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text() || "Désolé, je n'ai pas pu générer de réponse.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes("API key not valid")) {
      return "Clé API invalide. Veuillez vérifier votre clé dans le fichier .env.local.";
    }
    return "Une erreur s'est produite lors de la communication avec l'IA. Vérifiez votre connexion et votre configuration.";
  }
};