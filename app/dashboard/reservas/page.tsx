'use client';

import { useMemo, useState } from 'react';
import {
  CalendarRange,
  Grid2x2,
  MessageCircle,
  Headset,
  Palette,
  Ticket,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { allowedReservasTabs } from '@/lib/views';
import { ExperienciasTab } from '@/components/dashboard/reservas/experiencias-tab';
import { AgendaTab } from '@/components/dashboard/reservas/agenda-tab';
import { MesasTab } from '@/components/dashboard/reservas/mesas-tab';
import { ConversacionesTab } from '@/components/dashboard/reservas/conversaciones-tab';
import { ReservasTab } from '@/components/dashboard/reservas/reservas-tab';
import { ConsultasTab } from '@/components/dashboard/reservas/consultas-tab';
import { PiezasTab } from '@/components/dashboard/reservas/piezas-tab';

type Tab =
  | 'agenda'
  | 'mesas'
  | 'experiencias'
  | 'reservas'
  | 'consultas'
  | 'charlas'
  | 'piezas';

const TABS: { key: Tab; label: string; icon: typeof Palette }[] = [
  { key: 'agenda', label: 'Agenda', icon: CalendarRange },
  { key: 'mesas', label: 'Mesas', icon: Grid2x2 },
  { key: 'experiencias', label: 'Experiencias', icon: Palette },
  { key: 'reservas', label: 'Reservas', icon: Ticket },
  { key: 'consultas', label: 'Consultas', icon: MessageCircle },
  { key: 'charlas', label: 'Charlas', icon: Headset },
  { key: 'piezas', label: 'Piezas', icon: Flame },
];

export default function ReservasAdminPage() {
  const { user } = useAuth();

  // Pestañas visibles según la cuenta: un profesor con sólo 'reservas:piezas'
  // habilitada entra acá y ve únicamente Piezas.
  const visibleTabs = useMemo(() => {
    const allowed = allowedReservasTabs(user?.role, user?.allowedViews);
    return TABS.filter((t) => allowed.includes(t.key));
  }, [user?.role, user?.allowedViews]);

  const [tab, setTab] = useState<Tab>('agenda');
  const active: Tab = visibleTabs.some((t) => t.key === tab)
    ? tab
    : (visibleTabs[0]?.key ?? 'agenda');

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <h1 className='text-2xl sm:text-3xl font-bold text-[#455a54] font-tan-nimbus'>Reservas</h1>
        <p className='text-sm text-[#455a54]/60 font-winter-solid mt-0.5'>
          Experiencias, horarios y reservas de la landing pública.
        </p>
      </div>

      <div className='flex flex-wrap gap-2'>
        {visibleTabs.map(({ key, label, icon: Icon }) => {
          const on = key === active;
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

      {active === 'agenda' && <AgendaTab />}
      {active === 'mesas' && <MesasTab />}
      {active === 'experiencias' && <ExperienciasTab />}
      {active === 'reservas' && <ReservasTab />}
      {active === 'consultas' && <ConsultasTab />}
      {active === 'charlas' && <ConversacionesTab />}
      {active === 'piezas' && <PiezasTab />}
    </div>
  );
}
