'use client';

import { useState, useEffect } from 'react';
import { usePrepaidsAPI } from '@/hooks/usePrepaidsAPI';
import { PrepaidsTable } from '@/components/dashboard/prepaids/prepaids-table';
import { PrepaidForm } from '@/components/dashboard/prepaids/prepaid-form';
import { EditPrepaidModal } from '@/components/dashboard/prepaids/edit-prepaid-modal';
import { Prepaid, CreatePrepaidRequest, UpdatePrepaidRequest } from '@/services/prepaids.service';
import { showToast } from '@/lib/toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QuickActionsWidget } from '@/components/dashboard/quick-actions-widget';
import { Plus, CreditCard } from 'lucide-react';

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

  // Load prepaids on component mount
  useEffect(() => {
    loadPrepaids();
  }, [statusFilter]);

  const loadPrepaids = async (page = 1, size = pageSize) => {
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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    // For now, just reload with current filter
    // In a real implementation, you'd have a search endpoint
    loadPrepaids(1, pageSize);
  };

  const handlePageChange = (page: number) => {
    loadPrepaids(page, pageSize);
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    loadPrepaids(1, newPageSize);
  };

  const handleStatusFilter = (status: 'ALL' | 'PENDING' | 'CONSUMED') => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleCreatePrepaid = () => {
    setEditingPrepaid(null);
    setViewingPrepaid(null);
    setShowForm(true);
  };


  const handleDeletePrepaid = async (prepaid: Prepaid) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar esta seña de $${prepaid.amount}?`)) {
      try {
        await deletePrepaid(prepaid.id);
        // Reload prepaids
        await loadPrepaids(currentPage);
      } catch (error) {
        console.error('Error deleting prepaid:', error);
      }
    }
  };

  const handleMarkAsConsumed = async (prepaid: Prepaid) => {
    if (window.confirm(`¿Marcar como consumida la seña de $${prepaid.amount}?`)) {
      try {
        await markAsConsumed(prepaid.id);
        // Reload prepaids
        await loadPrepaids(currentPage);
      } catch (error) {
        console.error('Error marking prepaid as consumed:', error);
      }
    }
  };

  const handleSavePrepaid = async (clientId: string, prepaidData: CreatePrepaidRequest | UpdatePrepaidRequest) => {
    try {
      if (editingPrepaid) {
        await updatePrepaid(editingPrepaid.id, prepaidData as UpdatePrepaidRequest);
      } else {
        await createPrepaid(clientId, prepaidData as CreatePrepaidRequest);
      }
      
      setShowForm(false);
      setEditingPrepaid(null);
      setViewingPrepaid(null);
      
      // Reload prepaids
      await loadPrepaids(currentPage);
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
    // TODO: Implement view modal
    showToast.info('Ver detalles de seña', `Seña #${prepaid.id.slice(-6)}`);
  };

  const handlePrepaidUpdated = async () => {
    setShowEditModal(false);
    setEditingPrepaid(null);
    await loadPrepaids(currentPage);
  };

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
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-[#455a54] font-tan-nimbus mt-6'>
            Gestión de Señas
          </h1>
          <p className='text-[#455a54]/70 font-winter-solid'>
            Administra las señas y adelantos de tus clientes
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActionsWidget
        title="Gestión de Señas"
        description="Acciones rápidas para las señas"
        layout="horizontal"
        actions={[
          {
            id: 'new-prepaid',
            title: 'Nueva Seña',
            description: 'Registrar adelanto',
            onClick: handleCreatePrepaid,
            icon: Plus,
            color: 'primary'
          }
        ]}
      />

      {/* Status Filter */}
      <Card className='border-[#9d684e]/20'>
        <CardHeader>
          <CardTitle className='text-lg font-tan-nimbus text-[#455a54] flex items-center gap-2'>
            <CreditCard className='h-5 w-5' />
            Filtros de Estado
          </CardTitle>
          <CardDescription className='text-[#455a54]/70'>
            Filtra las señas por su estado actual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <button
              onClick={() => handleStatusFilter('ALL')}
              className={`px-4 py-2 rounded-md text-sm font-medium font-winter-solid transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-[#9d684e] text-white'
                  : 'bg-[#9d684e]/10 text-[#455a54] hover:bg-[#9d684e]/20'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => handleStatusFilter('PENDING')}
              className={`px-4 py-2 rounded-md text-sm font-medium font-winter-solid transition-colors ${
                statusFilter === 'PENDING'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => handleStatusFilter('CONSUMED')}
              className={`px-4 py-2 rounded-md text-sm font-medium font-winter-solid transition-colors ${
                statusFilter === 'CONSUMED'
                  ? 'bg-gray-500 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Consumidas
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Prepaids Table */}
      <Card className='border-[#9d684e]/20'>
        <CardHeader>
          <CardTitle className='text-lg font-tan-nimbus text-[#455a54] flex items-center gap-2'>
            <CreditCard className='h-5 w-5' />
            Lista de Señas
          </CardTitle>
          <CardDescription className='text-[#455a54]/70'>
            Gestiona todas las señas y adelantos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Edit Prepaid Modal */}
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
