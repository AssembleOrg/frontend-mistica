'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nombre del producto seña (lo muestra en el título — ej "Seña") */
  productName: string;
  onConfirm: (amount: number) => void;
}

/**
 * Diálogo chico para capturar el monto de una seña antes de sumarla al
 * carrito. La seña es un producto especial (kind=PREPAID) cuyo precio
 * varía en cada venta, por eso lo pedimos por pop-up al elegirlo.
 */
export function PrepaidAmountDialog({ open, onOpenChange, productName, onConfirm }: Props) {
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    if (open) setAmount(0);
  }, [open]);

  const handleConfirm = () => {
    if (amount <= 0) return;
    onConfirm(amount);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-[#9d684e]/20">
        <DialogHeader>
          <DialogTitle className="text-[#455a54] font-tan-nimbus">{productName}</DialogTitle>
          <DialogDescription className="font-winter-solid text-[#455a54]/70">
            Ingresá el monto de la seña. Se asociará al cliente seleccionado
            como prepaid pendiente al confirmar la venta.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs font-winter-solid text-[#455a54]">Monto (ARS) *</Label>
          <CurrencyInput
            value={amount}
            onChange={setAmount}
            placeholder="0,00"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && amount > 0) handleConfirm();
            }}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#9d684e]/30 text-[#455a54]"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={amount <= 0}
            className="bg-[#9d684e] hover:bg-[#9d684e]/90 text-white"
          >
            Agregar al carrito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
