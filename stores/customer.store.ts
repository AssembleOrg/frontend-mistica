import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BalanceTransaction {
  id: string;
  type: 'deposit' | 'charge'; // deposit = seña/depósito, charge = consumo
  amount: number;
  description: string;
  saleId?: string; // Referencia a venta si es consumo
  employeeId?: string; // Quién procesó la transacción
  createdAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  balance: number; // Saldo a favor en pesos argentinos
  transactions: BalanceTransaction[];
  totalDeposited: number; // Total de señas depositadas históricamente
  totalSpent: number; // Total consumido históricamente
  visitCount: number; // Número de visitas
  lastVisit?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface CustomerStats {
  totalCustomers: number;
  totalBalance: number; // Total de dinero que deben los clientes (señas pendientes)
  activeCustomers: number; // Clientes con saldo > 0
  topCustomers: Array<{
    customer: Customer;
    totalSpent: number;
  }>;
}

interface CustomerState {
  customers: Customer[];
  searchResults: Customer[];
  selectedCustomer: Customer | null;
  
  // Actions
  createCustomer: (data: Omit<Customer, 'id' | 'balance' | 'transactions' | 'totalDeposited' | 'totalSpent' | 'visitCount' | 'createdAt' | 'updatedAt'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  
  // Balance operations
  addDeposit: (customerId: string, amount: number, description: string, employeeId?: string) => void;
  chargeBalance: (customerId: string, amount: number, description: string, saleId?: string, employeeId?: string) => boolean;
  
  // Search and selection
  searchCustomers: (query: string) => Customer[];
  selectCustomer: (customer: Customer | null) => void;
  getCustomerById: (id: string) => Customer | undefined;
  getCustomerByPhone: (phone: string) => Customer | undefined;
  
  // Stats and analytics
  getCustomerStats: () => CustomerStats;
  getCustomerHistory: (customerId: string, limit?: number) => BalanceTransaction[];
  getCustomersWithBalance: () => Customer[];
  
  // Utils
  clearSearch: () => void;
  validateBalance: (customerId: string, amount: number) => boolean;
}

const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      customers: [],
      searchResults: [],
      selectedCustomer: null,

      createCustomer: (data) => {
        const newCustomer: Customer = {
          ...data,
          id: crypto.randomUUID(),
          balance: 0,
          transactions: [],
          totalDeposited: 0,
          totalSpent: 0,
          visitCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set(state => ({
          customers: [...state.customers, newCustomer]
        }));

        return newCustomer;
      },

      updateCustomer: (id, updates) => {
        set(state => ({
          customers: state.customers.map(customer =>
            customer.id === id
              ? { ...customer, ...updates, updatedAt: new Date() }
              : customer
          ),
          selectedCustomer: state.selectedCustomer?.id === id
            ? { ...state.selectedCustomer, ...updates, updatedAt: new Date() }
            : state.selectedCustomer
        }));
      },

      deleteCustomer: (id) => {
        set(state => ({
          customers: state.customers.filter(customer => customer.id !== id),
          selectedCustomer: state.selectedCustomer?.id === id ? null : state.selectedCustomer
        }));
      },

      addDeposit: (customerId, amount, description, employeeId) => {
        const transaction: BalanceTransaction = {
          id: crypto.randomUUID(),
          type: 'deposit',
          amount,
          description,
          employeeId,
          createdAt: new Date()
        };

        set(state => ({
          customers: state.customers.map(customer => {
            if (customer.id === customerId) {
              return {
                ...customer,
                balance: customer.balance + amount,
                totalDeposited: customer.totalDeposited + amount,
                transactions: [transaction, ...customer.transactions],
                lastVisit: new Date(),
                updatedAt: new Date()
              };
            }
            return customer;
          }),
          selectedCustomer: state.selectedCustomer?.id === customerId
            ? {
                ...state.selectedCustomer,
                balance: state.selectedCustomer.balance + amount,
                totalDeposited: state.selectedCustomer.totalDeposited + amount,
                transactions: [transaction, ...state.selectedCustomer.transactions],
                lastVisit: new Date(),
                updatedAt: new Date()
              }
            : state.selectedCustomer
        }));
      },

      chargeBalance: (customerId, amount, description, saleId, employeeId) => {
        const customer = get().customers.find(c => c.id === customerId);
        if (!customer || customer.balance < amount) {
          return false; // Saldo insuficiente
        }

        const transaction: BalanceTransaction = {
          id: crypto.randomUUID(),
          type: 'charge',
          amount,
          description,
          saleId,
          employeeId,
          createdAt: new Date()
        };

        set(state => ({
          customers: state.customers.map(cust => {
            if (cust.id === customerId) {
              return {
                ...cust,
                balance: cust.balance - amount,
                totalSpent: cust.totalSpent + amount,
                visitCount: cust.visitCount + 1,
                transactions: [transaction, ...cust.transactions],
                lastVisit: new Date(),
                updatedAt: new Date()
              };
            }
            return cust;
          }),
          selectedCustomer: state.selectedCustomer?.id === customerId
            ? {
                ...state.selectedCustomer,
                balance: state.selectedCustomer.balance - amount,
                totalSpent: state.selectedCustomer.totalSpent + amount,
                visitCount: state.selectedCustomer.visitCount + 1,
                transactions: [transaction, ...state.selectedCustomer.transactions],
                lastVisit: new Date(),
                updatedAt: new Date()
              }
            : state.selectedCustomer
        }));

        return true;
      },

      searchCustomers: (query) => {
        if (!query.trim()) {
          set({ searchResults: [] });
          return [];
        }

        const lowerQuery = query.toLowerCase();
        const results = get().customers.filter(customer =>
          customer.name.toLowerCase().includes(lowerQuery) ||
          customer.phone?.includes(query) ||
          customer.email?.toLowerCase().includes(lowerQuery)
        );

        set({ searchResults: results });
        return results;
      },

      selectCustomer: (customer) => {
        set({ selectedCustomer: customer });
      },

      getCustomerById: (id) => {
        return get().customers.find(customer => customer.id === id);
      },

      getCustomerByPhone: (phone) => {
        return get().customers.find(customer => customer.phone === phone);
      },

      getCustomerStats: () => {
        const customers = get().customers;
        const totalCustomers = customers.length;
        const totalBalance = customers.reduce((sum, customer) => sum + customer.balance, 0);
        const activeCustomers = customers.filter(customer => customer.balance > 0).length;
        
        const topCustomers = customers
          .map(customer => ({
            customer,
            totalSpent: customer.totalSpent
          }))
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 5);

        return {
          totalCustomers,
          totalBalance,
          activeCustomers,
          topCustomers
        };
      },

      getCustomerHistory: (customerId, limit = 20) => {
        const customer = get().customers.find(c => c.id === customerId);
        if (!customer) return [];
        
        return customer.transactions
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, limit);
      },

      getCustomersWithBalance: () => {
        return get().customers.filter(customer => customer.balance > 0);
      },

      clearSearch: () => {
        set({ searchResults: [] });
      },

      validateBalance: (customerId, amount) => {
        const customer = get().customers.find(c => c.id === customerId);
        return customer ? customer.balance >= amount : false;
      },
    }),
    {
      name: 'mistica-customers-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert string dates back to Date objects after rehydration
          state.customers = state.customers.map(customer => ({
            ...customer,
            createdAt: new Date(customer.createdAt),
            updatedAt: new Date(customer.updatedAt),
            lastVisit: customer.lastVisit ? new Date(customer.lastVisit) : undefined,
            transactions: customer.transactions.map(transaction => ({
              ...transaction,
              createdAt: new Date(transaction.createdAt)
            }))
          }));
        }
      },
    }
  )
);

export { useCustomerStore };