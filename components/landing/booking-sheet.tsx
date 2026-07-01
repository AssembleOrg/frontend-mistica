'use client';

// Envuelve el ReservationForm en un bottom-sheet nativo, con la experiencia
// preseleccionada. No cambia el flujo: el form conserva toda su lógica
// (createHold, idempotencyKey, redirect a MercadoPago).

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ReservationForm } from '@/components/landing/reservation-form';
import type {
  PublicExperience,
  PublicSession,
} from '@/services/reservations.public.service';

export function BookingSheet({
  experience,
  experiences,
  sessions,
  onClose,
}: {
  /** Experiencia a reservar; null = sheet cerrado. */
  experience: PublicExperience | null;
  experiences: PublicExperience[];
  sessions: PublicSession[];
  onClose: () => void;
}) {
  return (
    <BottomSheet
      open={!!experience}
      onClose={onClose}
      title={experience?.name ?? 'Reservá tu lugar'}
    >
      {experience && (
        <ReservationForm
          experiences={experiences}
          sessions={sessions}
          lockedExperienceId={experience._id}
        />
      )}
    </BottomSheet>
  );
}
