'use client';

// Guardia de vistas del panel: si la cuenta no tiene acceso a la vista actual
// (por rol o por su whitelist de vistas), la manda al inicio del dashboard.
// Complementa al sidebar: esconde el link Y bloquea la URL directa.

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { canAccessView } from '@/lib/views';

export function ViewGuard() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user || !pathname?.startsWith('/dashboard')) return;
    const view = pathname.split('/')[2] ?? '';
    if (!canAccessView(view, user.role, user.allowedViews)) {
      router.replace('/dashboard');
    }
  }, [user, pathname, router]);

  return null;
}
