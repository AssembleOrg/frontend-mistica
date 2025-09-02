/**
 * CAPA 4: PRESENTATION LAYER - STOCK PAGE (CLEAN VERSION)
 * 
 * Página UI PURA que solo renderiza y delega al controller
 * Sin lógica de negocio, sin acceso directo a stores
 */

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
import { QuickActionsWidget } from '@/components/dashboard/quick-actions-widget';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Package,
  Plus,
} from 'lucide-react';
import { useStock } from '@/hooks/useStock';

export default function StockDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  
  // Simple hooks API
  const { stockSummary, getStockMovements } = useStock();
  const movements = getStockMovements();

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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
      <QuickActionsWidget
        title="Gestión de Inventario"
        description="Acciones rápidas para el stock"
        layout="horizontal"
        actions={[
          {
            id: 'adjust-stock',
            title: 'Ajustar Stock',
            description: 'Corregir cantidades manualmente',
            href: '/dashboard/stock/adjustments',
            icon: Plus,
            color: 'primary'
          }
        ]}
      />

      {/* Stock Statistics - Following Panel de Control Pattern */}
      <Card className='border-[#9d684e]/20'>
        <CardHeader>
          <CardTitle className='text-lg font-tan-nimbus text-[#455a54] flex items-center gap-2'>
            <Package className='h-5 w-5' />
            Control de Inventario
          </CardTitle>
          <CardDescription className='text-[#455a54]/70'>
            Resumen de stock y estado del inventario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <div className='bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-4 rounded-lg border border-orange-500/20'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-2xl font-bold font-tan-nimbus text-orange-600'>
                    {stockSummary.lowStock}
                  </div>
                  <div className='text-xs text-[#455a54]/70 uppercase tracking-wide'>Stock Bajo</div>
                </div>
                <AlertTriangle className='h-6 w-6 text-orange-500/40' />
              </div>
            </div>
            
            <div className='bg-gradient-to-br from-red-500/10 to-red-500/5 p-4 rounded-lg border border-red-500/20'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-2xl font-bold font-tan-nimbus text-red-600'>
                    {stockSummary.outOfStock}
                  </div>
                  <div className='text-xs text-[#455a54]/70 uppercase tracking-wide'>Agotados</div>
                </div>
                <div className='w-6 h-6 rounded-full bg-red-100 flex items-center justify-center'>
                  <div className='w-3 h-3 rounded-full bg-red-500'></div>
                </div>
              </div>
            </div>
            
            <div className='bg-gradient-to-br from-green-500/10 to-green-500/5 p-4 rounded-lg border border-green-500/20'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-2xl font-bold font-tan-nimbus text-green-600'>
                    ${stockSummary.totalValue.toLocaleString('es-AR', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                  </div>
                  <div className='text-xs text-[#455a54]/70 uppercase tracking-wide'>Valor Total</div>
                </div>
                <Package className='h-6 w-6 text-green-500/40' />
              </div>
            </div>
            
            <div className='bg-gradient-to-br from-[#9d684e]/10 to-[#9d684e]/5 p-4 rounded-lg border border-[#9d684e]/20'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-2xl font-bold font-tan-nimbus text-[#9d684e]'>
                    {movements.length}
                  </div>
                  <div className='text-xs text-[#455a54]/70 uppercase tracking-wide'>Movimientos</div>
                </div>
                <TrendingUp className='h-6 w-6 text-[#9d684e]/40' />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
          {movements.length === 0 ? (
            <div className='text-center py-8 text-[#455a54]/70'>
              <Package className='h-12 w-12 mx-auto mb-3 opacity-50' />
              <p className='font-winter-solid'>No hay movimientos recientes</p>
              <p className='text-sm'>Los cambios de stock aparecerán aquí</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {movements.map((movement: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                const product = { name: 'Producto', id: movement.productId }; // Mock product data
                const typeColors = {
                  entrada: 'text-green-600',
                  salida: 'text-red-600',
                  ajuste: 'text-blue-600',
                };
                const typeColor = typeColors[movement.type as keyof typeof typeColors] || 'text-gray-600';

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
                        {new Date(movement.createdAt).toLocaleDateString('es-AR')}
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
