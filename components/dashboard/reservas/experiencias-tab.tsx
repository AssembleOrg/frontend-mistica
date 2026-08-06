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
  type PriceVariant,
} from '@/services/reservations.admin.service';
import { FilterChip, IconBtn, StatusBadge } from './_shared';

const EMPTY: CreateExperienceInput = {
  name: '',
  description: '',
  aliases: [],
  priceVariants: [],
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
      priceVariants: e.priceVariants ?? [],
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
          <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
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
              <VariantsEditor
                variants={form.priceVariants ?? []}
                basePrice={form.basePrice}
                onChange={(priceVariants) => setForm({ ...form, priceVariants })}
              />
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
function describeVariant(v: PriceVariant): string {
  const price =
    v.price == null
      ? 'mismo precio'
      : v.unit === 'FLAT'
        ? `${fmtPrice(v.price)} total`
        : `${fmtPrice(v.price)} por persona`;
  const kind = kindOf(v);
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

  function patch(i: number, part: Partial<PriceVariant>) {
    onChange(variants.map((v, idx) => (idx === i ? { ...v, ...part } : v)));
  }
  function remove(i: number) {
    onChange(variants.filter((_, idx) => idx !== i));
    setEditingIdx(null);
  }
  function add() {
    onChange([
      ...variants,
      { name: '', price: basePrice || 0, unit: 'PER_PERSON', active: true },
    ]);
    setEditingIdx(variants.length);
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
            basePrice={basePrice}
            onPatch={(part) => patch(i, part)}
            onKind={(k) => setKind(i, k)}
            onDone={() => setEditingIdx(null)}
            onRemove={() => remove(i)}
          />
        ) : (
          <VariantRow
            key={i}
            variant={v}
            onEdit={() => setEditingIdx(i)}
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
          className='shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide'
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
  basePrice,
  onPatch,
  onKind,
  onDone,
  onRemove,
}: Readonly<{
  variant: PriceVariant;
  basePrice: number;
  onPatch: (part: Partial<PriceVariant>) => void;
  onKind: (kind: VariantKind) => void;
  onDone: () => void;
  onRemove: () => void;
}>) {
  const kind = kindOf(v);
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
        <Field label='Nombre'>
          <Input
            value={v.name}
            onChange={(ev) => onPatch({ name: ev.target.value })}
            placeholder={
              kind === 'modality' ? 'Mensual' : 'Promo martes, Grupo de 5+…'
            }
            className={`${fieldCls} h-9 text-sm`}
          />
        </Field>
        <Field label={v.unit === 'FLAT' ? 'Precio total' : 'Precio por persona'}>
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
        </Field>
      </div>

      {/* Condición según el tipo */}
      {kind === 'qty' && (
        <Field label='Cantidad de personas'>
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
        </Field>
      )}

      {kind === 'weekday' && (
        <Field label='Qué días'>
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
        </Field>
      )}

      {kind === 'date' && (
        <Field label='Qué fechas'>
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
        </Field>
      )}

      {kind === 'modality' && (
        <Field label='Cómo se cobra'>
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
        </Field>
      )}

      {kind !== 'modality' && (
        <Field label='Lugares bonificados (opcional)'>
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
        </Field>
      )}

      <Field label='Qué incluye (opcional)'>
        <Input
          value={v.description ?? ''}
          onChange={(ev) => onPatch({ description: ev.target.value })}
          placeholder='velas de cumpleaños, torta + pieza de regalo…'
          className={`${fieldCls} h-9 text-sm`}
        />
      </Field>

      {/* Vista previa: la misma frase que va a ver el equipo en la lista */}
      <div className='rounded-lg border border-[#e6dbcd] bg-white px-3 py-2 text-xs text-[#455a54]'>
        <span className='font-mono text-[10px] tracking-wider text-[#7a6e6f]'>
          ASÍ QUEDA:{' '}
        </span>
        {describeVariant(v)}
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
