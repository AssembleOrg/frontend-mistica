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
import { useCategories } from '@/hooks/useCategories';
import { useInitialProductsData } from '@/hooks/useInitialProductsData';
import { Plus, Package, Grid, List, Download, Upload, AlertTriangle, Layers, ChevronDown, ArrowRight } from 'lucide-react';
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
  const { categories } = useCategories();

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
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-responsive-lg font-bold text-[#455a54] font-tan-nimbus'>
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
        hideHeader
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
            onClick: () => exportProductsToExcel(products, categories),
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
            alert: {
              wrapStatic:    'bg-[#cc844a]/10 border-[#cc844a]/30',
              wrapClickable: 'bg-[#cc844a]/15 border-[#cc844a]/45 hover:border-[#cc844a]/70 hover:shadow-md hover:-translate-y-0.5',
              num: 'text-[#cc844a]', icon: 'text-[#cc844a]/60', badge: 'text-[#cc844a]',
            },
            critical: {
              wrapStatic:    'bg-[#4e4247]/10 border-[#4e4247]/30',
              wrapClickable: 'bg-[#4e4247]/15 border-[#4e4247]/45 hover:border-[#4e4247]/70 hover:shadow-md hover:-translate-y-0.5',
              num: 'text-[#4e4247]', icon: 'text-[#4e4247]/60', badge: 'text-[#4e4247]',
            },
            neutral: {
              wrapStatic:    'bg-[#9d684e]/10 border-[#9d684e]/30',
              wrapClickable: '',
              num: 'text-[#9d684e]', icon: 'text-[#9d684e]/50', badge: '',
            },
            primary: {
              wrapStatic:    'bg-[#455a54]/10 border-[#455a54]/30',
              wrapClickable: '',
              num: 'text-[#455a54]', icon: 'text-[#455a54]/40', badge: '',
            },
          };
          const s = styles[variant];
          const isClickable = Boolean(onClick);
          const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
            if (!isClickable) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick?.();
            }
          };
          return (
            <div
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              aria-expanded={isClickable ? expanded : undefined}
              onKeyDown={isClickable ? handleKey : undefined}
              className={`${isClickable ? s.wrapClickable : s.wrapStatic} border rounded-xl p-4 transition-all duration-150 ${isClickable ? 'cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#455a54]/40' : ''}`}
              onClick={onClick}
            >
              <div className='flex items-start justify-between gap-2'>
                <div className='min-w-0'>
                  <div className={`text-2xl font-bold font-tan-nimbus ${s.num} leading-none mb-1.5`}>{value}</div>
                  <div className='text-xs uppercase tracking-wide font-winter-solid font-medium text-[#455a54]/80'>{label}</div>
                </div>
                <Icon className={`h-4 w-4 shrink-0 ${s.icon}`} />
              </div>
              {isClickable && (
                <span className={`mt-2 inline-flex items-center gap-1 text-[10px] font-winter-solid font-semibold uppercase tracking-wide ${s.badge} bg-white/70 rounded-full px-2 py-0.5`}>
                  {expanded ? 'Ocultar lista' : 'Ver detalle'}
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                </span>
              )}
            </div>
          );
        };

        const AlertList = ({ products: list, empty }: { products: Product[]; empty: string }) => {
          if (list.length === 0) return <p className='text-sm text-[#455a54]/50 font-winter-solid py-2'>{empty}</p>;
          return (
            <div className='divide-y divide-[#9d684e]/10'>
              {list.map(p => (
                <div key={p.id} className='flex items-center justify-between py-2.5 gap-3'>
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm font-semibold text-[#455a54] font-winter-solid truncate'>{p.name}</p>
                    <p className='text-xs text-[#455a54]/70 font-mono tabular-nums'>{p.stock} unidades actuales</p>
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
                value={lowStockProducts.length} label='Stock Bajo' icon={AlertTriangle} variant='alert'
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
              <Card className='border-[#cc844a]/45 bg-[#cc844a]/15 shadow-sm'>
                <CardHeader className='pb-1.5 pt-3 px-4'>
                  <CardTitle className='text-sm font-tan-nimbus text-[#cc844a] flex items-center gap-2'>
                    <AlertTriangle className='h-3.5 w-3.5' />
                    Stock bajo — {lowStockProducts.length} producto{lowStockProducts.length !== 1 ? 's' : ''}
                  </CardTitle>
                </CardHeader>
                <CardContent className='pt-1 px-4 pb-3'>
                  <AlertList products={lowStockProducts} empty='Todos los productos tienen stock suficiente.' />
                </CardContent>
              </Card>
            )}

            {showOutOfStock && (
              <Card className='border-[#4e4247]/45 bg-[#4e4247]/15 shadow-sm'>
                <CardHeader className='pb-1.5 pt-3 px-4'>
                  <CardTitle className='text-sm font-tan-nimbus text-[#4e4247] flex items-center gap-2'>
                    <Package className='h-3.5 w-3.5' />
                    Agotados — {outOfStockProducts.length} producto{outOfStockProducts.length !== 1 ? 's' : ''}
                  </CardTitle>
                </CardHeader>
                <CardContent className='pt-1 px-4 pb-3'>
                  <AlertList products={outOfStockProducts} empty='No hay productos agotados.' />
                </CardContent>
              </Card>
            )}
          </>
        );
      })()}

      {/* Products Table with loading state */}
      <Card className='border-[#9d684e]/20'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-[#455a54] font-tan-nimbus text-responsive-base'>
            Catálogo de Productos
          </CardTitle>
          <CardDescription className='font-winter-solid text-responsive-sm'>
            Lista completa de productos con opciones de filtrado y ordenamiento
          </CardDescription>
        </CardHeader>
        <CardContent className='pt-2'>
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

