/**
 * CAPA 4: PRESENTATION LAYER - SALES PAGE (CLEAN VERSION)
 *
 * Componente UI PURO que solo renderiza y delega al controller
 * Sin lógica de negocio, sin acceso directo a stores
 */

'use client';

import { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { showToast } from '@/lib/toast';
import { processReceiptGeneration } from '@/lib/receipt-utils';
import { useSales } from '@/hooks/useSales';
import { useProducts } from '@/hooks/useProducts';
import { useInitialProductsData } from '@/hooks/useInitialProductsData';
import { useSessionManager } from '@/hooks/useSessionManager';
import { useSalesAPI } from '@/hooks/useSalesAPI';
import { Sale, UpdateSaleRequest } from '@/services/sales.service';
import { PaymentInfo, ProductCategory } from '@/lib/types';
import { Plus, BarChart3, ShoppingCart } from 'lucide-react';

// Clean UI Components
import { ProductSearchSection } from '@/components/dashboard/sales/ProductSearchSection';
import { ShoppingCartSection } from '@/components/dashboard/sales/ShoppingCartSection';
import { CheckoutSection } from '@/components/dashboard/sales/CheckoutSection';
import { SalesStatsWidget } from '@/components/dashboard/sales/sales-stats-widget';
import { SessionManager } from '@/components/dashboard/session-manager';
import { CreateSaleModal } from '@/components/dashboard/sales/create-sale-modal';
import { ViewSaleModal } from '@/components/dashboard/sales/view-sale-modal';
import { EditSaleModal } from '@/components/dashboard/sales/edit-sale-modal';
import { SalesTable } from '@/components/dashboard/sales/sales-table';
import { SalesMobileView } from '@/components/dashboard/sales-mobile-view';
import { SalesStatsCards } from '@/components/dashboard/sales/sales-stats-cards';
import { useIsMobile } from '@/hooks/use-mobile';

export default function SalesPage() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [searchResults, setSearchResults] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [isSearching, setIsSearching] = useState(false);
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
  const [searchValue, setSearchValue] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [statusFilter, setStatusFilter] = useState("all");

  // Mobile responsive
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(isMobile ? 'cards' : 'table');

  // Initialize products data from backend
  console.log('🏪 Sales Page: Inicializando datos de productos');
  const { isLoading: loadingProducts, error: productsError } = useInitialProductsData();

  // Sales API hooks
  const { 
    isLoading: loadingSales, 
    sales, 
    dailySales, 
    getSalesPaginated, 
    getDailySales, 
    deleteSale 
  } = useSalesAPI();

  // Session-aware POS operations
  const sessionManager = useSessionManager({ autoCreateSession: true });
  const {
    addProductToCart: addToSessionCart,
    removeFromCart: removeFromSessionCart,
    updateCartQuantity: updateSessionCartQuantity,
    clearCart: clearSessionCart,
    quickCheckout,
    hasActiveSession
  } = sessionManager;

  // Fallback to old system for backward compatibility
  const { searchProducts, products } = useProducts();
  const oldSalesHook = useSales();


  // Unified useEffect for all data loading (debounced for search, immediate for pagination/status)
  useEffect(() => {
    // Immediate loading for pagination and status changes (no debounce needed)
    if (searchValue.trim() === '') {
      console.log('🔍 Sales Page: Loading immediately - no search term');
      loadSalesWithFilters();
      return;
    }

    // Debounced loading for search text
    const searchTimeout = setTimeout(() => {
      console.log('🔍 Sales Page: Loading with debounced search');
      loadSalesWithFilters();
    }, 500);

    return () => clearTimeout(searchTimeout);
  }, [currentPage, pageSize, searchValue, statusFilter, dateRange]);

  // Load daily sales data only once on mount
  useEffect(() => {
    getDailySales();
  }, []);

  // Function to load sales with current filters
  const loadSalesWithFilters = async () => {
    const filters: {
      search?: string;
      status?: string;
      from?: string;
      to?: string;
    } = {};

    // Solo agregar filtros si tienen valores válidos
    if (searchValue.trim()) {
      filters.search = searchValue.trim();
    }
    
    if (statusFilter && statusFilter !== "all") {
      filters.status = statusFilter;
    }
    
    if (dateRange?.from) {
      filters.from = dateRange.from.toISOString().split('T')[0]; // YYYY-MM-DD format
    }
    
    if (dateRange?.to) {
      filters.to = dateRange.to.toISOString().split('T')[0]; // YYYY-MM-DD format
    }

    console.log('🔍 Loading sales with filters:', { page: currentPage, pageSize, filters });
    
    try {
      const result = await getSalesPaginated(currentPage, pageSize, filters);
      if (result) {
        setTotalPages(result.meta?.totalPages || 1);
        setTotalItems(result.meta?.total || 0);
      }
    } catch (error) {
      console.error('Error loading sales:', error);
    }
  };

  // Filter handlers
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    console.log('🔍 Sales Page: Date range changed:', range);
    setDateRange(range);
    setCurrentPage(1);
    // La carga de datos será manejada por el useEffect debounced
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    loadSalesWithFilters();
    getDailySales();
  };

  // Pure event handlers - delegate to session manager
  const handleProductSelect = async (productId: string, quantity = 1) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) {
        throw new Error('Producto no encontrado');
      }

      if (hasActiveSession) {
        // Use session-aware cart management
        addToSessionCart(product, quantity);
      } else {
        // Fallback to old system
        oldSalesHook.addProductToCart(productId, quantity);
        showToast.success('Producto agregado al carrito');
      }
      
      setSelectedProductId(null);
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Error agregando producto'
      );
    }
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    try {
      if (hasActiveSession) {
        updateSessionCartQuantity(productId, quantity);
      } else {
        oldSalesHook.updateCartQuantity(productId, quantity);
      }
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Error actualizando cantidad'
      );
    }
  };

  const handleRemoveItem = (productId: string) => {
    try {
      if (hasActiveSession) {
        removeFromSessionCart(productId);
      } else {
        oldSalesHook.removeFromCart(productId);
        showToast.info('Producto removido');
      }
    } catch (_error) {
      showToast.error('Error removiendo producto');
    }
  };

  const handleClearCart = () => {
    try {
      if (hasActiveSession) {
        clearSessionCart();
      } else {
        oldSalesHook.clearCart();
        showToast.info('Carrito limpiado');
      }
    } catch (_error) {
      showToast.error('Error limpiando carrito');
    }
  };

  const handleCheckout = async (paymentInfo: PaymentInfo) => {
    try {
      if (hasActiveSession) {
        await quickCheckout(paymentInfo);
      } else {
        oldSalesHook.checkout(paymentInfo);
        showToast.success('Venta completada exitosamente');
      }
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Error procesando venta'
      );
    }
  };

  const handleSearch = async (query: string, category?: string) => {
    try {
      setIsSearching(true);
      console.log('🏪 Sales Page: Buscando productos con query:', query, 'categoria:', category);
      const results = searchProducts(query, category as ProductCategory);
      console.log('🏪 Sales Page: Resultados encontrados:', results.length);
      setSearchResults(results);
    } catch (error) {
      console.error('🏪 Sales Page: Error en búsqueda:', error);
      showToast.error(
        error instanceof Error ? error.message : 'Error en búsqueda'
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Sales handlers
  const handleSaleCreated = (sale: Sale) => {
    showToast.success('Venta creada exitosamente');
    // Refresh sales data
    loadSalesWithFilters();
    getDailySales();
  };

  const handleViewSale = (sale: Sale) => {
    setSelectedSale(sale);
    setShowViewSaleModal(true);
  };

  const handleViewReceipt = (sale: Sale) => {
    // Generar comprobante para venta completada
    processReceiptGeneration(sale, false);
  };

  const handleEditSale = (sale: Sale) => {
    setSelectedSale(sale);
    setShowEditSaleModal(true);
  };

  const handleUpdateSale = async (saleId: string, updatedSale: UpdateSaleRequest) => {
    try {
      // TODO: Implement update sale API call
      console.log('Updating sale:', saleId, updatedSale);
      showToast.success('Venta actualizada exitosamente');
      // Refresh sales data
      loadSalesWithFilters();
      getDailySales();
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    try {
      await deleteSale(saleId);
      // Refresh sales data
      loadSalesWithFilters();
      getDailySales();
    } catch (error) {
      console.error('Error deleting sale:', error);
    }
  };

  const handleCancelSale = async (saleId: string) => {
    try {
      // Update sale status to CANCELLED
      await handleUpdateSale(saleId, { status: 'CANCELLED' });
      showToast.success('Venta cancelada exitosamente');
    } catch (error) {
      console.error('Error cancelling sale:', error);
      showToast.error('Error al cancelar la venta');
    }
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page
  };

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
                  onRefresh={handleRefresh}
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
                      onRefresh={handleRefresh}
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
                      onRefresh={handleRefresh}
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
          <SalesStatsCards
            dailySales={dailySales}
            allSales={sales}
            isLoading={loadingSales}
          />
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
          loadSalesWithFilters();
          getDailySales();
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