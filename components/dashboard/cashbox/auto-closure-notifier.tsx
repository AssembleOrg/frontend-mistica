'use client';

import { useEffect, useRef } from 'react';
import { cashboxService } from '@/services/cashbox.service';
import { toast } from 'sonner';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

export function AutoClosureNotifier() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current || pathname === '/dashboard/finances') return;
    if (!user) return; // esperamos a saber el rol/vistas antes de decidir
    // El backend de caja exige la vista 'sales' o 'finances'. Sin ellas el
    // request da 403; no lo disparamos para cuentas que no operan la caja
    // (cocina, taller). Admin y whitelist vacía (acceso estándar) sí.
    const views = user.allowedViews ?? [];
    const canUseCashbox =
      user.role === 'admin' ||
      views.length === 0 ||
      views.includes('sales') ||
      views.includes('finances');
    if (!canUseCashbox) return;
    checkedRef.current = true;

    (async () => {
      try {
        const res = await cashboxService.getPendingAutoClosure();
        if (res.data) {
          toast.warning('Caja pendiente de arqueo', {
            description: 'El sistema cerró automáticamente la caja de ayer. Haz clic aquí para completarlo.',
            duration: 10000,
            action: {
              label: 'Ir a Finanzas',
              onClick: () => router.push('/dashboard/finances'),
            },
          });
        }
      } catch {
        // Silencioso (token expirado, sin permisos)
      }
    })();
  }, [pathname, router, user]);

  return null;
}
