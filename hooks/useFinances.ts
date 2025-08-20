/**
 * useFinances Hook - Business logic for financial management
 */

import { useCallback, useMemo } from 'react';
import { useAppStore } from '@/stores/app.store';
import { CashTransaction, Expense, FinancialSummary } from '@/lib/types';
import { showToast } from '@/lib/toast';

export function useFinances() {
  const { 
    cashTransactions, 
    expenses, 
    addExpense, 
    addCashTransaction, 
    getFinancialSummary 
  } = useAppStore();

  // Get today's summary by default
  const summary = useMemo(() => {
    return getFinancialSummary(new Date());
  }, [getFinancialSummary, cashTransactions, expenses]);

  // Get all transactions for current view (can be filtered later)
  const transactions = useMemo(() => {
    return [...cashTransactions].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [cashTransactions]);

  const createExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    try {
      const expense: Expense = {
        ...expenseData,
        id: crypto.randomUUID(),
        createdAt: new Date()
      };

      addExpense(expense);
      showToast.success('Gasto registrado', 'El gasto ha sido agregado correctamente.');
      return expense;
    } catch (error) {
      console.error('Error creating expense:', error);
      showToast.error('Error', 'No se pudo registrar el gasto.');
      throw error;
    }
  }, [addExpense]);

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

  return {
    // Data
    transactions,
    expenses,
    summary,
    stats,
    
    // Actions
    createExpense,
    createCashTransaction,
    exportTransactions,
    getTransactionsByDateRange,
    getFinancialSummaryForRange
  };
}