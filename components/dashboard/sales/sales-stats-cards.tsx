'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useSalesStats } from '@/hooks/useSalesStats';
import { useCashbox } from '@/hooks/useCashbox';
import {
  DollarSign,
  Banknote,
  CreditCard,
  Smartphone,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Wallet,
  ShoppingBag,
} from 'lucide-react';
import { formatCurrency } from '@/lib/sales-calculations';

export function SalesStatsCards() {
  const { statistics, isLoading, refreshData } = useSalesStats();
  const { current: cashSession, loading: cashLoading } = useCashbox();

  const loading = isLoading || cashLoading;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
            Estadísticas de hoy
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-xl border p-6 h-32" style={{ borderColor: 'var(--color-gris-claro)', background: 'var(--color-blanco)' }}>
              <div className="h-3 rounded w-1/3 mb-4" style={{ background: 'var(--color-gris-claro)' }} />
              <div className="h-10 rounded w-1/2 mb-3" style={{ background: 'var(--color-gris-claro)' }} />
              <div className="h-3 rounded w-2/3" style={{ background: 'var(--color-gris-claro)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { dailySales, averagePerSale, paymentMethods, salesStatus, topProductsToday } = statistics;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
          Estadísticas de hoy
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

      {/* Sesión de caja actual */}
      {cashSession ? (
        <div
          className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          style={{ borderColor: 'var(--color-verde-profundo)', background: 'color-mix(in srgb, var(--color-verde-profundo) 6%, transparent)' }}
        >
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 shrink-0" style={{ color: 'var(--color-verde-profundo)' }} />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide font-winter-solid" style={{ color: 'var(--color-verde-profundo)', opacity: 0.8 }}>
                Caja abierta
              </p>
              <p className="text-sm font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                Desde {new Date(cashSession.openedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                {' · '}Apertura {formatCurrency(cashSession.openingCash)}
              </p>
            </div>
          </div>
          {cashSession.expectedClosingCash != null && (
            <div className="text-right">
              <p className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>
                Esperado en caja
              </p>
              <p className="text-lg font-bold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
                {formatCurrency(cashSession.expectedClosingCash)}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div
          className="rounded-xl border p-4 flex items-center gap-3"
          style={{ borderColor: 'var(--color-gris-claro)', background: 'color-mix(in srgb, var(--color-gris-claro) 20%, transparent)' }}
        >
          <Wallet className="h-5 w-5 shrink-0 opacity-40" style={{ color: 'var(--color-ciruela-oscuro)' }} />
          <p className="text-sm font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>
            No hay caja abierta
          </p>
        </div>
      )}

      {/* Hero cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <Card className="overflow-hidden" style={{ borderColor: 'var(--color-gris-claro)' }}>
          <div className="h-1" style={{ background: 'var(--color-terracota)' }} />
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-1">
              <span className="text-xs font-medium uppercase tracking-wide font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>
                Ingresos de hoy
              </span>
              <DollarSign className="h-5 w-5 opacity-40" style={{ color: 'var(--color-terracota)' }} />
            </div>
            <div className="text-4xl font-bold mt-2 mb-2 font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
              {formatCurrency(dailySales.amount)}
            </div>
            <p className="text-sm font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)' }}>
              {dailySales.count} {dailySales.count === 1 ? 'venta' : 'ventas'}
              {dailySales.count > 0 && <> · promedio {formatCurrency(averagePerSale.amount)}</>}
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden" style={{ borderColor: 'var(--color-gris-claro)' }}>
          <div className="h-1" style={{ background: 'var(--color-verde-profundo)' }} />
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-1">
              <span className="text-xs font-medium uppercase tracking-wide font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>
                Estado de ventas
              </span>
              <ShoppingBag className="h-5 w-5 opacity-40" style={{ color: 'var(--color-verde-profundo)' }} />
            </div>
            <div className="text-4xl font-bold mt-2 mb-2 font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
              {dailySales.count}
            </div>
            <div className="space-y-0.5">
              <p className="text-sm flex justify-between font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                <span>Completadas</span>
                <span className="font-semibold" style={{ color: 'var(--color-verde-profundo)' }}>{salesStatus.completed.count}</span>
              </p>
              <p className="text-sm flex justify-between font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                <span>Pendientes</span>
                <span className="font-semibold" style={{ color: 'var(--color-naranja-medio)' }}>{salesStatus.pending.count}</span>
              </p>
              <p className="text-sm flex justify-between font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                <span>Canceladas</span>
                <span className="font-semibold" style={{ color: 'var(--color-terracota)' }}>{salesStatus.cancelled.count}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI strip */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--color-gris-claro)', background: 'var(--color-blanco)' }}
      >
        <div className="p-4 flex flex-col gap-1">
          <span className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>Completadas</span>
          <span className="text-xl font-bold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>{salesStatus.completed.count}</span>
          <span className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>{Math.round(salesStatus.completed.percentage)}% del total</span>
        </div>
        <div className="p-4 flex flex-col gap-1">
          <span className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>Pendientes</span>
          <span className="text-xl font-bold font-tan-nimbus" style={{ color: 'var(--color-naranja-medio)' }}>{salesStatus.pending.count}</span>
          <span className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>{Math.round(salesStatus.pending.percentage)}%</span>
        </div>
        <div className="p-4 flex flex-col gap-1">
          <span className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>Canceladas</span>
          <span className="text-xl font-bold font-tan-nimbus" style={{ color: 'var(--color-terracota)' }}>{salesStatus.cancelled.count}</span>
          <span className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>{Math.round(salesStatus.cancelled.percentage)}%</span>
        </div>
        <div className="p-4 flex flex-col gap-1">
          <span className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>Ticket promedio</span>
          <span className="text-xl font-bold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>{formatCurrency(averagePerSale.amount)}</span>
          <span className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>por venta hoy</span>
        </div>
      </div>

      {/* Desglose 2 col */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Métodos de pago */}
        <Card style={{ borderColor: 'var(--color-gris-claro)' }}>
          <CardContent className="p-5">
            <p className="text-base font-tan-nimbus mb-4" style={{ color: 'var(--color-verde-profundo)' }}>
              Métodos de pago
            </p>
            <div className="space-y-4">
              {([
                { icon: <Banknote className="h-4 w-4" />,    label: 'Efectivo',        data: paymentMethods.cash },
                { icon: <CreditCard className="h-4 w-4" />,  label: 'Tarjeta',         data: paymentMethods.card },
                { icon: <Smartphone className="h-4 w-4" />,  label: 'Transferencia',   data: paymentMethods.transfer },
              ] as const).map(({ icon, label, data }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                      {icon}
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
                        {formatCurrency(data.amount)}
                      </span>
                      <span className="text-xs w-8 text-right font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>
                        {Math.round(data.percentage)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: 'var(--color-gris-claro)' }}>
                    <div className="h-1 rounded-full transition-all" style={{ width: `${data.percentage}%`, background: 'var(--color-terracota)' }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top productos de hoy */}
        <Card style={{ borderColor: 'var(--color-gris-claro)' }}>
          <CardContent className="p-5">
            <p className="text-base font-tan-nimbus mb-4" style={{ color: 'var(--color-verde-profundo)' }}>
              Top productos hoy
            </p>
            {topProductsToday.length === 0 ? (
              <p className="text-sm font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.5 }}>
                Sin ventas registradas hoy.
              </p>
            ) : (
              <div className="space-y-0 font-winter-solid">
                {topProductsToday.map((p, i) => (
                  <div
                    key={p.productId}
                    className="flex items-center justify-between py-2 border-b last:border-0 text-sm"
                    style={{ borderColor: 'var(--color-gris-claro)' }}
                  >
                    <span style={{ color: 'var(--color-ciruela-oscuro)' }}>
                      <span className="text-xs mr-2" style={{ opacity: 0.4 }}>#{i + 1}</span>
                      {p.productName}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.5 }}>{p.quantity} u.</span>
                      <span className="font-semibold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
                        {formatCurrency(p.revenue)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estado de ventas con barras */}
      <Card style={{ borderColor: 'var(--color-gris-claro)' }}>
        <CardContent className="p-5">
          <p className="text-base font-tan-nimbus mb-4" style={{ color: 'var(--color-verde-profundo)' }}>
            Distribución de ventas
          </p>
          <div className="space-y-4">
            {([
              { icon: <CheckCircle className="h-4 w-4" />, label: 'Completadas', data: salesStatus.completed, color: 'var(--color-verde-profundo)' },
              { icon: <Clock className="h-4 w-4" />,        label: 'Pendientes',  data: salesStatus.pending,   color: 'var(--color-naranja-medio)' },
              { icon: <XCircle className="h-4 w-4" />,      label: 'Canceladas',  data: salesStatus.cancelled, color: 'var(--color-terracota)' },
            ] as const).map(({ icon, label, data, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                    <span style={{ color }}>{icon}</span>
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
                      {data.count}
                    </span>
                    <span className="text-xs w-8 text-right font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>
                      {Math.round(data.percentage)}%
                    </span>
                  </div>
                </div>
                <div className="h-1 rounded-full" style={{ background: 'var(--color-gris-claro)' }}>
                  <div className="h-1 rounded-full transition-all" style={{ width: `${data.percentage}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
