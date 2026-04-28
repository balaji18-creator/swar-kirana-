
import { motion, AnimatePresence } from 'motion/react';

interface OrbProps {
  isListening: boolean;
  isProcessing: boolean;
  onClick: () => void;
}

export const Orb = ({ isListening, isProcessing, onClick }: OrbProps) => {
  return (
    <div className="relative flex items-center justify-center">
      {/* Ambient Glow Layers */}
      <AnimatePresence>
        {isListening && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.2, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute w-96 h-96 bg-amber-500/10 rounded-full blur-[100px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0.05, 0.1, 0.05], scale: [1, 1.1, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute w-80 h-80 bg-amber-500/5 rounded-full blur-[60px]"
            />
          </>
        )}
      </AnimatePresence>
      
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10"
      >
        <button
          onClick={onClick}
          className={`
            relative w-64 h-64 rounded-full border border-amber-500/30 bg-zinc-950 
            flex items-center justify-center transition-all duration-700
            ${isListening ? 'shadow-[0_0_80px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20' : 'ring-1 ring-zinc-900'}
          `}
        >
          {/* Inner Rotating Core */}
          <motion.div
            animate={{
              rotate: isProcessing || isListening ? 360 : 0,
              scale: isListening ? [1, 1.05, 1] : 1
            }}
            transition={{
              rotate: { duration: isProcessing ? 2 : 10, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity }
            }}
            className={`
              w-52 h-52 rounded-full border-t-2 border-l-2 border-amber-500/60 
              bg-gradient-to-tr from-zinc-950 to-amber-900/40 
              flex items-center justify-center shadow-inner
            `}
          >
            <div className={`w-4 h-4 rounded-full shadow-[0_0_15px_#f59e0b] ${isListening ? 'bg-amber-400' : 'bg-amber-900/50'}`} />
          </motion.div>
        </button>
      </motion.div>
    </div>
  );
};
