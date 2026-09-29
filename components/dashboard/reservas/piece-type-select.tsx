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
import { cn } from '@/lib/utils';
import { usePieceTypesStore } from '@/stores/piece-types.store';
import type { PieceTypeItem } from '@/services/pieces.admin.service';
import {
  CatalogCombobox,
  catalogFieldCls as fieldCls,
  errMsg,
  norm,
} from './catalog-combobox';

/**
 * "Pieza elegida": desplegable del catálogo con búsqueda en memoria. Si lo que
 * se escribe no está, se agrega al catálogo desde el mismo desplegable. El
 * botón de al lado abre la gestión del catálogo (alta, edición y baja).
 */
export function PieceTypeSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (name: string) => void;
  className?: string;
}) {
  const { items, loaded, load, create } = usePieceTypesStore();
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    load().catch(() => showToast.error('No se pudo cargar el catálogo de piezas'));
  }, [load]);

  async function add(name: string) {
    try {
      const t = await create(name);
      onChange(t.name);
      showToast.success(`"${t.name}" agregada al catálogo`);
    } catch (e) {
      showToast.error(errMsg(e, 'No se pudo agregar'));
    }
  }

  return (
    <>
      <CatalogCombobox
        options={items.map((t) => ({ key: t.name, label: t.name }))}
        selectedKey={value}
        onPick={onChange}
        loaded={loaded}
        placeholder='Elegí la pieza…'
        fallbackLabel={value}
        onAdd={add}
        onManage={() => setManaging(true)}
        manageLabel='Gestionar catálogo de piezas'
        emptyText='El catálogo está vacío. Escribí una pieza para agregarla.'
        className={className}
      />
      {managing && (
        <PieceTypesManager
          onClose={() => setManaging(false)}
          onRenamed={(prev, next) => prev === value && onChange(next)}
        />
      )}
    </>
  );
}

/** Alta, edición y baja del catálogo de piezas (baja con confirmación). */
function PieceTypesManager({
  onClose,
  onRenamed,
}: {
  onClose: () => void;
  onRenamed: (prev: string, next: string) => void;
}) {
  const { items, create, update, remove } = usePieceTypesStore();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const q = norm(search);
  const shown = q ? items.filter((t) => norm(t.name).includes(q)) : items;

  async function add() {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await create(newName);
      setNewName('');
    } catch (e) {
      showToast.error(errMsg(e, 'No se pudo agregar'));
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(t: PieceTypeItem) {
    if (!editing || !editing.name.trim()) return;
    if (editing.name.trim() === t.name) return setEditing(null);
    setBusy(true);
    try {
      const saved = await update(t.id, editing.name);
      onRenamed(t.name, saved.name);
      setEditing(null);
    } catch (e) {
      showToast.error(errMsg(e, 'No se pudo guardar'));
    } finally {
      setBusy(false);
    }
  }

  async function del(t: PieceTypeItem) {
    const ok = await confirm({
      title: 'Borrar pieza del catálogo',
      description: `"${t.name}" deja de aparecer en el selector. Las fichas ya cargadas con esa pieza no cambian.`,
      confirmLabel: 'Borrar',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await remove(t.id);
      showToast.success(`"${t.name}" borrada del catálogo`);
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
            Catálogo de piezas
          </DialogTitle>
          <DialogDescription>
            Las opciones de &quot;Pieza elegida&quot; al registrar fichas.
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
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder='Nueva pieza (ej. taza)'
            className={fieldCls}
          />
          <Button type='submit' variant='verde' disabled={busy || !newName.trim()} className='shrink-0 gap-1.5'>
            <Plus className='h-4 w-4' />
            Agregar
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
              {items.length === 0 ? 'Todavía no hay piezas cargadas.' : 'Sin resultados.'}
            </p>
          ) : (
            shown.map((t) => (
              <div
                key={t.id}
                className='flex items-center gap-2 border-b border-[#e6dbcd] px-3 py-2 last:border-0'
              >
                {editing?.id === t.id ? (
                  <>
                    <Input
                      value={editing.name}
                      onChange={(e) => setEditing({ id: t.id, name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void saveEdit(t);
                        } else if (e.key === 'Escape') {
                          e.stopPropagation();
                          setEditing(null);
                        }
                      }}
                      autoFocus
                      className={cn('h-8', fieldCls)}
                    />
                    <Button type='button' size='icon' variant='ghost' disabled={busy} onClick={() => void saveEdit(t)} aria-label='Guardar' className='size-8 text-[#455a54]'>
                      <Check className='h-4 w-4' />
                    </Button>
                    <Button type='button' size='icon' variant='ghost' onClick={() => setEditing(null)} aria-label='Cancelar' className='size-8 text-[#7a6e6f]'>
                      <X className='h-4 w-4' />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className='flex-1 truncate text-sm text-[#3d3338]'>{t.name}</span>
                    <Button type='button' size='icon' variant='ghost' disabled={busy} onClick={() => setEditing({ id: t.id, name: t.name })} aria-label={`Editar ${t.name}`} className='size-8 text-[#455a54]'>
                      <Pencil className='h-4 w-4' />
                    </Button>
                    <Button type='button' size='icon' variant='ghost' disabled={busy} onClick={() => void del(t)} aria-label={`Borrar ${t.name}`} className='size-8 text-[#a33]'>
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
