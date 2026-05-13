'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Edit, 
  Receipt, 
  Pause, 
  Play, 
  Trash2,
  Clock,
  Users,
  DollarSign,
  FileText
} from 'lucide-react';
import { useServices } from '@/hooks/useServices';
import { useProducts } from '@/hooks/useProducts';
import { ServiceAssignment } from '@/stores/service.store';
import { PaymentInfo } from '@/lib/types';
import { formatCurrency } from '@/lib/sales-calculations';
import { processReceiptGeneration } from '@/lib/receipt-utils';
import { showToast } from '@/lib/toast';

export function ActiveServicesList() {
  const { 
    activeServices, 
    createNewService,
    addProductToService,
    removeProductFromService,
    updateServiceItemQuantity,
    closeServiceWithSale,
    pauseServiceAction,
    resumeServiceAction,
    getServiceStats
  } = useServices();
  
  const { searchProducts } = useProducts();
  
  const [selectedService, setSelectedService] = useState<ServiceAssignment | null>(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [isCreatingService, setIsCreatingService] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('efectivo');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [productSearch, setProductSearch] = useState('');
  const [generateInvoice, setGenerateInvoice] = useState(false);
  const [invoiceType, setInvoiceType] = useState<string>('C');
  const [customerCuit, setCustomerCuit] = useState('');
  const [customerIva, setCustomerIva] = useState('');

  const stats = getServiceStats();
  
  const handleCreateService = async () => {
    if (!newServiceName.trim()) return;
    
    try {
      setIsCreatingService(true);
      await createNewService(newServiceName.trim());
      setNewServiceName('');
    } finally {
      setIsCreatingService(false);
    }
  };

  const handleAddProduct = (serviceId: string, productId: string) => {
    addProductToService(serviceId, productId, 1);
  };

  const handleCloseService = async () => {
    if (!selectedService) return;
    
    // Validar lógica de facturación
    if (selectedService.totalAmount > 200000 && generateInvoice) {
      if (!customerCuit) {
        showToast.error('Para servicios superiores a $200,000 con factura, se requiere CUIT del cliente');
        return;
      }
      
      if (invoiceType === 'A' && (!customerCuit || !customerIva)) {
        showToast.error('Para factura tipo A se requiere CUIT e IVA del cliente');
        return;
      }
    }
    
    const paymentInfo: PaymentInfo = {
      method: paymentMethod,
      amount: selectedService.totalAmount,
      received: paymentMethod === 'efectivo' ? cashReceived : selectedService.totalAmount,
      change: paymentMethod === 'efectivo' ? Math.max(0, cashReceived - selectedService.totalAmount) : 0,
    };

    try {
      const result = await closeServiceWithSale(selectedService.id, paymentInfo);
      
      // Generar comprobante o factura según la selección
      if (result?.sale) {
        const saleWithInvoiceData = {
          ...result.sale,
          customerCuit,
          customerIva,
          invoiceType: generateInvoice ? invoiceType : undefined
        };
        processReceiptGeneration(saleWithInvoiceData, generateInvoice);
      }
      
      setPaymentDialogOpen(false);
      setSelectedService(null);
      setCashReceived(0);
      setGenerateInvoice(false);
      setInvoiceType('C');
      setCustomerCuit('');
      setCustomerIva('');
    } catch (error) {
      // Error handling is done in the hook
      console.error('Error closing service:', error);
    }
  };

  const getServiceStatusBadge = (status: ServiceAssignment['status']) => {
    const config = {
      active: { label: 'Activo', color: 'bg-green-100 text-green-800' },
      paused: { label: 'Pausado', color: 'bg-yellow-100 text-yellow-800' },
      closed: { label: 'Cerrado', color: 'bg-gray-100 text-gray-800' },
      cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' }
    };
    
    const { label, color } = config[status];
    return <Badge className={color}>{label}</Badge>;
  };

  const formatServiceTime = (startTime: Date) => {
    const now = new Date();
    const diff = now.getTime() - startTime.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Servicios Activos</p>
                <p className="text-2xl font-bold">{stats.activeCount}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completados Hoy</p>
                <p className="text-2xl font-bold">{stats.completedToday}</p>
              </div>
              <Receipt className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ingresos Hoy</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.todayRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create New Service */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Crear Nuevo Servicio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Nombre del servicio (ej: Mesa 1, Delivery #123)"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateService()}
              className="flex-1"
            />
            <Button 
              onClick={handleCreateService}
              disabled={!newServiceName.trim() || isCreatingService}
            >
              {isCreatingService ? 'Creando...' : 'Crear'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeServices.map((service) => (
          <Card key={service.id} className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{service.serviceName}</CardTitle>
                {getServiceStatusBadge(service.status)}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mr-1" />
                {formatServiceTime(service.startTime)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Service Items */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Items ({service.items.length})</h4>
                {service.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin productos</p>
                ) : (
                  <div className="space-y-1">
                    {service.items.slice(0, 3).map((item) => (
                      <div key={item.productId} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.productName}</span>
                        <span>{formatCurrency(item.totalPrice)}</span>
                      </div>
                    ))}
                    {service.items.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{service.items.length - 3} más...
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Total Amount */}
              <div className="border-t pt-2">
                <div className="flex justify-between font-medium">
                  <span>Total:</span>
                  <span>{formatCurrency(service.totalAmount)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Editar Servicio: {service.serviceName}</DialogTitle>
                      <DialogDescription>
                        Agrega o modifica productos en el servicio
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Add Product */}
                      <div>
                        <Input
                          placeholder="Buscar productos..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                        />
                        {productSearch && (
                          <div className="mt-2 border rounded-md max-h-32 overflow-y-auto">
                            {searchProducts(productSearch).slice(0, 5).map((product) => (
                              <button
                                key={product.id}
                                className="w-full text-left p-2 hover:bg-gray-50 border-b last:border-b-0"
                                onClick={() => {
                                  handleAddProduct(service.id, product.id);
                                  setProductSearch('');
                                }}
                              >
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-gray-600">
                                  {formatCurrency(product.price)} - Stock: {product.stock}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Current Items */}
                      <div className="space-y-2">
                        <h4 className="font-medium">Items Actuales</h4>
                        {service.items.map((item) => (
                          <div key={item.productId} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex-1">
                              <div className="font-medium">{item.productName}</div>
                              <div className="text-sm text-gray-600">
                                {formatCurrency(item.unitPrice)} c/u
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateServiceItemQuantity(service.id, item.productId, item.quantity - 1)}
                              >
                                -
                              </Button>
                              <span className="min-w-[2rem] text-center">{item.quantity}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateServiceItemQuantity(service.id, item.productId, item.quantity + 1)}
                              >
                                +
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeProductFromService(service.id, item.productId)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {service.status === 'active' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pauseServiceAction(service.id)}
                  >
                    <Pause className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resumeServiceAction(service.id)}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                )}

                <Button
                  variant="default"
                  size="sm"
                  disabled={service.items.length === 0}
                  onClick={() => {
                    setSelectedService(service);
                    setPaymentDialogOpen(true);
                  }}
                  className="bg-[#9d684e] hover:bg-[#8a5a45]"
                >
                  <Receipt className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeServices.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay servicios activos</h3>
            <p className="text-muted-foreground mb-4">
              Crea un nuevo servicio para comenzar a gestionar comandas
            </p>
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Servicio: {selectedService?.serviceName}</DialogTitle>
            <DialogDescription>
              Procesar pago y generar venta
            </DialogDescription>
          </DialogHeader>
          
          {selectedService && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-2">Resumen</h4>
                <div className="space-y-1 text-sm">
                  {selectedService.items.map((item) => (
                    <div key={item.productId} className="flex justify-between">
                      <span>{item.quantity}x {item.productName}</span>
                      <span>{formatCurrency(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>{formatCurrency(selectedService.totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Método de Pago</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="mixto">Pago Mixto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === 'efectivo' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Efectivo Recibido</label>
                  <Input
                    type="number"
                    value={cashReceived || ''}
                    onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    step="0.01"
                  />
                  {cashReceived > 0 && (
                    <div className="mt-2 text-sm">
                      <strong>Cambio: </strong>
                      {formatCurrency(Math.max(0, cashReceived - selectedService.totalAmount))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="generateInvoiceService"
                    checked={generateInvoice}
                    onCheckedChange={(checked) => setGenerateInvoice(checked === true)}
                  />
                  <Label htmlFor="generateInvoiceService" className="text-sm font-medium text-[#455a54]">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Realizar Factura
                  </Label>
                </div>

                {generateInvoice && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="invoiceType">Tipo de factura</Label>
                        <Select value={invoiceType} onValueChange={setInvoiceType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">Factura A</SelectItem>
                            <SelectItem value="B">Factura B</SelectItem>
                            <SelectItem value="C">Factura C</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="customerCuit">CUIT del cliente</Label>
                        <Input
                          id="customerCuit"
                          placeholder="CUIT"
                          value={customerCuit}
                          onChange={(e) => setCustomerCuit(e.target.value)}
                        />
                      </div>
                    </div>

                    {invoiceType === 'A' && (
                      <div>
                        <Label htmlFor="customerIva">Alícuota IVA</Label>
                        <Select value={customerIva} onValueChange={setCustomerIva}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar alícuota IVA" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="21">21%</SelectItem>
                            <SelectItem value="10.5">10.5%</SelectItem>
                            <SelectItem value="27">27%</SelectItem>
                            <SelectItem value="0">0% (Exento)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setPaymentDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCloseService}
                  disabled={paymentMethod === 'efectivo' && cashReceived < selectedService.totalAmount}
                  className="flex-1 bg-[#9d684e] hover:bg-[#8a5a45]"
                >
                  Procesar Pago
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}