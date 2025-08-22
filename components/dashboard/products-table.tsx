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
  Eye,
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
import { useResponsive } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProductsTableProps {
  data: Product[];
  isLoading?: boolean;
}

export function ProductsTable({ data }: ProductsTableProps) {
  const router = useRouter();
  const { isMobile, isTablet } = useResponsive();
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

  // Vista móvil con cards
  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
          <div className="text-lg font-winter-solid text-[#455a54]">
            Productos ({data.length})
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={() => router.push('/dashboard/products/add')}
              className="flex-1 sm:flex-none bg-[#9d684e] hover:bg-[#b17e65] text-white"
            >
              Agregar Producto
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsExporting(true)}
              disabled={isExporting}
              className="flex-1 sm:flex-none"
            >
              {isExporting ? <LoadingSpinner /> : <Download className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {data.map((product) => (
            <Card key={product.id} className="border-[#d9dadb] bg-white">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base font-winter-solid text-[#455a54] line-clamp-2">
                    {product.name}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/dashboard/products/${product.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAction(product.id, 'edit')}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleAction(product.id, 'delete')}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-[#455a54]">Precio:</span>
                    <div className="text-[#9d684e] font-semibold">
                      ${product.price.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-[#455a54]">Stock:</span>
                    <div className={`
                      font-semibold
                      ${product.stock <= 5 ? 'text-red-600' : 
                        product.stock <= 10 ? 'text-orange-600' : 'text-green-600'}
                    `}>
                      {product.stock} unidades
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-[#455a54]">Categoría:</span>
                    <div className="text-[#455a54]">
                      {categoryConfig[product.category]?.label || product.category}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-[#455a54]">Estado:</span>
                    <Badge 
                      variant={product.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {statusConfig[product.status]?.label || product.status}
                    </Badge>
                  </div>
                </div>
                
                {product.description && (
                  <div>
                    <span className="font-medium text-[#455a54] text-sm">Descripción:</span>
                    <div className="text-[#455a54] text-sm line-clamp-2 mt-1">
                      {product.description}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Vista tablet/desktop con tabla
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
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
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
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="font-winter-solid text-[#455a54] hover:bg-[#9d684e]/10"
          >
            Nombre
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-medium text-[#455a54] max-w-[200px] truncate">
          {row.getValue('name')}
        </div>
      ),
    },
    {
      accessorKey: 'price',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="font-winter-solid text-[#455a54] hover:bg-[#9d684e]/10"
          >
            Precio
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const price = parseFloat(row.getValue('price'));
        return (
          <div className="font-semibold text-[#9d684e]">
            ${price.toFixed(2)}
          </div>
        );
      },
    },
    {
      accessorKey: 'stock',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="font-winter-solid text-[#455a54] hover:bg-[#9d684e]/10"
          >
            Stock
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const stock = row.getValue('stock') as number;
        return (
          <div className={`
            font-semibold
            ${stock <= 5 ? 'text-red-600' : 
              stock <= 10 ? 'text-orange-600' : 'text-green-600'}
          `}>
            {stock} unidades
          </div>
        );
      },
    },
    {
      accessorKey: 'category',
      header: 'Categoría',
      cell: ({ row }) => {
        const category = row.getValue('category') as string;
        return (
          <div className="text-[#455a54]">
            {categoryConfig[category]?.label || category}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge variant={status === 'active' ? 'default' : 'secondary'}>
            {statusConfig[status]?.label || status}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const product = row.original;
        const isLoading = actionLoading[product.id];

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => router.push(`/dashboard/products/${product.id}`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleAction(product.id, 'edit')}
                disabled={isLoading}
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleAction(product.id, 'delete')}
                disabled={isLoading}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
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
    <div className="w-full">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
        <div className="text-xl font-winter-solid text-[#455a54]">
          Productos ({data.length})
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={() => router.push('/dashboard/products/add')}
            className="flex-1 sm:flex-none bg-[#9d684e] hover:bg-[#b17e65] text-white"
          >
            Agregar Producto
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsExporting(true)}
            disabled={isExporting}
            className="flex-1 sm:flex-none"
          >
            {isExporting ? <LoadingSpinner /> : <Download className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-[#d9dadb] bg-white">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <input
              placeholder="Filtrar productos..."
              value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
              onChange={(event) =>
                table.getColumn('name')?.setFilterValue(event.target.value)
              }
              className="max-w-sm px-3 py-2 border border-[#d9dadb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#9d684e] focus:border-transparent"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Columnas <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id === 'name' ? 'Nombre' :
                       column.id === 'price' ? 'Precio' :
                       column.id === 'stock' ? 'Stock' :
                       column.id === 'category' ? 'Categoría' :
                       column.id === 'status' ? 'Estado' : column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-[#f8f9fa]">
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className="text-[#455a54] font-winter-solid">
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
                    className="hover:bg-[#f8f9fa] transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-[#455a54]">
                    No se encontraron productos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-[#455a54]">
          {table.getFilteredSelectedRowModel().rows.length} de{' '}
          {table.getFilteredRowModel().rows.length} fila(s) seleccionada(s).
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
