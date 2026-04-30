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
import { useProducts } from '@/hooks/useProducts';
import { useInitialProductsData } from '@/hooks/useInitialProductsData';
import type { StockMovement } from '@/lib/types';

export default function StockDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [movementsToShow, setMovementsToShow] = useState(5);
  
  // Load initial data and hooks
  const { isLoading: loadingProducts } = useInitialProductsData();
  const { stockSummary, getStockMovements } = useStock();
  const { products } = useProducts();
  const movements = getStockMovements();

  useEffect(() => {
    // Wait for products to load before showing content
    if (!loadingProducts) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loadingProducts]);

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
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'>
            <div className='bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-4 rounded-lg border border-orange-500/20'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-lg sm:text-xl md:text-2xl font-bold font-tan-nimbus text-orange-600'>
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
                  <div className='text-lg sm:text-xl md:text-2xl font-bold font-tan-nimbus text-red-600'>
                    {stockSummary.outOfStock}
                  </div>
                  <div className='text-xs text-[#455a54]/70 uppercase tracking-wide'>Agotados</div>
                </div>
                <div className='w-6 h-6 rounded-full bg-red-100 flex items-center justify-center'>
                  <div className='w-3 h-3 rounded-full bg-red-500'></div>
                </div>
              </div>
            </div>
            
            <div className='bg-gradient-to-br from-green-500/10 to-green-500/5 p-3 sm:p-4 rounded-lg border border-green-500/20'>
              <div className='flex items-center justify-between'>
                <div className='min-w-0 flex-1 pr-2'>
                  <div className='text-sm sm:text-base md:text-lg lg:text-xl font-bold font-tan-nimbus text-green-600 break-all'>
                    <span className='hidden sm:inline'>$</span>
                    <span className='sm:hidden'>$</span>
                    {stockSummary.totalValue > 999999 
                      ? `${(stockSummary.totalValue / 1000000).toFixed(1)}M`
                      : stockSummary.totalValue.toLocaleString('es-AR', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })
                    }
                  </div>
                  <div className='text-xs text-[#455a54]/70 uppercase tracking-wide'>Valor Total</div>
                </div>
                <Package className='h-5 w-5 sm:h-6 sm:w-6 text-green-500/40 flex-shrink-0' />
              </div>
            </div>
            
            <div className='bg-gradient-to-br from-[#9d684e]/10 to-[#9d684e]/5 p-4 rounded-lg border border-[#9d684e]/20'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-lg sm:text-xl md:text-2xl font-bold font-tan-nimbus text-[#9d684e]'>
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
              {movements.slice(0, movementsToShow).map((movement: StockMovement) => {
                const product = products.find(p => p.id === movement.productId) || { 
                  name: 'Producto no encontrado', 
                  id: movement.productId 
                };
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
                        <p className='text-xs text-[#455a54]/50'>
                          {movement.previousStock} → {movement.newStock} unidades
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
                      {product && 'stock' in product && (
                        <p className='text-xs text-[#9d684e] font-medium'>
                          Stock actual: {(product as { stock: number }).stock}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Pagination Controls */}
              {movements.length > movementsToShow && (
                <div className='text-center pt-4 border-t border-[#9d684e]/10'>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMovementsToShow(prev => prev + 5)}
                    className='text-[#9d684e] border-[#9d684e]/30 hover:bg-[#9d684e]/10'
                  >
                    Ver más movimientos ({movements.length - movementsToShow} restantes)
                  </Button>
                </div>
              )}
              
              {movementsToShow > 5 && (
                <div className='text-center pt-2'>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMovementsToShow(5)}
                    className='text-[#455a54]/70 hover:text-[#9d684e]'
                  >
                    Ver menos
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
