/**
 * CAPA 4: PRESENTATION LAYER - PRODUCTS PAGE (CLEAN VERSION)
 * 
 * Página UI PURA que solo renderiza y delega al controller
 * Sin lógica de negocio, sin acceso directo a stores
 */

'use client';

import { useState, useEffect } from 'react';
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
import { useProducts } from '@/hooks/useProducts';
import { useInitialProductsData } from '@/hooks/useInitialProductsData';
import { Plus, Package, Grid, List } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ProductsPage() {
  // Handle initial data loading
  const { isLoading, error } = useInitialProductsData();
  
  // Simple hooks API for actions and computed values
  const { products, stats } = useProducts();
  
  // Mobile detection and view state
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(isMobile ? 'cards' : 'table');

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

  // Show error state if initial load failed
  if (error) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-[#455a54] font-tan-nimbus mt-6'>
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
            color: 'primary'
          }
        ]}
      />

      {/* Inventory Stats - Following Panel de Control Pattern */}
      <Card className='border-[#9d684e]/20'>
        <CardHeader>
          <CardTitle className='text-lg font-tan-nimbus text-[#455a54] flex items-center gap-2'>
            <Package className='h-5 w-5' />
            Estado del Inventario
          </CardTitle>
          <CardDescription className='text-[#455a54]/70'>
            Resumen del catálogo y disponibilidad de productos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <div className='bg-gradient-to-br from-[#9d684e]/10 to-[#9d684e]/5 p-4 rounded-lg border border-[#9d684e]/20'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-2xl font-bold font-tan-nimbus text-[#9d684e]'>
                    {stats.total}
                  </div>
                  <div className='text-xs text-[#455a54]/70 uppercase tracking-wide'>Total</div>
                </div>
                <Package className='h-6 w-6 text-[#9d684e]/40' />
              </div>
            </div>
            
            <div className='bg-gradient-to-br from-green-500/10 to-green-500/5 p-4 rounded-lg border border-green-500/20'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-2xl font-bold font-tan-nimbus text-green-600'>
                    {stats.total - stats.outOfStock}
                  </div>
                  <div className='text-xs text-[#455a54]/70 uppercase tracking-wide'>Disponibles</div>
                </div>
                <div className='w-6 h-6 rounded-full bg-green-100 flex items-center justify-center'>
                  <div className='w-3 h-3 rounded-full bg-green-500'></div>
                </div>
              </div>
            </div>
            
            <div className='bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-4 rounded-lg border border-orange-500/20'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-2xl font-bold font-tan-nimbus text-orange-500'>
                    {stats.lowStock}
                  </div>
                  <div className='text-xs text-[#455a54]/70 uppercase tracking-wide'>Stock Bajo</div>
                </div>
                <div className='w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center'>
                  <div className='w-3 h-3 rounded-full bg-orange-500'></div>
                </div>
              </div>
            </div>
            
            <div className='bg-gradient-to-br from-red-500/10 to-red-500/5 p-4 rounded-lg border border-red-500/20'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-2xl font-bold font-tan-nimbus text-red-500'>
                    {stats.outOfStock}
                  </div>
                  <div className='text-xs text-[#455a54]/70 uppercase tracking-wide'>Agotados</div>
                </div>
                <div className='w-6 h-6 rounded-full bg-red-100 flex items-center justify-center'>
                  <div className='w-3 h-3 rounded-full bg-red-500'></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  data={products}
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
                  products={products} 
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
                      products={products} 
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

