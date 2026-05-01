'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingBag,
  DollarSign,
  Package,
  TrendingUp,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import { useAppStore } from '@/stores/app.store';
import { formatCurrency, formatNumber } from '@/lib/sales-calculations';

export function SalesStatsWidget() {
  const router = useRouter();
  const salesHistory = useAppStore((s) => s.salesHistory);

  // Calcular estadísticas del día actual usando el nuevo store
  const todayStats = useMemo(() => {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const allSales = salesHistory;
    const todaySales = allSales.filter((sale) => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= startOfDay && saleDate < endOfDay;
    });

    const totalSales = todaySales.length;
    const totalRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const totalItems = todaySales.reduce(
      (sum, sale) =>
        sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    return {
      totalSales,
      totalRevenue,
      totalItems,
      averageTicket,
    };
  }, [salesHistory]);

  // Remove duplicate formatting functions - now using centralized versions

  const handleViewHistory = () => {
    router.push('/dashboard/sales/history');
  };

  return (
    <Card className='border-[var(--color-gris-claro)] bg-gradient-to-br from-white to-[var(--color-rosa-claro)]/30'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Calendar className='h-5 w-5 text-[#455a54]' />
            <span className='text-[#455a54] font-tan-nimbus'>
              Ventas de Hoy
            </span>
          </div>
          <Badge
            variant='secondary'
            className='bg-[var(--color-gris-claro)]/50 text-[var(--color-ciruela-oscuro)]'
          >
            {new Date().toLocaleDateString('es-AR', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Métricas */}
        <div className='space-y-3'>
          {/* Total ingresos */}
          <div className='flex items-center gap-4 p-4 bg-white rounded-lg border border-[var(--color-gris-claro)]/50'>
            <div className='p-3 bg-blue-100 rounded-full'>
              <DollarSign className='h-5 w-5 text-blue-600' />
            </div>
            <div className='min-w-0 flex-1'>
              <p className='text-sm text-[#455a54] font-medium font-winter-solid'>
                Ingresos del Día
              </p>
              <p className='text-2xl font-bold text-[#455a54] font-tan-nimbus leading-tight'>
                {formatCurrency(todayStats.totalRevenue)}
              </p>
            </div>
          </div>

          {/* Ventas y Items */}
          <div className='grid grid-cols-2 gap-3'>
            <div className='flex items-center gap-3 p-3 bg-white rounded-lg border border-[var(--color-gris-claro)]/50'>
              <div className='p-2 bg-green-100 rounded-full'>
                <ShoppingBag className='h-4 w-4 text-green-600' />
              </div>
              <div className='min-w-0'>
                <p className='text-xs text-[#455a54] font-medium font-winter-solid'>
                  Ventas
                </p>
                <p className='text-lg font-bold text-[#455a54]'>
                  {formatNumber(todayStats.totalSales)}
                </p>
              </div>
            </div>

            {/* Items vendidos */}
            <div className='flex items-center gap-3 p-3 bg-white rounded-lg border border-[var(--color-gris-claro)]/50'>
              <div className='p-2 bg-purple-100 rounded-full'>
                <Package className='h-4 w-4 text-purple-600' />
              </div>
              <div className='min-w-0'>
                <p className='text-xs text-[#455a54] font-medium font-winter-solid'>
                  Items Vendidos
                </p>
                <p className='text-lg font-bold text-[#455a54]'>
                  {formatNumber(todayStats.totalItems)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className='flex items-center justify-between p-3 bg-[var(--color-rosa-claro)]/20 rounded-lg border border-[var(--color-gris-claro)]/50'>
          <div className='flex items-center gap-2'>
            <TrendingUp className='h-4 w-4 text-[var(--color-verde-profundo)]' />
            <span className='text-sm text-[var(--color-ciruela-oscuro)] font-winter-solid'>
              Ticket promedio: {formatCurrency(todayStats.averageTicket)}
            </span>
          </div>
        </div>

        {/* Botón para ir al historial */}
        <Button
          onClick={handleViewHistory}
          variant='verde'
          className='w-full font-winter-solid'
          size='lg'
        >
          <ExternalLink className='h-4 w-4 mr-2' />
          Ver Historial Completo
        </Button>

        {/* Información rápida sobre productos más vendidos */}
        {todayStats.totalItems > 0 && (
          <div className='pt-2 border-t border-[var(--color-gris-claro)]'>
            <p className='text-xs text-[var(--color-verde-profundo)] font-medium font-winter-solid mb-2'>
              Total de items vendidos hoy: {todayStats.totalItems}
            </p>
          </div>
        )}

        {/* Estado cuando no hay ventas */}
        {todayStats.totalSales === 0 && (
          <div className='text-center py-4 text-[var(--color-ciruela-oscuro)]/70'>
            <ShoppingBag className='h-8 w-8 mx-auto mb-2 opacity-50' />
            <p className='text-sm font-winter-solid'>
              No hay ventas registradas hoy
            </p>
            <p className='text-xs font-winter-solid'>
              ¡Empeza a vender para ver las estadísticas!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
