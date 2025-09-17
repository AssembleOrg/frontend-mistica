'use client';

import { CashTransaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TableFilters } from '@/components/ui/table-filters';
import { DateRange } from 'react-day-picker';
import { 
  MoreVertical, 
  DollarSign, 
  Calendar, 
  ArrowUp, 
  ArrowDown, 
  CreditCard, 
  Banknote,
  Smartphone,
  Shuffle,
  Edit,
  Trash2,
  FileText
} from 'lucide-react';

interface FinancesMobileViewProps {
  transactions: CashTransaction[];
  onEdit?: (transaction: CashTransaction) => void;
  onDelete?: (transaction: CashTransaction) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  dateRange?: DateRange | undefined;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  categoryFilter?: string;
  onCategoryFilterChange?: (category: string) => void;
  onClearFilters?: () => void;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'ingreso':
      return <ArrowUp className="w-4 h-4" />;
    case 'egreso':
      return <ArrowDown className="w-4 h-4" />;
    default:
      return <DollarSign className="w-4 h-4" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'ingreso':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'egreso':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'ingreso':
      return 'Ingreso';
    case 'egreso':
      return 'Egreso';
    default:
      return 'Desconocido';
  }
};

const getPaymentMethodIcon = (method: string) => {
  switch (method) {
    case 'efectivo':
      return <Banknote className="w-3 h-3" />;
    case 'tarjeta':
      return <CreditCard className="w-3 h-3" />;
    case 'transferencia':
      return <Smartphone className="w-3 h-3" />;
    case 'mixto':
      return <Shuffle className="w-3 h-3" />;
    default:
      return <DollarSign className="w-3 h-3" />;
  }
};

const getPaymentMethodLabel = (method: string) => {
  switch (method) {
    case 'efectivo':
      return 'Efectivo';
    case 'tarjeta':
      return 'Tarjeta';
    case 'transferencia':
      return 'Transferencia';
    case 'mixto':
      return 'Mixto';
    default:
      return method;
  }
};

export function FinancesMobileView({
  transactions,
  onEdit,
  onDelete,
  searchTerm,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  typeFilter,
  onTypeFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  onClearFilters,
}: FinancesMobileViewProps) {
  const typeOptions = [
    { value: 'all', label: 'Todos los tipos' },
    { value: 'ingreso', label: 'Ingresos' },
    { value: 'egreso', label: 'Egresos' },
  ];

  const categoryOptions = [
    { value: 'all', label: 'Todas las categorías' },
    { value: 'ventas', label: 'Ventas' },
    { value: 'operativo', label: 'Operativo' },
    { value: 'compras', label: 'Compras' },
    { value: 'servicios', label: 'Servicios' },
    { value: 'otros', label: 'Otros' },
  ];

  const handleClearFilters = () => {
    onSearchChange('');
    onDateRangeChange?.(undefined);
    onTypeFilterChange('all');
    onCategoryFilterChange?.('all');
    onClearFilters?.();
  };

  const customFilters = [
    {
      key: 'type',
      label: 'Tipo',
      value: typeFilter,
      onChange: onTypeFilterChange,
      options: typeOptions,
    },
  ];

  if (onCategoryFilterChange && categoryFilter) {
    customFilters.push({
      key: 'category',
      label: 'Categoría',
      value: categoryFilter,
      onChange: onCategoryFilterChange,
      options: categoryOptions,
    });
  }

  return (
    <div className="space-y-4">
      <TableFilters
        searchValue={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar transacciones por descripción..."
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
        showDateFilter={true}
        customFilters={customFilters}
        onClearFilters={handleClearFilters}
      />
      
      <div className="grid gap-4">
        {transactions.map((transaction) => (
          <Card key={transaction.id} className="w-full">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="truncate">{transaction.description}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <FileText className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{transaction.category}</span>
                  </CardDescription>
                </div>
                <div className="flex items-start gap-2 flex-shrink-0">
                  <Badge
                    variant="outline"
                    className={`${getTypeColor(transaction.type)} flex items-center gap-1 whitespace-nowrap text-xs`}
                  >
                    {getTypeIcon(transaction.type)}
                    {getTypeLabel(transaction.type)}
                  </Badge>
                  {(onEdit || onDelete) && (
                    <DropdownMenu>
                      {/* @ts-ignore - shadcn/ui type issue */}
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onEdit && (
                          // @ts-ignore - shadcn/ui type issue
                          <DropdownMenuItem onClick={() => onEdit(transaction)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          // @ts-ignore - shadcn/ui type issue
                          <DropdownMenuItem 
                            onClick={() => onDelete(transaction)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="w-3 h-3" />
                    Monto
                  </div>
                  <div className={`font-bold text-lg ${
                    transaction.type === 'ingreso' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'ingreso' ? '+' : '-'}${transaction.amount.toLocaleString()}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    Fecha
                  </div>
                  <div className="font-medium">
                    {new Date(transaction.createdAt).toLocaleDateString('es-AR')}
                  </div>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    {getPaymentMethodIcon(transaction.paymentMethod)}
                    <span>Método de pago</span>
                  </div>
                  <div className="text-sm font-medium">
                    {getPaymentMethodLabel(transaction.paymentMethod)}
                  </div>
                </div>
              </div>

              {transaction.reference && (
                <div className="mt-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">Referencia</div>
                    <div className="text-sm font-medium">
                      {transaction.reference}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {transactions.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <DollarSign className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No se encontraron transacciones</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}