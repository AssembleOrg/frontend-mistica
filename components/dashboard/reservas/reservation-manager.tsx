'use client';

// Gestión de UNA reserva desde cualquier vista: panel de detalle + acciones
// (confirmar, cancelar, cobrar saldo, reprogramar) con sus modales. Lo usan la
// Agenda (anotados de un turno) y el calendario mensual, para no duplicar el
// mismo cableado en cada lugar.

import { useState } from 'react';
import { showToast } from '@/lib/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  reservationsAdmin,
  type ReservationItem,
} from '@/services/reservations.admin.service';
import { ReservationDetailPanel } from './reservation-detail-panel';
import { CollectBalanceModal, RescheduleModal } from './reservas-list';

export function ReservationManager({
  reservation,
  onClose,
  onChanged,
}: {
  reservation: ReservationItem | null;
  onClose: () => void;
  /** Tras cualquier cambio en la reserva (para que la vista se refresque). */
  onChanged: () => void | Promise<void>;
}) {
  const confirm = useConfirm();
  const [collect, setCollect] = useState<ReservationItem | null>(null);
  const [reschedule, setReschedule] = useState<ReservationItem | null>(null);
  const [busy, setBusy] = useState(false);

  async function doCancel(r: ReservationItem) {
    const ok = await confirm({
      title: 'Cancelar reserva',
      description: `¿Cancelar la reserva de ${r.customerName ?? r.code}? Se libera el cupo.`,
      confirmLabel: 'Cancelar reserva',
      variant: 'normal',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await reservationsAdmin.cancelReservation(r._id);
      showToast.success('Reserva cancelada');
      onClose();
      await onChanged();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo cancelar');
    } finally {
      setBusy(false);
    }
  }

  async function doConfirm(r: ReservationItem) {
    setBusy(true);
    try {
      await reservationsAdmin.resolveReservation(r._id, 'confirm');
      showToast.success('Reserva confirmada');
      onClose();
      await onChanged();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo confirmar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ReservationDetailPanel
        reservation={reservation}
        busy={busy}
        onClose={onClose}
        onCollect={(r) => {
          onClose();
          setCollect(r);
        }}
        onReschedule={(r) => {
          onClose();
          setReschedule(r);
        }}
        onConfirm={(r) => void doConfirm(r)}
        onCancel={(r) => void doCancel(r)}
        onUpdated={() => void onChanged()}
      />

      {collect && (
        <CollectBalanceModal
          reservation={collect}
          onClose={() => setCollect(null)}
          onDone={async () => {
            setCollect(null);
            await onChanged();
          }}
        />
      )}

      {reschedule && (
        <RescheduleModal
          reservation={reschedule}
          onClose={() => setReschedule(null)}
          onDone={async () => {
            setReschedule(null);
            await onChanged();
          }}
        />
      )}
    </>
  );
}
