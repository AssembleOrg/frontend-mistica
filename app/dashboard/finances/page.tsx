/**
 * FINANCES DASHBOARD PAGE
 *
 * Módulo de Caja y Finanzas - MVP básico correlacionado con ventas
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TransactionsTable } from '@/components/dashboard/finances/transactions-table';
import { DateRangeFilter } from '@/components/dashboard/finances/date-range-filter';
import { ExpenseForm } from '@/components/dashboard/finances/expense-form';
import { useFinances } from '@/hooks/useFinances';
import { Download, DollarSign, Minus } from 'lucide-react';

export default function FinancesPage() {
  const { summary, transactions: allTransactions, exportTransactions } = useFinances();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    return {
      from: startOfDay,
      to: endOfDay,
    };
  });
  const [isExporting, setIsExporting] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  // Filter transactions by date range
  const transactions = React.useMemo(() => {
    return allTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.createdAt);
      const transactionDay = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
      const fromDay = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate());
      const toDay = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate());
      
      return transactionDay >= fromDay && transactionDay <= toDay;
    });
  }, [allTransactions, dateRange]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportTransactions(dateRange.from, dateRange.to);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExpenseSuccess = () => {
    setShowExpenseForm(false);
  };

  if (showExpenseForm) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-[#455a54] font-tan-nimbus mt-6'>
              Registrar Egreso
            </h1>
            <p className='text-[#455a54]/70 font-winter-solid'>
              Agregar un nuevo gasto al sistema financiero
            </p>
          </div>
          <Button
            variant='outline'
            onClick={() => setShowExpenseForm(false)}
            className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30'
          >
            Volver a Finanzas
          </Button>
        </div>

        <ExpenseForm
          onSuccess={handleExpenseSuccess}
          onCancel={() => setShowExpenseForm(false)}
        />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-[#455a54] font-tan-nimbus mt-6'>
            Caja y Finanzas
          </h1>
          <p className='text-[#455a54]/70 font-winter-solid'>
            Control financiero y resumen de movimientos de caja
          </p>
        </div>
        <div className='flex gap-3'>
          <Button
            onClick={() => setShowExpenseForm(true)}
            className='bg-red-600 hover:bg-red-700 text-white font-winter-solid'
          >
            <Minus className='mr-2 h-4 w-4' />
            Registrar Egreso
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className='bg-[#9d684e] hover:bg-[#9d684e]/90 text-white font-winter-solid'
          >
            {isExporting ? (
              <>Exportando...</>
            ) : (
              <>
                <Download className='mr-2 h-4 w-4' />
                Exportar Excel
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Date Filter & Export */}
      <Card className='border-[#9d684e]/20'>
        <CardHeader>
          <CardTitle className='text-lg font-tan-nimbus text-[#455a54] flex items-center gap-2'>
            <DollarSign className='h-5 w-5' />
            Filtrar Movimientos
          </CardTitle>
          <CardDescription className='text-[#455a54]/70'>
            Selecciona un rango de fechas para filtrar transacciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex gap-4 items-end'>
            <DateRangeFilter
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
            <div className='text-sm text-[#455a54]/70'>
              Mostrando {transactions.length} transacciones
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className='border-[#9d684e]/20'>
        <CardHeader>
          <CardTitle className='text-lg font-tan-nimbus text-[#455a54]'>
            Movimientos de Caja
          </CardTitle>
          <CardDescription className='text-[#455a54]/70'>
            Todas las transacciones, ventas y gastos del período seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionsTable
            transactions={transactions}
            dateRange={dateRange}
          />
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <Card className='border-[#455a54]/20 hover:shadow-md transition-shadow duration-200'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-[#455a54] font-winter-solid'>
              Ventas del Día
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold font-tan-nimbus text-[#455a54] leading-tight'>
              {summary.salesCount}
            </div>
            <p className='text-xs text-[#455a54]/70'>Total de transacciones</p>
          </CardContent>
        </Card>

        <Card className='border-[#9d684e]/20 hover:shadow-md transition-shadow duration-200'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-[#455a54] font-winter-solid'>
              Métodos de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-1'>
            <div className='flex justify-between text-xs'>
              <span className='text-[#455a54]/70'>Efectivo</span>
              <span className='text-[#455a54] font-medium'>
                $
                {summary.paymentMethodBreakdown.efectivo.toLocaleString(
                  'es-AR',
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}
              </span>
            </div>
            <div className='flex justify-between text-xs'>
              <span className='text-[#455a54]/70'>Tarjeta</span>
              <span className='text-[#455a54] font-medium'>
                $
                {summary.paymentMethodBreakdown.tarjeta.toLocaleString('es-AR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
            <div className='flex justify-between text-xs'>
              <span className='text-[#455a54]/70'>Transferencia</span>
              <span className='text-[#455a54] font-medium'>
                $
                {summary.paymentMethodBreakdown.transferencia.toLocaleString(
                  'es-AR',
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className='border-[#9d684e]/20 hover:shadow-md transition-shadow duration-200'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-[#455a54] font-winter-solid'>
              Balance Neto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold font-tan-nimbus leading-tight ${
                summary.netBalance >= 0 ? 'text-[#455a54]' : 'text-red-600'
              }`}
            >
              $
              {summary.netBalance.toLocaleString('es-AR', {
                signDisplay: 'always',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </div>
            <p className='text-xs text-[#455a54]/70'>Ingresos - Egresos</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
