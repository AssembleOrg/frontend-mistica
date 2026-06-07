'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DateRange } from 'react-day-picker';
import {
  Banknote,
  CreditCard,
  Send,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Pencil,
  LayoutList,
  LayoutGrid,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { financeService, type FinanceSummary } from '@/services/finance.service';
import { cashboxService } from '@/services/cashbox.service';
import { formatCurrency } from '@/lib/sales-calculations';
import { showToast } from '@/lib/toast';
import { SessionDetailDialog } from '@/components/dashboard/finances/session-detail-dialog';
import { ResolveAutoClosureDialog } from '@/components/dashboard/finances/resolve-auto-closure-dialog';

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Nombre por default de una sesión: día en español + fecha, ej. "Miércoles 20/05/26". */
function defaultSessionLabel(openedAt: string) {
  const d = new Date(openedAt);
  const tz = 'America/Argentina/Buenos_Aires';
  const weekday = d.toLocaleDateString('es-AR', { weekday: 'long', timeZone: tz });
  const date = d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    timeZone: tz,
  });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date}`;
}

export default function FinancesPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(),
    to: new Date(),
  });

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<FinanceSummary['cashSessions'][number] | null>(null);
  const [sessionToResolve, setSessionToResolve] = useState<FinanceSummary['cashSessions'][number] | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [cashboxView, setCashboxView] = useState<'list' | 'grid'>('list');
  const cancelEditRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeService.summary({
        from: dateRange?.from ? isoDate(dateRange.from) : undefined,
        to: dateRange?.to ? isoDate(dateRange.to) : undefined,
      });
      setSummary(res.data);
    } catch (err) {
      console.error(err);
      showToast.error('No se pudo cargar el resumen');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    load();
  }, [load]);

  const startEditingLabel = useCallback(
    (s: FinanceSummary['cashSessions'][number]) => {
      cancelEditRef.current = false;
      setLabelDraft(s.label ?? '');
      setEditingLabelId(s.id);
    },
    [],
  );

  const saveLabel = useCallback(
    async (id: string) => {
      if (cancelEditRef.current) {
        cancelEditRef.current = false;
        setEditingLabelId(null);
        return;
      }
      const value = labelDraft.trim();
      setEditingLabelId(null);
      // Optimista: actualizo el label en memoria sin recargar todo el resumen.
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              cashSessions: prev.cashSessions.map((s) =>
                s.id === id ? { ...s, label: value || null } : s,
              ),
            }
          : prev,
      );
      try {
        await cashboxService.updateSessionLabel(id, value);
      } catch (err) {
        console.error(err);
        showToast.error('No se pudo renombrar la caja');
        load();
      }
    },
    [labelDraft, load],
  );

  const expectedCash = useMemo(() => {
    if (!summary) return 0;
    const sessions = summary.cashSessions;
    const opening = sessions.reduce((s, x) => s + x.openingCash, 0);
    return (
      opening +
      summary.byPaymentMethod.CASH +
      summary.prepaids.byPaymentMethod.CASH +
      summary.incomes.byPaymentMethod.CASH -
      summary.expenses.byPaymentMethod.CASH
    );
  }, [summary]);

  // Porcentajes de métodos de pago
  const paymentTotal = summary
    ? summary.byPaymentMethod.CASH + summary.byPaymentMethod.CARD + summary.byPaymentMethod.TRANSFER
    : 0;
  const pct = (n: number) => (paymentTotal > 0 ? (n / paymentTotal) * 100 : 0);

  // Porcentajes de estado de ventas
  const salesTotal = summary
    ? summary.byStatus.COMPLETED + summary.byStatus.PENDING + summary.byStatus.CANCELLED
    : 0;
  const spct = (n: number) => (salesTotal > 0 ? (n / salesTotal) * 100 : 0);

  const pendingAutoSession = useMemo(() => {
    return summary?.cashSessions.find(s => s.closureType === 'AUTO');
  }, [summary]);

  return (
    <div className="space-y-5 mt-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
            Caja y Finanzas
          </h1>
          <p className="text-sm font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>
            Resumen contable, caja y movimientos del período
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <RefreshCw className="h-4 w-4 animate-spin" style={{ color: 'var(--color-terracota)' }} />}
        </div>
      </div>
      <SessionDetailDialog
        session={selectedSession}
        onOpenChange={(open) => { if (!open) setSelectedSession(null); }}
        onChanged={load}
      />
      <ResolveAutoClosureDialog
        session={sessionToResolve}
        onOpenChange={(open) => { if (!open) setSessionToResolve(null); }}
        onResolved={load}
      />

      {/* Filtro de período */}
      <div
        className="rounded-xl border p-3"
        style={{ borderColor: 'var(--color-gris-claro)', background: 'var(--color-blanco)' }}
      >
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>

      {/* Skeletons mientras carga por primera vez */}
      {loading && !summary && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-xl border p-6 h-32" style={{ borderColor: 'var(--color-gris-claro)', background: 'var(--color-blanco)' }}>
                <div className="h-3 rounded w-1/3 mb-4" style={{ background: 'var(--color-gris-claro)' }} />
                <div className="h-8 rounded w-1/2 mb-3" style={{ background: 'var(--color-gris-claro)' }} />
                <div className="h-3 rounded w-2/3" style={{ background: 'var(--color-gris-claro)' }} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-gris-claro)' }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="p-4 h-20" style={{ background: 'var(--color-blanco)' }}>
                <div className="h-3 rounded w-1/2 mb-3" style={{ background: 'var(--color-gris-claro)' }} />
                <div className="h-6 rounded w-1/3" style={{ background: 'var(--color-gris-claro)' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {summary && (
        <>
          {pendingAutoSession && (
            <div className="rounded-xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                 style={{ backgroundColor: 'color-mix(in srgb, var(--color-naranja-medio) 15%, transparent)', borderColor: 'var(--color-naranja-medio)' }}>
              <div className="flex items-start sm:items-center gap-3">
                <AlertTriangle className="h-6 w-6 mt-0.5 sm:mt-0" style={{ color: 'var(--color-terracota)' }} />
                <div>
                  <p className="text-base font-semibold font-tan-nimbus" style={{ color: 'var(--color-terracota)' }}>
                    Caja pendiente de arqueo
                  </p>
                  <p className="text-sm font-winter-solid mt-0.5" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                    El sistema cerró automáticamente la caja de ayer a la medianoche. Por favor, ingresa el dinero que contaste.
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setSessionToResolve(pendingAutoSession)}
                className="w-full sm:w-auto font-sans font-bold shadow-md"
                style={{ background: 'var(--color-terracota)', color: 'white' }}
              >
                Completar Arqueo
              </Button>
            </div>
          )}

          {/* Bloque D — Estado de caja (arriba del fold, auditoría inmediata) */}
          <Card style={{ borderColor: 'var(--color-gris-claro)' }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
                    Estado de caja
                  </CardTitle>
                  <p className="text-xs font-winter-solid mt-0.5" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>
                    Sesiones del rango y diferencias de cierre
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5 rounded-lg p-1" style={{ background: 'var(--color-negro)' }}>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 hover:bg-white/10"
                      aria-pressed={cashboxView === 'list'}
                      title="Ver en lista"
                      onClick={() => setCashboxView('list')}
                    >
                      <LayoutList
                        className="h-4 w-4 transition-opacity"
                        style={{ color: 'var(--color-durazno)', opacity: cashboxView === 'list' ? 1 : 0.4 }}
                      />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 hover:bg-white/10"
                      aria-pressed={cashboxView === 'grid'}
                      title="Ver en grilla"
                      onClick={() => setCashboxView('grid')}
                    >
                      <LayoutGrid
                        className="h-4 w-4 transition-opacity"
                        style={{ color: 'var(--color-durazno)', opacity: cashboxView === 'grid' ? 1 : 0.4 }}
                      />
                    </Button>
                  </div>
                  <Badge
                    style={
                      summary.totalDiscrepancy === 0
                        ? { background: 'color-mix(in srgb, var(--color-verde-profundo) 12%, transparent)', color: 'var(--color-verde-profundo)' }
                        : summary.totalDiscrepancy > 0
                          ? { background: 'color-mix(in srgb, var(--color-naranja-medio) 15%, transparent)', color: 'var(--color-naranja-medio)' }
                          : { background: 'color-mix(in srgb, var(--color-terracota) 15%, transparent)', color: 'var(--color-terracota)' }
                    }
                  >
                    Diferencia neta: {formatCurrency(summary.totalDiscrepancy)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {summary.cashSessions.length === 0 ? (
                <p className="text-sm font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>
                  No hubo aperturas de caja en este rango.
                </p>
              ) : (
                <div className={cashboxView === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'
                  : 'space-y-2'}
                >
                  {summary.cashSessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border p-3 text-sm cursor-pointer transition-colors"
                      style={{ borderColor: 'var(--color-gris-claro)', background: 'var(--color-blanco)' }}
                      onClick={() => setSelectedSession(s)}
                      onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--color-verde-profundo) 5%, transparent)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-blanco)')}
                    >
                      <div className="min-w-0 flex-1">
                        {editingLabelId === s.id ? (
                          <Input
                            autoFocus
                            value={labelDraft}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setLabelDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.currentTarget.blur();
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelEditRef.current = true;
                                e.currentTarget.blur();
                              }
                            }}
                            onBlur={() => saveLabel(s.id)}
                            placeholder={defaultSessionLabel(s.openedAt)}
                            className="h-7 text-sm max-w-xs"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                              {s.label || defaultSessionLabel(s.openedAt)}
                            </span>
                            <button
                              type="button"
                              title="Renombrar caja"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingLabel(s);
                              }}
                              className="opacity-30 hover:opacity-100 transition-opacity"
                            >
                              <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--color-ciruela-oscuro)' }} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {s.wasEdited && (
                          <Badge
                            title="Esta sesión fue editada después del cierre"
                            style={{
                              background: 'color-mix(in srgb, var(--color-ciruela-oscuro) 12%, transparent)',
                              color: 'var(--color-ciruela-oscuro)',
                            }}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Editada
                          </Badge>
                        )}
                        {s.discrepancy !== null && s.discrepancy !== 0 && (
                          <Badge
                            style={
                              s.discrepancy > 0
                                ? { background: 'color-mix(in srgb, var(--color-naranja-medio) 15%, transparent)', color: 'var(--color-naranja-medio)' }
                                : { background: 'color-mix(in srgb, var(--color-terracota) 15%, transparent)', color: 'var(--color-terracota)' }
                            }
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {s.discrepancy > 0 ? 'Sobrante' : 'Faltante'} {formatCurrency(Math.abs(s.discrepancy))}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bloque A — Hero cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Balance neto */}
            <Card className="overflow-hidden" style={{ borderColor: 'var(--color-gris-claro)' }}>
              <div className="h-1" style={{ background: summary.netBalance >= 0 ? 'var(--color-verde-profundo)' : 'var(--color-terracota)' }} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs font-medium uppercase tracking-wide font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>
                    Balance neto
                  </span>
                  {summary.netBalance >= 0
                    ? <TrendingUp className="h-5 w-5 opacity-40" style={{ color: 'var(--color-verde-profundo)' }} />
                    : <TrendingDown className="h-5 w-5 opacity-40" style={{ color: 'var(--color-terracota)' }} />
                  }
                </div>
                <div
                  className="text-4xl font-bold mt-2 mb-3 font-tan-nimbus"
                  style={{ color: summary.netBalance >= 0 ? 'var(--color-verde-profundo)' : 'var(--color-terracota)' }}
                >
                  {formatCurrency(summary.netBalance)}
                </div>
                <div className="space-y-1">
                  <p className="text-sm flex justify-between font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                    <span>Ingresos</span>
                    <span className="font-semibold">{formatCurrency(summary.totalRevenue)}</span>
                  </p>
                  <p className="text-sm flex justify-between font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                    <span>Señas</span>
                    <span className="font-semibold">{formatCurrency(summary.prepaids.total)}</span>
                  </p>
                  <p className="text-sm flex justify-between font-winter-solid" style={{ color: 'var(--color-terracota)' }}>
                    <span>Egresos</span>
                    <span className="font-semibold">− {formatCurrency(summary.expenses.total)}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Ingresos del período */}
            <Card className="overflow-hidden" style={{ borderColor: 'var(--color-gris-claro)' }}>
              <div className="h-1" style={{ background: 'var(--color-terracota)' }} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs font-medium uppercase tracking-wide font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>
                    Ingresos del período
                  </span>
                  <TrendingUp className="h-5 w-5 opacity-40" style={{ color: 'var(--color-terracota)' }} />
                </div>
                <div className="text-4xl font-bold mt-2 mb-3 font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
                  {formatCurrency(summary.totalRevenue)}
                </div>
                <p className="text-sm font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                  {summary.salesCount} {summary.salesCount === 1 ? 'venta' : 'ventas'} · ticket promedio {formatCurrency(summary.averageTicket)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Bloque B — KPI strip */}
          <div
            className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 rounded-xl border overflow-hidden"
            style={{ borderColor: 'var(--color-gris-claro)', background: 'var(--color-blanco)' }}
          >
            <div className="p-4 flex flex-col gap-1">
              <span className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>Ventas</span>
              <span className="text-xl font-bold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>{summary.salesCount}</span>
              <span className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>transacciones</span>
            </div>
            <div className="p-4 flex flex-col gap-1">
              <span className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>Egresos</span>
              <span className="text-xl font-bold font-tan-nimbus" style={{ color: 'var(--color-terracota)' }}>{summary.expenses.count}</span>
              <span className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>{formatCurrency(summary.expenses.total)}</span>
            </div>
            <div className="p-4 flex flex-col gap-1">
              <span className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>Señas</span>
              <span className="text-xl font-bold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>{summary.prepaids.count}</span>
              <span className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>{formatCurrency(summary.prepaids.total)}</span>
            </div>
            <div className="p-4 flex flex-col gap-1">
              <span className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>Ticket promedio</span>
              <span className="text-xl font-bold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>{formatCurrency(summary.averageTicket)}</span>
              <span className="text-xs font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>por venta</span>
            </div>
          </div>

          {/* Bloque C — Desglose 2 col */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Métodos de pago */}
            <Card style={{ borderColor: 'var(--color-gris-claro)' }}>
              <CardContent className="p-5">
                <p className="text-base font-tan-nimbus mb-4" style={{ color: 'var(--color-verde-profundo)' }}>
                  Métodos de pago
                </p>
                <div className="space-y-4">
                  {([
                    { icon: <Banknote className="h-4 w-4" />, label: 'Efectivo',        amount: summary.byPaymentMethod.CASH,     p: pct(summary.byPaymentMethod.CASH) },
                    { icon: <CreditCard className="h-4 w-4" />, label: 'Tarjeta',       amount: summary.byPaymentMethod.CARD,     p: pct(summary.byPaymentMethod.CARD) },
                    { icon: <Send className="h-4 w-4" />,        label: 'Transferencia', amount: summary.byPaymentMethod.TRANSFER, p: pct(summary.byPaymentMethod.TRANSFER) },
                  ] as const).map(({ icon, label, amount, p }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                          {icon}
                          <span className="text-sm font-medium">{label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
                            {formatCurrency(amount)}
                          </span>
                          <span className="text-xs w-8 text-right font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>
                            {Math.round(p)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1 rounded-full" style={{ background: 'var(--color-gris-claro)' }}>
                        <div className="h-1 rounded-full transition-all" style={{ width: `${p}%`, background: 'var(--color-terracota)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Estado de ventas */}
            <Card style={{ borderColor: 'var(--color-gris-claro)' }}>
              <CardContent className="p-5">
                <p className="text-base font-tan-nimbus mb-4" style={{ color: 'var(--color-verde-profundo)' }}>
                  Estado de ventas
                </p>
                <div className="space-y-4">
                  {([
                    { icon: <CheckCircle className="h-4 w-4" />, label: 'Completadas', count: summary.byStatus.COMPLETED, p: spct(summary.byStatus.COMPLETED), color: 'var(--color-verde-profundo)' },
                    { icon: <Clock className="h-4 w-4" />,        label: 'Pendientes',  count: summary.byStatus.PENDING,   p: spct(summary.byStatus.PENDING),   color: 'var(--color-naranja-medio)' },
                    { icon: <XCircle className="h-4 w-4" />,      label: 'Canceladas',  count: summary.byStatus.CANCELLED, p: spct(summary.byStatus.CANCELLED), color: 'var(--color-terracota)' },
                  ] as const).map(({ icon, label, count, p, color }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)' }}>
                          <span style={{ color }}>{icon}</span>
                          <span className="text-sm font-medium">{label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
                            {count}
                          </span>
                          <span className="text-xs w-8 text-right font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>
                            {Math.round(p)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1 rounded-full" style={{ background: 'var(--color-gris-claro)' }}>
                        <div className="h-1 rounded-full transition-all" style={{ width: `${p}%`, background: color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bloque E — Top productos */}
          <Card style={{ borderColor: 'var(--color-gris-claro)' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
                Top productos del rango
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary.topProducts.length === 0 ? (
                <p className="text-sm font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>
                  Sin ventas en el rango.
                </p>
              ) : (
                <div className="space-y-0 font-winter-solid">
                  {summary.topProducts.map((p, i) => (
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
        </>
      )}
    </div>
  );
}
