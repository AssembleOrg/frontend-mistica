'use client';

import { EquipoPanel } from '@/components/dashboard/equipo/equipo-panel';

export default function EquipoPage() {
  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <h1 className='font-tan-nimbus text-2xl font-bold text-[#455a54] sm:text-3xl'>
          Equipo
        </h1>
        <p className='mt-0.5 font-winter-solid text-sm text-[#455a54]/60'>
          Tareas internas del personal y lista de compras del establecimiento.
        </p>
      </div>
      <EquipoPanel />
    </div>
  );
}
