'use client';

import { useState, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { useClientsAPI } from '@/hooks/useClientsAPI';
import { ClientsTable } from '@/components/dashboard/clients/clients-table';
import { ClientForm } from '@/components/dashboard/clients/client-form';
import { Client, CreateClientRequest, UpdateClientRequest, clientsService } from '@/services/clients.service';
import { formatCurrency } from '@/lib/sales-calculations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { KpiStrip } from '@/components/ui/kpi-strip';
import { Plus } from 'lucide-react';

export default function ClientsPage() {
  const {
    isLoading,
    clients,
    createClient,
    getClients,
    updateClient,
    deleteClient,
    searchClients,
  } = useClientsAPI();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Unified function to load clients with all filters
  const loadClientsWithFilters = async (page = 1, size = pageSize, immediate = false) => {
    try {
      const searchToUse = immediate ? searchQuery : debouncedSearchTerm;
      let response;

      if (searchToUse.trim()) {
        response = await searchClients(searchToUse, page, size);
      } else {
        response = await getClients(page, size);
      }

      setCurrentPage(response.meta.page);
      setTotalPages(response.meta.totalPages);
      setTotalItems(response.meta.total);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  // Consolidated useEffect for all filter changes
  useEffect(() => {
    if (debouncedSearchTerm !== undefined) {
      loadClientsWithFilters(1);
    }
  }, [debouncedSearchTerm, dateRange]);

  // Load clients on component mount
  useEffect(() => {
    loadClientsWithFilters();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
  };

  const handlePageChange = (page: number) => {
    loadClientsWithFilters(page, pageSize, true);
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    // Fetch manual: el useEffect de filtros solo depende de [debouncedSearchTerm, dateRange],
    // por lo que un cambio de pageSize no dispara refetch automático. No es duplicado.
    loadClientsWithFilters(1, newPageSize, true);
  };

  const handleCreateClient = () => {
    setEditingClient(null);
    setShowForm(true);
  };

  const handleEditClient = async (client: Client) => {
    try {
      const fresh = await clientsService.getClient(client.id);
      setEditingClient(fresh.data);
    } catch {
      setEditingClient(client);
    }
    setShowForm(true);
  };

  const handleViewClient = (client: Client) => {
    setEditingClient(null);
    setShowForm(true);
  };

  const handleDeleteClient = async (client: Client) => {
    let prepaidBalance = client.prepaid;
    try {
      const fresh = await clientsService.getClient(client.id);
      prepaidBalance = fresh.data.prepaid;
    } catch { /* use value from list if re-fetch fails */ }

    const message = prepaidBalance > 0
      ? `"${client.fullName}" tiene una seña activa de ${formatCurrency(prepaidBalance)}. Al eliminar el cliente, la seña también se cancelará. ¿Confirmás?`
      : `¿Eliminar al cliente "${client.fullName}"?`;

    if (window.confirm(message)) {
      try {
        await deleteClient(client.id);
        await loadClientsWithFilters(currentPage, pageSize, true);
      } catch (error) {
        console.error('Error deleting client:', error);
      }
    }
  };

  const handleSaveClient = async (clientData: CreateClientRequest | UpdateClientRequest) => {
    try {
      if (editingClient) {
        await updateClient(editingClient.id, clientData as UpdateClientRequest);
        await loadClientsWithFilters(currentPage, pageSize, true);
      } else {
        await createClient(clientData as CreateClientRequest);
        await loadClientsWithFilters(1, pageSize, true);
      }

      setShowForm(false);
      setEditingClient(null);
    } catch (error) {
      console.error('Error saving client:', error);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingClient(null);
  };

  // KPIs calculados desde la lista (sin tocar lógica del backend)
  const kpis = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = clients.filter(
      (c) => new Date(c.createdAt) >= startOfMonth
    ).length;
    const withCuit = clients.filter((c) => c.cuit && c.cuit.trim().length > 0).length;
    const withActivePrepaid = clients.filter((c) => c.prepaid > 0).length;
    return {
      total: totalItems || clients.length,
      newThisMonth,
      withCuit,
      withActivePrepaid,
    };
  }, [clients, totalItems]);

  if (showForm) {
    return (
      <div className='space-y-6'>
        <ClientForm
          client={editingClient}
          onSave={handleSaveClient}
          onCancel={handleCancelForm}
          isLoading={isLoading}
        />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Gestión de Clientes'
        subtitle='Administrá tu base de clientes y mantenela al día'
        actions={
          <Button
            onClick={handleCreateClient}
            className='bg-[#9d684e] hover:bg-[#8a5a45] text-white font-winter-solid w-full sm:w-auto'
          >
            <Plus className='h-4 w-4 mr-2' />
            Nuevo cliente
          </Button>
        }
      />

      <KpiStrip
        items={[
          { label: 'Total', value: kpis.total, hint: 'clientes' },
          { label: 'Nuevos este mes', value: kpis.newThisMonth, accent: 'var(--color-terracota)' },
          { label: 'Con CUIT', value: kpis.withCuit, hint: `${kpis.total > 0 ? Math.round((kpis.withCuit / kpis.total) * 100) : 0}% del total` },
          { label: 'Con seña activa', value: kpis.withActivePrepaid, accent: 'var(--color-naranja-medio)' },
        ]}
      />

      {/* Lista de Clientes */}
      <Card className='border-[#9d684e]/20'>
        <CardContent className='pt-6'>
          <ClientsTable
            data={clients}
            isLoading={isLoading}
            onViewClient={handleViewClient}
            onEditClient={handleEditClient}
            onDeleteClient={handleDeleteClient}
            onCreateClient={handleCreateClient}
            searchValue={searchQuery}
            onSearchChange={handleSearch}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            totalItems={totalItems}
          />
        </CardContent>
      </Card>
    </div>
  );
}

