'use client';

import { useEffect, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { showToast } from '@/lib/toast';
import { fmtDateTime } from '@/lib/reservas-format';
import {
  reservationsAdmin,
  type AdminExperience,
} from '@/services/reservations.admin.service';
import {
  SlotPicker,
  useSlotPicker,
} from '@/components/dashboard/reservas/slot-picker';
import type { Product } from '@/lib/types';

/**
 * "Agendar" de una venta del local: una experiencia o servicio vendido en el
 * mostrador queda en la agenda (actividad, día y hora), vinculado a la venta.
 * La plata ya está en la venta; si fue una seña, el saldo se cobra desde
 * Reservas → "Cobrar saldo".
 */
export function useSaleSchedule() {
  const [on, setOn] = useState(false);
  const [experiences, setExperiences] = useState<AdminExperience[]>([]);
  const [qty, setQty] = useState('1');
  const picker = useSlotPicker(experiences);

  useEffect(() => {
    if (!on || experiences.length > 0) return;
    reservationsAdmin
      .listExperiences(false)
      .then(setExperiences)
      .catch(() => showToast.error('No se pudieron cargar las experiencias'));
  }, [on, experiences.length]);

  /** Al sumar al carrito la experiencia (producto EXP-…), la preselecciona. */
  function suggestFrom(product: Product) {
    if (picker.expId || !product.barcode?.startsWith('EXP-')) return;
    picker.setExpId(product.barcode.slice(4));
  }

  function validate(): string | null {
    if (!on) return null;
    if (!picker.expId) return 'Elegí la actividad a agendar';
    if (!picker.day || !picker.time) return 'Elegí día y horario para agendar';
    if (picker.check.status === 'no' || picker.check.status === 'checking')
      return 'Elegí un horario con lugar para agendar';
    const quantity = Math.max(1, Number(qty) || 1);
    if (picker.maxParty != null && quantity > picker.maxParty)
      return `A esa hora entran hasta ${picker.maxParty} personas`;
    return null;
  }

  /** Crea la reserva de la venta. Si falla, la venta ya quedó: sólo avisa. */
  async function schedule(saleId: string) {
    if (!on) return;
    try {
      const r = await reservationsAdmin.scheduleSale(saleId, {
        experienceId: picker.expId,
        date: picker.day,
        startTime: picker.time,
        quantity: Math.max(1, Number(qty) || 1),
      });
      showToast.success(`Agendada: ${fmtDateTime(r.startAt)}`);
    } catch (e) {
      // Al editar una venta que ya tenía reserva el backend la rechaza: no es
      // un error, la venta ya está en la agenda.
      const msg = e instanceof Error ? e.message : '';
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
    picker.setExpId('');
  }

  return { on, setOn, experiences, picker, qty, setQty, suggestFrom, validate, schedule, reset };
}

export type SaleScheduleState = ReturnType<typeof useSaleSchedule>;

export function SaleScheduleSection({ state }: { state: SaleScheduleState }) {
  const { on, setOn, experiences, picker, qty, setQty } = state;
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
            experienceLabel='1 · Actividad'
          />
          <div className='space-y-1.5'>
            <Label className='text-[13px] font-medium text-[#455a54]'>
              Personas{picker.maxParty != null ? ` (hasta ${picker.maxParty})` : ''}
            </Label>
            <Input
              type='number'
              inputMode='numeric'
              min={1}
              max={picker.maxParty ?? undefined}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className='w-28 border-[#e6dbcd] bg-white text-[#455a54]'
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
