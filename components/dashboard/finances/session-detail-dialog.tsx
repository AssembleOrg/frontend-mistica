'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Banknote, CreditCard, Send, TrendingDown, TrendingUp, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { financeService, type FinanceSummary } from '@/services/finance.service';
import { formatCurrency } from '@/lib/sales-calculations';

interface CashSession {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  expectedClosingCash: number | null;
  countedClosingCash: number | null;
  discrepancy: number | null;
  status: 'OPEN' | 'CLOSED';
}

interface Props {
  session: CashSession | null;
  onOpenChange: (open: boolean) => void;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function SessionDetailDialog({ session, onOpenChange }: Props) {
  const open = session !== null;
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) { setSummary(null); return; }
    setLoading(true);
    const from = isoDate(new Date(session.openedAt));
    const to   = session.closedAt ? isoDate(new Date(session.closedAt)) : isoDate(new Date());
    financeService.summary({ from, to })
      .then(res => setSummary(res.data))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [session]);

  if (!session) return null;

  const fromLabel = new Date(session.openedAt).toLocaleString('es-AR');
  const toLabel   = session.closedAt
    ? new Date(session.closedAt).toLocaleString('es-AR')
    : 'Abierta';

  const payTotal = summary
    ? summary.byPaymentMethod.CASH + summary.byPaymentMethod.CARD + summary.byPaymentMethod.TRANSFER
    : 0;
  const pct = (n: number) => (payTotal > 0 ? Math.round((n / payTotal) * 100) : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" style={{ borderColor: 'var(--color-gris-claro)' }}>
        <DialogHeader>
          <DialogTitle className="font-tan-nimbus text-lg" style={{ color: 'var(--color-verde-profundo)' }}>
            Detalle de sesión
          </DialogTitle>
          <p className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>
            {fromLabel} → {toLabel}
          </p>
        </DialogHeader>

        {/* Resumen de caja */}
        <div
          className="rounded-lg border p-4 space-y-1 text-sm font-winter-solid"
          style={{ borderColor: 'var(--color-gris-claro)', background: 'color-mix(in srgb, var(--color-verde-profundo) 5%, transparent)' }}
        >
          <div className="flex justify-between">
            <span style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>Apertura</span>
            <span className="font-semibold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
              {formatCurrency(session.openingCash)}
            </span>
          </div>
          {session.expectedClosingCash !== null && (
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>Esperado al cierre</span>
              <span className="font-semibold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
                {formatCurrency(session.expectedClosingCash)}
              </span>
            </div>
          )}
          {session.countedClosingCash !== null && (
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>Contado al cierre</span>
              <span className="font-semibold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
                {formatCurrency(session.countedClosingCash)}
              </span>
            </div>
          )}
          {session.discrepancy !== null && session.discrepancy !== 0 && (
            <div className="flex justify-between pt-1 border-t" style={{ borderColor: 'var(--color-gris-claro)' }}>
              <span style={{ color: session.discrepancy > 0 ? 'var(--color-naranja-medio)' : 'var(--color-terracota)' }}>
                <AlertTriangle className="inline h-3 w-3 mr-1" />
                {session.discrepancy > 0 ? 'Sobrante' : 'Faltante'}
              </span>
              <span className="font-semibold font-tan-nimbus" style={{ color: session.discrepancy > 0 ? 'var(--color-naranja-medio)' : 'var(--color-terracota)' }}>
                {formatCurrency(Math.abs(session.discrepancy))}
              </span>
            </div>
          )}
        </div>

        {loading && (
          <div className="space-y-2 animate-pulse">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-8 rounded-lg" style={{ background: 'var(--color-gris-claro)' }} />
            ))}
          </div>
        )}

        {!loading && summary && (
          <div className="space-y-4">

            {/* KPIs del período */}
            <div
              className="grid grid-cols-3 divide-x rounded-lg border overflow-hidden text-center"
              style={{ borderColor: 'var(--color-gris-claro)', background: 'var(--color-blanco)' }}
            >
              <div className="p-3">
                <p className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>Ventas</p>
                <p className="text-lg font-bold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>{summary.salesCount}</p>
                <p className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.5 }}>{formatCurrency(summary.totalRevenue)}</p>
              </div>
              <div className="p-3">
                <p className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>Egresos</p>
                <p className="text-lg font-bold font-tan-nimbus" style={{ color: 'var(--color-terracota)' }}>{summary.expenses.count}</p>
                <p className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.5 }}>{formatCurrency(summary.expenses.total)}</p>
              </div>
              <div className="p-3">
                <p className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>Balance</p>
                <p
                  className="text-lg font-bold font-tan-nimbus"
                  style={{ color: summary.netBalance >= 0 ? 'var(--color-verde-profundo)' : 'var(--color-terracota)' }}
                >
                  {formatCurrency(summary.netBalance)}
                </p>
                <p className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.5 }}>neto</p>
              </div>
            </div>

            {/* Métodos de pago */}
            <div>
              <p className="text-xs font-medium font-winter-solid uppercase tracking-wide mb-2" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>
                Cobrado por método
              </p>
              <div className="space-y-2">
                {([
                  { icon: <Banknote className="h-3.5 w-3.5" />, label: 'Efectivo',      amount: summary.byPaymentMethod.CASH },
                  { icon: <CreditCard className="h-3.5 w-3.5" />, label: 'Tarjeta',     amount: summary.byPaymentMethod.CARD },
                  { icon: <Send className="h-3.5 w-3.5" />,        label: 'Transferencia', amount: summary.byPaymentMethod.TRANSFER },
                ] as const).map(({ icon, label, amount }) => (
                  <div key={label} className="flex items-center justify-between text-sm font-winter-solid">
                    <div className="flex items-center gap-2" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                      {icon}
                      <span>{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
                        {formatCurrency(amount)}
                      </span>
                      <span className="text-xs w-7 text-right" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.5 }}>
                        {pct(amount)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top productos de la sesión */}
            {summary.topProducts.length > 0 && (
              <div>
                <p className="text-xs font-medium font-winter-solid uppercase tracking-wide mb-2" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>
                  Top productos
                </p>
                <div className="space-y-0">
                  {summary.topProducts.slice(0, 5).map((p, i) => (
                    <div
                      key={p.productId}
                      className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm font-winter-solid"
                      style={{ borderColor: 'var(--color-gris-claro)' }}
                    >
                      <span style={{ color: 'var(--color-ciruela-oscuro)' }}>
                        <span className="text-xs mr-2" style={{ opacity: 0.4 }}>#{i + 1}</span>
                        {p.productName}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.4 }}>{p.quantity} u.</span>
                        <span className="font-semibold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
                          {formatCurrency(p.revenue)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
