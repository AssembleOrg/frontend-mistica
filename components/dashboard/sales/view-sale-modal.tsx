'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sale } from '@/services/sales.service';
import { formatCurrency } from '@/lib/sales-calculations';
import { useSalesAPI } from '@/hooks/useSalesAPI';
import { showToast } from '@/lib/toast';
import { X, Calendar, User, CreditCard, Package, DollarSign, FileText, CheckCircle, XCircle } from 'lucide-react';

interface ViewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onSaleUpdated?: () => void;
}

export function ViewSaleModal({ isOpen, onClose, sale, onSaleUpdated }: ViewSaleModalProps) {
  const [generateInvoice, setGenerateInvoice] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { updateSale } = useSalesAPI();
  
  if (!sale) return null;

  const canEdit = sale.status === 'PENDING';
  const isCompleted = sale.status === 'COMPLETED';
  const isCancelled = sale.status === 'CANCELLED';

  const handleCompleteSale = async () => {
    if (!canEdit) return;
    
    setIsUpdating(true);
    try {
      await updateSale(sale.id, {
        status: 'COMPLETED',
        // Aquí se puede agregar lógica para generar factura si generateInvoice es true
      });
      showToast.success('Venta completada exitosamente');
      onSaleUpdated?.();
    } catch (error) {
      console.error('Error completando venta:', error);
      showToast.error('Error al completar la venta');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelSale = async () => {
    if (!canEdit) return;
    
    if (!confirm('¿Estás seguro de que deseas cancelar esta venta?')) {
      return;
    }
    
    setIsUpdating(true);
    try {
      await updateSale(sale.id, {
        status: 'CANCELLED'
      });
      showToast.success('Venta cancelada exitosamente');
      onSaleUpdated?.();
    } catch (error) {
      console.error('Error cancelando venta:', error);
      showToast.error('Error al cancelar la venta');
    } finally {
      setIsUpdating(false);
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH': return 'Efectivo';
      case 'CARD': return 'Tarjeta';
      case 'TRANSFER': return 'Transferencia';
      default: return method;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completada</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pendiente</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelada</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-[#455a54] font-tan-nimbus flex items-center gap-2">
              <Package className="h-6 w-6" />
              Venta #{sale.saleNumber}
              <div className="ml-2">
                {getStatusBadge(sale.status)}
              </div>
            </DialogTitle>
            
            {canEdit && (
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="generateInvoice" 
                    checked={generateInvoice}
                    onCheckedChange={(checked) => setGenerateInvoice(checked === true)}
                  />
                  <Label htmlFor="generateInvoice" className="text-sm font-winter-solid text-[#455a54]">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Realizar Factura
                  </Label>
                </div>
                
                <Button 
                  onClick={handleCompleteSale}
                  disabled={isUpdating}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isUpdating ? 'Completando...' : 'Completar Venta'}
                </Button>
              </div>
            )}
            
            {(isCompleted || isCancelled) && (
              <div className="text-sm text-gray-500">
                {isCompleted && 'Venta completada - No editable'}
                {isCancelled && 'Venta cancelada - No editable'}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información General */}
          <Card className="border-[#9d684e]/20">
            <CardHeader>
              <CardTitle className="text-[#455a54] font-tan-nimbus flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#455a54]/70 font-winter-solid">
                    Número de Venta
                  </label>
                  <p className="text-[#455a54] font-winter-solid">{sale.saleNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#455a54]/70 font-winter-solid">
                    Fecha
                  </label>
                  <p className="text-[#455a54] font-winter-solid">
                    {new Date(sale.createdAt).toLocaleDateString('es-AR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#455a54]/70 font-winter-solid">
                    Estado
                  </label>
                  <div className="mt-1">
                    {getStatusBadge(sale.status)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#455a54]/70 font-winter-solid">
                    Método de Pago
                  </label>
                  <p className="text-[#455a54] font-winter-solid flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    {getPaymentMethodLabel(sale.paymentMethod)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información del Cliente */}
          <Card className="border-[#9d684e]/20">
            <CardHeader>
              <CardTitle className="text-[#455a54] font-tan-nimbus flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#455a54]/70 font-winter-solid">
                    Nombre
                  </label>
                  <p className="text-[#455a54] font-winter-solid">{sale.customerName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#455a54]/70 font-winter-solid">
                    Email
                  </label>
                  <p className="text-[#455a54] font-winter-solid">{sale.customerEmail || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#455a54]/70 font-winter-solid">
                    Teléfono
                  </label>
                  <p className="text-[#455a54] font-winter-solid">{sale.customerPhone || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Productos Vendidos */}
          <Card className="border-[#9d684e]/20">
            <CardHeader>
              <CardTitle className="text-[#455a54] font-tan-nimbus flex items-center gap-2">
                <Package className="h-5 w-5" />
                Productos Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sale.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-[#9d684e]/10">
                    <div className="flex-1">
                      <h4 className="font-medium text-[#455a54] font-winter-solid">
                        {item.productName || 'Producto'}
                      </h4>
                      <p className="text-sm text-[#455a54]/70 font-winter-solid">
                        Cantidad: {item.quantity} x {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-[#455a54] font-winter-solid">
                        {formatCurrency(item.subtotal)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resumen de Totales */}
          <Card className="border-[#9d684e]/20">
            <CardHeader>
              <CardTitle className="text-[#455a54] font-tan-nimbus flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Resumen de Totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-[#455a54]/70 font-winter-solid mb-1">Subtotal:</div>
                  <div className="text-[#455a54] font-winter-solid text-lg">{formatCurrency(sale.subtotal)}</div>
                </div>

                {sale.discount > 0 && (
                  <div>
                    <div className="text-blue-600 font-winter-solid mb-1">Descuento:</div>
                    <div className="text-blue-600 font-winter-solid text-lg">
                      -{formatCurrency(sale.subtotal * (sale.discount / 100))}
                      {sale.subtotal > 0 && (
                        <span className="text-sm text-blue-500 ml-2">
                          ({sale.discount} %)
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {sale.prepaidUsed && sale.prepaidUsed > 0 && (
                  <div>
                    <div className="text-green-600 font-winter-solid mb-1">Seña:</div>
                    <div className="text-green-600 font-winter-solid text-lg">-{formatCurrency(sale.prepaidUsed)}</div>
                  </div>
                )}

                {sale.tax > 0 && (
                  <div>
                    <div className="text-[#455a54]/70 font-winter-solid mb-1">Impuestos:</div>
                    <div className="text-[#455a54] font-winter-solid text-lg">{formatCurrency(sale.tax)}</div>
                  </div>
                )}

                <div className="border-t border-[#9d684e]/20 pt-4">
                  <div className="text-[#455a54] font-tan-nimbus mb-1">Total:</div>
                  <div className="text-[#9d684e] font-tan-nimbus text-2xl font-bold">{formatCurrency(sale.total)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notas */}
          {sale.notes && (
            <Card className="border-[#9d684e]/20">
              <CardHeader>
                <CardTitle className="text-[#455a54] font-tan-nimbus">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[#455a54] font-winter-solid">{sale.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-between pt-4">
          <div>
            {canEdit && (
              <Button
                onClick={handleCancelSale}
                disabled={isUpdating}
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {isUpdating ? 'Cancelando...' : 'Cancelar Venta'}
              </Button>
            )}
          </div>
          
          <Button
            onClick={onClose}
            variant="outline"
            className="border-[#9d684e] text-[#9d684e] hover:bg-[#9d684e] hover:text-white"
          >
            <X className="h-4 w-4 mr-2" />
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
