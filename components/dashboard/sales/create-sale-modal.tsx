'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Minus, Trash2, Save, X, Percent } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { useSalesAPI } from '@/hooks/useSalesAPI';
import {
  CreateSaleRequest,
  SalePayment,
  UpdateSaleRequest,
  SaleItem,
  Sale,
} from '@/services/sales.service';
import { useProducts } from '@/hooks/useProducts';
import { useClientsAPI } from '@/hooks/useClientsAPI';
import { usePrepaidsAPI } from '@/hooks/usePrepaidsAPI';
import { LoadingSpinner } from '@/components/ui/loading-skeletons';
import { BarcodeScanner, BarcodeScannerRef } from './barcode-scanner';
import { PaymentsEditor, paymentsAreValid } from './payments-editor';
import { formatCurrency } from '@/lib/sales-calculations';
import type { Product } from '@/lib/types';

interface CreateSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCreated?: (sale: Sale) => void;
  // Edit mode props
  editingSale?: Sale | null;
  onSaleUpdated?: (saleId: string, updatedSale: UpdateSaleRequest) => Promise<void>;
}

export function CreateSaleModal({ isOpen, onClose, onSaleCreated, editingSale, onSaleUpdated }: CreateSaleModalProps) {
  const [clientId, setClientId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [payments, setPayments] = useState<SalePayment[]>([]);
  const [notes, setNotes] = useState('');
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientPrepaid, setClientPrepaid] = useState<{id: string, amount: number} | null>(null);
  const [usePrepaid, setUsePrepaid] = useState(false);
  const [lastProcessedBarcode, setLastProcessedBarcode] = useState<string>('');
  const [barcodeProcessingTimeout, setBarcodeProcessingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  const barcodeScannerRef = useRef<BarcodeScannerRef>(null);

  const { createSale, updateSale } = useSalesAPI();
  const { products, searchProducts } = useProducts();
  const { clients, getAllClients } = useClientsAPI();
  const { getPrepaidsByClient, getPrepaidById } = usePrepaidsAPI();

  // Load prepaid details by ID
  const loadPrepaidDetails = async (prepaidId: string) => {
    try {
      const prepaid = await getPrepaidById(prepaidId);
      setClientPrepaid({ id: prepaid.id, amount: prepaid.amount });
      showToast.success(`Seña cargada: ${formatCurrency(prepaid.amount)}`);
    } catch (error) {
      console.error('Error cargando seña:', error);
      showToast.error('Error cargando seña');
    }
  };

  // Load clients and products when modal opens
  useEffect(() => {
    if (isOpen) {
      getAllClients();
      // Force refresh products from the store
      console.log('🔄 Modal abierto, productos disponibles:', products.length);
    }
  }, [isOpen, getAllClients, products.length]);

  // Load sale data when in edit mode
  useEffect(() => {
    if (editingSale && isOpen) {
      setClientId(editingSale.clientId || '');
      setCustomerName(editingSale.customerName || '');
      setCustomerEmail(editingSale.customerEmail || '');
      setCustomerPhone(editingSale.customerPhone || '');
      setPayments(
        (editingSale.payments || []).map((p) => ({
          method: p.method,
          amount: p.amount,
          receivedAmount: p.receivedAmount,
          changeGiven: p.changeGiven,
        }))
      );
      setNotes(editingSale.notes || '');
      
      // Convert sale items to cart items
      const cartItems = editingSale.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.quantity * item.unitPrice,
      }));
      setCartItems(cartItems);
      
      // Load prepaid if exists
      if (editingSale.prepaidId) {
        // Load prepaid details
        loadPrepaidDetails(editingSale.prepaidId);
        setUsePrepaid(editingSale.consumedPrepaid || false);
      }
      
      // Load discount if exists
      if (editingSale.discount && editingSale.discount > 0) {
        setDiscountPercentage(editingSale.discount);
        setShowDiscountInput(true);
      }
    }
  }, [editingSale, isOpen]);

  // Search products when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = searchProducts(searchQuery);
      setSearchResults(results.slice(0, 5)); // Limit to 5 results
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchProducts]);

  const addProductToCart = (product: Product) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.productId === product.id);
      
      if (existingItem) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unitPrice }
            : item
        );
      } else {
        const newItem: SaleItem = {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
          subtotal: product.price,
        };
        return [...prev, newItem];
      }
    });
    
    setSearchQuery('');
    setSearchResults([]);
    showToast.success(`${product.name} agregado al carrito`);
  };

  const handleBarcodeScanned = (barcode: string) => {
    // Clear any pending timeout
    if (barcodeProcessingTimeout) {
      clearTimeout(barcodeProcessingTimeout);
      setBarcodeProcessingTimeout(null);
    }

    // Prevent processing the same barcode if it was just processed
    // if (barcode === lastProcessedBarcode) {
    //   console.log('� Barcode ya procesado recientemente:', barcode);
    //   // Clear the scanner input to prepare for next scan
    //   barcodeScannerRef.current?.clearInput();
    //   return;
    // }

    console.log('🔍 Procesando nuevo código:', barcode);
    
    // Find product by barcode
    const product = products.find(p => p.barcode === barcode);
    
    if (product) {
      // Mark as processed immediately
      setLastProcessedBarcode(barcode);
      
      // Add to cart
      addProductToCart(product);
      
      // Clear the scanner input
      barcodeScannerRef.current?.clearInput();
      
      // Clear the "last processed" after a short delay to allow for new scans
      const timeout = setTimeout(() => {
        setLastProcessedBarcode('');
        setBarcodeProcessingTimeout(null);
      }, 1500); // 1.5 seconds delay
      
      setBarcodeProcessingTimeout(timeout);
    } else {
      showToast.error('Producto no encontrado con ese código de barras');
      // Clear the scanner input even if product not found
      barcodeScannerRef.current?.clearInput();
    }
  };

  const handleClientSelect = async (selectedClientId: string) => {
    setClientId(selectedClientId);
    const selectedClient = clients.find(client => client.id === selectedClientId);
    if (selectedClient) {
      setCustomerName(selectedClient.fullName);
      setCustomerEmail(selectedClient.email || '');
      setCustomerPhone(selectedClient.phone || '');
      
      // Cargar señas del cliente automáticamente
      try {
        const response = await getPrepaidsByClient(selectedClientId);
        const pendingPrepaids = response.data?.filter(prepaid => 
          prepaid.status === 'PENDING' && prepaid.amount > 0
        ) || [];
        
        if (pendingPrepaids.length > 0) {
          // Usar la primera seña disponible
          const firstPrepaid = pendingPrepaids[0];
          setClientPrepaid({ id: firstPrepaid.id, amount: firstPrepaid.amount });
          setUsePrepaid(true);
          showToast.success(`Seña disponible: ${formatCurrency(firstPrepaid.amount)}`);
        } else {
          setClientPrepaid(null);
          setUsePrepaid(false);
        }
      } catch (error) {
        console.error('Error cargando señas del cliente:', error);
        setClientPrepaid(null);
        setUsePrepaid(false);
      }
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems(prev => prev.map(item => 
      item.productId === productId 
        ? { ...item, quantity, subtotal: quantity * item.unitPrice }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = 0; // No tax for now
    const discountAmount = (subtotal * discountPercentage) / 100;
    const subtotalAfterDiscount = subtotal - discountAmount;
    const prepaidAmount = usePrepaid && clientPrepaid ? Math.min(clientPrepaid.amount, subtotalAfterDiscount) : 0;
    const total = subtotalAfterDiscount + tax - prepaidAmount;

    return { subtotal, tax, discountAmount, prepaidAmount, total };
  };

  const { subtotal, tax, discountAmount, prepaidAmount, total } = calculateTotals();

  // Auto-actualizar la línea CASH cuando hay un solo método y cambia el total
  // (caso típico del POS rápido). Si el operador armó un split, no tocamos.
  useEffect(() => {
    if (payments.length === 0 && total > 0) {
      setPayments([{ method: 'CASH', amount: total, receivedAmount: total }]);
      return;
    }
    if (payments.length === 1 && payments[0].method === 'CASH') {
      setPayments([{
        method: 'CASH',
        amount: total,
        receivedAmount: Math.max(payments[0].receivedAmount ?? total, total),
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      showToast.error('El nombre del cliente es requerido');
      return;
    }

    if (cartItems.length === 0) {
      showToast.error('Debe agregar al menos un producto');
      return;
    }

    if (!paymentsAreValid(payments, total)) {
      showToast.error('La distribución del pago no coincide con el total');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingSale) {
        // Edit mode - usar directamente el hook
        const updateData: UpdateSaleRequest = {
          clientId: clientId || undefined,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          items: cartItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          discount: discountPercentage,
          payments,
          notes: notes.trim() || undefined,
          prepaidId: usePrepaid && clientPrepaid ? clientPrepaid.id : undefined,
          consumedPrepaid: usePrepaid,
        };

        await updateSale(editingSale.id, updateData);
        
        // Llamar callback si existe
        if (onSaleUpdated) {
          await onSaleUpdated(editingSale.id, updateData);
        }
      } else {
        // Create mode
        const saleData: CreateSaleRequest = {
          clientId: clientId || undefined,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          items: cartItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          discount: discountPercentage,
          payments,
          notes: notes.trim() || undefined,
          prepaidId: usePrepaid && clientPrepaid ? clientPrepaid.id : undefined,
          consumedPrepaid: usePrepaid,
        };

        const createdSale = await createSale(saleData);
        onSaleCreated?.(createdSale);
        showToast.success('Venta creada exitosamente');
      }
      
      // Reset form
      setClientId('');
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setPayments([]);
      setNotes('');
      setCartItems([]);
      setSearchQuery('');
      setSearchResults([]);
      setClientPrepaid(null);
      setUsePrepaid(false);
      setLastProcessedBarcode('');
      setDiscountPercentage(0);
      setShowDiscountInput(false);
      
      // Clear any pending barcode timeout
      if (barcodeProcessingTimeout) {
        clearTimeout(barcodeProcessingTimeout);
        setBarcodeProcessingTimeout(null);
      }
      
      // Clear scanner input
      barcodeScannerRef.current?.clearInput();
      onClose();
    } catch (error) {
      console.error('Error creating sale:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setPayments([]);
    setNotes('');
    setCartItems([]);
    setSearchQuery('');
    setSearchResults([]);
    setLastProcessedBarcode('');
    setDiscountPercentage(0);
    setShowDiscountInput(false);
    
    // Clear any pending barcode timeout
    if (barcodeProcessingTimeout) {
      clearTimeout(barcodeProcessingTimeout);
      setBarcodeProcessingTimeout(null);
    }
    
    // Clear scanner input
    barcodeScannerRef.current?.clearInput();
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[800px] max-h-[95vh] overflow-y-auto border-[#9d684e]/20 p-0">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <DialogTitle className="text-[#455a54] font-tan-nimbus text-lg sm:text-xl">
            {editingSale ? 'Editar Venta' : 'Crear Nueva Venta'}
          </DialogTitle>
          <DialogDescription className="font-winter-solid text-sm">
                      </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col h-full px-4 sm:px-6 pb-4 sm:pb-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Customer Information */}
            <div className="space-y-3">
              <h3 className="text-base sm:text-lg font-medium text-[#455a54] font-winter-solid">
                Información del Cliente
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="clientId" className="text-[#455a54] font-winter-solid">
                  Cliente (Opcional)
                </Label>
                <Select value={clientId} onValueChange={handleClientSelect}>
                  <SelectTrigger className="bg-white border-2 border-gray-700 hover:border-gray-800 focus:border-gray-900 focus:ring-2 focus:ring-gray-300">
                    <SelectValue placeholder="Seleccionar cliente existente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.fullName}{client.phone ? ` (${client.phone})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerName" className="text-[#455a54] font-winter-solid">
                  Nombre del Cliente *
                </Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nombre completo"
                  className="border-2 border-gray-700 focus:border-gray-900 focus:ring-2 focus:ring-gray-300"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerEmail" className="text-[#455a54] font-winter-solid">
                  Email
                </Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="border-2 border-gray-700 focus:border-gray-900 focus:ring-2 focus:ring-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone" className="text-[#455a54] font-winter-solid">
                  Teléfono
                </Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+54 11 1234-5678"
                  className="border-2 border-gray-700 focus:border-gray-900 focus:ring-2 focus:ring-gray-300"
                />
              </div>

              <PaymentsEditor
                total={total}
                value={payments}
                onChange={setPayments}
                disabled={isSubmitting}
              />

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-[#455a54] font-winter-solid">
                  Notas
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales sobre la venta..."
                  className="border-2 border-gray-700 focus:border-gray-900 focus:ring-2 focus:ring-gray-300"
                  rows={3}
                />
              </div>

              {/* Client Prepaid Info */}
              {clientPrepaid && (
                <div className={`mt-4 p-4 border rounded-lg ${
                  editingSale ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className={`font-medium ${
                        editingSale ? 'text-blue-800' : 'text-green-800'
                      }`}>
                        {editingSale ? 'Seña de la Venta' : 'Seña Disponible'}
                      </h4>
                      <p className={`text-sm ${
                        editingSale ? 'text-blue-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(clientPrepaid.amount)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="usePrepaid"
                        checked={usePrepaid}
                        onChange={(e) => setUsePrepaid(e.target.checked)}
                        disabled={!!editingSale} // Disable in edit mode
                        className={`rounded border-gray-300 focus:ring-green-500 ${
                          editingSale 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-green-600'
                        }`}
                      />
                      <label htmlFor="usePrepaid" className={`text-sm font-medium ${
                        editingSale ? 'text-blue-800' : 'text-green-800'
                      }`}>
                        {editingSale ? 'Seña aplicada' : 'Usar seña'}
                      </label>
                    </div>
                  </div>
                  {usePrepaid && (
                    <p className={`text-xs mt-2 ${
                      editingSale ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {editingSale 
                        ? 'Esta seña ya está asociada a la venta'
                        : 'La seña se aplicará automáticamente al total'
                      }
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Product Search and Cart */}
            <div className="space-y-3">
              <h3 className="text-base sm:text-lg font-medium text-[#455a54] font-winter-solid">
                Productos
              </h3>

              {/* Barcode Scanner */}
              <BarcodeScanner
                ref={barcodeScannerRef}
                onProductScanned={handleBarcodeScanned}
                isScanning={isSubmitting}
                className="mb-4"
              />

              {/* Product Search */}
              <div className="space-y-2">
                <Label htmlFor="searchQuery" className="text-[#455a54] font-winter-solid">
                  Buscar Productos
                </Label>
                <Input
                  id="searchQuery"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre o código..."
                  className="border-2 border-gray-700 focus:border-gray-900 focus:ring-2 focus:ring-gray-300"
                />
                
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addProductToCart(product)}
                        className="w-full text-left p-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-[#455a54]">{product.name}</p>
                            <p className="text-sm text-gray-500">{product.barcode}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-[#9d684e]">
                              ${product.price.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Items */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[#455a54] font-winter-solid">
                    Carrito ({cartItems.length} items)
                  </Label>
                  {cartItems.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearCart}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Limpiar
                    </Button>
                  )}
                </div>

                <div className="max-h-48 sm:max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                  {cartItems.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No hay productos en el carrito
                    </div>
                  ) : (
                    cartItems.map((item) => (
                      <div key={item.productId} className="p-2 sm:p-3 border-b border-gray-100 last:border-b-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-[#455a54] text-sm sm:text-base">{item.productName}</p>
                            <p className="text-xs sm:text-sm text-gray-500">${item.unitPrice.toFixed(2)} c/u</p>
                          </div>
                          <div className="flex items-center gap-2 sm:flex-row">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              className="h-8 w-8 p-0 touch-target"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              className="h-8 w-8 p-0 touch-target"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeFromCart(item.productId)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 touch-target"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-right mt-1">
                          <p className="font-medium text-[#9d684e] text-sm sm:text-base">
                            ${item.subtotal.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Totals */}
              {cartItems.length > 0 && (
                <div className="border-t border-gray-200 pt-3 space-y-3">
                  {/* Discount Section */}
                  <div className="space-y-2">
                    {!showDiscountInput ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDiscountInput(true)}
                        className="w-full border-[#9d684e]/30 text-[#9d684e] hover:bg-[#9d684e]/10 touch-target"
                      >
                        <Percent className="h-4 w-4 mr-2" />
                        Aplicar Descuento
                      </Button>
                    ) : (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="discountAmount" className="text-blue-800 font-winter-solid text-sm">
                            Descuento (%)
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowDiscountInput(false);
                              setDiscountPercentage(0);
                            }}
                            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          id="discountAmount"
                          type="number"
                          min="0"
                          max="100"
                          value={discountPercentage || ''}
                          onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                          placeholder="0.00%"
                          className="border-blue-300 focus:border-blue-500 focus:ring-blue-200"
                        />
                        <p className="text-xs text-blue-600">
                          Descuento: {formatCurrency(calculateTotals().discountAmount)}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Totals Summary */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {discountPercentage > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm text-blue-600">
                        <span>Descuento:</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span>Impuestos:</span>
                      <span>{formatCurrency(tax)}</span>
                    </div>
                    {usePrepaid && prepaidAmount > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm text-green-600">
                        <span>Seña aplicada:</span>
                        <span>-{formatCurrency(prepaidAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base sm:text-lg border-t border-gray-200 pt-2">
                      <span>Total:</span>
                      <span className="text-[#9d684e]">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30 touch-target"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!customerName.trim() || cartItems.length === 0 || isSubmitting}
              className="flex-1 bg-[#9d684e] hover:bg-[#9d684e]/90 text-white font-winter-solid touch-target"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Creando venta...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingSale ? 'Actualizar Venta' : 'Crear Venta'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
