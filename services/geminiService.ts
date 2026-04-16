import { GoogleGenerativeAI } from "@google/generative-ai";

export const sendMessageToGemini = async (
  message: string,
  context: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[]
): Promise<string> => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'PLACE_DEHOLDER_API_KEY') {
      return "L'IA n'est pas configurée.";
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelId = "gemini-3.1-flash-lite-preview";

    const model = genAI.getGenerativeModel({ 
      model: modelId,
      systemInstruction: `Tu es un assistant intelligent pour l'application PR-SCL.
        
        TON ET CONDUITE :
        - Sois NATUREL, CONCIS et DIRECT.
        - Réponds UNIQUEMENT à ce qui est demandé. Pas de détails inutiles.
        - Utilise le Markdown (**gras**) pour souligner les chiffres ou noms importants.
        - Si l'utilisateur pose une question sur les élèves ou l'école, utilise les données fournies dans le contexte.

        INFORMATIONS CRÉATEUR :
        - Fondateur : Monsieur Paul Roger GOSSAKI NDAMBA (Groupe POWERFUL REACH).
        
        CONTEXTE ÉCOLE :
        ${context}`
    });

    const chat = model.startChat({
      history: history.length > 0 ? history : [],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text() || "Désolé, je ne peux pas répondre.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return "Une erreur est survenue.";
  }
};