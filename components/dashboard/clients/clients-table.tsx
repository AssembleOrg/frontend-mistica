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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { ClientLabel } from '@/services/client-labels.service';
import { getWhatsAppLink } from '@/lib/utils/whatsapp';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { ClientLabelChips } from './client-label-chips';
import { ClientSalesHistoryModal } from './client-sales-history-modal';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.82 9.82 0 0 0 1.523 5.262l-.999 3.648 3.965-1.041zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.017-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

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
  // Label filter props
  allLabels?: ClientLabel[];
  labelFilter?: string;
  onLabelFilterChange?: (id: string) => void;
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
  allLabels = [],
  labelFilter = '',
  onLabelFilterChange,
}: ClientsTableProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  // Cliente cuyo historial de ventas se está mirando (modal). null = cerrado.
  const [historyClient, setHistoryClient] = useState<Client | null>(null);

  const handleClearFilters = () => {
    onSearchChange?.('');
    onDateRangeChange?.(undefined);
    onLabelFilterChange?.('');
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

  const hasFilters = !!searchValue || !!dateRange || !!labelFilter;

  return (
    <div className='space-y-4'>
      <div className='flex flex-col sm:flex-row gap-2'>
        <div className='flex-1'>
          <TableFilters
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            searchPlaceholder='Buscar clientes por nombre, teléfono o email...'
            showDateFilter={false}
            onClearFilters={handleClearFilters}
            onRefresh={onRefresh || (() => window.location.reload())}
          />
        </div>
        {allLabels.length > 0 && (
          <Select
            value={labelFilter || 'all'}
            onValueChange={(val) => onLabelFilterChange?.(val === 'all' ? '' : val)}
          >
            <SelectTrigger className='w-full sm:w-[200px] h-9 border-[#9d684e]/20 text-[#455a54] font-winter-solid text-sm'>
              <SelectValue placeholder='Todas las etiquetas' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all' className='font-winter-solid text-sm'>
                Todas las etiquetas
              </SelectItem>
              {allLabels.map((label) => (
                <SelectItem key={label.id} value={label.id} className='font-winter-solid text-sm'>
                  <span className='flex items-center gap-2'>
                    <span
                      className='w-2 h-2 rounded-full flex-shrink-0'
                      style={{ backgroundColor: label.color ?? '#455a54' }}
                    />
                    {label.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        // Sólo el área de filas muestra el skeleton. El buscador (TableFilters)
        // queda montado durante el fetch: si se desmontara, el input perdería
        // foco y su estado local en cada búsqueda → tipear se sentía congelado.
        <ProductsTableSkeleton />
      ) : data.length === 0 ? (
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
                <TableHead className='text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid h-9 w-[180px]'>
                  Etiquetas
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
                          <a
                            href={getWhatsAppLink(client.phone)}
                            target='_blank'
                            rel='noopener noreferrer'
                            title='Abrir chat de WhatsApp'
                            onClick={(e) => e.stopPropagation()}
                            className='inline-flex items-center text-[#455a54] hover:opacity-70 transition-opacity'
                          >
                            <WhatsAppIcon className='h-3.5 w-3.5' />
                          </a>
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
                  <TableCell className='py-2.5 w-[180px]'>
                    <ClientLabelChips
                      labelIds={client.labels ?? []}
                      allLabels={allLabels}
                    />
                  </TableCell>
                  <TableCell className='py-2.5'>
                    <button
                      type='button'
                      onClick={() => setHistoryClient(client)}
                      title='Ver historial de ventas'
                      className='inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-winter-solid bg-[#9d684e]/10 text-[#9d684e] hover:bg-[#9d684e]/20 transition-colors cursor-pointer'
                    >
                      {client.transactionCount || 0} {client.transactionCount === 1 ? 'venta' : 'ventas'}
                    </button>
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

      <ClientSalesHistoryModal
        client={historyClient}
        isOpen={!!historyClient}
        onClose={() => setHistoryClient(null)}
      />
    </div>
  );
}
