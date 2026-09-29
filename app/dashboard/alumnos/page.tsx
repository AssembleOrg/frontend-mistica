'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlumnosPanel } from '@/components/dashboard/alumnos/alumnos-panel';
import { GruposPanel } from '@/components/dashboard/alumnos/grupos-panel';
import { PiezasMesPanel } from '@/components/dashboard/alumnos/piezas-mes-panel';

type Tab = 'grupos' | 'alumnos' | 'piezas';
const TABS: { key: Tab; label: string }[] = [
  { key: 'grupos', label: 'Grupos y clases' },
  { key: 'alumnos', label: 'Alumnos' },
  { key: 'piezas', label: 'Piezas del mes' },
];
const isTab = (t: string | null): t is Tab => TABS.some((x) => x.key === t);

export default function AlumnosPage() {
  return (
    <Suspense fallback={null}>
      <AlumnosPageInner />
    </Suspense>
  );
}

function AlumnosPageInner() {
  const params = useSearchParams();
  // Grupos y clases es la vista del día a día: va por defecto. Deep-link desde
  // la Agenda: ?tab=grupos&group=<id> abre grupos y su grupo.
  const queryTab = params.get('tab');
  const focusGroup = params.get('group') || undefined;
  const [tab, setTab] = useState<Tab>(isTab(queryTab) ? queryTab : 'grupos');

  useEffect(() => {
    if (isTab(queryTab)) setTab(queryTab);
  }, [queryTab]);
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
      <div className='flex flex-wrap gap-2'>
        {TABS.map((t) => (
          <button key={t.key} type='button' className={chip(tab === t.key)} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'grupos' && <GruposPanel focusGroupId={focusGroup} />}
      {tab === 'alumnos' && <AlumnosPanel />}
      {tab === 'piezas' && <PiezasMesPanel />}
    </div>
  );
}
