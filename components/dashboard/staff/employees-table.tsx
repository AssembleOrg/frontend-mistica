'use client';

import * as React from 'react';
import { useState } from 'react';
import { DateRange } from 'react-day-picker';
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
  Edit,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSpinner } from '@/components/ui/loading-skeletons';
import { TableFilters, FilterOption } from '@/components/ui/table-filters';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { Employee } from '@/lib/types';
import { showToast } from '@/lib/toast';
import { useEmployees } from '@/hooks/useEmployees';
import { useRouter } from 'next/navigation';

interface EmployeesTableProps {
  data: Employee[];
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
  roleFilter?: string;
  onRoleFilterChange?: (role: string) => void;
  onRefresh?: () => void;
}

const roleConfig = {
  gerente: { label: 'Gerente', color: '#9d684e', bgColor: '#9d684e/10' },
  cajero: { label: 'Cajero', color: '#e0a38d', bgColor: '#e0a38d/10' },
  mozo: { label: 'Mozo', color: '#455a54', bgColor: '#455a54/10' }
};

export function EmployeesTable({ 
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
  roleFilter = "all",
  onRoleFilterChange,
  onRefresh,
}: EmployeesTableProps) {
  const router = useRouter();
  const { deleteEmployee } = useEmployees();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Role options for filter
  const roleOptions: FilterOption[] = [
    { value: 'gerente', label: 'Gerente' },
    { value: 'cajero', label: 'Cajero' },
    { value: 'mozo', label: 'Mozo' },
  ];

  const handleClearFilters = () => {
    onSearchChange?.("");
    onDateRangeChange?.(undefined);
    onRoleFilterChange?.("all");
    table.resetColumnFilters();
  };

  const handleAction = async (employeeId: string, action: 'edit' | 'delete') => {
    setActionLoading((prev) => ({ ...prev, [employeeId]: true }));

    try {
      if (action === 'edit') {
        router.push(`/dashboard/staff/${employeeId}`);
        return;
      }

      if (action === 'delete') {
        await deleteEmployee(employeeId);
        showToast.success('Empleado eliminado', 'El empleado ha sido eliminado correctamente.');
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      showToast.error(
        'Error',
        `Error al ${action === 'delete' ? 'eliminar' : 'procesar'} el empleado.`
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, [employeeId]: false }));
    }
  };

  const columns: ColumnDef<Employee>[] = [
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
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='text-[#455a54] font-winter-solid hover:text-[#9d684e]'
          >
            Empleado
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className='font-medium text-[#455a54]'>{row.getValue('name')}</div>
      ),
    },
    {
      accessorKey: 'email',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='text-[#455a54] font-winter-solid hover:text-[#9d684e]'
          >
            Email
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className='text-[#455a54] text-sm'>{row.getValue('email')}</div>
      ),
    },
    {
      accessorKey: 'role',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='text-[#455a54] font-winter-solid hover:text-[#9d684e]'
          >
            Rol
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const role = row.getValue('role') as Employee['role'];
        const config = roleConfig[role];
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
      accessorKey: 'phone',
      header: 'Teléfono',
      cell: ({ row }) => {
        const phone = row.getValue('phone') as string;
        return phone ? (
          <div className='text-[#455a54] text-sm'>{phone}</div>
        ) : (
          <div className='text-[#455a54]/50 text-sm'>-</div>
        );
      },
    },
    {
      accessorKey: 'startDate',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='text-[#455a54] font-winter-solid hover:text-[#9d684e]'
          >
            Fecha Ingreso
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = row.getValue('startDate') as Date;
        return (
          <div className='text-[#455a54] text-sm'>
            {new Date(date).toLocaleDateString('es-AR')}
          </div>
        );
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const employee = row.original;
        const isActionLoading = actionLoading[employee.id] || false;

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
                onClick={() => handleAction(employee.id, 'edit')}
                disabled={isActionLoading}
              >
                <Edit className='mr-2 h-4 w-4' />
                Editar empleado
              </DropdownMenuItem>
              <DropdownMenuItem
                className='hover:bg-red-50 text-red-600'
                onClick={() => handleAction(employee.id, 'delete')}
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
    getPaginationRowModel: getPaginationRowModel(),
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

  return (
    <div className="space-y-4">
      <TableFilters
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar empleados por nombre o email..."
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
        customFilters={[
          {
            key: 'role',
            label: 'Rol',
            value: roleFilter || 'all',
            options: [{ value: 'all', label: 'Todos los roles' }, ...roleOptions],
            onChange: onRoleFilterChange || (() => {}),
          },
        ]}
        onClearFilters={handleClearFilters}
        onRefresh={onRefresh || (() => window.location.reload())}
        showAdvancedFilters={showAdvancedFilters}
        onToggleAdvanced={() => setShowAdvancedFilters(!showAdvancedFilters)}
      />

    <div className='w-full'>
      <div className='flex items-center py-4'>
        <div className='ml-auto'>
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
                  No se encontraron empleados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className='flex items-center justify-end space-x-2 py-4'>
        <div className='flex-1 text-sm text-[#455a54]/70'>
          {table.getFilteredSelectedRowModel().rows.length} de{' '}
          {table.getFilteredRowModel().rows.length} fila(s) seleccionadas.
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
    </div>
    </div>
  );
}