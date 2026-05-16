import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp, AlertCircle } from 'lucide-react';
import { Orb } from './components/Orb';
import { Dashboard } from './components/Dashboard';
import { Toast } from './components/Toast';
import { useVoiceRecognition } from './hooks/useVoiceRecognition';
import { useToast } from './hooks/useToast';
import { parseCommand } from './lib/gemini';
import { AppState, Language, Intent } from './types';

const DEFAULT_STATE: AppState = {
  inventory:  [],
  customers:  [],
  history:    [],
  kpis: {
    salesToday:      0,
    revenueTodayINR: 0,
    pendingKhata:    0,
    itemsInStock:    0,
    lowStockCount:   0,
  },
};

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'hi-IN', label: 'हिन्दी' },
  { code: 'te-IN', label: 'తెలుగు' },
  { code: 'en-IN', label: 'English' },
];

const HINTS: { lang: Language; text: string }[] = [
  { lang: 'hi-IN', text: 'Atta aaya 20 kilo'     },
  { lang: 'hi-IN', text: 'Ram ko 2kg chini becho' },
  { lang: 'te-IN', text: 'Palu 5 packets vachindi'},
  { lang: 'hi-IN', text: 'Stock kitna hai?'       },
  { lang: 'en-IN', text: 'Aaj ki sale dikhao'     },
];

export default function App() {
  const [language,       setLanguage]       = useState<Language>('hi-IN');
  const [showDashboard,  setShowDashboard]  = useState(false);
  const [isProcessing,   setIsProcessing]   = useState(false);
  const [appState,       setAppState]       = useState<AppState>(DEFAULT_STATE);
  const [lastReply,      setLastReply]      = useState('');
  const processingRef = useRef(false);

  const { toasts, addToast, removeToast } = useToast();
  const {
    isListening, transcript, interimText,
    startListening, stopListening, error, setTranscript,
  } = useVoiceRecognition(language);

  // ── Fetch all data ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [invRes, histRes, kpiRes, custRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/history'),
        fetch('/api/kpis/today'),
        fetch('/api/customers'),
      ]);

      const [inventory, history, kpis, custData] = await Promise.all([
        invRes.json(), histRes.json(), kpiRes.json(), custRes.json(),
      ]);

      setAppState(prev => ({
        ...prev,
        inventory: Array.isArray(inventory) ? inventory : prev.inventory,
        history:   Array.isArray(history)   ? history   : prev.history,
        customers: Array.isArray(custData?.customers) ? custData.customers : prev.customers,
        kpis: (kpis && !kpis.error) ? kpis : prev.kpis,
      }));
    } catch (err) {
      console.error('fetchData error:', err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Keyboard shortcut: Space = toggle mic ──────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !['INPUT', 'TEXTAREA', 'BUTTON'].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        isListening ? stopListening() : startListening();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isListening, startListening, stopListening]);

  // ── Process transcript when listening stops ────────────────────────────────
  useEffect(() => {
    if (!isListening && transcript && !processingRef.current) {
      handleFinalTranscript(transcript);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  // ── Handle recognised speech ───────────────────────────────────────────────
  const handleFinalTranscript = async (text: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    try {
      // 1. AI parsing
      const parsed = await parseCommand(text, language);

      // 2. Backend execution
      const res = await fetch('/api/execute-intent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent:     parsed.intent,
          params:     parsed.params,
          transcript: text,
          reply:      parsed.reply,
          language,
        }),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const result = await res.json();

      // 3. Toast feedback
      if (result.success) {
        addToast(result.message || parsed.reply, 'success');
      } else {
        addToast(result.message || 'Something went wrong', 'error');
      }

      // 4. Voice reply
      const replyText = result.reply || parsed.reply;
      setLastReply(replyText);
      if (replyText) {
        const synth    = window.speechSynthesis;
        const utt      = new SpeechSynthesisUtterance(replyText);
        utt.lang       = language;
        utt.rate       = 0.95;
        utt.pitch      = 1.0;
        synth.cancel(); // cancel any in-progress
        synth.speak(utt);
      }

      // 5. Optimistic refresh + open dashboard on query
      const queryIntents = [Intent.QUERY_STOCK, Intent.QUERY_SALE];
      if (queryIntents.includes(parsed.intent)) setShowDashboard(true);

      await fetchData();
    } catch (err: any) {
      console.error('Command processing error:', err);
      addToast('Connection error. Check your internet.', 'error');
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
      setTranscript('');
    }
  };

  const handleOrbClick = () => {
    if (isProcessing) return;
    isListening ? stopListening() : startListening();
  };

  // ── Status text ───────────────────────────────────────────────────────────
  const statusText = isProcessing
    ? 'Processing...'
    : isListening
    ? 'Listening...'
    : lastReply || null;

  return (
    <div className="min-h-dvh bg-[#070708] text-zinc-100 font-sans selection:bg-amber-500/30 overflow-hidden flex flex-col">

      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="px-6 py-5 flex justify-between items-center z-10 border-b border-zinc-900">
        <div>
          <h1 className="text-sm font-bold tracking-[0.15em] uppercase font-mono">Swar Kirana</h1>
          <p className="text-[9px] text-zinc-600 uppercase tracking-[0.25em] font-bold mt-0.5">Voice Operations</p>
        </div>

        {/* Language selector */}
        <div className="flex bg-zinc-900/60 p-1 rounded-full border border-zinc-800">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={[
                'px-3.5 py-1.5 rounded-full text-[10px] font-bold tracking-wider transition-all',
                language === lang.code
                  ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : 'text-zinc-500 hover:text-zinc-300',
              ].join(' ')}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main voice view ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative gap-6">

        {/* Browser error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{    opacity: 0, y: -12 }}
              className="flex items-center gap-2 bg-rose-500/10 text-rose-400 px-4 py-2.5 rounded-2xl border border-rose-500/20 text-xs max-w-xs text-center"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Orb */}
        <Orb
          isListening={isListening}
          isProcessing={isProcessing}
          interimText={interimText}
          onClick={handleOrbClick}
        />

        {/* Status text */}
        <div className="text-center max-w-sm space-y-5">
          <AnimatePresence mode="wait">
            {statusText ? (
              <motion.p
                key="status"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{    opacity: 0, y: -8 }}
                className="text-base text-zinc-400 italic leading-relaxed"
              >
                {statusText}
              </motion.p>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5"
              >
                <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.3em]">
                  Tap the orb or press <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-[9px] font-mono">Space</kbd>
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {HINTS.map((hint, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (!isProcessing) {
                          setLanguage(hint.lang);
                          setTimeout(() => {
                            // Show hint as if spoken
                            handleFinalTranscript(hint.text);
                          }, 100);
                        }
                      }}
                      className="px-3 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-[10px] text-zinc-500 italic hover:border-zinc-700 hover:text-zinc-400 transition-all"
                    >
                      "{hint.text}"
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="pb-8 flex flex-col items-center">
        <motion.button
          onClick={() => setShowDashboard(true)}
          whileHover={{ y: -3 }}
          className="flex flex-col items-center gap-2 text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <div className="w-10 h-1 bg-zinc-800 rounded-full" />
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.25em]">
            Dashboard
            <ChevronUp className="w-3 h-3" />
          </span>
        </motion.button>
      </footer>

      {/* Dashboard slide-up */}
      <Dashboard
        isOpen={showDashboard}
        onClose={() => setShowDashboard(false)}
        data={appState}
        language={language}
      />

      {/* Background ambient */}
      <div className="fixed inset-0 pointer-events-none -z-10" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-amber-500/[0.025] rounded-full blur-[140px]" />
      </div>
    </div>
  );
}
