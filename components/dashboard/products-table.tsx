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
import { Product } from '@/lib/types';
import { categoryConfig, statusConfig } from '@/lib/mock-data';
import { calculateProfitMargin } from '@/lib/barcode-utils';
import { exportProductsToExcel, getExportSummary } from '@/lib/excel-utils';
import { showToast } from '@/lib/toast';
import { useRouter } from 'next/navigation';

interface ProductsTableProps {
  data: Product[];
  isLoading?: boolean;
}

export function ProductsTable({ data }: ProductsTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [isExporting, setIsExporting] = useState(false);

  const handleAction = async (productId: string, action: 'edit' | 'delete') => {
    setActionLoading((prev) => ({ ...prev, [productId]: true }));

    try {
      if (action === 'edit') {
        router.push(`/dashboard/products/${productId}/edit`);
        return;
      }

      if (action === 'delete') {
        // Simulate delete API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        showToast.success(
          'Producto eliminado',
          'El producto ha sido eliminado correctamente.'
        );
        // Here you would refresh the products list
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      showToast.error(
        'Error',
        `Error al ${action === 'delete' ? 'eliminar' : 'procesar'} el producto.`
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const handleExportFiltered = async () => {
    setIsExporting(true);

    try {
      // Obtener productos filtrados actuales
      const filteredRows = table.getFilteredRowModel().rows;
      const filteredProducts = filteredRows.map((row) => row.original);

      if (filteredProducts.length === 0) {
        showToast.error(
          'Sin productos',
          'No hay productos para exportar con los filtros actuales.'
        );
        return;
      }

      // Generar nombre de archivo descriptivo
      const today = new Date().toISOString().split('T')[0];
      const hasFilters = table.getState().columnFilters.length > 0;
      const filename = hasFilters
        ? `productos-filtrados-${today}.xlsx`
        : `productos-mistica-${today}.xlsx`;

      // Exportar
      exportProductsToExcel(filteredProducts, filename);

      // Mostrar resumen
      const summary = getExportSummary(filteredProducts);
      showToast.success(
        'Exportación exitosa',
        `Se exportaron ${summary.total} productos a Excel.`
      );
    } catch (error) {
      showToast.error(
        'Error al exportar',
        'Ocurrió un error al generar el archivo Excel.'
      );
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const columns: ColumnDef<Product>[] = [
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
            Producto
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className='font-medium text-[#455a54]'>{row.getValue('name')}</div>
      ),
    },
    {
      accessorKey: 'category',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='text-[#455a54] font-winter-solid hover:text-[#9d684e]'
          >
            Categoría
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const category = row.getValue('category') as Product['category'];
        const config = categoryConfig[category];
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
      accessorKey: 'barcode',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='text-[#455a54] font-winter-solid hover:text-[#9d684e]'
          >
            Código
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const barcode = row.getValue('barcode') as string;
        return (
          <div className='font-mono text-xs text-[#455a54] bg-gray-50 px-2 py-1 rounded border'>
            {barcode}
          </div>
        );
      },
    },
    {
      accessorKey: 'costPrice',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='text-[#455a54] font-winter-solid hover:text-[#9d684e]'
          >
            Costo
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('costPrice'));
        const formatted = new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
        }).format(amount);

        return <div className='font-medium text-[#455a54]'>{formatted}</div>;
      },
    },
    {
      accessorKey: 'price',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='text-[#455a54] font-winter-solid hover:text-[#9d684e]'
          >
            Venta
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('price'));
        const formatted = new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
        }).format(amount);

        return <div className='font-medium text-[#9d684e]'>{formatted}</div>;
      },
    },
    {
      id: 'profitMargin',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            className='text-[#455a54] font-winter-solid hover:text-[#9d684e]'
          >
            Margen
          </Button>
        );
      },
      cell: ({ row }) => {
        const price = parseFloat(row.getValue('price'));
        const costPrice = parseFloat(row.getValue('costPrice'));
        const margin = calculateProfitMargin(price, costPrice);

        return (
          <div
            className={`font-medium ${
              margin < 20
                ? 'text-red-500'
                : margin < 50
                ? 'text-orange-500'
                : 'text-green-600'
            }`}
          >
            {margin.toFixed(1)}%
          </div>
        );
      },
    },
    {
      accessorKey: 'stock',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='text-[#455a54] font-winter-solid hover:text-[#9d684e]'
          >
            Stock
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const stock = row.getValue('stock') as number;
        const unitOfMeasure = row.original.unitOfMeasure;
        const unitLabel =
          {
            gramo: 'g',
            litro: 'L',
          }[unitOfMeasure] || unitOfMeasure;

        return (
          <div
            className={`font-medium ${
              stock === 0
                ? 'text-red-500'
                : stock <= 10
                ? 'text-orange-500'
                : 'text-[#455a54]'
            }`}
          >
            {stock} {unitLabel}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='text-[#455a54] font-winter-solid hover:text-[#9d684e]'
          >
            Estado
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const status = row.getValue('status') as Product['status'];
        const config = statusConfig[status];
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
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const product = row.original;
        const isActionLoading = actionLoading[product.id] || false;

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
                onClick={() => {
                  navigator.clipboard.writeText(product.barcode);
                  showToast.success(
                    'Copiado',
                    'Código de barras copiado al portapapeles'
                  );
                }}
                className='hover:bg-[#efcbb9]/30'
                disabled={isActionLoading}
              >
                Copiar código de barras
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='hover:bg-[#efcbb9]/30'
                onClick={() => handleAction(product.id, 'edit')}
                disabled={isActionLoading}
              >
                <Edit className='mr-2 h-4 w-4' />
                Editar producto
              </DropdownMenuItem>
              <DropdownMenuItem
                className='hover:bg-red-50 text-red-600'
                onClick={() => handleAction(product.id, 'delete')}
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
    <div className='w-full'>
      <div className='flex items-center py-4'>
        <div className='flex gap-2'>
          <select
            value={
              (table.getColumn('category')?.getFilterValue() as string) ?? ''
            }
            onChange={(event) =>
              table
                .getColumn('category')
                ?.setFilterValue(event.target.value || undefined)
            }
            className='px-3 py-2 border border-[#9d684e]/20 rounded-md focus:border-[#9d684e] focus:outline-none max-w-sm'
          >
            <option value=''>Todas las categorías</option>
            <option value='organicos'>Orgánicos</option>
            <option value='aromaticos'>Aromáticos</option>
            <option value='wellness'>Wellness</option>
          </select>
        </div>
        <div className='ml-auto flex gap-2'>
          <Button
            onClick={handleExportFiltered}
            disabled={isExporting || data.length === 0}
            variant='outline'
            className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30'
          >
            {isExporting ? (
              <>
                <LoadingSpinner size='sm' />
                <span className='ml-2'>Exportando...</span>
              </>
            ) : (
              <>
                <Download className='mr-2 h-4 w-4' />
                Exportar ({table.getFilteredRowModel().rows.length})
              </>
            )}
          </Button>
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
                  No se encontraron productos.
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
  );
}
