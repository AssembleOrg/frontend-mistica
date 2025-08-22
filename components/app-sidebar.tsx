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
  X,
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
import { useResponsive } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';

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
    title: 'Caja y Finanzas',
    url: '/dashboard/finances',
    icon: DollarSign,
    enabled: true,
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
    enabled: true,
  },
  {
    title: 'Configuración',
    url: '/dashboard/settings',
    icon: Settings,
    enabled: false,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { logout, user } = useAuthStore();
  const router = useRouter();
  const { isMobile, isTablet } = useResponsive();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleLogout = () => {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
      logout();
      router.push('/');
      showToast.success('Sesión cerrada correctamente');
    }
  };

  // Cerrar sidebar en móviles al navegar
  const handleNavigation = (url: string) => {
    if (isMobile) {
      setIsOpen(false);
    }
    router.push(url);
  };

  // Filter navigation items based on user role
  const filteredNavItems = navigationItems.filter((item) => {
    if (!user) return true; // Show all if no user (shouldn't happen)
    
    if (user.role === 'cajero') {
      // Cajero: Solo Dashboard, Productos (lectura), Ventas
      return ['Dashboard', 'Productos', 'Ventas'].includes(item.title);
    }
    
    if (user.role === 'gerente') {
      // Gerente: Todo menos Personal
      return item.title !== 'Personal';
    }
    
    // Admin: Ve todo
    return true;
  });

  // En móviles, mostrar overlay
  if (isMobile) {
    return (
      <>
        {/* Botón para abrir sidebar en móviles */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-40 md:hidden bg-[#efcbb9] border border-[#9d684e]"
        >
          <Home className="h-4 w-4" />
        </Button>

        {/* Overlay del sidebar móvil */}
        {isOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Sidebar móvil */}
            <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-[#efcbb9] border-r border-[#d9dadb] shadow-xl">
              <div className="flex flex-col h-full">
                {/* Header móvil */}
                <div className="flex items-center justify-between p-4 border-b border-[#d9dadb]">
                  <div className="flex items-center gap-2">
                    <Image
                      src='/Logo-mistica.png'
                      width={200}
                      height={24}
                      alt='MÍSTICA Logo'
                      className='object-contain'
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="text-[#455a54] hover:bg-[#9d684e]/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Contenido del sidebar */}
                <div className="flex-1 overflow-y-auto py-4">
                  <nav className="space-y-2 px-4">
                    {filteredNavItems.map((item) => (
                      <div key={item.title}>
                        {item.enabled ? (
                          <button
                            onClick={() => handleNavigation(item.url)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-left text-[#455a54] hover:bg-[#9d684e]/10 hover:text-[#9d684e] rounded-md transition-colors"
                          >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            <span className="font-winter-solid text-sm">{item.title}</span>
                          </button>
                        ) : (
                          <div className="w-full flex items-center gap-3 px-3 py-2 text-[#455a54]/50 opacity-50 cursor-not-allowed">
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            <span className="font-winter-solid text-sm">{item.title}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </nav>
                </div>

                {/* Footer móvil */}
                <div className="border-t border-[#d9dadb] p-4">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-[#455a54] hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
                  >
                    <LogOut className="h-4 w-4 flex-shrink-0" />
                    <span className="font-winter-solid text-sm">Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Sidebar normal para tablet y desktop
  return (
    <Sidebar
      collapsible={isTablet ? 'icon' : 'icon'}
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
      className={`
        ${isTablet ? 'w-16' : 'w-64'}
        transition-all duration-300 ease-in-out
      `}
    >
      <SidebarHeader>
        <div className='flex items-center gap-2 px-4 py-4'>
          <Image
            src='/Logo-mistica.png'
            width={isTablet ? 32 : 400}
            height={isTablet ? 32 : 32}
            alt='MÍSTICA Logo'
            className='object-contain'
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
                  className='text-[#455a54] hover:bg-[#9d684e]/10 hover:text-[#9d684e]'
                >
                  <Link
                    href={item.url}
                    className='flex items-center gap-2'
                  >
                    <item.icon className='h-4 w-4 flex-shrink-0' />
                    {!isTablet && (
                      <span className='font-winter-solid'>{item.title}</span>
                    )}
                  </Link>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  className='text-[#455a54]/50 cursor-not-allowed opacity-50'
                  disabled
                  title={!isTablet ? 'Próximamente disponible' : undefined}
                >
                  <item.icon className='h-4 w-4 flex-shrink-0' />
                  {!isTablet && (
                    <span className='font-winter-solid'>{item.title}</span>
                  )}
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
              title={isTablet ? 'Cerrar Sesión' : undefined}
            >
              <LogOut className='h-4 w-4 flex-shrink-0' />
              {!isTablet && (
                <span className='font-winter-solid'>Cerrar Sesión</span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

