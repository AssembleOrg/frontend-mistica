'use client';

import { useState, useEffect, useCallback } from 'react';
import { DateRange } from 'react-day-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { TableFilters } from '@/components/ui/table-filters';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { EmptyState } from '@/components/ui/empty-state';
import { ProductsTableSkeleton } from '@/components/ui/loading-skeletons';
import { ShoppingBag } from 'lucide-react';
import { Sale, salesService } from '@/services/sales.service';
import { Client } from '@/services/clients.service';
import { formatCurrency } from '@/lib/sales-calculations';

interface ClientSalesHistoryModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'COMPLETED', label: 'Completada' },
  { value: 'PARTIAL', label: 'Seña' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

const PAYMENT_OPTIONS = [
  { value: 'all', label: 'Todos los métodos' },
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'MIXED', label: 'Mixto' },
];

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
};

const PAGE_SIZE = 10;

function getStatusBadge(status: string) {
  const labels: Record<string, string> = {
    COMPLETED: 'Completada',
    PENDING: 'Pendiente',
    // PARTIAL = venta con saldo pendiente; de cara al usuario es "Seña".
    PARTIAL: 'Seña',
    CANCELLED: 'Cancelada',
  };
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
        Seña
      </Badge>
    );
  }
  const styles: Record<string, string> = {
    COMPLETED: 'bg-[#455a54]/10 text-[#455a54] border-[#455a54]/30',
    PENDING: 'bg-[#cc844a]/10 text-[#cc844a] border-[#cc844a]/30',
    CANCELLED: 'bg-[#4e4247]/10 text-[#4e4247] border-[#4e4247]/30',
  };
  return (
    <Badge
      variant="outline"
      className={`${styles[status] || 'bg-[#455a54]/5 text-[#455a54]/60 border-[#455a54]/20'} font-winter-solid`}
    >
      {labels[status] || status}
    </Badge>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function paymentSummary(sale: Sale) {
  const methods = (sale.payments || []).map((p) => PAYMENT_LABELS[p.method] || p.method);
  const unique = [...new Set(methods)];
  if (unique.length === 0) return '—';
  if (unique.length > 1) return 'Mixto';
  return unique[0];
}

export function ClientSalesHistoryModal({ client, isOpen, onClose }: ClientSalesHistoryModalProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const load = useCallback(async () => {
    if (!client) return;
    setIsLoading(true);
    try {
      const res = await salesService.getSales(page, PAGE_SIZE, {
        clientId: client.id,
        search: search.trim() || undefined,
        fullSearch: true,
        status: statusFilter,
        paymentMethod: paymentFilter,
        from: dateRange?.from ? dateRange.from.toISOString() : undefined,
        to: dateRange?.to ? dateRange.to.toISOString() : undefined,
      });
      setSales(res.data?.data || []);
      setTotalPages(res.data?.meta?.totalPages || 1);
      setTotalItems(res.data?.meta?.total || 0);
    } catch (error) {
      console.error('Error cargando historial del cliente:', error);
      setSales([]);
    } finally {
      setIsLoading(false);
    }
  }, [client, page, search, statusFilter, paymentFilter, dateRange]);

  // Carga cuando se abre o cambian filtros/página (load cambia identidad con sus deps).
  useEffect(() => {
    if (isOpen && client) load();
  }, [isOpen, client, load]);

  // Al cerrar, blanqueamos filtros y página para la próxima apertura.
  useEffect(() => {
    if (!isOpen) {
      setPage(1);
      setSearch('');
      setStatusFilter('all');
      setPaymentFilter('all');
      setDateRange(undefined);
      setSales([]);
    }
  }, [isOpen]);

  // Cada cambio de filtro vuelve a la página 1 (junto con el set del filtro).
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatus = (v: string) => { setStatusFilter(v); setPage(1); };
  const handlePayment = (v: string) => { setPaymentFilter(v); setPage(1); };
  const handleDateRange = (r: DateRange | undefined) => { setDateRange(r); setPage(1); };
  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPaymentFilter('all');
    setDateRange(undefined);
    setPage(1);
  };

  const hasFilters =
    !!search || statusFilter !== 'all' || paymentFilter !== 'all' || !!dateRange;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-[900px] max-h-[92vh] overflow-y-auto border-[#9d684e]/20">
        <DialogHeader>
          <DialogTitle className="text-[#455a54] font-tan-nimbus text-lg sm:text-xl">
            Historial de ventas{client ? ` · ${client.fullName}` : ''}
          </DialogTitle>
          <DialogDescription className="font-winter-solid text-sm text-[#455a54]/60">
            {totalItems} {totalItems === 1 ? 'venta registrada' : 'ventas registradas'} · ordenadas de la más reciente a la más antigua.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <TableFilters
            searchValue={search}
            onSearchChange={handleSearch}
            searchPlaceholder="Buscar por nombre, N° de venta o producto..."
            statusValue={statusFilter}
            onStatusChange={handleStatus}
            statusOptions={STATUS_OPTIONS}
            showStatusFilter
            customFilters={[
              {
                key: 'payment',
                label: 'Método de pago',
                value: paymentFilter,
                options: PAYMENT_OPTIONS,
                onChange: handlePayment,
              },
            ]}
            showDateFilter
            dateRange={dateRange}
            onDateRangeChange={handleDateRange}
            onClearFilters={handleClearFilters}
            onRefresh={load}
          />

          {/* El buscador queda montado siempre: el skeleton va sólo en las filas
              (si se desmontara, el input perdería foco/estado en cada fetch). */}
          {isLoading ? (
            <ProductsTableSkeleton />
          ) : sales.length === 0 ? (
            <EmptyState
              variant="compact"
              icon={ShoppingBag}
              title={hasFilters ? 'Sin resultados' : 'Sin ventas todavía'}
              description={
                hasFilters
                  ? 'Probá ajustar los filtros o la búsqueda.'
                  : 'Cuando este cliente tenga ventas, van a aparecer acá.'
              }
            />
          ) : (
            <div className="border border-[#9d684e]/15 rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#9d684e]/12 hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid h-9">Fecha</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid h-9">Venta</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid h-9">Detalle</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid h-9">Pago</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid h-9">Estado</TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid h-9">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => {
                    const saldo = sale.balanceDue || 0;
                    const detalle = sale.items.map((i) => i.productName).join(', ');
                    return (
                      <TableRow key={sale.id} className="border-[#9d684e]/12 hover:bg-[#efcbb9]/15">
                        <TableCell className="py-2.5 text-[13px] text-[#455a54]/80 tabular-nums whitespace-nowrap">
                          {formatDateTime(sale.createdAt)}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="text-sm text-[#455a54] font-winter-solid">{sale.name || '—'}</div>
                          <div className="text-[11px] text-[#455a54]/50 tabular-nums">{sale.saleNumber}</div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <span
                            className="text-[13px] text-[#455a54]/75 block max-w-[220px] truncate"
                            title={detalle || undefined}
                          >
                            {detalle || 'Sin productos'}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 text-[13px] text-[#455a54]/75 whitespace-nowrap">
                          {paymentSummary(sale)}
                        </TableCell>
                        <TableCell className="py-2.5">{getStatusBadge(sale.status)}</TableCell>
                        <TableCell className="py-2.5 text-right whitespace-nowrap">
                          <div className="text-sm font-semibold text-[#455a54] tabular-nums">
                            {formatCurrency(sale.total)}
                          </div>
                          {saldo > 0 && (
                            <div className="text-[11px] text-[var(--color-naranja-medio)] tabular-nums">
                              Saldo {formatCurrency(saldo)}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              pageSize={PAGE_SIZE}
              totalItems={totalItems}
              showPageSizeSelector={false}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
