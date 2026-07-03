'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  piecesAdmin,
  PIECE_STATUS_LABEL,
  PIECE_STATUS_ORDER,
  type PieceItem,
  type PieceStatus,
  type CreatePieceInput,
} from '@/services/pieces.admin.service';

const FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'Todas' },
  ...PIECE_STATUS_ORDER.map((s) => ({ key: s, label: PIECE_STATUS_LABEL[s] })),
];

// Verde para lista/retirada, terracota para las etapas en proceso.
const DONE: PieceStatus[] = ['LISTA', 'RETIRADA'];
const dotColor = (s: PieceStatus) => (DONE.includes(s) ? '#455a54' : '#cc844a');

const COLS = 'grid grid-cols-[1.6fr_1.6fr_4rem_13rem_5rem] gap-3';
const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

export function PiezasTab() {
  const [items, setItems] = useState<PieceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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
      const res = await piecesAdmin.list({
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

  async function changeStatus(p: PieceItem, next: PieceStatus) {
    if (next === p.status) return;
    setBusy(p._id);
    try {
      await piecesAdmin.update(p._id, { status: next });
      showToast.success(
        next === 'LISTA'
          ? 'Pieza lista — se avisó al cliente'
          : 'Estado actualizado',
      );
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setBusy(null);
    }
  }

  async function remove(p: PieceItem) {
    if (!confirm('¿Eliminar este registro de pieza?')) return;
    setBusy(p._id);
    try {
      await piecesAdmin.remove(p._id);
      showToast.success('Pieza eliminada');
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo eliminar');
    } finally {
      setBusy(null);
    }
  }

  function statusSelect(p: PieceItem) {
    return (
      <Select
        value={p.status}
        onValueChange={(v) => changeStatus(p, v as PieceStatus)}
        disabled={busy === p._id}
      >
        <SelectTrigger className={cn('h-8', fieldCls)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PIECE_STATUS_ORDER.map((s) => (
            <SelectItem key={s} value={s}>
              {PIECE_STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
                  ? 'border-[#455a54] text-[#455a54]'
                  : 'border-transparent text-[#455a54]/60 hover:text-[#455a54]',
              )}
            >
              {f.label}
            </button>
          );
        })}
        <div className='flex w-full items-center gap-2 sm:ml-auto sm:w-auto'>
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder='Buscar por nombre, teléfono o experiencia'
            className={cn('h-9 w-full rounded-full sm:w-72', fieldCls)}
          />
          <Button
            type='button'
            variant='terracota'
            onClick={() => setCreating(true)}
            className='shrink-0 font-mono text-xs tracking-wider'
          >
            <Plus className='h-4 w-4' /> NUEVA
          </Button>
        </div>
      </div>

      {/* Desktop: tabla */}
      <div className='hidden overflow-x-auto rounded-xl border border-[#e6dbcd] bg-white md:block'>
        <div className='min-w-[48rem]'>
          <div className={`${COLS} border-b border-[#e6dbcd] bg-[#fbf5ef] px-5 py-3 font-mono text-[11px] tracking-wider text-[#455a54]/60`}>
            <span>CLIENTE</span>
            <span>EXPERIENCIA</span>
            <span>CANT.</span>
            <span>ESTADO</span>
            <span className='text-right'>ACCIÓN</span>
          </div>
          {loading ? (
            <div className='p-6 text-sm text-[#455a54]/60'>Cargando…</div>
          ) : items.length === 0 ? (
            <div className='p-6 text-sm text-[#455a54]/60'>
              {search ? `Sin resultados para “${search}”.` : 'Sin piezas cargadas.'}
            </div>
          ) : (
            items.map((p) => (
              <div
                key={p._id}
                className={`${COLS} items-center border-b border-[#e6dbcd] px-5 py-3.5 last:border-0`}
              >
                <div>
                  <p className='text-sm font-medium text-[#455a54]'>
                    {p.customerName || 'Sin nombre'}
                  </p>
                  <p className='font-mono text-xs text-[#455a54]/60'>
                    {p.customerPhone}
                  </p>
                </div>
                <span className='text-sm text-[#455a54]'>
                  {p.experienceName || '—'}
                </span>
                <span className='text-sm text-[#455a54]'>{p.quantity}</span>
                <div className='flex items-center gap-2'>
                  <span
                    className='h-1.5 w-1.5 shrink-0 rounded-full'
                    style={{ backgroundColor: dotColor(p.status) }}
                  />
                  {statusSelect(p)}
                </div>
                <div className='flex justify-end'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    disabled={busy === p._id}
                    onClick={() => remove(p)}
                    title='Eliminar'
                    className='size-8 text-[#455a54]/60 hover:bg-red-50 hover:text-[#b23b2e]'
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
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
            {search ? `Sin resultados para “${search}”.` : 'Sin piezas cargadas.'}
          </div>
        ) : (
          items.map((p) => (
            <div
              key={p._id}
              className='rounded-xl border border-[#e6dbcd] bg-white p-4'
            >
              <div className='flex items-start justify-between gap-2'>
                <div>
                  <p className='text-sm font-medium text-[#455a54]'>
                    {p.customerName || 'Sin nombre'}
                  </p>
                  <p className='font-mono text-xs text-[#455a54]/60'>
                    {p.customerPhone}
                  </p>
                </div>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  disabled={busy === p._id}
                  onClick={() => remove(p)}
                  title='Eliminar'
                  className='size-8 text-[#455a54]/60 hover:bg-red-50 hover:text-[#b23b2e]'
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>
              <p className='mt-1 text-sm text-[#455a54]'>
                {p.experienceName || '—'}{' '}
                <span className='text-[#455a54]/60'>· {p.quantity} pieza(s)</span>
              </p>
              <div className='mt-3'>{statusSelect(p)}</div>
            </div>
          ))
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

      {creating && (
        <NewPieceModal
          onClose={() => setCreating(false)}
          onDone={async () => {
            setCreating(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function NewPieceModal({
  onClose,
  onDone,
}: Readonly<{ onClose: () => void; onDone: () => void | Promise<void> }>) {
  const [form, setForm] = useState<CreatePieceInput>({
    customerPhone: '',
    customerName: '',
    experienceName: '',
    quantity: 1,
    status: 'SECADO',
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.customerPhone.trim()) {
      showToast.error('El teléfono es obligatorio');
      return;
    }
    setSaving(true);
    try {
      await piecesAdmin.create(form);
      showToast.success('Pieza cargada');
      await onDone();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader className='text-left'>
          <DialogTitle className='font-tan-nimbus text-xl text-[#455a54]'>
            Nueva pieza
          </DialogTitle>
        </DialogHeader>

        <div className='flex flex-col gap-3'>
          <Field label='Teléfono del cliente'>
            <Input
              value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
              placeholder='549113...'
              className={fieldCls}
            />
          </Field>
          <Field label='Nombre'>
            <Input
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              className={fieldCls}
            />
          </Field>
          <Field label='Experiencia'>
            <Input
              value={form.experienceName}
              onChange={(e) =>
                setForm({ ...form, experienceName: e.target.value })
              }
              placeholder='Arte & Degustación'
              className={fieldCls}
            />
          </Field>
          <div className='grid grid-cols-2 gap-3'>
            <Field label='Cantidad'>
              <Input
                type='number'
                min={1}
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: Number(e.target.value) })
                }
                className={fieldCls}
              />
            </Field>
            <Field label='Estado inicial'>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as PieceStatus })
                }
              >
                <SelectTrigger className={fieldCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIECE_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PIECE_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
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
            {saving ? 'Guardando…' : 'Cargar pieza'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className='flex flex-col gap-1.5'>
      <span className='font-mono text-[11px] tracking-wider text-[#455a54]/60'>
        {label.toUpperCase()}
      </span>
      {children}
    </div>
  );
}
