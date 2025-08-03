import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  ShoppingCart,
  FileText,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  color: 'primary' | 'secondary' | 'accent';
  enabled?: boolean;
}

const colorConfig = {
  primary: 'bg-[#9d684e] hover:bg-[#9d684e]/90 text-white',
  secondary: 'bg-[#455a54] hover:bg-[#455a54]/90 text-white',
  accent: 'bg-[#cc844a] hover:bg-[#cc844a]/90 text-white',
};

function QuickActionButton({
  title,
  description,
  href,
  icon: Icon,
  color,
  enabled = true,
}: QuickActionProps) {
  if (!enabled) {
    return (
      <Button
        disabled
        className='h-auto p-4 flex flex-col items-start gap-2 opacity-50 cursor-not-allowed bg-gray-100 text-gray-400'
        title='Próximamente disponible'
      >
        <div className='flex items-center gap-2 w-full'>
          <Icon className='h-5 w-5' />
          <span className='font-winter-solid font-semibold'>{title}</span>
        </div>
        <p className='text-xs opacity-90 text-left'>{description}</p>
      </Button>
    );
  }

  return (
    <Button
      asChild
      className={`h-auto p-4 flex flex-col items-start gap-2 ${colorConfig[color]}`}
    >
      <Link href={href}>
        <div className='flex items-center gap-2 w-full'>
          <Icon className='h-5 w-5' />
          <span className='font-winter-solid font-semibold'>{title}</span>
        </div>
        <p className='text-xs opacity-90 text-left'>{description}</p>
      </Link>
    </Button>
  );
}

export function QuickActions() {
  const actions = [
    {
      title: 'Productos',
      description: 'Gestionar inventario y catálogo de productos.',
      href: '/dashboard/products',
      icon: Plus,
      color: 'primary' as const,
      enabled: true,
    },
    {
      title: 'Stock',
      description: 'Ajustar cantidades y gestionar inventario.',
      href: '/dashboard/stock',
      icon: Warehouse,
      color: 'secondary' as const,
      enabled: true,
    },
    {
      title: 'Registrar Venta',
      description: 'Iniciar el proceso de venta y facturación.',
      href: '/dashboard/sales/new',
      icon: ShoppingCart,
      color: 'accent' as const,
      enabled: false,
    },
    {
      title: 'Generar Reporte',
      description: 'Exportar movimientos o ver resúmenes.',
      href: '/dashboard/reports',
      icon: FileText,
      color: 'secondary' as const,
      enabled: false,
    },
  ];

  return (
    <Card className='border-[#9d684e]/20'>
      <CardHeader>
        <CardTitle className='text-[#455a54] font-tan-nimbus'>
          Acciones Rápidas
        </CardTitle>
        <CardDescription className='font-winter-solid'>
          Accesos directos a las funciones más utilizadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          {actions.map((action) => (
            <QuickActionButton
              key={action.title}
              {...action}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
