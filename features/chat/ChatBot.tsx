
import React, { useState, useRef, useEffect } from 'react';
import { useSchool } from '../../App';
import { sendMessageToGemini } from '../../services/geminiService';
import { Cycle } from '../../types';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export const ChatBot: React.FC = () => {
  const { students, grades, cycles, settings } = useSchool();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'model', text: 'Bonjour ! Je suis l\'assistant PR-SCL. Comment puis-je vous aider ?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reconnaissance vocale (Web Speech API)
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'fr-FR';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        // On pourrait envoyer automatiquement ici si on voulait
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Votre navigateur ne supporte pas la reconnaissance vocale.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isOpen]);

  const getContext = () => {
    const studentCount = students.length;
    const gradeCount = grades.length;
    const cycleList = Object.values(cycles);
    const cycleNames = cycleList.map((c: Cycle) => c.name).join(', ');
    
    // Group students by class for better context
    const studentsByClass = students.reduce((acc: Record<string, number>, s) => {
        acc[s.classe] = (acc[s.classe] || 0) + 1;
        return acc;
    }, {});

    const classDistribution = Object.entries(studentsByClass)
        .map(([cls, count]) => `- ${cls}: ${count} élèves`)
        .join('\n');

    return `
      Date d'aujourd'hui : ${new Date().toLocaleDateString('fr-FR')}
      Nom de l'établissement: ${settings.appName}
      Description: ${settings.bulletin.customHeaderText}
      
      STATISTIQUES GÉNÉRALES :
      - Nombre total d'élèves: ${studentCount}
      - Nombre total de notes enregistrées: ${gradeCount}
      - Cycles d'enseignement: ${cycleNames}
      
      RÉPARTITION PAR CLASSE :
      ${classDistribution || 'Aucun élève inscrit pour le moment.'}
      
      DERNIÈRES ACTIVITÉS :
      - Dernier élève inscrit: ${students[students.length - 1] ? `${students[students.length - 1].nom} ${students[students.length - 1].prenom}` : 'Aucun'}
    `;
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const context = getContext();
    
    // CORRECTION: L'historique doit commencer par 'user' pour le SDK Gemini
    const rawHistory = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
    }));

    const firstUserIndex = rawHistory.findIndex(h => h.role === 'user');
    const filteredHistory = firstUserIndex !== -1 ? rawHistory.slice(firstUserIndex) : [];

    try {
        const responseText = await sendMessageToGemini(userMessage.text, context, filteredHistory);
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: responseText }]);
    } catch (err) {
        console.error("Chat Error:", err);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Désolé, une erreur est survenue." }]);
    } finally {
        setIsLoading(false);
    }
  };

  // Simple Markdown Parser for Text Formatting
  const formatText = (text: string) => {
      // 1. Bold: **text** -> <strong>text</strong>
      let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // 2. Lists: - item -> <ul><li>item</li></ul> (basic implementation)
      // This basic replace handles single bullet points well enough for simple chat
      formatted = formatted.replace(/^\s*-\s+(.*)$/gm, '• $1');

      // 3. Newlines
      return formatted.split('\n').map((line, i) => (
          <React.Fragment key={i}>
              <span dangerouslySetInnerHTML={{ __html: line }} />
              <br />
          </React.Fragment>
      ));
  };

  return (
    <>
      {/* Floating Action Button (FAB) - FIXED POSITION */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 focus:outline-none bg-[var(--primary-color)] text-white neon-button flex items-center justify-center`}
        style={{ position: 'fixed', bottom: '24px', right: '24px' }}
        title="Assistant IA"
      >
        {isOpen ? <i className="fas fa-times text-2xl"></i> : <i className="fas fa-robot text-2xl animate-pulse"></i>}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 bg-white dark:bg-slate-900/80 dark:glass-card rounded-2xl shadow-2xl z-[9998] flex flex-col overflow-hidden border border-gray-200 dark:border-white/10 h-[500px] animate-fade-in-up transition-colors duration-200">
          {/* Header */}
          <div className="p-4 bg-[var(--primary-color)] text-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <i className="fas fa-robot"></i>
              </div>
              <div>
                  <h3 className="font-bold text-sm">Assistant PR-SCL</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_5px_#4ade80]"></span>
                      <span className="text-xs opacity-90">En ligne - Gemini AI</span>
                  </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-transparent">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 {msg.role === 'model' && (
                     <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0 mr-2 flex items-center justify-center text-xs text-white shadow-sm">
                         <i className="fas fa-sparkles"></i>
                     </div>
                 )}
                 <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
                    msg.role === 'user' 
                    ? 'bg-[var(--primary-color)] text-white rounded-br-sm' 
                    : 'bg-white dark:bg-white/10 border border-gray-100 dark:border-white/5 text-gray-800 dark:text-gray-200 rounded-bl-sm backdrop-blur-sm'
                 }`}>
                   {formatText(msg.text)}
                 </div>
              </div>
            ))}
            {isLoading && (
               <div className="flex justify-start">
                   <div className="bg-white dark:bg-white/10 border dark:border-white/5 rounded-2xl p-3 shadow-sm flex items-center gap-1 backdrop-blur-sm">
                       <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                       <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                       <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                   </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 bg-white dark:bg-transparent border-t dark:border-white/10 flex flex-col gap-2">
            <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={isListening ? "Écoute en cours..." : "Posez une question..."}
                  className={`flex-1 bg-gray-100 dark:bg-slate-800/50 dark:text-white border-0 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] dark:placeholder-gray-400 transition-all ${isListening ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/10' : ''}`}
                  disabled={isLoading}
                />
                
                {/* Microphone Button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                  title={isListening ? "Arrêter l'écoute" : "Parler"}
                >
                  <i className={`fas ${isListening ? 'fa-microphone' : 'fa-microphone-alt'}`}></i>
                </button>

                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-[var(--primary-color)] text-white w-9 h-9 rounded-full flex items-center justify-center hover:opacity-90 disabled:opacity-50 shadow-md transition-all neon-button"
                >
                  <i className="fas fa-paper-plane text-xs"></i>
                </button>
            </div>
            {isListening && (
                <div className="text-[10px] text-red-500 text-center animate-pulse font-medium">
                    Je vous écoute...
                </div>
            )}
          </form>
        </div>
      )}
    </>
  );
};
