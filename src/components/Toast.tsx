import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const ICONS = {
  success: <CheckCircle className="w-4 h-4 text-emerald-400" />,
  error:   <XCircle    className="w-4 h-4 text-rose-400" />,
  info:    <Info       className="w-4 h-4 text-amber-400" />,
};

const BG = {
  success: 'border-emerald-500/20 bg-emerald-500/5',
  error:   'border-rose-500/20 bg-rose-500/5',
  info:    'border-amber-500/20 bg-amber-500/5',
};

export const Toast = ({ toasts, onDismiss }: ToastProps) => (
  <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
    <AnimatePresence>
      {toasts.map(t => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, y: -16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0,   scale: 1    }}
          exit={{    opacity: 0, y: -8,  scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-xl ${BG[t.variant]}`}
        >
          <span className="mt-0.5 shrink-0">{ICONS[t.variant]}</span>
          <p className="text-sm text-zinc-200 flex-1 leading-snug">{t.message}</p>
          <button
            onClick={() => onDismiss(t.id)}
            className="shrink-0 text-zinc-600 hover:text-zinc-400 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);
