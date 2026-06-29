'use client';

import * as React from 'react';
import {
  Home,
  Package,
  ShoppingCart,
  Users,
  LogOut,
  Warehouse,
  UserCheck,
  // CreditCard, // usado por la card de Señas (ocultada)
  DollarSign,
  Tag,
  Activity,
  Ticket,
  Smartphone,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { showToast } from '@/lib/toast';
import { CashboxCta } from '@/components/dashboard/cashbox/cashbox-cta';

const SIDEBAR_STYLE = {
  '--sidebar-background': '#efcbb9',
  '--sidebar-foreground': '#455a54',
  '--sidebar-primary': '#9d684e',
  '--sidebar-primary-foreground': '#ffffff',
  '--sidebar-accent': '#e0a38d',
  '--sidebar-accent-foreground': '#455a54',
  '--sidebar-border': '#d9dadb',
} as React.CSSProperties;

const navigationItems = [
  { title: 'Dashboard',       url: '/dashboard',            icon: Home,         enabled: true,  adminOnly: false },
  { title: 'Ventas',          url: '/dashboard/sales',      icon: ShoppingCart, enabled: true,  adminOnly: false },
  { title: 'Clientes',        url: '/dashboard/clients',    icon: UserCheck,    enabled: true,  adminOnly: false },
  { title: 'Reservas',        url: '/dashboard/reservas',   icon: Ticket,       enabled: true,  adminOnly: false },
  { title: 'Bot WhatsApp',    url: '/dashboard/bot',        icon: Smartphone,   enabled: true,  adminOnly: true  },
  // Vista de Señas ocultada de la navegación a pedido del cliente. Las señas
  // se siguen creando desde la venta y viéndose en el detalle del cliente;
  // sólo se quita el acceso directo a /dashboard/prepaids (la ruta queda).
  // { title: 'Señas', url: '/dashboard/prepaids', icon: CreditCard, enabled: true, adminOnly: false },
  { title: 'Caja y Finanzas', url: '/dashboard/finances',   icon: DollarSign,   enabled: true,  adminOnly: true  },
  { title: 'Productos',       url: '/dashboard/products',   icon: Package,      enabled: true,  adminOnly: false },
  { title: 'Categorías',      url: '/dashboard/categories', icon: Tag,          enabled: true,  adminOnly: true  },
  { title: 'Stock',           url: '/dashboard/stock',      icon: Warehouse,    enabled: true,  adminOnly: true  },
  { title: 'Actividad',      url: '/dashboard/activity',   icon: Activity,     enabled: true,  adminOnly: true  },
  { title: 'Personal',        url: '/dashboard/staff',      icon: Users,        enabled: false, adminOnly: true  },
  // { title: 'Configuración', url: '/dashboard/settings', icon: Settings, enabled: true, adminOnly: true },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { logout, user } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
      logout();
      router.push('/login');
      showToast.success('Sesión cerrada correctamente');
    }
  };

  const userRole = user?.role ?? null;
  const filteredNavItems = React.useMemo(() => {
    return navigationItems.filter((item) => {
      if (item.enabled === false) return false;
      if (item.adminOnly && userRole !== 'admin') return false;
      return true;
    });
  }, [userRole]);

  return (
    <Sidebar
      collapsible='icon'
      {...props}
      style={SIDEBAR_STYLE}
    >
      <SidebarHeader>
        <div className='flex items-center gap-2 px-4 py-4'>
          <Image
            src='/Logo-mistica.png'
            width={400}
            height={32}
            alt='MÍSTICA Logo'
            className='object-contain h-8 w-auto'
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
        </div>
        <div className='px-3 pb-3 group-data-[collapsible=icon]:hidden'>
          <div className='rounded-xl border border-[#9d684e]/30 bg-[#9d684e]/10 p-2'>
            <CashboxCta />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {filteredNavItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.enabled ? (
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  className='text-[#455a54] hover:bg-[#9d684e]/10 hover:text-[#9d684e] touch-target'
                >
                  <Link
                    href={item.url}
                    className='flex items-center gap-2'
                  >
                    <item.icon className='h-5 w-5 sm:h-4 sm:w-4' />
                    <span className='font-winter-solid text-sm sm:text-base group-data-[collapsible=icon]:hidden'>
                      {item.title}
                    </span>
                  </Link>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  className='text-[#455a54]/50 cursor-not-allowed opacity-50 touch-target'
                  disabled
                  tooltip='Próximamente disponible'
                >
                  <item.icon className='h-5 w-5 sm:h-4 sm:w-4' />
                  <span className='font-winter-solid text-sm sm:text-base group-data-[collapsible=icon]:hidden'>
                    {item.title}
                  </span>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip='Cerrar Sesión'
              className='text-[#455a54] hover:bg-red-50 hover:text-red-600 touch-target'
            >
              <LogOut className='h-5 w-5 sm:h-4 sm:w-4' />
              <span className='font-winter-solid text-sm sm:text-base group-data-[collapsible=icon]:hidden'>
                Cerrar Sesión
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
