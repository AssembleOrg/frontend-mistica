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

import { DateRange } from 'react-day-picker';
import { useState } from 'react';
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
import { getCategoryStyle } from '@/lib/config';
import { calculateProfitMargin } from '@/lib/barcode-utils';
import { exportProductsToExcel, getExportSummary } from '@/lib/excel-utils';
import { showToast } from '@/lib/toast';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useRouter } from 'next/navigation';
import { StockAdjustmentModal } from '@/components/dashboard/stock/stock-adjustment-modal';
import { useProducts } from '@/hooks/useProducts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProductsTableProps {
  data: Product[];
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
  categoryFilter?: string;
  onCategoryFilterChange?: (category: string) => void;
  onRefresh?: () => void;
}

export function ProductsTable({ 
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
  categoryFilter = "",
  onCategoryFilterChange,
  onRefresh,
}: ProductsTableProps) {
  const router = useRouter();
  const { deleteProduct } = useProducts();
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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);

  // Category options for filter
  const categoryOptions: FilterOption[] = [
    { value: 'all', label: 'Todas las categorías' },
    { value: 'organicos', label: 'Orgánicos' },
    { value: 'aromaticos', label: 'Aromáticos' },
    { value: 'wellness', label: 'Wellness' },
  ];

  const handleClearFilters = () => {
    onSearchChange?.("");
    onDateRangeChange?.(undefined);
    onCategoryFilterChange?.("all");
    table.resetColumnFilters();
  };
  const [stockAdjustmentModal, setStockAdjustmentModal] = useState<{
    isOpen: boolean;
    product: Product | null;
  }>({
    isOpen: false,
    product: null,
  });

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const product = deleteConfirm;
    setDeleteConfirm(null);
    setActionLoading((prev) => ({ ...prev, [product.id]: true }));
    try {
      await deleteProduct(product.id);
      showToast.success('Producto eliminado', `"${product.name}" fue eliminado.`);
      onRefresh?.();
    } catch {
      showToast.error('Error', 'No se pudo eliminar el producto.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  const handleAction = async (productId: string, action: 'edit' | 'delete') => {
    if (action === 'edit') {
      router.push(`/dashboard/products/${productId}/edit`);
      return;
    }
    if (action === 'delete') {
      const product = data.find(p => p.id === productId);
      if (product) setDeleteConfirm(product);
      return;
    }
    setActionLoading((prev) => ({ ...prev, [productId]: true }));
    try {
      // placeholder for future actions
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

  const handleOpenStockAdjustment = (product: Product) => {
    setStockAdjustmentModal({
      isOpen: true,
      product: product,
    });
  };

  const handleCloseStockAdjustment = () => {
    setStockAdjustmentModal({
      isOpen: false,
      product: null,
    });
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
        const category = row.getValue('category') as string | undefined;
        if (!category) return <span className='text-[#455a54]/40 text-xs'>—</span>;
        const config = getCategoryStyle(category);
        return (
          <div
            className='inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'
            style={{ color: config.color, backgroundColor: config.bgColor }}
          >
            {config.label === '—' ? category : config.label}
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
            className={`font-medium tabular-nums ${
              margin < 20
                ? 'text-[#4e4247]'
                : margin < 50
                ? 'text-[#cc844a]'
                : 'text-[#455a54]'
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
        const unitLabel = unitOfMeasure
          ? ({ gramo: 'g', litro: 'L', unidad: 'u' }[unitOfMeasure] ?? unitOfMeasure)
          : '';

        return (
          <div className="flex items-center justify-between gap-2">
            <div
              className={`font-medium tabular-nums ${
                stock === 0
                  ? 'text-[#4e4247]'
                  : stock <= 10
                  ? 'text-[#cc844a]'
                  : 'text-[#455a54]'
              }`}
            >
              {stock} {unitLabel}
            </div>
            <Button
              size="sm"
              className="h-6 px-2 text-xs bg-[#9d684e]/10 text-[#9d684e] hover:bg-[#9d684e]/20 border-0 shadow-none"
              onClick={() => handleOpenStockAdjustment(row.original)}
            >
              Ajustar
            </Button>
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
                className='text-[#4e4247] hover:bg-[#4e4247]/8'
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
    <div className="space-y-4">
      <TableFilters
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar por nombre o código de barras..."
        showDateFilter={false}
        customFilters={[
          {
            key: 'category',
            label: 'Categoría',
            value: categoryFilter || 'all',
            options: categoryOptions,
            onChange: onCategoryFilterChange || (() => {}),
          },
        ]}
        onClearFilters={handleClearFilters}
        onRefresh={() => window.location.reload()}
        showAdvancedFilters={showAdvancedFilters}
        onToggleAdvanced={() => setShowAdvancedFilters(!showAdvancedFilters)}
      />
      
      <div className='flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4'>
        <div className='flex gap-2 w-full sm:w-auto sm:ml-auto'>
          <Button
            onClick={handleExportFiltered}
            disabled={isExporting || data.length === 0}
            variant='outline'
            className='flex-1 sm:flex-none border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30 touch-target text-xs sm:text-sm'
          >
            {isExporting ? (
              <>
                <LoadingSpinner size='sm' />
                <span className='ml-2 hidden sm:inline'>Exportando...</span>
                <span className='ml-2 sm:hidden'>...</span>
              </>
            ) : (
              <>
                <Download className='mr-1 sm:mr-2 h-4 w-4' />
                <span className='hidden sm:inline'>Exportar ({table.getFilteredRowModel().rows.length})</span>
                <span className='sm:hidden'>Exportar</span>
              </>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='outline'
                className='flex-1 sm:flex-none border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30 touch-target text-xs sm:text-sm'
              >
                <span className='hidden sm:inline'>Columnas</span>
                <span className='sm:hidden'>Col</span>
                <ChevronDown className='ml-1 sm:ml-2 h-4 w-4' />
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
      <div className='rounded-md border border-[#9d684e]/20 overflow-x-auto'>
        <Table className="min-w-full">
          <TableHeader className="bg-[#efcbb9]/20">
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
                    <TableCell key={cell.id} className="text-xs sm:text-sm py-2 sm:py-3">
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
                  className='h-24 text-center text-[#455a54]/70 text-sm'
                >
                  No se encontraron productos.
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
          currentPage={table.getState().pagination.pageIndex + 1}
          totalPages={table.getPageCount()}
          onPageChange={(page) => table.setPageIndex(page - 1)}
          isLoading={false}
          pageSize={table.getState().pagination.pageSize || 20}
          onPageSizeChange={(pageSize) => table.setPageSize(pageSize)}
          showPageSizeSelector={true}
          totalItems={table.getFilteredRowModel().rows.length}
        />
      </div>

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={stockAdjustmentModal.isOpen}
        onClose={handleCloseStockAdjustment}
        product={stockAdjustmentModal.product}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open: boolean) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className='w-[88vw] max-w-xs rounded-xl border-[#d9dadb] p-0 overflow-hidden'>
          <div className='h-1 w-full bg-[#4e4247]' />
          <div className='px-5 py-4'>
            <DialogHeader className='mb-4 text-left'>
              <div className='flex items-center gap-2 mb-1'>
                <Trash2 className='h-4 w-4 text-[#4e4247] shrink-0' />
                <DialogTitle className='text-sm font-bold text-[#455a54] font-tan-nimbus leading-none'>
                  Eliminar producto
                </DialogTitle>
              </div>
              <DialogDescription className='text-xs text-[#455a54]/60 font-winter-solid leading-relaxed'>
                <span className='font-semibold text-[#455a54]'>"{deleteConfirm?.name}"</span> será eliminado permanentemente y no podrá recuperarse.
              </DialogDescription>
            </DialogHeader>
            <div className='flex justify-end gap-2'>
              <Button
                variant='outline' size='sm'
                className='h-8 text-xs font-winter-solid border-[#d9dadb] text-[#455a54]'
                onClick={() => setDeleteConfirm(null)}
              >
                Cancelar
              </Button>
              <Button
                size='sm'
                className='h-8 text-xs font-winter-solid bg-[#4e4247] hover:bg-[#4e4247]/90 text-white'
                onClick={handleConfirmDelete}
              >
                Eliminar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
