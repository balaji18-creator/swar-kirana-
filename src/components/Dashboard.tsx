
import { motion, AnimatePresence } from 'motion/react';
import { X, TrendingUp, Users, Package, AlertTriangle, History } from 'lucide-react';
import { AppState } from '../types';

interface DashboardProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppState;
}

export const Dashboard = ({ isOpen, onClose, data }: DashboardProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 top-12 bg-zinc-950 border-t border-zinc-800 rounded-t-[40px] z-50 flex flex-col shadow-2xl"
          >
            {/* Handle */}
            <div className="w-full py-6 flex justify-center cursor-pointer" onClick={onClose}>
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full" />
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-20">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">SWAR KIRANA</h2>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold">Operations Center</p>
                </div>
                <button onClick={onClose} className="p-3 bg-zinc-900 rounded-full border border-zinc-800 hover:border-zinc-700 transition-colors">
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="bg-zinc-900/40 p-5 rounded-3xl border border-zinc-800">
                  <p className="text-[10px] text-zinc-500 font-bold mb-1 uppercase tracking-wider">Today's Sales</p>
                  <p className="text-3xl font-bold text-amber-500">₹{data.kpis.salesToday}</p>
                  <p className="text-[10px] text-emerald-500 mt-1 uppercase font-bold tracking-tighter">Live Update</p>
                </div>
                <div className="bg-zinc-900/40 p-5 rounded-3xl border border-zinc-800">
                  <p className="text-[10px] text-zinc-500 font-bold mb-1 uppercase tracking-wider">Khata Due</p>
                  <p className="text-3xl font-bold text-rose-500">₹{data.kpis.pendingKhata}</p>
                  <p className="text-[10px] text-zinc-600 mt-1 uppercase font-bold tracking-tighter">Pending Records</p>
                </div>
              </div>

              {/* Inventory Summary */}
              <div className="mb-10">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Stock Alerts</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${data.kpis.lowStockCount > 0 ? 'bg-rose-500/20 text-rose-500 border-rose-500/30' : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'}`}>
                    {data.kpis.lowStockCount} Critical
                  </span>
                </div>
                
                <div className="space-y-3">
                  {Array.isArray(data.inventory) ? data.inventory.map(item => (
                    <div key={item.id} className="p-5 bg-zinc-900/60 border border-border/40 rounded-3xl flex justify-between items-center backdrop-blur-sm">
                      <div>
                        <p className="text-sm font-semibold text-zinc-200">{item.name}</p>
                        <p className={`text-[10px] uppercase font-bold tracking-tighter ${item.stock <= item.minStock ? 'text-rose-400' : 'text-zinc-500'}`}>
                          {item.stock <= item.minStock ? 'Low' : 'Current'}: {item.stock} {item.unit}
                        </p>
                      </div>
                      <div className="h-1.5 w-20 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${
                            item.stock <= item.minStock ? 'bg-rose-500' : 'bg-emerald-500'
                          }`} 
                          style={{ width: `${Math.min((item.stock / (item.minStock * 2)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )) : (
                    <p className="text-zinc-600 italic text-sm">No inventory data available</p>
                  )}
                </div>
              </div>

              {/* Voice Log */}
              <div className="mt-10">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Activity Log</h3>
                <div className="space-y-6">
                  {Array.isArray(data.history) ? data.history.map(log => (
                    <div key={log.id} className="flex gap-4 items-start group">
                      <div className={`w-1 h-6 shrink-0 rounded-full mt-1 transition-all ${
                        log.type === 'SALE' ? 'bg-emerald-500' : 
                        log.type === 'ADD_STOCK' ? 'bg-amber-500' : 
                        'bg-zinc-700'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-300 italic group-hover:text-white transition-colors leading-tight">
                          "{log.transcript}"
                        </p>
                        <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-tighter mt-1">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {log.type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-zinc-600 italic text-sm">No recent activity</p>
                  )}
                  {Array.isArray(data.history) && data.history.length === 0 && <p className="text-zinc-600 italic text-sm">No activity recorded yet</p>}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
