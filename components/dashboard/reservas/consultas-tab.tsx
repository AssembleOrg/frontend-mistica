'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { fmtDateTime } from '@/lib/reservas-format';
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
        <div className='grid grid-cols-[1.6fr_1.6fr_1.4fr_auto_auto_auto] gap-2 border-b border-[#e6dbcd] bg-[#fbf5ef] px-5 py-3 font-mono text-[11px] tracking-wider text-[#7a6e6f]'>
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
          items.map((l) => {
            const [bg, fg] = STATUS_COLOR[l.status] ?? ['#f1ede6', '#7a6e6f'];
            return (
              <div
                key={l._id}
                className='grid grid-cols-[1.6fr_1.6fr_1.4fr_auto_auto_auto] items-center gap-2 border-b border-[#e6dbcd] px-5 py-3.5 last:border-0'
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
                <span
                  className='rounded-full px-2.5 py-1 font-mono text-[11px]'
                  style={{ backgroundColor: bg, color: fg }}
                >
                  {STATUS_LABEL[l.status] ?? l.status}
                </span>
                <div className='flex justify-end gap-1.5'>
                  {l.status === 'NEW' && (
                    <button
                      type='button'
                      onClick={() => setLeadStatus(l, 'CONTACTED')}
                      className='rounded-lg border border-[#e6dbcd] bg-[#fbf5ef] px-3 py-1.5 text-xs text-[#3d3338]'
                    >
                      Contactada
                    </button>
                  )}
                  {l.status !== 'CLOSED' && (
                    <button
                      type='button'
                      onClick={() => setLeadStatus(l, 'CLOSED')}
                      className='rounded-lg border border-[#e6dbcd] px-3 py-1.5 text-xs text-[#7a6e6f]'
                    >
                      Cerrar
                    </button>
                  )}
                </div>
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

      <p className='flex items-center gap-2 text-xs text-[#7a6e6f]'>
        <MessageCircle className='h-3.5 w-3.5 text-[#9d684e]' />
        Consultas de servicios que se coordinan (cumpleaños, talleres, escuelita,
        facilitadores). El bot y la web las cargan acá.
      </p>
    </div>
  );
}
