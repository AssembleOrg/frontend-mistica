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
  UserCheck,
  CreditCard,
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
    enabled: true,
  },
  {
    title: 'Clientes',
    url: '/dashboard/clients',
    icon: UserCheck,
    enabled: true,
  },
  {
    title: 'Señas',
    url: '/dashboard/prepaids',
    icon: CreditCard,
    enabled: true,
  },
  // {
  //   title: 'Caja y Finanzas',
  //   url: '/dashboard/finances',
  //   icon: DollarSign,
  //   enabled: true,
  // },
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
    enabled: true,
  },
  // {
  //   title: 'Configuración',
  //   url: '/dashboard/settings',
  //   icon: Settings,
  //   enabled: true,
  // },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { logout, user } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
      logout();
      router.push('/');
      showToast.success('Sesión cerrada correctamente');
    }
  };

  // Filter navigation items based on user role
  // Map backend roles to UI roles for navigation logic
  const getUserRole = () => {
    if (!user) return null;
    // For now, map backend roles to UI expectations
    // Backend: 'admin' | 'user'  ->  UI logic expects: 'admin' | 'gerente' | 'cajero'
    return user.role === 'admin' ? 'admin' : 'gerente';
  };

  const filteredNavItems = navigationItems.filter((item) => {
    if (!user) return true; // Show all if no user (shouldn't happen)

    const uiRole = getUserRole();

    // Note: 'cajero' role not implemented in backend yet
    // if (uiRole === 'cajero') {
    //   return ['Dashboard', 'Productos', 'Ventas'].includes(item.title);
    // }

    if (uiRole === 'gerente') {
      // Gerente: Todo menos Personal
      return item.title !== 'Personal';
    }

    // Admin: Ve todo
    return true;
  });

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
            className='object-contain h-8 w-auto'
          />
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
