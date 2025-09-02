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
import { QuickActionsWidget } from '@/components/dashboard/quick-actions-widget';
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
        {/* Actions moved to dedicated widget below */}
      </div>

      {/* Quick Actions */}
      <QuickActionsWidget
        title="Acciones de Caja"
        description="Gestión rápida de movimientos financieros"
        layout="horizontal"
        actions={[
          {
            id: 'expense',
            title: 'Registrar Egreso',
            description: 'Agregar nuevo gasto al sistema',
            icon: Minus,
            color: 'danger',
            onClick: () => setShowExpenseForm(true)
          },
          {
            id: 'export',
            title: isExporting ? 'Exportando...' : 'Exportar Excel',
            description: 'Descargar reporte del período',
            icon: Download,
            color: 'secondary',
            onClick: handleExport
          }
        ]}
      />

      {/* Combined Filters & Quick Stats */}
      <Card className='border-[#9d684e]/20'>
        <CardHeader>
          <CardTitle className='text-lg font-tan-nimbus text-[#455a54] flex items-center gap-2'>
            <DollarSign className='h-5 w-5' />
            Panel de Control
          </CardTitle>
          <CardDescription className='text-[#455a54]/70'>
            Filtros y resumen ejecutivo del período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            {/* Filters Section */}
            <div className='lg:col-span-1'>
              <div className='space-y-4'>
                <div>
                  <label className='text-sm font-winter-solid text-[#455a54] mb-2 block'>
                    Período de Consulta
                  </label>
                  <DateRangeFilter
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                  />
                </div>
                <div className='text-sm text-[#455a54]/70 bg-[#efcbb9]/20 p-3 rounded-lg'>
                  📊 {transactions.length} transacciones encontradas
                </div>
              </div>
            </div>
            
            {/* Quick Stats - Compact Version */}
            <div className='lg:col-span-2'>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                <div className='bg-gradient-to-br from-[#9d684e]/10 to-[#9d684e]/5 p-4 rounded-lg border border-[#9d684e]/20'>
                  <div className='text-lg font-bold font-tan-nimbus text-[#455a54]'>
                    {summary.salesCount}
                  </div>
                  <div className='text-xs text-[#455a54]/70 uppercase tracking-wide'>Ventas</div>
                </div>
                
                <div className='bg-gradient-to-br from-green-500/10 to-green-500/5 p-4 rounded-lg border border-green-500/20'>
                  <div className={`text-lg font-bold font-tan-nimbus ${
                    summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${summary.netBalance.toLocaleString('es-AR', {
                      signDisplay: 'always',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                  </div>
                  <div className='text-xs text-[#455a54]/70 uppercase tracking-wide'>Balance</div>
                </div>
                
                <div className='bg-gradient-to-br from-[#e0a38d]/10 to-[#e0a38d]/5 p-4 rounded-lg border border-[#e0a38d]/20'>
                  <div className='text-lg font-bold font-tan-nimbus text-[#9d684e]'>
                    ${summary.paymentMethodBreakdown.efectivo.toLocaleString('es-AR', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                  </div>
                  <div className='text-xs text-[#455a54]/70 uppercase tracking-wide'>Efectivo</div>
                </div>
                
                <div className='bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4 rounded-lg border border-blue-500/20'>
                  <div className='text-lg font-bold font-tan-nimbus text-blue-600'>
                    ${(
                      summary.paymentMethodBreakdown.tarjeta + 
                      summary.paymentMethodBreakdown.transferencia
                    ).toLocaleString('es-AR', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                  </div>
                  <div className='text-xs text-[#455a54]/70 uppercase tracking-wide'>Digital</div>
                </div>
              </div>
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

    </div>
  );
}
