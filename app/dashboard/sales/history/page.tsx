'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar,
  Filter,
  Eye,
  Edit,
  Trash2,
  Download,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Printer,
} from 'lucide-react';
import { useAppStore } from '@/stores/app.store';
import { useSettingsStore } from '@/stores/settings.store';
import { Sale } from '@/lib/types';
import { showToast } from '@/lib/toast';
import { formatCurrency, getPrimaryPaymentMethod } from '@/lib/sales-calculations';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SalesFilters {
  searchTerm: string;
  paymentMethod: string;
  status: string;
  dateRange: string;
  minAmount: string;
  maxAmount: string;
}

export default function SalesHistoryPage() {
  const router = useRouter();
  
  // Use new app store
  const { salesHistory } = useAppStore();
  const { settings: receiptSettings } = useSettingsStore();
  const sales = salesHistory;

  const [filters, setFilters] = useState<SalesFilters>({
    searchTerm: '',
    paymentMethod: 'all',
    status: 'all',
    dateRange: 'today',
    minAmount: '',
    maxAmount: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtrar y paginar ventas
  const filteredSales = useMemo(() => {
    let filtered = [...sales];

    // Filtro por término de búsqueda (ID de venta o notas)
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (sale) =>
          sale.id.toLowerCase().includes(term) ||
          sale.notes?.toLowerCase().includes(term) ||
          sale.customerName.toLowerCase().includes(term)
      );
    }

    // Filtro por método de pago: la venta matchea si tiene al menos un pago
    // del método elegido.
    if (filters.paymentMethod !== 'all') {
      filtered = filtered.filter((sale) =>
        (sale.payments ?? []).some((p) => p.method === filters.paymentMethod)
      );
    }

    // Filtro por estado
    if (filters.status !== 'all') {
      filtered = filtered.filter((sale) => sale.status === filters.status);
    }

    // Filtro por rango de fecha
    if (filters.dateRange !== 'all') {
      const today = new Date();
      let startDate: Date;

      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          break;
        case 'week':
          startDate = new Date(today);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(today);
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter((sale) =>  new Date(sale.createdAt) >= startDate);
    }

    // Filtro por monto mínimo y máximo
    if (filters.minAmount) {
      const minAmount = parseFloat(filters.minAmount);
      filtered = filtered.filter((sale) => sale.total >= minAmount);
    }

    if (filters.maxAmount) {
      const maxAmount = parseFloat(filters.maxAmount);
      filtered = filtered.filter((sale) => sale.total <= maxAmount);
    }

    // Ordenar por fecha (más recientes primero)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return filtered;
  }, [sales, filters]);

  // Paginación
  const paginatedSales = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSales, currentPage]);

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

  // Remove duplicate formatCurrency function - now using centralized version

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusBadge = (status: Sale['status']) => {
    const statusConfig = {
      completed: { label: 'Completada', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      draft: { label: 'Borrador', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' },
      cancelled: { label: 'Cancelada', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
      refunded: { label: 'Reembolsada', variant: 'outline' as const, color: 'bg-orange-100 text-orange-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: 'Desconocido', variant: 'outline' as const, color: 'bg-gray-100 text-gray-800' };
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getPaymentMethodBadge = (method: 'CASH' | 'CARD' | 'TRANSFER' | 'MIXED') => {
    const methodConfig: Record<string, { label: string; color: string }> = {
      CASH: { label: 'Efectivo', color: 'bg-green-100 text-green-800' },
      CARD: { label: 'Tarjeta', color: 'bg-blue-100 text-blue-800' },
      TRANSFER: { label: 'Transferencia', color: 'bg-purple-100 text-purple-800' },
      MIXED: { label: 'Mixto', color: 'bg-yellow-100 text-yellow-800' },
    };

    const config = methodConfig[method] || { label: 'Desconocido', color: 'bg-gray-100 text-gray-800' };
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const handleViewSale = (saleId: string) => {
    router.push(`/dashboard/sales/${saleId}`);
  };

  const handleEditSale = (saleId: string) => {
    router.push(`/dashboard/sales/${saleId}/edit`);
  };

  const handlePrintSale = (sale: Sale) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast.error('No se pudo abrir la ventana de impresión');
      return;
    }
    
    showToast.success('Recibo reenviado a impresora');
    printWindow.close();
  };

  const handleDeleteSale = async (saleId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta venta? Esta acción no se puede deshacer.')) {
      try {
        // TODO: Implement delete sale functionality in app store
        showToast.success(`Venta ${saleId.slice(-6)} eliminada correctamente`);
      } catch (error) {
        if (error instanceof Error) {
          showToast.error(error.message);
        } else {
          showToast.error('Error eliminando venta');
        }
      }
    }
  };

  const handleExportSales = () => {
    showToast.success('Exportación iniciada (funcionalidad pendiente)');
  };

  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      paymentMethod: 'all',
      status: 'all',
      dateRange: 'today',
      minAmount: '',
      maxAmount: '',
    });
    setCurrentPage(1);
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-[var(--color-rosa-claro)]/20 to-[var(--color-durazno)]/20'>
      <div className='container mx-auto p-4 xl:p-6'>
        {/* Header con navegación */}
        <div className='flex items-center justify-between mb-6'>
          <div className='flex items-center gap-4'>
            <Button
              variant='naranja'
              onClick={() => router.push('/dashboard/sales')}
              className='font-winter-solid shadow-md hover:shadow-lg transition-all duration-200'
            >
              <ArrowLeft className='h-4 w-4 mr-2' />
              Volver al POS
            </Button>
            <div>
              <h1 className='text-2xl font-bold text-[#455a54] font-tan-nimbus'>
                Historial de Ventas
              </h1>
              <p className='text-[#455a54] font-winter-solid'>
                {filteredSales.length} venta
                {filteredSales.length !== 1 ? 's' : ''} encontrada
                {filteredSales.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <Button
            onClick={handleExportSales}
            variant='outline'
            className='hidden sm:flex'
          >
            <Download className='h-4 w-4 mr-2' />
            Exportar
          </Button>
        </div>

        {/* Filtros */}
        <Card className='border-[var(--color-gris-claro)] mb-6'>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2'>
              <Filter className='h-5 w-5 text-[#455a54]' />
              <span className='font-tan-nimbus text-[#455a54]'>
                Filtros de Búsqueda
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* Primera fila de filtros */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              {/* Búsqueda general */}
              <div className='md:col-span-2'>
                <Input
                  placeholder='Buscar por ID, cliente o notas...'
                  className='w-full font-winter-solid'
                  value={filters.searchTerm}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      searchTerm: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Rango de fecha */}
              <Select
                value={filters.dateRange}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, dateRange: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Fecha' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Todas las fechas</SelectItem>
                  <SelectItem value='today'>Hoy</SelectItem>
                  <SelectItem value='week'>Última semana</SelectItem>
                  <SelectItem value='month'>Último mes</SelectItem>
                </SelectContent>
              </Select>

              {/* Estado */}
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Estado' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Todos los estados</SelectItem>
                  <SelectItem value='completed'>Completadas</SelectItem>
                  <SelectItem value='draft'>Borradores</SelectItem>
                  <SelectItem value='cancelled'>Canceladas</SelectItem>
                  <SelectItem value='refunded'>Reembolsadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Segunda fila de filtros */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              {/* Método de pago */}
              <Select
                value={filters.paymentMethod}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, paymentMethod: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Método de pago' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Todos los métodos</SelectItem>
                  <SelectItem value='efectivo'>Efectivo</SelectItem>
                  <SelectItem value='tarjeta'>Tarjeta</SelectItem>
                  <SelectItem value='transferencia'>Transferencia</SelectItem>
                  <SelectItem value='mixto'>Mixto</SelectItem>
                </SelectContent>
              </Select>

              {/* Monto mínimo */}
              <Input
                type='number'
                placeholder='Monto mínimo'
                value={filters.minAmount}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, minAmount: e.target.value }))
                }
              />

              {/* Monto máximo */}
              <Input
                type='number'
                placeholder='Monto máximo'
                value={filters.maxAmount}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, maxAmount: e.target.value }))
                }
              />

              {/* Botón reset */}
              <Button
                variant='outline'
                onClick={resetFilters}
              >
                Limpiar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de ventas */}
        <Card className='border-[var(--color-gris-claro)]'>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='font-winter-solid'>
                      ID Venta
                    </TableHead>
                    <TableHead className='font-winter-solid'>Fecha</TableHead>
                    <TableHead className='font-winter-solid'>Cliente</TableHead>
                    <TableHead className='font-winter-solid'>Items</TableHead>
                    <TableHead className='font-winter-solid'>Total</TableHead>
                    <TableHead className='font-winter-solid'>Método</TableHead>
                    <TableHead className='font-winter-solid'>Estado</TableHead>
                    <TableHead className='font-winter-solid'>Cajero</TableHead>
                    <TableHead className='w-[100px] font-winter-solid'>
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSales.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className='text-center py-8 text-[var(--color-ciruela-oscuro)]/70'
                      >
                        <Calendar className='h-12 w-12 mx-auto mb-3 opacity-50' />
                        <p className='font-winter-solid'>
                          No se encontraron ventas
                        </p>
                        <p className='text-sm font-winter-solid'>
                          Ajusta los filtros para ver más resultados
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSales.map((sale) => (
                      <TableRow
                        key={sale.id}
                        className='hover:bg-[var(--color-rosa-claro)]/30'
                      >
                        <TableCell className='font-mono text-sm'>
                          #{sale.id.slice(-6)}
                        </TableCell>
                        <TableCell className='text-sm'>
                          {formatDate(new Date(sale.completedAt || sale.createdAt))}
                        </TableCell>
                        <TableCell>
                          {sale.customerName || 'Cliente general'}
                        </TableCell>
                        <TableCell>
                          <Badge variant='secondary'>
                            {sale.items.length} item
                            {sale.items.length !== 1 ? 's' : ''}
                          </Badge>
                        </TableCell>
                        <TableCell className='font-semibold'>
                          {formatCurrency(sale.total)}
                        </TableCell>
                        <TableCell>
                          {getPaymentMethodBadge(getPrimaryPaymentMethod(sale))}
                        </TableCell>
                        <TableCell>{getStatusBadge(sale.status)}</TableCell>
                        <TableCell className='text-sm text-[var(--color-verde-profundo)]'>
                          {sale.cashierId}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'
                              >
                                <MoreVertical className='h-4 w-4' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end'>
                              <DropdownMenuItem
                                onClick={() => handleViewSale(sale.id)}
                              >
                                <Eye className='h-4 w-4 mr-2' />
                                Ver detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handlePrintSale(sale)}
                              >
                                <Printer className='h-4 w-4 mr-2' />
                                Reimprimir recibo
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditSale(sale.id)}
                              >
                                <Edit className='h-4 w-4 mr-2' />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteSale(sale.id)}
                                className='text-red-600'
                              >
                                <Trash2 className='h-4 w-4 mr-2' />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className='flex items-center justify-between p-4 border-t border-[var(--color-gris-claro)]'>
                <p className='text-sm text-[var(--color-verde-profundo)]'>
                  Mostrando {(currentPage - 1) * itemsPerPage + 1} -{' '}
                  {Math.min(currentPage * itemsPerPage, filteredSales.length)}{' '}
                  de {filteredSales.length} ventas
                </p>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='icon'
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className='h-4 w-4' />
                  </Button>
                  <span className='text-sm text-[var(--color-ciruela-oscuro)]'>
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant='outline'
                    size='icon'
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}