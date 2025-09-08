'use client';

import { Prepaid } from '@/services/prepaids.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TableFilters } from '@/components/ui/table-filters';
import { DateRange } from 'react-day-picker';
import { MoreVertical, CreditCard, Calendar, DollarSign, User, CheckCircle, Clock, FileX } from 'lucide-react';

interface PrepaidsMobileViewProps {
  prepaids: Prepaid[];
  onEdit: (prepaid: Prepaid) => void;
  onDelete: (prepaid: Prepaid) => void;
  onMarkAsConsumed: (prepaid: Prepaid) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onClearFilters: () => void;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'PENDING':
      return <Clock className="w-4 h-4" />;
    case 'CONSUMED':
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <FileX className="w-4 h-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'CONSUMED':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'Pendiente';
    case 'CONSUMED':
      return 'Consumida';
    default:
      return 'Desconocido';
  }
};

export function PrepaidsMobileView({
  prepaids,
  onEdit,
  onDelete,
  onMarkAsConsumed,
  searchTerm,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  statusFilter,
  onStatusFilterChange,
  onClearFilters,
}: PrepaidsMobileViewProps) {
  const statusOptions = [
    { value: 'ALL', label: 'Todos los estados' },
    { value: 'PENDING', label: 'Pendientes' },
    { value: 'CONSUMED', label: 'Consumidas' },
  ];

  const handleClearFilters = () => {
    onSearchChange('');
    onDateRangeChange(undefined);
    onStatusFilterChange('ALL');
    onClearFilters();
  };

  return (
    <div className="space-y-4">
      <TableFilters
        searchValue={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar señas por cliente..."
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
        showDateFilter={true}
        customFilters={[
          {
            key: 'status',
            label: 'Estado',
            value: statusFilter,
            onChange: onStatusFilterChange,
            options: statusOptions,
          },
        ]}
        onClearFilters={handleClearFilters}
      />
      
      <div className="grid gap-4">
        {prepaids.map((prepaid) => (
          <Card key={prepaid.id} className="w-full">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="truncate">Seña #{prepaid.id}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <User className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">Cliente ID: {prepaid.clientId}</span>
                  </CardDescription>
                </div>
                <div className="flex items-start gap-2 flex-shrink-0">
                  <Badge
                    variant="outline"
                    className={`${getStatusColor(prepaid.status)} flex items-center gap-1 text-xs`}
                  >
                    {getStatusIcon(prepaid.status)}
                    {getStatusLabel(prepaid.status)}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(prepaid)}>
                        Editar
                      </DropdownMenuItem>
                      {prepaid.status === 'PENDING' && (
                        <DropdownMenuItem onClick={() => onMarkAsConsumed(prepaid)}>
                          Marcar como consumida
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => onDelete(prepaid)}
                        className="text-red-600"
                      >
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                  <div className="font-medium text-lg text-green-600">
                    ${prepaid.amount.toLocaleString()}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    Fecha
                  </div>
                  <div className="font-medium">
                    {new Date(prepaid.createdAt).toLocaleDateString('es-AR')}
                  </div>
                </div>
              </div>
              {prepaid.notes && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-sm text-muted-foreground mb-1">Notas</div>
                  <div className="text-sm">{prepaid.notes}</div>
                </div>
              )}
              {prepaid.consumedAt && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-sm text-muted-foreground mb-1">Consumida el</div>
                  <div className="text-sm font-medium">
                    {new Date(prepaid.consumedAt).toLocaleDateString('es-AR')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {prepaids.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <CreditCard className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No se encontraron señas</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}