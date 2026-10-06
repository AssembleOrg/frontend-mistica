'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Bot,
  CalendarRange,
  ChefHat,
  Grid2x2,
  MessageCircle,
  Palette,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { allowedReservasTabs, canSeeReservationDetails } from '@/lib/views';
import { ExperienciasTab } from '@/components/dashboard/reservas/experiencias-tab';
import { MesasTab } from '@/components/dashboard/reservas/mesas-tab';
import { ConversacionesTab } from '@/components/dashboard/reservas/conversaciones-tab';
import { ReservasTab } from '@/components/dashboard/reservas/reservas-tab';
import { PiezasTab } from '@/components/dashboard/reservas/piezas-tab';
import { BotTab } from '@/components/dashboard/reservas/bot-tab';
import { CocinaTab } from '@/components/dashboard/reservas/cocina-tab';

type Tab =
  | 'reservas'
  | 'mesas'
  | 'experiencias'
  | 'consultas'
  | 'piezas'
  | 'cocina'
  | 'bot';

// Reservas = agenda (día/semana) + listado completo, en una sola pestaña.
const TABS: { key: Tab; label: string; icon: typeof Palette }[] = [
  { key: 'reservas', label: 'Reservas', icon: CalendarRange },
  { key: 'mesas', label: 'Mesas', icon: Grid2x2 },
  { key: 'experiencias', label: 'Experiencias', icon: Palette },
  { key: 'consultas', label: 'Consultas', icon: MessageCircle },
  { key: 'piezas', label: 'Piezas', icon: Flame },
  { key: 'cocina', label: 'Cocina', icon: ChefHat },
  { key: 'bot', label: 'Bot', icon: Bot },
];

// Pestaña desde la URL (?tab=bot), para poder linkearla desde el menú. Va en
// un hijo con Suspense: es lo que pide Next para useSearchParams.
function TabFromQuery({ onTab }: { onTab: (t: Tab) => void }) {
  const params = useSearchParams();
  const t = params.get('tab');
  useEffect(() => {
    if (t && TABS.some((x) => x.key === t)) onTab(t as Tab);
  }, [t, onTab]);
  return null;
}

export default function ReservasAdminPage() {
  const { user } = useAuth();

  // Pestañas visibles según la cuenta: un profesor con sólo 'reservas:piezas'
  // habilitada entra acá y ve únicamente Piezas.
  const visibleTabs = useMemo(() => {
    const allowed = allowedReservasTabs(user?.role, user?.allowedViews);
    return TABS.filter((t) => allowed.includes(t.key));
  }, [user?.role, user?.allowedViews]);

  const [tab, setTab] = useState<Tab>('reservas');
  // La cuenta de cocina (ve la agenda recortada) arranca en Cocina.
  const kitchenFirst =
    !!user &&
    !canSeeReservationDetails(user.role, user.allowedViews) &&
    visibleTabs.some((t) => t.key === 'cocina');
  const [picked, setPicked] = useState(false);
  const current: Tab = !picked && kitchenFirst ? 'cocina' : tab;
  const active: Tab = visibleTabs.some((t) => t.key === current)
    ? current
    : (visibleTabs[0]?.key ?? 'reservas');
  // Estable: TabFromQuery lo usa en un efecto.
  const choose = useCallback((t: Tab) => {
    setPicked(true);
    setTab(t);
  }, []);

  return (
    <div className='flex flex-col gap-4'>
      <Suspense fallback={null}>
        <TabFromQuery onTab={choose} />
      </Suspense>
      <div className='flex flex-col gap-1'>
        <h1 className='text-2xl sm:text-3xl font-bold text-[#455a54] font-tan-nimbus'>Reservas</h1>
        <p className='text-sm text-[#455a54]/60 font-winter-solid mt-0.5'>
          Experiencias, horarios y reservas de la landing pública.
        </p>
      </div>

      <div className='-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0'>
        {visibleTabs.map(({ key, label, icon: Icon }) => {
          const on = key === active;
          return (
            <Button
              key={key}
              type='button'
              variant={on ? 'verde' : 'ghost'}
              onClick={() => choose(key)}
              className={cn(
                'shrink-0 gap-2',
                !on && 'bg-white text-[#3d3338] hover:bg-white/70',
              )}
            >
              <Icon className='h-4 w-4' />
              {label}
            </Button>
          );
        })}
      </div>

      {active === 'mesas' && <MesasTab />}
      {active === 'experiencias' && <ExperienciasTab />}
      {active === 'reservas' && <ReservasTab />}
      {active === 'consultas' && <ConversacionesTab />}
      {active === 'piezas' && <PiezasTab />}
      {active === 'cocina' && <CocinaTab />}
      {active === 'bot' && <BotTab />}
    </div>
  );
}
