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
  const isAdmin = user?.role === 'admin';
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
          hint: fmtPrice(x.amount),
        }))}
        selectedKey={value}
        onPick={onChange}
        loaded={loaded}
        placeholder='Elegí el adicional…'
        // Alta rápida: abre el ABM con el título escrito, para cargar el monto.
        onAdd={isAdmin ? (q) => setManaging(q) : undefined}
        onManage={isAdmin ? () => setManaging('') : undefined}
        manageLabel='Gestionar adicionales'
        emptyText='No hay adicionales cargados.'
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

/** Alta, edición y baja de adicionales (título + monto; baja con confirmación). */
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
  const [name, setName] = useState(initialName);
  const [amount, setAmount] = useState('');
  const [editing, setEditing] = useState<{
    id: string;
    name: string;
    amount: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const q = norm(search);
  const shown = q ? items.filter((x) => norm(x.name).includes(q)) : items;

  const parse = (v: string) => {
    const n = Number(v);
    return v.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null;
  };

  async function add() {
    const value = parse(amount);
    if (!name.trim()) return showToast.error('Poné un título');
    if (value == null) return showToast.error('Poné un monto válido');
    setBusy(true);
    try {
      const x = await create({ name, amount: value });
      setName('');
      setAmount('');
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

  async function saveEdit(x: PieceExtraItem) {
    if (!editing) return;
    const value = parse(editing.amount);
    if (!editing.name.trim()) return showToast.error('Poné un título');
    if (value == null) return showToast.error('Poné un monto válido');
    setBusy(true);
    try {
      await update(x.id, { name: editing.name, amount: value });
      setEditing(null);
    } catch (e) {
      showToast.error(errMsg(e, 'No se pudo guardar'));
    } finally {
      setBusy(false);
    }
  }

  async function del(x: PieceExtraItem) {
    const ok = await confirm({
      title: 'Borrar adicional',
      description: `"${x.name}" (${fmtPrice(x.amount)}) deja de aparecer para elegir. Lo ya cargado en reservas no cambia.`,
      confirmLabel: 'Borrar',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await remove(x.id);
      onRemoved(x.id);
      showToast.success(`"${x.name}" borrado`);
    } catch (e) {
      showToast.error(errMsg(e, 'No se pudo borrar'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader className='text-left'>
          <DialogTitle className='font-tan-nimbus text-xl text-[#455a54]'>
            Adicionales de pieza
          </DialogTitle>
          <DialogDescription>
            El monto del adicional elegido se suma al total de la reserva.
          </DialogDescription>
        </DialogHeader>

        <form
          className='flex gap-2'
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Título (ej. Premium)'
            autoFocus={!initialName}
            className={fieldCls}
          />
          <Input
            type='number'
            inputMode='decimal'
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder='Monto'
            autoFocus={!!initialName}
            className={cn('w-28 shrink-0', fieldCls)}
          />
          <Button
            type='submit'
            variant='verde'
            size='icon'
            disabled={busy}
            aria-label='Agregar adicional'
            className='shrink-0'
          >
            <Plus className='h-4 w-4' />
          </Button>
        </form>

        {items.length > 8 && (
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Buscar…'
            className={fieldCls}
          />
        )}

        <div className='max-h-[50vh] overflow-y-auto rounded-xl border border-[#e6dbcd]'>
          {shown.length === 0 ? (
            <p className='p-4 text-sm text-[#7a6e6f]'>
              {items.length === 0 ? 'Todavía no hay adicionales.' : 'Sin resultados.'}
            </p>
          ) : (
            shown.map((x) => (
              <div
                key={x.id}
                className='flex items-center gap-2 border-b border-[#e6dbcd] px-3 py-2 last:border-0'
              >
                {editing?.id === x.id ? (
                  <form
                    className='flex flex-1 items-center gap-2'
                    onSubmit={(e) => {
                      e.preventDefault();
                      void saveEdit(x);
                    }}
                  >
                    <Input
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      autoFocus
                      className={cn('h-8', fieldCls)}
                    />
                    <Input
                      type='number'
                      inputMode='decimal'
                      min={0}
                      value={editing.amount}
                      onChange={(e) => setEditing({ ...editing, amount: e.target.value })}
                      className={cn('h-8 w-24 shrink-0', fieldCls)}
                    />
                    <Button type='submit' size='icon' variant='ghost' disabled={busy} aria-label='Guardar' className='size-8 shrink-0 text-[#455a54]'>
                      <Check className='h-4 w-4' />
                    </Button>
                    <Button type='button' size='icon' variant='ghost' onClick={() => setEditing(null)} aria-label='Cancelar' className='size-8 shrink-0 text-[#7a6e6f]'>
                      <X className='h-4 w-4' />
                    </Button>
                  </form>
                ) : (
                  <>
                    <span className='flex-1 truncate text-sm text-[#3d3338]'>{x.name}</span>
                    <span className='text-sm font-medium text-[#455a54]'>{fmtPrice(x.amount)}</span>
                    <Button
                      type='button'
                      size='icon'
                      variant='ghost'
                      disabled={busy}
                      onClick={() => setEditing({ id: x.id, name: x.name, amount: String(x.amount) })}
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
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
