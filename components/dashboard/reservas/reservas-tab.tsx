'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ban, CheckCircle2, Search, Wallet } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  fmtDateTime,
  fmtPrice,
  prettyCode,
  RESERVATION_STATUS_COLOR,
  RESERVATION_STATUS_LABEL,
} from '@/lib/reservas-format';
import {
  reservationsAdmin,
  type ReservationItem,
  type ReservationPaymentMethod,
} from '@/services/reservations.admin.service';

const PAY_METHODS: { key: ReservationPaymentMethod; label: string }[] = [
  { key: 'CASH', label: 'Efectivo' },
  { key: 'TRANSFER', label: 'Transferencia' },
  { key: 'CARD', label: 'Tarjeta' },
];

const FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'Todas' },
  { key: 'CONFIRMED', label: 'Confirmadas' },
  { key: 'PENDING', label: 'Pendientes' },
  { key: 'CANCELLED', label: 'Canceladas' },
  { key: 'NEEDS_REVIEW', label: 'Revisión' },
];

// Mismas columnas para el encabezado y las filas: al ser grids independientes,
// necesitan un template EXPLÍCITO (sin `auto`) para alinear. El contenedor con
// min-w garantiza que el `fr` resuelva igual en ambos.
const COLS =
  'grid grid-cols-[6.5rem_1.3fr_2fr_3.5rem_7rem_5.5rem_6rem_7rem] gap-3';

export function ReservasTab() {
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [collect, setCollect] = useState<ReservationItem | null>(null);

  // Debounce del buscador: espera 350 ms tras la última tecla y vuelve a página 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reservationsAdmin.listReservations({
        status: status || undefined,
        search: search || undefined,
        page,
        limit: 20,
      });
      setItems(res.items);
      setTotalPages(res.totalPages);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function doCancel(r: ReservationItem) {
    if (!confirm(`¿Cancelar la reserva ${prettyCode(r.code)}? Libera el cupo y reembolsa si fue MercadoPago.`)) return;
    setBusy(r._id);
    try {
      await reservationsAdmin.cancelReservation(r._id);
      showToast.success('Reserva cancelada');
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo cancelar');
    } finally {
      setBusy(null);
    }
  }

  async function doResolve(r: ReservationItem, action: 'confirm' | 'cancel') {
    setBusy(r._id);
    try {
      await reservationsAdmin.resolveReservation(r._id, action);
      showToast.success(action === 'confirm' ? 'Reserva confirmada' : 'Reserva cancelada');
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo resolver');
    } finally {
      setBusy(null);
    }
  }

  function renderActions(r: ReservationItem) {
    const canConfirm = r.status === 'NEEDS_REVIEW';
    const canCollect =
      r.balanceDue != null && r.balanceDue > 0 && r.status === 'CONFIRMED';
    const canCancel = ['PENDING', 'CONFIRMED', 'NEEDS_REVIEW'].includes(r.status);
    if (!canConfirm && !canCollect && !canCancel) return null;
    return (
      <div className='flex items-center justify-end gap-1.5'>
        {canConfirm && (
          <Button
            type='button'
            variant='outline'
            size='icon'
            disabled={busy === r._id}
            onClick={() => doResolve(r, 'confirm')}
            title='Confirmar'
            className='size-8 border-[#e6dbcd] text-[#455a54] hover:bg-[#E7F0EC] hover:text-[#455a54]'
          >
            <CheckCircle2 className='h-4 w-4' />
          </Button>
        )}
        {canCollect && (
          <Button
            type='button'
            variant='outline'
            size='icon'
            disabled={busy === r._id}
            onClick={() => setCollect(r)}
            title='Cobrar saldo'
            className='size-8 border-[#e6dbcd] text-[#9d684e] hover:bg-[#fbf5ef] hover:text-[#9d684e]'
          >
            <Wallet className='h-4 w-4' />
          </Button>
        )}
        {canCancel && (
          <Button
            type='button'
            variant='outline'
            size='icon'
            disabled={busy === r._id}
            onClick={() => doCancel(r)}
            title='Cancelar'
            className='size-8 border-[#e6dbcd] text-[#b23b2e] hover:bg-red-50 hover:text-[#b23b2e]'
          >
            <Ban className='h-4 w-4' />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center gap-2'>
        {FILTERS.map((f) => {
          const on = f.key === status;
          return (
            <Button
              key={f.key || 'all'}
              type='button'
              variant={on ? 'verde' : 'outline'}
              onClick={() => {
                setStatus(f.key);
                setPage(1);
              }}
              className={cn(
                'rounded-full',
                !on && 'border-[#e6dbcd] bg-white text-[#7a6e6f] hover:bg-[#fbf5ef] hover:text-[#3d3338]',
              )}
            >
              {f.label}
            </Button>
          );
        })}
        <div className='relative w-full sm:ml-auto sm:w-72'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a99]' />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder='Buscar por código, nombre o teléfono'
            className='rounded-full border-[#e6dbcd] bg-white pl-9 text-[#3d3338] placeholder:text-[#a99] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30'
          />
        </div>
      </div>

      <div className='hidden overflow-x-auto rounded-xl border border-[#e6dbcd] bg-white md:block'>
        <div className='min-w-[52rem]'>
        <div className={cn(COLS, 'border-b border-[#e6dbcd] bg-[#fbf5ef] px-5 py-3 font-mono text-[11px] tracking-wider text-[#7a6e6f]')}>
          <span>CÓDIGO</span>
          <span>CLIENTE</span>
          <span>EXPERIENCIA / TURNO</span>
          <span>PERS.</span>
          <span>MONTO</span>
          <span>ORIGEN</span>
          <span>ESTADO</span>
          <span className='text-right'>ACCIONES</span>
        </div>
        {loading ? (
          <div className='p-6 text-sm text-[#7a6e6f]'>Cargando…</div>
        ) : items.length === 0 ? (
          <div className='p-6 text-sm text-[#7a6e6f]'>
            {search ? `Sin resultados para “${search}”.` : 'Sin reservas.'}
          </div>
        ) : (
          items.map((r) => {
            const [bg, fg] = RESERVATION_STATUS_COLOR[r.status] ?? [
              '#f1ede6',
              '#7a6e6f',
            ];
            return (
              <div
                key={r._id}
                className={cn(COLS, 'items-center border-b border-[#e6dbcd] px-5 py-3.5 last:border-0')}
              >
                <span className='font-mono text-sm font-semibold text-[#9d684e]'>
                  {prettyCode(r.code)}
                </span>
                <span className='text-sm font-medium text-[#3d3338]'>
                  {r.customerName}
                </span>
                <div>
                  <p className='text-sm text-[#3d3338]'>{r.experienceName}</p>
                  <p className='font-mono text-xs text-[#7a6e6f]'>
                    {fmtDateTime(r.startAt)}
                  </p>
                </div>
                <span className='text-sm text-[#3d3338]'>{r.quantity}</span>
                <div className='text-sm'>
                  <p className='font-medium text-[#3d3338]'>{fmtPrice(r.amount)}</p>
                  {r.balanceDue != null && r.balanceDue > 0 && (
                    <p className='text-[11px] text-[#7a6e6f]'>
                      saldo {fmtPrice(r.balanceDue)}
                    </p>
                  )}
                </div>
                <span className='rounded-md border border-[#e6dbcd] px-2 py-1 font-mono text-[11px] text-[#3d3338]'>
                  {r.source === 'ADMIN' ? 'Admin' : 'Público'}
                </span>
                <span
                  className='rounded-full px-2.5 py-1 font-mono text-[11px]'
                  style={{ backgroundColor: bg, color: fg }}
                >
                  {RESERVATION_STATUS_LABEL[r.status] ?? r.status}
                </span>
                {renderActions(r) ?? <span />}
              </div>
            );
          })
        )}
        </div>
      </div>

      {/* Mobile: tarjetas (la tabla no entra en pantallas chicas) */}
      <div className='flex flex-col gap-3 md:hidden'>
        {loading ? (
          <div className='rounded-xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#7a6e6f]'>
            Cargando…
          </div>
        ) : items.length === 0 ? (
          <div className='rounded-xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#7a6e6f]'>
            {search ? `Sin resultados para “${search}”.` : 'Sin reservas.'}
          </div>
        ) : (
          items.map((r) => {
            const [bg, fg] = RESERVATION_STATUS_COLOR[r.status] ?? [
              '#f1ede6',
              '#7a6e6f',
            ];
            const actions = renderActions(r);
            return (
              <div
                key={r._id}
                className='rounded-xl border border-[#e6dbcd] bg-white p-4'
              >
                <div className='flex items-center justify-between gap-2'>
                  <span className='font-mono text-sm font-semibold text-[#9d684e]'>
                    {prettyCode(r.code)}
                  </span>
                  <span
                    className='rounded-full px-2.5 py-1 font-mono text-[11px]'
                    style={{ backgroundColor: bg, color: fg }}
                  >
                    {RESERVATION_STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
                <p className='mt-1.5 text-sm font-medium text-[#3d3338]'>
                  {r.customerName}
                </p>
                <p className='mt-2 text-sm text-[#3d3338]'>{r.experienceName}</p>
                <p className='font-mono text-xs text-[#7a6e6f]'>
                  {fmtDateTime(r.startAt)}
                </p>
                <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm'>
                  <span className='text-[#3d3338]'>{r.quantity} pers.</span>
                  <span className='font-medium text-[#3d3338]'>
                    {fmtPrice(r.amount)}
                  </span>
                  {r.balanceDue != null && r.balanceDue > 0 && (
                    <span className='text-[11px] text-[#7a6e6f]'>
                      saldo {fmtPrice(r.balanceDue)}
                    </span>
                  )}
                  <span className='rounded-md border border-[#e6dbcd] px-2 py-0.5 font-mono text-[11px] text-[#3d3338]'>
                    {r.source === 'ADMIN' ? 'Admin' : 'Público'}
                  </span>
                </div>
                {actions && <div className='mt-3'>{actions}</div>}
              </div>
            );
          })
        )}
      </div>

      {collect && (
        <CollectBalanceModal
          reservation={collect}
          onClose={() => setCollect(null)}
          onDone={async () => {
            setCollect(null);
            await load();
          }}
        />
      )}

      {totalPages > 1 && (
        <div className='flex items-center justify-center gap-3'>
          <Button
            type='button'
            variant='outline'
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className='border-[#e6dbcd] bg-white text-[#3d3338] hover:bg-[#fbf5ef]'
          >
            Anterior
          </Button>
          <span className='text-sm text-[#7a6e6f]'>
            {page} / {totalPages}
          </span>
          <Button
            type='button'
            variant='outline'
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className='border-[#e6dbcd] bg-white text-[#3d3338] hover:bg-[#fbf5ef]'
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}

function CollectBalanceModal({
  reservation,
  onClose,
  onDone,
}: {
  reservation: ReservationItem;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const balance = reservation.balanceDue ?? 0;
  const [method, setMethod] = useState<ReservationPaymentMethod>('CASH');
  const [amount, setAmount] = useState<string>(String(balance));
  const [saving, setSaving] = useState(false);

  async function submit() {
    const value = Number(amount);
    if (!value || value <= 0) {
      showToast.error('Ingresá un monto válido');
      return;
    }
    setSaving(true);
    try {
      await reservationsAdmin.collectBalance(reservation._id, [
        { method, amount: value },
      ]);
      showToast.success('Saldo cobrado');
      await onDone();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo cobrar el saldo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Cobrar saldo</DialogTitle>
          <DialogDescription>
            {reservation.experienceName} · {prettyCode(reservation.code)} · saldo{' '}
            {fmtPrice(balance)}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3'>
          <div className='grid grid-cols-3 gap-2'>
            {PAY_METHODS.map((m) => {
              const on = m.key === method;
              return (
                <Button
                  key={m.key}
                  type='button'
                  variant={on ? 'terracota' : 'outline'}
                  size='sm'
                  onClick={() => setMethod(m.key)}
                  className={cn(
                    !on && 'border-[#e6dbcd] bg-[#fbf5ef] text-[#3d3338] hover:bg-[#f3e9df]',
                  )}
                >
                  {m.label}
                </Button>
              );
            })}
          </div>
          <Input
            type='number'
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className='border-[#e6dbcd] bg-[#fbf5ef] text-[#3d3338] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30'
          />
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='terracota'
            onClick={submit}
            disabled={saving}
            className='w-full'
          >
            {saving ? 'COBRANDO…' : 'CONFIRMAR COBRO'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
