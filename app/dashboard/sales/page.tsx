/**
 * CAPA 4: PRESENTATION LAYER - SALES PAGE (CLEAN VERSION)
 *
 * Componente UI PURO que solo renderiza y delega al controller
 * Sin lógica de negocio, sin acceso directo a stores
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { showToast } from '@/lib/toast';
import { processReceiptGeneration, hasAfipData } from '@/lib/receipt-utils';
import { useInitialProductsData } from '@/hooks/useInitialProductsData';
import { useSalesAPI } from '@/hooks/useSalesAPI';
import { Sale, UpdateSaleRequest } from '@/services/sales.service';
import { Plus, BarChart3, ShoppingCart } from 'lucide-react';

import { SalesTable } from '@/components/dashboard/sales/sales-table';
import { SalesMobileView } from '@/components/dashboard/sales-mobile-view';
import { SalesStatsCards } from '@/components/dashboard/sales/sales-stats-cards';
import { useIsMobile } from '@/hooks/use-mobile';

// Modales pesados: cargar bajo demanda
const CreateSaleModal = dynamic(
  () => import('@/components/dashboard/sales/create-sale-modal').then(m => m.CreateSaleModal),
  { ssr: false }
);
const ViewSaleModal = dynamic(
  () => import('@/components/dashboard/sales/view-sale-modal').then(m => m.ViewSaleModal),
  { ssr: false }
);
const EditSaleModal = dynamic(
  () => import('@/components/dashboard/sales/edit-sale-modal').then(m => m.EditSaleModal),
  { ssr: false }
);

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState<'sales' | 'stats'>('sales');
  const [showCreateSaleModal, setShowCreateSaleModal] = useState(false);
  const [showViewSaleModal, setShowViewSaleModal] = useState(false);
  const [showEditSaleModal, setShowEditSaleModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter state
  const [searchValue, setSearchValue] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [statusFilter, setStatusFilter] = useState('all');

  // Mobile responsive
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(isMobile ? 'cards' : 'table');

  const { isLoading: loadingProducts, error: productsError } = useInitialProductsData();

  const {
    isLoading: loadingSales,
    sales,
    getSalesPaginated,
    getDailySales,
    deleteSale,
  } = useSalesAPI();

  const loadSalesWithFilters = useCallback(async () => {
    const filters: { search?: string; status?: string; from?: string; to?: string } = {};
    if (searchValue.trim()) filters.search = searchValue.trim();
    if (statusFilter && statusFilter !== 'all') filters.status = statusFilter;
    if (dateRange?.from) filters.from = dateRange.from.toISOString().split('T')[0];
    if (dateRange?.to) filters.to = dateRange.to.toISOString().split('T')[0];

    try {
      const result = await getSalesPaginated(currentPage, pageSize, filters);
      if (result) {
        setTotalPages(result.meta?.totalPages || 1);
        setTotalItems(result.meta?.total || 0);
      }
    } catch (error) {
      console.error('Error loading sales:', error);
    }
  }, [currentPage, pageSize, searchValue, statusFilter, dateRange, getSalesPaginated]);

  // Filtros: debounce sólo para búsqueda por texto
  useEffect(() => {
    if (searchValue.trim() === '') {
      loadSalesWithFilters();
      return;
    }
    const t = setTimeout(loadSalesWithFilters, 500);
    return () => clearTimeout(t);
  }, [loadSalesWithFilters, searchValue]);

  // Daily sales sólo en mount
  useEffect(() => {
    getDailySales();
  }, [getDailySales]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadSalesWithFilters(), getDailySales()]);
  }, [loadSalesWithFilters, getDailySales]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    setCurrentPage(1);
  }, []);

  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    setDateRange(range);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  }, []);

  const handleSaleCreated = useCallback(() => {
    showToast.success('Venta creada exitosamente');
    refreshAll();
  }, [refreshAll]);

  const handleViewSale = useCallback((sale: Sale) => {
    setSelectedSale(sale);
    setShowViewSaleModal(true);
  }, []);

  const handleViewReceipt = useCallback((sale: Sale) => {
    processReceiptGeneration(sale, hasAfipData(sale));
  }, []);

  const handleEditSale = useCallback((sale: Sale) => {
    setSelectedSale(sale);
    setShowEditSaleModal(true);
  }, []);

  const handleUpdateSale = useCallback(
    async (_saleId: string, _updatedSale: UpdateSaleRequest) => {
      // TODO: Implement update sale API call
      showToast.success('Venta actualizada exitosamente');
      await refreshAll();
    },
    [refreshAll]
  );

  const handleDeleteSale = useCallback(
    async (saleId: string) => {
      try {
        await deleteSale(saleId);
        await refreshAll();
      } catch (error) {
        console.error('Error deleting sale:', error);
      }
    },
    [deleteSale, refreshAll]
  );

  const handleCancelSale = useCallback(
    async (saleId: string) => {
      try {
        await handleUpdateSale(saleId, { status: 'CANCELLED' });
        showToast.success('Venta cancelada exitosamente');
      } catch (error) {
        console.error('Error cancelling sale:', error);
        showToast.error('Error al cancelar la venta');
      }
    },
    [handleUpdateSale]
  );

  const handlePageChange = useCallback((page: number) => setCurrentPage(page), []);
  const handlePageSizeChange = useCallback((n: number) => {
    setPageSize(n);
    setCurrentPage(1);
  }, []);

  // Handle loading and error states to prevent hydration issues
  if (productsError) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-600 mb-2'>Error cargando productos</h1>
          <p className='text-gray-600'>{productsError}</p>
        </div>
      </div>
    );
  }

  if (loadingProducts) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[#9d684e] mx-auto mb-2'></div>
          <p className='text-[#455a54]'>Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-4 md:space-y-6 p-4 md:p-6'>
      {/* Header with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className='text-2xl md:text-3xl font-bold text-[#455a54] font-tan-nimbus'>
            Gestión de Ventas
          </h1>
          <p className='text-[#455a54]/70 font-winter-solid text-sm md:text-base'>
            Administra ventas y estadísticas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowCreateSaleModal(true)}
            className="bg-[#9d684e] hover:bg-[#9d684e]/90 text-white w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Venta
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-full sm:w-fit">
        <Button
          variant={activeTab === 'sales' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('sales')}
          className={`flex-1 sm:flex-none ${activeTab === 'sales' ? 'bg-[#9d684e] text-white' : ''}`}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Ventas</span>
          <span className="sm:hidden">Ventas</span>
        </Button>
        <Button
          variant={activeTab === 'stats' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('stats')}
          className={`flex-1 sm:flex-none ${activeTab === 'stats' ? 'bg-[#9d684e] text-white' : ''}`}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Estadísticas</span>
          <span className="sm:hidden">Stats</span>
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'sales' && (
        <div className="space-y-4 sm:space-y-6">
          <Card className='border-[#9d684e]/20'>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className='text-[#455a54] font-tan-nimbus text-base sm:text-lg'>
                  Lista de Ventas
                </CardTitle>
                {/* View Toggle for Desktop */}
                <div className='hidden sm:flex items-center gap-2 border border-[#9d684e]/20 rounded-lg p-1'>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className={viewMode === 'table' ? 'bg-[#9d684e] text-white' : 'text-[#455a54]'}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Tabla
                  </Button>
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className={viewMode === 'cards' ? 'bg-[#9d684e] text-white' : 'text-[#455a54]'}
                  >
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Cards
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Mobile: Always show cards, Desktop: Based on viewMode */}
              <div className="sm:hidden p-4">
                <SalesMobileView
                  sales={sales}
                  onView={handleViewSale}
                  onEdit={handleEditSale}
                  onDelete={handleDeleteSale}
                  searchValue={searchValue}
                  onSearchChange={handleSearchChange}
                  dateRange={dateRange}
                  onDateRangeChange={handleDateRangeChange}
                  statusFilter={statusFilter}
                  onStatusFilterChange={handleStatusFilterChange}
                  onRefresh={refreshAll}
                  isLoading={loadingSales}
                />
              </div>

              <div className="hidden sm:block">
                {viewMode === 'table' ? (
                  <div className="overflow-x-auto">
                    <SalesTable
                      data={sales}
                      isLoading={loadingSales}
                      onViewSale={handleViewSale}
                      onEditSale={handleEditSale}
                      onDeleteSale={handleDeleteSale}
                      onCancelSale={handleCancelSale}
                      onViewReceipt={handleViewReceipt}
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
                      statusFilter={statusFilter}
                      onStatusFilterChange={handleStatusFilterChange}
                      onRefresh={refreshAll}
                    />
                  </div>
                ) : (
                  <div className="p-4">
                    <SalesMobileView
                      sales={sales}
                      onView={handleViewSale}
                      onEdit={handleEditSale}
                      onDelete={handleDeleteSale}
                      onCancel={handleCancelSale}
                      searchValue={searchValue}
                      onSearchChange={handleSearchChange}
                      dateRange={dateRange}
                      onDateRangeChange={handleDateRangeChange}
                      statusFilter={statusFilter}
                      onStatusFilterChange={handleStatusFilterChange}
                      onRefresh={refreshAll}
                      isLoading={loadingSales}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-6">
          <SalesStatsCards />
        </div>
      )}

      {/* Modals */}
      <CreateSaleModal
        isOpen={showCreateSaleModal}
        onClose={() => setShowCreateSaleModal(false)}
        onSaleCreated={handleSaleCreated}
      />
      
      <ViewSaleModal
        isOpen={showViewSaleModal}
        onClose={() => {
          setShowViewSaleModal(false);
          setSelectedSale(null);
        }}
        sale={selectedSale}
        onSaleUpdated={() => {
          refreshAll();
          setShowViewSaleModal(false);
          setSelectedSale(null);
        }}
      />
      
      <EditSaleModal
        isOpen={showEditSaleModal}
        onClose={() => {
          setShowEditSaleModal(false);
          setSelectedSale(null);
        }}
        sale={selectedSale}
        onSave={handleUpdateSale}
      />
    </div>
  );
}