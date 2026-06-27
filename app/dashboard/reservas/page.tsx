'use client';

import { useState } from 'react';
import { CalendarDays, Palette, Ticket } from 'lucide-react';
import { ExperienciasTab } from '@/components/dashboard/reservas/experiencias-tab';
import { TurnosTab } from '@/components/dashboard/reservas/turnos-tab';
import { ReservasTab } from '@/components/dashboard/reservas/reservas-tab';

type Tab = 'experiencias' | 'turnos' | 'reservas';

const TABS: { key: Tab; label: string; icon: typeof Palette }[] = [
  { key: 'experiencias', label: 'Experiencias', icon: Palette },
  { key: 'turnos', label: 'Turnos', icon: CalendarDays },
  { key: 'reservas', label: 'Reservas', icon: Ticket },
];

export default function ReservasAdminPage() {
  const [tab, setTab] = useState<Tab>('turnos');

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <h1 className='font-tan-nimbus text-2xl text-[#3d3338]'>Reservas</h1>
        <p className='text-sm text-[#7a6e6f]'>
          Experiencias, turnos y reservas de la landing pública.
        </p>
      </div>

      <div className='flex gap-2'>
        {TABS.map(({ key, label, icon: Icon }) => {
          const on = key === tab;
          return (
            <button
              key={key}
              type='button'
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                on
                  ? 'bg-[#455a54] text-white'
                  : 'bg-white text-[#3d3338] hover:bg-white/70'
              }`}
            >
              <Icon className='h-4 w-4' />
              {label}
            </button>
          );
        })}
      </div>

      {tab === 'experiencias' && <ExperienciasTab />}
      {tab === 'turnos' && <TurnosTab />}
      {tab === 'reservas' && <ReservasTab />}
    </div>
  );
}
