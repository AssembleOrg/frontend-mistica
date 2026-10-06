'use client';

import { ProduccionPanel } from '@/components/dashboard/produccion/produccion-panel';

export default function ProduccionPage() {
  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <h1 className='font-tan-nimbus text-2xl font-bold text-[#455a54] sm:text-3xl'>
          Producción de piezas
        </h1>
        <p className='mt-0.5 font-winter-solid text-sm text-[#455a54]/60'>
          Piezas que pidieron los alumnos, en el orden en que se pidieron. Marcá
          &quot;Lista&quot; cuando termines cada una.
        </p>
      </div>
      <ProduccionPanel />
    </div>
  );
}
