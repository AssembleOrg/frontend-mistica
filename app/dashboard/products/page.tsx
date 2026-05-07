/**
 * CAPA 4: PRESENTATION LAYER - PRODUCTS PAGE (CLEAN VERSION)
 * 
 * Página UI PURA que solo renderiza y delega al controller
 * Sin lógica de negocio, sin acceso directo a stores
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ProductsTable } from '@/components/dashboard/products-table';
import { ProductsMobileView } from '@/components/dashboard/products-mobile-view';
import { QuickActionsWidget } from '@/components/dashboard/quick-actions-widget';
import { BulkUpdateProductsDialog } from '@/components/dashboard/products/bulk-update-dialog';
import { useProducts } from '@/hooks/useProducts';
import { useStock } from '@/hooks/useStock';
import { useInitialProductsData } from '@/hooks/useInitialProductsData';
import { Plus, Package, Grid, List, Download, Upload, AlertTriangle, Layers, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { exportProductsToExcel } from '@/lib/excel-utils';
import Link from 'next/link';
import type { Product } from '@/lib/types';

export default function ProductsPage() {
  // Handle initial data loading
  const { isLoading, error } = useInitialProductsData();

  // Simple hooks API for actions and computed values
  const { products, stats, fetchProducts } = useProducts();
  const { getLowStockProducts, getOutOfStockProducts } = useStock();

  // Mobile detection and view state
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(isMobile ? 'cards' : 'table');
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);
  const [showOutOfStock, setShowOutOfStock] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter state
  const [searchValue, setSearchValue] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Filter handlers
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleCategoryFilterChange = (category: string) => {
    setCategoryFilter(category);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleRefresh = () => {
    // Reload the page to refresh data
    window.location.reload();
  };

  // Listado filtrado client-side por categoría + búsqueda (nombre/barcode).
  const displayedProducts = useMemo(() => {
    let result = products;
    if (categoryFilter !== 'all') {
      result = result.filter((p) => p.category === categoryFilter);
    }
    const q = searchValue.trim().toLowerCase();
    if (q) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, categoryFilter, searchValue]);

  // Show error state if initial load failed
  if (error) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl sm:text-3xl font-bold text-[#455a54] font-tan-nimbus mt-6'>
              Gestión de Productos
            </h1>
            <p className='text-red-500 font-winter-solid'>
              Error al cargar productos: {error}
            </p>
          </div>
        </div>
        <Card className='border-red-200'>
          <CardContent className='p-6'>
            <p className='text-center text-red-600'>
              No se pudieron cargar los productos. Por favor, recarga la página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-responsive-lg font-bold text-[#455a54] font-tan-nimbus mt-6'>
            Gestión de Productos
          </h1>
          <p className='text-[#455a54]/70 font-winter-solid text-responsive-sm'>
            Administra tu catálogo de productos místicos y wellness
          </p>
        </div>
        
        {/* View Toggle */}
        <div className='hidden sm:flex items-center gap-2 border border-[#9d684e]/20 rounded-lg p-1'>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className={viewMode === 'table' ? 'bg-[#9d684e] text-white' : 'text-[#455a54]'}
          >
            <List className="h-4 w-4 mr-1" />
            Tabla
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className={viewMode === 'cards' ? 'bg-[#9d684e] text-white' : 'text-[#455a54]'}
          >
            <Grid className="h-4 w-4 mr-1" />
            Cards
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActionsWidget
        title="Gestión de Productos"
        description="Acciones rápidas para el catálogo"
        layout="horizontal"
        actions={[
          {
            id: 'new-product',
            title: 'Nuevo Producto',
            description: 'Agregar al catálogo',
            href: '/dashboard/products/add',
            icon: Plus,
            color: 'primary',
          },
          {
            id: 'export-excel',
            title: 'Exportar Excel',
            description: 'Descargar template editable',
            icon: Download,
            color: 'secondary',
            onClick: () => exportProductsToExcel(products),
          },
          {
            id: 'bulk-update',
            title: 'Actualizar desde Excel',
            description: 'Carga masiva por barcode',
            icon: Upload,
            color: 'secondary',
            onClick: () => setShowBulkUpdate(true),
          },
        ]}
      />

      <BulkUpdateProductsDialog
        open={showBulkUpdate}
        onOpenChange={setShowBulkUpdate}
        onApplied={() => {
          // Refresca el catálogo en el store sin recargar la página.
          fetchProducts();
        }}
      />

      {/* Stat Cards */}
      {(() => {
        const lowStockProducts = getLowStockProducts();
        const outOfStockProducts = getOutOfStockProducts();

        const StatCard = ({
          value, label, icon: Icon, variant, onClick, expanded,
        }: {
          value: number; label: string; icon: React.ElementType;
          variant: 'alert' | 'critical' | 'neutral' | 'primary';
          onClick?: () => void; expanded?: boolean;
        }) => {
          const styles = {
            alert:    { wrap: 'bg-[#cc844a]/8 border-[#cc844a]/25',  num: 'text-[#cc844a]',  icon: 'text-[#cc844a]/50'  },
            critical: { wrap: 'bg-[#4e4247]/8 border-[#4e4247]/25',  num: 'text-[#4e4247]',  icon: 'text-[#4e4247]/40'  },
            neutral:  { wrap: 'bg-[#9d684e]/8 border-[#9d684e]/20',  num: 'text-[#9d684e]',  icon: 'text-[#9d684e]/40'  },
            primary:  { wrap: 'bg-[#455a54]/8 border-[#455a54]/20',  num: 'text-[#455a54]',  icon: 'text-[#455a54]/30'  },
          };
          const s = styles[variant];
          return (
            <div
              className={`${s.wrap} border rounded-xl p-4 transition-all ${onClick ? 'cursor-pointer hover:brightness-95 select-none' : ''}`}
              onClick={onClick}
            >
              <div className='flex items-start justify-between gap-2'>
                <div>
                  <div className={`text-2xl font-bold font-tan-nimbus ${s.num} leading-none mb-1.5`}>{value}</div>
                  <div className='text-xs uppercase tracking-wide font-winter-solid text-[#455a54]/60'>{label}</div>
                </div>
                <div className='flex flex-col items-center gap-1 pt-0.5'>
                  <Icon className={`h-4 w-4 ${s.icon}`} />
                  {onClick && (expanded
                    ? <ChevronUp className={`h-3 w-3 ${s.icon}`} />
                    : <ChevronDown className={`h-3 w-3 ${s.icon}`} />
                  )}
                </div>
              </div>
            </div>
          );
        };

        const AlertList = ({ products: list, empty }: { products: Product[]; empty: string }) => {
          if (list.length === 0) return <p className='text-sm text-[#455a54]/50 font-winter-solid py-2'>{empty}</p>;
          return (
            <div className='divide-y divide-[#9d684e]/10'>
              {list.map(p => (
                <div key={p.id} className='flex items-center justify-between py-3 gap-3'>
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm font-semibold text-[#455a54] font-winter-solid truncate'>{p.name}</p>
                    <p className='text-xs text-[#455a54]/50 font-mono tabular-nums'>{p.stock} unidades actuales</p>
                  </div>
                  <Link href={`/dashboard/stock/adjustments?product=${p.id}`}>
                    <Button size='sm' className='bg-[#9d684e] hover:bg-[#9d684e]/90 text-white font-winter-solid text-xs h-7 px-3 flex-shrink-0'>
                      Ajustar
                    </Button>
                  </Link>
                </div>
              ))}
              <div className='pt-3'>
                <Link href='/dashboard/stock/adjustments'>
                  <Button variant='outline' size='sm' className='w-full text-xs text-[#455a54] border-[#9d684e]/30 hover:bg-[#9d684e]/8 gap-1.5 font-winter-solid'>
                    Ver todos en ajustes <ArrowRight className='h-3 w-3' />
                  </Button>
                </Link>
              </div>
            </div>
          );
        };

        return (
          <>
            <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
              <StatCard value={stats.total} label='Total' icon={Package} variant='neutral' />
              <StatCard value={stats.total - stats.outOfStock} label='Disponibles' icon={Layers} variant='primary' />
              <StatCard
                value={stats.lowStock} label='Stock Bajo' icon={AlertTriangle} variant='alert'
                expanded={showLowStock}
                onClick={() => { setShowLowStock(v => !v); setShowOutOfStock(false); }}
              />
              <StatCard
                value={stats.outOfStock} label='Agotados' icon={Package} variant='critical'
                expanded={showOutOfStock}
                onClick={() => { setShowOutOfStock(v => !v); setShowLowStock(false); }}
              />
            </div>

            {showLowStock && (
              <Card className='border-[#cc844a]/25 bg-[#cc844a]/5'>
                <CardHeader className='pb-2 pt-4'>
                  <CardTitle className='text-sm font-tan-nimbus text-[#cc844a] flex items-center gap-2'>
                    <AlertTriangle className='h-3.5 w-3.5' />
                    Stock bajo — {lowStockProducts.length} producto{lowStockProducts.length !== 1 ? 's' : ''}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AlertList products={lowStockProducts} empty='Todos los productos tienen stock suficiente.' />
                </CardContent>
              </Card>
            )}

            {showOutOfStock && (
              <Card className='border-[#4e4247]/20 bg-[#4e4247]/5'>
                <CardHeader className='pb-2 pt-4'>
                  <CardTitle className='text-sm font-tan-nimbus text-[#4e4247] flex items-center gap-2'>
                    <Package className='h-3.5 w-3.5' />
                    Agotados — {outOfStockProducts.length} producto{outOfStockProducts.length !== 1 ? 's' : ''}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AlertList products={outOfStockProducts} empty='No hay productos agotados.' />
                </CardContent>
              </Card>
            )}
          </>
        );
      })()}

      {/* Products Table with loading state */}
      <Card className='border-[#9d684e]/20'>
        <CardHeader>
          <CardTitle className='text-[#455a54] font-tan-nimbus text-responsive-base'>
            Catálogo de Productos
          </CardTitle>
          <CardDescription className='font-winter-solid text-responsive-sm'>
            Lista completa de productos con opciones de filtrado y ordenamiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='flex items-center justify-center p-8'>
              <div className='text-center'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[#9d684e] mx-auto'></div>
                <p className='mt-2 text-[#455a54]/70 font-winter-solid text-responsive-sm'>
                  Cargando productos...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop: Show table, Mobile: Show cards */}
              <div className="hidden sm:block">
                <ProductsTable
                  data={displayedProducts}
                  isLoading={isLoading}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={totalItems}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  searchValue={searchValue}
                  onSearchChange={handleSearchChange}
                  dateRange={dateRange}
                  onDateRangeChange={handleDateRangeChange}
                  categoryFilter={categoryFilter}
                  onCategoryFilterChange={handleCategoryFilterChange}
                  onRefresh={handleRefresh}
                />
              </div>
              <div className="sm:hidden">
                <ProductsMobileView
                  products={displayedProducts}
                  searchValue={searchValue}
                  onSearchChange={handleSearchChange}
                  dateRange={dateRange}
                  onDateRangeChange={handleDateRangeChange}
                  categoryFilter={categoryFilter}
                  onCategoryFilterChange={handleCategoryFilterChange}
                  onRefresh={() => window.location.reload()}
                  isLoading={isLoading}
                />
              </div>
              
              {/* Desktop view toggle content */}
              <div className="hidden sm:block">
                {viewMode === 'cards' && (
                  <div className="mt-4">
                    <ProductsMobileView
                      products={displayedProducts}
                      searchValue={searchValue}
                      onSearchChange={handleSearchChange}
                      dateRange={dateRange}
                      onDateRangeChange={handleDateRangeChange}
                      categoryFilter={categoryFilter}
                      onCategoryFilterChange={handleCategoryFilterChange}
                      onRefresh={() => window.location.reload()}
                      isLoading={isLoading}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

