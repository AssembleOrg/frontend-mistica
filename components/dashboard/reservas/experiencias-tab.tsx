'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Timer, Trash2, X } from 'lucide-react';
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
  DEFAULT_EXPERIENCE_COLOR,
  EXPERIENCE_COLOR_PALETTE,
  HEX_COLOR_RE,
} from '@/lib/experience-colors';
import {
  reservationsAdmin,
  type AdminExperience,
  type CreateExperienceInput,
} from '@/services/reservations.admin.service';
import { FilterChip, IconBtn, StatusBadge } from './_shared';

const EMPTY: CreateExperienceInput = {
  name: '',
  description: '',
  aliases: [],
  durationMinutes: 120,
  basePrice: 0,
  defaultCapacity: 8,
  depositPct: 50,
  color: DEFAULT_EXPERIENCE_COLOR,
  bookableOnline: true,
  venueSeats: 0,
  isActive: true,
};

const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

// Duración en minutos -> "2 h" (exacta) o "2:30 h" (con resto). Ej.: 120 -> "2 h",
// 150 -> "2:30 h".
function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const rem = min % 60;
  return rem === 0 ? `${h} h` : `${h}:${String(rem).padStart(2, '0')} h`;
}

type ExpFilter = 'all' | 'online' | 'coordinada';

export function ExperienciasTab() {
  const [items, setItems] = useState<AdminExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminExperience | null>(null);
  const [form, setForm] = useState<CreateExperienceInput | null>(null);
  const [saving, setSaving] = useState(false);
  // Filtro de presentación sobre la lista ya cargada (no toca el fetch).
  const [filter, setFilter] = useState<ExpFilter>('all');

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
      aliases: e.aliases ?? [],
      durationMinutes: e.durationMinutes,
      basePrice: e.basePrice,
      defaultCapacity: e.defaultCapacity,
      depositPct: e.depositPct ?? 50,
      color: e.color ?? DEFAULT_EXPERIENCE_COLOR,
      bookableOnline: e.bookableOnline ?? true,
      venueSeats: e.venueSeats ?? 0,
      isActive: e.isActive,
    });
  }

  async function save() {
    if (!form) return;
    if (!form.name.trim()) {
      showToast.error('El nombre es obligatorio');
      return;
    }
    if (!HEX_COLOR_RE.test(form.color)) {
      showToast.error('Elegí un color para la agenda');
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

  const onlineCount = items.filter((e) => e.bookableOnline !== false).length;
  const coordinadaCount = items.length - onlineCount;
  const visible = items.filter((e) =>
    filter === 'online'
      ? e.bookableOnline !== false
      : filter === 'coordinada'
        ? e.bookableOnline === false
        : true,
  );

  return (
    <div className='flex flex-col gap-4'>
      {/* Toolbar: filtros + nueva experiencia */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <FilterChip
            label='Todas'
            count={items.length}
            active={filter === 'all'}
            color='#455a54'
            tint='#E7F0EC'
            onClick={() => setFilter('all')}
          />
          <FilterChip
            label='Reservables online'
            count={onlineCount}
            active={filter === 'online'}
            color='#455a54'
            tint='#E7F0EC'
            onClick={() => setFilter('online')}
          />
          <FilterChip
            label='Coordinadas'
            count={coordinadaCount}
            active={filter === 'coordinada'}
            color='#9d684e'
            tint='#f3e7db'
            onClick={() => setFilter('coordinada')}
          />
        </div>
        <Button
          type='button'
          variant='verde'
          onClick={openNew}
          className='gap-2'
        >
          <Plus className='h-4 w-4' />
          Nueva experiencia
        </Button>
      </div>

      {/* Grilla de tarjetas */}
      {loading ? (
        <div className='rounded-2xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#7a6e6f]'>
          Cargando…
        </div>
      ) : visible.length === 0 ? (
        <div className='rounded-2xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#7a6e6f]'>
          {items.length === 0
            ? 'No hay experiencias. Creá la primera.'
            : 'No hay experiencias para este filtro.'}
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {visible.map((e) => {
            const online = e.bookableOnline !== false;
            return (
              <div
                key={e._id}
                className='flex flex-col gap-3 rounded-2xl border border-[#e6dbcd] bg-white p-[18px]'
              >
                {/* Nombre + estado de reserva */}
                <div className='flex items-start justify-between gap-2'>
                  <h3 className='flex min-w-0 flex-1 items-center gap-2 font-tan-nimbus text-[17px] font-semibold text-[#3d3338]'>
                    <span
                      className='h-2.5 w-2.5 shrink-0 rounded-full'
                      title='Color en la agenda'
                      style={{
                        backgroundColor: e.color ?? DEFAULT_EXPERIENCE_COLOR,
                      }}
                    />
                    <span className='truncate'>{e.name}</span>
                  </h3>
                  {online ? (
                    <StatusBadge label='Online' bg='#E7F0EC' fg='#455a54' />
                  ) : (
                    <StatusBadge label='Coordinada' bg='#f3e7db' fg='#9d684e' />
                  )}
                </div>

                {e.description && (
                  <p className='line-clamp-2 text-[13px] leading-relaxed text-[#7a6e6f]'>
                    {e.description}
                  </p>
                )}

                {/* Apodos: cómo la pide la gente en el chat. */}
                {(e.aliases?.length ?? 0) > 0 && (
                  <div className='flex flex-wrap gap-1.5'>
                    {e.aliases!.map((a) => (
                      <span
                        key={a}
                        className='rounded-full border border-[#e6dbcd] bg-[#fbf5ef] px-2 py-0.5 font-mono text-[11px] text-[#455a54]'
                        title='Apodo que reconoce el bot'
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}

                <div className='h-px w-full bg-[#e6dbcd]' />

                {/* Precio + duración */}
                <div className='flex items-center justify-between gap-2'>
                  <div className='flex items-baseline gap-1'>
                    <span className='text-[19px] font-bold text-[#9d684e]'>
                      {fmtPrice(e.basePrice)}
                    </span>
                    <span className='text-xs text-[#7a6e6f]'>/persona</span>
                  </div>
                  <span className='inline-flex items-center gap-1.5 rounded-[7px] border border-[#e6dbcd] bg-[#fbf5ef] px-2.5 py-1'>
                    <Timer className='h-3.5 w-3.5 text-[#7a6e6f]' />
                    <span className='font-mono text-xs text-[#3d3338]'>
                      {online ? fmtDuration(e.durationMinutes) : 'Coordinada'}
                    </span>
                  </span>
                </div>

                {/* Estado activo + acciones */}
                <div className='flex items-center justify-between gap-2'>
                  <span className='inline-flex items-center gap-2 text-xs text-[#7a6e6f]'>
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        e.isActive ? 'bg-[#455a54]' : 'bg-[#7a6e6f]'
                      }`}
                    />
                    {e.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                  <div className='flex items-center gap-1.5'>
                    <IconBtn
                      icon={Pencil}
                      title='Editar'
                      tone='verde'
                      onClick={() => openEdit(e)}
                    />
                    <IconBtn
                      icon={Trash2}
                      title='Dar de baja'
                      tone='rojo'
                      onClick={() => remove(e)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        {form && (
          <DialogContent className='sm:max-w-md'>
            <DialogHeader className='text-left'>
              <DialogTitle className='font-tan-nimbus text-xl font-bold text-[#455a54]'>
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
              <Field label='Apodos'>
                <AliasEditor
                  value={form.aliases ?? []}
                  onChange={(aliases) => setForm({ ...form, aliases })}
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
              <Field label='Lugares fijos en el salón (mesa)'>
                <Input
                  type='number'
                  min={0}
                  value={form.venueSeats ?? 0}
                  onChange={(ev) =>
                    setForm({ ...form, venueSeats: Number(ev.target.value) })
                  }
                  className={fieldCls}
                />
                <p className='mt-1 text-xs text-[#455a54]/60'>
                  Lugares del salón que un turno abierto ocupa sí o sí aunque
                  haya menos anotados (ej. la mesa del taller = 10). 0 = usa los
                  anotados.
                </p>
              </Field>
              <Field label='Color en la agenda'>
                <div className='flex flex-wrap items-center gap-2'>
                  {EXPERIENCE_COLOR_PALETTE.map((c) => (
                    <button
                      key={c.hex}
                      type='button'
                      title={c.label}
                      onClick={() => setForm({ ...form, color: c.hex })}
                      className={`h-7 w-7 rounded-full border-2 transition ${
                        form.color.toLowerCase() === c.hex
                          ? 'scale-110 border-[#455a54]'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                  {/* Cualquier otro color, con el picker nativo */}
                  <label className='relative ml-1 flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-[#e6dbcd] bg-[#fbf5ef] px-2.5 font-mono text-[11px] text-[#455a54]'>
                    <span
                      className='h-3.5 w-3.5 rounded-full border border-[#e6dbcd]'
                      style={{ backgroundColor: form.color }}
                    />
                    {form.color.toUpperCase()}
                    <input
                      type='color'
                      value={form.color}
                      onChange={(ev) =>
                        setForm({ ...form, color: ev.target.value })
                      }
                      className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
                    />
                  </label>
                </div>
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
                    className='text-sm text-[#455a54]'
                  >
                    Se reserva online (genera turnos y seña)
                  </Label>
                </div>
                <p className='pl-12 text-xs text-[#455a54]/60'>
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
                <Label htmlFor='exp-active' className='text-sm text-[#455a54]'>
                  Activa (visible al público)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setForm(null)}
                className='border-[#e6dbcd] text-[#455a54] hover:bg-[#fbf5ef]'
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
      <span className='font-mono text-[11px] tracking-wider text-[#455a54]/60'>
        {label.toUpperCase()}
      </span>
      {children}
    </div>
  );
}

/**
 * Apodos de una experiencia, como chips. Son los nombres con los que la gente
 * la pide en el chat ("AYD", "arte y degu"): el bot los usa para reconocerla
 * sin adivinar. La comparación no distingue mayúsculas, acentos ni puntuación,
 * así que "AYD", "a.y.d" y "A y D" son el mismo apodo.
 */
function AliasEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  // Misma normalización que el backend y el bot: así lo que se ve como
  // repetido acá es exactamente lo que el backend rechazaría.
  const key = (s: string) =>
    s
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' y ')
      .replace(/[^a-z0-9]/g, '');

  const dup = draft.trim() !== '' && value.some((a) => key(a) === key(draft));
  const tooShort = key(draft).length === 1;

  function add() {
    const text = draft.trim();
    if (!text || dup || key(text).length < 2) return;
    onChange([...value, text]);
    setDraft('');
  }

  return (
    <div className='flex flex-col gap-2'>
      {value.length > 0 && (
        <div className='flex flex-wrap gap-1.5'>
          {value.map((a) => (
            <span
              key={a}
              className='inline-flex items-center gap-1.5 rounded-full border border-[#e6dbcd] bg-[#fbf5ef] py-1 pl-3 pr-1.5 text-[13px] text-[#3d3338]'
            >
              {a}
              <button
                type='button'
                onClick={() => onChange(value.filter((x) => x !== a))}
                className='inline-flex size-4 items-center justify-center rounded-full text-[#7a6e6f] hover:bg-[#e6dbcd] hover:text-[#3d3338]'
                aria-label={`Quitar ${a}`}
              >
                <X className='h-3 w-3' />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className='flex gap-2'>
        <Input
          value={draft}
          onChange={(ev) => setDraft(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter' || ev.key === ',') {
              ev.preventDefault();
              add();
            }
          }}
          placeholder='AYD, arte y degu…'
          className={fieldCls}
        />
        <Button
          type='button'
          variant='ghost'
          onClick={add}
          disabled={!draft.trim() || dup || tooShort}
          className='shrink-0 border border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
        >
          Agregar
        </Button>
      </div>
      {dup && (
        <span className='text-xs text-[#9d684e]'>Ese apodo ya está en la lista.</span>
      )}
      {tooShort && (
        <span className='text-xs text-[#9d684e]'>
          Muy corto: con una sola letra matchearía cualquier cosa.
        </span>
      )}
      <span className='text-xs text-[#7a6e6f]'>
        Cómo lo escribe la gente en el chat. No distingue mayúsculas, acentos ni
        puntuación, y no puede repetirse en otra experiencia.
      </span>
    </div>
  );
}
