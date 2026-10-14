'use client';

// "Caja de hoy" a mano en la barra de Ventas: abre la sesión de caja abierta
// con todos sus movimientos (ventas, ingresos, egresos) y el efectivo
// esperado. Antes sólo se llegaba desde la pestaña Estadísticas.

import { useMemo, useState } from 'react';
import { Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCashbox } from '@/hooks/useCashbox';
import { SessionDetailDialog } from '@/components/dashboard/finances/session-detail-dialog';

export function CajaDeHoyButton() {
  const { current } = useCashbox();
  const [open, setOpen] = useState(false);

  const session = useMemo(() => {
    if (!current) return null;
    return {
      id: current.id,
      openedAt: current.openedAt,
      closedAt: current.closedAt ?? null,
      openingCash: current.openingCash,
      expectedClosingCash: current.expectedClosingCash ?? null,
      countedClosingCash: current.countedClosingCash ?? null,
      discrepancy: current.discrepancy ?? null,
      status: current.status,
    };
  }, [current]);

  if (!current) return null;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        aria-label="Caja de hoy"
        title="Movimientos de la caja abierta: ventas, ingresos y egresos"
        variant="outline"
        className="border-[#455a54]/40 text-[#455a54] hover:bg-[#455a54]/10 h-8 text-sm font-winter-solid px-2 sm:px-3"
      >
        <Receipt className="h-3.5 w-3.5 sm:mr-1.5" />
        <span className="hidden sm:inline">Caja de hoy</span>
      </Button>
      <SessionDetailDialog
        session={open ? session : null}
        onOpenChange={(o) => setOpen(o)}
      />
    </>
  );
}
