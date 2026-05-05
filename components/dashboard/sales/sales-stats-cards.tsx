'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useSalesStats } from '@/hooks/useSalesStats';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Wallet,
} from 'lucide-react';

export function SalesStatsCards() {
  const { statistics, isLoading, refreshData } = useSalesStats();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
            Estadísticas de Ventas
          </h2>
          <button className="p-2 rounded-lg" style={{ color: 'var(--color-terracota)' }}>
            <RefreshCw className="h-5 w-5 animate-spin" />
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-xl border p-6 animate-pulse" style={{ borderColor: 'var(--color-gris-claro)' }}>
              <div className="h-3 rounded w-1/3 mb-4" style={{ background: 'var(--color-gris-claro)' }} />
              <div className="h-10 rounded w-1/2 mb-3" style={{ background: 'var(--color-gris-claro)' }} />
              <div className="h-3 rounded w-2/3" style={{ background: 'var(--color-gris-claro)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { dailySales, totalRevenue, completed, averagePerSale, paymentMethods, salesStatus, totalCashStatus } = statistics;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
          Estadísticas de Ventas
        </h2>
        <button
          onClick={refreshData}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--color-terracota)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--color-terracota) 10%, transparent)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* ── Sección 1: Hero Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Hero: Ingresos de hoy */}
        <Card className="overflow-hidden" style={{ borderColor: 'var(--color-gris-claro)' }}>
          <div className="h-1" style={{ background: 'var(--color-terracota)' }} />
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-1">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                Ingresos de hoy
              </span>
              <DollarSign className="h-5 w-5 opacity-40" style={{ color: 'var(--color-terracota)' }} />
            </div>
            <div className="text-4xl font-bold mt-2 mb-3" style={{ color: 'var(--color-verde-profundo)' }}>
              {formatCurrency(dailySales.amount)}
            </div>
            <p className="text-sm" style={{ color: 'var(--color-ciruela-oscuro)' }}>
              {dailySales.count} {dailySales.count === 1 ? 'venta' : 'ventas'} · promedio {formatCurrency(averagePerSale.amount)}
            </p>
          </CardContent>
        </Card>

        {/* Hero: Balance de caja */}
        <Card className="overflow-hidden" style={{ borderColor: 'var(--color-gris-claro)' }}>
          <div className="h-1" style={{ background: 'var(--color-verde-profundo)' }} />
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-1">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                Balance de caja
              </span>
              <Wallet className="h-5 w-5 opacity-40" style={{ color: 'var(--color-verde-profundo)' }} />
            </div>
            <div
              className="text-4xl font-bold mt-2 mb-3"
              style={{ color: totalCashStatus.netBalance >= 0 ? 'var(--color-verde-profundo)' : 'var(--color-terracota)' }}
            >
              {formatCurrency(totalCashStatus.netBalance)}
            </div>
            <div className="space-y-1">
              <p className="text-sm flex justify-between" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                <span>Ventas totales</span>
                <span className="font-medium">{formatCurrency(totalCashStatus.totalSales)}</span>
              </p>
              <p className="text-sm flex justify-between" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                <span>Dinero en señas</span>
                <span className="font-medium">{formatCurrency(totalCashStatus.totalPrepaids)}</span>
              </p>
              <p className="text-sm flex justify-between" style={{ color: 'var(--color-terracota)' }}>
                <span>Egresos</span>
                <span className="font-medium">{formatCurrency(totalCashStatus.totalEgresses)}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Sección 2: KPIs secundarios ── */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--color-gris-claro)', background: 'var(--color-blanco)' }}
      >
        <div className="p-4 flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-ciruela-oscuro)' }}>Completadas</span>
          <span className="text-xl font-bold" style={{ color: 'var(--color-verde-profundo)' }}>{completed.count}</span>
          <span className="text-xs" style={{ color: 'var(--color-ciruela-oscuro)' }}>{Math.round(completed.percentage)}% del total</span>
        </div>
        <div className="p-4 flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-ciruela-oscuro)' }}>Pendientes</span>
          <span className="text-xl font-bold" style={{ color: 'var(--color-verde-profundo)' }}>{salesStatus.pending.count}</span>
          <span className="text-xs" style={{ color: 'var(--color-ciruela-oscuro)' }}>{Math.round(salesStatus.pending.percentage)}%</span>
        </div>
        <div className="p-4 flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-ciruela-oscuro)' }}>Canceladas</span>
          <span className="text-xl font-bold" style={{ color: 'var(--color-verde-profundo)' }}>{salesStatus.cancelled.count}</span>
          <span className="text-xs" style={{ color: 'var(--color-ciruela-oscuro)' }}>{Math.round(salesStatus.cancelled.percentage)}%</span>
        </div>
        <div className="p-4 flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-ciruela-oscuro)' }}>Promedio por venta</span>
          <span className="text-xl font-bold" style={{ color: 'var(--color-verde-profundo)' }}>{formatCurrency(averagePerSale.amount)}</span>
          <span className="text-xs" style={{ color: 'var(--color-ciruela-oscuro)' }}>{totalRevenue.period}</span>
        </div>
      </div>

      {/* ── Sección 3: Desglose en dos columnas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Métodos de Pago */}
        <Card style={{ borderColor: 'var(--color-gris-claro)' }}>
          <CardContent className="p-5">
            <p className="text-base font-tan-nimbus mb-4" style={{ color: 'var(--color-verde-profundo)' }}>
              Métodos de Pago
            </p>
            <div className="space-y-4">
              {[
                { icon: <Banknote className="h-4 w-4" />, label: 'Efectivo', amount: paymentMethods.cash.amount, pct: paymentMethods.cash.percentage },
                { icon: <CreditCard className="h-4 w-4" />, label: 'Tarjeta', amount: paymentMethods.card.amount, pct: paymentMethods.card.percentage },
                { icon: <Smartphone className="h-4 w-4" />, label: 'Transferencia', amount: paymentMethods.transfer.amount, pct: paymentMethods.transfer.percentage },
              ].map(({ icon, label, amount, pct }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                      {icon}
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold" style={{ color: 'var(--color-verde-profundo)' }}>
                        {formatCurrency(amount)}
                      </span>
                      <span className="text-xs w-8 text-right" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: 'var(--color-gris-claro)' }}>
                    <div
                      className="h-1 rounded-full transition-all"
                      style={{ width: `${pct}%`, background: 'var(--color-terracota)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Estado de Ventas */}
        <Card style={{ borderColor: 'var(--color-gris-claro)' }}>
          <CardContent className="p-5">
            <p className="text-base font-tan-nimbus mb-4" style={{ color: 'var(--color-verde-profundo)' }}>
              Estado de Ventas
            </p>
            <div className="space-y-4">
              {[
                { icon: <CheckCircle className="h-4 w-4" />, label: 'Completadas', count: salesStatus.completed.count, pct: salesStatus.completed.percentage, barColor: 'var(--color-verde-profundo)' },
                { icon: <Clock className="h-4 w-4" />, label: 'Pendientes', count: salesStatus.pending.count, pct: salesStatus.pending.percentage, barColor: 'var(--color-naranja-medio)' },
                { icon: <XCircle className="h-4 w-4" />, label: 'Canceladas', count: salesStatus.cancelled.count, pct: salesStatus.cancelled.percentage, barColor: 'var(--color-terracota)' },
              ].map(({ icon, label, count, pct, barColor }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                      <span style={{ color: barColor }}>{icon}</span>
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold" style={{ color: 'var(--color-verde-profundo)' }}>
                        {count}
                      </span>
                      <span className="text-xs w-8 text-right" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: 'var(--color-gris-claro)' }}>
                    <div
                      className="h-1 rounded-full transition-all"
                      style={{ width: `${pct}%`, background: barColor }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
