'use client';

import { useState } from 'react';
import { LockOpen, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCashbox } from '@/hooks/useCashbox';
import { OpenCashboxDialog } from './open-cashbox-dialog';
import { CloseCashboxDialog } from './close-cashbox-dialog';

/**
 * Botón CTA contextual:
 * - Si no hay caja abierta → "Abrir caja" (verde).
 * - Si hay caja abierta → "Cerrar caja" (terracota).
 * Se renderiza en el sidebar / header del dashboard.
 */
export function CashboxCta() {
  const { current, isOpen, loading, refresh } = useCashbox();
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);

  if (loading) {
    return (
      <Button variant='outline' size='sm' disabled className='w-full'>
        Caja…
      </Button>
    );
  }

  if (!isOpen) {
    return (
      <>
        <Button
          onClick={() => setShowOpen(true)}
          size='sm'
          className='w-full bg-green-600 hover:bg-green-700 text-white font-winter-solid'
        >
          <LockOpen className='h-4 w-4 mr-2' />
          Abrir caja
        </Button>
        <OpenCashboxDialog
          open={showOpen}
          onOpenChange={setShowOpen}
          onOpened={refresh}
        />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowClose(true)}
        size='sm'
        className='w-full bg-[#9d684e] hover:bg-[#9d684e]/90 text-white font-winter-solid'
      >
        <LockKeyhole className='h-4 w-4 mr-2' />
        Cerrar caja
      </Button>
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
