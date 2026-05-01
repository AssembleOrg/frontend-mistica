'use client';

import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableFilters, FilterOption } from '@/components/ui/table-filters';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail
} from 'lucide-react';
import { Client } from '@/services/clients.service';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface ClientsTableProps {
  data: Client[];
  isLoading?: boolean;
  // Pagination props
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  // Filter props
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  onRefresh?: () => void;
  // Action props
  onViewClient?: (client: Client) => void;
  onEditClient?: (client: Client) => void;
  onDeleteClient?: (client: Client) => void;
  onCreateClient?: () => void;
}

export function ClientsTable({ 
  data, 
  isLoading,
  currentPage = 1,
  totalPages = 1,
  pageSize = 20,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  // Filter props
  searchValue = "",
  onSearchChange,
  dateRange,
  onDateRangeChange,
  statusFilter = "all",
  onStatusFilterChange,
  onRefresh,
  // Action props
  onViewClient, 
  onEditClient, 
  onDeleteClient, 
  onCreateClient
}: ClientsTableProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Status options for filter
  const statusOptions: FilterOption[] = [
    { value: 'activo', label: 'Activo' },
    { value: 'inactivo', label: 'Inactivo' },
    { value: 'suspendido', label: 'Suspendido' },
  ];

  const handleClearFilters = () => {
    onSearchChange?.("");
    onDateRangeChange?.(undefined);
    onStatusFilterChange?.("all");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // This function is no longer needed as we use TableFilters
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getPrepaidStatus = (prepaid: number) => {
    if (prepaid === 0) return { status: 'Sin seña', color: 'text-gray-500' };
    if (prepaid < 100) return { status: 'Bajo', color: 'text-red-500' };
    if (prepaid < 500) return { status: 'Medio', color: 'text-yellow-500' };
    return { status: 'Alto', color: 'text-green-500' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Clientes</h2>
          <Button onClick={onCreateClient} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando clientes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TableFilters
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar clientes por nombre, teléfono o email..."
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
        customFilters={[
          {
            key: 'status',
            label: 'Estado',
            value: statusFilter || 'all',
            options: [{ value: 'all', label: 'Todos los estados' }, ...statusOptions],
            onChange: onStatusFilterChange || (() => {}),
          },
        ]}
        onClearFilters={handleClearFilters}
        onRefresh={onRefresh || (() => window.location.reload())}
        showAdvancedFilters={showAdvancedFilters}
        onToggleAdvanced={() => setShowAdvancedFilters(!showAdvancedFilters)}
      />

      {/* Table */}
      <div className="border border-[#9d684e]/20 rounded-lg overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#9d684e]/5">
            <TableRow className="border-[#9d684e]/10">
              <TableHead className="text-[#455a54] font-winter-solid font-medium">Cliente</TableHead>
              <TableHead className="text-[#455a54] font-winter-solid font-medium">Contacto</TableHead>
              <TableHead className="text-[#455a54] font-winter-solid font-medium">Señas</TableHead>
              <TableHead className="text-[#455a54] font-winter-solid font-medium">Estado</TableHead>
              <TableHead className="text-[#455a54] font-winter-solid font-medium">Fecha Registro</TableHead>
              <TableHead className="text-right text-[#455a54] font-winter-solid font-medium">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-[#455a54]/50 font-winter-solid">
                  No se encontraron clientes
                </TableCell>
              </TableRow>
            ) : (
              data.map((client) => {
                const prepaidStatus = getPrepaidStatus(client.prepaid);
                return (
                  <TableRow key={client.id} className="border-[#9d684e]/10 hover:bg-[#9d684e]/5">
                    <TableCell>
                      <div>
                        <div className="font-medium text-[#455a54] font-winter-solid">{client.fullName}</div>
                        {client.cuit && (
                          <div className="text-sm text-[#455a54]/60">CUIT: {client.cuit}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm text-[#455a54]">
                            <Phone className="h-3 w-3 text-[#9d684e]" />
                            {client.phone}
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-2 text-sm text-[#455a54]">
                            <Mail className="h-3 w-3 text-[#9d684e]" />
                            {client.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-[#455a54] font-winter-solid">
                          {formatCurrency(client.prepaid)}
                        </div>
                        <div className={`text-sm font-winter-solid ${prepaidStatus.color}`}>
                          {prepaidStatus.status}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                        Activo
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-[#455a54] font-winter-solid">
                        {formatDate(client.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditClient?.(client)}
                          className="text-[#455a54] hover:text-[#9d684e] hover:bg-[#9d684e]/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteClient?.(client)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange || (() => {})}
        isLoading={isLoading}
        className="pt-4"
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        showPageSizeSelector={true}
        totalItems={totalItems}
      />
    </div>
  );
}
