/**
 * useFinances Hook - Business logic for financial management
 * Backend-only implementation - no local storage
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useAppStore } from '@/stores/app.store';
import { useAuthStore } from '@/stores/auth.store';
import { CashTransaction, FinancialSummary } from '@/lib/types';
import { showToast } from '@/lib/toast';
import { useEgressesAPI } from './useEgressesAPI';
import { egressMapping } from '@/lib/egress-types';
import type { Egress } from '@/services/egresses.service';

export function useFinances() {
  const { 
    cashTransactions, 
    addCashTransaction, 
    getFinancialSummary 
  } = useAppStore();

  // Get current user for userId
  const { user } = useAuthStore();

  // Backend API integration - only backend
  const egressesAPI = useEgressesAPI();
  const [egresses, setEgresses] = useState<Egress[]>([]);

  // Load egresses from backend on mount
  useEffect(() => {
    loadEgresses();
  }, []);

  // Load egresses from backend
  const loadEgresses = useCallback(async () => {
    try {
      console.log('🔄 Loading egresses from backend...');
      const egressesData = await egressesAPI.getAllEgresses();
      console.log('📊 Egresses loaded from backend:', egressesData);
      setEgresses(egressesData);
    } catch (error) {
      console.error('Error loading egresses:', error);
      showToast.error('Error', 'No se pudieron cargar los egresos del servidor.');
    }
  }, [egressesAPI]);

  // Convert egresses to local expense format for compatibility
  const expenses = useMemo(() => {
    console.log('🔄 Mapping egresses to expenses:', egresses);
    const mappedExpenses = egresses.map(egress => egressMapping.mapApiEgressToExpense(egress));
    console.log('📊 Mapped expenses:', mappedExpenses);
    return mappedExpenses;
  }, [egresses]);

  // Get today's summary by default
  const summary = useMemo(() => {
    // Create a temporary store state for summary calculation
    const tempSummary = getFinancialSummary(new Date());
    
    // Add expenses to the summary
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    return {
      ...tempSummary,
      totalEgresos: tempSummary.totalEgresos + totalExpenses,
      netBalance: tempSummary.netBalance - totalExpenses,
    };
  }, [getFinancialSummary, cashTransactions, expenses]);

  // Get all transactions for current view (can be filtered later)
  const transactions = useMemo(() => {
    // Combine cash transactions and expenses (egresos from backend)
    const allTransactions = [
      ...cashTransactions,
      ...expenses.map(expense => ({
        id: expense.id,
        type: 'egreso' as const,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        paymentMethod: expense.paymentMethod,
        notes: expense.notes,
        userId: expense.userId,
        createdAt: expense.createdAt, // Keep as Date object
      }))
    ];
    
    return allTransactions.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }, [cashTransactions, expenses]);

  const createExpense = useCallback(async (expenseData: Omit<import('@/lib/types').Expense, 'id' | 'createdAt' | 'userId'>) => {
    try {
      // Check if user is authenticated
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      // Create in backend only with authenticated user ID
      const createEgressData = {
        ...egressMapping.mapExpenseToCreateEgress(expenseData),
        userId: user.id,
        paymentMethod: expenseData.paymentMethod as 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'OTHER',
      } as import('@/services/egresses.service').CreateEgressRequest;
      
      const createdEgress = await egressesAPI.createEgress(createEgressData);
      
      // Update local state
      setEgresses(prev => [...prev, createdEgress]);
      showToast.success('Egreso registrado', 'El egreso ha sido registrado en el servidor.');
      
      // Return in local format for compatibility
      return egressMapping.mapApiEgressToExpense(createdEgress);
    } catch (error) {
      console.error('Error creating expense:', error);
      showToast.error('Error', 'No se pudo registrar el egreso en el servidor.');
      throw error;
    }
  }, [egressesAPI, user]);

  const createCashTransaction = useCallback(async (transactionData: Omit<CashTransaction, 'id' | 'createdAt'>) => {
    try {
      const transaction: CashTransaction = {
        ...transactionData,
        id: crypto.randomUUID(),
        createdAt: new Date()
      };

      addCashTransaction(transaction);
      showToast.success('Transacción registrada', 'La transacción ha sido agregada correctamente.');
      return transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      showToast.error('Error', 'No se pudo registrar la transacción.');
      throw error;
    }
  }, [addCashTransaction]);

  const getTransactionsByDateRange = useCallback((from: Date, to: Date) => {
    return cashTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.createdAt);
      return transactionDate >= from && transactionDate <= to;
    });
  }, [cashTransactions]);

  const exportTransactions = useCallback(async (from: Date, to: Date) => {
    try {
      const filteredTransactions = getTransactionsByDateRange(from, to);
      
      if (filteredTransactions.length === 0) {
        showToast.error('Sin datos', 'No hay transacciones en el rango seleccionado.');
        return;
      }

      // Simple CSV export for MVP
      const headers = ['Fecha', 'Tipo', 'Descripcion', 'Categoria', 'Metodo de Pago', 'Monto'];
      const csvContent = [
        headers.join(','),
        ...filteredTransactions.map(t => [
          new Date(t.createdAt).toLocaleDateString('es-AR'),
          t.type === 'ingreso' ? 'Ingreso' : 'Egreso',
          `"${t.description}"`,
          t.category,
          t.paymentMethod,
          t.amount.toString()
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      
      const fromStr = from.toISOString().split('T')[0];
      const toStr = to.toISOString().split('T')[0];
      link.download = `mistica-transacciones-${fromStr}-${toStr}.csv`;
      
      link.click();
      
      showToast.success('Exportación exitosa', `Se exportaron ${filteredTransactions.length} transacciones.`);
    } catch (error) {
      console.error('Export error:', error);
      showToast.error('Error al exportar', 'No se pudo generar el archivo.');
      throw error;
    }
  }, [getTransactionsByDateRange]);

  const getFinancialSummaryForRange = useCallback((from: Date, to: Date): FinancialSummary => {
    // For MVP, we'll use the daily summary but could be extended for ranges
    return getFinancialSummary(from);
  }, [getFinancialSummary]);

  const stats = useMemo(() => ({
    totalTransactions: cashTransactions.length,
    totalExpenses: expenses.length,
    todayIngresos: summary.totalIngresos,
    todayEgresos: summary.totalEgresos,
    balance: summary.netBalance
  }), [cashTransactions.length, expenses.length, summary]);

  // Refresh data from backend
  const refreshData = useCallback(async () => {
    await loadEgresses();
  }, [loadEgresses]);

  return {
    // Data
    transactions,
    expenses, // Backend egresses converted to local format
    summary,
    stats,
    
    // Backend integration
    refreshData,
    isLoading: egressesAPI.isLoading,
    
    // Actions
    createExpense,
    createCashTransaction,
    exportTransactions,
    getTransactionsByDateRange,
    getFinancialSummaryForRange
  };
}