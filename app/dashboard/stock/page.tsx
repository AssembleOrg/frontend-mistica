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
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Package,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useStockStore } from '@/stores/stock.store';
import { useProductStore } from '@/stores/product.store';
import { generateStockReport } from '@/lib/stock-utils';

export default function StockDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const { getActiveAlerts, getRecentMovements, getStockSummary } =
    useStockStore();
  const { products, loadProducts } = useProductStore();

  // Cargar productos si están vacíos
  useEffect(() => {
    if (products.length === 0) {
      loadProducts();
    }
  }, [products.length, loadProducts]);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const activeAlerts = getActiveAlerts();
  const recentMovements = getRecentMovements(5);
  const stockSummary = getStockSummary();

  // Generate stock report
  const stockReport = generateStockReport(products, [], activeAlerts);

  if (isLoading) {
    return (
      <div className='space-y-6 mt-6'>
        <div className='animate-pulse'>
          <div className='h-8 bg-gray-200 rounded w-64 mb-2'></div>
          <div className='h-4 bg-gray-200 rounded w-96'></div>
        </div>
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className='animate-pulse'
            >
              <div className='h-32 bg-gray-200 rounded'></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stockActions = [
    {
      title: 'Ajustar Stock',
      description: 'Corregir cantidades manualmente',
      href: '/dashboard/stock/adjustments',
      icon: Plus,
      color: 'bg-[#9d684e] hover:bg-[#9d684e]/90',
    },
  ];

  return (
    <div className='space-y-6 mt-6'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold text-[#455a54] font-tan-nimbus'>
          Gestión de Stock
        </h1>
        <p className='text-[#455a54]/70 font-winter-solid'>
          Control y seguimiento de inventario en tiempo real
        </p>
      </div>

      {/* Quick Actions */}
      <Card className='border-[#9d684e]/20'>
        <CardHeader>
          <CardTitle className='text-[#455a54] font-tan-nimbus'>
            Acción Principal
          </CardTitle>
          <CardDescription className='font-winter-solid'>
            Gestión directa de inventario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            {stockActions.map((action) => (
              <Button
                key={action.href}
                asChild
                className={`h-auto p-4 flex flex-col items-center justify-center gap-2 text-white text-center ${action.color}`}
              >
                <Link href={action.href}>
                  <action.icon className='h-7 w-7 mb-1' />
                  <div>
                    <div className='font-winter-solid font-semibold'>
                      {action.title}
                    </div>
                    <p className='text-xs opacity-80 font-light'>
                      {action.description}
                    </p>
                  </div>
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stock Statistics */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <StatsCard
          title='Productos con Stock Bajo'
          value={stockSummary.lowStockProducts}
          change={`${stockSummary.criticalStockProducts} críticos`}
          icon={AlertTriangle}
          trend='neutral'
          color='orange'
        />

        <StatsCard
          title='Sin Stock'
          value={stockSummary.outOfStock}
          change='Requieren reposición'
          icon={TrendingDown}
          trend='down'
          color='red'
        />

        <StatsCard
          title='Valor Total Inventario'
          value={`$${stockReport.totalStockValue.toLocaleString('es-AR')}`}
          change='Precio de costo'
          icon={Package}
          trend='up'
          color='green'
        />

        <StatsCard
          title='Movimientos Recientes'
          value={stockReport.recentMovements}
          change='Últimos 7 días'
          icon={TrendingUp}
          trend='up'
          color='terracota'
        />
      </div>

      {/* Recent Movements */}
      <Card className='border-[#9d684e]/20'>
        <CardHeader>
          <CardTitle className='text-[#455a54] font-tan-nimbus'>
            Movimientos Recientes
          </CardTitle>
          <CardDescription className='font-winter-solid'>
            Últimas actualizaciones de inventario
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentMovements.length === 0 ? (
            <div className='text-center py-8 text-[#455a54]/70'>
              <Package className='h-12 w-12 mx-auto mb-3 opacity-50' />
              <p className='font-winter-solid'>No hay movimientos recientes</p>
              <p className='text-sm'>Los cambios de stock aparecerán aquí</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {recentMovements.map((movement) => {
                const product = products.find(
                  (p) => p.id === movement.productId
                );
                const typeColor = {
                  entrada: 'text-green-600',
                  salida: 'text-red-600',
                  ajuste: 'text-blue-600',
                }[movement.type];

                return (
                  <div
                    key={movement.id}
                    className='flex items-center justify-between p-3 border border-[#9d684e]/10 rounded-lg'
                  >
                    <div className='flex items-center gap-3'>
                      <div
                        className={`p-2 rounded-full bg-gray-100 ${typeColor}`}
                      >
                        {movement.type === 'entrada' ? (
                          <TrendingUp className='h-4 w-4' />
                        ) : movement.type === 'salida' ? (
                          <TrendingDown className='h-4 w-4' />
                        ) : (
                          <Package className='h-4 w-4' />
                        )}
                      </div>
                      <div>
                        <p className='font-medium text-[#455a54] font-winter-solid'>
                          {product?.name || 'Producto no encontrado'}
                        </p>
                        <p className='text-sm text-[#455a54]/70'>
                          {movement.reason}
                        </p>
                      </div>
                    </div>
                    <div className='text-right'>
                      <p className={`font-medium ${typeColor}`}>
                        {movement.type === 'entrada'
                          ? '+'
                          : movement.type === 'salida'
                          ? '-'
                          : ''}
                        {movement.quantity}
                      </p>
                      <p className='text-xs text-[#455a54]/70'>
                        {movement.createdAt.toLocaleDateString('es-AR')}
                      </p>
                    </div>
                  </div>
                );
              })}

              <div className='text-center pt-3'></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
