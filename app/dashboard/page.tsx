'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { StatsCard } from '@/components/dashboard/stats-card';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { ActivityTable } from '@/components/dashboard/activity-table';
import { useActivityStore } from '@/stores/activity.store';
import {
  StatsCardSkeleton,
  QuickActionsSkeleton,
  DashboardInfoCardSkeleton,
} from '@/components/ui/loading-skeletons';
import {
  TrendingDown,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
} from 'lucide-react';

interface DashboardData {
  dailyRevenue: string;
  monthlyExpenses: string;
  todayTransactions: number;
  lowStock: number;
}

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const { getRecentActivities, addActivity } = useActivityStore();

  useEffect(() => {
    // Simulate data loading with realistic delay
    const loadDashboardData = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500)); // 1.5 second delay

      setDashboardData({
        dailyRevenue: '$45.800 ARS',
        monthlyExpenses: '$120.500 ARS',
        todayTransactions: 18,
        lowStock: 5,
      });

      //* Borrar son ejemplos para test de tabla
      addActivity({
        type: 'ingreso',
        description: 'Venta de Aceite Esencial de Lavanda',
        amount: 2599,
      });
      addActivity({
        type: 'egreso',
        description: 'Compra de inventario - Cristales',
        amount: 8500,
      });
      addActivity({
        type: 'cambio_producto',
        description: 'Actualizado stock de Velas Aromáticas',
      });

      setIsLoading(false);
    };

    loadDashboardData();
  }, [addActivity]);

  return (
    <div className='space-y-6 mt-6'>
      {/* Demo Banner */}
      <div className='border-2 border-dashed border-[#9d684e]/40 bg-[#efcbb9]/20 p-4 rounded-lg'>
        <div className='flex items-center gap-3'>
          <div className='text-2xl'>🚧</div>
          <div>
            <h3 className='font-winter-solid font-semibold text-[#455a54]'>
              DEMO - Aplicación en Desarrollo
            </h3>
            <p className='text-sm text-[#455a54]/70 font-winter-solid'>
              Los módulos de <strong>Productos</strong> y <strong>Stock</strong>{' '}
              están disponibles. Todo está sujeto a cambios.
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards with loading states */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            {/* 1. Ingresos del día: Directo del control de caja */}
            <StatsCard
              title='Ingresos del Día'
              value={dashboardData?.dailyRevenue || ''}
              change='+10% vs ayer'
              icon={DollarSign}
              trend='up'
              color='green'
            />
            {/* 2. Gastos del mes: La otra cara de la moneda para el control financiero */}
            <StatsCard
              title='Gastos del Mes'
              value={dashboardData?.monthlyExpenses || ''}
              change='+5% vs mes anterior'
              icon={TrendingDown}
              trend='down'
              color='orange'
            />
            {/* 3. Transacciones de Hoy: Refleja la actividad del negocio */}
            <StatsCard
              title='Transacciones de Hoy'
              value={dashboardData?.todayTransactions || 0}
              change='-3 desde ayer'
              icon={ShoppingCart}
              trend='down'
              color='terracota'
            />
            <StatsCard
              title='Stock Bajo'
              value={dashboardData?.lowStock || 0}
              change='2 productos críticos'
              icon={AlertTriangle}
              trend='neutral'
              color='red'
            />
          </>
        )}
      </div>

      {/* Quick Actions with loading state */}
      {isLoading ? <QuickActionsSkeleton /> : <QuickActions />}

      {/* Recent Activity Widget */}
      {isLoading ? (
        <DashboardInfoCardSkeleton />
      ) : (
        <Card className='border-[#9d684e]/20'>
          <CardHeader>
            <CardTitle className='text-[#455a54] font-tan-nimbus'>
              Actividad Reciente
            </CardTitle>
            <CardDescription className='font-winter-solid'>
              Últimos movimientos y cambios en tu negocio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityTable
              data={getRecentActivities(5)}
              isLoading={false}
              compact={true}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
