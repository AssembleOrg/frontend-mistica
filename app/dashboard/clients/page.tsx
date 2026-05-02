'use client';

import { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { useClientsAPI } from '@/hooks/useClientsAPI';
import { ClientsTable } from '@/components/dashboard/clients/clients-table';
import { ClientForm } from '@/components/dashboard/clients/client-form';
import { Client, CreateClientRequest, UpdateClientRequest, clientsService } from '@/services/clients.service';
import { formatCurrency } from '@/lib/sales-calculations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QuickActionsWidget } from '@/components/dashboard/quick-actions-widget';
import { Plus, UserCheck } from 'lucide-react';

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
  // const [viewingClient, setViewingClient] = useState<Client | null>(null);

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
    // Search will be handled by the debounced useEffect
  };

  const handlePageChange = (page: number) => {
    loadClientsWithFilters(page, pageSize, true);
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    loadClientsWithFilters(1, newPageSize, true);
  };

  const handleCreateClient = () => {
    setEditingClient(null);
    // setViewingClient(null);
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
    // setViewingClient(client);
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
        // createClient already re-fetches the client and updates local state with real prepaid balance
        // Do NOT reload the full list here — it would overwrite the correct balance with stale data
        await createClient(clientData as CreateClientRequest);
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
    // setViewingClient(null);
  };

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
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold text-[#455a54] font-tan-nimbus mt-6'>
            Gestión de Clientes
          </h1>
          <p className='text-[#455a54]/70 font-winter-solid'>
            Administra tu base de datos de clientes y sus señas
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActionsWidget
        title="Gestión de Clientes"
        description="Acciones rápidas para la base de clientes"
        layout="horizontal"
        actions={[
          {
            id: 'new-client',
            title: 'Nuevo Cliente',
            description: 'Agregar a la base de datos',
            onClick: handleCreateClient,
            icon: Plus,
            color: 'primary'
          }
        ]}
      />

      {/* Clients Table */}
      <Card className='border-[#9d684e]/20'>
        <CardHeader>
          <CardTitle className='text-lg font-tan-nimbus text-[#455a54] flex items-center gap-2'>
            <UserCheck className='h-5 w-5' />
            Lista de Clientes
          </CardTitle>
          <CardDescription className='text-[#455a54]/70'>
            Gestiona la información de tus clientes y sus señas
          </CardDescription>
        </CardHeader>
        <CardContent>
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
