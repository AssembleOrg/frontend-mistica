'use client';

import { useEffect, useRef } from 'react';
import { cashboxService } from '@/services/cashbox.service';
import { toast } from 'sonner';
import { useRouter, usePathname } from 'next/navigation';

export function AutoClosureNotifier() {
  const router = useRouter();
  const pathname = usePathname();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current || pathname === '/dashboard/finances') return;
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
  }, [pathname, router]);

  return null;
}
