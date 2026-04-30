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
import { useSettingsStore } from '@/stores/settings.store';
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
  const { settings: receiptSettings } = useSettingsStore();
  
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
    return configs[status as keyof typeof configs] || configs.draft;
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
    return configs[method as keyof typeof configs] || configs.efectivo;
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
    
    // Calculate payment adjustment for display
    const adjustmentInfo = sale.originalTotal && sale.finalTotal ? {
      originalTotal: sale.originalTotal,
      finalTotal: sale.finalTotal,
      adjustmentAmount: sale.adjustmentAmount || 0,
      adjustmentType: sale.adjustmentType || 'ninguno',
      adjustmentPercentage: sale.adjustmentPercentage || 0
    } : null;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo - Venta #${sale.id.slice(-6)}</title>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: 'Arial', 'Helvetica', sans-serif; 
              font-size: 12px; 
              margin: 0; 
              padding: 10px;
              color: #333;
              max-width: 300px;
              line-height: 1.4;
            }
            
            .receipt-container {
              border: 1px solid #ddd;
              padding: 15px;
              background: white;
            }
            
            .header { 
              text-align: center; 
              margin-bottom: 20px; 
              border-bottom: 2px solid #9d684e;
              padding-bottom: 15px;
            }
            
            .business-name {
              font-size: 20px;
              font-weight: bold;
              color: #9d684e;
              margin-bottom: 5px;
              letter-spacing: 2px;
            }
            
            .receipt-title {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 8px;
              color: #455a54;
            }
            
            .date-info {
              font-size: 11px;
              color: #666;
            }
            
            .section { 
              margin-bottom: 15px; 
            }
            
            .business-info {
              text-align: center;
              font-size: 11px;
              color: #666;
              margin-bottom: 15px;
              border-bottom: 1px dashed #ccc;
              padding-bottom: 10px;
            }
            
            .items-table { 
              width: 100%; 
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            
            .items-table th {
              text-align: left; 
              padding: 6px 4px; 
              border-bottom: 2px solid #9d684e;
              font-size: 11px;
              font-weight: bold;
              color: #455a54;
            }
            
            .items-table td {
              text-align: left; 
              padding: 4px; 
              border-bottom: 1px dotted #ccc;
              font-size: 11px;
            }
            
            .totals-section {
              border-top: 2px solid #9d684e;
              padding-top: 10px;
              margin-bottom: 15px;
            }
            
            .total-line {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              font-size: 12px;
            }
            
            .final-total {
              display: flex;
              justify-content: space-between;
              font-size: 14px;
              font-weight: bold;
              color: #9d684e;
              border-top: 1px solid #9d684e;
              padding-top: 6px;
              margin-top: 8px;
            }
            
            .adjustment-line {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              font-size: 11px;
              color: #666;
              font-style: italic;
            }
            
            .adjustment-discount { color: #10b981; }
            .adjustment-surcharge { color: #f59e0b; }
            
            .payment-section {
              border-top: 1px dashed #ccc;
              padding-top: 10px;
              margin-bottom: 15px;
            }
            
            .footer {
              text-align: center;
              margin-top: 20px;
              padding-top: 15px;
              border-top: 2px solid #9d684e;
              font-size: 11px;
              color: #666;
            }
            
            .footer-message {
              font-weight: bold;
              color: #9d684e;
              margin-bottom: 5px;
            }
            
            .employee-info {
              font-size: 10px;
              color: #888;
              text-align: center;
              margin-bottom: 10px;
            }
            
            @media print { 
              body { margin: 0; padding: 5px; } 
              .no-print { display: none; } 
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            ${receiptSettings.receipt.showLogo ? `
              <div style="text-align: center; margin-bottom: 10px;">
                <div style="width: 60px; height: 60px; background: #9d684e; color: white; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">M</div>
              </div>
            ` : ''}
            
            <div class="header">
              <div class="business-name">${receiptSettings.receipt.businessName}</div>
              <div class="receipt-title">RECIBO DE VENTA #${sale.id.slice(-6)}</div>
              <div class="date-info">${formatDate(new Date(sale.completedAt || sale.createdAt))}</div>
            </div>

            <div class="business-info">
              ${receiptSettings.receipt.businessAddress}<br>
              ${receiptSettings.receipt.businessPhone}
            </div>

        

            <table class="items-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style="text-align: center;">Cant.</th>
                  <th style="text-align: right;">Precio</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${sale.items.map(item => `
                  <tr>
                    <td>${item.product?.name}</td>
                    <td style="text-align: center;">${item.quantity}</td>
                    <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
                    <td style="text-align: right;">${formatCurrency(item.subtotal)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="totals-section">
              <div class="total-line">
                <span>Subtotal (${sale.items.length} items):</span>
                <span>${formatCurrency(sale.subtotal)}</span>
              </div>
              
              ${sale.discount > 0 ? `
                <div class="total-line">
                  <span>Descuento:</span>
                  <span>-${formatCurrency(sale.discount)}</span>
                </div>
              ` : ''}
              
              <div class="total-line">
                <span>IVA (${receiptSettings.general.taxRate}%):</span>
                <span>${formatCurrency(sale.tax)}</span>
              </div>
              
              ${adjustmentInfo && adjustmentInfo.adjustmentType !== 'ninguno' ? `
                <div class="total-line">
                  <span>Subtotal con IVA:</span>
                  <span>${formatCurrency(adjustmentInfo.originalTotal)}</span>
                </div>
                <div class="adjustment-line ${adjustmentInfo.adjustmentType === 'descuento' ? 'adjustment-discount' : 'adjustment-surcharge'}">
                  <span>${adjustmentInfo.adjustmentType === 'descuento' ? 'Descuento' : 'Recargo'} ${getPaymentMethodConfig(sale.paymentMethod).label} (${adjustmentInfo.adjustmentPercentage}%):</span>
                  <span>${adjustmentInfo.adjustmentType === 'descuento' ? '-' : '+'}${formatCurrency(adjustmentInfo.adjustmentAmount)}</span>
                </div>
              ` : ''}
              
              <div class="final-total">
                <span>TOTAL FINAL:</span>
                <span>${formatCurrency(adjustmentInfo?.finalTotal || sale.total)}</span>
              </div>
            </div>

            <div class="payment-section">
              <div class="total-line">
                <span><strong>Método de pago:</strong></span>
                <span><strong>${getPaymentMethodConfig(sale.paymentMethod).label}</strong></span>
              </div>
              
              ${sale.cashReceived ? `
                <div class="total-line">
                  <span>Efectivo recibido:</span>
                  <span>${formatCurrency(sale.cashReceived)}</span>
                </div>
              ` : ''}
              
              ${sale.cashChange ? `
                <div class="total-line">
                  <span>Cambio:</span>
                  <span>${formatCurrency(sale.cashChange)}</span>
                </div>
              ` : ''}
            </div>

            ${sale.notes && sale.notes.trim() ? `
              <div class="section">
                <strong>Notas:</strong><br>
                <em>${sale.notes}</em>
              </div>
            ` : ''}

            ${receiptSettings.receipt.showEmployeeInfo ? `
              <div class="employee-info">
                Atendido por: ${sale.cashierId || 'Sistema'}
              </div>
            ` : ''}

            <div class="footer">
              <div class="footer-message">${receiptSettings.receipt.footerMessage}</div>
              <div>¡Vuelve pronto!</div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
    
    showToast.success('Recibo enviado a impresora');
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
          <Button 
            variant="durazno"
            onClick={() => router.push('/dashboard/sales/history')}
            className="font-winter-solid shadow-md hover:shadow-lg transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
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
              variant="naranja"
              onClick={() => router.push('/dashboard/sales/history')}
              className="font-winter-solid shadow-md hover:shadow-lg transition-all duration-200"
            >
              <ArrowLeft className='h-4 w-4 mr-2' />
              Volver al historial
            </Button>
            <div>
              <h1 className='text-2xl font-bold text-[#455a54] font-tan-nimbus'>
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
              onClick={handleEdit}
              variant="terracota"
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
                  <Receipt className='h-5 w-5 text-[#455a54]' />
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
                        {formatDate(new Date(sale.createdAt))}
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
                          {formatDate(new Date(sale.completedAt))}
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

                {sale.customerName && (
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
                          {sale.customerName}
                        </p>
                        {sale.customerEmail && (
                          <p className='text-sm font-winter-solid'>
                            <span className='text-[var(--color-verde-profundo)]'>
                              Email:
                            </span>{' '}
                            {sale.customerEmail}
                          </p>
                        )}
                        {sale.customerPhone && (
                          <p className='text-sm font-winter-solid'>
                            <span className='text-[var(--color-verde-profundo)]'>
                              Teléfono:
                            </span>{' '}
                            {sale.customerPhone}
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
                  <Package className='h-5 w-5 text-[#455a54]' />
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
                          {item.product?.name}
                        </h4>
                        <div className='flex items-center gap-4 mt-1 text-sm text-[var(--color-verde-profundo)]'>
                          <span className='font-winter-solid'>
                            Precio unitario: {formatCurrency(item.unitPrice)}
                          </span>
                          <span className='font-winter-solid'>
                            Cantidad: {item.quantity}
                          </span>
                          <Badge variant='secondary'>
                            {item.product?.category}
                          </Badge>
                        </div>
                        {item.discountAmount && item.discountAmount > 0 && (
                          <p className='text-sm text-orange-600 mt-1 font-winter-solid'>
                            Descuento(Seña): -{formatCurrency(item.discountAmount)} (
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
                <CardTitle className='text-[#455a54] font-tan-nimbus'>
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

                  {sale.discount > 0 && (
                    <div className='flex justify-between text-orange-600'>
                      <span className='font-winter-solid'>Descuento:</span>
                      <span className='font-winter-solid'>
                        -{formatCurrency(sale.discount)}
                      </span>
                    </div>
                  )}

                  <div className='flex justify-between'>
                    <span className='text-[var(--color-verde-profundo)] font-winter-solid'>
                      IVA ({(settings.taxRate * 100).toFixed(0)}%):
                    </span>
                    <span className='font-medium font-winter-solid'>
                      {formatCurrency(sale.tax)}
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

                {sale.paymentMethod === 'CASH' && (
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
                <CardTitle className='text-[#455a54] font-tan-nimbus'>
                  Acciones
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <Button
                  onClick={handlePrint}
                  className='w-full font-winter-solid'
                  variant='verde'
                >
                  <Printer className='h-4 w-4 mr-2' />
                  Imprimir Recibo
                </Button>
                <Button
                  onClick={handleEdit}
                  className='w-full font-winter-solid'
                  variant="terracota"
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
