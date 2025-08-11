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
import { useAppStore } from '@/stores/app.store';
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
  const { getRecentActivities } = useActivityStore();
  const { salesHistory, getLowStockProducts } = useAppStore();

  useEffect(() => {
    const loadDashboardData = async () => {
      // Calculate real stats from app data
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Daily sales
      const todaySales = salesHistory.filter(sale => 
        sale.createdAt >= startOfDay && sale.status === 'completed'
      );
      const dailyRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
      
      // Monthly data (simplified - using all sales for demo)
      const monthlyExpenses = salesHistory.reduce((sum, sale) => 
        sum + (sale.items?.reduce((itemSum, item) => 
          itemSum + (item.product?.costPrice || 0) * item.quantity, 0) || 0), 0
      );
      
      // Low stock count
      const lowStockProducts = getLowStockProducts();

      setDashboardData({
        dailyRevenue: dailyRevenue > 0 ? `$${dailyRevenue.toLocaleString('es-AR')} ARS` : '$0 ARS',
        monthlyExpenses: monthlyExpenses > 0 ? `$${monthlyExpenses.toLocaleString('es-AR')} ARS` : '$0 ARS',
        todayTransactions: todaySales.length,
        lowStock: lowStockProducts.length,
      });

      setIsLoading(false);
    };

    loadDashboardData();
  }, [salesHistory, getLowStockProducts]);

  return (
    <div className='space-y-6 mt-6'>
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
