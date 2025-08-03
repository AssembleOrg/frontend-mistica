'use client';

import * as React from 'react';
import {
  Home,
  Package,
  ShoppingCart,
  DollarSign,
  Users,
  Settings,
  LogOut,
  Warehouse,
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
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';
import { showToast } from '@/lib/toast';

const navigationItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: Home,
    enabled: true,
  },
  {
    title: 'Ventas',
    url: '/dashboard/sales',
    icon: ShoppingCart,
    enabled: false,
  },
  {
    title: 'Caja y Finanzas',
    url: '/dashboard/finances',
    icon: DollarSign,
    enabled: false,
  },
  {
    title: 'Productos',
    url: '/dashboard/products',
    icon: Package,
    enabled: true,
  },
  {
    title: 'Stock',
    url: '/dashboard/stock',
    icon: Warehouse,
    enabled: true,
  },
  {
    title: 'Personal',
    url: '/dashboard/staff',
    icon: Users,
    enabled: false,
  },
  {
    title: 'Configuración',
    url: '/dashboard/settings',
    icon: Settings,
    enabled: false,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
      logout();
      router.push('/');
      showToast.success('Sesión cerrada correctamente');
    }
  };

  return (
    <Sidebar
      collapsible='icon'
      {...props}
      style={
        {
          '--sidebar-background': '#efcbb9',
          '--sidebar-foreground': '#455a54',
          '--sidebar-primary': '#9d684e',
          '--sidebar-primary-foreground': '#ffffff',
          '--sidebar-accent': '#e0a38d',
          '--sidebar-accent-foreground': '#455a54',
          '--sidebar-border': '#d9dadb',
        } as React.CSSProperties
      }
    >
      <SidebarHeader>
        <div className='flex items-center gap-2 px-4 py-4'>
          <Image
            src='/Logo-mistica.png'
            width={400}
            height={32}
            alt='MÍSTICA Logo'
            className='object-contain'
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.enabled ? (
                <SidebarMenuButton
                  asChild
                  className='text-[#455a54] hover:bg-[#9d684e]/10 hover:text-[#9d684e]'
                >
                  <Link
                    href={item.url}
                    className='flex items-center gap-2'
                  >
                    <item.icon className='h-4 w-4' />
                    <span className='font-winter-solid'>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  className='text-[#455a54]/50 cursor-not-allowed opacity-50'
                  disabled
                  title='Próximamente disponible'
                >
                  <item.icon className='h-4 w-4' />
                  <span className='font-winter-solid'>{item.title}</span>
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
              className='text-[#455a54] hover:bg-red-50 hover:text-red-600'
            >
              <LogOut className='h-4 w-4' />
              <span className='font-winter-solid'>Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

//* Implementación de roles en esta view:
// const { user } = useAuthStore(); // A

// const filteredNavItems = navigationItems.filter((item) => {
//   if (user?.role === 'vendedor') {
//     return ['Dashboard', 'Ventas'].includes(item.title);
//   }
//   return true;
// });
