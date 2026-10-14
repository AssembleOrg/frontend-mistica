'use client';

import { ProduccionPanel } from '@/components/dashboard/produccion/produccion-panel';
import { HornosPanel } from '@/components/dashboard/hornos/hornos-panel';
import { PiezasElegidas } from '@/components/dashboard/produccion/piezas-elegidas';

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
      <div className='mt-4 flex flex-col gap-3'>
        <h2 className='font-tan-nimbus text-xl font-bold text-[#455a54]'>
          Piezas que eligen los clientes
        </h2>
        <p className='-mt-2 text-sm text-[#455a54]/60'>
          Lo que se carga en Piezas, por tipo: para saber qué se consume más y
          qué reponer.
        </p>
        <PiezasElegidas />
      </div>
      <div className='mt-4 flex flex-col gap-3'>
        <h2 className='font-tan-nimbus text-xl font-bold text-[#455a54]'>Hornos</h2>
        <HornosPanel />
      </div>
    </div>
  );
}
