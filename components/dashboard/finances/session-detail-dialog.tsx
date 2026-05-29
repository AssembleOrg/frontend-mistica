'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Banknote, CreditCard, Pencil, Send, TrendingDown, TrendingUp, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { financeService, type FinanceSummary } from '@/services/finance.service';
import {
  cashboxService,
  type CashSessionEditEntry,
  type SessionTransaction,
} from '@/services/cashbox.service';
import { formatCurrency } from '@/lib/sales-calculations';
import { EditSessionDialog } from './edit-session-dialog';

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
  /**
   * Callback que se dispara cuando la sesión cambia en el backend (ej. tras
   * editarla con egresos/ingresos retroactivos). El padre lo usa para
   * recargar su lista Estado de caja con los nuevos `wasEdited` y discrepancias.
   */
  onChanged?: () => void;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

type SourceFilter = 'all' | 'sale' | 'prepaid' | 'egress' | 'income';
type MethodFilter = 'all' | 'CASH' | 'CARD' | 'TRANSFER' | 'MIXTO';

export function SessionDetailDialog({ session, onOpenChange, onChanged }: Props) {
  const open = session !== null;
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<SessionTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');
  // editHistory + label + valores frescos vienen de un fetch a /cashbox/:id.
  // El headline (apertura/esperado/contado/faltante) los lee de ACÁ y no del
  // prop, así reflejan la última edición sin necesidad de reabrir el diálogo.
  const [editHistory, setEditHistory] = useState<CashSessionEditEntry[]>([]);
  const [sessionLabel, setSessionLabel] = useState<string | undefined>(undefined);
  const [fresh, setFresh] = useState<{
    openingCash: number;
    expectedClosingCash: number | null;
    countedClosingCash: number | null;
    discrepancy: number | null;
  } | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  const loadAll = useCallback(() => {
    if (!session) return;
    setLoading(true);
    setLoadingTx(true);
    const from = isoDate(new Date(session.openedAt));
    const to   = session.closedAt ? isoDate(new Date(session.closedAt)) : isoDate(new Date());
    financeService.summary({ from, to })
      .then(res => setSummary(res.data))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
    cashboxService.getSessionTransactions(session.id)
      .then(res => setTransactions(res.data?.transactions ?? []))
      .catch(() => setTransactions([]))
      .finally(() => setLoadingTx(false));
    cashboxService.findOne(session.id)
      .then(res => {
        setEditHistory(res.data?.editHistory ?? []);
        setSessionLabel(res.data?.label);
        if (res.data) {
          setFresh({
            openingCash: res.data.openingCash,
            expectedClosingCash: res.data.expectedClosingCash ?? null,
            countedClosingCash: res.data.countedClosingCash ?? null,
            discrepancy: res.data.discrepancy ?? null,
          });
        } else {
          setFresh(null);
        }
      })
      .catch(() => {
        setEditHistory([]);
        setSessionLabel(undefined);
        setFresh(null);
      });
  }, [session]);

  useEffect(() => {
    if (!session) {
      setSummary(null);
      setTransactions([]);
      setEditHistory([]);
      setSessionLabel(undefined);
      setFresh(null);
      setSourceFilter('all');
      setMethodFilter('all');
      return;
    }
    loadAll();
  }, [session, loadAll]);

  // Sesión editable: CLOSED + closedAt hace menos de 72 hs.
  // El backend revalida; este check es para mostrar/ocultar el botón.
  const canEdit = useMemo(() => {
    if (!session || session.status !== 'CLOSED' || !session.closedAt) return false;
    const hours = (Date.now() - new Date(session.closedAt).getTime()) / 3_600_000;
    return hours < 72;
  }, [session]);

  const filteredTx = useMemo(() => {
    return transactions.filter(t => {
      if (sourceFilter !== 'all' && t.source !== sourceFilter) return false;
      if (methodFilter !== 'all' && t.paymentMethod !== methodFilter) return false;
      return true;
    });
  }, [transactions, sourceFilter, methodFilter]);

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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" style={{ borderColor: 'var(--color-gris-claro)' }}>
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
          className="rounded-lg border p-4 space-y-1 text-sm font-sans"
          style={{ borderColor: 'var(--color-gris-claro)', background: 'color-mix(in srgb, var(--color-verde-profundo) 5%, transparent)' }}
        >
          {(() => {
            // Preferimos los valores del fetch /cashbox/:id (siempre frescos).
            // Si todavía no llegaron, caemos al prop original.
            const opening = fresh?.openingCash ?? session.openingCash;
            const expected = fresh?.expectedClosingCash ?? session.expectedClosingCash;
            const counted = fresh?.countedClosingCash ?? session.countedClosingCash;
            const discrepancy = fresh?.discrepancy ?? session.discrepancy;
            return (
              <>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>Apertura</span>
                  <span className="font-semibold font-sans" style={{ color: 'var(--color-verde-profundo)' }}>
                    {formatCurrency(opening)}
                  </span>
                </div>
                {expected !== null && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>Esperado al cierre</span>
                    <span className="font-semibold font-sans" style={{ color: 'var(--color-verde-profundo)' }}>
                      {formatCurrency(expected)}
                    </span>
                  </div>
                )}
                {counted !== null && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>Contado al cierre</span>
                    <span className="font-semibold font-sans" style={{ color: 'var(--color-verde-profundo)' }}>
                      {formatCurrency(counted)}
                    </span>
                  </div>
                )}
                {discrepancy !== null && discrepancy !== 0 && (
                  <div className="flex justify-between pt-1 border-t" style={{ borderColor: 'var(--color-gris-claro)' }}>
                    <span style={{ color: discrepancy > 0 ? 'var(--color-naranja-medio)' : 'var(--color-terracota)' }}>
                      <AlertTriangle className="inline h-3 w-3 mr-1" />
                      {discrepancy > 0 ? 'Sobrante' : 'Faltante'}
                    </span>
                    <span className="font-semibold font-sans" style={{ color: discrepancy > 0 ? 'var(--color-naranja-medio)' : 'var(--color-terracota)' }}>
                      {formatCurrency(Math.abs(discrepancy))}
                    </span>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEdit(true)}
              className="h-8 text-xs"
              style={{ borderColor: 'var(--color-gris-claro)', color: 'var(--color-ciruela-oscuro)' }}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Editar sesión (cargar ingresos y egresos)
            </Button>
          </div>
        )}

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
                <p className="text-xs font-sans" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>Ventas</p>
                <p className="text-lg font-bold font-sans" style={{ color: 'var(--color-verde-profundo)' }}>{summary.salesCount}</p>
                <p className="text-xs font-sans" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.5 }}>{formatCurrency(summary.totalRevenue)}</p>
              </div>
              <div className="p-3">
                <p className="text-xs font-sans" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>Egresos</p>
                <p className="text-lg font-bold font-sans" style={{ color: 'var(--color-terracota)' }}>{summary.expenses.count}</p>
                <p className="text-xs font-sans" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.5 }}>{formatCurrency(summary.expenses.total)}</p>
              </div>
              <div className="p-3">
                <p className="text-xs font-sans" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>Balance</p>
                <p
                  className="text-lg font-bold font-sans"
                  style={{ color: summary.netBalance >= 0 ? 'var(--color-verde-profundo)' : 'var(--color-terracota)' }}
                >
                  {formatCurrency(summary.netBalance)}
                </p>
                <p className="text-xs font-sans" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.5 }}>neto</p>
              </div>
            </div>

            {/* Métodos de pago */}
            <div>
              <p className="text-xs font-medium font-sans uppercase tracking-wide mb-2" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>
                Cobrado por método
              </p>
              <div className="space-y-2">
                {([
                  { icon: <Banknote className="h-3.5 w-3.5" />, label: 'Efectivo',      amount: summary.byPaymentMethod.CASH },
                  { icon: <CreditCard className="h-3.5 w-3.5" />, label: 'Tarjeta',     amount: summary.byPaymentMethod.CARD },
                  { icon: <Send className="h-3.5 w-3.5" />,        label: 'Transferencia', amount: summary.byPaymentMethod.TRANSFER },
                ] as const).map(({ icon, label, amount }) => (
                  <div key={label} className="flex items-center justify-between text-sm font-sans">
                    <div className="flex items-center gap-2" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                      {icon}
                      <span>{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold font-sans" style={{ color: 'var(--color-verde-profundo)' }}>
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

            {/* Movimientos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p
                  className="text-xs font-medium font-winter-solid uppercase tracking-wide"
                  style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}
                >
                  Movimientos
                </p>
                <span
                  className="text-xs font-winter-solid"
                  style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.5 }}
                >
                  {filteredTx.length} {filteredTx.length === 1 ? 'movimiento' : 'movimientos'}
                </span>
              </div>

              {/* Chips: filtro por tipo */}
              <div className="flex flex-wrap gap-1">
                {([
                  { v: 'all',     l: 'Todos'   },
                  { v: 'sale',    l: 'Ventas'  },
                  { v: 'prepaid', l: 'Señas'   },
                  { v: 'egress',  l: 'Egresos' },
                  { v: 'income',  l: 'Ingresos' },
                ] as const).map(o => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setSourceFilter(o.v)}
                    className="px-2.5 py-1 rounded-full text-xs font-winter-solid transition"
                    style={{
                      backgroundColor: sourceFilter === o.v ? 'var(--color-verde-profundo)' : 'transparent',
                      color: sourceFilter === o.v ? 'white' : 'var(--color-ciruela-oscuro)',
                      border: '1px solid',
                      borderColor: sourceFilter === o.v ? 'var(--color-verde-profundo)' : 'var(--color-gris-claro)',
                    }}
                  >
                    {o.l}
                  </button>
                ))}
              </div>

              {/* Chips: filtro por método */}
              <div className="flex flex-wrap gap-1">
                {([
                  { v: 'all',      l: 'Todos los métodos' },
                  { v: 'CASH',     l: 'Efectivo' },
                  { v: 'CARD',     l: 'Tarjeta' },
                  { v: 'TRANSFER', l: 'Transferencia' },
                  { v: 'MIXTO',    l: 'Mixto' },
                ] as const).map(o => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setMethodFilter(o.v)}
                    className="px-2.5 py-1 rounded-full text-xs font-winter-solid transition"
                    style={{
                      backgroundColor: methodFilter === o.v ? 'var(--color-terracota)' : 'transparent',
                      color: methodFilter === o.v ? 'white' : 'var(--color-ciruela-oscuro)',
                      border: '1px solid',
                      borderColor: methodFilter === o.v ? 'var(--color-terracota)' : 'var(--color-gris-claro)',
                    }}
                  >
                    {o.l}
                  </button>
                ))}
              </div>

              {/* Timeline de movimientos */}
              {loadingTx ? (
                <div className="space-y-2 animate-pulse">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="h-10 rounded-md"
                      style={{ background: 'var(--color-gris-claro)' }}
                    />
                  ))}
                </div>
              ) : filteredTx.length === 0 ? (
                <p
                  className="text-xs font-winter-solid italic py-4 text-center"
                  style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.55 }}
                >
                  {transactions.length === 0
                    ? 'Aún no hay movimientos en esta sesión.'
                    : 'Ningún movimiento coincide con los filtros.'}
                </p>
              ) : (
                <div
                  className="rounded-md border divide-y"
                  style={{ borderColor: 'var(--color-gris-claro)' }}
                >
                  {filteredTx.map(t => {
                    const isPrepaid = t.source === 'prepaid';
                    const isIncome = t.type === 'ingreso';
                    const hora = new Date(t.createdAt).toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-winter-solid"
                        style={{
                          borderColor: 'var(--color-gris-claro)',
                          backgroundColor: isPrepaid ? 'rgba(254, 243, 199, 0.35)' : undefined,
                        }}
                      >
                        <span
                          className="text-xs shrink-0 w-10"
                          style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}
                        >
                          {hora}
                        </span>
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
                          style={{
                            color: isIncome ? '#2f6f3b' : '#9d2f2f',
                            backgroundColor: isIncome ? 'rgba(47,111,59,0.12)' : 'rgba(157,47,47,0.12)',
                          }}
                        >
                          {isIncome ? 'Ingreso' : 'Egreso'}
                        </span>
                        {isPrepaid && (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
                            style={{ color: '#92400e', backgroundColor: '#fef3c7' }}
                          >
                            Seña
                          </span>
                        )}
                        <span
                          className="flex-1 truncate text-xs"
                          style={{ color: 'var(--color-ciruela-oscuro)' }}
                          title={t.description}
                        >
                          {t.description}
                        </span>
                        <span
                          className="text-xs font-semibold shrink-0"
                          style={{ color: isIncome ? 'var(--color-verde-profundo)' : 'var(--color-terracota)' }}
                        >
                          {isIncome ? '+' : '-'}
                          {formatCurrency(t.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Historial de ediciones (egresos retroactivos) */}
            {editHistory.length > 0 && (
              <div className="space-y-2">
                <p
                  className="text-xs font-medium font-winter-solid uppercase tracking-wide"
                  style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}
                >
                  Historial de cambios
                </p>
                <div className="space-y-2">
                  {[...editHistory]
                    .sort((a, b) => new Date(b.editedAt).getTime() - new Date(a.editedAt).getTime())
                    .map((entry, idx) => {
                      const egressCount = entry.addedEgresses.length;
                      const incomeCount = (entry.addedIncomes ?? []).length;
                      const summaryParts: string[] = [];
                      if (egressCount > 0) {
                        summaryParts.push(
                          `${egressCount} ${egressCount === 1 ? 'egreso' : 'egresos'}`,
                        );
                      }
                      if (incomeCount > 0) {
                        summaryParts.push(
                          `${incomeCount} ${incomeCount === 1 ? 'ingreso' : 'ingresos'}`,
                        );
                      }
                      return (
                        <div
                          key={idx}
                          className="rounded-lg border p-2.5 text-xs font-winter-solid"
                          style={{ borderColor: 'var(--color-gris-claro)', background: 'var(--color-blanco)' }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>
                              {new Date(entry.editedAt).toLocaleString('es-AR')}
                            </span>
                            <span style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.5 }}>
                              {summaryParts.join(' + ')}
                            </span>
                          </div>
                          <ul className="space-y-0.5 pl-1">
                            {entry.addedEgresses.map((a) => (
                              <li
                                key={a.egressId}
                                className="flex items-center justify-between gap-2"
                                style={{ color: 'var(--color-ciruela-oscuro)' }}
                              >
                                <span className="truncate" title={a.concept}>
                                  · {a.concept}
                                </span>
                                <span className="font-semibold shrink-0" style={{ color: 'var(--color-terracota)' }}>
                                  -{formatCurrency(a.amount)}
                                </span>
                              </li>
                            ))}
                            {(entry.addedIncomes ?? []).map((a) => (
                              <li
                                key={a.incomeId}
                                className="flex items-center justify-between gap-2"
                                style={{ color: 'var(--color-ciruela-oscuro)' }}
                              >
                                <span className="truncate" title={a.concept}>
                                  · {a.concept}
                                </span>
                                <span className="font-semibold shrink-0" style={{ color: 'var(--color-verde-profundo)' }}>
                                  +{formatCurrency(a.amount)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        <EditSessionDialog
          sessionId={showEdit ? session.id : null}
          sessionLabel={sessionLabel}
          closedAt={session.closedAt ?? undefined}
          onOpenChange={(o) => !o && setShowEdit(false)}
          onSaved={() => {
            // Refresca el detalle (headline + transactions + historial)
            // y avisa al padre para que actualice la lista Estado de caja.
            loadAll();
            onChanged?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
