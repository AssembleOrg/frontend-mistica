'use client';

import { useState, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { usePrepaidsAPI } from '@/hooks/usePrepaidsAPI';
import { PrepaidsTable } from '@/components/dashboard/prepaids/prepaids-table';
import { PrepaidForm } from '@/components/dashboard/prepaids/prepaid-form';
import { EditPrepaidModal } from '@/components/dashboard/prepaids/edit-prepaid-modal';
import { Prepaid, CreatePrepaidRequest, UpdatePrepaidRequest } from '@/services/prepaids.service';
import { showToast } from '@/lib/toast';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { KpiStrip } from '@/components/ui/kpi-strip';
import { PrepaidsMobileView } from '@/components/dashboard/prepaids/prepaids-mobile-view';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus } from 'lucide-react';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount);

export default function PrepaidsPage() {
  const {
    isLoading,
    prepaids,
    createPrepaid,
    getPrepaids,
    updatePrepaid,
    deletePrepaid,
    markAsConsumed,
    getPrepaidsByStatus,
  } = usePrepaidsAPI();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPrepaid, setEditingPrepaid] = useState<Prepaid | null>(null);
  const [viewingPrepaid, setViewingPrepaid] = useState<Prepaid | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CONSUMED'>('ALL');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const isMobile = useIsMobile();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadPrepaidsWithFilters = async (page = 1, size = pageSize, immediate = false) => {
    try {
      let response;

      if (statusFilter === 'ALL') {
        response = await getPrepaids(page, size);
      } else {
        response = await getPrepaidsByStatus(statusFilter, page, size);
      }

      setCurrentPage(response.meta.page);
      setTotalPages(response.meta.totalPages);
      setTotalItems(response.meta.total);
    } catch (error) {
      console.error('Error loading prepaids:', error);
    }
  };

  useEffect(() => {
    if (debouncedSearchTerm !== undefined) {
      loadPrepaidsWithFilters(1);
    }
  }, [debouncedSearchTerm, statusFilter, dateRange]);

  useEffect(() => {
    loadPrepaidsWithFilters();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
  };

  const handlePageChange = (page: number) => {
    loadPrepaidsWithFilters(page, pageSize, true);
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    // Fetch manual: el useEffect de filtros solo depende de [debouncedSearchTerm, statusFilter, dateRange],
    // por lo que un cambio de pageSize no dispara refetch automático. No es duplicado.
    loadPrepaidsWithFilters(1, newPageSize, true);
  };

  const handleCreatePrepaid = () => {
    setEditingPrepaid(null);
    setViewingPrepaid(null);
    setShowForm(true);
  };

  const handleDeletePrepaid = async (prepaid: Prepaid) => {
    showToast.info('Para cancelar una seña, eliminá el cliente desde Gestión de Clientes.');
  };

  const handleMarkAsConsumed = async (prepaid: Prepaid) => {
    showToast.info('Para consumir una seña, asociala a una venta desde el módulo de Ventas.');
  };

  const handleSavePrepaid = async (
    clientId: string,
    prepaidData: CreatePrepaidRequest | UpdatePrepaidRequest
  ) => {
    try {
      if (editingPrepaid) {
        await updatePrepaid(editingPrepaid.id, prepaidData as UpdatePrepaidRequest);
      } else {
        await createPrepaid(clientId, prepaidData as CreatePrepaidRequest);
      }

      setShowForm(false);
      setEditingPrepaid(null);
      setViewingPrepaid(null);

      await loadPrepaidsWithFilters(currentPage, pageSize, true);
    } catch (error) {
      console.error('Error saving prepaid:', error);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingPrepaid(null);
    setViewingPrepaid(null);
  };

  const handleEditPrepaid = (prepaid: Prepaid) => {
    setEditingPrepaid(prepaid);
    setShowEditModal(true);
  };

  const handleViewPrepaid = (prepaid: Prepaid) => {
    setViewingPrepaid(prepaid);
    showToast.info('Ver detalles de seña', `Seña #${prepaid.id.slice(-6)}`);
  };

  const handlePrepaidUpdated = async () => {
    setShowEditModal(false);
    setEditingPrepaid(null);
    await loadPrepaidsWithFilters(currentPage, pageSize, true);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setDateRange(undefined);
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status as 'ALL' | 'PENDING' | 'CONSUMED');
  };

  // KPIs calculados desde la página actual (información de la vista)
  const kpis = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const pending = prepaids.filter((p) => p.status === 'PENDING');
    const consumedThisMonth = prepaids.filter(
      (p) => p.status === 'CONSUMED' && p.consumedAt && new Date(p.consumedAt) >= startOfMonth
    ).length;
    const pendingTotal = pending.reduce((sum, p) => sum + p.amount, 0);
    const uniqueClientsWithPending = new Set(pending.map((p) => p.clientId)).size;

    return {
      pendingCount: statusFilter === 'CONSUMED' ? 0 : pending.length,
      consumedThisMonth,
      pendingTotal,
      uniqueClientsWithPending,
    };
  }, [prepaids, statusFilter]);

  if (showForm) {
    return (
      <div className='space-y-6'>
        <PrepaidForm
          prepaid={editingPrepaid}
          onSave={handleSavePrepaid}
          onCancel={handleCancelForm}
          onMarkAsConsumed={handleMarkAsConsumed}
          isLoading={isLoading}
        />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Gestión de Señas'
        subtitle='Las señas que recibiste y las que ya se consumieron en ventas'
        actions={
          <Button
            onClick={handleCreatePrepaid}
            className='bg-[#9d684e] hover:bg-[#8a5a45] text-white font-winter-solid w-full sm:w-auto'
          >
            <Plus className='h-4 w-4 mr-2' />
            Nueva seña
          </Button>
        }
      />

      <KpiStrip
        items={[
          { label: 'Pendientes', value: kpis.pendingCount, accent: 'var(--color-terracota)', hint: 'señas activas' },
          { label: 'Monto pendiente', value: formatCurrency(kpis.pendingTotal), accent: 'var(--color-naranja-medio)' },
          { label: 'Clientes con seña', value: kpis.uniqueClientsWithPending },
          { label: 'Consumidas este mes', value: kpis.consumedThisMonth, accent: 'var(--color-ciruela-oscuro)' },
        ]}
      />

      {/* Filtros + Tabla */}
      <Card className='border-[#9d684e]/20'>
        <CardContent className='pt-6 space-y-4'>
          <div className='flex items-center justify-between gap-3 flex-wrap'>
            <Tabs value={statusFilter} onValueChange={handleStatusFilterChange}>
              <TabsList className='bg-[#455a54]/10'>
                <TabsTrigger
                  value='ALL'
                  className='data-[state=active]:bg-[#9d684e] data-[state=active]:text-white font-winter-solid'
                >
                  Todas
                </TabsTrigger>
                <TabsTrigger
                  value='PENDING'
                  className='data-[state=active]:bg-[#9d684e] data-[state=active]:text-white font-winter-solid'
                >
                  Pendientes
                </TabsTrigger>
                <TabsTrigger
                  value='CONSUMED'
                  className='data-[state=active]:bg-[#9d684e] data-[state=active]:text-white font-winter-solid'
                >
                  Consumidas
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <span className='text-sm text-[#455a54]/70 font-winter-solid tabular-nums'>
              {totalItems} {totalItems === 1 ? 'seña' : 'señas'}
            </span>
          </div>

          {isMobile ? (
            <PrepaidsMobileView
              prepaids={prepaids}
              onEdit={handleEditPrepaid}
              onDelete={handleDeletePrepaid}
              onMarkAsConsumed={handleMarkAsConsumed}
              searchTerm={searchQuery}
              onSearchChange={setSearchQuery}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              statusFilter={statusFilter}
              onStatusFilterChange={handleStatusFilterChange}
              onClearFilters={handleClearFilters}
            />
          ) : (
            <PrepaidsTable
              data={prepaids}
              isLoading={isLoading}
              onViewPrepaid={handleViewPrepaid}
              onEditPrepaid={handleEditPrepaid}
              onDeletePrepaid={handleDeletePrepaid}
              onCreatePrepaid={handleCreatePrepaid}
              onSearch={handleSearch}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onMarkAsConsumed={handleMarkAsConsumed}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              totalItems={totalItems}
            />
          )}
        </CardContent>
      </Card>

      <EditPrepaidModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingPrepaid(null);
        }}
        prepaid={editingPrepaid}
        onPrepaidUpdated={handlePrepaidUpdated}
      />
    </div>
  );
}

