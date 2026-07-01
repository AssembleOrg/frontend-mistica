'use client';

import { useState } from 'react';
import { CalendarDays, MessageCircle, Palette, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ExperienciasTab } from '@/components/dashboard/reservas/experiencias-tab';
import { TurnosTab } from '@/components/dashboard/reservas/turnos-tab';
import { ReservasTab } from '@/components/dashboard/reservas/reservas-tab';
import { ConsultasTab } from '@/components/dashboard/reservas/consultas-tab';

type Tab = 'experiencias' | 'turnos' | 'reservas' | 'consultas';

const TABS: { key: Tab; label: string; icon: typeof Palette }[] = [
  { key: 'experiencias', label: 'Experiencias', icon: Palette },
  { key: 'turnos', label: 'Turnos', icon: CalendarDays },
  { key: 'reservas', label: 'Reservas', icon: Ticket },
  { key: 'consultas', label: 'Consultas', icon: MessageCircle },
];

export default function ReservasAdminPage() {
  const [tab, setTab] = useState<Tab>('turnos');

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <h1 className='text-2xl sm:text-3xl font-bold text-[#455a54] font-tan-nimbus'>Reservas</h1>
        <p className='text-sm text-[#455a54]/60 font-winter-solid mt-0.5'>
          Experiencias, turnos y reservas de la landing pública.
        </p>
      </div>

      <div className='flex flex-wrap gap-2'>
        {TABS.map(({ key, label, icon: Icon }) => {
          const on = key === tab;
          return (
            <Button
              key={key}
              type='button'
              variant={on ? 'verde' : 'ghost'}
              onClick={() => setTab(key)}
              className={cn(
                'gap-2',
                !on && 'bg-white text-[#3d3338] hover:bg-white/70',
              )}
            >
              <Icon className='h-4 w-4' />
              {label}
            </Button>
          );
        })}
      </div>

      {tab === 'experiencias' && <ExperienciasTab />}
      {tab === 'turnos' && <TurnosTab />}
      {tab === 'reservas' && <ReservasTab />}
      {tab === 'consultas' && <ConsultasTab />}
    </div>
  );
}
