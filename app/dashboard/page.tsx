'use client';

// Real Production Dashboard - Only real data from backend
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Footer } from '@/components/ui/footer';

/**
 * REAL PRODUCTION DASHBOARD
 * 
 * - Uses real authenticated user data
 * - Shows only implemented modules
 * - No fake/mock data
 * - Clean and professional
 */

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  
  // Real modules with backend connection
  const realModules = [
    {
      name: 'Ventas',
      description: 'Punto de venta',
      href: '/dashboard/sales',
      icon: ShoppingCart,
      color: 'bg-gradient-to-r from-[#9d684e] to-[#9d684e]/90',
      available: true
    },
    {
      name: 'Productos',
      description: 'Catálogo conectado',
      href: '/dashboard/products',
      icon: Package,
      color: 'bg-gradient-to-r from-green-500 to-green-600',
      available: true
    },
    {
      name: 'Personal',
      description: 'Personal de Mistica Autentica',
      href: '/dashboard/staff',
      icon: Users,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      available: true
    },
    {
      name: 'Finanzas',
      description: 'Reportes y caja',
      href: '/dashboard/finances',
      icon: BarChart3,
      color: 'bg-gradient-to-r from-purple-500 to-purple-600',
      available: false // Until we have real financial data
    }
  ];
  
  if (!isAuthenticated) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-[#efcbb9]/20 to-white p-6'>
      <div className='max-w-4xl mx-auto space-y-8'>
        
        {/* Real Header with Logo and User */}
        <Card className='border-[#9d684e]/20 bg-white/80 backdrop-blur-sm'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-4'>
                <div className='w-16 h-16 rounded-full bg-gradient-to-r from-[#9d684e] to-[#9d684e]/80 flex items-center justify-center overflow-hidden'>
                  <Image
                    src='/Logo-2-mistica.png'
                    alt='MÍSTICA Logo'
                    width={48}
                    height={48}
                    className='object-contain'
                  />
                </div>
                <div>
                  <h1 className='text-2xl font-bold text-[#455a54] font-tan-nimbus'>
                    ¡Hola, {user?.name}! 👋
                  </h1>
                  <p className='text-[#455a54]/70 font-winter-solid'>
                    {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })} • {user?.role === 'admin' ? 'Administrador' : 'Usuario'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real Navigation to Implemented Modules */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {realModules.map((module) => {
            const IconComponent = module.icon;
            
            return (
              <Card 
                key={module.name}
                className={`border-[#9d684e]/20 hover:border-[#9d684e]/40 transition-all duration-200 ${
                  module.available 
                    ? 'hover:shadow-lg cursor-pointer bg-white' 
                    : 'opacity-60 bg-gray-50'
                }`}
              >
                <CardContent className='p-6'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-4'>
                      <div className={`p-3 rounded-xl text-white ${module.color}`}>
                        <IconComponent className='h-6 w-6' />
                      </div>
                      <div>
                        <h3 className='text-lg font-semibold text-[#455a54] font-tan-nimbus'>
                          {module.name}
                        </h3>
                        <p className='text-[#455a54]/70 font-winter-solid'>
                          {module.description}
                        </p>
                        {!module.available && (
                          <p className='text-xs text-amber-600 font-winter-solid mt-1'>
                            Próximamente
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {module.available ? (
                      <Button
                        asChild
                        variant='ghost'
                        size='sm'
                        className='text-[#9d684e] hover:text-[#9d684e]/80'
                      >
                        <Link href={module.href} className='flex items-center gap-2'>
                          Abrir
                          <ArrowRight className='h-4 w-4' />
                        </Link>
                      </Button>
                    ) : (
                      <div className='text-gray-400'>
                        <ArrowRight className='h-4 w-4' />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Footer with PisTech branding and WhatsApp contact */}
        <Footer variant="minimal" />
      </div>
    </div>
  );
}
