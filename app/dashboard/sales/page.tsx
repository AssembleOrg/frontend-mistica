'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { showToast } from '@/lib/toast';
import { processReceiptGeneration, hasAfipData } from '@/lib/receipt-utils';
import { useInitialProductsData } from '@/hooks/useInitialProductsData';
import { useSalesAPI } from '@/hooks/useSalesAPI';
import { Sale, UpdateSaleRequest } from '@/services/sales.service';
import { Plus, BarChart3, ShoppingCart } from 'lucide-react';

import { SalesTable } from '@/components/dashboard/sales/sales-table';
import { SalesMobileView } from '@/components/dashboard/sales-mobile-view';
import { SalesStatsCards } from '@/components/dashboard/sales/sales-stats-cards';
import { SaleDetailPanel } from '@/components/dashboard/sales/sale-detail-panel';
import { KbdShortcuts } from '@/components/dashboard/sales/kbd-shortcuts';

const CreateSaleModal = dynamic(
  () => import('@/components/dashboard/sales/create-sale-modal').then(m => m.CreateSaleModal),
  { ssr: false }
);
const EditSaleModal = dynamic(
  () => import('@/components/dashboard/sales/edit-sale-modal').then(m => m.EditSaleModal),
  { ssr: false }
);

export default function SalesPage() {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const submitCreateButtonRef = useRef<HTMLButtonElement | null>(null);
  const submitEditButtonRef = useRef<HTMLButtonElement | null>(null);

  const [showCreateSaleModal, setShowCreateSaleModal] = useState(false);
  const [showEditSaleModal, setShowEditSaleModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [searchValue, setSearchValue] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [statusFilter, setStatusFilter] = useState('all');

  const { isLoading: loadingProducts, error: productsError } = useInitialProductsData();
  const { isLoading: loadingSales, sales, getSalesPaginated, getSaleById, getDailySales, deleteSale } = useSalesAPI();

  const loadSales = useCallback(async () => {
    const filters: { search?: string; status?: string; from?: string; to?: string } = {};
    if (searchValue.trim()) filters.search = searchValue.trim();
    if (statusFilter && statusFilter !== 'all') filters.status = statusFilter;
    if (dateRange?.from) filters.from = dateRange.from.toISOString().split('T')[0];
    if (dateRange?.to) filters.to = dateRange.to.toISOString().split('T')[0];

    try {
      const result = await getSalesPaginated(currentPage, pageSize, filters);
      if (result) {
        setTotalPages(result.meta?.totalPages ?? 1);
        setTotalItems(result.meta?.total ?? 0);
      }
    } catch (error) {
      console.error('Error loading sales:', error);
    }
  }, [currentPage, pageSize, searchValue, statusFilter, dateRange, getSalesPaginated]);

  useEffect(() => {
    if (!searchValue.trim()) { loadSales(); return; }
    const t = setTimeout(loadSales, 500);
    return () => clearTimeout(t);
  }, [loadSales, searchValue]);

  useEffect(() => { getDailySales(); }, [getDailySales]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadSales(), getDailySales()]);
  }, [loadSales, getDailySales]);

  // Filter handlers — reset to page 1 on any filter change
  const handleSearchChange = useCallback((v: string) => { setSearchValue(v); setCurrentPage(1); }, []);
  const handleDateRangeChange = useCallback((r: DateRange | undefined) => { setDateRange(r); setCurrentPage(1); }, []);
  const handleStatusFilterChange = useCallback((s: string) => { setStatusFilter(s); setCurrentPage(1); }, []);

  // Sale selection — on mobile also opens Sheet
  const handleSelectSale = useCallback((sale: Sale) => {
    setSelectedSale(sale);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileDetailOpen(true);
    }
  }, []);

  const handleSaleCreated = useCallback(async () => {
    showToast.success('Venta creada exitosamente');
    // Refrescar y auto-seleccionar la venta recién creada (primera de la lista, orden desc)
    try {
      const result = await getSalesPaginated(1, pageSize, {});
      // result es PaginatedResponse: { data: Sale[], meta: {...} }
      if (result?.data?.length) {
        setSelectedSale(result.data[0]);
      }
      getDailySales();
    } catch {
      refreshAll();
    }
  }, [getSalesPaginated, getDailySales, refreshAll, pageSize]);

  const handleViewReceipt = useCallback((sale: Sale) => {
    processReceiptGeneration(sale, hasAfipData(sale));
  }, []);

  const handleEditSale = useCallback((sale: Sale) => {
    setSelectedSale(sale);
    setShowEditSaleModal(true);
  }, []);

  const handleUpdateSale = useCallback(async (_id: string, _data: UpdateSaleRequest) => {
    showToast.success('Venta actualizada');
    await refreshAll();
  }, [refreshAll]);

  const handleDeleteSale = useCallback(async (saleId: string) => {
    try {
      await deleteSale(saleId);
      if (selectedSale?.id === saleId) setSelectedSale(null);
      await refreshAll();
    } catch (error) {
      console.error('Error deleting sale:', error);
    }
  }, [deleteSale, refreshAll, selectedSale]);

  const handleCancelSale = useCallback(async (saleId: string) => {
    try {
      await handleUpdateSale(saleId, { status: 'CANCELLED' });
    } catch {
      showToast.error('Error al cancelar la venta');
    }
  }, [handleUpdateSale]);

  const handleSaleUpdated = useCallback(async () => {
    const prevId = selectedSale?.id;
    await refreshAll();
    if (!prevId) return;
    getSaleById(prevId).then(fresh => setSelectedSale(fresh)).catch(() => {
      // La venta ya no existe (fue eliminada) — limpiar selección
      setSelectedSale(null);
    });
  }, [refreshAll, getSaleById, selectedSale]);

  // ── Loading / error states ────────────────────────────────────────────────
  if (productsError) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600 mb-1 font-tan-nimbus">Error cargando productos</h1>
          <p className="text-sm text-[#455a54]/60 font-winter-solid">{productsError}</p>
        </div>
      </div>
    );
  }

  if (loadingProducts) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#9d684e] mx-auto mb-2" />
          <p className="text-sm text-[#455a54]/60 font-winter-solid">Cargando…</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    // Escape container-mobile padding para tomar el ancho completo disponible
    <div className="-mx-2 sm:-mx-4 -mt-2 sm:-mt-4 flex flex-col bg-[#d9dadb]" style={{ height: 'calc(100vh - 4rem)' }}>

      {/* ── Topbar ─────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-3 border-b border-[#9d684e]/10 bg-[#efcbb9] shrink-0">
        <h1 className="text-xl font-bold text-[#455a54] font-tan-nimbus leading-none">
          Ventas
        </h1>
        <p className="text-[11px] text-black/60 font-winter-solid mt-0.5 hidden sm:block">
          Gestión de ventas, facturas y comprobantes
        </p>
      </div>

      {/* ── Tabs ───────────────────────────────────────── */}
      <Tabs defaultValue="sales" className="flex flex-col flex-1 min-h-0 border-[3px] border-[#455a54] rounded-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 pt-2 pb-0 shrink-0 relative">
          <TabsList className="bg-[#455a54]/10 h-8">
            <TabsTrigger
              value="sales"
              className="data-[state=active]:bg-[#9d684e] data-[state=active]:text-white text-[#455a54] text-xs h-6 px-3 font-winter-solid"
            >
              <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
              Ventas
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="data-[state=active]:bg-[#9d684e] data-[state=active]:text-white text-[#455a54] text-xs h-6 px-3 font-winter-solid"
            >
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
              Estadísticas
            </TabsTrigger>
          </TabsList>
          <Button
            onClick={() => setShowCreateSaleModal(true)}
            className="bg-[#9d684e] hover:bg-[#9d684e]/90 text-white h-8 text-sm font-winter-solid px-4"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Nueva venta
            <kbd className="hidden lg:inline-flex ml-2 px-1 py-0.5 text-[10px] font-mono bg-white/20 border border-white/40 rounded leading-none">F2</kbd>
          </Button>
        </div>

        {/* ── Tab: Ventas ── Master-Detail ───────────── */}
        <TabsContent value="sales" className="flex-1 min-h-0 mt-0">
          <div className="flex h-full">

            {/* Panel izquierdo: lista */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
              {/* Mobile view */}
              <div className="lg:hidden flex-1 overflow-y-auto p-3">
                <SalesMobileView
                  sales={sales}
                  onView={handleSelectSale}
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

              {/* Desktop table — ocupa el alto disponible */}
              <div className="hidden lg:flex flex-col flex-1 min-h-0 overflow-y-auto">
                <SalesTable
                  data={sales}
                  isLoading={loadingSales}
                  selectedSaleId={selectedSale?.id}
                  isPanelOpen={!!selectedSale}
                  onViewSale={handleSelectSale}
                  onEditSale={handleEditSale}
                  onDeleteSale={handleDeleteSale}
                  onCancelSale={handleCancelSale}
                  onViewReceipt={handleViewReceipt}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={totalItems}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); }}
                  searchValue={searchValue}
                  onSearchChange={handleSearchChange}
                  dateRange={dateRange}
                  onDateRangeChange={handleDateRangeChange}
                  statusFilter={statusFilter}
                  onStatusFilterChange={handleStatusFilterChange}
                  onRefresh={refreshAll}
                  searchInputRef={searchInputRef}
                />
              </div>
            </div>

            {/* Panel derecho: detalle + Sheet mobile */}
            <SaleDetailPanel
              sale={selectedSale}
              onSaleUpdated={handleSaleUpdated}
              onRequestEdit={handleEditSale}
              mobileOpen={mobileDetailOpen}
              onMobileClose={() => setMobileDetailOpen(false)}
            />
          </div>
        </TabsContent>

        {/* ── Tab: Estadísticas ─────────────────────── */}
        <TabsContent value="stats" className="flex-1 min-h-0 overflow-y-auto mt-0">
          <div className="p-4 sm:p-6">
            <SalesStatsCards />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Modales ─────────────────────────────────── */}
      <CreateSaleModal
        isOpen={showCreateSaleModal}
        onClose={() => setShowCreateSaleModal(false)}
        onSaleCreated={handleSaleCreated}
        submitButtonRef={submitCreateButtonRef}
      />
      <EditSaleModal
        isOpen={showEditSaleModal}
        onClose={() => { setShowEditSaleModal(false); setSelectedSale(null); }}
        sale={selectedSale}
        onSave={handleUpdateSale}
        submitButtonRef={submitEditButtonRef}
      />
      <KbdShortcuts
        sales={sales}
        selectedSale={selectedSale}
        onSelectSale={handleSelectSale}
        showCreateSaleModal={showCreateSaleModal}
        showEditSaleModal={showEditSaleModal}
        onOpenCreateModal={() => setShowCreateSaleModal(true)}
        onCloseCreateModal={() => setShowCreateSaleModal(false)}
        onCloseEditModal={() => { setShowEditSaleModal(false); setSelectedSale(null); }}
        searchInputRef={searchInputRef}
        submitCreateButtonRef={submitCreateButtonRef}
        submitEditButtonRef={submitEditButtonRef}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        onRequestEdit={handleEditSale}
        onViewReceipt={handleViewReceipt}
      />
    </div>
  );
}
