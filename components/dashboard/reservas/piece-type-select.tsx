'use client';

import { useEffect, useState } from 'react';
import { Check, ListPlus, Pencil, Plus, Tags, Trash2, X } from 'lucide-react';
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
import {
  piecesAdmin,
  type PieceExtraItem,
  type PieceTypeItem,
} from '@/services/pieces.admin.service';
import { PIECE_CATEGORIES, PIECE_TYPES } from '@/lib/piece-catalog';
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
/**
 * Botón a la vista para ver y cambiar con qué adicional viene cada pieza (su
 * categoría), sin tener que encontrarlo dentro del desplegable de piezas.
 */
export function PieceCategoriesButton({ className }: Readonly<{ className?: string }>) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!canManageRole(user?.role)) return null;
  return (
    <>
      <Button
        type='button'
        variant='outline'
        onClick={() => setOpen(true)}
        title='Con qué adicional viene cada pieza'
        className={cn('shrink-0 gap-2 border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]', className)}
      >
        <Tags className='h-4 w-4' />
        <span className='hidden sm:inline'>Categorías de piezas</span>
      </Button>
      {open && <PieceTypesManager onClose={() => setOpen(false)} onRenamed={() => undefined} />}
    </>
  );
}

/**
 * Al cargar una ficha: si la pieza vino con un adicional y lo cambiaron a mano,
 * ofrece dejar ese adicional como el de la pieza para las próximas veces.
 */
export function SaveCategoryHint({
  pieceName,
  extraId,
}: Readonly<{ pieceName: string; extraId: string }>) {
  const { user } = useAuth();
  const types = usePieceTypesStore((st) => st.items);
  const update = usePieceTypesStore((st) => st.update);
  const extras = usePieceExtrasStore((st) => st.items);
  const [busy, setBusy] = useState(false);
  const type = pieceName ? types.find((t) => norm(t.name) === norm(pieceName)) : undefined;
  const chosen = extras.find((x) => x.id === extraId);
  if (!canManageRole(user?.role) || !type || !chosen || type.extraId === extraId) return null;
  const current = type.extraId ? extras.find((x) => x.id === type.extraId)?.name : undefined;

  async function save() {
    if (!type || !chosen) return;
    setBusy(true);
    try {
      await update(type.id, type.name, chosen.id);
      showToast.success(`Listo: ${type.name} ahora viene con «${chosen.name}»`);
    } catch (e) {
      showToast.error(errMsg(e, 'No se pudo guardar'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className='flex flex-col gap-1.5 rounded-lg border border-[#e8b84b]/50 bg-[#fdf6e3] px-2.5 py-2 text-[12px] text-[#5b512f]'>
      <span>
        {current ? (
          <>
            <b>{type.name}</b> viene con «{current}».
          </>
        ) : (
          <>
            <b>{type.name}</b> no tiene adicional guardado.
          </>
        )}{' '}
        ¿Que de ahora en más venga con «{chosen.name}»?
      </span>
      <Button
        type='button'
        size='sm'
        variant='verde'
        disabled={busy}
        onClick={() => void save()}
        className='h-7 w-fit px-2.5 text-[12px]'
      >
        {busy ? 'Guardando…' : 'Sí, guardar para la próxima'}
      </Button>
    </div>
  );
}

function PieceTypesManager({
  onClose,
  onRenamed,
}: {
  onClose: () => void;
  onRenamed: (prev: string, next: string) => void;
}) {
  const { items, create, update, remove } = usePieceTypesStore();
  const reloadTypes = usePieceTypesStore((st) => st.load);
  const extras = usePieceExtrasStore((st) => st.items);
  const reloadExtras = usePieceExtrasStore((st) => st.load);
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

  // Carga el listado completo de la clienta (categorías con precios y piezas
  // con su categoría): crea o actualiza por nombre, no borra nada.
  async function importAll() {
    const ok = await confirm({
      title: 'Cargar catálogo completo',
      description: `Crea o actualiza ${PIECE_CATEGORIES.length} categorías (con sus precios) y ${PIECE_TYPES.length} piezas. Lo que ya existe con el mismo nombre se actualiza; no se borra nada y las fichas cargadas no cambian.`,
      confirmLabel: 'Cargar',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await piecesAdmin.importCatalog({ categories: PIECE_CATEGORIES, types: PIECE_TYPES });
      await Promise.all([reloadTypes(true), reloadExtras(true)]);
      showToast.success(
        `Catálogo cargado: ${r.categoriesCreated} categorías nuevas, ${r.categoriesUpdated} actualizadas · ${r.typesCreated} piezas nuevas, ${r.typesUpdated} actualizadas`,
      );
    } catch (e) {
      showToast.error(errMsg(e, 'No se pudo cargar el catálogo'));
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

        {canManage && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={busy}
            onClick={() => void importAll()}
            className='w-fit gap-1.5 border-[#e6dbcd] text-[#455a54] hover:bg-[#fbf5ef]'
          >
            <ListPlus className='h-4 w-4' />
            Cargar catálogo completo ({PIECE_TYPES.length} piezas)
          </Button>
        )}

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
