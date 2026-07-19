'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, MessageCircle, Pencil, Receipt, RotateCcw } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getWhatsAppLink } from '@/lib/utils/whatsapp';
import {
  leadsAdmin,
  type LeadItem,
  type LeadStatus,
} from '@/services/leads.admin.service';
import { FilterChip, IconBtn, Pager, StatusBadge } from './_shared';

const LIMIT = 20;

// Filtros de estado con su acento (color) y tinte (fondo suave) del .pen.
const FILTERS: { key: string; label: string; color: string; tint: string }[] = [
  { key: '', label: 'Todas', color: '#455a54', tint: '#E7F0EC' },
  { key: 'NEW', label: 'Nuevas', color: '#cc844a', tint: '#F6E9DC' },
  { key: 'CONTACTED', label: 'Contactadas', color: '#455a54', tint: '#E7F0EC' },
  { key: 'CLOSED', label: 'Cerradas', color: '#7a6e6f', tint: '#f1ede6' },
];

const STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: 'Nueva',
  CONTACTED: 'Contactada',
  CLOSED: 'Cerrada',
};

// [bg, texto] por estado, en hex de la paleta.
const STATUS_COLOR: Record<LeadStatus, [string, string]> = {
  NEW: ['#F6E9DC', '#cc844a'],
  CONTACTED: ['#E7F0EC', '#455a54'],
  CLOSED: ['#f1ede6', '#7a6e6f'],
};

// Contacto para el botón de WhatsApp: wa.me si es WhatsApp, si no un tel:.
// Devuelve null si no hay teléfono.
function contactHref(l: LeadItem): string | null {
  if (!l.customerPhone?.trim()) return null;
  return l.source === 'WHATSAPP'
    ? getWhatsAppLink(l.customerPhone)
    : `tel:${l.customerPhone.replace(/\s/g, '')}`;
}

// ¿Es un comprobante de transferencia? (se resalta la fila).
function isComprobante(l: LeadItem): boolean {
  return l.service.startsWith('Comprobante');
}

// Columnas explícitas (sin `auto`) para alinear header y filas. Sólo desktop;
// en mobile se usan tarjetas.
const COLS =
  'grid grid-cols-[1fr_1.2fr_1fr_9rem_4rem_7rem_8.5rem] items-center gap-3';

export function ConsultasTab() {
  const [items, setItems] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<LeadItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leadsAdmin.list({
        status: status || undefined,
        page,
        limit: LIMIT,
      });
      setItems(res.items);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Contadores por estado (para los chips).
  useEffect(() => {
    let alive = true;
    const keys = ['', 'NEW', 'CONTACTED', 'CLOSED'];
    Promise.all(
      keys.map((k) =>
        leadsAdmin
          .list({ status: k || undefined, page: 1, limit: 1 })
          .then((r) => [k, r.total] as const)
          .catch(() => [k, 0] as const),
      ),
    ).then((pairs) => {
      if (alive) setCounts(Object.fromEntries(pairs));
    });
    return () => {
      alive = false;
    };
  }, []);

  async function setLeadStatus(lead: LeadItem, next: LeadStatus) {
    try {
      await leadsAdmin.update(lead._id, { status: next });
      showToast.success(`Consulta marcada como ${STATUS_LABEL[next].toLowerCase()}`);
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo actualizar');
    }
  }

  // Acciones por lead: WhatsApp, avanzar estado (contactada/cerrada) y nota.
  function renderLeadActions(l: LeadItem) {
    const href = contactHref(l);
    // Próximo estado hacia adelante: NEW → CONTACTED → CLOSED.
    const next: LeadStatus | null =
      l.status === 'NEW' ? 'CONTACTED' : l.status === 'CONTACTED' ? 'CLOSED' : null;
    const checkTitle =
      l.status === 'NEW'
        ? 'Marcar contactada'
        : l.status === 'CONTACTED'
          ? 'Marcar cerrada'
          : 'Cerrada';
    return (
      <div className='flex items-center justify-end gap-1.5'>
        {href ? (
          <a
            href={href}
            target={l.source === 'WHATSAPP' ? '_blank' : undefined}
            rel='noopener noreferrer'
            title='Abrir WhatsApp'
          >
            <IconBtn icon={MessageCircle} title='Abrir WhatsApp' tone='verde' />
          </a>
        ) : (
          <IconBtn icon={MessageCircle} title='Sin teléfono' disabled />
        )}
        {l.status === 'CLOSED' ? (
          <IconBtn
            icon={RotateCcw}
            title='Reabrir'
            onClick={() => setLeadStatus(l, 'CONTACTED')}
          />
        ) : (
          <IconBtn
            icon={Check}
            title={checkTitle}
            disabled={!next}
            onClick={next ? () => setLeadStatus(l, next) : undefined}
          />
        )}
        <IconBtn icon={Pencil} title='Nota' onClick={() => setEditing(l)} />
      </div>
    );
  }

  function leadBadge(l: LeadItem) {
    const [bg, fg] = STATUS_COLOR[l.status] ?? ['#f1ede6', '#7a6e6f'];
    return (
      <StatusBadge label={STATUS_LABEL[l.status] ?? l.status} bg={bg} fg={fg} />
    );
  }

  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to = (page - 1) * LIMIT + items.length;

  return (
    <div className='flex flex-col gap-5'>
      {/* Filtros de estado con contador */}
      <div className='flex flex-wrap items-center gap-2'>
        {FILTERS.map((f) => (
          <FilterChip
            key={f.key || 'all'}
            label={f.label}
            count={counts[f.key] ?? null}
            active={f.key === status}
            color={f.color}
            tint={f.tint}
            onClick={() => {
              setStatus(f.key);
              setPage(1);
            }}
          />
        ))}
      </div>

      {/* Desktop: tabla */}
      <div className='hidden overflow-x-auto rounded-2xl border border-[#e6dbcd] bg-white md:block'>
        <div className='min-w-[52rem]'>
          <div className={`${COLS} border-b border-[#e6dbcd] bg-[#fbf5ef] px-5 py-3 font-mono text-[11px] tracking-wider text-[#7a6e6f]`}>
            <span>SERVICIO</span>
            <span>CLIENTE</span>
            <span>CONTACTO</span>
            <span>FECHA TENTATIVA</span>
            <span className='text-center'>PERS.</span>
            <span>ESTADO</span>
            <span className='text-right'>ACCIONES</span>
          </div>
          {loading ? (
            <div className='p-6 text-sm text-[#7a6e6f]'>Cargando…</div>
          ) : items.length === 0 ? (
            <div className='p-6 text-sm text-[#7a6e6f]'>Sin consultas.</div>
          ) : (
            items.map((l) => {
              const comp = isComprobante(l);
              return (
                <div
                  key={l._id}
                  className={cn(
                    `${COLS} border-b border-[#e6dbcd] px-5 py-3.5 last:border-0`,
                    comp && 'bg-[#fbf5ef]',
                  )}
                >
                  <div className='flex min-w-0 items-center gap-1.5'>
                    {comp && (
                      <Receipt className='h-3.5 w-3.5 shrink-0 text-[#9d684e]' />
                    )}
                    <p className='truncate text-sm font-medium text-[#3d3338]'>
                      {l.service}
                    </p>
                  </div>
                  <p className='truncate text-sm text-[#3d3338]'>{l.customerName}</p>
                  <p className='truncate font-mono text-xs text-[#7a6e6f]'>
                    {l.customerPhone ?? l.customerEmail ?? '—'}
                  </p>
                  <p className='text-sm text-[#7a6e6f]'>{l.preferredDate || '—'}</p>
                  <span className='text-center text-sm text-[#455a54]'>
                    {l.quantity ?? '—'}
                  </span>
                  <div>{leadBadge(l)}</div>
                  {renderLeadActions(l)}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Mobile: tarjetas */}
      <div className='flex flex-col gap-3 md:hidden'>
        {loading ? (
          <div className='rounded-2xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#7a6e6f]'>
            Cargando…
          </div>
        ) : items.length === 0 ? (
          <div className='rounded-2xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#7a6e6f]'>
            Sin consultas.
          </div>
        ) : (
          items.map((l) => {
            const comp = isComprobante(l);
            return (
              <div
                key={l._id}
                className={cn(
                  'rounded-2xl border border-[#e6dbcd] bg-white p-4',
                  comp && 'bg-[#fbf5ef]',
                )}
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex min-w-0 items-center gap-1.5'>
                    {comp && (
                      <Receipt className='h-3.5 w-3.5 shrink-0 text-[#9d684e]' />
                    )}
                    <p className='text-sm font-medium text-[#3d3338]'>{l.service}</p>
                  </div>
                  {leadBadge(l)}
                </div>
                <p className='mt-2 text-sm text-[#3d3338]'>{l.customerName}</p>
                <p className='font-mono text-xs text-[#7a6e6f]'>
                  {l.customerPhone ?? l.customerEmail ?? '—'}
                </p>
                <div className='mt-3 flex items-center justify-between gap-2 border-t border-[#e6dbcd] pt-3'>
                  <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#7a6e6f]'>
                    <span>{l.preferredDate || '—'}</span>
                    {l.quantity ? <span>{l.quantity} pers.</span> : null}
                  </div>
                  {renderLeadActions(l)}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Pager
        page={page}
        totalPages={totalPages}
        total={total}
        from={from}
        to={to}
        onPage={setPage}
      />

      <p className='flex items-center gap-2 text-xs text-[#7a6e6f]'>
        <MessageCircle className='h-3.5 w-3.5 text-[#9d684e]' />
        Consultas de servicios que se coordinan (cumpleaños, talleres, escuelita,
        facilitadores). El bot y la web las cargan acá.
      </p>

      {editing && (
        <EditNoteModal
          lead={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function EditNoteModal({
  lead,
  onClose,
  onSaved,
}: Readonly<{
  lead: LeadItem;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}>) {
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await leadsAdmin.update(lead._id, { notes: notes.trim() });
      showToast.success('Nota guardada');
      await onSaved();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader className='text-left'>
          <DialogTitle className='font-tan-nimbus text-xl text-[#455a54]'>
            Nota de la consulta
          </DialogTitle>
        </DialogHeader>
        <div className='flex flex-col gap-1.5'>
          <span className='font-mono text-[11px] tracking-wider text-[#7a6e6f]'>
            {lead.customerName.toUpperCase()} · {lead.service.toUpperCase()}
          </span>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder='Detalle de la consulta, acuerdos, seguimiento…'
            className='border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30'
          />
        </div>
        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={onClose}
            className='border-[#e6dbcd] text-[#455a54] hover:bg-[#fbf5ef]'
          >
            Cancelar
          </Button>
          <Button
            type='button'
            variant='terracota'
            onClick={submit}
            disabled={saving}
          >
            {saving ? 'Guardando…' : 'Guardar nota'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
