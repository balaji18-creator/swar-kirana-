// ─── Intent & Language ──────────────────────────────────────────────────────

export type Language = 'hi-IN' | 'te-IN' | 'en-IN';

export enum Intent {
  ADD_STOCK    = 'ADD_STOCK',
  SALE         = 'SALE',
  CREDIT       = 'CREDIT',
  PAYMENT      = 'PAYMENT',
  QUERY_STOCK  = 'QUERY_STOCK',
  QUERY_SALE   = 'QUERY_SALE',
  UNKNOWN      = 'UNKNOWN',
}

export interface ParsedCommand {
  intent: Intent;
  params: {
    item?: string;
    quantity?: number;
    amount?: number;
    customer?: string;
  };
  reply: string;
}

// ─── Domain models ───────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  stock: number;
  unit: string;
  price: number;
  minStock: number;
}

export interface Customer {
  id: string;
  name: string;
  balance: number;
}

export interface Transaction {
  id: string;
  type: Intent;
  item?: string;
  amount: number;
  price?: number;
  customer?: string;
  timestamp: string;
  transcript?: string;
  reply?: string;
  language?: Language;
  status: 'SUCCESS' | 'FAILED';
}

export interface KPIs {
  salesToday: number;       // units sold today
  revenueTodayINR: number;  // ₹ revenue today
  pendingKhata: number;     // total outstanding credit
  itemsInStock: number;     // total units across all products
  lowStockCount: number;    // products below minStock
}

export interface AppState {
  inventory: Product[];
  customers: Customer[];
  history: Transaction[];
  kpis: KPIs;
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}
