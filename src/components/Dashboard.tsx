import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, TrendingUp, Package, Users, History,
  AlertTriangle, Share2, ChevronRight, IndianRupee,
} from 'lucide-react';
import { AppState, Customer, Transaction, Intent } from '../types';

interface DashboardProps {
  isOpen:   boolean;
  onClose:  () => void;
  data:     AppState;
  language: string;
}

type Tab = 'kpis' | 'stock' | 'khata' | 'history';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'kpis',    label: 'Today',   icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { id: 'stock',   label: 'Stock',   icon: <Package    className="w-3.5 h-3.5" /> },
  { id: 'khata',   label: 'Khata',   icon: <Users      className="w-3.5 h-3.5" /> },
  { id: 'history', label: 'History', icon: <History    className="w-3.5 h-3.5" /> },
];

const TYPE_COLOR: Record<string, string> = {
  SALE:      'bg-emerald-500',
  ADD_STOCK: 'bg-amber-500',
  CREDIT:    'bg-rose-500',
  PAYMENT:   'bg-blue-500',
};

const TYPE_LABEL: Record<string, string> = {
  SALE:      'Sale',
  ADD_STOCK: 'Stock In',
  CREDIT:    'Credit',
  PAYMENT:   'Payment',
};

function KPICard({
  label, value, sub, accent,
}: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-3xl p-5">
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${accent}`}>{value}</p>
      <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-tight mt-1.5">{sub}</p>
    </div>
  );
}

function StockBar({ current, min }: { current: number; min: number }) {
  const pct = Math.min((current / Math.max(min * 3, 1)) * 100, 100);
  const low = current <= min;
  return (
    <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={`h-full rounded-full ${low ? 'bg-rose-500' : 'bg-emerald-500'}`}
      />
    </div>
  );
}

function generateWhatsAppText(data: AppState): string {
  const d = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  const lines = [
    `📊 *Swar Kirana – ${d}*`,
    ``,
    `💰 Sales today: ₹${data.kpis.revenueTodayINR.toLocaleString('en-IN')}`,
    `📦 Items in stock: ${data.kpis.itemsInStock}`,
    `📒 Pending khata: ₹${data.kpis.pendingKhata.toLocaleString('en-IN')}`,
  ];
  if (data.kpis.lowStockCount > 0) {
    lines.push(`⚠️ Low stock alerts: ${data.kpis.lowStockCount}`);
  }
  return encodeURIComponent(lines.join('\n'));
}

export const Dashboard = ({ isOpen, onClose, data, language }: DashboardProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('kpis');

  // Reset to KPIs whenever panel opens
  useEffect(() => { if (isOpen) setActiveTab('kpis'); }, [isOpen]);

  const shareOnWhatsApp = () => {
    const text = generateWhatsAppText(data);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{    opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{    y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed inset-x-0 bottom-0 top-10 bg-zinc-950 border-t border-zinc-800/80 rounded-t-[32px] z-50 flex flex-col shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Operations Dashboard"
          >
            {/* Drag handle */}
            <button
              onClick={onClose}
              className="w-full py-5 flex justify-center cursor-pointer focus-visible:outline-none"
              aria-label="Close dashboard"
            >
              <div className="w-10 h-1 bg-zinc-800 rounded-full" />
            </button>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4">
              <div>
                <h2 className="text-base font-bold tracking-tight">Operations Center</h2>
                <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] mt-0.5">
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={shareOnWhatsApp}
                  title="Share daily report on WhatsApp"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500/20 transition-colors"
                >
                  <Share2 className="w-3 h-3" />
                  Share
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 mx-6 mb-4 p-1 bg-zinc-900/60 rounded-2xl border border-zinc-800/40">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200',
                    activeTab === tab.id
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'text-zinc-500 hover:text-zinc-300',
                  ].join(' ')}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-10 scroll-smooth">
              <AnimatePresence mode="wait">
                {/* ── TODAY ────────────────────────────────────────────── */}
                {activeTab === 'kpis' && (
                  <motion.div
                    key="kpis"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{    opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <KPICard
                        label="Revenue Today"
                        value={`₹${(data.kpis.revenueTodayINR ?? 0).toLocaleString('en-IN')}`}
                        sub="₹ earned"
                        accent="text-amber-400"
                      />
                      <KPICard
                        label="Units Sold"
                        value={String(data.kpis.salesToday ?? 0)}
                        sub="items today"
                        accent="text-emerald-400"
                      />
                      <KPICard
                        label="Khata Due"
                        value={`₹${(data.kpis.pendingKhata ?? 0).toLocaleString('en-IN')}`}
                        sub="total outstanding"
                        accent="text-rose-400"
                      />
                      <KPICard
                        label="Low Stock"
                        value={String(data.kpis.lowStockCount ?? 0)}
                        sub={data.kpis.lowStockCount > 0 ? 'needs restock' : 'all good'}
                        accent={data.kpis.lowStockCount > 0 ? 'text-rose-400' : 'text-zinc-400'}
                      />
                    </div>

                    {/* Recent activity mini-feed */}
                    {data.history.length > 0 && (
                      <div className="mt-6">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-3">Recent Activity</p>
                        <div className="space-y-2">
                          {data.history.slice(0, 4).map(log => (
                            <div key={log.id} className="flex items-center gap-3 p-3 bg-zinc-900/40 rounded-2xl border border-zinc-800/40">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${TYPE_COLOR[log.type] ?? 'bg-zinc-700'}`} />
                              <p className="text-xs text-zinc-400 italic flex-1 truncate">"{log.transcript || log.type}"</p>
                              <span className="text-[9px] text-zinc-600 shrink-0">
                                {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── STOCK ────────────────────────────────────────────── */}
                {activeTab === 'stock' && (
                  <motion.div
                    key="stock"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{    opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Inventory</p>
                      {data.kpis.lowStockCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          {data.kpis.lowStockCount} low
                        </span>
                      )}
                    </div>

                    {data.inventory.length === 0 ? (
                      <div className="flex flex-col items-center py-16 text-center">
                        <Package className="w-10 h-10 text-zinc-700 mb-3" />
                        <p className="text-zinc-500 text-sm">No inventory yet</p>
                        <p className="text-zinc-600 text-xs mt-1">Say "Atta aaya 20 kilo" to add stock</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {data.inventory.map(item => (
                          <div
                            key={item.id}
                            className={[
                              'flex items-center gap-4 p-4 rounded-2xl border transition-colors',
                              item.stock <= item.minStock
                                ? 'bg-rose-500/5 border-rose-500/20'
                                : 'bg-zinc-900/40 border-zinc-800/40',
                            ].join(' ')}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-zinc-200">{item.name}</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">
                                ₹{item.price}/{item.unit} · min {item.minStock} {item.unit}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <p className={`text-sm font-bold tabular-nums ${
                                item.stock <= item.minStock ? 'text-rose-400' : 'text-zinc-200'
                              }`}>
                                {item.stock} <span className="text-xs font-normal text-zinc-500">{item.unit}</span>
                              </p>
                              <StockBar current={item.stock} min={item.minStock} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── KHATA ────────────────────────────────────────────── */}
                {activeTab === 'khata' && (
                  <motion.div
                    key="khata"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{    opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Customer Ledger</p>
                      <span className="text-[10px] text-zinc-500 tabular-nums">
                        Total owed: <span className="text-rose-400 font-bold">₹{data.kpis.pendingKhata.toLocaleString('en-IN')}</span>
                      </span>
                    </div>

                    {data.customers.length === 0 ? (
                      <div className="flex flex-col items-center py-16 text-center">
                        <Users className="w-10 h-10 text-zinc-700 mb-3" />
                        <p className="text-zinc-500 text-sm">No customers yet</p>
                        <p className="text-zinc-600 text-xs mt-1">Say "Ram ko 500 ka udhar" to add credit</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {data.customers
                          .slice()
                          .sort((a, b) => b.balance - a.balance)
                          .map((c: Customer) => (
                            <div
                              key={c.id}
                              className={[
                                'flex items-center gap-4 p-4 rounded-2xl border',
                                c.balance > 0
                                  ? 'bg-rose-500/5 border-rose-500/20'
                                  : 'bg-zinc-900/40 border-zinc-800/40',
                              ].join(' ')}
                            >
                              {/* Avatar */}
                              <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-zinc-400">
                                  {c.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-zinc-200">{c.name}</p>
                                <p className="text-[10px] text-zinc-500">
                                  {c.balance > 0 ? 'Amount due' : 'No dues'}
                                </p>
                              </div>
                              <p className={`text-sm font-bold tabular-nums ${
                                c.balance > 0 ? 'text-rose-400' : 'text-zinc-500'
                              }`}>
                                {c.balance > 0 ? `₹${c.balance.toLocaleString('en-IN')}` : '✓'}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── HISTORY ──────────────────────────────────────────── */}
                {activeTab === 'history' && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{    opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-4">Voice Log</p>

                    {data.history.length === 0 ? (
                      <div className="flex flex-col items-center py-16 text-center">
                        <History className="w-10 h-10 text-zinc-700 mb-3" />
                        <p className="text-zinc-500 text-sm">No activity yet</p>
                        <p className="text-zinc-600 text-xs mt-1">Tap the orb and speak a command</p>
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-3 top-0 bottom-0 w-px bg-zinc-800" />
                        <div className="space-y-4 pl-10">
                          {data.history.map((log: Transaction) => (
                            <div key={log.id} className="relative">
                              {/* Dot */}
                              <div className={`absolute -left-7 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${
                                TYPE_COLOR[log.type] ?? 'bg-zinc-700'
                              }`} />
                              <div className="p-3.5 bg-zinc-900/50 border border-zinc-800/40 rounded-2xl">
                                {log.transcript && (
                                  <p className="text-xs text-zinc-300 italic leading-relaxed mb-1.5">
                                    "{log.transcript}"
                                  </p>
                                )}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                    log.type === 'SALE'      ? 'bg-emerald-500/15 text-emerald-400' :
                                    log.type === 'ADD_STOCK' ? 'bg-amber-500/15 text-amber-400'     :
                                    log.type === 'CREDIT'    ? 'bg-rose-500/15 text-rose-400'       :
                                    log.type === 'PAYMENT'   ? 'bg-blue-500/15 text-blue-400'       :
                                                               'bg-zinc-800 text-zinc-500'
                                  }`}>
                                    {TYPE_LABEL[log.type] ?? log.type}
                                  </span>
                                  {log.item && <span className="text-[9px] text-zinc-500">{log.item}</span>}
                                  {log.customer && <span className="text-[9px] text-zinc-500">{log.customer}</span>}
                                  <span className="text-[9px] text-zinc-600 ml-auto">
                                    {new Date(log.timestamp).toLocaleTimeString('en-IN', {
                                      hour: '2-digit', minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
