'use client';

import { useEffect, useState } from 'react';
import { reservationsPublic } from '@/services/reservations.public.service';

export interface BusinessHours {
  /** Apertura de la ventana de reservas, 'HH:mm'. */
  open: string;
  /** Cierre: ninguna reserva puede terminar después. */
  close: string;
}

/** Mientras carga (o si falla la consulta), el horario de siempre. */
export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  open: '15:00',
  close: '20:00',
};

let cache: BusinessHours | null = null;
let inflight: Promise<BusinessHours> | null = null;

/**
 * Horario del salón, configurable desde Reservas → Mesas. El backend es el que
 * valida; acá sólo acota los selectores de hora y los textos.
 */
export function useBusinessHours(): BusinessHours {
  const [hours, setHours] = useState<BusinessHours>(
    cache ?? DEFAULT_BUSINESS_HOURS,
  );
  useEffect(() => {
    if (cache) {
      setHours(cache);
      return;
    }
    let alive = true;
    inflight ??= reservationsPublic
      .businessHours()
      .then((h) => (cache = h))
      .finally(() => {
        inflight = null;
      });
    inflight.then((h) => alive && setHours(h)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return hours;
}

/** Después de cambiarlo desde el panel, para los formularios que se abran. */
export function setBusinessHoursCache(hours: BusinessHours) {
  cache = hours;
}
