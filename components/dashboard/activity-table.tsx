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
import { EmptyState } from '@/components/ui/empty-state';
import { History } from 'lucide-react';

// Activity type configuration for badges - EXPANDED
const activityTypeConfig: Record<
  ActivityType,
  { label: string; color: string; bgColor: string }
> = {
  // Financial
  ingreso: { label: 'Ingreso', color: '#10b981', bgColor: '#10b981/10' },
  egreso: { label: 'Egreso', color: '#ef4444', bgColor: '#ef4444/10' },
  
  // Product Management
  cambio_producto: { label: 'Cambio Producto', color: '#6366f1', bgColor: '#6366f1/10' },
  cambio_precio: { label: 'Cambio Precio', color: '#f59e0b', bgColor: '#f59e0b/10' },
  producto_creado: { label: 'Producto Creado', color: '#10b981', bgColor: '#10b981/10' },
  producto_editado: { label: 'Producto Editado', color: '#3b82f6', bgColor: '#3b82f6/10' },
  producto_eliminado: { label: 'Producto Eliminado', color: '#ef4444', bgColor: '#ef4444/10' },
  
  // Stock Management
  ajuste_stock: { label: 'Ajuste Stock', color: '#8b5cf6', bgColor: '#8b5cf6/10' },
  stock_entrada: { label: 'Stock Entrada', color: '#10b981', bgColor: '#10b981/10' },
  stock_salida: { label: 'Stock Salida', color: '#f59e0b', bgColor: '#f59e0b/10' },
  
  // Employee Management
  empleado_creado: { label: 'Empleado Creado', color: '#10b981', bgColor: '#10b981/10' },
  empleado_editado: { label: 'Empleado Editado', color: '#3b82f6', bgColor: '#3b82f6/10' },
  empleado_eliminado: { label: 'Empleado Eliminado', color: '#ef4444', bgColor: '#ef4444/10' },
  
  // Sales & Service
  venta_realizada: { label: 'Venta Realizada', color: '#10b981', bgColor: '#10b981/10' },
  venta_asignada: { label: 'Venta Asignada', color: '#3b82f6', bgColor: '#3b82f6/10' },
  servicio_iniciado: { label: 'Servicio Iniciado', color: '#3b82f6', bgColor: '#3b82f6/10' },
  servicio_cerrado: { label: 'Servicio Cerrado', color: '#10b981', bgColor: '#10b981/10' },
  
  // Authentication & Security
  login: { label: 'Login', color: '#10b981', bgColor: '#10b981/10' },
  logout: { label: 'Logout', color: '#6b7280', bgColor: '#6b7280/10' },
  acceso_denegado: { label: 'Acceso Denegado', color: '#ef4444', bgColor: '#ef4444/10' },
  
  // General
  otro: { label: 'Otro', color: '#6b7280', bgColor: '#6b7280/10' },
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
            className='h-9 px-2 text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid hover:text-[#9d684e] hover:bg-transparent'
          >
            Fecha
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = row.getValue('date') as Date;
        const formatted = new Intl.DateTimeFormat('es-AR', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(date);

        return <div className='text-[13px] text-[#455a54]/80 font-winter-solid tabular-nums'>{formatted}</div>;
      },
    },
    {
      accessorKey: 'type',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='h-9 px-2 text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid hover:text-[#9d684e] hover:bg-transparent'
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
          <span
            className='inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-winter-solid'
            style={{
              color: config.color,
              backgroundColor: config.bgColor,
            }}
          >
            {config.label}
          </span>
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
            className='h-9 px-2 text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid hover:text-[#9d684e] hover:bg-transparent'
          >
            Descripción
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className='max-w-[300px] truncate text-[13px] text-[#455a54]/85 font-winter-solid'>
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
            className='h-9 px-2 text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid hover:text-[#9d684e] hover:bg-transparent'
          >
            Monto
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const amount = row.getValue('amount') as number | undefined;

        if (amount === undefined || amount === null) {
          return <div className='text-[#455a54]/35 text-[13px]'>—</div>;
        }

        const formatted = new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
        }).format(amount);

        const type = row.getValue('type') as ActivityType;
        const isNegative = type === 'egreso' || amount < 0;

        return (
          <div
            className={`text-[13px] font-tan-nimbus tabular-nums ${
              isNegative ? 'text-[#9d684e]' : 'text-[#455a54]'
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

  // Group rows by day for the visible page
  const visibleRows = table.getRowModel().rows;
  const groupedByDay: { label: string; rows: typeof visibleRows }[] = [];
  if (visibleRows.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const labelFor = (d: Date) => {
      const day = new Date(d);
      day.setHours(0, 0, 0, 0);
      if (day.getTime() === today.getTime()) return 'Hoy';
      if (day.getTime() === yesterday.getTime()) return 'Ayer';
      return new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(day);
    };

    let currentLabel: string | null = null;
    for (const row of visibleRows) {
      const date = row.getValue('date') as Date;
      const label = labelFor(date);
      if (label !== currentLabel) {
        groupedByDay.push({ label, rows: [] });
        currentLabel = label;
      }
      groupedByDay[groupedByDay.length - 1].rows.push(row);
    }
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

      <div className='rounded-lg border border-[#9d684e]/15 overflow-hidden'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className='border-[#9d684e]/12 hover:bg-transparent'
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
            {visibleRows.length ? (
              groupedByDay.map((group) => (
                <React.Fragment key={group.label}>
                  <TableRow className='bg-[#efcbb9]/20 hover:bg-[#efcbb9]/20 border-[#9d684e]/12'>
                    <TableCell
                      colSpan={columns.length}
                      className='py-1.5 px-3 text-[10px] uppercase tracking-wider font-winter-solid text-[#455a54]/55'
                    >
                      {group.label}
                    </TableCell>
                  </TableRow>
                  {group.rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className='border-[#9d684e]/12 hover:bg-[#efcbb9]/15'
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className='py-2.5'>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='py-8'>
                  <EmptyState
                    variant='compact'
                    icon={History}
                    title='Todavía no hay actividad registrada en esta sesión'
                    description='Las acciones que hagas en la app van a aparecer acá. El historial es local y se guarda en el navegador.'
                  />
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
