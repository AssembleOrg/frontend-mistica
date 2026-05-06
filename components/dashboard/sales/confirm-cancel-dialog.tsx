'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trash2, XCircle } from 'lucide-react';

interface ConfirmCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
  saleNumber?: string;
  isPending?: boolean;
}

export function ConfirmCancelDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  saleNumber,
  isPending,
}: ConfirmCancelDialogProps) {
  const Icon = isPending ? Trash2 : XCircle;
  const title = isPending ? 'Eliminar comanda' : 'Cancelar venta';
  const confirmLabel = isPending ? 'Eliminar' : 'Confirmar cancelación';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[88vw] max-w-xs rounded-xl border-[#d9dadb] p-0 overflow-hidden">
        <div className="h-1 w-full bg-[#9d684e]" />

        <div className="px-5 py-4">
          <DialogHeader className="mb-4 text-left">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-4 w-4 text-[#9d684e] shrink-0" />
              <DialogTitle className="text-sm font-bold text-[#455a54] font-tan-nimbus leading-none">
                {title}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#455a54]/60 font-winter-solid leading-relaxed">
              {saleNumber && (
                <>
                  <span className="font-semibold text-[#455a54]">{saleNumber}</span>
                  {' — '}
                </>
              )}
              {isPending
                ? 'La comanda se eliminará permanentemente y no podrá recuperarse.'
                : 'La venta pasará a estado Cancelada. El registro se mantiene para historial.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-winter-solid border-[#d9dadb] text-[#455a54]"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Volver
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs font-winter-solid bg-[#9d684e] hover:bg-[#9d684e]/90 text-white"
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Procesando…' : confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
