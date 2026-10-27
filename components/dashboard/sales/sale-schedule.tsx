'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { CalendarPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { showToast } from '@/lib/toast';
import { fmtDateTime, fmtPrice } from '@/lib/reservas-format';
import { CAKE_PRODUCTS, cakeProductOf, type CakeProduct } from '@/lib/kitchen';
import {
  reservationsAdmin,
  type AdminExperience,
} from '@/services/reservations.admin.service';
import { productsService } from '@/services/products.service';
import type { SaleItem } from '@/services/sales.service';
import {
  SlotPicker,
  fromMin,
  toMin,
  useSlotPicker,
} from '@/components/dashboard/reservas/slot-picker';
import type { Product } from '@/lib/types';
import { errorText } from '@/lib/api-error-messages';

/** Renglón de la actividad agendada (ítem libre: se va sin productId). */
const AGENDA_LINE_ID = 'free-agenda';
/** Renglón de la hora extra (ítem libre, precio a mano como en Reservas). */
const EXTRA_LINE_ID = 'free-extra-time';
const EXTRA_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 30, label: '+30 min' },
  { minutes: 60, label: '+1 h' },
  { minutes: 90, label: '+1 h 30' },
  { minutes: 120, label: '+2 h' },
];

/** Los botones de torta de cocina. La bonificada es la simbólica con Bonif. 1. */
const CAKE_BUTTONS: { label: string; barcode: CakeProduct['barcode']; bonified?: boolean }[] = [
  { label: 'Torta simb. bonif', barcode: CAKE_PRODUCTS[0].barcode, bonified: true },
  { label: 'Torta simb. $', barcode: CAKE_PRODUCTS[0].barcode },
  { label: 'Torta 12cm $', barcode: CAKE_PRODUCTS[1].barcode },
  { label: 'Upgrade 12cm', barcode: CAKE_PRODUCTS[2].barcode },
];

/**
 * "Agendar" de una venta del local: una experiencia o servicio vendido en el
 * mostrador queda en la agenda (actividad, día y hora), vinculado a la venta.
 * La actividad y las tortas van al carrito como renglones, así la plata está
 * en la venta; si fue una seña, el saldo se cobra desde Reservas.
 */
export function useSaleSchedule(
  cartItems: SaleItem[],
  setCartItems: Dispatch<SetStateAction<SaleItem[]>>,
) {
  const [on, setOn] = useState(false);
  const [experiences, setExperiences] = useState<AdminExperience[]>([]);
  const [qty, setQty] = useState('1');
  const [kitchenNotes, setKitchenNotes] = useState('');
  // Cumpleaños: quién cumple y cuántos años (cocina lo ve en la ficha y en
  // su semana). Lo pedían desde Reservas; acá faltaba.
  const [isBirthday, setIsBirthday] = useState(false);
  const [birthdayName, setBirthdayName] = useState('');
  const [birthdayAge, setBirthdayAge] = useState('');
  const [cakeProducts, setCakeProducts] = useState<Product[]>([]);
  const [coverColor, setCoverColor] = useState('');
  const [flavor, setFlavor] = useState('');
  // Renglón de la actividad: el producto EXP-… si lo cargaron a mano, si no uno libre.
  const [expLineId, setExpLineId] = useState(AGENDA_LINE_ID);
  // Hora extra: alarga la reserva (y las mesas); su precio va al carrito.
  const [extraMin, setExtraMin] = useState(0);
  const [extraPrice, setExtraPrice] = useState('');
  const picker = useSlotPicker(experiences, '', extraMin);
  const people = Math.max(1, Math.floor(Number(qty) || 1));
  const endsAt = picker.time ? fromMin(toMin(picker.time) + picker.duration) : null;
  const endsAfterClose =
    !!picker.time && toMin(picker.time) + picker.duration > toMin(picker.hours.close);

  useEffect(() => {
    if (!on || experiences.length > 0) return;
    reservationsAdmin
      .listExperiences(false)
      .then(setExperiences)
      .catch(() => showToast.error('No se pudieron cargar las experiencias'));
    productsService
      .getProducts(1, 20, { search: 'torta' })
      .then((res) =>
        setCakeProducts((res.data?.data ?? []).filter((p) => cakeProductOf(p.barcode))),
      )
      .catch(() => {});
  }, [on, experiences.length]);

  // Actividad + día + hora + personas → renglón en el carrito con el precio del
  // backend (promos y bonificadas de la experiencia incluidas). Sólo reescribe
  // cuando cambia alguno de esos; un Bonif. cargado a mano después se respeta.
  const { expId, day, time, exp, unit } = picker;
  useEffect(() => {
    if (!on || !expId || !day || !time || !exp) {
      setCartItems((prev) => prev.filter((i) => i.productId !== AGENDA_LINE_ID));
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      reservationsAdmin
        .previewTables({
          experienceId: expId,
          date: day,
          startTime: time,
          quantity: people,
          ...(extraMin > 0 && { extraMinutes: extraMin }),
        })
        .then((res) => res.pricing)
        .catch(() => undefined)
        .then((pricing) => {
          if (!alive) return;
          const unitPrice = pricing?.unitPrice ?? unit;
          const bonif = Math.min(people, pricing?.freeSpots ?? 0);
          const line: SaleItem = {
            productId: expLineId,
            productName: exp.name,
            quantity: people,
            unitPrice,
            bonifiedQty: bonif,
            subtotal: (people - bonif) * unitPrice,
          };
          setCartItems((prev) =>
            prev.some((i) => i.productId === expLineId)
              ? prev.map((i) => (i.productId === expLineId ? { ...i, ...line, productName: i.productName } : i))
              : [...prev, line],
          );
        });
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [on, expId, day, time, people, exp, unit, expLineId, extraMin, setCartItems]);

  // Hora extra con precio → renglón propio en el carrito; sin precio, de regalo.
  const extraAmount = on && extraMin > 0 ? Math.max(0, Number(extraPrice) || 0) : 0;
  useEffect(() => {
    if (extraAmount <= 0) {
      setCartItems((prev) => prev.filter((i) => i.productId !== EXTRA_LINE_ID));
      return;
    }
    const label = EXTRA_OPTIONS.find((o) => o.minutes === extraMin)?.label ?? `+${extraMin} min`;
    const line: SaleItem = {
      productId: EXTRA_LINE_ID,
      productName: `Hora extra (${label})`,
      quantity: 1,
      unitPrice: extraAmount,
      bonifiedQty: 0,
      subtotal: extraAmount,
    };
    setCartItems((prev) =>
      prev.some((i) => i.productId === EXTRA_LINE_ID)
        ? prev.map((i) => (i.productId === EXTRA_LINE_ID ? line : i))
        : [...prev, line],
    );
  }, [extraAmount, extraMin, setCartItems]);

  // Si cambian la cantidad del renglón en el carrito, las personas la siguen.
  const lineQty = cartItems.find((i) => i.productId === expLineId)?.quantity;
  useEffect(() => {
    if (lineQty && lineQty !== people) setQty(String(lineQty));
  }, [lineQty]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Al sumar al carrito la experiencia (producto EXP-…), la preselecciona. */
  function suggestFrom(product: Product) {
    if (!product.barcode?.startsWith('EXP-')) return;
    const id = product.barcode.slice(4);
    if (picker.expId && picker.expId !== id) return;
    picker.setExpId(id);
    setExpLineId(product.id);
    // Ese producto pasa a ser el renglón de la actividad: sale el libre.
    setCartItems((prev) => prev.filter((i) => i.productId !== AGENDA_LINE_ID));
  }

  function addCake(barcode: string, bonified = false) {
    const product = cakeProducts.find((p) => p.barcode === barcode);
    if (!product) return;
    setCartItems((prev) => {
      const current = prev.find((i) => i.productId === product.id);
      const quantity = (current?.quantity ?? 0) + 1;
      const bonifiedQty = (current?.bonifiedQty ?? 0) + (bonified ? 1 : 0);
      const line: SaleItem = {
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice: product.price,
        bonifiedQty,
        subtotal: (quantity - bonifiedQty) * product.price,
      };
      return current
        ? prev.map((i) => (i.productId === product.id ? line : i))
        : [...prev, line];
    });
    showToast.success(`${product.name}${bonified ? ' (bonificada)' : ''} al carrito`);
  }

  const cakeLines = cartItems.flatMap((item) => {
    const product = cakeProducts.find((p) => p.id === item.productId);
    const cake = cakeProductOf(product?.barcode);
    return cake ? [{ item, cake }] : [];
  });
  const needsFlavor = cakeLines.some((l) => l.cake.withFlavor);

  function validate(): string | null {
    if (!on) return null;
    if (!picker.expId) return 'Elegí la actividad a agendar';
    if (!picker.day || !picker.time) return 'Elegí día y horario para agendar';
    if (endsAfterClose)
      return `Con la hora extra termina a las ${endsAt}: el salón cierra a las ${picker.hours.close}. Elegí un horario más temprano.`;
    if (picker.check.status === 'no' || picker.check.status === 'checking')
      return 'Elegí un horario con lugar para agendar';
    return null;
  }

  /** Crea la reserva de la venta. Si falla, la venta ya quedó: sólo avisa. */
  async function schedule(saleId: string) {
    if (!on) return;
    const expLine = cartItems.find((i) => i.productId === expLineId);
    const flavorNote = [
      coverColor.trim() && `Cobertura ${coverColor.trim()}`,
      flavor.trim() && `Sabor ${flavor.trim()}`,
    ]
      .filter(Boolean)
      .join(' · ');
    // Tortas para cocina: las bonificadas van de regalo (sin precio).
    const cakes = cakeLines.flatMap(({ item, cake }) => {
      const free = item.bonifiedQty ?? 0;
      const notes = cake.withFlavor && flavorNote ? flavorNote : undefined;
      const base = { label: cake.kitchenLabel, ...(notes && { notes }) };
      return [
        ...(item.quantity - free > 0
          ? [{ ...base, qty: item.quantity - free, amount: item.unitPrice }]
          : []),
        ...(free > 0 ? [{ ...base, qty: free, amount: 0 }] : []),
      ];
    });
    try {
      const r = await reservationsAdmin.scheduleSale(saleId, {
        experienceId: picker.expId,
        date: picker.day,
        startTime: picker.time,
        quantity: expLine?.quantity ?? people,
        ...(extraMin > 0 ? { extraMinutes: extraMin } : {}),
        ...(expLine?.bonifiedQty ? { freeSpots: expLine.bonifiedQty } : {}),
        ...(cakes.length ? { cakes } : {}),
        ...(kitchenNotes.trim() ? { kitchenNotes: kitchenNotes.trim() } : {}),
        ...(isBirthday
          ? {
              isBirthday: true,
              ...(birthdayName.trim() ? { birthdayName: birthdayName.trim() } : {}),
              ...(birthdayAge.trim() ? { birthdayAge: Number(birthdayAge) } : {}),
            }
          : {}),
      });
      showToast.success(`Agendada: ${fmtDateTime(r.startAt)}`);
    } catch (e) {
      // Al editar una venta que ya tenía reserva el backend la rechaza: no es
      // un error, la venta ya está en la agenda.
      const msg = errorText(e, '');
      if (/ya está agendada/i.test(msg)) {
        showToast.info(msg.replace('Esta venta ya está agendada', 'La venta ya estaba agendada'));
        return;
      }
      showToast.error(
        `La venta se registró, pero no se pudo agendar${
          e instanceof Error ? `: ${e.message}` : ''
        }. Cargala desde Reservas.`,
      );
    }
  }

  function reset() {
    setOn(false);
    setQty('1');
    setKitchenNotes('');
    setIsBirthday(false);
    setBirthdayName('');
    setBirthdayAge('');
    setCoverColor('');
    setFlavor('');
    setExpLineId(AGENDA_LINE_ID);
    setExtraMin(0);
    setExtraPrice('');
    picker.setExpId('');
  }

  return {
    on,
    setOn,
    experiences,
    picker,
    qty,
    setQty,
    kitchenNotes,
    setKitchenNotes,
    isBirthday,
    setIsBirthday,
    birthdayName,
    setBirthdayName,
    birthdayAge,
    setBirthdayAge,
    cakeProducts,
    addCake,
    needsFlavor,
    coverColor,
    setCoverColor,
    flavor,
    setFlavor,
    extraMin,
    setExtraMin,
    extraPrice,
    setExtraPrice,
    endsAt,
    endsAfterClose,
    suggestFrom,
    validate,
    schedule,
    reset,
  };
}

export type SaleScheduleState = ReturnType<typeof useSaleSchedule>;

export function SaleScheduleSection({ state }: { state: SaleScheduleState }) {
  const { on, setOn, experiences, picker, qty, setQty } = state;
  const fieldCls = 'border-[#e6dbcd] bg-white text-[#455a54]';
  return (
    <div className='space-y-3 rounded-lg border border-[#e6dbcd] bg-[#fbf5ef] p-3'>
      <label className='flex cursor-pointer items-center justify-between gap-3'>
        <span className='flex items-center gap-2 text-sm font-medium text-[#455a54]'>
          <CalendarPlus className='h-4 w-4 text-[#9d684e]' />
          Agendar en la agenda
          <span className='hidden text-xs font-normal text-[#7a6e6f] sm:inline'>
            · experiencia o servicio con día y hora
          </span>
        </span>
        <Switch checked={on} onCheckedChange={setOn} />
      </label>
      {on && (
        <div className='space-y-3'>
          <SlotPicker
            picker={picker}
            experiences={experiences}
            experienceLabel='Actividad'
          />
          <div className='space-y-1.5'>
            <Label className='text-[13px] font-medium text-[#455a54]'>
              Personas
            </Label>
            <Input
              type='number'
              inputMode='numeric'
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className={`w-28 ${fieldCls}`}
            />
            <p className='text-[12px] text-[#7a6e6f]'>
              Con día y hora elegidos, la actividad se suma al carrito con su
              precio. Las bonificadas se cargan en &quot;Bonif.&quot;.
            </p>
          </div>
          <div className='flex flex-wrap items-end gap-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='sale-extra' className='text-[13px] font-medium text-[#455a54]'>
                Hora extra
              </Label>
              <select
                id='sale-extra'
                value={state.extraMin}
                onChange={(e) => state.setExtraMin(Number(e.target.value))}
                className={`h-10 w-40 rounded-md border px-3 text-sm sm:h-9 ${fieldCls}`}
              >
                <option value={0}>Sin hora extra</option>
                {EXTRA_OPTIONS.map((o) => (
                  <option key={o.minutes} value={o.minutes}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {state.extraMin > 0 && (
              <div className='space-y-1.5'>
                <Label
                  htmlFor='sale-extra-price'
                  className='text-[13px] font-medium text-[#455a54]'
                >
                  Precio de la hora extra (total)
                </Label>
                <Input
                  id='sale-extra-price'
                  type='number'
                  min={0}
                  value={state.extraPrice}
                  onChange={(e) => state.setExtraPrice(e.target.value)}
                  placeholder='0'
                  className={`w-40 ${fieldCls}`}
                />
              </div>
            )}
          </div>
          {picker.time && state.extraMin > 0 && (
            <p
              className={`text-[12px] font-medium ${
                state.endsAfterClose ? 'text-[#a33]' : 'text-[#455a54]'
              }`}
            >
              {state.endsAfterClose
                ? `Con la hora extra termina a las ${state.endsAt} y el salón cierra a las ${picker.hours.close}: elegí un horario más temprano.`
                : `De ${picker.time} a ${state.endsAt} (${picker.duration} min). Las mesas quedan ocupadas hasta las ${state.endsAt}.`}
            </p>
          )}
          <div className='space-y-2 border-t border-t-terracota/40 pt-3'>
            <p className='text-sm font-semibold text-terracota'>Para cocina</p>
            <label className='flex cursor-pointer items-center gap-2 text-[13px] text-[#455a54]'>
              <input
                type='checkbox'
                checked={state.isBirthday}
                onChange={(e) => state.setIsBirthday(e.target.checked)}
                className='size-4 accent-[#9d684e]'
              />
              Es un cumpleaños 🎉
            </label>
            {state.isBirthday && (
              <div className='grid grid-cols-[1fr_6rem] gap-2'>
                <Input
                  value={state.birthdayName}
                  onChange={(e) => state.setBirthdayName(e.target.value)}
                  placeholder='¿Quién cumple?'
                  aria-label='Quién cumple'
                  maxLength={120}
                  className={fieldCls}
                />
                <Input
                  value={state.birthdayAge}
                  onChange={(e) =>
                    state.setBirthdayAge(e.target.value.replace(/\D/g, '').slice(0, 3))
                  }
                  placeholder='Años'
                  aria-label='Años que cumple'
                  inputMode='numeric'
                  className={fieldCls}
                />
              </div>
            )}
            <div className='flex flex-wrap gap-1.5'>
              {CAKE_BUTTONS.map((b) => {
                const product = state.cakeProducts.find((p) => p.barcode === b.barcode);
                return (
                  <button
                    key={b.label}
                    type='button'
                    disabled={!product}
                    title={product ? undefined : 'No se encontró el producto de esta torta'}
                    onClick={() => state.addCake(b.barcode, b.bonified)}
                    className='rounded-full border border-[#e6dbcd] bg-white px-3 py-1 text-xs font-semibold text-[#455a54] transition hover:bg-[#fbf5ef] disabled:opacity-40'
                  >
                    {b.label}
                    {product && (
                      <span className='ml-1 opacity-70'>
                        {b.bonified ? 'regalo' : fmtPrice(product.price)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {state.needsFlavor && (
              <div className='flex gap-2'>
                <Input
                  value={state.coverColor}
                  onChange={(e) => state.setCoverColor(e.target.value)}
                  placeholder='Color de la cobertura'
                  aria-label='Color de la cobertura'
                  maxLength={80}
                  className={fieldCls}
                />
                <Input
                  value={state.flavor}
                  onChange={(e) => state.setFlavor(e.target.value)}
                  placeholder='Sabor'
                  aria-label='Sabor de la torta'
                  maxLength={80}
                  className={fieldCls}
                />
              </div>
            )}
            <Input
              value={state.kitchenNotes}
              onChange={(e) => state.setKitchenNotes(e.target.value)}
              placeholder='Nota para cocina (alergias, restricciones, cumpleañero…)'
              aria-label='Nota para cocina'
              maxLength={500}
              className={fieldCls}
            />
          </div>
          <p className='text-[12px] text-[#7a6e6f]'>
            Queda en Reservas con los datos del cliente de la venta. Si es un
            pago parcial, el saldo se cobra desde ahí.
          </p>
        </div>
      )}
    </div>
  );
}
