'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Download,
} from 'lucide-react';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSpinner } from '@/components/ui/loading-skeletons';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sale } from '@/services/sales.service';
import { showToast } from '@/lib/toast';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface SalesTableProps {
  data: Sale[];
  isLoading?: boolean;
  onViewSale?: (sale: Sale) => void;
  onEditSale?: (sale: Sale) => void;
  onDeleteSale?: (saleId: string) => void;
  // Pagination props
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function SalesTable({ 
  data, 
  isLoading, 
  onViewSale, 
  onEditSale, 
  onDeleteSale,
  currentPage = 1,
  totalPages = 1,
  pageSize = 20,
  totalItems = 0,
  onPageChange,
  onPageSizeChange
}: SalesTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      CASH: 'Efectivo',
      CARD: 'Tarjeta',
      TRANSFER: 'Transferencia',
    };
    return labels[method as keyof typeof labels] || method;
  };

  const getStatusBadge = (status: string) => {
    const labels = {
      COMPLETED: 'Completada',
      PENDING: 'Pendiente',
      CANCELLED: 'Cancelada',
    };

    const getVariant = (status: string) => {
      switch (status) {
        case 'COMPLETED':
          return 'default';
        case 'PENDING':
          return 'secondary';
        case 'CANCELLED':
          return 'outline';
        default:
          return 'default';
      }
    };

    return (
      <Badge variant={getVariant(status)}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const handleAction = async (saleId: string, action: 'view' | 'edit' | 'delete') => {
    setActionLoading((prev) => ({ ...prev, [saleId]: true }));

    try {
      const sale = data.find(s => s.id === saleId);
      if (!sale) return;

      if (action === 'view') {
        onViewSale?.(sale);
      } else if (action === 'edit') {
        onEditSale?.(sale);
      } else if (action === 'delete') {
        if (confirm('¿Estás seguro de que quieres eliminar esta venta?')) {
          onDeleteSale?.(saleId);
        }
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      showToast.error(
        'Error',
        `Error al ${action === 'delete' ? 'eliminar' : 'procesar'} la venta.`
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, [saleId]: false }));
    }
  };

  const columns: ColumnDef<Sale>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Seleccionar todos'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label='Seleccionar fila'
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'saleNumber',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='text-[#455a54] font-winter-solid hover:text-[#9d684e]'
          >
            Número de Venta
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className='font-medium text-[#455a54]'>{row.getValue('saleNumber')}</div>
      ),
    },
    {
      accessorKey: 'customerName',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='text-[#455a54] font-winter-solid hover:text-[#9d684e]'
          >
            Cliente
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const sale = row.original;
        return (
          <div>
            <div className='font-medium text-[#455a54]'>{sale.customerName}</div>
            {sale.customerEmail && (
              <div className='text-sm text-gray-500'>{sale.customerEmail}</div>
            )}
            {sale.customerPhone && (
              <div className='text-sm text-gray-500'>{sale.customerPhone}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'items',
      header: 'Productos',
      cell: ({ row }) => {
        const items = row.getValue('items') as Sale['items'];
        return (
          <div className='max-w-xs'>
            <div className='text-sm font-medium text-[#455a54]'>
              {items.length} producto{items.length !== 1 ? 's' : ''}
            </div>
            <div className='text-xs text-gray-500 truncate'>
              {items.slice(0, 2).map(item => item.productName).join(', ')}
              {items.length > 2 && ` +${items.length - 2} más`}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'total',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='text-[#455a54] font-winter-solid hover:text-[#9d684e]'
          >
            Total
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('total'));
        return <div className='font-medium text-[#9d684e]'>{formatCurrency(amount)}</div>;
      },
    },
    {
      accessorKey: 'paymentMethod',
      header: 'Método de Pago',
      cell: ({ row }) => {
        const method = row.getValue('paymentMethod') as string;
        return (
          <div className='font-medium text-[#455a54]'>
            {getPaymentMethodLabel(method)}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return getStatusBadge(status);
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='text-[#455a54] font-winter-solid hover:text-[#9d684e]'
          >
            Fecha
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = row.getValue('createdAt') as string;
        return <div className='text-sm text-[#455a54]'>{formatDate(date)}</div>;
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const sale = row.original;
        const isActionLoading = actionLoading[sale.id] || false;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                className='h-8 w-8 p-0 hover:bg-[#efcbb9]/50'
                disabled={isActionLoading}
              >
                <span className='sr-only'>Abrir menú</span>
                {isActionLoading ? (
                  <LoadingSpinner size='sm' />
                ) : (
                  <MoreHorizontal className='h-4 w-4' />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem
                className='hover:bg-[#efcbb9]/30'
                onClick={() => handleAction(sale.id, 'view')}
                disabled={isActionLoading}
              >
                <Eye className='mr-2 h-4 w-4' />
                Ver detalles
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='hover:bg-[#efcbb9]/30'
                onClick={() => handleAction(sale.id, 'edit')}
                disabled={isActionLoading}
              >
                <Edit className='mr-2 h-4 w-4' />
                Editar venta
              </DropdownMenuItem>
              <DropdownMenuItem
                className='hover:bg-red-50 text-red-600'
                onClick={() => handleAction(sale.id, 'delete')}
                disabled={isActionLoading}
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    // Disable client-side pagination since we're using server-side
    // getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  if (isLoading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-center'>
          <LoadingSpinner size='lg' />
          <p className='mt-2 text-[#455a54]/70 font-winter-solid'>
            Cargando ventas...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full'>
      <div className='flex items-center py-4'>
        <div className='flex gap-2'>
          <select
            value={
              (table.getColumn('status')?.getFilterValue() as string) ?? ''
            }
            onChange={(event) =>
              table
                .getColumn('status')
                ?.setFilterValue(event.target.value || undefined)
            }
            className='px-3 py-2 border border-[#9d684e]/20 rounded-md focus:border-[#9d684e] focus:outline-none max-w-sm'
          >
            <option value=''>Todos los estados</option>
            <option value='COMPLETED'>Completadas</option>
            <option value='PENDING'>Pendientes</option>
            <option value='CANCELLED'>Canceladas</option>
          </select>
        </div>
        <div className='ml-auto flex gap-2'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='outline'
                className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30'
              >
                Columnas <ChevronDown className='ml-2 h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className='hover:bg-[#efcbb9]/30 capitalize'
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className='rounded-md border border-[#9d684e]/20'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className='hover:bg-[#efcbb9]/20'
              >
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className='hover:bg-[#efcbb9]/10'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center text-[#455a54]/70'
                >
                  No se encontraron ventas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className='flex items-center justify-between py-4'>
        <div className='text-sm text-[#455a54]/70 font-winter-solid'>
          {table.getFilteredSelectedRowModel().rows.length} de{' '}
          {table.getFilteredRowModel().rows.length} fila(s) seleccionadas.
        </div>
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange || (() => {})}
          isLoading={isLoading}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange || (() => {})}
          showPageSizeSelector={true}
          totalItems={totalItems}
        />
      </div>
    </div>
  );
}
