'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  leadsAdmin,
  type LeadItem,
  type LeadStatus,
} from '@/services/leads.admin.service';

const FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'Todas' },
  { key: 'NEW', label: 'Nuevas' },
  { key: 'CONTACTED', label: 'Contactadas' },
  { key: 'CLOSED', label: 'Cerradas' },
];

const STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: 'Nueva',
  CONTACTED: 'Contactada',
  CLOSED: 'Cerrada',
};

const STATUS_COLOR: Record<LeadStatus, [string, string]> = {
  NEW: ['#FBE9DC', '#9D684E'],
  CONTACTED: ['#E7F0EC', '#455A54'],
  CLOSED: ['#F1EDE6', '#7A6E6F'],
};

const SOURCE_LABEL: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  WEB: 'Web',
  ADMIN: 'Admin',
};

// Columnas explícitas (sin `auto`) para alinear header y filas. Sólo desktop;
// en mobile se usan tarjetas.
const COLS =
  'grid grid-cols-[1.6fr_1.6fr_1.4fr_5.5rem_6rem_12rem] gap-3';

export function ConsultasTab() {
  const [items, setItems] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leadsAdmin.list({
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

  async function setLeadStatus(lead: LeadItem, next: LeadStatus) {
    try {
      await leadsAdmin.update(lead._id, { status: next });
      showToast.success(`Consulta marcada como ${STATUS_LABEL[next].toLowerCase()}`);
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo actualizar');
    }
  }

  function renderLeadActions(l: LeadItem) {
    const canContact = l.status === 'NEW';
    const canClose = l.status !== 'CLOSED';
    if (!canContact && !canClose) return null;
    return (
      <div className='flex justify-end gap-1.5'>
        {canContact && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setLeadStatus(l, 'CONTACTED')}
            className='border-[#e6dbcd] bg-[#fbf5ef] text-[#3d3338] hover:bg-[#f3e9df]'
          >
            Contactada
          </Button>
        )}
        {canClose && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => setLeadStatus(l, 'CLOSED')}
            className='text-[#7a6e6f] hover:bg-[#fbf5ef] hover:text-[#3d3338]'
          >
            Cerrar
          </Button>
        )}
      </div>
    );
  }

  function leadBadge(l: LeadItem) {
    // Estado como texto tipográfico (punto de color + label), sin pill.
    const [, fg] = STATUS_COLOR[l.status] ?? ['#f1ede6', '#7a6e6f'];
    return (
      <span className='inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#3d3338]'>
        <span
          className='h-1.5 w-1.5 rounded-full'
          style={{ backgroundColor: fg }}
        />
        {STATUS_LABEL[l.status] ?? l.status}
      </span>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-[#e6dbcd] pb-1'>
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
              className={cn(
                'relative -mb-px border-b-2 pb-2 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors',
                on
                  ? 'border-[#455a54] text-[#3d3338]'
                  : 'border-transparent text-[#7a6e6f] hover:text-[#3d3338]',
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Desktop: tabla */}
      <div className='hidden overflow-x-auto rounded-xl border border-[#e6dbcd] bg-white md:block'>
        <div className='min-w-[48rem]'>
          <div className={`${COLS} border-b border-[#e6dbcd] bg-[#fbf5ef] px-5 py-3 font-mono text-[11px] tracking-wider text-[#7a6e6f]`}>
            <span>SERVICIO</span>
            <span>CLIENTE</span>
            <span>FECHA / PERS.</span>
            <span>ORIGEN</span>
            <span>ESTADO</span>
            <span className='text-right'>ACCIÓN</span>
          </div>
          {loading ? (
            <div className='p-6 text-sm text-[#7a6e6f]'>Cargando…</div>
          ) : items.length === 0 ? (
            <div className='p-6 text-sm text-[#7a6e6f]'>Sin consultas.</div>
          ) : (
            items.map((l) => (
              <div
                key={l._id}
                className={`${COLS} items-center border-b border-[#e6dbcd] px-5 py-3.5 last:border-0`}
              >
                <div>
                  <p className='text-sm font-medium text-[#3d3338]'>{l.service}</p>
                  {l.notes && (
                    <p className='line-clamp-1 text-xs text-[#7a6e6f]'>{l.notes}</p>
                  )}
                </div>
                <div>
                  <p className='text-sm text-[#3d3338]'>{l.customerName}</p>
                  <p className='font-mono text-xs text-[#7a6e6f]'>
                    {l.customerPhone ?? l.customerEmail ?? '—'}
                  </p>
                </div>
                <div className='text-xs text-[#3d3338]'>
                  <p>{l.preferredDate ?? '—'}</p>
                  <p className='text-[#7a6e6f]'>
                    {l.quantity ? `${l.quantity} pers.` : ''}
                  </p>
                </div>
                <span className='rounded-md border border-[#e6dbcd] px-2 py-1 font-mono text-[11px] text-[#3d3338]'>
                  {SOURCE_LABEL[l.source] ?? l.source}
                </span>
                {leadBadge(l)}
                {renderLeadActions(l) ?? <span />}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mobile: tarjetas */}
      <div className='flex flex-col gap-3 md:hidden'>
        {loading ? (
          <div className='rounded-xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#7a6e6f]'>
            Cargando…
          </div>
        ) : items.length === 0 ? (
          <div className='rounded-xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#7a6e6f]'>
            Sin consultas.
          </div>
        ) : (
          items.map((l) => {
            const actions = renderLeadActions(l);
            return (
              <div
                key={l._id}
                className='rounded-xl border border-[#e6dbcd] bg-white p-4'
              >
                <div className='flex items-start justify-between gap-2'>
                  <p className='text-sm font-medium text-[#3d3338]'>{l.service}</p>
                  {leadBadge(l)}
                </div>
                {l.notes && (
                  <p className='mt-1 line-clamp-2 text-xs text-[#7a6e6f]'>
                    {l.notes}
                  </p>
                )}
                <p className='mt-2 text-sm text-[#3d3338]'>{l.customerName}</p>
                <p className='font-mono text-xs text-[#7a6e6f]'>
                  {l.customerPhone ?? l.customerEmail ?? '—'}
                </p>
                <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#7a6e6f]'>
                  <span>{l.preferredDate ?? 'Sin fecha'}</span>
                  {l.quantity ? <span>{l.quantity} pers.</span> : null}
                  <span className='rounded-md border border-[#e6dbcd] px-2 py-0.5 font-mono text-[#3d3338]'>
                    {SOURCE_LABEL[l.source] ?? l.source}
                  </span>
                </div>
                {actions && <div className='mt-3'>{actions}</div>}
              </div>
            );
          })
        )}
      </div>

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

      <p className='flex items-center gap-2 text-xs text-[#7a6e6f]'>
        <MessageCircle className='h-3.5 w-3.5 text-[#9d684e]' />
        Consultas de servicios que se coordinan (cumpleaños, talleres, escuelita,
        facilitadores). El bot y la web las cargan acá.
      </p>
    </div>
  );
}
