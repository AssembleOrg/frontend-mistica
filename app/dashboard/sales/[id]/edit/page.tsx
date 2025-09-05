/**
 * CAPA 4: PRESENTATION LAYER - EDIT SALE PAGE (CLEAN VERSION)
 * 
 * Página UI PURA que solo renderiza y delega al controller
 * Sin lógica de negocio, sin acceso directo a stores
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Save,
  X,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  Search,
  Package,
  User,
  CreditCard,
  Receipt,
} from 'lucide-react';
import { Sale, SaleItem, Product } from '@/lib/types';
import { showToast } from '@/lib/toast';
import { formatCurrency } from '@/lib/sales-calculations';
import { useProducts } from '@/hooks/useProducts';
import { useSales } from '@/hooks/useSales';
import { PAYMENT_METHODS } from '@/lib/payment-methods';
// Removed unused Dialog imports

export default function EditSalePage() {
  const router = useRouter();
  const params = useParams();
  const saleId = params.id as string;
  
  // Simple hooks API
  const { searchProducts } = useProducts();
  const { getSaleById, editSale, canEditSale } = useSales();
  
  const [sale, setSale] = useState<Sale | null>(null);
  const [editedItems, setEditedItems] = useState<SaleItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<Sale['paymentMethod']>('efectivo');
  const [notes, setNotes] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);

  useEffect(() => {
    if (saleId) {
      const foundSale = getSaleById(saleId);
      if (foundSale) {
        setSale(foundSale);
        setEditedItems([...foundSale.items]);
        setCustomerInfo({
          name: foundSale.customerInfo?.name || '',
          email: foundSale.customerInfo?.email || '',
          phone: foundSale.customerInfo?.phone || '',
        });
        setPaymentMethod(foundSale.paymentMethod);
        setNotes(foundSale.notes || '');
        setCashReceived(foundSale.cashReceived?.toString() || '');
      }
      setIsLoading(false);
    }
  }, [saleId, getSaleById]);

  useEffect(() => {
    if (searchQuery.trim()) {
      // Use simple search function
      const results = searchProducts(searchQuery);
      setSearchResults(results.slice(0, 10));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchProducts]);

  // Calculate totals manually - MEMOIZED to prevent re-renders
  const totals = useMemo(() => {
    const subtotal = editedItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const discountTotal = editedItems.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
    const adjustedSubtotal = subtotal - discountTotal;
    const taxAmount = adjustedSubtotal * 0.21; // 21% tax rate
    const total = adjustedSubtotal + taxAmount;
    
    return {
      subtotal,
      discountTotal,
      taxAmount,
      total,
    };
  }, [editedItems]);

  const updateItemQuantity = useCallback((itemId: string, newQuantity: number) => {
    setEditedItems(items => {
      if (newQuantity <= 0) {
        // Remove item directly instead of calling removeItem to avoid dependency
        return items.filter(item => item.id !== itemId);
      }
      
      return items.map(item =>
        item.id === itemId
          ? {
              ...item,
              quantity: newQuantity,
              subtotal: newQuantity * item.unitPrice - (item.discountAmount || 0),
            }
          : item
      );
    });
  }, []);

  const updateItemDiscount = useCallback((itemId: string, discountPercentage: number) => {
    setEditedItems(items =>
      items.map(item =>
        item.id === itemId
          ? {
              ...item,
              discountPercentage,
              discountAmount: (item.unitPrice * item.quantity * discountPercentage) / 100,
              subtotal: (item.unitPrice * item.quantity) - ((item.unitPrice * item.quantity * discountPercentage) / 100),
            }
          : item
      )
    );
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setEditedItems(items => items.filter(item => item.id !== itemId));
  }, []);

  const addProduct = useCallback((product: Product) => {
    setEditedItems(items => {
      const existingItemIndex = items.findIndex(item => item.productId === product.id);
      
      if (existingItemIndex >= 0) {
        // Si ya existe, aumentar cantidad
        return items.map((item, index) =>
          index === existingItemIndex
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.unitPrice - (item.discountAmount || 0),
              }
            : item
        );
      } else {
        // Agregar nuevo item
        const newItem: SaleItem = {
          id: crypto.randomUUID(),
          productId: product.id,
          product: { ...product },
          quantity: 1,
          unitPrice: product.price,
          subtotal: product.price,
        };
        return [...items, newItem];
      }
    });
    
    setSearchQuery('');
    showToast.success(`${product.name} agregado`);
  }, []);

  const handleSave = useCallback(async () => {
    if (!sale) {
      showToast.error('Venta no encontrada');
      return;
    }

    // Check if sale can be edited
    if (!canEditSale(sale)) {
      showToast.error('Esta venta no puede ser editada');
      return;
    }

    setIsSaving(true);
    
    try {
      const success = editSale(saleId, {
        paymentMethod,
        notes,
        customerInfo,
        items: editedItems.map(it => ({
          productId: it.productId,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
          discountPercentage: it.discountPercentage
        }))
      });
      
      if (success) {
        showToast.success('Venta actualizada correctamente');
        router.push(`/dashboard/sales/${saleId}`);
      } else {
        showToast.error('No se pudo actualizar la venta');
      }
    } catch (_error) {
      showToast.error('Error al actualizar la venta');
    } finally {
      setIsSaving(false);
    }
  }, [sale, canEditSale, editSale, saleId, paymentMethod, notes, customerInfo, router]);

  const handleCancel = useCallback(() => {
    if (confirm('¿Estás seguro de que deseas cancelar? Se perderán todos los cambios.')) {
      router.push(`/dashboard/sales/${saleId}`);
    }
  }, [router, saleId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--color-rosa-claro)]/20 to-[var(--color-durazno)]/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-verde-profundo)] mx-auto mb-4"></div>
          <p className="text-[var(--color-verde-profundo)]">Cargando venta...</p>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--color-rosa-claro)]/20 to-[var(--color-durazno)]/20 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Venta no encontrada</h2>
          <p className="text-gray-600 mb-4">
            No se puede editar la venta #{saleId.slice(-6)}.
          </p>
          <Button 
            variant="naranja"
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--color-rosa-claro)]/20 to-[var(--color-durazno)]/20">
      <div className="container mx-auto p-4 xl:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/sales/${saleId}`)}
              className="border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancelar edición
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#455a54] font-tan-nimbus">
                Editar Venta #{sale.id.slice(-6)}
              </h1>
              <p className="text-[#455a54] font-winter-solid">
                Modifica los productos, cantidades y detalles de la venta
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleCancel} variant="outline" disabled={isSaving}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-[#9d684e] hover:bg-[#9d684e]/90">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel izquierdo - Productos y búsqueda */}
          <div className="lg:col-span-2 space-y-6">
            {/* Agregar productos */}
            <Card className="border-[var(--color-gris-claro)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-[#455a54]" />
                  <span className="font-tan-nimbus">Agregar Productos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Buscar productos por nombre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button disabled>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {searchResults.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 bg-white rounded border hover:bg-[var(--color-rosa-claro)]/30 cursor-pointer"
                        onClick={() => addProduct(product)}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-[var(--color-ciruela-oscuro)]">{product.name}</p>
                          <p className="text-sm text-[var(--color-verde-profundo)]">
                            Stock: {product.stock} | {formatCurrency(product.price)}
                          </p>
                        </div>
                        <Badge variant="secondary">{product.category}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lista de productos en la venta */}
            <Card className="border-[var(--color-gris-claro)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-[#455a54]" />
                  <span className="font-tan-nimbus">Productos en la Venta ({editedItems.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editedItems.length === 0 ? (
                  <div className="text-center py-8 text-[var(--color-ciruela-oscuro)]/70">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay productos en la venta</p>
                    <p className="text-sm">Busca y agrega productos arriba</p>
                  </div>
                ) : (
                  editedItems.map((item) => (
                    <div key={item.id} className="p-4 border border-[var(--color-gris-claro)] rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-[var(--color-ciruela-oscuro)]">{item.product.name}</h4>
                          <p className="text-sm text-[var(--color-verde-profundo)]">
                            Precio unitario: {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                        <Button
                          onClick={() => removeItem(item.id)}
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Control de cantidad */}
                        <div className="space-y-2">
                          <Label>Cantidad</Label>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                              className="w-20 text-center"
                              min="1"
                            />
                            <Button
                              onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Control de descuento */}
                        <div className="space-y-2">
                          <Label>Descuento (%)</Label>
                          <Input
                            type="number"
                            value={item.discountPercentage || 0}
                            onChange={(e) => updateItemDiscount(item.id, parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-[var(--color-gris-claro)]/50">
                        <div className="text-sm text-[var(--color-verde-profundo)]">
                          {item.discountAmount && item.discountAmount > 0 && (
                            <span className="text-orange-600">
                              Desc: -{formatCurrency(item.discountAmount)}
                            </span>
                          )}
                        </div>
                        <div className="text-lg font-bold text-[var(--color-ciruela-oscuro)]">
                          {formatCurrency(item.subtotal)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Panel derecho - Información de pago y cliente */}
          <div className="space-y-6">
            {/* Resumen de totales */}
            <Card className="border-[var(--color-gris-claro)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-[var(--color-verde-profundo)]" />
                  <span className="font-tan-nimbus">Resumen</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-verde-profundo)]">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  
                  {totals.discountTotal > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>Descuentos:</span>
                      <span>-{formatCurrency(totals.discountTotal)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-[var(--color-verde-profundo)]">IVA (21%):</span>
                    <span className="font-medium">{formatCurrency(totals.taxAmount)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold text-[var(--color-ciruela-oscuro)]">
                    <span>Total:</span>
                    <span>{formatCurrency(totals.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información de pago */}
            <Card className="border-[var(--color-gris-claro)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-[#455a54]" />
                  <span className="font-tan-nimbus">Método de Pago</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Método de pago</Label>
                  <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as typeof paymentMethod)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {paymentMethod === 'efectivo' && (
                  <div className="space-y-2">
                    <Label>Efectivo recibido</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="0.00"
                    />
                    {parseFloat(cashReceived) > totals.total && (
                      <p className="text-sm text-green-600">
                        Cambio: {formatCurrency(parseFloat(cashReceived) - totals.total)}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Información del cliente */}
            <Card className="border-[var(--color-gris-claro)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-[#455a54]" />
                  <span className="font-tan-nimbus">Cliente (Opcional)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nombre del cliente"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@ejemplo.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+52 123 456 7890"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notas */}
            <Card className="border-[var(--color-gris-claro)]">
              <CardHeader>
                <CardTitle className="font-tan-nimbus">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales sobre la venta..."
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
