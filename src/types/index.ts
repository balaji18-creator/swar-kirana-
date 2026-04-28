
export enum TransactionType {
  SALE = 'SALE',
  ADD_STOCK = 'ADD_STOCK',
  CREDIT = 'CREDIT',
  PAYMENT = 'PAYMENT'
}

export interface Product {
  id?: string;
  name: string;
  stock: number;
  unit: string;
  price: number;
  minStock: number;
}

export interface Customer {
  id?: string;
  name: string;
  balance: number;
}

export interface Transaction {
  id?: string;
  type: TransactionType;
  item?: string;
  amount: number;
  customer?: string;
  timestamp: string;
  transcript?: string;
  reply?: string;
}

export interface AppState {
  inventory: Product[];
  customers: Customer[];
  history: Transaction[];
  kpis: {
    salesToday: number;
    pendingKhata: number;
    itemsInStock: number;
    lowStockCount: number;
  };
}
