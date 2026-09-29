'use client';

import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showToast } from '@/lib/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  egressesService,
  type EgressCategory,
} from '@/services/egresses.service';

const PALETTE = [
  '#455a54', '#5a7d9a', '#8a6d9a', '#9d684e', '#c2803d', '#6d8f5a',
  '#a34d4d', '#7a6e6f',
];

/**
 * CRUD de categorías de egreso (Sueldos, Servicios, Impuestos…). Renombrar o
 * borrar una categoría NO toca los egresos ya cargados: conservan el nombre
 * con el que se registraron.
 */
export function ManageEgressCategoriesDialog({
  open,
  onOpenChange,
  onChanged,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}>) {
  const confirm = useConfirm();
  const [categories, setCategories] = useState<EgressCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  // Alta
  const [draftName, setDraftName] = useState('');
  const [draftColor, setDraftColor] = useState(PALETTE[0]);
  // Edición inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(PALETTE[0]);

  async function load() {
    setLoading(true);
    try {
      const res = await egressesService.listCategories();
      setCategories(res.data ?? []);
    } catch {
      showToast.error('No se pudieron cargar las categorías');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      setEditingId(null);
      setDraftName('');
      load();
    }
  }, [open]);

  async function create() {
    if (!draftName.trim()) return;
    setBusy(true);
    try {
      await egressesService.createCategory({
        name: draftName.trim(),
        color: draftColor,
      });
      setDraftName('');
      await load();
      onChanged?.();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo crear');
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return;
    setBusy(true);
    try {
      await egressesService.updateCategory(editingId, {
        name: editName.trim(),
        color: editColor,
      });
      setEditingId(null);
      await load();
      onChanged?.();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  }

  async function remove(cat: EgressCategory) {
    if (!(await confirm({ title: `¿Eliminar la categoría ${cat.name}?`, description: 'Los egresos ya cargados la conservan.' }))) return;
    setBusy(true);
    try {
      await egressesService.removeCategory(cat._id);
      await load();
      onChanged?.();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo eliminar');
    } finally {
      setBusy(false);
    }
  }

  function colorPicker(value: string, onPick: (c: string) => void) {
    return (
      <div className='flex flex-wrap items-center gap-1.5'>
        {PALETTE.map((c) => (
          <button
            key={c}
            type='button'
            onClick={() => onPick(c)}
            className={`h-5 w-5 rounded-full border-2 transition ${
              value === c ? 'scale-110 border-[#3d3338]' : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] max-w-[95vw] sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Categorías de egreso</DialogTitle>
          <DialogDescription>
            Clasificá los gastos (sueldos, servicios, impuestos…). Renombrar o
            eliminar una categoría no cambia los egresos ya registrados.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-2 py-1 max-h-[45vh] overflow-y-auto pr-1'>
          {loading ? (
            <p className='text-sm text-[#7a6e6f]'>Cargando…</p>
          ) : (
            categories.map((cat) =>
              editingId === cat._id ? (
                <div
                  key={cat._id}
                  className='space-y-2 rounded-lg border border-[#9d684e]/40 bg-[#fbf5ef]/60 p-2.5'
                >
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className='h-8 text-sm'
                  />
                  {colorPicker(editColor, setEditColor)}
                  <div className='flex justify-end gap-1.5'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => setEditingId(null)}
                      className='h-7 px-2 text-xs'
                    >
                      <X className='h-3.5 w-3.5' />
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      onClick={saveEdit}
                      disabled={busy || !editName.trim()}
                      className='h-7 bg-[#455a54] px-2.5 text-xs text-white hover:bg-[#455a54]/90'
                    >
                      <Check className='h-3.5 w-3.5' />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={cat._id}
                  className='flex items-center gap-2.5 rounded-lg border border-[#e6dbcd] bg-white px-3 py-2'
                >
                  <span
                    className='h-3 w-3 shrink-0 rounded-full'
                    style={{ backgroundColor: cat.color ?? '#9d684e' }}
                  />
                  <span className='min-w-0 flex-1 truncate text-sm text-[#3d3338]'>
                    {cat.name}
                  </span>
                  <button
                    type='button'
                    title='Renombrar'
                    onClick={() => {
                      setEditingId(cat._id);
                      setEditName(cat.name);
                      setEditColor(cat.color ?? PALETTE[0]);
                    }}
                    className='text-[#455a54] hover:opacity-70'
                  >
                    <Pencil className='h-4 w-4' />
                  </button>
                  <button
                    type='button'
                    title='Eliminar'
                    onClick={() => remove(cat)}
                    disabled={busy}
                    className='text-[#a33] hover:opacity-70'
                  >
                    <Trash2 className='h-4 w-4' />
                  </button>
                </div>
              ),
            )
          )}
        </div>

        <div className='space-y-2 rounded-lg border border-dashed border-[#c9bfb0] p-2.5'>
          <div className='flex gap-2'>
            <Input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') create();
              }}
              placeholder='Nueva categoría…'
              className='h-8 text-sm'
            />
            <Button
              type='button'
              size='sm'
              onClick={create}
              disabled={busy || !draftName.trim()}
              className='h-8 shrink-0 gap-1 bg-[#9d684e] px-2.5 text-xs text-white hover:bg-[#9d684e]/90'
            >
              <Plus className='h-3.5 w-3.5' />
              Agregar
            </Button>
          </div>
          {colorPicker(draftColor, setDraftColor)}
        </div>
      </DialogContent>
    </Dialog>
  );
}
