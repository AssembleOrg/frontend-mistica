'use client';

import { useState } from 'react';
import { LockOpen, LockKeyhole, Loader2 } from 'lucide-react';
import { useCashbox } from '@/hooks/useCashbox';
import { OpenCashboxDialog } from './open-cashbox-dialog';
import { CloseCashboxDialog } from './close-cashbox-dialog';
import { formatCurrency } from '@/lib/sales-calculations';

/**
 * Pildora de estado de caja para el header del dashboard.
 * - "Caja cerrada" → click → abre modal de apertura
 * - "Caja abierta · $X" → click → abre modal de cierre
 */
export function CashboxStatusPill() {
  const { current, isOpen, loading, refresh } = useCashbox();
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);

  if (loading) {
    return (
      <span className='inline-flex items-center gap-1 text-xs text-[#455a54]/60 font-winter-solid'>
        <Loader2 className='h-3 w-3 animate-spin' />
        Caja…
      </span>
    );
  }

  if (!isOpen) {
    return (
      <>
        <button
          type='button'
          onClick={() => setShowOpen(true)}
          className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-300 bg-red-50 text-red-700 text-xs font-winter-solid hover:bg-red-100 transition'
          title='Abrir caja'
        >
          <LockKeyhole className='h-3.5 w-3.5' />
          Caja cerrada
        </button>
        <OpenCashboxDialog open={showOpen} onOpenChange={setShowOpen} onOpened={refresh} />
      </>
    );
  }

  return (
    <>
      <button
        type='button'
        onClick={() => setShowClose(true)}
        className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-green-300 bg-green-50 text-green-700 text-xs font-winter-solid hover:bg-green-100 transition'
        title='Cerrar caja'
      >
        <LockOpen className='h-3.5 w-3.5' />
        Caja abierta · {formatCurrency(current?.openingCash ?? 0)}
      </button>
      {current && (
        <CloseCashboxDialog
          open={showClose}
          onOpenChange={setShowClose}
          session={current}
          onClosed={refresh}
        />
      )}
    </>
  );
}
