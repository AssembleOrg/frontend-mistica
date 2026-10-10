'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays,
  CalendarRange,
  Pencil,
  Plus,
  Tag,
  Timer,
  Trash2,
  Users,
  X,
} from 'lucide-react';
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
import { DatePicker } from '@/components/ui/date-picker';
import { ImageUploadButton } from '@/components/ui/image-upload-button';
import { FormField, FormSection } from '@/components/ui/form-section';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fmtPrice } from '@/lib/reservas-format';
import { experienceHasBuffet } from '@/lib/kitchen';
import {
  DEFAULT_EXPERIENCE_COLOR,
  EXPERIENCE_COLOR_PALETTE,
  HEX_COLOR_RE,
} from '@/lib/experience-colors';
import {
  reservationsAdmin,
  type AdminExperience,
  type CreateExperienceInput,
  type OwnSlot,
  type PriceVariant,
} from '@/services/reservations.admin.service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FilterChip, IconBtn, StatusBadge } from './_shared';
import { SpecialsEditor } from './specials-editor';
import {
  SPECIAL_STATUS_LABEL,
  specialDatesLabel,
  specialProblem,
  specialStatus,
} from '@/lib/specials';
import { useConfirm } from '@/components/ui/confirm-dialog';

const EMPTY: CreateExperienceInput = {
  name: '',
  description: '',
  aliases: [],
  images: [],
  priceVariants: [],
  ownSchedule: [],
  specials: [],
  durationMinutes: 120,
  basePrice: 0,
  defaultCapacity: 8,
  depositPct: 50,
  color: DEFAULT_EXPERIENCE_COLOR,
  bookableOnline: true,
  venueSeats: 0,
  isBirthday: false,
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
type ExpTab = 'basico' | 'precio' | 'horario' | 'especiales' | 'mas';

export function ExperienciasTab() {
  const confirm = useConfirm();
  const [items, setItems] = useState<AdminExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminExperience | null>(null);
  const [form, setForm] = useState<CreateExperienceInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<ExpTab>('basico');
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
    setTab('basico');
    setForm({ ...EMPTY });
  }
  function openEdit(e: AdminExperience) {
    setEditing(e);
    setTab('basico');
    setForm({
      name: e.name,
      description: e.description ?? '',
      aliases: e.aliases ?? [],
      images: e.images ?? [],
      priceVariants: e.priceVariants ?? [],
      ownSchedule: e.ownSchedule ?? [],
      specials: e.specials ?? [],
      durationMinutes: e.durationMinutes,
      basePrice: e.basePrice,
      defaultCapacity: e.defaultCapacity,
      depositPct: e.depositPct ?? 50,
      color: e.color ?? DEFAULT_EXPERIENCE_COLOR,
      bookableOnline: e.bookableOnline ?? true,
      venueSeats: e.venueSeats ?? 0,
      hasBuffet: experienceHasBuffet(e),
      isBirthday: e.isBirthday ?? false,
      isActive: e.isActive,
    });
  }

  async function save() {
    if (!form) return;
    if (!form.name.trim()) {
      setTab('basico');
      showToast.error('El nombre es obligatorio');
      return;
    }
    if (!HEX_COLOR_RE.test(form.color)) {
      setTab('basico');
      showToast.error('Elegí un color para la agenda');
      return;
    }
    if ((form.ownSchedule ?? []).some((slot) => slot.date === '')) {
      setTab('horario');
      showToast.error('Elegí la fecha de cada horario de fecha única');
      return;
    }
    const specialError = (form.specials ?? []).map(specialProblem).find(Boolean);
    if (specialError) {
      setTab('especiales');
      showToast.error(specialError);
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
    const ok = await confirm({
      title: 'Dar de baja experiencia',
      description: `¿Dar de baja "${e.name}"?`,
      confirmLabel: 'Dar de baja',
    });
    if (!ok) return;
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
      <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between'>
        {/* Chips en una fila con scroll horizontal (no envuelven en mobile). */}
        <div className='-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden'>
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
          className='shrink-0 gap-2'
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
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {visible.map((e) => {
            const online = e.bookableOnline !== false;
            return (
              <div
                key={e._id}
                className='flex flex-col gap-3 rounded-2xl border border-[#e6dbcd] bg-white p-4'
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
                  {e.isBirthday ? (
                    <StatusBadge label='Ocasión 🎉' bg='#efe6f2' fg='#6d5a78' />
                  ) : online ? (
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

                {/* Fechas especiales que rigen o están por venir. */}
                {(e.specials ?? [])
                  .filter((s) => ['VIGENTE', 'PROXIMA'].includes(specialStatus(s)))
                  .map((s) => (
                    <span
                      key={s._id ?? s.name}
                      className='inline-flex w-fit items-center gap-1 rounded-full bg-[#F6E9DC] px-2.5 py-1 text-xs font-medium text-[#9d684e]'
                      title={`${SPECIAL_STATUS_LABEL[specialStatus(s)]} · se hace ${specialDatesLabel(s)}`}
                    >
                      ✨ {s.name} · {specialDatesLabel(s)}
                    </span>
                  ))}

                <div className='h-px w-full bg-[#e6dbcd]' />

                {/* Precio + duración. La ocasión Cumpleaños no tiene propios:
                    hereda los de la experiencia que elija el cliente. */}
                {e.isBirthday ? (
                  <p className='text-[13px] leading-snug text-[#6d5a78]'>
                    Precio y duración: los de la experiencia elegida. Este item
                    aporta los beneficios del festejo.
                  </p>
                ) : (
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
                )}

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
          <DialogContent className='sm:max-w-2xl'>
            <DialogHeader className='text-left'>
              <DialogTitle className='font-tan-nimbus text-xl font-bold text-[#455a54]'>
                {editing ? 'Editar experiencia' : 'Nueva experiencia'}
              </DialogTitle>
            </DialogHeader>

            <Tabs value={tab} onValueChange={(v) => setTab(v as ExpTab)}>
              <TabsList className='h-10 w-full bg-arena-2 [&>button]:px-1.5 [&>button]:text-xs sm:[&>button]:text-sm'>
                <TabsTrigger value='basico'>Básico</TabsTrigger>
                <TabsTrigger value='precio'>Precio y cupo</TabsTrigger>
                <TabsTrigger value='horario'>Horario</TabsTrigger>
                <TabsTrigger value='especiales'>Fechas especiales</TabsTrigger>
                <TabsTrigger value='mas'>Más</TabsTrigger>
              </TabsList>

              <TabsContent value='basico' className='flex flex-col gap-3 pt-2'>
                <FormSection title='Qué es'>
                  <FormField label='Nombre' htmlFor='exp-name'>
                    <Input
                      id='exp-name'
                      value={form.name}
                      onChange={(ev) => setForm({ ...form, name: ev.target.value })}
                      className={fieldCls}
                    />
                  </FormField>
                  <FormField
                    label='Descripción'
                    htmlFor='exp-description'
                    hint='Se muestra en la web.'
                  >
                    <Textarea
                      id='exp-description'
                      value={form.description}
                      onChange={(ev) =>
                        setForm({ ...form, description: ev.target.value })
                      }
                      rows={3}
                      className={fieldCls}
                    />
                  </FormField>
                </FormSection>
                <FormSection title='Color en la agenda'>
                  <ColorPicker
                    value={form.color}
                    onChange={(color) => setForm({ ...form, color })}
                  />
                </FormSection>
                <FormSection title='Estado'>
                  <SwitchRow
                    id='exp-active'
                    label='Activa'
                    hint='Si la apagás, deja de verse en la web y en el bot.'
                    checked={form.isActive ?? false}
                    onChange={(isActive) => setForm({ ...form, isActive })}
                  />
                </FormSection>
              </TabsContent>

              <TabsContent value='precio' className='flex flex-col gap-3 pt-2'>
                <FormSection title='Precio y duración'>
                  <div className='grid gap-3 sm:grid-cols-2'>
                    <FormField
                      label='Precio por persona'
                      htmlFor='exp-price'
                      hint={fmtPrice(form.basePrice)}
                    >
                      <Input
                        id='exp-price'
                        type='number'
                        min={0}
                        value={form.basePrice}
                        onChange={(ev) =>
                          setForm({ ...form, basePrice: Number(ev.target.value) })
                        }
                        className={fieldCls}
                      />
                    </FormField>
                    <FormField
                      label='Duración (minutos)'
                      htmlFor='exp-duration'
                      hint={`Dura ${fmtDuration(form.durationMinutes)}`}
                    >
                      <Input
                        id='exp-duration'
                        type='number'
                        min={0}
                        value={form.durationMinutes}
                        onChange={(ev) =>
                          setForm({
                            ...form,
                            durationMinutes: Number(ev.target.value),
                          })
                        }
                        className={fieldCls}
                      />
                    </FormField>
                    <FormField
                      label='Cupo por turno'
                      htmlFor='exp-capacity'
                      hint='Máximo de personas en un mismo turno. En los turnos del salón también lo limitan las mesas libres.'
                    >
                      <Input
                        id='exp-capacity'
                        type='number'
                        min={1}
                        value={form.defaultCapacity}
                        onChange={(ev) =>
                          setForm({
                            ...form,
                            defaultCapacity: Number(ev.target.value),
                          })
                        }
                        className={fieldCls}
                      />
                    </FormField>
                    <FormField
                      label='Seña al reservar (%)'
                      htmlFor='exp-deposit'
                      hint={`Se cobran ${fmtPrice(
                        Math.round(
                          (form.basePrice * (form.depositPct ?? 50)) / 100,
                        ),
                      )} por persona al reservar.`}
                    >
                      <Input
                        id='exp-deposit'
                        type='number'
                        min={0}
                        max={100}
                        value={form.depositPct ?? 50}
                        onChange={(ev) =>
                          setForm({ ...form, depositPct: Number(ev.target.value) })
                        }
                        className={fieldCls}
                      />
                    </FormField>
                  </div>
                </FormSection>
                {/* "Lugares fijos en el salón" (venueSeats) queda oculto a
                    propósito: ningún cálculo de capacidad del backend lo lee
                    (y availability.service lo fuerza a 0 en los turnos que crea
                    solo). El lugar del Taller se aparta con el bloqueo semanal
                    de mesas. El valor guardado se sigue enviando sin cambios. */}
                <VariantsEditor
                  variants={form.priceVariants ?? []}
                  basePrice={form.basePrice}
                  onChange={(priceVariants) => setForm({ ...form, priceVariants })}
                />
              </TabsContent>

              <TabsContent value='horario' className='flex flex-col gap-3 pt-2'>
                <FormSection title='Cómo se reserva'>
                  <SwitchRow
                    id='exp-bookable'
                    label='Se reserva online'
                    hint='Genera turnos y cobra seña. Si lo apagás, es un servicio coordinado: el bot solo informa y toma la consulta.'
                    checked={form.bookableOnline ?? true}
                    onChange={(bookableOnline) =>
                      setForm({ ...form, bookableOnline })
                    }
                  />
                </FormSection>
                {form.isBirthday ? (
                  <p className='px-1 text-sm text-texto-suave'>
                    El cumpleaños usa los horarios de la experiencia que elija
                    el cliente.
                  </p>
                ) : (form.bookableOnline ?? true) ? (
                  <FormSection title='Cuándo se puede reservar'>
                    <OwnScheduleEditor
                      value={form.ownSchedule ?? []}
                      onChange={(ownSchedule) => setForm({ ...form, ownSchedule })}
                    />
                  </FormSection>
                ) : (
                  <p className='px-1 text-sm text-texto-suave'>
                    Al ser coordinada no tiene turnos: el día y la hora se
                    arreglan con el equipo.
                  </p>
                )}
              </TabsContent>

              <TabsContent value='especiales' className='flex flex-col gap-3 pt-2'>
                {form.isBirthday || form.bookableOnline === false ? (
                  <p className='px-1 text-sm text-texto-suave'>
                    Las fechas especiales son para las experiencias que se reservan
                    online.
                  </p>
                ) : (
                  <SpecialsEditor
                    value={form.specials ?? []}
                    basePrice={form.basePrice}
                    experienceName={form.name}
                    onChange={(specials) => setForm({ ...form, specials })}
                    renderVariants={(variants, basePrice, onChange) => (
                      <VariantsEditor
                        variants={variants}
                        basePrice={basePrice}
                        onChange={onChange}
                      />
                    )}
                  />
                )}
              </TabsContent>

              <TabsContent value='mas' className='flex flex-col gap-3 pt-2'>
                <FormSection title='Apodos'>
                  <AliasEditor
                    value={form.aliases ?? []}
                    onChange={(aliases) => setForm({ ...form, aliases })}
                  />
                </FormSection>
                <FormSection title='Imágenes' description='Se muestran en la web.'>
                  <ImagesEditor
                    value={form.images ?? []}
                    onChange={(images) => setForm({ ...form, images })}
                  />
                </FormSection>
                <FormSection title='Opciones'>
                  <SwitchRow
                    id='exp-buffet'
                    label='Incluye buffet o merienda'
                    hint='La vista de Cocina cuenta a sus personas para preparar el buffet.'
                    checked={form.hasBuffet ?? experienceHasBuffet(form)}
                    onChange={(hasBuffet) => setForm({ ...form, hasBuffet })}
                  />
                  <SwitchRow
                    id='exp-birthday'
                    label='Es cumpleaños 🎉'
                    hint='Hereda precio, duración y horario de la experiencia elegida; aporta los beneficios del festejo.'
                    checked={form.isBirthday ?? false}
                    onChange={(isBirthday) => setForm({ ...form, isBirthday })}
                  />
                </FormSection>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setForm(null)}
                className='border-[#e6dbcd] text-[#455a54] hover:bg-[#fbf5ef]'
              >
                Cancelar
              </Button>
              <Button type='button' variant='verde' onClick={save} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

/** Switch con su label al lado y la ayuda debajo, alineada al texto. */
function SwitchRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}>) {
  return (
    <div className='flex items-start gap-3'>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className='mt-0.5 data-[state=checked]:bg-[#455a54]'
      />
      <div className='flex flex-col gap-0.5'>
        <Label htmlFor={id} className='text-sm font-medium text-[#3d3338]'>
          {label}
        </Label>
        {hint && <p className='text-xs leading-snug text-texto-suave'>{hint}</p>}
      </div>
    </div>
  );
}

/** Paleta de colores de la agenda + cualquier otro con el picker nativo. */
function ColorPicker({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (hex: string) => void }>) {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      {EXPERIENCE_COLOR_PALETTE.map((c) => (
        <button
          key={c.hex}
          type='button'
          title={c.label}
          aria-label={c.label}
          onClick={() => onChange(c.hex)}
          className={`h-7 w-7 rounded-full border-2 transition ${
            value.toLowerCase() === c.hex
              ? 'scale-110 border-[#455a54]'
              : 'border-transparent hover:scale-105'
          }`}
          style={{ backgroundColor: c.hex }}
        />
      ))}
      <label className='relative ml-1 flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-[#e6dbcd] bg-[#fbf5ef] px-2.5 font-mono text-[11px] text-[#455a54]'>
        <span
          className='h-3.5 w-3.5 rounded-full border border-[#e6dbcd]'
          style={{ backgroundColor: value }}
        />
        {value.toUpperCase()}
        <input
          type='color'
          value={value}
          onChange={(ev) => onChange(ev.target.value)}
          className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
        />
      </label>
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

/**
 * URLs de imágenes de la experiencia (se muestran en la landing). Chips con
 * miniatura + input para pegar la URL. Sin upload: el equipo sube la foto a
 * su hosting/Drive público y pega el link.
 */
function ImagesEditor({
  value,
  onChange,
}: Readonly<{
  value: string[];
  onChange: (next: string[]) => void;
}>) {
  const [draft, setDraft] = useState('');
  const valid = /^https?:\/\/.+/.test(draft.trim());

  function add() {
    const url = draft.trim();
    if (!valid || value.includes(url)) return;
    onChange([...value, url]);
    setDraft('');
  }

  return (
    <div className='flex flex-col gap-2'>
      {value.length > 0 && (
        <div className='flex flex-wrap gap-2'>
          {value.map((url) => (
            <span
              key={url}
              className='inline-flex items-center gap-1.5 rounded-lg border border-[#e6dbcd] bg-[#fbf5ef] p-1 pr-1.5'
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=''
                className='h-9 w-9 rounded-md object-cover'
              />
              <button
                type='button'
                onClick={() => onChange(value.filter((x) => x !== url))}
                className='inline-flex size-4 items-center justify-center rounded-full text-[#7a6e6f] hover:bg-[#e6dbcd] hover:text-[#3d3338]'
                aria-label='Quitar imagen'
              >
                <X className='h-3 w-3' />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className='flex flex-wrap items-center gap-2'>
        <ImageUploadButton
          folder='experiencias'
          onUploaded={(url) => onChange([...value, url])}
        />
        <span className='text-[11px] text-[#a99f92]'>o pegá una URL:</span>
        <Input
          value={draft}
          onChange={(ev) => setDraft(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter') {
              ev.preventDefault();
              add();
            }
          }}
          placeholder='https://…'
          className={`${fieldCls} h-9 min-w-40 flex-1`}
        />
        <Button
          type='button'
          variant='ghost'
          onClick={add}
          disabled={!valid}
          className='shrink-0 border border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
        >
          Agregar
        </Button>
      </div>
    </div>
  );
}

// ───────────────────── Promos y variantes de precio ─────────────────────

/**
 * Editor de promos y variantes de precio. Cada variante tiene un TIPO que
 * define su condición:
 * · Por cantidad: rango de personas (cumpleaños 5+/10+ con extras).
 * · Por día de semana: rige los días elegidos, todas las semanas (promo martes).
 * · Por fecha: fecha puntual o rango del calendario (promo del 20/12).
 * · Modalidad: precio alternativo informativo, nunca se aplica solo
 *   (escuelita "Mensual" $80).
 * Las tres primeras se aplican SOLAS al precio de la reserva (bot + landing
 * cobran ese precio); el tipo se infiere de qué condiciones tiene guardadas.
 */
type VariantKind = 'qty' | 'weekday' | 'date' | 'modality';

const KINDS: Array<{
  kind: VariantKind;
  label: string;
  hint: string;
  icon: typeof Users;
}> = [
  {
    kind: 'qty',
    label: 'Por cantidad',
    hint: 'Según cuántas personas reserven',
    icon: Users,
  },
  {
    kind: 'weekday',
    label: 'Por día de semana',
    hint: 'Los días que elijas, todas las semanas',
    icon: CalendarDays,
  },
  {
    kind: 'date',
    label: 'Por fecha',
    hint: 'Una fecha puntual o un rango',
    icon: CalendarRange,
  },
  {
    kind: 'modality',
    label: 'Modalidad',
    hint: 'Precio alternativo, sólo informativo',
    icon: Tag,
  },
];

// Días ISO: 1=lunes .. 7=domingo.
const WEEKDAYS: Array<{ iso: number; short: string; name: string }> = [
  { iso: 1, short: 'Lun', name: 'lunes' },
  { iso: 2, short: 'Mar', name: 'martes' },
  { iso: 3, short: 'Mié', name: 'miércoles' },
  { iso: 4, short: 'Jue', name: 'jueves' },
  { iso: 5, short: 'Vie', name: 'viernes' },
  { iso: 6, short: 'Sáb', name: 'sábados' },
  { iso: 7, short: 'Dom', name: 'domingos' },
];

function kindOf(v: PriceVariant): VariantKind {
  if (v.dateFrom || v.dateTo) return 'date';
  if (v.days && v.days.length > 0) return 'weekday';
  if (v.minQty != null || v.maxQty != null) return 'qty';
  return 'modality';
}

// 'YYYY-MM-DD' -> 'DD/MM/YYYY' sin pasar por Date (evita el corrimiento UTC).
function fmtYmd(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

function qtyPhrase(v: PriceVariant): string | null {
  if (v.minQty != null && v.maxQty != null)
    return `de ${v.minQty} a ${v.maxQty} personas`;
  if (v.minQty != null) return `desde ${v.minQty} personas`;
  if (v.maxQty != null) return `hasta ${v.maxQty} personas`;
  return null;
}

/**
 * Frase humana de la variante ("Los martes → $7 por persona"). Es lo que ve
 * el admin en la lista y en la vista previa del editor: dice exactamente
 * cuándo se cobra ese precio, sin tener que interpretar campos.
 */
function describeVariant(v: PriceVariant, kind: VariantKind = kindOf(v)): string {
  const price =
    v.price == null
      ? 'mismo precio'
      : v.unit === 'FLAT'
        ? `${fmtPrice(v.price)} total`
        : `${fmtPrice(v.price)} por persona`;
  const qty = qtyPhrase(v);

  if (kind === 'modality') return `${price} · el bot la menciona, no se aplica sola`;

  const parts: string[] = [];
  if (kind === 'date') {
    if (v.dateFrom && v.dateFrom === v.dateTo) {
      parts.push(`el ${fmtYmd(v.dateFrom)}`);
    } else if (v.dateFrom && v.dateTo) {
      parts.push(`del ${fmtYmd(v.dateFrom)} al ${fmtYmd(v.dateTo)}`);
    } else if (v.dateFrom) {
      parts.push(`desde el ${fmtYmd(v.dateFrom)}`);
    } else if (v.dateTo) {
      parts.push(`hasta el ${fmtYmd(v.dateTo)}`);
    }
  }
  if (kind === 'weekday' && v.days?.length) {
    const names = WEEKDAYS.filter((w) => v.days!.includes(w.iso)).map(
      (w) => w.name,
    );
    parts.push(
      names.length > 1
        ? `los ${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
        : `los ${names[0]}`,
    );
  }
  if (qty) parts.push(qty);

  const when = parts.length ? parts.join(', ') : 'siempre';
  const bonus =
    v.freeSpots && v.freeSpots > 0
      ? v.freeSpots === 1
        ? ' · 1 lugar bonificado'
        : ` · ${v.freeSpots} lugares bonificados`
      : '';
  return `${when.charAt(0).toUpperCase()}${when.slice(1)} → ${price}${bonus}`;
}

const KIND_BADGE: Record<VariantKind, { label: string; bg: string; fg: string }> =
  {
    qty: { label: 'Por cantidad', bg: '#E7F0EC', fg: '#455a54' },
    weekday: { label: 'Por día', bg: '#f3e7db', fg: '#9d684e' },
    date: { label: 'Por fecha', bg: '#efe6f2', fg: '#6d5a78' },
    modality: { label: 'Modalidad', bg: '#f1efe9', fg: '#7a6e6f' },
  };

function VariantsEditor({
  variants,
  basePrice,
  onChange,
}: Readonly<{
  variants: PriceVariant[];
  basePrice: number;
  onChange: (v: PriceVariant[]) => void;
}>) {
  // Índice de la variante desplegada en modo edición (null = todas plegadas).
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  // Tipo elegido en el editor. Se guarda aparte porque deducirlo de las
  // condiciones no alcanza: "Por fecha" o "Por día" recién elegidos todavía
  // no tienen fecha ni días, y se leían como "Modalidad" (el botón no quedaba
  // marcado y no aparecían los campos).
  const [editingKind, setEditingKind] = useState<VariantKind | null>(null);

  function openEditor(i: number | null) {
    setEditingIdx(i);
    setEditingKind(null);
  }

  function patch(i: number, part: Partial<PriceVariant>) {
    onChange(variants.map((v, idx) => (idx === i ? { ...v, ...part } : v)));
  }
  function remove(i: number) {
    onChange(variants.filter((_, idx) => idx !== i));
    openEditor(null);
  }
  function add() {
    onChange([
      ...variants,
      { name: '', price: basePrice || 0, unit: 'PER_PERSON', active: true },
    ]);
    openEditor(variants.length);
  }

  /**
   * Cambiar el tipo limpia las condiciones que no le corresponden, así lo
   * guardado siempre coincide con lo que el admin ve elegido.
   */
  function setKind(i: number, kind: VariantKind) {
    const v = variants[i];
    const cleared: Partial<PriceVariant> = {
      minQty: undefined,
      maxQty: undefined,
      days: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      freeSpots: undefined,
      unit: 'PER_PERSON',
    };
    if (kind !== 'modality') cleared.freeSpots = v.freeSpots;
    if (kind === 'qty') cleared.minQty = v.minQty ?? 2;
    if (kind === 'weekday') cleared.days = v.days?.length ? v.days : [];
    if (kind === 'modality') cleared.unit = v.unit;
    patch(i, cleared);
    setEditingKind(kind);
  }

  return (
    <div className='flex flex-col gap-2 rounded-xl border border-[#e6dbcd] bg-white p-3'>
      <div className='flex items-center justify-between'>
        <span className='font-mono text-[11px] tracking-wider text-[#7a6e6f]'>
          PROMOS Y VARIANTES DE PRECIO
        </span>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={add}
          className='h-7 gap-1 border-[#e6dbcd] bg-white px-2 text-[12px] text-[#455a54] hover:bg-[#fbf5ef]'
        >
          <Plus className='h-3 w-3' />
          Agregar
        </Button>
      </div>

      {variants.length === 0 && (
        <p className='text-xs text-[#7a6e6f]'>
          Sin promos: se cobra siempre el precio por persona de arriba. Podés
          agregar promos por cantidad de personas, por día de semana, por fecha,
          o modalidades de pago alternativas.
        </p>
      )}

      {variants.map((v, i) =>
        editingIdx === i ? (
          <VariantForm
            key={i}
            variant={v}
            kind={editingKind ?? kindOf(v)}
            basePrice={basePrice}
            onPatch={(part) => patch(i, part)}
            onKind={(k) => setKind(i, k)}
            onDone={() => openEditor(null)}
            onRemove={() => remove(i)}
          />
        ) : (
          <VariantRow
            key={i}
            variant={v}
            onEdit={() => openEditor(i)}
            onToggle={(active) => patch(i, { active })}
            onRemove={() => remove(i)}
          />
        ),
      )}
    </div>
  );
}

/** Fila plegada: badge de tipo + nombre + frase humana + acciones. */
function VariantRow({
  variant: v,
  onEdit,
  onToggle,
  onRemove,
}: Readonly<{
  variant: PriceVariant;
  onEdit: () => void;
  onToggle: (active: boolean) => void;
  onRemove: () => void;
}>) {
  const badge = KIND_BADGE[kindOf(v)];
  const off = v.active === false;
  return (
    <div
      className={`flex flex-col gap-1 rounded-lg border p-2.5 ${
        off ? 'border-dashed border-[#e6dbcd] opacity-60' : 'border-[#e6dbcd]'
      }`}
    >
      <div className='flex items-center gap-2'>
        <span
          className='shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide'
          style={{ backgroundColor: badge.bg, color: badge.fg }}
        >
          {badge.label}
        </span>
        <span className='min-w-0 flex-1 truncate text-sm font-medium text-[#3d3338]'>
          {v.name || <span className='text-[#7a6e6f]'>Sin nombre</span>}
        </span>
        <Switch
          checked={!off}
          onCheckedChange={onToggle}
          title={off ? 'Apagada: no rige' : 'Encendida'}
          className='data-[state=checked]:bg-[#455a54]'
        />
        <IconBtn icon={Pencil} title='Editar' tone='verde' onClick={onEdit} />
        <IconBtn icon={Trash2} title='Quitar' tone='rojo' onClick={onRemove} />
      </div>
      <p className='pl-1 text-xs text-[#7a6e6f]'>
        {describeVariant(v)}
        {v.description ? ` · ${v.description}` : ''}
      </p>
    </div>
  );
}

/** Editor desplegado de una variante: tipo, precio, condición y detalle. */
function VariantForm({
  variant: v,
  kind,
  basePrice,
  onPatch,
  onKind,
  onDone,
  onRemove,
}: Readonly<{
  variant: PriceVariant;
  /** Tipo elegido (no se deduce: una fecha recién elegida aún no tiene día). */
  kind: VariantKind;
  basePrice: number;
  onPatch: (part: Partial<PriceVariant>) => void;
  onKind: (kind: VariantKind) => void;
  onDone: () => void;
  onRemove: () => void;
}>) {
  const incomplete =
    !v.name.trim() ||
    (kind === 'weekday' && !(v.days && v.days.length > 0)) ||
    (kind === 'date' && !v.dateFrom && !v.dateTo);

  function toggleDay(iso: number) {
    const days = v.days ?? [];
    onPatch({
      days: days.includes(iso)
        ? days.filter((d) => d !== iso)
        : [...days, iso].sort((a, b) => a - b),
    });
  }

  return (
    <div className='flex flex-col gap-3 rounded-lg border-2 border-[#9d684e]/40 bg-[#fbf5ef]/60 p-3'>
      {/* Tipo: define cuándo rige el precio */}
      <div className='flex flex-col gap-1.5'>
        <span className='text-[11px] font-medium text-[#455a54]/70'>
          ¿Cuándo rige este precio?
        </span>
        <div className='grid grid-cols-2 gap-1.5'>
          {KINDS.map(({ kind: k, label, hint, icon: Icon }) => (
            <button
              key={k}
              type='button'
              onClick={() => onKind(k)}
              className={`flex flex-col gap-0.5 rounded-lg border p-2 text-left transition ${
                kind === k
                  ? 'border-[#455a54] bg-white shadow-sm'
                  : 'border-[#e6dbcd] bg-white/60 hover:bg-white'
              }`}
            >
              <span className='flex items-center gap-1.5 text-[13px] font-medium text-[#3d3338]'>
                <Icon
                  className={`h-3.5 w-3.5 ${
                    kind === k ? 'text-[#9d684e]' : 'text-[#7a6e6f]'
                  }`}
                />
                {label}
              </span>
              <span className='text-[11px] leading-tight text-[#7a6e6f]'>
                {hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className='grid grid-cols-2 gap-2'>
        <FormField label='Nombre'>
          <Input
            value={v.name}
            onChange={(ev) => onPatch({ name: ev.target.value })}
            placeholder={
              kind === 'modality' ? 'Mensual' : 'Promo martes, Grupo de 5+…'
            }
            className={`${fieldCls} h-9 text-sm`}
          />
        </FormField>
        <FormField label={v.unit === 'FLAT' ? 'Precio total' : 'Precio por persona'}>
          <div className='flex items-center gap-2'>
            <span className='text-sm text-[#7a6e6f]'>$</span>
            <Input
              type='number'
              min={0}
              value={v.price ?? ''}
              onChange={(ev) =>
                onPatch({
                  price: ev.target.value ? Number(ev.target.value) : undefined,
                })
              }
              placeholder='mismo precio'
              className={`${fieldCls} h-9 text-sm`}
            />
          </div>
          {kind !== 'modality' && (
            <p className='mt-1 text-[11px] text-[#455a54]/60'>
              Vacío = no cambia el precio: la promo sólo suma el beneficio
              (regalo, lugares bonificados).
            </p>
          )}
        </FormField>
      </div>

      {/* Condición según el tipo */}
      {kind === 'qty' && (
        <FormField label='Cantidad de personas'>
          <div className='flex items-center gap-2 text-sm text-[#455a54]'>
            de
            <Input
              type='number'
              min={1}
              value={v.minQty ?? ''}
              onChange={(ev) =>
                onPatch({
                  minQty: ev.target.value ? Number(ev.target.value) : undefined,
                })
              }
              placeholder='5'
              className={`${fieldCls} h-9 w-20 text-sm`}
            />
            a
            <Input
              type='number'
              min={1}
              value={v.maxQty ?? ''}
              onChange={(ev) =>
                onPatch({
                  maxQty: ev.target.value ? Number(ev.target.value) : undefined,
                })
              }
              placeholder='sin tope'
              className={`${fieldCls} h-9 w-24 text-sm`}
            />
            personas
          </div>
          <p className='mt-1 text-[11px] text-[#455a54]/60'>
            Dejá &ldquo;a&rdquo; vacío para &ldquo;5 o más&rdquo;. Si hay dos
            promos que aplican, gana la de más personas.
          </p>
        </FormField>
      )}

      {kind === 'weekday' && (
        <FormField label='Qué días'>
          <div className='flex flex-wrap gap-1.5'>
            {WEEKDAYS.map((w) => {
              const on = v.days?.includes(w.iso) ?? false;
              return (
                <button
                  key={w.iso}
                  type='button'
                  onClick={() => toggleDay(w.iso)}
                  className={`h-9 w-11 rounded-lg border text-[13px] font-medium transition ${
                    on
                      ? 'border-[#455a54] bg-[#455a54] text-white'
                      : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
                  }`}
                >
                  {w.short}
                </button>
              );
            })}
          </div>
          <p className='mt-1 text-[11px] text-[#455a54]/60'>
            Rige esos días todas las semanas, hasta que la apagues.
          </p>
        </FormField>
      )}

      {kind === 'date' && (
        <FormField label='Qué fechas'>
          <div className='flex flex-wrap items-center gap-2'>
            <DatePicker
              value={v.dateFrom}
              onChange={(dateFrom) =>
                onPatch({
                  dateFrom,
                  // Autocompletar "hasta" para el caso común de un solo día.
                  dateTo: v.dateTo && v.dateTo >= dateFrom ? v.dateTo : dateFrom,
                })
              }
              placeholder='Desde'
              className='w-36'
            />
            <span className='text-sm text-[#7a6e6f]'>hasta</span>
            <DatePicker
              value={v.dateTo}
              onChange={(dateTo) => onPatch({ dateTo })}
              placeholder='Hasta'
              className='w-36'
            />
          </div>
          <p className='mt-1 text-[11px] text-[#455a54]/60'>
            Misma fecha en los dos = promo de un solo día.
          </p>
        </FormField>
      )}

      {kind === 'modality' && (
        <FormField label='Cómo se cobra'>
          <div className='flex gap-1.5'>
            {(
              [
                ['PER_PERSON', 'Por persona'],
                ['FLAT', 'Precio total fijo'],
              ] as const
            ).map(([unit, label]) => (
              <button
                key={unit}
                type='button'
                onClick={() => onPatch({ unit })}
                className={`h-9 rounded-lg border px-3 text-[13px] font-medium transition ${
                  v.unit === unit
                    ? 'border-[#455a54] bg-[#455a54] text-white'
                    : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className='mt-1 text-[11px] text-[#455a54]/60'>
            Las modalidades no se cobran solas: el bot las menciona al pasar
            precios (ej. escuelita &ldquo;Mensual&rdquo; $80) y el pago se
            coordina.
          </p>
        </FormField>
      )}

      {kind !== 'modality' && (
        <FormField label='Lugares bonificados (opcional)'>
          <div className='flex items-center gap-2 text-sm text-[#455a54]'>
            <Input
              type='number'
              min={0}
              value={v.freeSpots ?? ''}
              onChange={(ev) =>
                onPatch({
                  freeSpots: ev.target.value
                    ? Number(ev.target.value)
                    : undefined,
                })
              }
              placeholder='0'
              className={`${fieldCls} h-9 w-20 text-sm`}
            />
            <span className='text-[12px] text-[#7a6e6f]'>
              lugares gratis: entran todos, se cobran esa cantidad menos
            </span>
          </div>
        </FormField>
      )}

      <FormField label='Qué incluye (opcional)'>
        <Input
          value={v.description ?? ''}
          onChange={(ev) => onPatch({ description: ev.target.value })}
          placeholder='velas de cumpleaños, torta + pieza de regalo…'
          className={`${fieldCls} h-9 text-sm`}
        />
      </FormField>

      {/* Vista previa: la misma frase que va a ver el equipo en la lista */}
      <div className='rounded-lg border border-[#e6dbcd] bg-white px-3 py-2 text-xs text-[#455a54]'>
        <span className='font-mono text-xs tracking-wider text-[#7a6e6f]'>
          ASÍ QUEDA:{' '}
        </span>
        {describeVariant(v, kind)}
        {kind !== 'modality' &&
          basePrice > 0 &&
          v.price != null &&
          v.price !== basePrice && (
          <span className='text-[#7a6e6f]'>
            {' '}
            (precio normal: {fmtPrice(basePrice)})
          </span>
        )}
      </div>

      <div className='flex items-center justify-between'>
        <button
          type='button'
          onClick={onRemove}
          className='inline-flex items-center gap-1 text-xs text-[#a33] hover:opacity-70'
        >
          <Trash2 className='h-3.5 w-3.5' />
          Quitar
        </button>
        <Button
          type='button'
          variant='verde'
          size='sm'
          onClick={onDone}
          disabled={incomplete}
          className='h-8 px-4'
        >
          Listo
        </Button>
      </div>
      {incomplete && (
        <p className='text-[11px] text-[#9d684e]'>
          {!v.name.trim()
            ? 'Ponele un nombre para poder guardarla.'
            : kind === 'weekday'
              ? 'Elegí al menos un día.'
              : 'Elegí las fechas en las que rige.'}
        </p>
      )}
    </div>
  );
}

// Día en singular para el selector del horario propio.
const DAY_LABEL = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/** Día ISO (1=lunes … 7=domingo) de una fecha 'YYYY-MM-DD'. */
const isoWeekday = (ymd: string) => new Date(`${ymd}T12:00:00Z`).getUTCDay() || 7;

type ScheduleMode = 'general' | 'weekly' | 'once';

const NEW_WEEKLY: OwnSlot = { weekday: 3, start: '18:00' };
const NEW_ONCE: OwnSlot = { weekday: 6, start: '15:00', date: '' };

const SCHEDULE_MODES: Array<{
  mode: ScheduleMode;
  title: string;
  subtitle: string;
  help: string;
}> = [
  {
    mode: 'general',
    title: 'Turnos del salón',
    subtitle: 'Cualquier día, en los horarios generales',
    help: 'Se ofrece en los turnos generales; el lugar lo limitan el cupo y las mesas libres.',
  },
  {
    mode: 'weekly',
    title: 'Todas las semanas',
    subtitle: 'Días y horas fijos (ej. miércoles 18:00)',
    help: 'Se ofrece SÓLO en estos días y horas. El límite es el cupo; el espacio se aparta con un bloqueo de mesas.',
  },
  {
    mode: 'once',
    title: 'Fecha única',
    subtitle: 'Un evento (ej. Día de la Madre)',
    help: 'La web, el bot y la agenda la ofrecen sólo en esa fecha y a esa hora.',
  },
];

/**
 * Cuándo se reserva la experiencia: en los turnos generales (sin horario
 * propio), en días y horas fijos cada semana (ej. Escuelita: miércoles 18:00)
 * o en fechas únicas para un evento (ej. Día de la Madre: sábado 17/10 15:00).
 * Con horario propio se ofrece SÓLO ahí y el lugar es el cupo de la
 * experiencia (el espacio lo aparta un bloqueo de mesas).
 */
function OwnScheduleEditor({
  value,
  onChange,
}: {
  value: OwnSlot[];
  onChange: (v: OwnSlot[]) => void;
}) {
  // El modo sale de los horarios cargados; una lista mezclada (semanal +
  // fecha única, de antes) se muestra como semanal con todas sus filas.
  const mode: ScheduleMode =
    value.length === 0
      ? 'general'
      : value.every((s) => s.date !== undefined)
        ? 'once'
        : 'weekly';

  const update = (i: number, patch: Partial<OwnSlot>) =>
    onChange(value.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  // Cambiar de modo conserva las filas que ya son de ese tipo.
  function pick(next: ScheduleMode) {
    if (next === mode) return;
    if (next === 'general') return onChange([]);
    const once = next === 'once';
    const kept = value.filter((s) => (s.date !== undefined) === once);
    onChange(kept.length > 0 ? kept : [once ? NEW_ONCE : NEW_WEEKLY]);
  }

  return (
    <div className='flex flex-col gap-3'>
      <div
        role='radiogroup'
        aria-label='Cuándo se puede reservar'
        className='grid gap-2 sm:grid-cols-3'
      >
        {SCHEDULE_MODES.map((m) => {
          const active = m.mode === mode;
          return (
            <button
              key={m.mode}
              type='button'
              role='radio'
              aria-checked={active}
              onClick={() => pick(m.mode)}
              className={`flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left transition ${
                active
                  ? 'border-[#455a54] bg-[#455a54] text-white'
                  : 'border-[#e6dbcd] bg-[#fbf5ef] text-[#3d3338] hover:border-[#455a54]/50'
              }`}
            >
              <span className='text-sm font-semibold'>{m.title}</span>
              <span
                className={`text-xs leading-snug ${active ? 'text-white/80' : 'text-texto-suave'}`}
              >
                {m.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      <p className='text-xs leading-snug text-texto-suave'>
        {SCHEDULE_MODES.find((m) => m.mode === mode)?.help}
      </p>

      {value.map((slot, i) => (
        <div key={i} className='flex flex-wrap items-center gap-2'>
          {slot.date !== undefined ? (
            <DatePicker
              value={slot.date}
              onChange={(date) =>
                update(i, { date, ...(date ? { weekday: isoWeekday(date) } : {}) })
              }
              disablePast
              placeholder='Fecha del evento'
              className='w-44'
            />
          ) : (
            <Select
              value={String(slot.weekday)}
              onValueChange={(v) => update(i, { weekday: Number(v) })}
            >
              <SelectTrigger className={`w-40 ${fieldCls}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((d) => (
                  <SelectItem key={d.iso} value={String(d.iso)}>
                    {DAY_LABEL[d.iso]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Input
            type='time'
            value={slot.start}
            onChange={(ev) => update(i, { start: ev.target.value })}
            className={`w-32 ${fieldCls}`}
          />
          <IconBtn
            icon={X}
            title='Quitar horario'
            tone='rojo'
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          />
        </div>
      ))}

      {mode !== 'general' && (
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='w-fit border-[#e6dbcd] text-[#455a54]'
          onClick={() => onChange([...value, mode === 'once' ? NEW_ONCE : NEW_WEEKLY])}
        >
          <Plus className='mr-1 h-4 w-4' />
          {mode === 'once' ? 'Otra fecha' : 'Otro día'}
        </Button>
      )}
    </div>
  );
}
