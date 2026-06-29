'use client';

import { useCallback, useEffect, useState } from 'react';
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
} from '@/services/reservations.admin.service';

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
        <div className='grid grid-cols-[auto_1.4fr_2fr_auto_1fr_auto_auto] gap-2 border-b border-[#e6dbcd] bg-[#fbf5ef] px-5 py-3 font-mono text-[11px] tracking-wider text-[#7a6e6f]'>
          <span>CÓDIGO</span>
          <span>CLIENTE</span>
          <span>EXPERIENCIA / TURNO</span>
          <span>PERS.</span>
          <span>MONTO</span>
          <span>ORIGEN</span>
          <span>ESTADO</span>
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
                className='grid grid-cols-[auto_1.4fr_2fr_auto_1fr_auto_auto] items-center gap-2 border-b border-[#e6dbcd] px-5 py-3.5 last:border-0'
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
              </div>
            );
          })
        )}
      </div>

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
