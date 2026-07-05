'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, Pencil } from 'lucide-react';
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
import { fmtDate } from '@/lib/reservas-format';
import { getWhatsAppLink } from '@/lib/utils/whatsapp';
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

// [borde, texto] por origen. WhatsApp resaltado (verde) por ser el canal
// principal de la bandeja; el resto queda neutro.
const SOURCE_COLOR: Record<string, [string, string]> = {
  WHATSAPP: ['#25D366', '#128C4B'],
  WEB: ['#e6dbcd', '#455a54'],
  ADMIN: ['#e6dbcd', '#7a6e6f'],
};

// Contacto clickeable: WhatsApp abre wa.me, el resto un tel:. Devuelve null si
// no hay teléfono (cae al fallback de email/—).
function contactHref(l: LeadItem): string | null {
  if (!l.customerPhone?.trim()) return null;
  return l.source === 'WHATSAPP'
    ? getWhatsAppLink(l.customerPhone)
    : `tel:${l.customerPhone.replace(/\s/g, '')}`;
}

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
  const [editing, setEditing] = useState<LeadItem | null>(null);

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
    const canReopen = l.status !== 'NEW';
    return (
      <div className='flex flex-wrap justify-end gap-1.5'>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={() => setEditing(l)}
          title='Editar nota'
          className='size-8 text-[#455a54]/60 hover:bg-[#fbf5ef] hover:text-[#455a54]'
        >
          <Pencil className='h-3.5 w-3.5' />
        </Button>
        {canContact && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setLeadStatus(l, 'CONTACTED')}
            className='border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] hover:bg-[#f3e9df]'
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
            className='text-[#455a54]/60 hover:bg-[#fbf5ef] hover:text-[#455a54]'
          >
            Cerrar
          </Button>
        )}
        {canReopen && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => setLeadStatus(l, 'NEW')}
            className='text-[#455a54]/60 hover:bg-[#fbf5ef] hover:text-[#455a54]'
          >
            Reabrir
          </Button>
        )}
      </div>
    );
  }

  function contactLine(l: LeadItem) {
    const href = contactHref(l);
    const text = l.customerPhone ?? l.customerEmail ?? '—';
    if (!href) {
      return <span className='font-mono text-xs text-[#455a54]/60'>{text}</span>;
    }
    return (
      <a
        href={href}
        target={l.source === 'WHATSAPP' ? '_blank' : undefined}
        rel='noopener noreferrer'
        className='font-mono text-xs text-[#128C4B] hover:underline'
      >
        {text}
      </a>
    );
  }

  function sourceBadge(l: LeadItem) {
    const [border, fg] = SOURCE_COLOR[l.source] ?? ['#e6dbcd', '#455a54'];
    return (
      <span
        className='inline-flex w-fit items-center rounded-md border px-2 py-1 font-mono text-[11px]'
        style={{ borderColor: border, color: fg }}
      >
        {SOURCE_LABEL[l.source] ?? l.source}
      </span>
    );
  }

  function leadBadge(l: LeadItem) {
    // Estado como texto tipográfico (punto de color + label), sin pill.
    const [, fg] = STATUS_COLOR[l.status] ?? ['#f1ede6', '#7a6e6f'];
    return (
      <span className='inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#455a54]'>
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
                  ? 'border-[#455a54] font-semibold text-[#455a54]'
                  : 'border-transparent text-[#455a54]/75 hover:text-[#455a54]',
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
          <div className={`${COLS} border-b border-[#e6dbcd] bg-[#fbf5ef] px-5 py-3 font-mono text-[11px] tracking-wider text-[#455a54]/60`}>
            <span>SERVICIO</span>
            <span>CLIENTE</span>
            <span>FECHA / PERS.</span>
            <span>ORIGEN</span>
            <span>ESTADO</span>
            <span className='text-right'>ACCIÓN</span>
          </div>
          {loading ? (
            <div className='p-6 text-sm text-[#455a54]/60'>Cargando…</div>
          ) : items.length === 0 ? (
            <div className='p-6 text-sm text-[#455a54]/60'>Sin consultas.</div>
          ) : (
            items.map((l) => (
              <div
                key={l._id}
                className={`${COLS} items-center border-b border-[#e6dbcd] px-5 py-3.5 last:border-0`}
              >
                <div>
                  <p className='text-sm font-medium text-[#455a54]'>{l.service}</p>
                  {l.notes && (
                    <p className='line-clamp-1 text-xs text-[#455a54]/60'>{l.notes}</p>
                  )}
                </div>
                <div>
                  <p className='text-sm text-[#455a54]'>{l.customerName}</p>
                  {contactLine(l)}
                </div>
                <div className='text-xs text-[#455a54]'>
                  <p>{l.preferredDate ?? '—'}</p>
                  <p className='text-[#455a54]/60'>
                    {l.quantity ? `${l.quantity} pers.` : ''}
                  </p>
                  <p className='text-[#455a54]/50'>Entró {fmtDate(l.createdAt)}</p>
                </div>
                {sourceBadge(l)}
                {leadBadge(l)}
                {renderLeadActions(l)}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mobile: tarjetas */}
      <div className='flex flex-col gap-3 md:hidden'>
        {loading ? (
          <div className='rounded-xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#455a54]/60'>
            Cargando…
          </div>
        ) : items.length === 0 ? (
          <div className='rounded-xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#455a54]/60'>
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
                  <p className='text-sm font-medium text-[#455a54]'>{l.service}</p>
                  {leadBadge(l)}
                </div>
                {l.notes && (
                  <p className='mt-1 line-clamp-2 text-xs text-[#455a54]/60'>
                    {l.notes}
                  </p>
                )}
                <p className='mt-2 text-sm text-[#455a54]'>{l.customerName}</p>
                {contactLine(l)}
                <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#455a54]/60'>
                  <span>{l.preferredDate ?? 'Sin fecha'}</span>
                  {l.quantity ? <span>{l.quantity} pers.</span> : null}
                  {sourceBadge(l)}
                </div>
                <p className='mt-1 text-xs text-[#455a54]/50'>
                  Entró {fmtDate(l.createdAt)}
                </p>
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
            className='border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
          >
            Anterior
          </Button>
          <span className='text-sm text-[#455a54]/60'>
            {page} / {totalPages}
          </span>
          <Button
            type='button'
            variant='outline'
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className='border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
          >
            Siguiente
          </Button>
        </div>
      )}

      <p className='flex items-center gap-2 text-xs text-[#455a54]/60'>
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
          <span className='font-mono text-[11px] tracking-wider text-[#455a54]/60'>
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
