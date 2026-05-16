import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface OrbProps {
  isListening:  boolean;
  isProcessing: boolean;
  interimText?: string;
  onClick:      () => void;
}

export const Orb = ({ isListening, isProcessing, interimText, onClick }: OrbProps) => {
  const BAR_COUNT = 20;

  return (
    <div className="relative flex flex-col items-center justify-center gap-8">

      {/* ── Ambient glow ─────────────────────────────────────────── */}
      <AnimatePresence>
        {(isListening || isProcessing) && (
          <motion.div
            key="glow"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.08, 0.18, 0.08], scale: [1, 1.15, 1] }}
            exit={{    opacity: 0, scale: 0.8 }}
            transition={{ duration: 3.5, repeat: Infinity }}
            className="absolute w-[420px] h-[420px] bg-amber-500/20 rounded-full blur-[120px] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* ── Orb button ───────────────────────────────────────────── */}
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.04 }}
        whileTap={{   scale: 0.97 }}
        aria-label={isListening ? 'Stop listening' : 'Start listening'}
        aria-pressed={isListening}
        className={[
          'relative w-52 h-52 rounded-full flex items-center justify-center',
          'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
          'transition-all duration-500',
          isListening
            ? 'border-amber-500/50 shadow-[0_0_60px_rgba(245,158,11,0.18)] ring-1 ring-amber-500/20'
            : 'border-zinc-800 ring-1 ring-zinc-900 hover:border-zinc-700',
        ].join(' ')}
      >
        {/* Rotating ring */}
        <motion.div
          animate={{
            rotate: isListening || isProcessing ? 360 : 0,
          }}
          transition={{
            duration: isProcessing ? 1.5 : 8,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute inset-3 rounded-full border-t-2 border-l-2 border-amber-500/40"
        />

        {/* Inner core */}
        <div
          className={[
            'w-36 h-36 rounded-full flex items-center justify-center transition-all duration-500',
            isListening
              ? 'bg-gradient-to-tr from-zinc-950 to-amber-900/30'
              : 'bg-zinc-950',
          ].join(' ')}
        >
          {isProcessing ? (
            <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
          ) : isListening ? (
            // Waveform bars
            <div className="flex items-center gap-[3px] h-8">
              {Array.from({ length: BAR_COUNT }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-[3px] bg-amber-400 rounded-full"
                  animate={{ height: ['6px', `${12 + Math.random() * 20}px`, '6px'] }}
                  transition={{
                    duration: 0.4 + Math.random() * 0.4,
                    repeat: Infinity,
                    delay: i * 0.04,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          ) : (
            <Mic className="w-7 h-7 text-zinc-500" />
          )}
        </div>
      </motion.button>

      {/* ── Interim transcript pill ──────────────────────────────── */}
      <AnimatePresence>
        {interimText && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{    opacity: 0, y: 4 }}
            className="px-4 py-2 bg-zinc-900/70 border border-zinc-800 rounded-full text-sm text-zinc-400 italic max-w-xs text-center backdrop-blur-sm"
          >
            {interimText}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
