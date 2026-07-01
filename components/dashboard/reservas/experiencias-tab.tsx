'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fmtPrice } from '@/lib/reservas-format';
import {
  reservationsAdmin,
  type AdminExperience,
  type CreateExperienceInput,
} from '@/services/reservations.admin.service';

const EMPTY: CreateExperienceInput = {
  name: '',
  description: '',
  durationMinutes: 120,
  basePrice: 0,
  defaultCapacity: 8,
  depositPct: 50,
  bookableOnline: true,
  isActive: true,
};

const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#3d3338] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

// Columnas explícitas (sin `auto`) para que header y filas —grids separados—
// alineen. Sólo desktop; en mobile se usan tarjetas.
const COLS = 'grid grid-cols-[2fr_6rem_7rem_5rem_11rem] gap-3';

export function ExperienciasTab() {
  const [items, setItems] = useState<AdminExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminExperience | null>(null);
  const [form, setForm] = useState<CreateExperienceInput | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await reservationsAdmin.listExperiences(true));
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY });
  }
  function openEdit(e: AdminExperience) {
    setEditing(e);
    setForm({
      name: e.name,
      description: e.description ?? '',
      durationMinutes: e.durationMinutes,
      basePrice: e.basePrice,
      defaultCapacity: e.defaultCapacity,
      depositPct: e.depositPct ?? 50,
      bookableOnline: e.bookableOnline ?? true,
      isActive: e.isActive,
    });
  }

  async function save() {
    if (!form) return;
    if (!form.name.trim()) {
      showToast.error('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await reservationsAdmin.updateExperience(editing._id, form);
        showToast.success('Experiencia actualizada');
      } else {
        await reservationsAdmin.createExperience(form);
        showToast.success('Experiencia creada');
      }
      setForm(null);
      setEditing(null);
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function remove(e: AdminExperience) {
    if (!confirm(`¿Dar de baja "${e.name}"?`)) return;
    try {
      await reservationsAdmin.deleteExperience(e._id);
      showToast.success('Experiencia dada de baja');
      await load();
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }

  function estadoBadge(e: AdminExperience) {
    return (
      <span className='inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#3d3338]'>
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            e.isActive ? 'bg-[#455a54]' : 'bg-[#a99]'
          }`}
        />
        {e.isActive ? 'Activa' : 'Pausada'}
      </span>
    );
  }

  function editDelete(e: AdminExperience) {
    return (
      <>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={() => openEdit(e)}
          title='Editar'
          className='size-8 text-[#7a6e6f] hover:bg-[#fbf5ef] hover:text-[#3d3338]'
        >
          <Pencil className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={() => remove(e)}
          title='Dar de baja'
          className='size-8 text-[#7a6e6f] hover:bg-red-50 hover:text-[#b23b2e]'
        >
          <Trash2 className='h-4 w-4' />
        </Button>
      </>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex justify-end'>
        <Button
          type='button'
          variant='terracota'
          onClick={openNew}
          className='font-mono text-xs tracking-wider'
        >
          <Plus className='h-4 w-4' /> NUEVA EXPERIENCIA
        </Button>
      </div>

      {/* Desktop: tabla */}
      <div className='hidden overflow-x-auto rounded-xl border border-[#e6dbcd] bg-white md:block'>
        <div className='min-w-[44rem]'>
          <div className={`${COLS} border-b border-[#e6dbcd] bg-[#fbf5ef] px-5 py-3 font-mono text-[11px] tracking-wider text-[#7a6e6f]`}>
            <span>EXPERIENCIA</span>
            <span>DURACIÓN</span>
            <span>PRECIO</span>
            <span>CUPO DEF.</span>
            <span className='text-right'>ESTADO</span>
          </div>
          {loading ? (
            <div className='p-6 text-sm text-[#7a6e6f]'>Cargando…</div>
          ) : items.length === 0 ? (
            <div className='p-6 text-sm text-[#7a6e6f]'>
              No hay experiencias. Creá la primera.
            </div>
          ) : (
            items.map((e) => (
              <div
                key={e._id}
                className={`${COLS} items-center border-b border-[#e6dbcd] px-5 py-4 last:border-0`}
              >
                <div>
                  <p className='flex items-center gap-2 font-playfair text-base text-[#3d3338]'>
                    {e.name}
                    {e.bookableOnline === false && (
                      <span className='font-mono text-[10px] uppercase tracking-[0.14em] text-[#cc844a]'>
                        Coordinada
                      </span>
                    )}
                  </p>
                  {e.description && (
                    <p className='line-clamp-1 text-xs text-[#7a6e6f]'>
                      {e.description}
                    </p>
                  )}
                </div>
                <span className='text-sm text-[#3d3338]'>
                  {e.durationMinutes} min
                </span>
                <span className='text-sm text-[#3d3338]'>
                  {fmtPrice(e.basePrice)}
                </span>
                <span className='text-sm text-[#3d3338]'>
                  {e.defaultCapacity}
                </span>
                <div className='flex items-center justify-end gap-1.5'>
                  {estadoBadge(e)}
                  {editDelete(e)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mobile: tarjetas */}
      <div className='flex flex-col gap-3 md:hidden'>
        {loading ? (
          <div className='rounded-xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#7a6e6f]'>
            Cargando…
          </div>
        ) : items.length === 0 ? (
          <div className='rounded-xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#7a6e6f]'>
            No hay experiencias. Creá la primera.
          </div>
        ) : (
          items.map((e) => (
            <div
              key={e._id}
              className='rounded-xl border border-[#e6dbcd] bg-white p-4'
            >
              <div className='flex items-start justify-between gap-2'>
                <p className='flex flex-wrap items-center gap-2 font-playfair text-base text-[#3d3338]'>
                  {e.name}
                  {e.bookableOnline === false && (
                    <span className='font-mono text-[10px] uppercase tracking-[0.14em] text-[#cc844a]'>
                      Coordinada
                    </span>
                  )}
                </p>
                {estadoBadge(e)}
              </div>
              {e.description && (
                <p className='mt-1 text-xs text-[#7a6e6f]'>{e.description}</p>
              )}
              <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#3d3338]'>
                <span>{e.durationMinutes} min</span>
                <span className='font-medium'>{fmtPrice(e.basePrice)}</span>
                <span className='text-[#7a6e6f]'>cupo {e.defaultCapacity}</span>
              </div>
              <div className='mt-3 flex justify-end gap-1.5'>
                {editDelete(e)}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        {form && (
          <DialogContent className='sm:max-w-md'>
            <DialogHeader className='text-left'>
              <DialogTitle className='font-playfair text-xl text-[#3d3338]'>
                {editing ? 'Editar experiencia' : 'Nueva experiencia'}
              </DialogTitle>
            </DialogHeader>

            <div className='flex flex-col gap-3'>
              <Field label='Nombre'>
                <Input
                  value={form.name}
                  onChange={(ev) => setForm({ ...form, name: ev.target.value })}
                  className={fieldCls}
                />
              </Field>
              <Field label='Descripción'>
                <Textarea
                  value={form.description}
                  onChange={(ev) =>
                    setForm({ ...form, description: ev.target.value })
                  }
                  rows={2}
                  className={fieldCls}
                />
              </Field>
              <div className='grid grid-cols-3 gap-3'>
                <Field label='Duración (min)'>
                  <Input
                    type='number'
                    value={form.durationMinutes}
                    onChange={(ev) =>
                      setForm({
                        ...form,
                        durationMinutes: Number(ev.target.value),
                      })
                    }
                    className={fieldCls}
                  />
                </Field>
                <Field label='Precio p/p'>
                  <Input
                    type='number'
                    value={form.basePrice}
                    onChange={(ev) =>
                      setForm({ ...form, basePrice: Number(ev.target.value) })
                    }
                    className={fieldCls}
                  />
                </Field>
                <Field label='Cupo def.'>
                  <Input
                    type='number'
                    value={form.defaultCapacity}
                    onChange={(ev) =>
                      setForm({
                        ...form,
                        defaultCapacity: Number(ev.target.value),
                      })
                    }
                    className={fieldCls}
                  />
                </Field>
              </div>
              <Field label='Seña % (lo que se cobra al reservar)'>
                <Input
                  type='number'
                  min={0}
                  max={100}
                  value={form.depositPct ?? 50}
                  onChange={(ev) =>
                    setForm({ ...form, depositPct: Number(ev.target.value) })
                  }
                  className={fieldCls}
                />
              </Field>
              <div className='flex flex-col gap-1'>
                <div className='flex items-center gap-2.5'>
                  <Switch
                    id='exp-bookable'
                    checked={form.bookableOnline ?? true}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, bookableOnline: checked })
                    }
                    className='data-[state=checked]:bg-[#455a54]'
                  />
                  <Label
                    htmlFor='exp-bookable'
                    className='text-sm text-[#3d3338]'
                  >
                    Se reserva online (genera turnos y seña)
                  </Label>
                </div>
                <p className='pl-12 text-xs text-[#7a6e6f]'>
                  Si lo apagás, es un servicio coordinado: el bot solo informa y
                  toma la consulta (sin turnos ni pago online).
                </p>
              </div>
              <div className='flex items-center gap-2.5'>
                <Switch
                  id='exp-active'
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, isActive: checked })
                  }
                  className='data-[state=checked]:bg-[#455a54]'
                />
                <Label htmlFor='exp-active' className='text-sm text-[#3d3338]'>
                  Activa (visible al público)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setForm(null)}
                className='border-[#e6dbcd] text-[#3d3338] hover:bg-[#fbf5ef]'
              >
                Cancelar
              </Button>
              <Button
                type='button'
                variant='terracota'
                onClick={save}
                disabled={saving}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className='flex flex-col gap-1.5'>
      <span className='font-mono text-[11px] tracking-wider text-[#7a6e6f]'>
        {label.toUpperCase()}
      </span>
      {children}
    </div>
  );
}
