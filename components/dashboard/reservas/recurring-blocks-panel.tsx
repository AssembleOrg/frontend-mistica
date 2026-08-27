'use client';

// Bloqueos FIJOS semanales: un motivo o experiencia (taller, colonia, evento)
// que ocupa ciertas mesas todas las semanas en un día y rango horario.
//
// Se cargan una vez y valen para siempre (editables). La disponibilidad de
// esos días baja sola: las mesas bloqueadas no se ofrecen ni a la landing ni
// al bot en ese rango, y la agenda del día los muestra como "fijos".

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Pencil, Plus, Repeat, Trash2, X } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  recurringBlocksAdmin,
  tablesAdmin,
  type AdminTable,
  type RecurringBlock,
} from '@/services/tables.admin.service';

const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

/** Día ISO 1=lunes … 7=domingo. */
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface FormState {
  label: string;
  /** En alta se pueden elegir varios días (crea una regla por día). */
  weekdays: number[];
  start: string;
  end: string;
  tableCodes: string[];
  notes: string;
  active: boolean;
}

const EMPTY: FormState = {
  label: '',
  weekdays: [],
  start: '15:30',
  end: '17:30',
  tableCodes: [],
  notes: '',
  active: true,
};

export function RecurringBlocksPanel() {
  const [items, setItems] = useState<RecurringBlock[]>([]);
  const [tables, setTables] = useState<AdminTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RecurringBlock | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rules, cat] = await Promise.all([
        recurringBlocksAdmin.list(),
        tablesAdmin.list(),
      ]);
      setItems(rules);
      setTables(cat);
    } catch (e) {
      showToast.error(
        e instanceof Error ? e.message : 'Error al cargar los bloqueos fijos',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Reglas agrupadas por día ISO (1–7), ordenadas por hora. */
  const byDay = useMemo(() => {
    const map = new Map<number, RecurringBlock[]>();
    for (const r of items) {
      const list = map.get(r.weekday) ?? [];
      list.push(r);
      map.set(r.weekday, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.start.localeCompare(b.start));
    }
    return map;
  }, [items]);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY });
  }

  function openEdit(rule: RecurringBlock) {
    setEditing(rule);
    setForm({
      label: rule.label,
      weekdays: [rule.weekday],
      start: rule.start,
      end: rule.end,
      tableCodes: rule.tableCodes,
      notes: rule.notes ?? '',
      active: rule.active,
    });
  }

  async function save() {
    if (!form) return;
    if (!form.label.trim()) return showToast.error('Poné el motivo o la experiencia');
    if (!form.weekdays.length) return showToast.error('Elegí al menos un día');
    if (!form.tableCodes.length) return showToast.error('Elegí al menos una mesa');
    if (form.end <= form.start) return showToast.error('El fin tiene que ser después del inicio');
    setSaving(true);
    try {
      const base = {
        label: form.label.trim(),
        start: form.start,
        end: form.end,
        tableCodes: form.tableCodes,
        notes: form.notes.trim() || undefined,
        active: form.active,
      };
      if (editing) {
        await recurringBlocksAdmin.update(editing._id, {
          ...base,
          weekday: form.weekdays[0],
        });
        showToast.success('Bloqueo fijo actualizado');
      } else {
        // Un alta puede abarcar varios días (ej. el taller de mar a vie):
        // se crea una regla por día, editables por separado después.
        for (const weekday of form.weekdays) {
          await recurringBlocksAdmin.create({ ...base, weekday });
        }
        showToast.success(
          form.weekdays.length > 1
            ? `${form.weekdays.length} bloqueos fijos creados`
            : 'Bloqueo fijo creado',
        );
      }
      setForm(null);
      setEditing(null);
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function remove(rule: RecurringBlock) {
    if (!window.confirm(`¿Eliminar "${rule.label}" del ${DIAS[rule.weekday - 1].toLowerCase()} ${rule.start}?`)) {
      return;
    }
    try {
      await recurringBlocksAdmin.remove(rule._id);
      showToast.success('Bloqueo fijo eliminado');
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  return (
    <section className='overflow-hidden rounded-2xl border border-[#e6dbcd] bg-white'>
      <header className='flex flex-wrap items-center justify-between gap-3 border-b border-[#e6dbcd] bg-[#fbf5ef] px-4 py-3'>
        <div className='flex items-center gap-2.5'>
          <Repeat className='h-4 w-4 text-[#9d684e]' />
          <h3 className='font-tan-nimbus text-lg font-semibold text-[#455a54]'>
            Bloqueos fijos semanales
          </h3>
          {loading && <span className='text-xs text-[#7a6e6f]'>cargando…</span>}
        </div>
        <Button
          type='button'
          variant='verde'
          size='sm'
          onClick={openNew}
          className='gap-1.5'
        >
          <Plus className='h-3.5 w-3.5' />
          Nuevo bloqueo fijo
        </Button>
      </header>

      {/* Semana: una columna por día con sus bloqueos. */}
      <div className='grid grid-cols-1 gap-px bg-[#e6dbcd] sm:grid-cols-2 lg:grid-cols-7'>
        {DIAS.map((dia, i) => {
          const weekday = i + 1;
          const rules = byDay.get(weekday) ?? [];
          return (
            <div key={dia} className='flex min-h-[7rem] flex-col gap-2 bg-white p-2.5'>
              <span className='text-center font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6e6f]'>
                <span className='lg:hidden'>{dia}</span>
                <span className='hidden lg:inline'>{DIAS_CORTO[i]}</span>
              </span>
              {rules.length === 0 ? (
                <span className='py-3 text-center text-[11px] text-[#c3b7a4]'>—</span>
              ) : (
                rules.map((r) => (
                  <button
                    key={r._id}
                    type='button'
                    onClick={() => openEdit(r)}
                    title='Editar'
                    className={cn(
                      'group flex flex-col gap-1 rounded-lg border px-2 py-1.5 text-left transition-colors',
                      r.active
                        ? 'border-[#9d684e]/35 bg-[#f4ead9] hover:border-[#9d684e]/70'
                        : 'border-dashed border-[#e6dbcd] bg-[#fbf5ef] opacity-60 hover:opacity-90',
                    )}
                  >
                    <span className='flex items-center gap-1 font-mono text-xs font-semibold text-[#9d684e]'>
                      <CalendarClock className='h-3 w-3' />
                      {r.start}–{r.end}
                    </span>
                    <span className='text-sm font-semibold leading-tight text-[#3d3338]'>
                      {r.label}
                      {!r.active && (
                        <span className='ml-1 font-normal text-[#a99f92]'>(pausado)</span>
                      )}
                    </span>
                    <span className='flex flex-wrap gap-1'>
                      {r.tableCodes.map((c) => (
                        <span
                          key={c}
                          className='rounded border border-[#e6dbcd] bg-white px-1 font-mono text-xs font-semibold text-[#455a54]'
                        >
                          {c}
                        </span>
                      ))}
                    </span>
                  </button>
                ))
              )}
            </div>
          );
        })}
      </div>

      {form && (
        <BlockEditor
          form={form}
          setForm={setForm}
          tables={tables}
          editing={!!editing}
          saving={saving}
          onSave={save}
          onDelete={editing ? () => remove(editing) : undefined}
          onCancel={() => {
            setForm(null);
            setEditing(null);
          }}
        />
      )}

      <p className='border-t border-[#e6dbcd] bg-[#fbf5ef] px-4 py-2.5 text-sm text-[#7a6e6f]'>
        Las mesas bloqueadas acá quedan ocupadas <strong>todas las semanas</strong> en
        ese día y horario: no se ofrecen online ni por WhatsApp y bajan la
        disponibilidad máxima del día. Tocá un bloqueo para editarlo.
      </p>
    </section>
  );
}

// ─────────────────────────────── editor ───────────────────────────────

function BlockEditor({
  form,
  setForm,
  tables,
  editing,
  saving,
  onSave,
  onDelete,
  onCancel,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  tables: AdminTable[];
  editing: boolean;
  saving: boolean;
  onSave: () => void;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const smalls = tables.filter((t) => t.kind === 'SMALL');
  const larges = tables.filter((t) => t.kind === 'LARGE');
  const seats = form.tableCodes.reduce(
    (n, c) => n + (tables.find((t) => t.code === c)?.seats ?? 0),
    0,
  );

  function toggleDay(weekday: number) {
    if (editing) {
      setForm({ ...form, weekdays: [weekday] });
      return;
    }
    setForm({
      ...form,
      weekdays: form.weekdays.includes(weekday)
        ? form.weekdays.filter((d) => d !== weekday)
        : [...form.weekdays, weekday].sort(),
    });
  }

  function toggleTable(code: string) {
    setForm({
      ...form,
      tableCodes: form.tableCodes.includes(code)
        ? form.tableCodes.filter((c) => c !== code)
        : [...form.tableCodes, code],
    });
  }

  return (
    <div className='border-t-2 border-[#9d684e]/40 bg-[#fbf5ef] px-4 py-4'>
      <div className='mb-3 flex items-center justify-between'>
        <h4 className='text-sm font-semibold text-[#455a54]'>
          {editing ? 'Editar bloqueo fijo' : 'Nuevo bloqueo fijo'}
        </h4>
        <button
          type='button'
          onClick={onCancel}
          className='text-[#7a6e6f] hover:text-[#3d3338]'
          aria-label='Cerrar'
        >
          <X className='h-4 w-4' />
        </button>
      </div>

      <div className='flex flex-col gap-4'>
        <div className='grid gap-3 sm:grid-cols-2'>
          <div className='space-y-1.5'>
            <Label className='text-[13px] text-[#455a54]'>Motivo o experiencia</Label>
            <Input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder='Taller de cerámica, Escuelita…'
              className={fieldCls}
            />
          </div>
          <div className='space-y-1.5'>
            <Label className='text-[13px] text-[#455a54]'>Notas (internas)</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder='Opcional'
              className={fieldCls}
            />
          </div>
        </div>

        <div className='space-y-1.5'>
          <Label className='text-[13px] text-[#455a54]'>
            {editing ? 'Día' : 'Días (podés elegir varios: se crea uno por día)'}
          </Label>
          <div className='flex flex-wrap gap-1.5'>
            {DIAS.map((dia, i) => {
              const weekday = i + 1;
              const on = form.weekdays.includes(weekday);
              return (
                <button
                  key={dia}
                  type='button'
                  onClick={() => toggleDay(weekday)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
                    on
                      ? 'border-[#455a54] bg-[#455a54] text-white'
                      : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#f3e9df]',
                  )}
                >
                  {DIAS_CORTO[i]}
                </button>
              );
            })}
          </div>
        </div>

        <div className='flex flex-wrap items-end gap-3'>
          <div className='space-y-1.5'>
            <Label className='text-[13px] text-[#455a54]'>Desde</Label>
            <Input
              type='time'
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
              className={cn('w-28', fieldCls)}
            />
          </div>
          <div className='space-y-1.5'>
            <Label className='text-[13px] text-[#455a54]'>Hasta</Label>
            <Input
              type='time'
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
              className={cn('w-28', fieldCls)}
            />
          </div>
          <label className='flex items-center gap-2 pb-2 text-[13px] text-[#455a54]'>
            <Switch
              checked={form.active}
              onCheckedChange={(v) => setForm({ ...form, active: v })}
            />
            Activo
          </label>
        </div>

        {/* Croquis del salón: elegí las mesas que ocupa. */}
        <div className='space-y-2'>
          <Label className='text-[13px] text-[#455a54]'>
            Mesas que ocupa
            {form.tableCodes.length > 0 && (
              <span className='ml-2 font-normal text-[#7a6e6f]'>
                {form.tableCodes.length} mesas · {seats} lugares
              </span>
            )}
          </Label>
          <div className='rounded-xl border border-[#e6dbcd] bg-white p-3.5'>
            <div className='flex flex-col gap-4 lg:flex-row lg:gap-8'>
              <div className='min-w-0 flex-1'>
                <p className='mb-2 text-[12px] font-medium text-[#7a6e6f]'>
                  Mesas de 2 personas
                </p>
                <div className='flex flex-wrap gap-2'>
                  {smalls.map((t) => {
                    const on = form.tableCodes.includes(t.code);
                    return (
                      <button
                        key={t.code}
                        type='button'
                        onClick={() => toggleTable(t.code)}
                        className={cn(
                          'h-11 w-14 rounded-lg border text-[13px] font-semibold transition-colors',
                          on
                            ? 'border-[#9d684e] bg-[#9d684e] text-white'
                            : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]',
                        )}
                      >
                        {t.code}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className='min-w-0'>
                <p className='mb-2 text-[12px] font-medium text-[#7a6e6f]'>
                  Mesas grandes (10 personas)
                </p>
                <div className='flex flex-wrap gap-2'>
                  {larges.map((t) => {
                    const on = form.tableCodes.includes(t.code);
                    return (
                      <button
                        key={t.code}
                        type='button'
                        onClick={() => toggleTable(t.code)}
                        className={cn(
                          'h-11 w-36 rounded-lg border text-[13px] font-semibold transition-colors',
                          on
                            ? 'border-[#9d684e] bg-[#9d684e] text-white'
                            : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]',
                        )}
                      >
                        Mesa Grande {t.code.replace(/\D/g, '') || t.code}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='verde'
            size='sm'
            disabled={saving}
            onClick={onSave}
            className='gap-1.5'
          >
            <Pencil className='h-3.5 w-3.5' />
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear bloqueo'}
          </Button>
          {onDelete && (
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={saving}
              onClick={onDelete}
              className='gap-1.5 border-[#e6dbcd] text-[#a33] hover:bg-[#f6e2e2]'
            >
              <Trash2 className='h-3.5 w-3.5' />
              Eliminar
            </Button>
          )}
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={saving}
            onClick={onCancel}
            className='border-[#e6dbcd] text-[#7a6e6f]'
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
