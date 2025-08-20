'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { FinancialSummary } from '@/lib/types';

interface FinanceStatsWidgetProps {
  summary: FinancialSummary;
}

export function FinanceStatsWidget({ summary }: FinanceStatsWidgetProps) {
  const statCards = [
    {
      title: 'Ingresos del Día',
      value: summary.totalIngresos,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      format: 'currency'
    },
    {
      title: 'Egresos del Día',
      value: summary.totalEgresos,
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      format: 'currency'
    },
    {
      title: 'Balance Neto',
      value: summary.netBalance,
      icon: DollarSign,
      color: summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: summary.netBalance >= 0 ? 'bg-green-100' : 'bg-red-100',
      format: 'currency'
    },
    {
      title: 'Transacciones',
      value: summary.salesCount + summary.expensesCount,
      icon: Activity,
      color: 'text-[#455a54]',
      bgColor: 'bg-[#455a54]/10',
      format: 'number'
    },
  ];

  const formatValue = (value: number, format: string) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    }
    return value.toString();
  };

  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className='border-[#9d684e]/20'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-winter-solid text-[#455a54]'>
                {stat.title}
              </CardTitle>
              <div className={`${stat.bgColor} p-2 rounded-lg`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-tan-nimbus ${stat.color}`}>
                {formatValue(stat.value, stat.format)}
              </div>
              {stat.title === 'Balance Neto' && (
                <p className='text-xs text-[#455a54]/70'>
                  {summary.netBalance >= 0 ? 'Ganancia' : 'Pérdida'} del día
                </p>
              )}
              {stat.title === 'Transacciones' && (
                <p className='text-xs text-[#455a54]/70'>
                  {summary.salesCount} ventas, {summary.expensesCount} gastos
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function PaymentMethodBreakdown({ summary }: FinanceStatsWidgetProps) {
  const paymentMethods = [
    {
      method: 'Efectivo',
      amount: summary.paymentMethodBreakdown.efectivo,
      color: 'text-[#455a54]',
      bgColor: 'bg-[#455a54]/10',
    },
    {
      method: 'Tarjeta',
      amount: summary.paymentMethodBreakdown.tarjeta,
      color: 'text-[#9d684e]',
      bgColor: 'bg-[#9d684e]/10',
    },
    {
      method: 'Transferencia',
      amount: summary.paymentMethodBreakdown.transferencia,
      color: 'text-[#e0a38d]',
      bgColor: 'bg-[#e0a38d]/10',
    },
  ];

  const totalPayments = Object.values(summary.paymentMethodBreakdown).reduce((a, b) => a + b, 0);

  return (
    <Card className='border-[#9d684e]/20'>
      <CardHeader>
        <CardTitle className='text-lg font-tan-nimbus text-[#455a54]'>
          Ingresos por Método de Pago
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          {paymentMethods.map((method, index) => (
            <div key={index} className='flex items-center justify-between'>
              <div className='flex items-center space-x-3'>
                <div className={`w-3 h-3 rounded-full ${method.bgColor}`} />
                <span className='text-sm font-medium text-[#455a54]'>
                  {method.method}
                </span>
              </div>
              <div className='text-right'>
                <span className={`text-lg font-semibold ${method.color}`}>
                  ${method.amount.toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
                {totalPayments > 0 && (
                  <div className='text-xs text-[#455a54]/70'>
                    {((method.amount / totalPayments) * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {totalPayments > 0 && (
          <div className='mt-4 pt-3 border-t border-[#9d684e]/10'>
            <div className='flex justify-between items-center'>
              <span className='text-sm font-medium text-[#455a54]'>Total Ingresos</span>
              <span className='text-lg font-tan-nimbus text-[#455a54]'>
                ${totalPayments.toLocaleString('es-AR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}