'use client';

import { useMemo } from 'react';
import { Banknote, CreditCard, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatCurrency } from '@/lib/sales-calculations';
import type { PaymentMethodCode, SalePayment } from '@/services/sales.service';

interface Props {
  total: number;
  value: SalePayment[];
  onChange: (payments: SalePayment[]) => void;
  disabled?: boolean;
}

interface MethodMeta {
  code: PaymentMethodCode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const METHODS: MethodMeta[] = [
  { code: 'CASH', label: 'Efectivo', icon: Banknote },
  { code: 'CARD', label: 'Tarjeta', icon: CreditCard },
  { code: 'TRANSFER', label: 'Transferencia', icon: Send },
];

/**
 * Editor de la distribución del cobro por método de pago.
 * - Una sola entrada por método (no aparece doble CASH).
 * - La suma de `amount` debe igualar `total` para habilitar el submit.
 * - Para CASH se acepta `receivedAmount > amount`; el excedente es vuelto.
 */
export function PaymentsEditor({ total, value, onChange, disabled }: Props) {
  const usedMethods = useMemo(() => new Set(value.map((p) => p.method)), [value]);
  const availableMethods = METHODS.filter((m) => !usedMethods.has(m.code));

  const sumAssigned = useMemo(
    () => value.reduce((acc, p) => acc + (Number.isFinite(p.amount) ? p.amount : 0), 0),
    [value]
  );
  const remaining = Number((total - sumAssigned).toFixed(2));

  const cashLine = value.find((p) => p.method === 'CASH');
  const cashChange = cashLine?.receivedAmount
    ? Math.max(0, Number((cashLine.receivedAmount - cashLine.amount).toFixed(2)))
    : 0;

  function updatePayment(method: PaymentMethodCode, patch: Partial<SalePayment>) {
    onChange(value.map((p) => (p.method === method ? { ...p, ...patch } : p)));
  }

  function removePayment(method: PaymentMethodCode) {
    onChange(value.filter((p) => p.method !== method));
  }

  function addPayment(method: PaymentMethodCode) {
    // El nuevo pago arranca con el remanente como sugerencia.
    const suggested = Math.max(0, remaining);
    const next: SalePayment = { method, amount: suggested };
    if (method === 'CASH') next.receivedAmount = suggested;
    onChange([...value, next]);
  }

  const balanced = Math.abs(remaining) < 0.01;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[#455a54] font-winter-solid">
          Pagos <span className="text-red-500">*</span>
        </Label>
        <span className="text-xs text-[#455a54]/70">
          Total: <span className="font-semibold">{formatCurrency(total)}</span>
        </span>
      </div>

      {value.length === 0 && (
        <div className="rounded-md border border-dashed border-[#9d684e]/30 p-3 text-center text-sm text-[#455a54]/70">
          Agregá al menos un método de pago.
        </div>
      )}

      <div className="space-y-2">
        {value.map((p) => {
          const meta = METHODS.find((m) => m.code === p.method)!;
          const Icon = meta.icon;
          return (
            <div
              key={p.method}
              className="rounded-md border border-[#9d684e]/20 p-3 space-y-2 bg-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#455a54] font-winter-solid">
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{meta.label}</span>
                </div>
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-[#455a54]/60 hover:text-red-600"
                    onClick={() => removePayment(p.method)}
                    aria-label={`Quitar pago en ${meta.label}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div
                className={
                  p.method === 'CASH'
                    ? 'grid grid-cols-1 sm:grid-cols-2 gap-2'
                    : 'grid grid-cols-1 gap-2'
                }
              >
                <div>
                  <Label className="text-xs text-[#455a54]/70">Monto a cobrar</Label>
                  <CurrencyInput
                    value={p.amount}
                    onChange={(v) => updatePayment(p.method, { amount: v })}
                    placeholder="0,00"
                    disabled={disabled}
                  />
                </div>
                {p.method === 'CASH' && (
                  <div>
                    <Label className="text-xs text-[#455a54]/70">Entregado</Label>
                    <CurrencyInput
                      value={p.receivedAmount ?? p.amount}
                      onChange={(v) => updatePayment(p.method, { receivedAmount: v })}
                      placeholder="0,00"
                      disabled={disabled}
                    />
                  </div>
                )}
              </div>

              {p.method === 'CASH' && cashChange > 0 && (
                <p className="text-xs text-[#9d684e] font-winter-solid">
                  Vuelto: <span className="font-semibold">{formatCurrency(cashChange)}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {availableMethods.length > 0 && !disabled && (
        <div className="flex flex-wrap gap-2">
          {availableMethods.map((m) => {
            const Icon = m.icon;
            return (
              <Button
                key={m.code}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addPayment(m.code)}
                className="border-[#9d684e]/30 text-[#9d684e] hover:bg-[#9d684e]/10"
              >
                <Icon className="h-4 w-4 mr-1" />
                Agregar {m.label.toLowerCase()}
              </Button>
            );
          })}
        </div>
      )}

      <div
        className={`rounded-md p-2 text-sm font-winter-solid ${
          balanced
            ? 'bg-green-50 border border-green-200 text-green-700'
            : remaining > 0
              ? 'bg-amber-50 border border-amber-200 text-amber-700'
              : 'bg-red-50 border border-red-200 text-red-700'
        }`}
      >
        {balanced ? (
          <>Pagos balanceados ✓</>
        ) : remaining > 0 ? (
          <>
            Falta asignar <span className="font-semibold">{formatCurrency(remaining)}</span>
          </>
        ) : (
          <>
            Excede en <span className="font-semibold">{formatCurrency(Math.abs(remaining))}</span>
            {' '}— ajustá los montos
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Helper: ¿la distribución cumple las reglas para enviar al backend?
 *  - ≥ 1 pago
 *  - cada amount > 0
 *  - una sola entrada por método (garantizado por el editor)
 *  - suma === total
 *  - cash receivedAmount ≥ amount cuando se setea
 */
export function paymentsAreValid(payments: SalePayment[], total: number): boolean {
  if (!payments.length) return false;
  for (const p of payments) {
    if (!(p.amount > 0)) return false;
    if (p.method === 'CASH' && p.receivedAmount !== undefined && p.receivedAmount < p.amount) {
      return false;
    }
  }
  const sum = payments.reduce((acc, p) => acc + p.amount, 0);
  return Math.abs(sum - total) < 0.01;
}
