'use client';

// Producción de cocina: cocina anota lo que va preparando (tortas, cookies,
// el buffet, lo que sea) con su cantidad. Por día y, si es para un grupo, con
// la reserva. Abajo, lo producido en la semana sumado por ítem.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AR_TZ } from '@/lib/reservas-format';
import { errorText } from '@/lib/api-error-messages';
import {
  ResponsableField,
  useResponsable,
} from '@/components/dashboard/responsable-field';
import {
  kitchenProductionAdmin,
  type KitchenProductionItem,
} from '@/services/kitchen-production.admin.service';
import {
  reservationsAdmin,
  type ReservationItem,
} from '@/services/reservations.admin.service';

const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

const UNITS = ['u.', 'kg', 'porciones', 'bandejas', 'litros'];
const NO_RES = 'none';

const todayAR = () => new Date().toLocaleDateString('en-CA', { timeZone: AR_TZ });

function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function mondayOf(ymd: string): string {
  const dow = new Date(`${ymd}T12:00:00Z`).getUTCDay();
  return addDays(ymd, dow === 0 ? -6 : 1 - dow);
}

function dayLabel(ymd: string): string {
  const s = new Date(`${ymd}T12:00:00Z`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    timeZone: 'UTC',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: AR_TZ,
  });

// "1,5" o "1.5" → 1.5. Vacío o inválido → NaN.
const parseQty = (s: string) => Number(s.trim().replace(',', '.'));
const fmtQty = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toLocaleString('es-AR', { maximumFractionDigits: 2 });

interface FormState {
  item: string;
  quantity: string;
  unit: string;
  reservationId: string;
  note: string;
}

const EMPTY: FormState = { item: '', quantity: '', unit: 'u.', reservationId: NO_RES, note: '' };

export function CocinaProduccion() {
  const confirm = useConfirm();
  const responsable = useResponsable();
  const [day, setDay] = useState(todayAR);
  const [week, setWeek] = useState<KitchenProductionItem[]>([]);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [suggestions, setSuggestions] = useState<{ item: string; unit?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  const monday = mondayOf(day);
  const sunday = addDays(monday, 6);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setWeek(await kitchenProductionAdmin.list(monday, sunday));
    } catch (e) {
      showToast.error(errorText(e, 'No se pudo cargar la producción'));
    } finally {
      setLoading(false);
    }
  }, [monday, sunday]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadSuggestions = useCallback(() => {
    kitchenProductionAdmin
      .suggestions()
      .then(setSuggestions)
      .catch(() => undefined);
  }, []);
  useEffect(loadSuggestions, [loadSuggestions]);

  // Reservas confirmadas del día, para anotar para qué grupo fue.
  useEffect(() => {
    let alive = true;
    reservationsAdmin
      .listReservations({ from: day, to: day, status: 'CONFIRMED', sort: 'startAt', limit: 200 })
      .then((res) => alive && setReservations(res.items))
      .catch(() => alive && setReservations([]));
    return () => {
      alive = false;
    };
  }, [day]);

  const ofDay = useMemo(() => week.filter((p) => p.day === day), [week, day]);

  // La semana sumada por ítem y unidad ("Cookies · 48 u.").
  const weekTotals = useMemo(() => {
    const map = new Map<string, { item: string; unit?: string; total: number }>();
    for (const p of week) {
      const key = `${p.item.toLocaleLowerCase('es')}|${p.unit ?? ''}`;
      const cur = map.get(key) ?? { item: p.item, unit: p.unit, total: 0 };
      cur.total += p.quantity;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => a.item.localeCompare(b.item, 'es'));
  }, [week]);

  function resetForm() {
    setForm(EMPTY);
    setEditingId(null);
  }

  function startEdit(p: KitchenProductionItem) {
    setEditingId(p.id);
    setForm({
      item: p.item,
      quantity: fmtQty(p.quantity),
      unit: p.unit ?? '',
      reservationId: p.reservationId ?? NO_RES,
      note: p.note ?? '',
    });
  }

  async function save() {
    const item = form.item.trim();
    const quantity = parseQty(form.quantity);
    if (!item) return showToast.error('Poné qué se preparó');
    if (!Number.isFinite(quantity) || quantity < 0) return showToast.error('Poné la cantidad');
    if (!editingId && responsable.shared && !responsable.value.trim()) {
      return showToast.error('Elegí quién lo hizo');
    }
    const reservationId = form.reservationId === NO_RES ? '' : form.reservationId;
    setSaving(true);
    try {
      if (editingId) {
        await kitchenProductionAdmin.update(editingId, {
          item,
          quantity,
          unit: form.unit.trim(),
          reservationId,
          note: form.note.trim(),
        });
        showToast.success('Registro corregido');
      } else {
        await kitchenProductionAdmin.create({
          day,
          item,
          quantity,
          ...(form.unit.trim() && { unit: form.unit.trim() }),
          ...(reservationId && { reservationId }),
          ...(form.note.trim() && { note: form.note.trim() }),
          ...(responsable.value.trim() && { registeredBy: responsable.value.trim() }),
        });
        showToast.success(`${item} anotado`);
      }
      resetForm();
      await load();
      loadSuggestions();
    } catch (e) {
      showToast.error(errorText(e, 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: KitchenProductionItem) {
    const ok = await confirm({
      title: 'Borrar registro',
      description: `${p.item} · ${fmtQty(p.quantity)} ${p.unit ?? ''}. Se borra de la producción.`,
      confirmLabel: 'Borrar',
    });
    if (!ok) return;
    try {
      await kitchenProductionAdmin.remove(p.id);
      if (editingId === p.id) resetForm();
      await load();
    } catch (e) {
      showToast.error(errorText(e, 'No se pudo borrar'));
    }
  }

  const isToday = day === todayAR();

  return (
    <div className='flex flex-col gap-4'>
      {/* Día */}
      <div className='flex flex-wrap items-center gap-2'>
        <Button type='button' variant='ghost' size='icon' onClick={() => { setDay(addDays(day, -1)); resetForm(); }} aria-label='Día anterior' className='bg-white'>
          <ChevronLeft className='h-4 w-4' />
        </Button>
        <div className='w-48'>
          <DatePicker value={day} onChange={(d) => { if (d) { setDay(d); resetForm(); } }} />
        </div>
        <Button type='button' variant='ghost' size='icon' onClick={() => { setDay(addDays(day, 1)); resetForm(); }} aria-label='Día siguiente' className='bg-white'>
          <ChevronRight className='h-4 w-4' />
        </Button>
        <span className='px-1 text-sm font-semibold text-[#455a54]'>
          {isToday ? 'Hoy · ' : ''}
          {dayLabel(day)}
        </span>
        {!isToday && (
          <Button type='button' variant='ghost' size='sm' onClick={() => { setDay(todayAR()); resetForm(); }} className='bg-white text-[#455a54]'>
            Volver a hoy
          </Button>
        )}
      </div>

      {/* Cargar / corregir */}
      <div className='flex flex-col gap-3 rounded-2xl border border-[#e6dbcd] bg-white p-4'>
        <h3 className='text-sm font-semibold text-[#455a54]'>
          {editingId ? 'Corregir registro' : 'Anotar lo que preparaste'}
        </h3>

        {responsable.shared && !editingId && (
          <div className='max-w-xs'>
            <ResponsableField value={responsable.value} onChange={responsable.onChange} label='¿Quién lo hizo?' />
          </div>
        )}

        <div className='grid gap-2.5 sm:grid-cols-[1fr_7rem_9rem]'>
          <Input
            value={form.item}
            onChange={(e) => setForm({ ...form, item: e.target.value })}
            placeholder='Qué: torta de chocolate, cookies, buffet…'
            aria-label='Qué se preparó'
            className={fieldCls}
          />
          <Input
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            inputMode='decimal'
            placeholder='Cantidad'
            aria-label='Cantidad'
            className={fieldCls}
          />
          <Input
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            placeholder='Unidad'
            aria-label='Unidad'
            className={fieldCls}
          />
        </div>

        <div className='flex flex-wrap gap-1.5'>
          {UNITS.map((u) => (
            <button
              key={u}
              type='button'
              onClick={() => setForm({ ...form, unit: u })}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                form.unit === u
                  ? 'border-[#455a54] bg-[#455a54] text-white'
                  : 'border-[#e6dbcd] bg-white text-[#7a6e6f] hover:text-[#455a54]',
              )}
            >
              {u}
            </button>
          ))}
        </div>

        {suggestions.length > 0 && !editingId && (
          <div className='flex flex-col gap-1.5'>
            <span className='text-[11px] text-[#7a6e6f]'>Lo de siempre:</span>
            <div className='flex flex-wrap gap-1.5'>
              {suggestions.slice(0, 12).map((s) => (
                <button
                  key={s.item}
                  type='button'
                  onClick={() => setForm({ ...form, item: s.item, unit: s.unit ?? form.unit })}
                  className='rounded-full border border-[#e6dbcd] bg-[#fbf5ef] px-2.5 py-1 text-xs text-[#455a54] hover:border-[#9d684e]'
                >
                  {s.item}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className='grid gap-2.5 sm:grid-cols-2'>
          <Select value={form.reservationId} onValueChange={(v) => setForm({ ...form, reservationId: v })}>
            <SelectTrigger className={cn('h-9 text-sm', fieldCls)} aria-label='Para qué reserva'>
              <SelectValue placeholder='Para qué reserva' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_RES}>Sin reserva (producción del día)</SelectItem>
              {reservations.map((r) => (
                <SelectItem key={r._id} value={r._id}>
                  {timeOf(r.startAt)} · {r.customerName || r.experienceName} · {r.quantity} pers.
                </SelectItem>
              ))}
              {/* La reserva ya cargada aunque no sea de este día. */}
              {form.reservationId !== NO_RES &&
                !reservations.some((r) => r._id === form.reservationId) && (
                  <SelectItem value={form.reservationId}>
                    {week.find((p) => p.reservationId === form.reservationId)?.reservationLabel ?? 'Reserva elegida'}
                  </SelectItem>
                )}
            </SelectContent>
          </Select>
          <Input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder='Nota (opcional)'
            aria-label='Nota'
            className={fieldCls}
          />
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button type='button' variant='verde' disabled={saving} onClick={save} className='gap-2'>
            {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : !editingId && <Plus className='h-4 w-4' />}
            {editingId ? 'Guardar cambios' : 'Anotar'}
          </Button>
          {editingId && (
            <Button type='button' variant='outline' onClick={resetForm} className='border-[#e6dbcd] bg-white text-[#455a54]'>
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {/* Lo del día */}
      <div className='flex flex-col gap-2 rounded-2xl border border-[#e6dbcd] bg-white p-4'>
        <h3 className='text-sm font-semibold text-[#455a54]'>Producción del día</h3>
        {loading ? (
          <div className='flex justify-center p-4'>
            <Loader2 className='h-5 w-5 animate-spin text-[#455a54]' />
          </div>
        ) : ofDay.length === 0 ? (
          <p className='py-2 text-sm text-[#7a6e6f]'>Todavía no se anotó nada este día.</p>
        ) : (
          <div className='divide-y divide-[#f1ebe2]'>
            {ofDay.map((p) => (
              <div
                key={p.id}
                className={cn('flex items-start gap-3 py-2', editingId === p.id && 'bg-[#E7F0EC]/60')}
              >
                <div className='min-w-0 flex-1'>
                  <p className='text-sm text-[#3d3338]'>
                    <span className='font-semibold'>{p.item}</span>
                    {' · '}
                    <span className='font-mono'>
                      {fmtQty(p.quantity)}
                      {p.unit ? ` ${p.unit}` : ''}
                    </span>
                  </p>
                  <p className='text-xs text-[#7a6e6f]'>
                    {[
                      p.reservationLabel && `Para ${p.reservationLabel}`,
                      p.note,
                      p.byName && `Anotó ${p.byName}`,
                      p.createdAt && timeOf(p.createdAt),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <button type='button' onClick={() => startEdit(p)} aria-label='Corregir' className='mt-1 text-[#7a6e6f] hover:text-[#455a54]'>
                  <Pencil className='h-4 w-4' />
                </button>
                <button type='button' onClick={() => remove(p)} aria-label='Borrar' className='mt-1 text-[#a99f92] hover:text-[#a33]'>
                  <Trash2 className='h-4 w-4' />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* La semana sumada */}
      <div className='flex flex-col gap-2 rounded-2xl border border-[#e6dbcd] bg-white p-4'>
        <h3 className='text-sm font-semibold text-[#455a54]'>
          Semana del {dayLabel(monday).replace(/^\S+ /, '')} al {dayLabel(sunday).replace(/^\S+ /, '')}
        </h3>
        {weekTotals.length === 0 ? (
          <p className='py-2 text-sm text-[#7a6e6f]'>Sin producción anotada esta semana.</p>
        ) : (
          <div className='flex flex-wrap gap-2'>
            {weekTotals.map((t) => (
              <span
                key={`${t.item}|${t.unit ?? ''}`}
                className='rounded-xl border border-[#e6dbcd] bg-[#fbf5ef] px-3 py-1.5 text-[13px] text-[#3d3338]'
              >
                {t.item} · <strong>{fmtQty(t.total)}</strong>
                {t.unit ? ` ${t.unit}` : ''}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
