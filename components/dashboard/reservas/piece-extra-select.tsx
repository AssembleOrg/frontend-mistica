'use client';

import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { fmtPrice } from '@/lib/reservas-format';
import { usePieceExtrasStore } from '@/stores/piece-extras.store';
import type { PieceExtraItem } from '@/services/pieces.admin.service';
import {
  CatalogCombobox,
  catalogFieldCls as fieldCls,
  errMsg,
  norm,
} from './catalog-combobox';
import { canManageRole } from '@/lib/views';
import { PIECE_MATERIALS } from '@/lib/piece-catalog';

/**
 * Adicional de la pieza (Incluida, Estándar, Premium…): desplegable con
 * búsqueda. El admin gestiona el catálogo (título y monto) desde el botón de
 * al lado; los precios impactan en el total de la reserva.
 */
export function PieceExtraSelect({
  value,
  onChange,
  className,
}: {
  /** id del adicional elegido ('' = ninguno). */
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const { user } = useAuth();
  // Admin o encargado/a: la gestión operativa.
  const canManage = canManageRole(user?.role);
  const { items, loaded, load } = usePieceExtrasStore();
  const [managing, setManaging] = useState<string | null>(null);

  useEffect(() => {
    load().catch(() => showToast.error('No se pudieron cargar los adicionales'));
  }, [load]);

  return (
    <>
      <CatalogCombobox
        options={items.map((x) => ({
          key: x.id,
          label: x.name,
          hint:
            (x.amount > 0 ? `+${fmtPrice(x.amount)}` : 'incluida') +
            (x.addAmount != null ? ` · suma ${fmtPrice(x.addAmount)}` : ''),
        }))}
        selectedKey={value}
        onPick={onChange}
        loaded={loaded}
        placeholder='Elegí la categoría…'
        // Alta rápida: abre el ABM con el título escrito, para cargar el monto.
        onAdd={canManage ? (q) => setManaging(q) : undefined}
        onManage={canManage ? () => setManaging('') : undefined}
        manageLabel='Gestionar categorías'
        emptyText='No hay categorías cargadas.'
        className={className}
      />
      {managing !== null && (
        <PieceExtrasManager
          initialName={managing}
          onClose={() => setManaging(null)}
          onCreated={(x) => onChange(x.id)}
          onRemoved={(id) => id === value && onChange('')}
        />
      )}
    </>
  );
}

/**
 * Alta, edición y baja de categorías de pieza. Cada una tiene el upgrade sobre
 * la pieza incluida (estándar $0, especial +4.000…) y, aparte, lo que se cobra
 * si la pieza se SUMA además de la incluida. Las que no son cerámica (tela,
 * bastidor, yeso…) no piden firma ni colores en la ficha.
 */
function PieceExtrasManager({
  initialName,
  onClose,
  onCreated,
  onRemoved,
}: {
  initialName: string;
  onClose: () => void;
  onCreated: (x: PieceExtraItem) => void;
  onRemoved: (id: string) => void;
}) {
  const { items, create, update, remove } = usePieceExtrasStore();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<ExtraDraft>({ ...EMPTY_DRAFT, name: initialName });
  const [editing, setEditing] = useState<(ExtraDraft & { id: string }) | null>(null);
  const [busy, setBusy] = useState(false);

  const q = norm(search);
  const shown = q ? items.filter((x) => norm(x.name).includes(q)) : items;

  async function add() {
    const input = toInput(draft);
    if (typeof input === 'string') return showToast.error(input);
    setBusy(true);
    try {
      const x = await create(input);
      setDraft(EMPTY_DRAFT);
      // Si se abrió desde "Agregar …" del desplegable, queda elegido.
      if (initialName) {
        onCreated(x);
        onClose();
      }
    } catch (e) {
      showToast.error(errMsg(e, 'No se pudo agregar'));
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const input = toInput(editing);
    if (typeof input === 'string') return showToast.error(input);
    setBusy(true);
    try {
      await update(editing.id, input);
      setEditing(null);
    } catch (e) {
      showToast.error(errMsg(e, 'No se pudo guardar'));
    } finally {
      setBusy(false);
    }
  }

  async function del(x: PieceExtraItem) {
    const ok = await confirm({
      title: 'Borrar categoría',
      description: `"${x.name}" deja de aparecer para elegir. Lo ya cargado en reservas no cambia.`,
      confirmLabel: 'Borrar',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await remove(x.id);
      onRemoved(x.id);
      showToast.success(`"${x.name}" borrada`);
    } catch (e) {
      showToast.error(errMsg(e, 'No se pudo borrar'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader className='text-left'>
          <DialogTitle className='font-tan-nimbus text-xl text-[#455a54]'>
            Categorías de pieza
          </DialogTitle>
          <DialogDescription>
            <strong>Sobre la incluida</strong>: lo que se paga por cambiar la pieza
            de la entrada (estándar $0, especial +$4.000…). <strong>Si se suma</strong>:
            lo que se cobra por una pieza además de la incluida. Con 2x1 se eligen
            dos piezas para una sola ficha.
          </DialogDescription>
        </DialogHeader>

        <form
          className='rounded-xl border border-[#e6dbcd] bg-[#fbf5ef]/60 p-2.5'
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <ExtraFields value={draft} onChange={setDraft} autoFocusName={!initialName} />
          <div className='mt-2 flex justify-end'>
            <Button type='submit' variant='verde' size='sm' disabled={busy} className='gap-1.5'>
              <Plus className='h-4 w-4' />
              Agregar categoría
            </Button>
          </div>
        </form>

        {items.length > 8 && (
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Buscar…'
            className={fieldCls}
          />
        )}

        <div className='max-h-[45vh] overflow-y-auto rounded-xl border border-[#e6dbcd]'>
          {shown.length === 0 ? (
            <p className='p-4 text-sm text-[#7a6e6f]'>
              {items.length === 0 ? 'Todavía no hay categorías.' : 'Sin resultados.'}
            </p>
          ) : (
            shown.map((x) => (
              <div key={x.id} className='border-b border-[#e6dbcd] px-3 py-2 last:border-0'>
                {editing?.id === x.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void saveEdit();
                    }}
                  >
                    <ExtraFields value={editing} onChange={(v) => setEditing({ ...v, id: x.id })} autoFocusName />
                    <div className='mt-2 flex justify-end gap-1'>
                      <Button type='button' size='sm' variant='ghost' onClick={() => setEditing(null)} className='text-[#7a6e6f]'>
                        <X className='mr-1 h-4 w-4' /> Cancelar
                      </Button>
                      <Button type='submit' size='sm' variant='verde' disabled={busy}>
                        <Check className='mr-1 h-4 w-4' /> Guardar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className='flex items-center gap-2'>
                    <span className='min-w-0 flex-1'>
                      <span className='flex items-center gap-1.5'>
                        <span className='truncate text-sm text-[#3d3338]'>{x.name}</span>
                        {x.pair && (
                          <span title='Se eligen dos piezas para una sola ficha' className='rounded-full bg-[#f4ead9] px-2 py-0.5 text-[10px] font-semibold text-[#9d684e]'>
                            2x1
                          </span>
                        )}
                        {x.material && (
                          <span title='No es cerámica: sin firma ni colores' className='rounded-full bg-[#E7F0EC] px-2 py-0.5 text-[10px] font-semibold text-[#455a54]'>
                            {x.material}
                          </span>
                        )}
                      </span>
                      <span className='block text-[11px] text-[#7a6e6f]'>
                        {x.amount > 0 ? `+${fmtPrice(x.amount)} sobre la incluida` : 'Incluida en la entrada'}
                        {x.addAmount != null && ` · si se suma ${fmtPrice(x.addAmount)}`}
                      </span>
                    </span>
                    <Button
                      type='button'
                      size='icon'
                      variant='ghost'
                      disabled={busy}
                      onClick={() => setEditing({ id: x.id, ...draftOf(x) })}
                      aria-label={`Editar ${x.name}`}
                      className='size-8 text-[#455a54]'
                    >
                      <Pencil className='h-4 w-4' />
                    </Button>
                    <Button
                      type='button'
                      size='icon'
                      variant='ghost'
                      disabled={busy}
                      onClick={() => void del(x)}
                      aria-label={`Borrar ${x.name}`}
                      className='size-8 text-[#a33]'
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type ExtraDraft = {
  name: string;
  amount: string;
  addAmount: string;
  pair: boolean;
  material: string;
};

const EMPTY_DRAFT: ExtraDraft = { name: '', amount: '', addAmount: '', pair: false, material: '' };

function draftOf(x: PieceExtraItem): ExtraDraft {
  return {
    name: x.name,
    amount: String(x.amount),
    addAmount: x.addAmount != null ? String(x.addAmount) : '',
    pair: !!x.pair,
    material: x.material ?? '',
  };
}

/** Valida el borrador; devuelve el mensaje de error o lo que se guarda. */
function toInput(d: ExtraDraft) {
  const num = (v: string) => {
    const n = Number(v);
    return v.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null;
  };
  if (!d.name.trim()) return 'Poné un título';
  const amount = num(d.amount);
  if (amount == null) return 'Poné el monto sobre la incluida (0 si viene incluida)';
  const addAmount = d.addAmount.trim() === '' ? undefined : num(d.addAmount);
  if (addAmount === null) return 'El monto "si se suma" no es válido';
  return {
    name: d.name.trim(),
    amount,
    pair: d.pair,
    ...(addAmount !== undefined && { addAmount }),
    material: d.material,
  };
}

/** Campos de una categoría: título, montos, material y 2x1. */
function ExtraFields({
  value: d,
  onChange,
  autoFocusName,
}: {
  value: ExtraDraft;
  onChange: (d: ExtraDraft) => void;
  autoFocusName?: boolean;
}) {
  return (
    <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
      <Input
        value={d.name}
        onChange={(e) => onChange({ ...d, name: e.target.value })}
        placeholder='Título (ej. Premium)'
        autoFocus={autoFocusName}
        className={cn('col-span-2', fieldCls)}
      />
      <label className='flex flex-col gap-0.5 text-[11px] text-[#7a6e6f]'>
        Sobre la incluida
        <Input
          type='number'
          inputMode='decimal'
          min={0}
          value={d.amount}
          onChange={(e) => onChange({ ...d, amount: e.target.value })}
          placeholder='0'
          className={cn('h-9', fieldCls)}
        />
      </label>
      <label className='flex flex-col gap-0.5 text-[11px] text-[#7a6e6f]'>
        Si se suma
        <Input
          type='number'
          inputMode='decimal'
          min={0}
          value={d.addAmount}
          onChange={(e) => onChange({ ...d, addAmount: e.target.value })}
          placeholder='igual'
          className={cn('h-9', fieldCls)}
        />
      </label>
      <select
        value={d.material}
        onChange={(e) => onChange({ ...d, material: e.target.value })}
        aria-label='Material'
        className={cn('col-span-1 h-9 rounded-md border px-2 text-sm sm:col-span-2', fieldCls)}
      >
        <option value=''>Cerámica (firma y colores)</option>
        {PIECE_MATERIALS.map((m) => (
          <option key={m} value={m}>
            {m} (sin firma ni colores)
          </option>
        ))}
      </select>
      <div className='flex items-center'>
        <PairToggle on={d.pair} onChange={(pair) => onChange({ ...d, pair })} />
      </div>
    </div>
  );
}

/** 2x1: la categoría pide dos piezas para una sola ficha. */
function PairToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type='button'
      onClick={() => onChange(!on)}
      title='2x1: se eligen dos piezas que van en una sola ficha'
      aria-pressed={on}
      className={cn(
        'h-8 shrink-0 rounded-lg border px-2 text-xs font-semibold transition-colors',
        on
          ? 'border-[#9d684e] bg-[#9d684e] text-white'
          : 'border-[#e6dbcd] bg-white text-[#9d684e] hover:bg-[#fbf5ef]',
      )}
    >
      2x1
    </button>
  );
}
