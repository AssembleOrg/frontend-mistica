'use client';

// Pieza del mes de un alumno: helpers y el editor de campos, compartidos por
// la planilla (Piezas del mes) y la ficha del alumno.

import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  tallerAdmin,
  type GroupSlot,
  type MonthlyPiece,
  type MonthlyPieceInput,
} from '@/services/taller.admin.service';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/** 'YYYY-MM' del mes actual en Argentina. */
export function currentMonth(): string {
  return new Date()
    .toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
    .slice(0, 7);
}

export function shiftMonth(ym: string, delta: number): string {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(5, 7)) - 1 + delta;
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(ym: string): string {
  const m = MESES[Number(ym.slice(5, 7)) - 1] ?? ym;
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${ym.slice(0, 4)}`;
}

/** "Martes 18hs" a partir del horario del grupo. */
export function slotLabel(slots: GroupSlot[]): string {
  return slots
    .map((s) => `${DIAS[s.weekday] ?? ''} ${s.start.replace(':00', '')}hs`)
    .join(' · ');
}

export const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

/**
 * Editor de la pieza del mes. Guarda solo (upsert) al cambiar cada campo; el
 * nombre de la pieza al salir del campo. `compact` = fila de planilla.
 */
export function MonthlyPieceFields({
  studentId,
  month,
  value,
  isAdmin,
  compact = false,
  onSaved,
}: {
  studentId: string;
  month: string;
  value: MonthlyPiece | null;
  isAdmin: boolean;
  compact?: boolean;
  onSaved?: (p: MonthlyPiece) => void;
}) {
  const [name, setName] = useState(value?.pieceName ?? '');
  const [amount, setAmount] = useState(value?.extraAmount != null ? String(value.extraAmount) : '');
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(0);

  useEffect(() => {
    setName(value?.pieceName ?? '');
    setAmount(value?.extraAmount != null ? String(value.extraAmount) : '');
  }, [value?._id, value?.pieceName, value?.extraAmount]);

  async function save(input: MonthlyPieceInput) {
    setSaving(true);
    try {
      const p = await tallerAdmin.saveMonthlyPiece(studentId, month, input);
      onSaved?.(p);
      setSavedTick((t) => t + 1);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  const bisque = value?.bisque ?? false;
  const delivered = value?.delivered ?? false;
  const extra = value?.extraCharge ?? false;
  const paid = value?.paid ?? false;

  const toggle = (label: string, on: boolean, onChange: (v: boolean) => void, tone?: 'rojo') => (
    <label className={cn('flex items-center gap-2 text-[13px] text-[#455a54]', compact && 'justify-center')}>
      <Switch
        checked={on}
        onCheckedChange={onChange}
        aria-label={label}
        className={cn(tone === 'rojo' && on && 'data-[state=checked]:bg-[#b23b2e]')}
      />
      {!compact && <span>{label}</span>}
    </label>
  );

  return (
    <div className={cn(compact ? 'contents' : 'grid gap-3 sm:grid-cols-2')}>
      <div className={cn(!compact && 'sm:col-span-2')}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim() !== (value?.pieceName ?? '')) void save({ pieceName: name.trim() });
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          placeholder={compact ? 'Pieza…' : 'Qué pieza pidió (ej. tazón XL)'}
          className={cn(fieldCls, 'h-9 text-sm')}
        />
      </div>
      {toggle(bisque ? 'En bizcocho' : 'Fresca', bisque, (v) => void save({ bisque: v }))}
      {toggle('Entregada', delivered, (v) => void save({ delivered: v }))}
      {isAdmin && (
        <>
          <div className={cn('flex items-center gap-2', compact && 'justify-center')}>
            {toggle('Adicional', extra, (v) => void save({ extraCharge: v }), 'rojo')}
            {extra && (
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                onBlur={() => {
                  const n = amount === '' ? undefined : Number(amount);
                  if (n !== value?.extraAmount) void save({ extraAmount: n ?? 0 });
                }}
                inputMode='numeric'
                placeholder='$'
                className={cn(fieldCls, 'h-8 w-24 text-sm')}
              />
            )}
          </div>
          {toggle('Cobrado', paid, (v) => void save({ paid: v }))}
        </>
      )}
      {!compact && (
        <span className='flex items-center gap-1.5 text-xs text-[#7a6e6f] sm:col-span-2'>
          {saving ? (
            <>
              <Loader2 className='h-3.5 w-3.5 animate-spin' /> Guardando…
            </>
          ) : savedTick > 0 ? (
            <>
              <Check className='h-3.5 w-3.5 text-[#455a54]' /> Guardado
            </>
          ) : (
            'Se guarda solo al cambiar cada campo.'
          )}
        </span>
      )}
    </div>
  );
}
