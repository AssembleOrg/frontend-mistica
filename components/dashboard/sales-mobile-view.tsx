'use client';

import { Sale } from '@/services/sales.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, MoreHorizontal, Eye, Receipt, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency, getPrimaryPaymentMethod } from '@/lib/sales-calculations';
import { parseNotesAndSeller } from '@/lib/sales-seller';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TableFilters, FilterOption } from '@/components/ui/table-filters';
import { DateRange } from 'react-day-picker';

interface SalesMobileViewProps {
  sales: Sale[];
  onEdit?: (sale: Sale) => void;
  onDelete?: (saleId: string) => void;
  onView?: (sale: Sale) => void;
  onCancel?: (saleId: string) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

const paymentMethodLabels = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  MIXED: 'Mixto',
} as const;

const paymentMethodColors: Record<string, string> = {
  CASH: 'bg-[#455a54]/10 text-[#455a54] border-[#455a54]/20',
  CARD: 'bg-[#4e4247]/10 text-[#4e4247] border-[#4e4247]/20',
  TRANSFER: 'bg-[#cc844a]/10 text-[#cc844a] border-[#cc844a]/20',
  MIXED: 'bg-[#efcbb9] text-[#9d684e] border-[#9d684e]/20',
};

const statusLabels = {
  COMPLETED: 'Completada',
  PENDING: 'Pendiente',
  CANCELLED: 'Cancelada',
} as const;

const statusColors: Record<string, string> = {
  COMPLETED: 'bg-[#455a54]/10 text-[#455a54] border-[#455a54]/20',
  PENDING: 'bg-[#cc844a]/10 text-[#cc844a] border-[#cc844a]/20',
  CANCELLED: 'bg-[#9d684e]/10 text-[#9d684e] border-[#9d684e]/20',
};

// Left accent bar color per status
const statusAccent: Record<string, string> = {
  COMPLETED: 'bg-[#455a54]',
  PENDING: 'bg-[#cc844a]',
  CANCELLED: 'bg-[#9d684e]',
};

export function SalesMobileView({
  sales,
  onEdit,
  onDelete,
  onView,
  onCancel,
  searchValue,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  isLoading,
}: SalesMobileViewProps) {
  const statusOptions: FilterOption[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'COMPLETED', label: 'Completada' },
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'CANCELLED', label: 'Cancelada' },
  ];

  const handleClearFilters = () => {
    onSearchChange?.('');
    onDateRangeChange?.(undefined);
    onStatusFilterChange?.('');
  };

  const filters = (
    <TableFilters
      searchValue={searchValue || ''}
      onSearchChange={onSearchChange || (() => {})}
      searchPlaceholder="Buscar ventas..."
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange || (() => {})}
      statusValue={statusFilter || ''}
      onStatusChange={onStatusFilterChange || (() => {})}
      statusOptions={statusOptions}
      onClearFilters={handleClearFilters}
      onRefresh={onRefresh || (() => {})}
      isLoading={isLoading || false}
    />
  );

  if (sales.length === 0) {
    return (
      <div className="space-y-4">
        {filters}
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Receipt className="h-8 w-8 text-[#d9dadb]" />
          <p className="text-sm text-[#455a54]/50 font-winter-solid">No se encontraron ventas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filters}

      <div className="space-y-2">
        {sales.map((sale) => {
          const lineCount = sale.items.length;
          const saleDate = new Date(sale.createdAt);
          const primary = getPrimaryPaymentMethod(sale);
          const accent = statusAccent[sale.status] ?? 'bg-[#d9dadb]';
          const hasDiscount = (sale.discount ?? 0) > 0;
          const cleanNotes = parseNotesAndSeller(sale.notes).notes;

          return (
            <div
              key={sale.id}
              className="flex bg-white rounded-lg border border-[#d9dadb] overflow-hidden shadow-sm active:opacity-80 cursor-pointer"
              onClick={() => onView?.(sale)}
            >
              {/* Accent bar */}
              <div className={`w-1 shrink-0 ${accent}`} />

              {/* Content */}
              <div className="flex-1 min-w-0 px-3 py-2.5">
                {/* Row 1: ID + badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-[#455a54] font-winter-solid tracking-wide">
                    {sale.saleNumber ?? `#${sale.id.slice(-6).toUpperCase()}`}
                  </span>
                  <Badge className={`text-[10px] px-1.5 py-0 h-4 border ${statusColors[sale.status]}`}>
                    {statusLabels[sale.status as keyof typeof statusLabels]}
                  </Badge>
                  <Badge className={`text-[10px] px-1.5 py-0 h-4 border ${paymentMethodColors[primary]}`}>
                    {paymentMethodLabels[primary]}
                  </Badge>
                </div>

                {/* Row 2: client + date */}
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-sm text-[#455a54] font-medium truncate flex-1 mr-2">
                    {sale.customerName || 'Cliente General'}
                  </span>
                  <span className="text-[10px] text-[#455a54]/50 shrink-0 font-winter-solid">
                    {format(saleDate, 'HH:mm · dd MMM', { locale: es })}
                  </span>
                </div>

                {/* Row 3: products count + pricing */}
                <div className="flex items-end justify-between mt-1.5 pt-1.5 border-t border-[#d9dadb]/60">
                  <div className="text-xs text-[#455a54]/60 leading-relaxed">
                    <span>{lineCount} {lineCount === 1 ? 'producto' : 'productos'}</span>
                    {hasDiscount && (
                      <span className="ml-1.5 text-[#cc844a]">· {sale.discount}% off</span>
                    )}
                    {cleanNotes && (
                      <span className="block italic truncate max-w-[160px]">{cleanNotes}</span>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    {hasDiscount && (
                      <p className="text-[10px] text-[#455a54]/40 line-through leading-none mb-0.5">
                        {formatCurrency(sale.subtotal)}
                      </p>
                    )}
                  <span className="text-base font-bold font-tan-nimbus text-[#9d684e] leading-none">
                    {formatCurrency(sale.total)}
                  </span>
                  </div>
                </div>
              </div>

              {/* Dropdown — stop propagation so tap on dots doesn't open detail */}
              <div
                className="flex items-center pr-2 pl-1 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#455a54]/40 hover:text-[#455a54]">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView?.(sale)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver detalles
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onEdit?.(sale)}
                      disabled={sale.status === 'COMPLETED'}
                      className={sale.status === 'COMPLETED' ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    {sale.status === 'PENDING' && (
                      <DropdownMenuItem
                        onClick={() => onCancel?.(sale.id)}
                        className="text-[#cc844a]"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancelar comanda
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => onDelete?.(sale.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
