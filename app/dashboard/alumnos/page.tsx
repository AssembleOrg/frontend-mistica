'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlumnosPanel } from '@/components/dashboard/alumnos/alumnos-panel';
import { GruposPanel } from '@/components/dashboard/alumnos/grupos-panel';

export default function AlumnosPage() {
  return (
    <Suspense fallback={null}>
      <AlumnosPageInner />
    </Suspense>
  );
}

function AlumnosPageInner() {
  const params = useSearchParams();
  // Deep-link desde la Agenda: ?tab=grupos&group=<id> abre grupos y su grupo.
  const initialTab = params.get('tab') === 'grupos' ? 'grupos' : 'alumnos';
  const focusGroup = params.get('group') || undefined;
  const [tab, setTab] = useState<'alumnos' | 'grupos'>(initialTab);

  useEffect(() => {
    if (params.get('tab') === 'grupos') setTab('grupos');
  }, [params]);
  const chip = (on: boolean) =>
    `rounded-lg border px-4 py-2 text-sm font-semibold transition ${
      on
        ? 'border-[#455a54] bg-[#455a54] text-white'
        : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
    }`;

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <h1 className='font-tan-nimbus text-2xl font-bold text-[#455a54] sm:text-3xl'>
          Alumnos y grupos
        </h1>
        <p className='mt-0.5 font-winter-solid text-sm text-[#455a54]/60'>
          Seguimiento de los alumnos del taller — administrativo y práctico —
          y gestión de grupos, talleres y clases con su asistencia.
        </p>
      </div>
      <div className='flex gap-2'>
        <button type='button' className={chip(tab === 'alumnos')} onClick={() => setTab('alumnos')}>
          Alumnos
        </button>
        <button type='button' className={chip(tab === 'grupos')} onClick={() => setTab('grupos')}>
          Grupos y clases
        </button>
      </div>
      {tab === 'alumnos' ? <AlumnosPanel /> : <GruposPanel focusGroupId={focusGroup} />}
    </div>
  );
}
