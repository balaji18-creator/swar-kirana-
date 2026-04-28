
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, ChevronUp, AlertCircle, Globe } from 'lucide-react';
import { Orb } from './components/Orb';
import { Dashboard } from './components/Dashboard';
import { useVoiceRecognition } from './hooks/useVoiceRecognition';
import { parseCommand } from './lib/gemini';
import { AppState, Product, Transaction, Customer } from './types';

export default function App() {
  const [language, setLanguage] = useState('hi-IN'); // Default to Hindi
  const [showDashboard, setShowDashboard] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [appState, setAppState] = useState<AppState>({
    inventory: [],
    customers: [],
    history: [],
    kpis: {
      salesToday: 0,
      pendingKhata: 0,
      itemsInStock: 0,
      lowStockCount: 0
    }
  });

  const { isListening, transcript, startListening, stopListening, error, setTranscript } = useVoiceRecognition(language);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invRes, histRes, kpiRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/history'),
        fetch('/api/kpis/today')
      ]);
      
      const inventory = await invRes.json();
      const history = await histRes.json();
      const kpis = await kpiRes.json();
      
      setAppState(prev => ({
        ...prev,
        inventory: Array.isArray(inventory) ? inventory : [],
        history: Array.isArray(history) ? history : [],
        kpis: (kpis && !kpis.error) ? kpis : prev.kpis
      }));
    } catch (err) {
      console.error('Data fetch error:', err);
    }
  };

  const handleOrbClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // When listening stops and we have a transcript
  useEffect(() => {
    if (!isListening && transcript) {
      handleFinalTranscript(transcript);
    }
  }, [isListening]);

  const handleFinalTranscript = async (text: string) => {
    setIsProcessing(true);
    try {
      // 1. AI Parsing
      const parsed = await parseCommand(text, language);
      
      // 2. Business Logic Execution on Backend
      const response = await fetch('/api/execute-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: parsed.intent,
          params: parsed.params,
          transcript: text,
          reply: parsed.reply,
          language
        })
      });

      const result = await response.json();

      // 3. Speech Synthesis
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(result.reply || parsed.reply || (language === 'hi-IN' ? 'Theek hai.' : 'Done.'));
      utterance.lang = language;
      synth.speak(utterance);

      // 4. Update UI
      if (result.intent === 'QUERY_STOCK' || result.intent === 'QUERY_SALE') {
        setShowDashboard(true);
      }
      
      fetchData(); // Refresh all stats
    } catch (err) {
      console.error('Command processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const languages = [
    { code: 'hi-IN', name: 'हिन्दी' },
    { code: 'te-IN', name: 'తెలుగు' },
    { code: 'en-IN', name: 'English' }
  ];

  const hints = [
    "Atta aaya 20 kilo",
    "Ram ko 2kg chini becho",
    "Mohan ka udhaar 500",
    "Aaj ki sale dikhao",
    "Stock kitna hai?"
  ];

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-100 font-sans selection:bg-amber-500/30 overflow-hidden flex flex-col">
      
      {/* Top Header / Status bar */}
      <header className="p-8 flex justify-between items-center z-10">
        <div>
          <h1 className="text-xl font-bold tracking-tight">SWAR KIRANA</h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold">Operations Center</p>
        </div>
        
        <div className="flex bg-zinc-900/50 p-1 rounded-full border border-zinc-800">
           {languages.map(lang => (
             <button
               key={lang.code}
               onClick={() => setLanguage(lang.code)}
               className={`px-4 py-2 rounded-full text-[10px] font-bold tracking-wider transition-all ${language === lang.code ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'text-zinc-500 border border-transparent hover:text-zinc-300'}`}
             >
               {lang.name.toUpperCase()}
             </button>
           ))}
        </div>
      </header>

      {/* Main Voice View */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex items-center gap-2 bg-rose-500/10 text-rose-400 px-4 py-2 rounded-2xl border border-rose-500/20 text-sm"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.div>
        )}

        <Orb isListening={isListening} isProcessing={isProcessing} onClick={handleOrbClick} />

        <div className="mt-16 text-center max-w-lg space-y-6">
          <AnimatePresence mode="wait">
            {isListening || transcript ? (
              <div className="space-y-2">
                <p className="text-3xl font-light text-zinc-500 uppercase tracking-tighter">
                  {isListening ? "Listening..." : "Processing..."}
                </p>
                <motion.p
                  key="transcript"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-4xl font-bold bg-gradient-to-r from-amber-200 via-amber-500 to-zinc-600 bg-clip-text text-transparent italic leading-[1.1]"
                >
                  "{transcript || "..."}"
                </motion.p>
              </div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.3em]">
                  Tap the orb to start
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                   {hints.map((hint, i) => (
                     <button 
                       key={i}
                       className="px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-[10px] text-zinc-500 italic hover:border-zinc-700 transition-colors"
                     >
                       Try "{hint}"
                     </button>
                   ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Affordance */}
      <footer className="p-8 flex flex-col items-center">
        <motion.button
          onClick={() => setShowDashboard(true)}
          whileHover={{ y: -5 }}
          className="flex flex-col items-center gap-3 transition-colors text-zinc-500 hover:text-zinc-300"
        >
          <div className="w-12 h-1.5 bg-zinc-800 rounded-full" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Open Dashboard</span>
            <ChevronUp className="w-3 h-3" />
          </div>
        </motion.button>
      </footer>

      {/* Dashboard Overlay */}
      <Dashboard 
        isOpen={showDashboard} 
        onClose={() => setShowDashboard(false)} 
        data={appState} 
      />

      {/* Global Background Elements */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/[0.02] rounded-full blur-[100px]" />
      </div>
    </div>
  );
}
