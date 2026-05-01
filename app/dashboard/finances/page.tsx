'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';
import {
  Banknote,
  CreditCard,
  Send,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { financeService, type FinanceSummary } from '@/services/finance.service';
import { formatCurrency } from '@/lib/sales-calculations';
import { showToast } from '@/lib/toast';
import { QuickEgressDialog } from '@/components/dashboard/finances/quick-egress-dialog';

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function FinancesPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(),
    to: new Date(),
  });
  const [paymentMethod, setPaymentMethod] = useState<'all' | 'CASH' | 'CARD' | 'TRANSFER'>('all');
  const [saleStatus, setSaleStatus] = useState<'all' | 'PENDING' | 'COMPLETED' | 'CANCELLED'>('all');
  const [clientFilter, setClientFilter] = useState<'all' | 'named' | 'anonymous'>('all');
  const [productId, setProductId] = useState('');

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewEgress, setShowNewEgress] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeService.summary({
        from: dateRange?.from ? isoDate(dateRange.from) : undefined,
        to: dateRange?.to ? isoDate(dateRange.to) : undefined,
        paymentMethod: paymentMethod === 'all' ? undefined : paymentMethod,
        saleStatus: saleStatus === 'all' ? undefined : saleStatus,
        clientId: clientFilter === 'anonymous' ? 'anonymous' : undefined,
        productId: productId || undefined,
      });
      setSummary(res.data);
    } catch (err) {
      console.error(err);
      showToast.error('No se pudo cargar el resumen');
    } finally {
      setLoading(false);
    }
  }, [dateRange, paymentMethod, saleStatus, clientFilter, productId]);

  useEffect(() => {
    load();
  }, [load]);

  const expectedCash = useMemo(() => {
    if (!summary) return 0;
    // Lo esperado en caja del rango (suma de aperturas + ventas cash + prepaids cash − egresos cash − vueltos)
    const sessions = summary.cashSessions;
    const opening = sessions.reduce((s, x) => s + x.openingCash, 0);
    return (
      opening +
      summary.byPaymentMethod.CASH +
      summary.prepaids.byPaymentMethod.CASH -
      summary.expenses.byPaymentMethod.CASH -
      summary.totalCashChange
    );
  }, [summary]);

  return (
    <div className='space-y-6 mt-6'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold text-[#455a54] font-tan-nimbus'>
            Caja y Finanzas
          </h1>
          <p className='text-[#455a54]/70 font-winter-solid text-sm sm:text-base'>
            Resumen contable, caja y movimientos del período
          </p>
        </div>
        <Button
          onClick={() => setShowNewEgress(true)}
          className='bg-[#9d684e] hover:bg-[#9d684e]/90 text-white w-full sm:w-auto'
        >
          <ArrowDownRight className='h-4 w-4 mr-2' />
          Registrar egreso
        </Button>
      </div>

      <QuickEgressDialog
        open={showNewEgress}
        onOpenChange={setShowNewEgress}
        onCreated={load}
      />

      {/* Filtros */}
      <Card className='border-[#9d684e]/20'>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base font-tan-nimbus text-[#455a54]'>Filtros</CardTitle>
        </CardHeader>
        <CardContent className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3'>
          <div className='space-y-1 lg:col-span-2'>
            <Label className='text-xs'>Rango de fechas</Label>
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          </div>
          <div className='space-y-1'>
            <Label className='text-xs'>Método de pago</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Todos</SelectItem>
                <SelectItem value='CASH'>Efectivo</SelectItem>
                <SelectItem value='CARD'>Tarjeta</SelectItem>
                <SelectItem value='TRANSFER'>Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-1'>
            <Label className='text-xs'>Cliente</Label>
            <Select value={clientFilter} onValueChange={(v) => setClientFilter(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Todos</SelectItem>
                <SelectItem value='named'>Con nombre</SelectItem>
                <SelectItem value='anonymous'>Anónimos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-1'>
            <Label className='text-xs'>Estado de venta</Label>
            <Select value={saleStatus} onValueChange={(v) => setSaleStatus(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Todos</SelectItem>
                <SelectItem value='COMPLETED'>Completadas</SelectItem>
                <SelectItem value='PENDING'>Pendientes</SelectItem>
                <SelectItem value='CANCELLED'>Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-1 sm:col-span-2'>
            <Label className='text-xs'>Producto (ID, opcional)</Label>
            <Input
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder='ID interno del producto'
            />
          </div>
          <div className='space-y-1 sm:col-span-2 lg:col-span-3 flex items-end'>
            <Button onClick={load} disabled={loading} className='w-full sm:w-auto bg-[#9d684e] hover:bg-[#9d684e]/90 text-white'>
              {loading ? 'Cargando…' : 'Aplicar filtros'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Métricas top */}
      {summary && (
        <>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
            <MetricCard
              label='Ingresos'
              value={formatCurrency(summary.totalRevenue)}
              icon={<TrendingUp className='h-4 w-4 text-green-700' />}
              tone='green'
            />
            <MetricCard
              label='Ventas'
              value={String(summary.salesCount)}
              icon={<ArrowUpRight className='h-4 w-4 text-blue-700' />}
              tone='blue'
            />
            <MetricCard
              label='Ticket promedio'
              value={formatCurrency(summary.averageTicket)}
              tone='gray'
            />
            <MetricCard
              label='Balance neto'
              value={formatCurrency(summary.netBalance)}
              icon={
                summary.netBalance >= 0 ? (
                  <TrendingUp className='h-4 w-4 text-emerald-700' />
                ) : (
                  <TrendingDown className='h-4 w-4 text-red-700' />
                )
              }
              tone={summary.netBalance >= 0 ? 'emerald' : 'red'}
            />
          </div>

          {/* Por medio de pago */}
          <Card className='border-[#9d684e]/20'>
            <CardHeader>
              <CardTitle className='text-base font-tan-nimbus text-[#455a54]'>
                Cobrado por medio de pago
              </CardTitle>
            </CardHeader>
            <CardContent className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
              <PaymentMethodCard
                icon={<Banknote className='h-4 w-4 text-green-700' />}
                label='Efectivo'
                value={formatCurrency(summary.byPaymentMethod.CASH)}
                tone='green'
              />
              <PaymentMethodCard
                icon={<CreditCard className='h-4 w-4 text-blue-700' />}
                label='Tarjeta'
                value={formatCurrency(summary.byPaymentMethod.CARD)}
                tone='blue'
              />
              <PaymentMethodCard
                icon={<Send className='h-4 w-4 text-purple-700' />}
                label='Transferencia'
                value={formatCurrency(summary.byPaymentMethod.TRANSFER)}
                tone='purple'
              />
            </CardContent>
            {summary.totalCashChange > 0 && (
              <CardContent className='pt-0 text-xs text-[#455a54]/70 font-winter-solid'>
                Vueltos entregados en efectivo en el rango:{' '}
                <span className='font-semibold text-[#9d684e]'>
                  {formatCurrency(summary.totalCashChange)}
                </span>{' '}
                (sale físicamente de la caja)
              </CardContent>
            )}
          </Card>

          {/* Caja: estado por sesión */}
          <Card className='border-[#9d684e]/20'>
            <CardHeader>
              <div className='flex items-center justify-between gap-2'>
                <div>
                  <CardTitle className='text-base font-tan-nimbus text-[#455a54]'>
                    Estado de caja
                  </CardTitle>
                  <p className='text-xs text-[#455a54]/70 font-winter-solid'>
                    Sesiones abiertas en el rango y diferencias de cierre
                  </p>
                </div>
                <Badge
                  className={
                    summary.totalDiscrepancy === 0
                      ? 'bg-green-100 text-green-800'
                      : summary.totalDiscrepancy > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                  }
                >
                  Diferencia neta: {formatCurrency(summary.totalDiscrepancy)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {summary.cashSessions.length === 0 ? (
                <p className='text-sm text-[#455a54]/60'>
                  No hubo aperturas de caja en este rango.
                </p>
              ) : (
                <div className='space-y-2'>
                  {summary.cashSessions.map((s) => (
                    <div
                      key={s.id}
                      className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border border-[#9d684e]/15 bg-white p-3 text-sm'
                    >
                      <div>
                        <div className='font-winter-solid text-[#455a54]'>
                          {new Date(s.openedAt).toLocaleString('es-AR')} →{' '}
                          {s.closedAt ? new Date(s.closedAt).toLocaleString('es-AR') : 'Abierta'}
                        </div>
                        <div className='text-xs text-[#455a54]/60'>
                          Apertura {formatCurrency(s.openingCash)}
                          {s.expectedClosingCash !== null && (
                            <>
                              {' · '}Esperado {formatCurrency(s.expectedClosingCash)}
                            </>
                          )}
                          {s.countedClosingCash !== null && (
                            <>
                              {' · '}Contado {formatCurrency(s.countedClosingCash)}
                            </>
                          )}
                        </div>
                      </div>
                      {s.discrepancy !== null && s.discrepancy !== 0 && (
                        <Badge
                          className={
                            s.discrepancy > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          <AlertTriangle className='h-3 w-3 mr-1' />
                          {s.discrepancy > 0 ? 'Sobrante' : 'Faltante'}{' '}
                          {formatCurrency(Math.abs(s.discrepancy))}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Egresos / Prepaids */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
            <Card className='border-[#9d684e]/20'>
              <CardHeader>
                <CardTitle className='text-base font-tan-nimbus text-[#455a54] flex items-center gap-2'>
                  <ArrowDownRight className='h-4 w-4 text-red-600' />
                  Egresos
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-1 text-sm font-winter-solid'>
                <div className='flex justify-between'>
                  <span>Total ({summary.expenses.count})</span>
                  <span className='font-semibold'>{formatCurrency(summary.expenses.total)}</span>
                </div>
                <div className='text-xs text-[#455a54]/70 space-y-0.5 pt-1'>
                  <div>Efectivo: {formatCurrency(summary.expenses.byPaymentMethod.CASH)}</div>
                  <div>Tarjeta: {formatCurrency(summary.expenses.byPaymentMethod.CARD)}</div>
                  <div>Transferencia: {formatCurrency(summary.expenses.byPaymentMethod.TRANSFER)}</div>
                </div>
              </CardContent>
            </Card>

            <Card className='border-[#9d684e]/20'>
              <CardHeader>
                <CardTitle className='text-base font-tan-nimbus text-[#455a54] flex items-center gap-2'>
                  <Wallet className='h-4 w-4 text-[#9d684e]' />
                  Señas cobradas
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-1 text-sm font-winter-solid'>
                <div className='flex justify-between'>
                  <span>Total ({summary.prepaids.count})</span>
                  <span className='font-semibold'>{formatCurrency(summary.prepaids.total)}</span>
                </div>
                <div className='text-xs text-[#455a54]/70 space-y-0.5 pt-1'>
                  <div>Efectivo: {formatCurrency(summary.prepaids.byPaymentMethod.CASH)}</div>
                  <div>Tarjeta: {formatCurrency(summary.prepaids.byPaymentMethod.CARD)}</div>
                  <div>Transferencia: {formatCurrency(summary.prepaids.byPaymentMethod.TRANSFER)}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Clientes */}
          <Card className='border-[#9d684e]/20'>
            <CardHeader>
              <CardTitle className='text-base font-tan-nimbus text-[#455a54]'>Clientes</CardTitle>
            </CardHeader>
            <CardContent className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-winter-solid'>
              <div className='rounded-md border border-[#9d684e]/15 p-3'>
                <div className='text-xs text-[#455a54]/70'>Con nombre</div>
                <div className='text-lg font-semibold text-[#455a54]'>
                  {formatCurrency(summary.byClient.named.total)}
                </div>
                <div className='text-xs text-[#455a54]/60'>{summary.byClient.named.count} ventas</div>
              </div>
              <div className='rounded-md border border-[#9d684e]/15 p-3'>
                <div className='text-xs text-[#455a54]/70'>Anónimos</div>
                <div className='text-lg font-semibold text-[#455a54]'>
                  {formatCurrency(summary.byClient.anonymous.total)}
                </div>
                <div className='text-xs text-[#455a54]/60'>
                  {summary.byClient.anonymous.count} ventas
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top productos */}
          <Card className='border-[#9d684e]/20'>
            <CardHeader>
              <CardTitle className='text-base font-tan-nimbus text-[#455a54]'>
                Top productos del rango
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary.topProducts.length === 0 ? (
                <p className='text-sm text-[#455a54]/60'>Sin ventas en el rango.</p>
              ) : (
                <div className='space-y-1 text-sm font-winter-solid'>
                  {summary.topProducts.map((p, i) => (
                    <div
                      key={p.productId}
                      className='flex items-center justify-between py-1.5 border-b border-[#9d684e]/10 last:border-0'
                    >
                      <span className='text-[#455a54]'>
                        <span className='text-xs text-[#455a54]/50 mr-2'>#{i + 1}</span>
                        {p.productName}
                      </span>
                      <span>
                        <span className='text-xs text-[#455a54]/60 mr-2'>{p.quantity} u.</span>
                        <span className='font-semibold text-[#455a54]'>
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

interface MetricCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: 'green' | 'blue' | 'red' | 'gray' | 'emerald';
}

function MetricCard({ label, value, icon, tone = 'gray' }: MetricCardProps) {
  const toneClasses: Record<NonNullable<MetricCardProps['tone']>, string> = {
    green: 'bg-green-50 border-green-200 text-green-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    gray: 'bg-white border-[#9d684e]/20 text-[#455a54]',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  };
  return (
    <div className={`rounded-md border p-3 ${toneClasses[tone]}`}>
      <div className='flex items-center gap-1 text-xs font-winter-solid uppercase tracking-wide'>
        {icon}
        {label}
      </div>
      <div className='text-xl sm:text-2xl font-bold mt-1 font-tan-nimbus'>{value}</div>
    </div>
  );
}

function PaymentMethodCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'green' | 'blue' | 'purple';
}) {
  const toneClasses: Record<typeof tone, string> = {
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
  };
  return (
    <div className={`rounded-md border p-3 ${toneClasses[tone]}`}>
      <div className='flex items-center gap-1 text-xs font-winter-solid uppercase tracking-wide text-[#455a54]'>
        {icon}
        {label}
      </div>
      <div className='text-lg font-bold mt-1 font-tan-nimbus text-[#455a54]'>{value}</div>
    </div>
  );
}
