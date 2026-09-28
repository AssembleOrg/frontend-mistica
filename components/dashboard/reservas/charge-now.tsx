'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { fmtPrice } from '@/lib/reservas-format';

export type ChargeMode = 'total' | 'partial';

/**
 * Cuánto se cobra al cargar la reserva: todo, o una parte (seña) dejando el
 * resto como saldo para cobrar después desde "Cobrar saldo".
 */
export function ChargeNow({
  total,
  mode,
  onModeChange,
  amount,
  onAmountChange,
}: {
  total: number;
  mode: ChargeMode;
  onModeChange: (m: ChargeMode) => void;
  amount: string;
  onAmountChange: (v: string) => void;
}) {
  const value = Number(amount) || 0;
  const balance = Math.max(0, total - value);
  return (
    <div className='space-y-1.5'>
      <label className='text-[13px] font-medium text-[#455a54]'>
        Cuánto cobra ahora
      </label>
      <div className='grid grid-cols-2 gap-2'>
        {(
          [
            ['total', 'Todo'],
            ['partial', 'Una parte (seña)'],
          ] as const
        ).map(([key, label]) => {
          const on = key === mode;
          return (
            <button
              key={key}
              type='button'
              onClick={() => onModeChange(key)}
              className={cn(
                'rounded-lg border px-3 py-2 text-sm font-medium transition',
                on
                  ? 'border-[#455a54] bg-[#455a54] text-white'
                  : 'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] hover:bg-[#f3e9df]',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      {mode === 'partial' && (
        <div className='space-y-1'>
          <Input
            type='number'
            inputMode='decimal'
            min={0}
            placeholder='Monto que abona hoy'
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            className='border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30'
          />
          {total > 0 && (
            <p className='text-[12px] text-[#7a6e6f]'>
              Queda de saldo <strong>{fmtPrice(balance)}</strong>. Se cobra
              después desde &quot;Cobrar saldo&quot;.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Valida el cobro parcial. Devuelve el monto a mandar (undefined = todo) o un
 * mensaje de error.
 */
export function partialAmount(
  mode: ChargeMode,
  amount: string,
  total: number,
): { amount?: number; error?: string } {
  if (mode === 'total') return {};
  const value = Number(amount);
  if (!amount.trim() || Number.isNaN(value) || value < 0)
    return { error: 'Ingresá cuánto abona ahora' };
  if (total > 0 && value >= total)
    return { error: 'Si abona todo, elegí "Todo"' };
  return { amount: value };
}
