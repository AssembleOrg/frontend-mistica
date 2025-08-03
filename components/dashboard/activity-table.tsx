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
import { ArrowUpDown, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Activity, ActivityType } from '@/stores/activity.store';

// Activity type configuration for badges
const activityTypeConfig: Record<
  ActivityType,
  { label: string; color: string; bgColor: string }
> = {
  ingreso: {
    label: 'Ingreso',
    color: '#10b981',
    bgColor: '#10b981/10',
  },
  egreso: {
    label: 'Egreso',
    color: '#ef4444',
    bgColor: '#ef4444/10',
  },
  cambio_producto: {
    label: 'Cambio Producto',
    color: '#6366f1',
    bgColor: '#6366f1/10',
  },
  cambio_precio: {
    label: 'Cambio Precio',
    color: '#f59e0b',
    bgColor: '#f59e0b/10',
  },
  otro: {
    label: 'Otro',
    color: '#6b7280',
    bgColor: '#6b7280/10',
  },
};

interface ActivityTableProps {
  data: Activity[];
  isLoading?: boolean;
  compact?: boolean;
}

export function ActivityTable({
  data,
  isLoading = false,
  compact = false,
}: ActivityTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'date', desc: true }, // Sort by date descending by default
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const columns: ColumnDef<Activity>[] = [
    {
      accessorKey: 'date',
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
        const date = row.getValue('date') as Date;
        const formatted = new Intl.DateTimeFormat('es-AR', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(date);

        return <div className='font-medium text-[#455a54]'>{formatted}</div>;
      },
    },
    {
      accessorKey: 'type',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='text-[#455a54] font-winter-solid hover:text-[#9d684e]'
          >
            Tipo
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const type = row.getValue('type') as ActivityType;
        const config = activityTypeConfig[type];
        return (
          <div
            className='inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'
            style={{
              color: config.color,
              backgroundColor: config.bgColor,
            }}
          >
            {config.label}
          </div>
        );
      },
    },
    {
      accessorKey: 'description',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='text-[#455a54] font-winter-solid hover:text-[#9d684e]'
          >
            Descripción
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className='max-w-[300px] truncate text-[#455a54]'>
          {row.getValue('description')}
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='text-[#455a54] font-winter-solid hover:text-[#9d684e]'
          >
            Monto
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const amount = row.getValue('amount') as number | undefined;

        if (amount === undefined || amount === null) {
          return <div className='text-[#455a54]/50 text-sm'>-</div>;
        }

        const formatted = new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
        }).format(amount);

        const type = row.getValue('type') as ActivityType;
        const isNegative = type === 'egreso' || amount < 0;

        return (
          <div
            className={`font-medium ${
              isNegative ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {isNegative && amount > 0 ? '-' : ''}
            {formatted}
          </div>
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
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (isLoading) {
    return (
      <div className='w-full'>
        <div className='rounded-md border border-[#9d684e]/20'>
          <div className='p-8 text-center'>
            <div className='inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#9d684e] border-t-transparent'></div>
            <p className='mt-2 text-sm text-[#455a54]/70'>
              Cargando actividades...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full'>
      {!compact && (
        <div className='flex items-center py-4 space-x-4'>
          <Input
            placeholder='Buscar por descripción...'
            value={
              (table.getColumn('description')?.getFilterValue() as string) ?? ''
            }
            onChange={(event) =>
              table.getColumn('description')?.setFilterValue(event.target.value)
            }
            className='max-w-sm border-[#9d684e]/20 focus:border-[#9d684e]'
          />
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
                  const columnLabels: Record<string, string> = {
                    date: 'Fecha',
                    type: 'Tipo',
                    description: 'Descripción',
                    amount: 'Monto',
                  };

                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className='hover:bg-[#efcbb9]/30'
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {columnLabels[column.id] || column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

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
                  No se encontraron actividades.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!compact && (
        <div className='flex items-center justify-end space-x-2 py-4'>
          <div className='flex-1 text-sm text-[#455a54]/70'>
            Mostrando {table.getRowModel().rows.length} de{' '}
            {table.getFilteredRowModel().rows.length} actividad(es).
          </div>
          <div className='space-x-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30'
            >
              Anterior
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30'
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
