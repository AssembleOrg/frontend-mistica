'use client';

// Plantillas de turno: los bloques fijos del día.
//
// Se definen UNA VEZ y listo. No hace falta cargar turno por turno ni uno por
// experiencia: el turno concreto se crea solo la primera vez que alguien
// reserva ese día en ese bloque. En un mismo bloque conviven reservas de
// experiencias distintas, porque lo que se comparte es el salón (las mesas).

import { useCallback, useEffect, useState } from 'react';
import { Clock, Pencil, Plus, Trash2, X } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  shiftTemplatesAdmin,
  type ShiftTemplate,
  type ShiftTemplateInput,
} from '@/services/tables.admin.service';
import {
  reservationsAdmin,
  type AdminExperience,
} from '@/services/reservations.admin.service';

const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

const DIAS = [
  { value: '0', label: 'Todos los días' },
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sábado' },
  { value: '7', label: 'Domingo' },
];

function diaLabel(weekday?: number): string {
  return DIAS.find((d) => d.value === String(weekday ?? 0))?.label ?? 'Todos los días';
}

const EMPTY: ShiftTemplateInput = {
  key: '',
  name: '',
  start: '15:00',
  end: '17:30',
  experienceIds: [],
  order: 0,
  active: true,
};

export function ShiftTemplatesPanel() {
  const confirm = useConfirm();
  const [items, setItems] = useState<ShiftTemplate[]>([]);
  const [experiences, setExperiences] = useState<AdminExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ShiftTemplate | null>(null);
  const [form, setForm] = useState<ShiftTemplateInput | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tpls, exps] = await Promise.all([
        shiftTemplatesAdmin.list(),
        reservationsAdmin.listExperiences(false),
      ]);
      setItems(tpls);
      setExperiences(exps.filter((e) => e.bookableOnline !== false));
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar los turnos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, order: items.length + 1 });
  }

  function openEdit(t: ShiftTemplate) {
    setEditing(t);
    setForm({
      key: t.key,
      name: t.name,
      start: t.start,
      end: t.end,
      weekday: t.weekday,
      experienceIds: t.experienceIds ?? [],
      order: t.order,
      active: t.active,
    });
  }

  async function save() {
    if (!form) return;
    if (!form.key.trim() || !form.name.trim()) {
      showToast.error('Completá la clave y el nombre.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await shiftTemplatesAdmin.update(editing._id, form);
        showToast.success('Turno actualizado');
      } else {
        await shiftTemplatesAdmin.create(form);
        showToast.success('Turno creado');
      }
      setForm(null);
      await load();
    } catch (e) {
      // El backend valida que no se solapen y que quede el hueco de limpieza.
      showToast.error(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function remove(t: ShiftTemplate) {
    const ok = await confirm({
      title: 'Eliminar turno',
      description: `¿Eliminar el turno "${t.name}" (${diaLabel(t.weekday)})?`,
    });
    if (!ok) return;
    try {
      await shiftTemplatesAdmin.remove(t._id);
      showToast.success('Turno eliminado');
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  return (
    <div className='flex flex-col gap-4 rounded-2xl border border-[#e6dbcd] bg-white p-5'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='flex flex-col gap-1'>
          <h3 className='font-tan-nimbus text-lg font-semibold text-[#455a54]'>
            Turnos del día
          </h3>
          <p className='max-w-2xl text-[13px] leading-relaxed text-[#7a6e6f]'>
            Los bloques en los que se divide el día. Se definen una vez: no hace
            falta cargar turno por turno ni uno por experiencia. En un mismo
            bloque pueden convivir reservas de experiencias distintas.
          </p>
        </div>
        <Button type='button' variant='verde' onClick={openNew} className='gap-2'>
          <Plus className='h-4 w-4' />
          Nuevo turno
        </Button>
      </div>

      {loading ? (
        <p className='py-6 text-center text-sm text-[#7a6e6f]'>cargando…</p>
      ) : items.length === 0 ? (
        <p className='rounded-xl border border-dashed border-[#e6dbcd] bg-[#fbf5ef] p-6 text-center text-sm text-[#7a6e6f]'>
          No hay turnos definidos. Mientras tanto se usan los del archivo de
          configuración.
        </p>
      ) : (
        <div className='flex flex-col gap-2'>
          {items.map((t) => (
            <div
              key={t._id}
              className={cn(
                'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[#e6dbcd] bg-[#fbf5ef] px-3.5 py-2.5',
                !t.active && 'opacity-55',
              )}
            >
              <span className='rounded-md border border-[#e6dbcd] bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-[#455a54]'>
                {t.key}
              </span>
              <span className='text-sm font-semibold text-[#3d3338]'>{t.name}</span>
              <span className='inline-flex items-center gap-1.5 font-mono text-[13px] text-[#455a54]'>
                <Clock className='h-3.5 w-3.5' />
                {t.start}–{t.end}
              </span>
              <span className='text-[13px] text-[#7a6e6f]'>{diaLabel(t.weekday)}</span>
              <span className='text-[13px] text-[#7a6e6f]'>
                {t.experienceIds?.length
                  ? `${t.experienceIds.length} experiencia(s)`
                  : 'todas las experiencias'}
              </span>
              {!t.active && (
                <span className='rounded-full bg-[#e6dbcd] px-2 py-0.5 text-[11px] font-semibold text-[#7a6e6f]'>
                  inactivo
                </span>
              )}
              <span className='ml-auto flex gap-1.5'>
                <button
                  type='button'
                  onClick={() => openEdit(t)}
                  className='inline-flex size-8 items-center justify-center rounded-lg border border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
                  aria-label={`Editar ${t.name}`}
                >
                  <Pencil className='h-3.5 w-3.5' />
                </button>
                <button
                  type='button'
                  onClick={() => remove(t)}
                  className='inline-flex size-8 items-center justify-center rounded-lg border border-[#e6dbcd] bg-white text-[#9d684e] hover:bg-[#fbf5ef]'
                  aria-label={`Eliminar ${t.name}`}
                >
                  <Trash2 className='h-3.5 w-3.5' />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className='flex flex-col gap-3 rounded-xl border-2 border-[#9d684e]/40 bg-[#fbf5ef] p-4'>
          <div className='flex items-center justify-between'>
            <span className='font-tan-nimbus text-[15px] font-semibold text-[#455a54]'>
              {editing ? `Editar ${editing.name}` : 'Nuevo turno'}
            </span>
            <button
              type='button'
              onClick={() => setForm(null)}
              className='inline-flex size-7 items-center justify-center rounded-lg text-[#7a6e6f] hover:bg-[#e6dbcd]'
              aria-label='Cerrar'
            >
              <X className='h-4 w-4' />
            </button>
          </div>

          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            <TplField label='Clave'>
              <Input
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase() })}
                placeholder='T1'
                className={fieldCls}
              />
            </TplField>
            <TplField label='Nombre'>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder='Turno 1'
                className={fieldCls}
              />
            </TplField>
            <TplField label='Desde'>
              <Input
                type='time'
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
                className={fieldCls}
              />
            </TplField>
            <TplField label='Hasta'>
              <Input
                type='time'
                value={form.end}
                onChange={(e) => setForm({ ...form, end: e.target.value })}
                className={fieldCls}
              />
            </TplField>
          </div>

          <TplField label='Día'>
            <Select
              value={String(form.weekday ?? 0)}
              onValueChange={(v) =>
                setForm({ ...form, weekday: v === '0' ? undefined : Number(v) })
              }
            >
              <SelectTrigger className={`w-full ${fieldCls}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIAS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className='text-xs text-[#7a6e6f]'>
              Si un día tiene turnos propios, esos reemplazan a los genéricos.
            </span>
          </TplField>

          <TplField label='Experiencias habilitadas'>
            <div className='flex flex-wrap gap-1.5'>
              {experiences.map((e) => {
                const on = (form.experienceIds ?? []).includes(e._id);
                return (
                  <button
                    key={e._id}
                    type='button'
                    onClick={() =>
                      setForm({
                        ...form,
                        experienceIds: on
                          ? (form.experienceIds ?? []).filter((x) => x !== e._id)
                          : [...(form.experienceIds ?? []), e._id],
                      })
                    }
                    className={cn(
                      'rounded-full border px-3 py-1 text-[13px] transition-colors',
                      on
                        ? 'border-[#455a54] bg-[#455a54] text-white'
                        : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-white/60',
                    )}
                  >
                    {e.name}
                  </button>
                );
              })}
            </div>
            <span className='text-xs text-[#7a6e6f]'>
              Sin ninguna seleccionada, el turno acepta todas las experiencias
              reservables. Es lo normal.
            </span>
          </TplField>

          <div className='flex items-center gap-2'>
            <Switch
              id='tpl-active'
              checked={form.active !== false}
              onCheckedChange={(v) => setForm({ ...form, active: v })}
            />
            <Label htmlFor='tpl-active' className='text-[13px] text-[#455a54]'>
              Activo
            </Label>
          </div>

          <div className='flex gap-2'>
            <Button type='button' variant='verde' onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button
              type='button'
              variant='ghost'
              onClick={() => setForm(null)}
              disabled={saving}
              className='border border-[#e6dbcd] bg-white text-[#7a6e6f]'
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TplField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className='flex flex-col gap-1.5'>
      <span className='font-mono text-[11px] tracking-wider text-[#455a54]/60'>
        {label.toUpperCase()}
      </span>
      {children}
    </div>
  );
}
