'use client';

// Editor de EDICIONES ESPECIALES de una experiencia (Halloween, Navidad…).
// Entre sus fechas la experiencia ES esa edición: texto, precio, bonos, extras
// y horarios propios; la versión habitual no se ofrece esos días. Fuera de la
// ventana no tiene efecto, así que se activa y se apaga sola.

import { useState, type ReactNode } from 'react';
import { CalendarHeart, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/date-picker';
import { FormField } from '@/components/ui/form-section';
import { fmtPrice } from '@/lib/reservas-format';
import {
  SPECIAL_STATUS_COLOR,
  SPECIAL_STATUS_LABEL,
  aliasKey,
  emptySpecial,
  fmtSpecialDay,
  specialDatesLabel,
  specialStatus,
} from '@/lib/specials';
import type { PriceVariant, SpecialEdition } from '@/services/reservations.admin.service';
import { IconBtn, StatusBadge } from './_shared';

const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

export function SpecialsEditor({
  value,
  basePrice,
  experienceName,
  onChange,
  renderVariants,
}: Readonly<{
  value: SpecialEdition[];
  basePrice: number;
  experienceName: string;
  onChange: (next: SpecialEdition[]) => void;
  /** Editor de promos de la experiencia, reusado para los bonos de la edición. */
  renderVariants: (
    variants: PriceVariant[],
    basePrice: number,
    onChange: (v: PriceVariant[]) => void,
  ) => ReactNode;
}>) {
  // Edición desplegada (null = todas plegadas).
  const [open, setOpen] = useState<number | null>(null);

  const update = (i: number, patch: Partial<SpecialEdition>) =>
    onChange(value.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  function add() {
    onChange([...value, emptySpecial()]);
    setOpen(value.length);
  }

  function remove(i: number) {
    onChange(value.filter((_, j) => j !== i));
    setOpen(null);
  }

  return (
    <div className='flex flex-col gap-3'>
      <p className='text-xs leading-snug text-texto-suave'>
        Una fecha especial es {experienceName ? <b>{experienceName}</b> : 'esta experiencia'} con
        otra propuesta por unos días (Halloween, Navidad, Día de la Madre). En esas fechas la
        experiencia <b>es</b> la edición: su texto, su precio y lo que incluye; la versión de
        siempre no se ofrece esos días. Se activa y se apaga sola según las fechas.
      </p>

      {value.length === 0 && (
        <p className='rounded-xl border border-dashed border-[#e6dbcd] bg-[#fbf5ef] p-4 text-center text-sm text-texto-suave'>
          Todavía no hay fechas especiales.
        </p>
      )}

      {value.map((s, i) => {
        const status = specialStatus(s);
        const [bg, fg] = SPECIAL_STATUS_COLOR[status];
        const isOpen = open === i;
        return (
          <div key={s._id ?? `new-${i}`} className='rounded-xl border border-linea bg-white'>
            <div className='flex flex-wrap items-center gap-2 px-4 py-3'>
              <CalendarHeart className='h-4 w-4 shrink-0 text-[#9d684e]' />
              <div className='flex min-w-0 flex-1 flex-col'>
                <span className='truncate text-sm font-semibold text-[#3d3338]'>
                  {s.name || 'Edición sin nombre'}
                </span>
                <span className='text-xs text-texto-suave'>
                  {s.dateFrom && s.dateTo ? `Se hace ${specialDatesLabel(s)}` : 'Sin fechas todavía'}
                  {' · '}
                  {s.price != null ? fmtPrice(s.price) : 'precio habitual'}
                  {status === 'PROXIMA' && s.announceFrom
                    ? ` · se ofrece desde el ${fmtSpecialDay(s.announceFrom)}`
                    : ''}
                </span>
              </div>
              <StatusBadge label={SPECIAL_STATUS_LABEL[status]} bg={bg} fg={fg} />
              <IconBtn
                icon={isOpen ? X : Pencil}
                title={isOpen ? 'Cerrar' : 'Editar'}
                onClick={() => setOpen(isOpen ? null : i)}
              />
              <IconBtn icon={Trash2} title='Quitar' tone='rojo' onClick={() => remove(i)} />
            </div>

            {isOpen && (
              <div className='flex flex-col gap-4 border-t border-linea p-4'>
                <FormField label='Nombre de la edición'>
                  <Input
                    value={s.name}
                    onChange={(ev) => update(i, { name: ev.target.value })}
                    placeholder='Especial Halloween'
                    className={fieldCls}
                    autoFocus={!s.name}
                  />
                </FormField>

                <div className='grid gap-3 sm:grid-cols-2'>
                  <FormField label='Se hace desde'>
                    <DatePicker
                      value={s.dateFrom}
                      onChange={(dateFrom) =>
                        update(i, {
                          dateFrom,
                          // Por defecto, un solo día: el fin acompaña al inicio.
                          dateTo: !s.dateTo || s.dateTo < dateFrom ? dateFrom : s.dateTo,
                        })
                      }
                      placeholder='Primer día'
                    />
                  </FormField>
                  <FormField label='Hasta' hint='El mismo día si es una sola fecha.'>
                    <DatePicker
                      value={s.dateTo}
                      onChange={(dateTo) => update(i, { dateTo })}
                      placeholder='Último día'
                    />
                  </FormField>
                </div>

                <FormField
                  label='Se ofrece desde (opcional)'
                  hint='Antes de ese día el bot sólo avisa cuándo abren las reservas y esas fechas no se pueden reservar. Vacío = se ofrece apenas guardás.'
                >
                  <DatePicker
                    value={s.announceFrom ?? ''}
                    onChange={(announceFrom) => update(i, { announceFrom })}
                    placeholder='Apenas se guarda'
                    clearable
                    className='sm:w-1/2'
                  />
                </FormField>

                <FormField
                  label='Activadores del bot'
                  hint='Cómo la pide la gente en el chat ("halloween", "noche de brujas"). El nombre de la edición ya cuenta. No pueden ser el nombre ni un apodo de una experiencia.'
                >
                  <ChipsInput
                    value={s.aliases ?? []}
                    onChange={(aliases) => update(i, { aliases })}
                    placeholder='halloween, noche de brujas…'
                    isAlias
                  />
                </FormField>

                <FormField
                  label='Texto de la edición'
                  hint='Es lo que cuenta el bot y lo que se ve en la web esos días, en lugar de la descripción de siempre.'
                >
                  <Textarea
                    rows={4}
                    value={s.description ?? ''}
                    onChange={(ev) => update(i, { description: ev.target.value })}
                    placeholder='Una tarde temática: pintás una calabaza de cerámica, con mesa dulce…'
                    className={`${fieldCls} text-sm`}
                  />
                </FormField>

                <FormField
                  label='Precio por persona'
                  hint={
                    s.price != null
                      ? `${fmtPrice(s.price)} · habitual ${fmtPrice(basePrice)}`
                      : `Vacío = el precio habitual (${fmtPrice(basePrice)})`
                  }
                >
                  <Input
                    type='number'
                    min={0}
                    value={s.price ?? ''}
                    onChange={(ev) =>
                      update(i, {
                        price: ev.target.value === '' ? undefined : Number(ev.target.value),
                      })
                    }
                    placeholder={String(basePrice)}
                    className={`${fieldCls} sm:w-1/2`}
                  />
                </FormField>

                <FormField
                  label='Incluye'
                  hint='Lo que suma la edición sin costo. Una cosa por vez.'
                >
                  <ChipsInput
                    value={s.included ?? []}
                    onChange={(included) => update(i, { included })}
                    placeholder='Calabaza de cerámica, mesa dulce temática…'
                  />
                </FormField>

                <FormField
                  label='Extras opcionales'
                  hint='Con precio. El bot los informa y el equipo los suma a la reserva desde su detalle; no entran en la seña.'
                >
                  <div className='flex flex-col gap-2'>
                    {(s.extras ?? []).map((x, j) => (
                      <div key={j} className='flex flex-wrap items-center gap-2'>
                        <Input
                          value={x.name}
                          onChange={(ev) =>
                            update(i, {
                              extras: (s.extras ?? []).map((e, k) =>
                                k === j ? { ...e, name: ev.target.value } : e,
                              ),
                            })
                          }
                          placeholder='Vela aromática'
                          className={`${fieldCls} min-w-40 flex-1`}
                        />
                        <Input
                          type='number'
                          min={0}
                          value={x.price || ''}
                          onChange={(ev) =>
                            update(i, {
                              extras: (s.extras ?? []).map((e, k) =>
                                k === j ? { ...e, price: Number(ev.target.value) || 0 } : e,
                              ),
                            })
                          }
                          placeholder='Precio'
                          className={`${fieldCls} w-32`}
                        />
                        <IconBtn
                          icon={X}
                          title='Quitar extra'
                          tone='rojo'
                          onClick={() =>
                            update(i, { extras: (s.extras ?? []).filter((_, k) => k !== j) })
                          }
                        />
                      </div>
                    ))}
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='w-fit border-[#e6dbcd] text-[#455a54]'
                      onClick={() =>
                        update(i, { extras: [...(s.extras ?? []), { name: '', price: 0 }] })
                      }
                    >
                      <Plus className='mr-1 h-4 w-4' /> Agregar extra
                    </Button>
                  </div>
                </FormField>

                <FormField
                  label='Horarios especiales'
                  hint='Vacío = los horarios de siempre de la experiencia. Si cargás alguno, esos días se ofrece sólo a esas horas (por cupo, sin mesas).'
                >
                  <div className='flex flex-col gap-2'>
                    {(s.schedule ?? []).map((slot, j) => {
                      const setSlot = (patch: { start?: string; date?: string | undefined }) =>
                        update(i, {
                          schedule: (s.schedule ?? []).map((e, k) =>
                            k === j ? { ...e, ...patch } : e,
                          ),
                        });
                      return (
                        <div key={j} className='flex flex-wrap items-center gap-2'>
                          <Input
                            type='time'
                            value={slot.start}
                            onChange={(ev) => setSlot({ start: ev.target.value })}
                            className={`${fieldCls} w-32`}
                          />
                          <div className='inline-flex overflow-hidden rounded-lg border border-[#e6dbcd] text-[13px]'>
                            <button
                              type='button'
                              onClick={() => setSlot({ date: undefined })}
                              className={`px-3 py-2 ${slot.date === undefined ? 'bg-[#455a54] text-white' : 'bg-white text-[#455a54]'}`}
                            >
                              Todos los días
                            </button>
                            <button
                              type='button'
                              onClick={() => setSlot({ date: slot.date ?? '' })}
                              className={`px-3 py-2 ${slot.date !== undefined ? 'bg-[#455a54] text-white' : 'bg-white text-[#455a54]'}`}
                            >
                              Un día
                            </button>
                          </div>
                          {slot.date !== undefined && (
                            <DatePicker
                              value={slot.date}
                              onChange={(date) => setSlot({ date })}
                              placeholder='Qué día'
                              className='w-44'
                            />
                          )}
                          <IconBtn
                            icon={X}
                            title='Quitar horario'
                            tone='rojo'
                            onClick={() =>
                              update(i, {
                                schedule: (s.schedule ?? []).filter((_, k) => k !== j),
                              })
                            }
                          />
                        </div>
                      );
                    })}
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='w-fit border-[#e6dbcd] text-[#455a54]'
                      onClick={() =>
                        update(i, { schedule: [...(s.schedule ?? []), { start: '16:00' }] })
                      }
                    >
                      <Plus className='mr-1 h-4 w-4' /> Agregar horario
                    </Button>
                  </div>
                </FormField>

                <div className='flex flex-col gap-1.5'>
                  <span className='text-[13px] font-medium text-[#455a54]'>Bonos de la edición</span>
                  <p className='text-xs leading-snug text-texto-suave'>
                    Promos propias (por cantidad, lugares bonificados). En las fechas de la edición
                    las promos de siempre de la experiencia no rigen: valen sólo éstas.
                  </p>
                  {renderVariants(s.priceVariants ?? [], s.price ?? basePrice, (priceVariants) =>
                    update(i, { priceVariants }),
                  )}
                </div>

                <label className='flex items-center justify-between gap-3 rounded-lg border border-[#e6dbcd] bg-[#fbf5ef] px-3 py-2.5'>
                  <span className='flex flex-col'>
                    <span className='text-sm font-medium text-[#3d3338]'>Activa</span>
                    <span className='text-xs text-texto-suave'>
                      Apagada no rige: esas fechas vuelven a la versión de siempre.
                    </span>
                  </span>
                  <Switch
                    checked={s.active !== false}
                    onCheckedChange={(active) => update(i, { active })}
                    aria-label='Edición activa'
                  />
                </label>
              </div>
            )}
          </div>
        );
      })}

      <Button
        type='button'
        variant='outline'
        className='w-fit gap-2 border-[#e6dbcd] text-[#455a54]'
        onClick={add}
      >
        <Plus className='h-4 w-4' /> Nueva fecha especial
      </Button>
    </div>
  );
}

/** Lista de textos cortos como chips (activadores, lo que incluye). */
function ChipsInput({
  value,
  onChange,
  placeholder,
  isAlias = false,
}: Readonly<{
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Activadores: se comparan como los apodos (sin mayúsculas ni acentos). */
  isAlias?: boolean;
}>) {
  const [draft, setDraft] = useState('');
  const key = (s: string) => (isAlias ? aliasKey(s) : s.trim().toLowerCase());
  const dup = draft.trim() !== '' && value.some((a) => key(a) === key(draft));
  const tooShort = isAlias && draft.trim() !== '' && aliasKey(draft).length < 2;

  function add() {
    const text = draft.trim();
    if (!text || dup || tooShort) return;
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
          placeholder={placeholder}
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
      {dup && <span className='text-xs text-[#9d684e]'>Ya está en la lista.</span>}
      {tooShort && (
        <span className='text-xs text-[#9d684e]'>
          Muy corto: con una sola letra matchearía cualquier cosa.
        </span>
      )}
    </div>
  );
}
