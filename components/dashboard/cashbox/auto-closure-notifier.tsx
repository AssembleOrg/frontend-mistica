'use client';

import { useEffect, useState } from 'react';
import { cashboxService } from '@/services/cashbox.service';
import { toast } from 'sonner';
import { useRouter, usePathname } from 'next/navigation';

export function AutoClosureNotifier() {
  const [hasNotified, setHasNotified] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Si ya notificamos o si el usuario ya está en la pantalla de finanzas, no molestamos.
    if (hasNotified || pathname === '/dashboard/finances') return;

    const checkPending = async () => {
      try {
        const res = await cashboxService.getPendingAutoClosure();
        if (res.data) {
          setHasNotified(true);
          toast.warning('Caja pendiente de arqueo', {
            description: 'El sistema cerró automáticamente la caja de ayer. Haz clic aquí para completarlo.',
            duration: 10000,
            action: {
              label: 'Ir a Finanzas',
              onClick: () => router.push('/dashboard/finances'),
            },
          });
        }
      } catch (err) {
        // Ignoramos errores silenciosamente (ej: usuario sin permisos o token expirado)
      }
    };
    
    checkPending();
  }, [pathname, hasNotified, router]);

  return null;
}
