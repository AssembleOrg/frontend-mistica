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
  X,
  Receipt,
  Pencil,
  Link2,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSpinner } from '@/components/ui/loading-skeletons';
import { Skeleton } from '@/components/ui/skeleton';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TableFilters, FilterOption } from '@/components/ui/table-filters';
import { Sale, salesService } from '@/services/sales.service';
import { showToast } from '@/lib/toast';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface SalesTableProps {
  data: Sale[];
  isLoading?: boolean;
  selectedSaleId?: string;
  isPanelOpen?: boolean;
  onViewSale?: (sale: Sale) => void;
  onEditSale?: (sale: Sale) => void;
  onDeleteSale?: (saleId: string) => void;
  onCancelSale?: (saleId: string) => void;
  onViewReceipt?: (sale: Sale) => void;
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
  paymentMethodFilter?: string;
  onPaymentMethodFilterChange?: (value: string) => void;
  onRefresh?: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function SalesTable({
  data,
  isLoading,
  selectedSaleId,
  isPanelOpen = false,
  onViewSale,
  onEditSale,
  onDeleteSale,
  onCancelSale,
  onViewReceipt,
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
  statusFilter = "",
  onStatusFilterChange,
  paymentMethodFilter = "all",
  onPaymentMethodFilterChange,
  onRefresh,
  searchInputRef,
}: SalesTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    // "Detalles" arranca oculta. Sigue disponible desde el botón "Columnas".
    details: false,
  });
  const [rowSelection, setRowSelection] = React.useState({});

  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Edición inline del nombre amigable de la venta.
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const cancelNameEditRef = React.useRef(false);
  // Overrides optimistas mientras llega el refresh con el dato actualizado.
  const [optimisticNames, setOptimisticNames] = useState<Record<string, string | null>>({});

  const startEditName = React.useCallback((id: string, currentName: string | null | undefined) => {
    cancelNameEditRef.current = false;
    setNameDraft(currentName ?? '');
    setEditingNameId(id);
  }, []);

  const saveNameEdit = React.useCallback(async (id: string) => {
    if (cancelNameEditRef.current) {
      cancelNameEditRef.current = false;
      setEditingNameId(null);
      return;
    }
    const value = nameDraft.trim();
    setEditingNameId(null);
    setOptimisticNames((prev) => ({ ...prev, [id]: value || null }));
    try {
      await salesService.updateSaleName(id, value);
      onRefresh?.();
    } catch (err) {
      console.error(err);
      showToast.error('No se pudo renombrar la venta');
      setOptimisticNames((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, [nameDraft, onRefresh]);

  // Status options for filter
  const statusOptions: FilterOption[] = [
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'COMPLETED', label: 'Completada' },
    { value: 'CANCELLED', label: 'Cancelada' },
  ];

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
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      CASH: 'EFE',
      CARD: 'TAR',
      TRANSFER: 'MP',
    };
    return labels[method] ?? method;
  };

  const getSalePaymentLabel = (sale: Sale) => {
    const payments = sale.payments ?? [];
    if (payments.length > 1) {
      return payments.map(p => getPaymentMethodLabel(p.method)).join('+');
    }
    if (payments.length === 1) return getPaymentMethodLabel(payments[0].method);
    return '—';
  };

  const getStatusBadge = (status: string) => {
    const labels = {
      COMPLETED: 'Completada',
      PENDING: 'Pendiente',
      // PARTIAL = venta con saldo pendiente. De cara al usuario lo llamamos
      // "Seña" (aún falta abonar el resto); el estado interno sigue siendo PARTIAL.
      PARTIAL: 'Seña',
      CANCELLED: 'Cancelada',
    };

    const getStatusStyles = (status: string) => {
      switch (status) {
        case 'COMPLETED':
          return 'bg-[#455a54]/10 text-[#455a54] border-[#455a54]/30';
        case 'PENDING':
          return 'bg-[#cc844a]/10 text-[#cc844a] border-[#cc844a]/30';
        case 'PARTIAL':
          // Naranja medio: distinguible de PENDING (que ya usa cc844a), y
          // semánticamente "en curso" / saldo abierto.
          return '';
        case 'CANCELLED':
          return 'bg-[#4e4247]/10 text-[#4e4247] border-[#4e4247]/30';
        default:
          return 'bg-[#455a54]/5 text-[#455a54]/60 border-[#455a54]/20';
      }
    };

    // PARTIAL usa estilos inline para tomar exactamente var(--color-naranja-medio).
    if (status === 'PARTIAL') {
      return (
        <Badge
          variant="outline"
          className="font-winter-solid border"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-naranja-medio) 12%, white)',
            borderColor: 'color-mix(in srgb, var(--color-naranja-medio) 40%, white)',
            color: 'var(--color-naranja-medio)',
          }}
        >
          {labels.PARTIAL}
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className={`${getStatusStyles(status)} font-winter-solid`}
      >
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const handleAction = async (saleId: string, action: 'view' | 'edit' | 'delete' | 'cancel' | 'receipt') => {
    setActionLoading((prev) => ({ ...prev, [saleId]: true }));

    try {
      const sale = data.find(s => s.id === saleId);
      if (!sale) return;

      if (action === 'view') {
        onViewSale?.(sale);
      } else if (action === 'edit') {
        if (sale.status === 'COMPLETED') {
          showToast.error('Error', 'No se puede editar una venta completada.');
          return;
        }
        onEditSale?.(sale);
      } else if (action === 'delete') {
        if (confirm('¿Estás seguro de que quieres eliminar esta venta?')) {
          onDeleteSale?.(saleId);
        }
      } else if (action === 'cancel') {
        if (sale.status !== 'PENDING') {
          showToast.error('Error', 'Solo se pueden cancelar ventas pendientes.');
          return;
        }
        setSaleToCancel(saleId);
        setShowCancelDialog(true);
        return; // No continuar con la ejecución aquí
      } else if (action === 'receipt') {
        // Comprobante NO fiscal: disponible para ventas completadas y pendientes
        // (incluye las pendientes con saldo, ex-"señas"). La factura AFIP sigue
        // siendo solo de completadas.
        if (sale.status !== 'COMPLETED' && sale.status !== 'PENDING') {
          showToast.error('Error', 'Solo se puede ver el comprobante de ventas completadas o pendientes.');
          return;
        }
        onViewReceipt?.(sale);
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      showToast.error(
        'Error',
        `Error al ${action === 'delete' ? 'eliminar' : action === 'cancel' ? 'cancelar' : 'procesar'} la venta.`
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, [saleId]: false }));
    }
  };

  const handleConfirmCancel = async () => {
    if (!saleToCancel) return;
    
    setActionLoading((prev) => ({ ...prev, [saleToCancel]: true }));
    try {
      onCancelSale?.(saleToCancel);
    } catch (error) {
      console.error('Error cancelling sale:', error);
      showToast.error('Error', 'Error al cancelar la venta.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [saleToCancel]: false }));
      setShowCancelDialog(false);
      setSaleToCancel(null);
    }
  };

  const handleCancelDialog = () => {
    setShowCancelDialog(false);
    setSaleToCancel(null);
  };

  const handleClearFilters = () => {
    onSearchChange?.("");
    onDateRangeChange?.(undefined);
    onStatusFilterChange?.("all");
    onPaymentMethodFilterChange?.("all");
    table.resetColumnFilters();
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
          className='border-white data-[state=checked]:bg-white data-[state=checked]:text-[#9d684e] data-[state=checked]:border-white'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label='Seleccionar fila'
          className='border-[#455a54]/50 data-[state=checked]:bg-[#455a54] data-[state=checked]:border-[#455a54] data-[state=checked]:text-white'
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'saleNumber',
      enableSorting: false,
      header: () => (
        <span className='text-white font-winter-solid px-1'>N° Venta</span>
      ),
      cell: ({ row }) => {
        const hasRelated = (row.original.relatedSaleIds?.length ?? 0) > 0;
        return (
          <div className='flex items-center gap-1 max-w-[120px]'>
            <span className='font-semibold text-[#455a54] text-xs truncate'>
              {row.getValue('saleNumber')}
            </span>
            {hasRelated && (
              <Link2
                className='h-3 w-3 text-[#9d684e] shrink-0'
                aria-label='Tiene ventas relacionadas'
              />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className='text-white font-winter-solid hover:text-white/80 hover:bg-transparent px-1'
        >
          Nombre
          <ArrowUpDown className='ml-1.5 h-3.5 w-3.5' />
        </Button>
      ),
      cell: ({ row }) => {
        const sale = row.original;
        const optimistic = optimisticNames[sale.id];
        const currentName = optimistic !== undefined ? optimistic : (sale.name ?? null);

        if (editingNameId === sale.id) {
          return (
            <Input
              autoFocus
              value={nameDraft}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.currentTarget.blur();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelNameEditRef.current = true;
                  e.currentTarget.blur();
                }
              }}
              onBlur={() => saveNameEdit(sale.id)}
              className='h-7 text-sm max-w-[180px]'
              placeholder='Nombre…'
            />
          );
        }

        return (
          <div className='flex items-center gap-1.5 max-w-[180px] group'>
            <span
              className={`font-winter-solid text-sm truncate ${
                currentName ? 'text-[#455a54]' : 'text-[#455a54]/40'
              }`}
            >
              {currentName || '-'}
            </span>
            <button
              type='button'
              title='Renombrar venta'
              onClick={(e) => {
                e.stopPropagation();
                startEditName(sale.id, currentName);
              }}
              className='opacity-30 hover:opacity-100 transition-opacity flex-shrink-0'
            >
              <Pencil className='h-3.5 w-3.5 text-[#455a54]' />
            </button>
          </div>
        );
      },
    },
    {
      accessorKey: 'customerName',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='text-white font-winter-solid hover:text-white/80 hover:bg-transparent'
          >
            Cliente
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const sale = row.original;
        return (
          <div className='max-w-[130px]'>
            <div className='font-semibold text-[#455a54] tracking-tight truncate'>{sale.customerName}</div>
            {/* {sale.customerEmail && (
              <div className='text-sm text-gray-500'>{sale.customerEmail}</div>
            )}
            {sale.customerPhone && (
              <div className='text-sm text-gray-500'>{sale.customerPhone}</div>
            )} */}
          </div>
        );
      },
    },
    {
      accessorKey: 'items',
      header: 'Productos',
      meta: { compactHide: true },
      cell: ({ row }) => {
        const items = row.getValue('items') as Sale['items'];
        return (
          <div className='max-w-xs'>
            <div className='text-sm font-semibold text-[#455a54]'>
              {items.length} producto{items.length !== 1 ? 's' : ''}
            </div>
            <div className='text-[11px] font-medium text-[#455a54]/70 truncate'>
              {items.slice(0, 2).map(item => item.productName).join(', ')}
              {items.length > 2 && ` +${items.length - 2} más`}
            </div>
          </div>
        );
      },
    },
    {
      id: 'details',
      header: 'Detalles',
      meta: { compactHide: true },
      cell: ({ row }) => {
        const sale = row.original;
        const hasDiscount = typeof sale.discount === 'number' && sale.discount > 0;
        const hasPrepaid = typeof sale.prepaidUsed === 'number' && sale.prepaidUsed > 0;
        
        return (
          <div className='text-xs space-y-1 min-w-[120px]'>
            <div className='font-semibold text-[#455a54]'>
              Subtotal: {formatCurrency(sale.subtotal)}
            </div>
            {(hasDiscount || hasPrepaid) ? (
              <div className='font-medium text-[#455a54]/70'>
                {hasDiscount && 'Con descuento'}
                {hasDiscount && hasPrepaid && ' • '}
                {hasPrepaid && 'Con seña'}
              </div>
            ) : (
              <div className='font-medium text-[#455a54]/60'>
                Sin descuentos
              </div>
            )}
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
            className='text-white font-winter-solid hover:text-white/80 hover:bg-transparent'
          >
            Total
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('total'));
        return <div className='font-semibold text-[#9d684e] max-w-[90px] truncate'>{formatCurrency(amount)}</div>;
      },
    },
    {
      accessorKey: 'paymentMethod',
      header: 'Pago',
      meta: { compactHide: true },
      cell: ({ row }) => {
        return (
          <div className='font-semibold text-[#455a54] text-xs tracking-wide'>
            {getSalePaymentLabel(row.original)}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      meta: { compactHide: true },
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return getStatusBadge(status);
      },
    },
    {
      accessorKey: 'createdAt',
      meta: { compactHide: true },
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='text-white font-winter-solid hover:text-white/80 hover:bg-transparent'
          >
            Fecha
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = row.getValue('createdAt') as string;
        return <div className='text-sm font-semibold text-[#455a54]'>{formatDate(date)}</div>;
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const sale = row.original;
        const isActionLoading = actionLoading[sale.id] || false;
        const isCompleted = sale.status === 'COMPLETED';
        const isPending = sale.status === 'PENDING';

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
              
              {(isCompleted || isPending) && (
                <DropdownMenuItem
                  className='hover:bg-[#efcbb9]/30 text-[#455a54]'
                  onClick={() => handleAction(sale.id, 'receipt')}
                  disabled={isActionLoading}
                >
                  <Receipt className='mr-2 h-4 w-4' />
                  Ver comprobante
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className={`hover:bg-[#efcbb9]/30 ${isCompleted ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handleAction(sale.id, 'edit')}
                disabled={isActionLoading || isCompleted}
              >
                <Edit className='mr-2 h-4 w-4' />
                Editar venta
                {isCompleted && <span className='ml-2 text-xs text-[#455a54]/40'>(Bloqueado)</span>}
              </DropdownMenuItem>
              {isPending && (
                <DropdownMenuItem
                  className='hover:bg-[#cc844a]/15 text-[#a8632e] font-medium'
                  onClick={() => handleAction(sale.id, 'cancel')}
                  disabled={isActionLoading}
                >
                  <X className='mr-2 h-4 w-4' />
                  Cancelar comanda
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className='hover:bg-[#4e4247]/10 text-[#4e4247]'
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

  // Sólo mostramos skeleton de filas en la carga inicial (sin datos todavía).
  // En recargas por búsqueda/filtro mantenemos la tabla y los filtros montados
  // para no desmontar el input (perder foco) mientras el usuario tipea.
  const isInitialLoading = isLoading && data.length === 0;

  return (
    <div className='w-full px-4 pb-4 pt-3'>
      {/* Table Filters */}
      <TableFilters
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar por nombre..."
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
        statusValue={statusFilter}
        onStatusChange={onStatusFilterChange}
        statusOptions={statusOptions}
        customFilters={[{
          key: 'paymentMethod',
          label: 'Método de pago',
          value: paymentMethodFilter,
          options: [
            { value: 'CASH',     label: 'Efectivo' },
            { value: 'CARD',     label: 'Tarjeta' },
            { value: 'TRANSFER', label: 'Transferencia' },
            { value: 'MIXED',    label: 'Mixto' },
          ],
          onChange: onPaymentMethodFilterChange ?? (() => {}),
        }]}
        onClearFilters={handleClearFilters}
        onRefresh={onRefresh}
        showAdvancedFilters={showAdvancedFilters}
        onToggleAdvanced={() => setShowAdvancedFilters(!showAdvancedFilters)}
        isLoading={isLoading}
        searchInputRef={searchInputRef}
        showKbdHint
      />

      {/* Column visibility controls — compact, alineado a la derecha */}
      <div className='flex items-center justify-end gap-3 py-2'>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-black/55 font-winter-solid">
          <kbd className="px-1 py-0.5 bg-[#455a54]/10 border border-[#455a54]/25 rounded text-[10px] leading-none text-[#455a54]">↑</kbd>
          <kbd className="px-1 py-0.5 bg-[#455a54]/10 border border-[#455a54]/25 rounded text-[10px] leading-none text-[#455a54]">↓</kbd>
          <span>navegar filas</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className='h-8 px-3 text-xs text-white bg-[#9d684e] hover:bg-[#9d684e]/90 font-winter-solid border-0'
            >
              Columnas <ChevronDown className='ml-1.5 h-3 w-3' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='text-xs'>
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className='hover:bg-[#efcbb9]/30 capitalize text-[#455a54] text-xs font-winter-solid'
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
      <div className={`rounded-md border-2 border-[#455a54]/40 bg-white overflow-hidden transition-opacity ${
        isLoading && !isInitialLoading ? 'opacity-60' : ''
      }`}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className='bg-[#9d684e] hover:bg-[#9d684e] border-b border-[#9d684e]'
              >
                {headerGroup.headers.map((header) => {
                  const compactHide = (header.column.columnDef.meta as { compactHide?: boolean } | undefined)?.compactHide;
                  const hideClass = compactHide && isPanelOpen ? 'max-xl:hidden' : '';
                  return (
                    <TableHead
                      key={header.id}
                      className={`text-white font-medium tracking-wide text-xs uppercase font-winter-solid ${hideClass}`}
                    >
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
            {isInitialLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className='border-b border-[#455a54]/8'>
                  <TableCell colSpan={columns.length} className='py-2'>
                    <Skeleton className='h-8 w-full rounded-md bg-[#efcbb9]/30' />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const isSelected = row.original.id === selectedSaleId;
                return (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => onViewSale?.(row.original)}
                  className={`cursor-pointer transition-colors border-b border-[#455a54]/8 ${
                    isSelected
                      ? 'bg-[#455a54]/10'
                      : 'bg-white hover:bg-[#455a54]/5'
                  }`}
                >
                  {row.getVisibleCells().map((cell) => {
                    const compactHide = (cell.column.columnDef.meta as { compactHide?: boolean } | undefined)?.compactHide;
                    const hideClass = compactHide && isPanelOpen ? 'max-xl:hidden' : '';
                    return (
                      <TableCell key={cell.id} className={hideClass}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
                );
              })
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

      {/* Modal de confirmación para cancelar */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-tan-nimbus text-[#455a54]">
              Cancelar Venta
            </DialogTitle>
            <DialogDescription className="font-winter-solid text-[#455a54]/70">
              ¿Estás seguro de que quieres cancelar esta venta? Esta acción cambiará el estado de la venta a "Cancelada".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={handleCancelDialog}
              className="border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30 font-winter-solid"
            >
              No, mantener
            </Button>
            <Button
              onClick={handleConfirmCancel}
              disabled={actionLoading[saleToCancel || ''] || false}
              className="bg-[#cc844a] hover:bg-[#cc844a]/90 text-white font-winter-solid"
            >
              {actionLoading[saleToCancel || ''] ? 'Cancelando...' : 'Sí, cancelar venta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
