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
import { usePieceExtrasStore } from '@/stores/piece-extras.store';
import { useAuth } from '@/hooks/useAuth';
import { canManageRole } from '@/lib/views';
import type { PieceExtraItem, PieceTypeItem } from '@/services/pieces.admin.service';
import {
  CatalogCombobox,
  catalogFieldCls as fieldCls,
  errMsg,
  norm,
} from './catalog-combobox';

/**
 * Categoría de cada pieza del catálogo (su adicional), para proponerla al
 * elegir la pieza.
 */
export function usePieceCategories() {
  const types = usePieceTypesStore((st) => st.items);
  const loadTypes = usePieceTypesStore((st) => st.load);
  const extras = usePieceExtrasStore((st) => st.items);
  const loadExtras = usePieceExtrasStore((st) => st.load);
  useEffect(() => {
    loadTypes().catch(() => undefined);
    loadExtras().catch(() => undefined);
  }, [loadTypes, loadExtras]);
  /** Pieza del catálogo por nombre y su categoría (si tiene). */
  return (name: string): { type?: PieceTypeItem; category?: PieceExtraItem } => {
    const type = types.find((t) => norm(t.name) === norm(name));
    const category = type?.extraId
      ? extras.find((x) => x.id === type.extraId)
      : undefined;
    return { type, category };
  };
}

/**
 * "Pieza elegida": desplegable del catálogo con búsqueda en memoria. Si lo que
 * se escribe no está, se agrega al catálogo desde el mismo desplegable. El
 * botón de al lado abre la gestión del catálogo (alta, edición y baja). Cada
 * pieza muestra su categoría.
 */
export function PieceTypeSelect({
  value,
  onChange,
  only,
  placeholder = 'Elegí la pieza…',
  manage = true,
  className,
}: {
  value: string;
  onChange: (name: string) => void;
  /** Sólo las piezas que cumplen (p. ej. las de la misma categoría 2x1). */
  only?: (t: PieceTypeItem) => boolean;
  placeholder?: string;
  /** Muestra el botón de gestión del catálogo (no en una fila de planilla). */
  manage?: boolean;
  className?: string;
}) {
  const { items, loaded, load, create } = usePieceTypesStore();
  const extras = usePieceExtrasStore((st) => st.items);
  const loadExtras = usePieceExtrasStore((st) => st.load);
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    load().catch(() => showToast.error('No se pudo cargar el catálogo de piezas'));
    loadExtras().catch(() => undefined);
  }, [load, loadExtras]);

  const categoryName = (t: PieceTypeItem) =>
    t.extraId ? extras.find((x) => x.id === t.extraId)?.name : undefined;

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
        options={(only ? items.filter(only) : items).map((t) => ({
          key: t.name,
          label: t.name,
          hint: categoryName(t),
        }))}
        selectedKey={value}
        onPick={onChange}
        loaded={loaded}
        placeholder={placeholder}
        fallbackLabel={value}
        onAdd={add}
        onManage={manage ? () => setManaging(true) : undefined}
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
  const extras = usePieceExtrasStore((st) => st.items);
  const { user } = useAuth();
  // La categoría define el adicional que se cobra: la pone admin/encargado.
  const canManage = canManageRole(user?.role);
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

  async function setCategory(t: PieceTypeItem, extraId: string) {
    setBusy(true);
    try {
      await update(t.id, t.name, extraId);
    } catch (e) {
      showToast.error(errMsg(e, 'No se pudo guardar la categoría'));
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
            Las opciones de &quot;Pieza elegida&quot; al registrar fichas y en
            la pieza del mes de los alumnos. La categoría define el adicional.
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
                    {canManage ? (
                      <select
                        value={t.extraId ?? ''}
                        onChange={(e) => void setCategory(t, e.target.value)}
                        disabled={busy}
                        aria-label={`Categoría de ${t.name}`}
                        className={cn('h-8 max-w-[9rem] rounded-md border px-1.5 text-xs', fieldCls)}
                      >
                        <option value=''>Sin categoría</option>
                        {extras.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      t.extraId && (
                        <span className='text-xs text-[#7a6e6f]'>
                          {extras.find((x) => x.id === t.extraId)?.name}
                        </span>
                      )
                    )}
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
