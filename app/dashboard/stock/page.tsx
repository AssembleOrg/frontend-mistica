'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Package,
  Plus,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { useStock } from '@/hooks/useStock';
import { useProducts } from '@/hooks/useProducts';
import { useInitialProductsData } from '@/hooks/useInitialProductsData';
import Link from 'next/link';
import type { StockMovement, Product } from '@/lib/types';

function StatCard({
  value,
  label,
  icon: Icon,
  variant,
  onClick,
  expanded,
}: {
  value: number | string;
  label: string;
  icon: React.ElementType;
  variant: 'alert' | 'critical' | 'neutral' | 'primary';
  onClick?: () => void;
  expanded?: boolean;
}) {
  const styles = {
    alert: {
      wrap: 'bg-[#cc844a]/8 border-[#cc844a]/25',
      num: 'text-[#cc844a]',
      label: 'text-[#455a54]/70',
      icon: 'text-[#cc844a]/50',
    },
    critical: {
      wrap: 'bg-[#4e4247]/8 border-[#4e4247]/25',
      num: 'text-[#4e4247]',
      label: 'text-[#455a54]/70',
      icon: 'text-[#4e4247]/40',
    },
    neutral: {
      wrap: 'bg-[#9d684e]/8 border-[#9d684e]/20',
      num: 'text-[#9d684e]',
      label: 'text-[#455a54]/70',
      icon: 'text-[#9d684e]/40',
    },
    primary: {
      wrap: 'bg-[#455a54]/8 border-[#455a54]/20',
      num: 'text-[#455a54]',
      label: 'text-[#455a54]/70',
      icon: 'text-[#455a54]/30',
    },
  };

  const s = styles[variant];

  return (
    <div
      className={`${s.wrap} border rounded-xl p-4 transition-all ${onClick ? 'cursor-pointer hover:brightness-95 select-none' : ''}`}
      onClick={onClick}
    >
      <div className='flex items-start justify-between gap-2'>
        <div>
          <div className={`text-2xl font-bold font-tan-nimbus ${s.num} leading-none mb-1.5`}>
            {value}
          </div>
          <div className={`text-xs uppercase tracking-wide font-winter-solid ${s.label}`}>
            {label}
          </div>
        </div>
        <div className='flex flex-col items-center gap-1 pt-0.5'>
          <Icon className={`h-4 w-4 ${s.icon}`} />
          {onClick && (
            expanded
              ? <ChevronUp className={`h-3 w-3 ${s.icon}`} />
              : <ChevronDown className={`h-3 w-3 ${s.icon}`} />
          )}
        </div>
      </div>
    </div>
  );
}

function AlertList({ products, empty }: { products: Product[]; empty: string }) {
  if (products.length === 0) {
    return (
      <p className='text-sm text-[#455a54]/50 font-winter-solid py-2'>{empty}</p>
    );
  }

  return (
    <div className='divide-y divide-[#9d684e]/10'>
      {products.map(p => (
        <div key={p.id} className='flex items-center justify-between py-3 gap-3'>
          <div className='min-w-0 flex-1'>
            <p className='text-sm font-semibold text-[#455a54] font-winter-solid truncate'>{p.name}</p>
            <p className='text-xs text-[#455a54]/50 font-mono tabular-nums'>{p.stock} unidades actuales</p>
          </div>
          <Link href={`/dashboard/stock/adjustments?product=${p.id}`}>
            <Button
              size='sm'
              className='bg-[#9d684e] hover:bg-[#9d684e]/90 text-white font-winter-solid text-xs h-7 px-3 flex-shrink-0'
            >
              Ajustar
            </Button>
          </Link>
        </div>
      ))}
      <div className='pt-3'>
        <Link href='/dashboard/stock/adjustments'>
          <Button
            variant='outline'
            size='sm'
            className='w-full text-xs text-[#455a54] border-[#9d684e]/30 hover:bg-[#9d684e]/8 gap-1.5 font-winter-solid'
          >
            Ver todos los productos <ArrowRight className='h-3 w-3' />
          </Button>
        </Link>
      </div>
    </div>
  );
}

const MOVEMENT_CONFIG = {
  entrada: { sign: '+', label: 'Entrada', icon: TrendingUp,   color: 'text-[#455a54]',  bg: 'bg-[#455a54]/10' },
  salida:  { sign: '−', label: 'Salida',  icon: TrendingDown, color: 'text-[#4e4247]',  bg: 'bg-[#4e4247]/10' },
  ajuste:  { sign: '~', label: 'Ajuste',  icon: Package,      color: 'text-[#9d684e]',  bg: 'bg-[#9d684e]/10' },
};

export default function StockDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [movementsToShow, setMovementsToShow] = useState(8);
  const [showLowStock, setShowLowStock] = useState(false);
  const [showOutOfStock, setShowOutOfStock] = useState(false);

  const { isLoading: loadingProducts } = useInitialProductsData();
  const { stockSummary, getStockMovements, getLowStockProducts, getOutOfStockProducts } = useStock();
  const { products } = useProducts();

  const movements = getStockMovements();
  const lowStockProducts = getLowStockProducts();
  const outOfStockProducts = getOutOfStockProducts();
  // Antes filtraba por status === 'active'. Removimos status del modelo;
  // ahora "activos" = todos los productos no borrados (los que retorna el API).
  const activeProducts = products.length;

  useEffect(() => {
    if (!loadingProducts) {
      const t = setTimeout(() => setIsLoading(false), 300);
      return () => clearTimeout(t);
    }
  }, [loadingProducts]);

  if (isLoading) {
    return (
      <div className='space-y-6 mt-6'>
        <div className='animate-pulse space-y-2'>
          <div className='h-8 bg-[#9d684e]/10 rounded-lg w-56'></div>
          <div className='h-4 bg-[#9d684e]/8 rounded w-72'></div>
        </div>
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
          {[...Array(4)].map((_, i) => (
            <div key={i} className='animate-pulse h-20 bg-[#9d684e]/8 rounded-xl' />
          ))}
        </div>
        <div className='animate-pulse h-72 bg-[#9d684e]/8 rounded-xl' />
      </div>
    );
  }

  return (
    <div className='space-y-5 mt-6'>

      {/* Header */}
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold text-[#455a54] font-tan-nimbus'>
            Gestión de Stock
          </h1>
          <p className='text-sm text-[#455a54]/60 font-winter-solid mt-0.5'>
            Control y seguimiento de inventario
          </p>
        </div>
        <Link href='/dashboard/stock/adjustments'>
          <Button className='bg-[#9d684e] hover:bg-[#9d684e]/90 text-white gap-2 flex-shrink-0 font-winter-solid'>
            <Plus className='h-4 w-4' />
            <span className='hidden sm:inline'>Ajustar Stock</span>
          </Button>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <StatCard
          value={stockSummary.lowStock}
          label='Stock Bajo'
          icon={AlertTriangle}
          variant='alert'
          expanded={showLowStock}
          onClick={() => { setShowLowStock(v => !v); setShowOutOfStock(false); }}
        />
        <StatCard
          value={stockSummary.outOfStock}
          label='Agotados'
          icon={Package}
          variant='critical'
          expanded={showOutOfStock}
          onClick={() => { setShowOutOfStock(v => !v); setShowLowStock(false); }}
        />
        <StatCard
          value={movements.length}
          label='Movimientos'
          icon={Layers}
          variant='neutral'
        />
        <StatCard
          value={activeProducts}
          label='Activos'
          icon={Package}
          variant='primary'
        />
      </div>

      {/* Expandible: Stock Bajo */}
      {showLowStock && (
        <Card className='border-[#cc844a]/25 bg-[#cc844a]/5'>
          <CardHeader className='pb-2 pt-4'>
            <CardTitle className='text-sm font-tan-nimbus text-[#cc844a] flex items-center gap-2'>
              <AlertTriangle className='h-3.5 w-3.5' />
              Stock bajo — {lowStockProducts.length} producto{lowStockProducts.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AlertList
              products={lowStockProducts}
              empty='Todos los productos tienen stock suficiente.'
            />
          </CardContent>
        </Card>
      )}

      {/* Expandible: Agotados */}
      {showOutOfStock && (
        <Card className='border-[#4e4247]/20 bg-[#4e4247]/5'>
          <CardHeader className='pb-2 pt-4'>
            <CardTitle className='text-sm font-tan-nimbus text-[#4e4247] flex items-center gap-2'>
              <Package className='h-3.5 w-3.5' />
              Agotados — {outOfStockProducts.length} producto{outOfStockProducts.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AlertList
              products={outOfStockProducts}
              empty='No hay productos agotados.'
            />
          </CardContent>
        </Card>
      )}

      {/* Movimientos Recientes */}
      <Card className='border-[#9d684e]/20'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='text-[#455a54] font-tan-nimbus'>
                Movimientos
              </CardTitle>
              <CardDescription className='font-winter-solid text-xs mt-0.5'>
                Ventas, cancelaciones y ajustes manuales
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <div className='text-center py-10'>
              <Layers className='h-8 w-8 mx-auto mb-3 text-[#9d684e]/25' />
              <p className='text-sm text-[#455a54]/50 font-winter-solid'>Sin movimientos registrados</p>
              <p className='text-xs text-[#455a54]/35 mt-1'>
                Completá una venta o realizá un ajuste para ver el historial
              </p>
            </div>
          ) : (
            <div className='space-y-1'>
              {movements.slice(0, movementsToShow).map((movement: StockMovement) => {
                const product = products.find(p => p.id === movement.productId);
                const cfg = MOVEMENT_CONFIG[movement.type] ?? MOVEMENT_CONFIG.ajuste;
                const Icon = cfg.icon;

                return (
                  <div
                    key={movement.id}
                    className='flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#efcbb9]/30 transition-colors'
                  >
                    <div className={`p-1.5 rounded-md ${cfg.bg} flex-shrink-0`}>
                      <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                    </div>

                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-semibold text-[#455a54] font-winter-solid truncate leading-tight'>
                        {product?.name ?? 'Producto eliminado'}
                      </p>
                      <p className='text-xs text-[#455a54]/55 truncate leading-tight'>{movement.reason}</p>
                    </div>

                    <div className='text-right flex-shrink-0'>
                      <p className={`text-sm font-bold font-tan-nimbus ${cfg.color} tabular-nums`}>
                        {cfg.sign}{movement.quantity}
                      </p>
                      <p className='text-xs text-[#455a54]/40 font-mono tabular-nums'>
                        {movement.previousStock}→{movement.newStock}
                      </p>
                    </div>

                    <div className='text-right flex-shrink-0 w-12'>
                      <p className='text-xs text-[#455a54]/40 font-winter-solid'>
                        {new Date(movement.createdAt).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}

              {movements.length > movementsToShow && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setMovementsToShow(prev => prev + 10)}
                  className='w-full mt-2 text-xs text-[#9d684e] hover:bg-[#9d684e]/10'
                >
                  Ver más ({movements.length - movementsToShow} restantes)
                </Button>
              )}

              {movementsToShow > 8 && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setMovementsToShow(8)}
                  className='w-full text-xs text-[#455a54]/40 hover:text-[#9d684e]'
                >
                  Colapsar
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
