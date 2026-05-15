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
import { Button } from '@/components/ui/button';
import { TableFilters } from '@/components/ui/table-filters';
import { EmptyState } from '@/components/ui/empty-state';
import { ProductsTableSkeleton } from '@/components/ui/loading-skeletons';
import {
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  Users,
  CreditCard,
  CheckCircle2,
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
  searchValue = '',
  onSearchChange,
  dateRange,
  onDateRangeChange,
  onRefresh,
  onEditClient,
  onDeleteClient,
  onCreateClient,
}: ClientsTableProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const handleClearFilters = () => {
    onSearchChange?.('');
    onDateRangeChange?.(undefined);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const hasFilters = !!searchValue || !!dateRange;

  if (isLoading) {
    return <ProductsTableSkeleton />;
  }

  return (
    <div className='space-y-4'>
      <TableFilters
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder='Buscar clientes por nombre, teléfono o email...'
        showDateFilter={false}
        onClearFilters={handleClearFilters}
        onRefresh={onRefresh || (() => window.location.reload())}
      />

      {data.length === 0 ? (
        hasFilters ? (
          <EmptyState
            variant='compact'
            icon={Users}
            title='Sin resultados'
            description='Probá ajustar los filtros o la búsqueda.'
          />
        ) : (
          <EmptyState
            icon={Users}
            title='Todavía no hay clientes'
            description='Cuando registres tu primer cliente va a aparecer acá.'
            action={
              <Button
                onClick={onCreateClient}
                className='bg-[#9d684e] hover:bg-[#8a5a45] text-white font-winter-solid'
              >
                <Plus className='h-4 w-4 mr-2' />
                Nuevo cliente
              </Button>
            }
          />
        )
      ) : (
        <div className='border border-[#9d684e]/15 rounded-lg overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='border-[#9d684e]/12 hover:bg-transparent'>
                <TableHead className='text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid h-9'>
                  Cliente
                </TableHead>
                <TableHead className='text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid h-9'>
                  Contacto
                </TableHead>
                <TableHead className='text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid h-9'>
                  Transacciones
                </TableHead>
                <TableHead className='text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid h-9'>
                  Registrado
                </TableHead>
                <TableHead className='text-right text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid h-9'>
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((client) => (
                <TableRow
                  key={client.id}
                  className='border-[#9d684e]/12 hover:bg-[#efcbb9]/15'
                >
                  <TableCell className='py-2.5'>
                    <div className='flex items-center gap-2.5'>
                      <div className='w-7 h-7 rounded-full bg-[#9d684e]/15 flex items-center justify-center text-[#9d684e] font-tan-nimbus text-[11px] flex-shrink-0'>
                        {getInitials(client.fullName)}
                      </div>
                      <div className='min-w-0'>
                        <div className='text-sm text-[#455a54] font-winter-solid truncate'>
                          {client.fullName}
                        </div>
                        {client.cuit && (
                          <div className='text-[11px] text-[#455a54]/55 tabular-nums'>
                            CUIT {client.cuit}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className='py-2.5'>
                    <div className='space-y-0.5 text-[13px]'>
                      {client.phone && (
                        <div className='flex items-center gap-1.5 text-[#455a54]'>
                          <Phone className='h-3 w-3 text-[#9d684e]/70' />
                          <span className='tabular-nums'>{client.phone}</span>
                        </div>
                      )}
                      {client.email && (
                        <div className='flex items-center gap-1.5 text-[#455a54]/80'>
                          <Mail className='h-3 w-3 text-[#9d684e]/70' />
                          <span className='truncate max-w-[200px]'>{client.email}</span>
                        </div>
                      )}
                      {!client.phone && !client.email && (
                        <span className='text-[#455a54]/35'>—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='py-2.5'>
                    <span className='inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-winter-solid bg-[#9d684e]/10 text-[#9d684e]'>
                      {client.transactionCount || 0} {client.transactionCount === 1 ? 'venta' : 'ventas'}
                    </span>
                  </TableCell>
                  <TableCell className='py-2.5'>
                    <span className='text-[13px] text-[#455a54]/80 font-winter-solid tabular-nums'>
                      {formatDate(client.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell className='py-2.5 text-right'>
                    <div className='flex justify-end gap-0.5'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => onEditClient?.(client)}
                        className='h-7 w-7 p-0 text-[#455a54]/60 hover:text-[#9d684e] hover:bg-[#9d684e]/10'
                      >
                        <Edit className='h-3.5 w-3.5' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => onDeleteClient?.(client)}
                        className='h-7 w-7 p-0 text-[#455a54]/60 hover:text-red-600 hover:bg-red-50'
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange || (() => {})}
          isLoading={isLoading}
          className='pt-4'
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          showPageSizeSelector={true}
          totalItems={totalItems}
        />
      )}
    </div>
  );
}
