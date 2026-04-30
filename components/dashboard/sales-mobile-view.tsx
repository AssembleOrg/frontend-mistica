'use client';

import { Sale, SaleItem } from '@/services/sales.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, MoreHorizontal, Eye, Receipt, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency } from '@/lib/sales-calculations';
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
  // Filters props
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
  TRANSFER: 'Transferencia'
} as const;

const paymentMethodColors = {
  CASH: 'bg-green-100 text-green-800 border-green-200',
  CARD: 'bg-blue-100 text-blue-800 border-blue-200', 
  TRANSFER: 'bg-purple-100 text-purple-800 border-purple-200'
} as const;

const statusLabels = {
  COMPLETED: 'Completada',
  PENDING: 'Pendiente',
  CANCELLED: 'Cancelada',
} as const;

const statusColors = {
  COMPLETED: 'bg-green-50 text-green-800 border-green-200',
  PENDING: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  CANCELLED: 'bg-red-50 text-red-800 border-red-200',
} as const;

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
  isLoading
}: SalesMobileViewProps) {
  
  // Status options for filters
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

  if (sales.length === 0) {
    return (
      <div className="space-y-4">
        {/* Mobile Filters */}
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
      
      <div className="text-center py-8 text-gray-500">
        <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="text-base">No se encontraron ventas.</p>
        <p className="text-sm text-gray-400 mt-1">Las ventas aparecerán aquí cuando se registren.</p>
      </div>
    </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile Filters */}
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
      
      {/* Sales Cards */}
      <div className="space-y-3">
      {sales.map((sale) => {
        const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        const saleDate = new Date(sale.createdAt);

        return (
          <div key={sale.id} className="mobile-card">
            <div className="mobile-card-header">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="mobile-card-title">
                    Venta #{sale.id.slice(-6).toUpperCase()}
                  </h3>
                  <Badge 
                    className={`text-xs ${paymentMethodColors[sale.paymentMethod]}`}
                  >
                    {paymentMethodLabels[sale.paymentMethod]}
                  </Badge>
                  <Badge 
                    variant="outline"
                    className={`text-xs ${statusColors[sale.status as keyof typeof statusColors]}`}
                  >
                    {statusLabels[sale.status as keyof typeof statusLabels]}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">
                  {format(saleDate, "dd MMM yyyy, HH:mm", { locale: es })}
                </p>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 touch-target">
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
                    {sale.status === 'COMPLETED' && <span className="ml-2 text-xs text-gray-500">(Bloqueado)</span>}
                  </DropdownMenuItem>
                  {sale.status === 'PENDING' && (
                    <DropdownMenuItem 
                      onClick={() => onCancel?.(sale.id)}
                      className="text-orange-600"
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

            <div className="mobile-card-content">
              <div className="mobile-card-row">
                <span className="mobile-card-label">Cliente</span>
                <span className="mobile-card-value font-medium">
                  {sale.customerName || 'Cliente General'}
                </span>
              </div>
              
              <div className="mobile-card-row">
                <span className="mobile-card-label">Artículos</span>
                <span className="mobile-card-value">
                  {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}
                </span>
              </div>

              <div className="mobile-card-row">
                <span className="mobile-card-label">Subtotal</span>
                <span className="mobile-card-value">
                  {formatCurrency(sale.subtotal)}
                </span>
              </div>

              <div className="mobile-card-row">
                <span className="mobile-card-label">Total</span>
                <span className="mobile-card-value font-semibold text-[#9d684e] text-base">
                  {formatCurrency(sale.total)}
                </span>
              </div>

              {/* Items preview */}
              <div className="mt-3 pt-2 border-t border-gray-100">
                <div className="mobile-card-label mb-1">Productos:</div>
                <div className="space-y-1">
                  {sale.items.slice(0, 2).map((item, index) => (
                    <div key={index} className="flex justify-between text-xs text-gray-600">
                      <span className="truncate flex-1 mr-2">
                        {item.quantity}x {item.productName}
                      </span>
                      <span className="shrink-0">
                        {formatCurrency(item.subtotal)}
                      </span>
                    </div>
                  ))}
                  {sale.items.length > 2 && (
                    <div className="text-xs text-gray-400">
                      +{sale.items.length - 2} {sale.items.length - 2 === 1 ? 'producto más' : 'productos más'}
                    </div>
                  )}
                </div>
              </div>

              {sale.notes && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="mobile-card-label mb-1">Notas:</div>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {sale.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}