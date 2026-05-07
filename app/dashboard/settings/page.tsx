'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PaymentSettings } from '@/components/dashboard/settings/payment-settings';
import { PageHeader } from '@/components/ui/page-header';
import { Percent, Building2, Receipt, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type SectionKey = 'payments' | 'business' | 'receipt';

interface Section {
  key: SectionKey;
  label: string;
  icon: LucideIcon;
  description: string;
  available: boolean;
}

const sections: Section[] = [
  {
    key: 'payments',
    label: 'Métodos de pago',
    icon: Percent,
    description: 'Recargos y descuentos según cómo cobres',
    available: true,
  },
  {
    key: 'business',
    label: 'Empresa',
    icon: Building2,
    description: 'Datos del negocio y AFIP',
    available: false,
  },
  {
    key: 'receipt',
    label: 'Comprobantes',
    icon: Receipt,
    description: 'Diseño y campos del recibo',
    available: false,
  },
];

export default function SettingsPage() {
  const [active, setActive] = useState<SectionKey>('payments');
  const activeSection = sections.find((s) => s.key === active)!;

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Configuración'
        subtitle='Ajustá cómo trabaja MÍSTICA con tu negocio'
      />

      {/* Mobile: tabs scrollables */}
      <div className='lg:hidden -mx-4 px-4 overflow-x-auto'>
        <div className='flex gap-2 min-w-max'>
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.key;
            return (
              <button
                key={s.key}
                onClick={() => s.available && setActive(s.key)}
                disabled={!s.available}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-winter-solid whitespace-nowrap transition-colors border',
                  isActive
                    ? 'bg-[#9d684e] text-white border-[#9d684e]'
                    : 'bg-white text-[#455a54] border-[#9d684e]/20 hover:bg-[#efcbb9]/30',
                  !s.available && 'opacity-40 cursor-not-allowed'
                )}
              >
                <Icon className='h-4 w-4' />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className='grid lg:grid-cols-[240px_1fr] gap-6'>
        {/* Desktop: nav lateral */}
        <aside className='hidden lg:block'>
          <Card className='border-[#9d684e]/20 sticky top-4'>
            <CardContent className='p-2'>
              <nav className='space-y-1'>
                {sections.map((s) => {
                  const Icon = s.icon;
                  const isActive = active === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => s.available && setActive(s.key)}
                      disabled={!s.available}
                      className={cn(
                        'w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-left transition-colors',
                        isActive
                          ? 'bg-[#9d684e]/10 text-[#9d684e]'
                          : 'text-[#455a54] hover:bg-[#efcbb9]/30',
                        !s.available && 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      <Icon className='h-4 w-4 mt-0.5 flex-shrink-0' />
                      <div className='min-w-0'>
                        <div className='text-sm font-winter-solid font-medium'>
                          {s.label}
                          {!s.available && (
                            <span className='ml-2 text-xs text-[#455a54]/40'>
                              próximamente
                            </span>
                          )}
                        </div>
                        <div className='text-xs text-[#455a54]/60 mt-0.5'>
                          {s.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </aside>

        {/* Contenido */}
        <section className='space-y-4'>
          <div className='space-y-1'>
            <h2 className='text-xl font-tan-nimbus text-[#455a54] flex items-center gap-2'>
              <activeSection.icon className='h-5 w-5 text-[#9d684e]' />
              {activeSection.label}
            </h2>
            <p className='text-sm text-[#455a54]/70 font-winter-solid'>
              {activeSection.description}
            </p>
          </div>

          <Card className='border-[#9d684e]/20'>
            <CardContent className='pt-6'>
              {active === 'payments' && <PaymentSettings />}
              {active !== 'payments' && (
                <div className='py-12 text-center text-sm text-[#455a54]/60 font-winter-solid'>
                  Esta sección está en construcción.
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
