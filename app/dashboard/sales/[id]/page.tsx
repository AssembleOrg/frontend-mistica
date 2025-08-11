'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Receipt,
  User,
  CreditCard,
  Calendar,
  Package,
  Edit,
  Trash2,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCcw,
} from 'lucide-react';
import { useAppStore } from '@/stores/app.store';
import { Sale } from '@/lib/types';
import { showToast } from '@/lib/toast';
import { formatCurrency } from '@/lib/sales-calculations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function SaleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const saleId = params.id as string;

  const { salesHistory, settings } = useAppStore();
  
  const getSaleById = useCallback((id: string) => salesHistory.find(s => s.id === id), [salesHistory]);
  const deleteSale = useCallback((_id: string) => {
    // TODO: Implement delete sale functionality in app store
    throw new Error('Delete sale functionality not implemented yet');
  }, []);
  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (saleId) {
      const foundSale = getSaleById(saleId);
      setSale(foundSale || null);
      setIsLoading(false);
    }
  }, [saleId, getSaleById]);

  // Remove duplicate formatCurrency function - now using centralized version

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getStatusConfig = (status: Sale['status']) => {
    const configs = {
      completed: {
        label: 'Completada',
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
      },
      draft: {
        label: 'Borrador',
        icon: Clock,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
      },
      cancelled: {
        label: 'Cancelada',
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
      },
      refunded: {
        label: 'Reembolsada',
        icon: RefreshCcw,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
      },
    };
    return configs[status];
  };

  const getPaymentMethodConfig = (method: Sale['paymentMethod']) => {
    const configs = {
      efectivo: { label: 'Efectivo', color: 'bg-green-100 text-green-800' },
      tarjeta: { label: 'Tarjeta', color: 'bg-blue-100 text-blue-800' },
      transferencia: {
        label: 'Transferencia',
        color: 'bg-purple-100 text-purple-800',
      },
      mixto: { label: 'Mixto', color: 'bg-yellow-100 text-yellow-800' },
    };
    return configs[method];
  };

  const handleEdit = () => {
    router.push(`/dashboard/sales/${saleId}/edit`);
  };

  const handleDelete = async () => {
    if (
      confirm(
        '¿Estás seguro de que deseas eliminar esta venta? Esta acción no se puede deshacer.'
      )
    ) {
      try {
        await deleteSale(saleId);
        showToast.success('Venta eliminada correctamente');
        router.push('/dashboard/sales/history');
      } catch (error) {
        if (error instanceof Error) {
          showToast.error(error.message);
        } else {
          showToast.error('Error eliminando venta');
        }
      }
    }
  };

  const handlePrint = () => {
    if (!sale) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo - Venta #${sale.id.slice(-6)}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 14px; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .section { margin-bottom: 15px; }
            .items table { width: 100%; border-collapse: collapse; }
            .items th, .items td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
            .total { font-weight: bold; font-size: 16px; }
            .separator { border-top: 2px solid #333; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>MÍSTICA</h2>
            <h3>Recibo de Venta</h3>
            <p>Venta #${sale.id.slice(-6)}</p>
          </div>
          
          <div class="section">
            <strong>Fecha:</strong> ${formatDate(
              sale.completedAt || sale.createdAt
            )}<br>
            <strong>Cajero:</strong> ${sale.cashierId}<br>
            <strong>Cliente:</strong> ${
              sale.customerInfo?.name || 'Cliente general'
            }
          </div>

          <div class="items">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th>Precio</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${sale.items
                  .map(
                    (item) => `
                  <tr>
                    <td>${item.product.name}</td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.unitPrice)}</td>
                    <td>${formatCurrency(item.subtotal)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>

          <div class="separator"></div>
          
          <div class="section">
            <strong>Subtotal:</strong> ${formatCurrency(sale.subtotal)}<br>
            ${
              sale.discountTotal > 0
                ? `<strong>Descuento:</strong> -${formatCurrency(
                    sale.discountTotal
                  )}<br>`
                : ''
            }
            <strong>IVA:</strong> ${formatCurrency(sale.taxAmount)}<br>
            <div class="total">TOTAL: ${formatCurrency(sale.total)}</div>
          </div>

          <div class="section">
            <strong>Método de pago:</strong> ${
              getPaymentMethodConfig(sale.paymentMethod).label
            }<br>
            ${
              sale.cashReceived
                ? `<strong>Efectivo recibido:</strong> ${formatCurrency(
                    sale.cashReceived
                  )}<br>`
                : ''
            }
            ${
              sale.cashChange
                ? `<strong>Cambio:</strong> ${formatCurrency(
                    sale.cashChange
                  )}<br>`
                : ''
            }
          </div>

          ${
            sale.notes
              ? `<div class="section"><strong>Notas:</strong> ${sale.notes}</div>`
              : ''
          }

          <div style="text-align: center; margin-top: 30px; font-size: 12px;">
            ¡Gracias por tu compra!<br>
            www.mistica.com
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-[var(--color-rosa-claro)]/20 to-[var(--color-durazno)]/20 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-verde-profundo)] mx-auto mb-4'></div>
          <p className='text-[var(--color-verde-profundo)]'>
            Cargando venta...
          </p>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-[var(--color-rosa-claro)]/20 to-[var(--color-durazno)]/20 flex items-center justify-center'>
        <div className='text-center'>
          <XCircle className='h-16 w-16 text-red-500 mx-auto mb-4' />
          <h2 className='text-2xl font-bold text-gray-900 mb-2 font-tan-nimbus'>
            Venta no encontrada
          </h2>
          <p className='text-gray-600 mb-4 font-winter-solid'>
            La venta con ID #{saleId.slice(-6)} no existe o ha sido eliminada.
          </p>
          <Button onClick={() => router.push('/dashboard/sales/history')}>
            Volver al historial
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(sale.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className='min-h-screen bg-gradient-to-br from-[var(--color-rosa-claro)]/20 to-[var(--color-durazno)]/20'>
      <div className='container mx-auto p-4 xl:p-6'>
        {/* Header con navegación */}
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4'>
          <div className='flex items-center gap-4'>
            <Button
              variant='ghost'
              onClick={() => router.push('/dashboard/sales/history')}
              className='text-[var(--color-verde-profundo)] hover:text-[var(--color-ciruela-oscuro)]'
            >
              <ArrowLeft className='h-4 w-4 mr-2' />
              Volver al historial
            </Button>
            <div>
              <h1 className='text-2xl font-bold text-[var(--color-ciruela-oscuro)] font-tan-nimbus'>
                Venta #{sale.id.slice(-6)}
              </h1>
              <div className='flex items-center gap-2 mt-1'>
                <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                <Badge
                  className={`${statusConfig.bgColor} ${statusConfig.color}`}
                >
                  {statusConfig.label}
                </Badge>
              </div>
            </div>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Button
              onClick={handlePrint}
              variant='outline'
              size='sm'
            >
              <Printer className='h-4 w-4 mr-2' />
              Imprimir
            </Button>
            <Button
              onClick={handleEdit}
              variant='outline'
              size='sm'
            >
              <Edit className='h-4 w-4 mr-2' />
              Editar
            </Button>
            <Button
              onClick={handleDelete}
              variant='destructive'
              size='sm'
            >
              <Trash2 className='h-4 w-4 mr-2' />
              Eliminar
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Información general */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Información de la venta */}
            <Card className='border-[var(--color-gris-claro)]'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Receipt className='h-5 w-5 text-[var(--color-verde-profundo)]' />
                  <span className='font-tan-nimbus'>
                    Información de la Venta
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='flex items-center gap-3'>
                    <Calendar className='h-5 w-5 text-[var(--color-verde-profundo)]' />
                    <div>
                      <p className='text-sm text-[var(--color-verde-profundo)] font-winter-solid'>
                        Fecha de creación
                      </p>
                      <p className='font-medium font-winter-solid'>
                        {formatDate(sale.createdAt)}
                      </p>
                    </div>
                  </div>

                  {sale.completedAt && (
                    <div className='flex items-center gap-3'>
                      <CheckCircle className='h-5 w-5 text-green-600' />
                      <div>
                        <p className='text-sm text-[var(--color-verde-profundo)] font-winter-solid'>
                          Fecha de completado
                        </p>
                        <p className='font-medium font-winter-solid'>
                          {formatDate(sale.completedAt)}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className='flex items-center gap-3'>
                    <User className='h-5 w-5 text-[var(--color-verde-profundo)]' />
                    <div>
                      <p className='text-sm text-[var(--color-verde-profundo)] font-winter-solid'>
                        Cajero
                      </p>
                      <p className='font-medium font-winter-solid'>
                        {sale.cashierId}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center gap-3'>
                    <CreditCard className='h-5 w-5 text-[var(--color-verde-profundo)]' />
                    <div>
                      <p className='text-sm text-[var(--color-verde-profundo)] font-winter-solid'>
                        Método de pago
                      </p>
                      <Badge
                        className={
                          getPaymentMethodConfig(sale.paymentMethod).color
                        }
                      >
                        {getPaymentMethodConfig(sale.paymentMethod).label}
                      </Badge>
                    </div>
                  </div>
                </div>

                {sale.customerInfo && (
                  <>
                    <Separator />
                    <div>
                      <h4 className='font-medium text-[var(--color-ciruela-oscuro)] mb-2 font-winter-solid'>
                        Información del cliente
                      </h4>
                      <div className='space-y-1'>
                        <p className='text-sm font-winter-solid'>
                          <span className='text-[var(--color-verde-profundo)]'>
                            Nombre:
                          </span>{' '}
                          {sale.customerInfo.name}
                        </p>
                        {sale.customerInfo.email && (
                          <p className='text-sm font-winter-solid'>
                            <span className='text-[var(--color-verde-profundo)]'>
                              Email:
                            </span>{' '}
                            {sale.customerInfo.email}
                          </p>
                        )}
                        {sale.customerInfo.phone && (
                          <p className='text-sm font-winter-solid'>
                            <span className='text-[var(--color-verde-profundo)]'>
                              Teléfono:
                            </span>{' '}
                            {sale.customerInfo.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {sale.notes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className='font-medium text-[var(--color-ciruela-oscuro)] mb-2 font-winter-solid'>
                        Notas
                      </h4>
                      <p className='text-sm text-[var(--color-ciruela-oscuro)] bg-[var(--color-rosa-claro)]/20 p-3 rounded-lg font-winter-solid'>
                        {sale.notes}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Productos vendidos */}
            <Card className='border-[var(--color-gris-claro)]'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Package className='h-5 w-5 text-[var(--color-verde-profundo)]' />
                  <span className='font-tan-nimbus'>
                    Productos Vendidos ({sale.items.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {sale.items.map((item) => (
                    <div
                      key={item.id}
                      className='flex items-center justify-between p-4 bg-[var(--color-rosa-claro)]/20 rounded-lg'
                    >
                      <div className='flex-1'>
                        <h4 className='font-medium text-[var(--color-ciruela-oscuro)] font-winter-solid'>
                          {item.product.name}
                        </h4>
                        <div className='flex items-center gap-4 mt-1 text-sm text-[var(--color-verde-profundo)]'>
                          <span className='font-winter-solid'>
                            Precio unitario: {formatCurrency(item.unitPrice)}
                          </span>
                          <span className='font-winter-solid'>
                            Cantidad: {item.quantity}
                          </span>
                          <Badge variant='secondary'>
                            {item.product.category}
                          </Badge>
                        </div>
                        {item.discountAmount && item.discountAmount > 0 && (
                          <p className='text-sm text-orange-600 mt-1 font-winter-solid'>
                            Descuento: -{formatCurrency(item.discountAmount)} (
                            {item.discountPercentage}%)
                          </p>
                        )}
                      </div>
                      <div className='text-right'>
                        <p className='font-bold text-[var(--color-ciruela-oscuro)] font-winter-solid'>
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumen de pago */}
          <div className='space-y-6'>
            <Card className='border-[var(--color-gris-claro)]'>
              <CardHeader>
                <CardTitle className='text-[var(--color-ciruela-oscuro)] font-tan-nimbus'>
                  Resumen de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-3'>
                  <div className='flex justify-between'>
                    <span className='text-[var(--color-verde-profundo)] font-winter-solid'>
                      Subtotal:
                    </span>
                    <span className='font-medium font-winter-solid'>
                      {formatCurrency(sale.subtotal)}
                    </span>
                  </div>

                  {sale.discountTotal > 0 && (
                    <div className='flex justify-between text-orange-600'>
                      <span className='font-winter-solid'>Descuento:</span>
                      <span className='font-winter-solid'>
                        -{formatCurrency(sale.discountTotal)}
                      </span>
                    </div>
                  )}

                  <div className='flex justify-between'>
                    <span className='text-[var(--color-verde-profundo)] font-winter-solid'>
                      IVA ({(settings.taxRate * 100).toFixed(0)}%):
                    </span>
                    <span className='font-medium font-winter-solid'>
                      {formatCurrency(sale.taxAmount)}
                    </span>
                  </div>

                  <Separator />

                  <div className='flex justify-between text-lg font-bold text-[var(--color-ciruela-oscuro)]'>
                    <span className='font-winter-solid'>Total:</span>
                    <span className='font-winter-solid'>
                      {formatCurrency(sale.total)}
                    </span>
                  </div>
                </div>

                {sale.paymentMethod === 'efectivo' && (
                  <>
                    <Separator />
                    <div className='space-y-2'>
                      {sale.cashReceived && (
                        <div className='flex justify-between'>
                          <span className='text-[var(--color-verde-profundo)] font-winter-solid'>
                            Efectivo recibido:
                          </span>
                          <span className='font-medium font-winter-solid'>
                            {formatCurrency(sale.cashReceived)}
                          </span>
                        </div>
                      )}
                      {sale.cashChange && (
                        <div className='flex justify-between text-green-600'>
                          <span className='font-winter-solid'>Cambio:</span>
                          <span className='font-bold font-winter-solid'>
                            {formatCurrency(sale.cashChange)}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Acciones rápidas */}
            <Card className='border-[var(--color-gris-claro)]'>
              <CardHeader>
                <CardTitle className='text-[var(--color-ciruela-oscuro)] font-tan-nimbus'>
                  Acciones
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <Button
                  onClick={handlePrint}
                  className='w-full'
                  variant='outline'
                >
                  <Printer className='h-4 w-4 mr-2' />
                  Imprimir Recibo
                </Button>
                <Button
                  onClick={handleEdit}
                  className='w-full'
                >
                  <Edit className='h-4 w-4 mr-2' />
                  Editar Venta
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant='destructive'
                      className='w-full'
                    >
                      <Trash2 className='h-4 w-4 mr-2' />
                      Eliminar Venta
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className='font-tan-nimbus'>
                        Confirmar Eliminación
                      </DialogTitle>
                      <DialogDescription className='font-winter-solid'>
                        ¿Estás seguro de que deseas eliminar esta venta? Esta
                        acción no se puede deshacer y se restaurará el stock de
                        todos los productos vendidos.
                      </DialogDescription>
                    </DialogHeader>
                    <div className='flex justify-end gap-2 mt-4'>
                      <Button variant='outline'>
                        <span className='font-winter-solid'>Cancelar</span>
                      </Button>
                      <Button
                        variant='destructive'
                        onClick={handleDelete}
                      >
                        <span className='font-winter-solid'>Eliminar</span>
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
