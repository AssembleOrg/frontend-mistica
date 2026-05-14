'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Package, Landmark, Boxes, UserCircle2, Receipt, Activity } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Footer } from '@/components/ui/footer';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();

  const primaryModules = [
    { name: 'Ventas', description: 'Punto de venta', href: '/dashboard/sales', icon: ShoppingCart, iconBg: 'bg-[#9d684e]' },
    { name: 'Caja y Finanzas', description: 'Apertura, cierre y reportes', href: '/dashboard/finances', icon: Landmark, iconBg: 'bg-[#455a54]' },
  ];

  const secondaryModules = [
    { name: 'Productos',  description: 'Catálogo',        href: '/dashboard/products',  icon: Package,     iconBg: 'bg-[#cc844a]' },
    { name: 'Stock',      description: 'Inventario',       href: '/dashboard/stock',     icon: Boxes,       iconBg: 'bg-[#cc844a]/80' },
    { name: 'Clientes',   description: 'Base de clientes', href: '/dashboard/clients',   icon: UserCircle2, iconBg: 'bg-[#9d684e]/70' },
    { name: 'Señas',      description: 'Adelantos',        href: '/dashboard/prepaids',  icon: Receipt,     iconBg: 'bg-[#455a54]/70' },
    { name: 'Actividad',  description: 'Historial',        href: '/dashboard/activity',  icon: Activity,    iconBg: 'bg-[#455a54]/50' },
  ];

  if (!isAuthenticated) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[#efcbb9] p-4 sm:p-6'>
      <div className='max-w-4xl mx-auto space-y-5'>
        {/* Header */}
        <div className='flex items-center gap-3 px-1 pt-1'>
          <div className='w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#9d684e] flex items-center justify-center overflow-hidden shrink-0'>
            <Image
              src='/Logo-2-mistica.png'
              alt='MÍSTICA Logo'
              width={40}
              height={40}
              className='object-contain'
              style={{ width: 'auto', height: 'auto' }}
            />
          </div>
          <div>
            <h1 className='text-base sm:text-xl font-bold text-[#4e4247] font-tan-nimbus leading-tight'>
              ¡Hola, {user?.name}!
            </h1>
            <p className='text-xs text-[#4e4247]/70 font-winter-solid'>
              {format(new Date(), "EEEE d 'de' MMMM", { locale: es })} · {user?.role === 'admin' ? 'Administrador' : 'Usuario'}
            </p>
          </div>
        </div>

        {/* Módulos */}
        <div className='space-y-3'>
          <p className='text-xs text-[#4e4247]/50 font-tan-nimbus uppercase tracking-widest px-0.5'>
            Módulos
          </p>

          {/* Primarios: 2 columnas */}
          <div className='grid grid-cols-2 gap-3'>
            {primaryModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link key={mod.name} href={mod.href} className='block'>
                  <Card className='border-[#9d684e]/20 hover:border-[#9d684e]/40 hover:shadow-md transition-all duration-200 bg-[#fdf6f0] cursor-pointer group'>
                    <CardContent className='p-4 sm:p-5'>
                      <div className={`w-10 h-10 rounded-xl ${mod.iconBg} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                        <Icon className='h-5 w-5 text-white' />
                      </div>
                      <p className='text-sm sm:text-base font-semibold text-[#4e4247] font-tan-nimbus leading-tight'>
                        {mod.name}
                      </p>
                      <p className='text-xs text-[#9d684e] font-winter-solid mt-0.5'>
                        {mod.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Secundarios: 3 columnas */}
          <div className='grid grid-cols-3 gap-2 sm:gap-3'>
            {secondaryModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link key={mod.name} href={mod.href} className='block'>
                  <Card className='border-[#9d684e]/20 hover:border-[#9d684e]/40 hover:shadow-sm transition-all duration-200 bg-[#fdf6f0] cursor-pointer group'>
                    <CardContent className='p-3 sm:p-4 flex flex-col items-center text-center gap-2'>
                      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${mod.iconBg} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                        <Icon className='h-4 w-4 text-white' />
                      </div>
                      <div>
                        <p className='text-xs sm:text-sm font-semibold text-[#4e4247] font-tan-nimbus leading-tight'>
                          {mod.name}
                        </p>
                        <p className='text-[10px] text-[#9d684e]/70 font-winter-solid hidden sm:block'>
                          {mod.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        <Footer variant='minimal' />
      </div>
    </div>
  );
}
