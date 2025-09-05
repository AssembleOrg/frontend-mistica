'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sale } from '@/services/sales.service';
import { formatCurrency } from '@/lib/sales-calculations';
import { X, Calendar, User, CreditCard, Package, DollarSign } from 'lucide-react';

interface ViewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export function ViewSaleModal({ isOpen, onClose, sale }: ViewSaleModalProps) {
  if (!sale) return null;

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
          <DialogTitle className="text-2xl font-bold text-[#455a54] font-tan-nimbus flex items-center gap-2">
            <Package className="h-6 w-6" />
            Venta #{sale.saleNumber}
          </DialogTitle>
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
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[#455a54]/70 font-winter-solid">Subtotal:</span>
                  <span className="text-[#455a54] font-winter-solid">{formatCurrency(sale.subtotal)}</span>
                </div>
                {sale.tax > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-[#455a54]/70 font-winter-solid">Impuestos:</span>
                    <span className="text-[#455a54] font-winter-solid">{formatCurrency(sale.tax)}</span>
                  </div>
                )}
                {sale.discount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-[#455a54]/70 font-winter-solid">Descuento (Seña):</span>
                    <span className="text-[#455a54] font-winter-solid">-{formatCurrency(sale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-[#9d684e]/20 pt-3">
                  <span className="text-lg font-bold text-[#455a54] font-tan-nimbus">Total:</span>
                  <span className="text-lg font-bold text-[#9d684e] font-tan-nimbus">{formatCurrency(sale.total)}</span>
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

        <div className="flex justify-end pt-4">
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
