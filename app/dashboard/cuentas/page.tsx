'use client';

import { AccountsPanel } from '@/components/dashboard/cuentas/accounts-panel';
import { ProfessorsPanel } from '@/components/dashboard/cuentas/professors-panel';

export default function CuentasPage() {
  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <h1 className='font-tan-nimbus text-2xl font-bold text-[#455a54] sm:text-3xl'>
          Cuentas
        </h1>
        <p className='mt-0.5 font-winter-solid text-sm text-[#455a54]/60'>
          Creá y reseteá cuentas del sistema, cambiá contraseñas, roles y qué
          vistas puede ver cada una. Abajo, los profesores del taller.
        </p>
      </div>
      <AccountsPanel />
      <ProfessorsPanel />
    </div>
  );
}
