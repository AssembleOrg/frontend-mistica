'use client';

// El panel del bot se mudó a Reservas > Bot (configuración, preguntas,
// probador y sesión). Esta ruta queda por compatibilidad de links viejos.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BotControlPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/reservas?tab=bot');
  }, [router]);
  return null;
}
