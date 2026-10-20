'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Palette, Plus, Trash2 } from 'lucide-react';
import { create } from 'zustand';
import { PopoverPortal } from '@/components/ui/popover-portal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { canManageRole } from '@/lib/views';
import { piecesAdmin, type PieceColor } from '@/services/pieces.admin.service';
import { catalogFieldCls, norm } from './catalog-combobox';
import { errorText } from '@/lib/api-error-messages';

/** Paleta del taller mientras carga la del servidor (la editable). */
export const COLOR_GROUPS: PieceColor[][] = [
  [
    { name: 'Rosa Clarito', hex: '#f6c9d4' },
    { name: 'Marrón Clarito', hex: '#c9a27e' },
    { name: 'Rojo Clarito', hex: '#e98b84' },
    { name: 'Agua Clarito', hex: '#a9dcd6' },
    { name: 'Oscuro', hex: '#3b3b3b' },
  ],
  [
    { name: 'Marrón', hex: '#8b5a3c' },
    { name: 'Naranja', hex: '#f08a3c' },
    { name: 'Verde Lima', hex: '#b5d33d' },
    { name: 'Violeta', hex: '#8a5cb8' },
    { name: 'Marrón Oscuro', hex: '#5a3825' },
  ],
  [
    { name: 'Agua', hex: '#5ec4c0' },
    { name: 'Turquesa/Celeste', hex: '#40b5d8' },
    { name: 'Azul', hex: '#2f5fb3' },
    { name: 'Rojo', hex: '#d0342c' },
    { name: 'Amarillo', hex: '#f5d03b' },
    { name: 'Verde Pasto', hex: '#4c9a3a' },
    { name: 'Verde Menta', hex: '#9fe0c0' },
  ],
  [
    { name: 'Mostaza', hex: '#d4a32a' },
    { name: 'Arena', hex: '#e3cfa8' },
    { name: 'Negro', hex: '#1a1a1a' },
    { name: 'Gris', hex: '#9a9a9a' },
    { name: 'Rosa', hex: '#ef7fa6' },
    { name: 'Lila', hex: '#c4a7e0' },
  ],
];

interface PieceColorsState {
  groups: PieceColor[][];
  loaded: boolean;
  /** Carga una vez (la comparten todas las fichas abiertas). */
  load: () => Promise<void>;
  save: (groups: PieceColor[][]) => Promise<void>;
}

let inflight: Promise<void> | null = null;

export const usePieceColorsStore = create<PieceColorsState>((set, get) => ({
  groups: COLOR_GROUPS,
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    if (!inflight) {
      inflight = piecesAdmin
        .colors()
        .then((groups) => set({ groups, loaded: true }))
        // Sin conexión queda la paleta de siempre.
        .catch(() => {})
        .finally(() => {
          inflight = null;
        });
    }
    return inflight;
  },
  save: async (groups) => {
    const saved = await piecesAdmin.setColors(groups);
    set({ groups: saved, loaded: true });
  },
}));

/** Tono de un color por nombre (para mostrar el circulito). */
export function usePieceColorHex() {
  const groups = usePieceColorsStore((s) => s.groups);
  const load = usePieceColorsStore((s) => s.load);
  useEffect(() => {
    void load();
  }, [load]);
  return (name: string) =>
    groups.flat().find((c) => norm(c.name) === norm(name))?.hex;
}

export function ColorDot({ hex, className }: { hex?: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-3.5 shrink-0 rounded-full border border-black/15',
        !hex && 'border-dashed bg-transparent',
        className,
      )}
      style={hex ? { backgroundColor: hex } : undefined}
    />
  );
}

const SEP = ', ';

const parse = (value: string) =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * "Colores utilizados": selección múltiple de la paleta, con el circulito de
 * cada color. Se guarda como texto ("Azul, Rosa"); colores viejos cargados a
 * mano se conservan.
 */
export function ColorsSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const { user } = useAuth();
  const canEdit = canManageRole(user?.role);
  const groups = usePieceColorsStore((s) => s.groups);
  const hexOf = usePieceColorHex();
  const selected = parse(value);
  const isSelected = (c: string) => selected.some((s) => norm(s) === norm(c));

  function toggle(c: string) {
    const next = isSelected(c)
      ? selected.filter((s) => norm(s) !== norm(c))
      : [...selected, c];
    onChange(next.join(SEP));
  }

  return (
    <div className={cn('relative', className)}>
      <button
        ref={anchorRef}
        type='button'
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          'flex min-h-9 w-full items-center gap-2 rounded-md border px-3 py-1.5 pr-8 text-left text-sm',
          catalogFieldCls,
        )}
      >
        {selected.length ? (
          <span className='flex flex-wrap items-center gap-x-2 gap-y-1'>
            {selected.map((c) => (
              <span key={c} className='inline-flex items-center gap-1'>
                <ColorDot hex={hexOf(c)} className='size-3' />
                {c}
              </span>
            ))}
          </span>
        ) : (
          <span className='text-muted-foreground'>Elegí los colores…</span>
        )}
        <ChevronDown className='pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a6e6f]' />
      </button>
      <PopoverPortal
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        className='max-h-72 overflow-y-auto rounded-lg border border-[#e6dbcd] bg-white py-1 shadow-lg'
      >
        {groups.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && 'mt-1 border-t border-[#e6dbcd] pt-1')}>
            {group.map((c) => (
              <button
                key={c.name}
                type='button'
                onClick={() => toggle(c.name)}
                className='flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm text-[#3d3338] hover:bg-[#fbf5ef]'
              >
                <span className='flex items-center gap-2.5'>
                  <ColorDot hex={c.hex} className='size-4' />
                  {c.name}
                </span>
                {isSelected(c.name) && <Check className='h-4 w-4 text-[#455a54]' />}
              </button>
            ))}
          </div>
        ))}
        {canEdit && (
          <button
            type='button'
            onClick={() => {
              setOpen(false);
              setEditing(true);
            }}
            className='mt-1 flex w-full items-center gap-2 border-t border-[#e6dbcd] px-3 py-2 text-left text-sm font-medium text-[#9d684e] hover:bg-[#fbf5ef]'
          >
            <Palette className='h-4 w-4' /> Editar colores
          </button>
        )}
      </PopoverPortal>
      {editing && <ColorsEditor onClose={() => setEditing(false)} />}
    </div>
  );
}

/** Editor de la paleta: nombre y tono de cada color, agrupados. */
function ColorsEditor({ onClose }: { onClose: () => void }) {
  const current = usePieceColorsStore((s) => s.groups);
  const save = usePieceColorsStore((s) => s.save);
  const [groups, setGroups] = useState<PieceColor[][]>(() =>
    current.map((g) => g.map((c) => ({ ...c }))),
  );
  const [saving, setSaving] = useState(false);

  function edit(gi: number, ci: number, patch: Partial<PieceColor>) {
    setGroups((gs) =>
      gs.map((g, i) => (i !== gi ? g : g.map((c, j) => (j === ci ? { ...c, ...patch } : c)))),
    );
  }

  async function submit() {
    const names = groups.flat().map((c) => norm(c.name.trim())).filter(Boolean);
    if (new Set(names).size !== names.length) {
      return showToast.error('Hay dos colores con el mismo nombre');
    }
    setSaving(true);
    try {
      await save(groups.map((g) => g.filter((c) => c.name.trim())).filter((g) => g.length));
      showToast.success('Colores guardados');
      onClose();
    } catch (e) {
      showToast.error(errorText(e, 'No se pudieron guardar los colores'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-left'>
          <DialogTitle className='font-tan-nimbus text-xl text-[#455a54]'>Colores de las fichas</DialogTitle>
          <p className='text-xs text-[#7a6e6f]'>
            Tocá el circulito para elegir el tono. Cambiar el nombre no modifica las fichas ya cargadas.
          </p>
        </DialogHeader>
        <div className='flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1'>
          {groups.map((group, gi) => (
            <div key={gi} className='rounded-xl border border-[#e6dbcd] p-3'>
              <p className='mb-2 font-mono text-[11px] tracking-wider text-[#455a54]/60'>GRUPO {gi + 1}</p>
              <div className='flex flex-col gap-2'>
                {group.map((c, ci) => (
                  <div key={ci} className='flex items-center gap-2'>
                    <label className='relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-full border border-black/15' style={{ backgroundColor: c.hex }}>
                      <input
                        type='color'
                        value={c.hex}
                        onChange={(e) => edit(gi, ci, { hex: e.target.value })}
                        className='absolute inset-0 size-full cursor-pointer opacity-0'
                        aria-label={`Tono de ${c.name || 'color'}`}
                      />
                    </label>
                    <Input
                      value={c.name}
                      onChange={(e) => edit(gi, ci, { name: e.target.value })}
                      placeholder='Nombre del color'
                      className='h-9'
                    />
                    <button
                      type='button'
                      onClick={() => setGroups((gs) => gs.map((g, i) => (i === gi ? g.filter((_, j) => j !== ci) : g)))}
                      className='inline-flex size-9 shrink-0 items-center justify-center rounded-md text-[#a33] hover:bg-[#fdf3f2]'
                      aria-label='Quitar color'
                    >
                      <Trash2 className='h-4 w-4' />
                    </button>
                  </div>
                ))}
                <button
                  type='button'
                  onClick={() => setGroups((gs) => gs.map((g, i) => (i === gi ? [...g, { name: '', hex: '#cccccc' }] : g)))}
                  className='flex w-fit items-center gap-1 text-xs font-semibold text-[#9d684e] hover:underline'
                >
                  <Plus className='h-3.5 w-3.5' /> Agregar color
                </button>
              </div>
            </div>
          ))}
          <button
            type='button'
            onClick={() => setGroups((gs) => [...gs, [{ name: '', hex: '#cccccc' }]])}
            className='flex w-fit items-center gap-1 text-xs font-semibold text-[#455a54] hover:underline'
          >
            <Plus className='h-3.5 w-3.5' /> Nuevo grupo
          </button>
        </div>
        <DialogFooter>
          <Button type='button' variant='outline' onClick={onClose} className='border-[#e6dbcd] text-[#455a54]'>Cancelar</Button>
          <Button type='button' variant='terracota' onClick={submit} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar colores'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
