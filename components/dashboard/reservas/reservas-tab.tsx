'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ban, CheckCircle2, Wallet, X } from 'lucide-react';
import { showToast } from '@/lib/toast';
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

export function ReservasTab() {
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [collect, setCollect] = useState<ReservationItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reservationsAdmin.listReservations({
        status: status || undefined,
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
  }, [status, page]);

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

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap gap-2'>
        {FILTERS.map((f) => {
          const on = f.key === status;
          return (
            <button
              key={f.key || 'all'}
              type='button'
              onClick={() => {
                setStatus(f.key);
                setPage(1);
              }}
              className={`rounded-full px-4 py-2 text-sm transition ${
                on
                  ? 'bg-[#455a54] text-white'
                  : 'border border-[#e6dbcd] bg-white text-[#7a6e6f]'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className='overflow-hidden rounded-xl border border-[#e6dbcd] bg-white'>
        <div className='grid grid-cols-[auto_1.4fr_2fr_auto_1fr_auto_auto_auto] gap-2 border-b border-[#e6dbcd] bg-[#fbf5ef] px-5 py-3 font-mono text-[11px] tracking-wider text-[#7a6e6f]'>
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
          <div className='p-6 text-sm text-[#7a6e6f]'>Sin reservas.</div>
        ) : (
          items.map((r) => {
            const [bg, fg] = RESERVATION_STATUS_COLOR[r.status] ?? [
              '#f1ede6',
              '#7a6e6f',
            ];
            return (
              <div
                key={r._id}
                className='grid grid-cols-[auto_1.4fr_2fr_auto_1fr_auto_auto_auto] items-center gap-2 border-b border-[#e6dbcd] px-5 py-3.5 last:border-0'
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
                <div className='flex items-center justify-end gap-1.5'>
                  {r.status === 'NEEDS_REVIEW' && (
                    <button
                      type='button'
                      disabled={busy === r._id}
                      onClick={() => doResolve(r, 'confirm')}
                      title='Confirmar'
                      className='rounded-md border border-[#e6dbcd] p-1.5 text-[#455a54] hover:bg-[#E7F0EC]'
                    >
                      <CheckCircle2 className='h-4 w-4' />
                    </button>
                  )}
                  {r.balanceDue != null && r.balanceDue > 0 && r.status === 'CONFIRMED' && (
                    <button
                      type='button'
                      disabled={busy === r._id}
                      onClick={() => setCollect(r)}
                      title='Cobrar saldo'
                      className='rounded-md border border-[#e6dbcd] p-1.5 text-[#9d684e] hover:bg-[#fbf5ef]'
                    >
                      <Wallet className='h-4 w-4' />
                    </button>
                  )}
                  {['PENDING', 'CONFIRMED', 'NEEDS_REVIEW'].includes(r.status) && (
                    <button
                      type='button'
                      disabled={busy === r._id}
                      onClick={() => doCancel(r)}
                      title='Cancelar'
                      className='rounded-md border border-[#e6dbcd] p-1.5 text-[#b23b2e] hover:bg-red-50'
                    >
                      <Ban className='h-4 w-4' />
                    </button>
                  )}
                </div>
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
          <button
            type='button'
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className='rounded-lg border border-[#e6dbcd] bg-white px-4 py-2 text-sm text-[#3d3338] disabled:opacity-40'
          >
            Anterior
          </button>
          <span className='text-sm text-[#7a6e6f]'>
            {page} / {totalPages}
          </span>
          <button
            type='button'
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className='rounded-lg border border-[#e6dbcd] bg-white px-4 py-2 text-sm text-[#3d3338] disabled:opacity-40'
          >
            Siguiente
          </button>
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
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
      <div className='w-full max-w-sm rounded-xl bg-white p-6'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='font-playfair text-xl text-[#3d3338]'>Cobrar saldo</h2>
          <button type='button' onClick={onClose}>
            <X className='h-5 w-5 text-[#7a6e6f]' />
          </button>
        </div>
        <p className='mb-3 text-sm text-[#7a6e6f]'>
          {reservation.experienceName} · {prettyCode(reservation.code)} · saldo{' '}
          {fmtPrice(balance)}
        </p>
        <div className='mb-3 grid grid-cols-3 gap-2'>
          {PAY_METHODS.map((m) => (
            <button
              key={m.key}
              type='button'
              onClick={() => setMethod(m.key)}
              className={`rounded-lg border px-2 py-2 text-xs font-medium ${
                m.key === method
                  ? 'border-[#9d684e] bg-[#9d684e] text-white'
                  : 'border-[#e6dbcd] bg-[#fbf5ef] text-[#3d3338]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <input
          type='number'
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className='mb-4 w-full rounded-lg border border-[#e6dbcd] bg-[#fbf5ef] px-3 py-2.5 text-sm text-[#3d3338] outline-none focus:border-[#9d684e]'
        />
        <button
          type='button'
          onClick={submit}
          disabled={saving}
          className='w-full rounded-lg bg-[#9d684e] px-4 py-3 font-mono text-xs tracking-wider text-white disabled:opacity-60'
        >
          {saving ? 'COBRANDO…' : 'CONFIRMAR COBRO'}
        </button>
      </div>
    </div>
  );
}
