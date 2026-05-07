'use client';

import { useState } from 'react';
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
import { EmptyState } from '@/components/ui/empty-state';
import { ProductsTableSkeleton } from '@/components/ui/loading-skeletons';
import { Search, Plus, Edit, Clock, CheckCircle, CreditCard } from 'lucide-react';
import { Prepaid } from '@/services/prepaids.service';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface PrepaidsTableProps {
  data: Prepaid[];
  isLoading?: boolean;
  onViewPrepaid?: (prepaid: Prepaid) => void;
  onEditPrepaid?: (prepaid: Prepaid) => void;
  onDeletePrepaid?: (prepaid: Prepaid) => void;
  onCreatePrepaid?: () => void;
  onSearch?: (query: string) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onMarkAsConsumed?: (prepaid: Prepaid) => void;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  totalItems?: number;
}

export function PrepaidsTable({
  data,
  isLoading,
  onEditPrepaid,
  onCreatePrepaid,
  onSearch,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSize = 20,
  onPageSizeChange,
  totalItems = 0,
}: PrepaidsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);

  const getStatusBadge = (status: 'PENDING' | 'CONSUMED') => {
    if (status === 'PENDING') {
      return (
        <span className='inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-winter-solid bg-[#9d684e]/10 text-[#9d684e]'>
          <Clock className='h-2.5 w-2.5' />
          Pendiente
        </span>
      );
    }
    return (
      <span className='inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-winter-solid bg-[#455a54]/8 text-[#455a54]/65'>
        <CheckCircle className='h-2.5 w-2.5' />
        Consumida
      </span>
    );
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (isLoading) {
    return <ProductsTableSkeleton />;
  }

  return (
    <div className='space-y-4'>
      <form onSubmit={handleSearch} className='flex gap-2'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-[#455a54]/50 h-4 w-4' />
          <Input
            placeholder='Buscar por cliente, monto o notas...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-10 border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20'
          />
        </div>
        <Button
          type='submit'
          variant='outline'
          className='border-[#9d684e] text-[#9d684e] hover:bg-[#9d684e] hover:text-white'
        >
          Buscar
        </Button>
      </form>

      {data.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title='Todavía no hay señas'
          description='Cuando registres una seña va a aparecer acá. Las señas se descuentan al asociarse a una venta.'
          action={
            <Button
              onClick={onCreatePrepaid}
              className='bg-[#9d684e] hover:bg-[#8a5a45] text-white font-winter-solid'
            >
              <Plus className='h-4 w-4 mr-2' />
              Nueva seña
            </Button>
          }
        />
      ) : (
        <div className='border border-[#9d684e]/15 rounded-lg overflow-hidden'>
          <Table>
            <TableHeader>
              <TableRow className='border-[#9d684e]/12 hover:bg-transparent'>
                <TableHead className='w-[4px] p-0' />
                <TableHead className='text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid h-9'>
                  Cliente
                </TableHead>
                <TableHead className='text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid h-9'>
                  Monto
                </TableHead>
                <TableHead className='text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid h-9'>
                  Estado
                </TableHead>
                <TableHead className='text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid h-9'>
                  Notas
                </TableHead>
                <TableHead className='text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid h-9'>
                  Creada
                </TableHead>
                <TableHead className='text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid h-9'>
                  Consumida
                </TableHead>
                <TableHead className='text-right text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid h-9'>
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((prepaid) => {
                const isPending = prepaid.status === 'PENDING';
                return (
                  <TableRow
                    key={prepaid.id}
                    className='border-[#9d684e]/12 hover:bg-[#efcbb9]/15'
                  >
                    <TableCell
                      className='p-0'
                      style={{
                        backgroundColor: isPending ? '#9d684e' : '#455a54',
                        opacity: isPending ? 0.55 : 0.2,
                        width: 4,
                      }}
                    />
                    <TableCell className='py-2.5'>
                      <div className='font-mono text-[11px] text-[#455a54]/65'>
                        {prepaid.clientId.slice(-8)}
                      </div>
                    </TableCell>
                    <TableCell className='py-2.5'>
                      <div className='text-sm text-[#455a54] font-tan-nimbus tabular-nums'>
                        {formatCurrency(prepaid.amount)}
                      </div>
                    </TableCell>
                    <TableCell className='py-2.5'>{getStatusBadge(prepaid.status)}</TableCell>
                    <TableCell className='py-2.5'>
                      <div className='max-w-[200px] truncate text-[13px] text-[#455a54]/80 font-winter-solid'>
                        {prepaid.notes || (
                          <span className='text-[#455a54]/35'>—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='py-2.5'>
                      <span className='text-[13px] text-[#455a54]/80 font-winter-solid tabular-nums'>
                        {formatDate(prepaid.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className='py-2.5'>
                      <span className='text-[13px] text-[#455a54]/80 font-winter-solid tabular-nums'>
                        {prepaid.consumedAt ? (
                          formatDate(prepaid.consumedAt)
                        ) : (
                          <span className='text-[#455a54]/35'>—</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className='py-2.5 text-right'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => onEditPrepaid?.(prepaid)}
                        className='h-7 w-7 p-0 text-[#455a54]/60 hover:text-[#9d684e] hover:bg-[#9d684e]/10'
                        title='Editar seña'
                      >
                        <Edit className='h-3.5 w-3.5' />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
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
