'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { AsyncSelect } from '@/components/ui/async-select';
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
import { Client, clientsService } from '@/services/clients.service';
import { productsService } from '@/services/products.service';
import { usePrepaidsAPI } from '@/hooks/usePrepaidsAPI';
import { LoadingSpinner } from '@/components/ui/loading-skeletons';
import { BarcodeScanner, BarcodeScannerRef } from './barcode-scanner';
import { PaymentsEditor, paymentsAreValid } from './payments-editor';
import { formatCurrency } from '@/lib/sales-calculations';
import type { Product } from '@/lib/types';

type AdjustmentType = 'discount' | 'surcharge';

interface CreateSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCreated?: (sale: Sale) => void;
  // Edit mode props
  editingSale?: Sale | null;
  onSaleUpdated?: (saleId: string, updatedSale: UpdateSaleRequest) => Promise<void>;
  submitButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

export function CreateSaleModal({ isOpen, onClose, onSaleCreated, editingSale, onSaleUpdated, submitButtonRef }: CreateSaleModalProps) {
  // Cliente: si `selectedClient` no es null, derivamos clientId de ahí.
  // El `customerName` (free text) se usa cuando no hay cliente seleccionado:
  // al confirmar la venta, si no hay clientId pero sí hay nombre, creamos el
  // cliente con los datos cargados manualmente.
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCuit, setCustomerCuit] = useState('');
  const [payments, setPayments] = useState<SalePayment[]>([]);
  const [notes, setNotes] = useState('');
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientPrepaid, setClientPrepaid] = useState<{id: string, amount: number} | null>(null);
  const [usePrepaid, setUsePrepaid] = useState(false);
  const [lastProcessedBarcode, setLastProcessedBarcode] = useState<string>('');
  const [barcodeProcessingTimeout, setBarcodeProcessingTimeout] = useState<NodeJS.Timeout | null>(null);
  // Ajuste sobre el subtotal: positivo = descuento, negativo = recargo.
  // En el form se controla por separado: tipo + magnitud absoluta.
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('discount');
  const [adjustmentPercentage, setAdjustmentPercentage] = useState(0);
  const [showAdjustmentInput, setShowAdjustmentInput] = useState(false);

  const barcodeScannerRef = useRef<BarcodeScannerRef>(null);

  const { createSale, updateSale } = useSalesAPI();
  const { getPrepaidsByClient, getPrepaidById } = usePrepaidsAPI();

  const clientId = selectedClient?.id ?? '';

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

  // Load sale data when in edit mode
  useEffect(() => {
    if (editingSale && isOpen) {
      // En edit cargamos el cliente fresco si la venta tenía clientId, así
      // se hidrata el AsyncSelect y los campos de CUIT/email/phone.
      if (editingSale.clientId) {
        clientsService
          .getClient(editingSale.clientId)
          .then((res) => setSelectedClient(res.data))
          .catch(() => undefined);
      }
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

      if (editingSale.prepaidId) {
        loadPrepaidDetails(editingSale.prepaidId);
        setUsePrepaid(editingSale.consumedPrepaid || false);
      }

      // Reconstruir el ajuste a partir del campo `discount` (signed):
      // positivo = descuento, negativo = recargo.
      if (editingSale.discount && editingSale.discount !== 0) {
        setAdjustmentType(editingSale.discount > 0 ? 'discount' : 'surcharge');
        setAdjustmentPercentage(Math.abs(editingSale.discount));
        setShowAdjustmentInput(true);
      }
    }
  }, [editingSale, isOpen]);

  // Fetcher para el AsyncSelect de clientes: usa el endpoint paginado con
  // search server-side. Devuelve los Client + meta de paginación.
  const fetchClients = useCallback(async (search: string, page: number, pageSize: number) => {
    const res = await clientsService.getClients(page, pageSize, search.trim() ? { search } : undefined);
    return {
      items: res.data.data,
      hasMore: res.data.meta.hasNextPage,
    };
  }, []);

  // Fetcher para productos: usa /products paginado (que también matchea por
  // barcode si la búsqueda es un código). El AsyncSelect carga 20 por página.
  const fetchProducts = useCallback(async (search: string, page: number, pageSize: number) => {
    const res = await productsService.getProducts(page, pageSize, search.trim() ? { search } : undefined);
    return {
      items: res.data.data,
      hasMore: res.data.meta.hasNextPage,
    };
  }, []);

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

    showToast.success(`${product.name} agregado al carrito`);
  };

  const handleBarcodeScanned = async (barcode: string) => {
    if (barcodeProcessingTimeout) {
      clearTimeout(barcodeProcessingTimeout);
      setBarcodeProcessingTimeout(null);
    }

    // Buscamos el producto en el backend por el código escaneado. El endpoint
    // /products paginado matchea barcode dentro del filtro `search`. Tomamos
    // el primer resultado cuyo barcode sea exactamente el escaneado, así
    // evitamos colisiones con nombres que casualmente contengan el código.
    try {
      const res = await productsService.getProducts(1, 5, { search: barcode });
      const product = res.data.data.find((p) => p.barcode === barcode) ?? res.data.data[0];

      if (!product) {
        showToast.error('Producto no encontrado con ese código de barras');
        barcodeScannerRef.current?.clearInput();
        return;
      }

      setLastProcessedBarcode(barcode);
      addProductToCart(product);
      barcodeScannerRef.current?.clearInput();

      const timeout = setTimeout(() => {
        setLastProcessedBarcode('');
        setBarcodeProcessingTimeout(null);
      }, 1500);
      setBarcodeProcessingTimeout(timeout);
    } catch (e) {
      console.error('Error buscando producto por barcode:', e);
      showToast.error('Error buscando el producto');
      barcodeScannerRef.current?.clearInput();
    }
  };

  // Cuando se elige un cliente desde el AsyncSelect: hidratamos los campos
  // del cliente y buscamos seña pendiente. Si se limpia, blanqueamos todo
  // (no tocamos el customerName porque puede estar tipeando uno nuevo).
  const handleClientChange = async (client: Client | null) => {
    setSelectedClient(client);
    if (!client) {
      setClientPrepaid(null);
      setUsePrepaid(false);
      return;
    }

    setCustomerName(client.fullName);
    setCustomerEmail(client.email || '');
    setCustomerPhone(client.phone || '');
    setCustomerCuit(client.cuit || '');

    try {
      const response = await getPrepaidsByClient(client.id);
      const pendingPrepaids = (response.data || []).filter(
        (prepaid) => prepaid.status === 'PENDING' && prepaid.amount > 0,
      );

      if (pendingPrepaids.length > 0) {
        const first = pendingPrepaids[0];
        setClientPrepaid({ id: first.id, amount: first.amount });
        setUsePrepaid(true);
        showToast.success(`Seña disponible: ${formatCurrency(first.amount)}`);
      } else {
        setClientPrepaid(null);
        setUsePrepaid(false);
      }
    } catch (error) {
      console.error('Error cargando señas del cliente:', error);
      setClientPrepaid(null);
      setUsePrepaid(false);
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

  // El backend recibe `discount` con signo: positivo = descuento, negativo = recargo.
  const signedDiscount = adjustmentType === 'discount' ? adjustmentPercentage : -adjustmentPercentage;

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = 0;
    // adjustmentAmount > 0 reduce el subtotal (descuento), < 0 lo aumenta (recargo).
    const adjustmentAmount = (subtotal * signedDiscount) / 100;
    const subtotalAfterAdjustment = subtotal - adjustmentAmount;
    const prepaidAmount = usePrepaid && clientPrepaid ? Math.min(clientPrepaid.amount, subtotalAfterAdjustment) : 0;
    const total = subtotalAfterAdjustment + tax - prepaidAmount;

    return { subtotal, tax, adjustmentAmount, prepaidAmount, total };
  };

  const { subtotal, tax, adjustmentAmount, prepaidAmount, total } = calculateTotals();

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

  const resetForm = () => {
    setSelectedClient(null);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setCustomerCuit('');
    setPayments([]);
    setNotes('');
    setCartItems([]);
    setClientPrepaid(null);
    setUsePrepaid(false);
    setLastProcessedBarcode('');
    setAdjustmentType('discount');
    setAdjustmentPercentage(0);
    setShowAdjustmentInput(false);

    if (barcodeProcessingTimeout) {
      clearTimeout(barcodeProcessingTimeout);
      setBarcodeProcessingTimeout(null);
    }
    barcodeScannerRef.current?.clearInput();
  };

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
      // Auto-create del cliente cuando se cargó manualmente (no se eligió uno
      // del dropdown). Si falla la creación dejamos seguir la venta sin
      // clientId — los datos quedan en customerName/Email/Phone igual.
      let effectiveClientId = clientId;
      if (!editingSale && !effectiveClientId && customerName.trim()) {
        try {
          const created = await clientsService.createClient({
            fullName: customerName.trim(),
            email: customerEmail.trim() || undefined,
            phone: customerPhone.trim() || undefined,
            cuit: customerCuit.trim() || undefined,
          });
          effectiveClientId = created.data.id;
          showToast.success(`Cliente "${created.data.fullName}" creado`);
        } catch (err) {
          console.warn('No se pudo crear el cliente, se sigue como venta sin clientId', err);
        }
      }

      const basePayload = {
        clientId: effectiveClientId || undefined,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        items: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        discount: signedDiscount,
        payments,
        notes: notes.trim() || undefined,
        prepaidId: usePrepaid && clientPrepaid ? clientPrepaid.id : undefined,
        consumedPrepaid: usePrepaid,
      } as const;

      if (editingSale) {
        const updateData: UpdateSaleRequest = { ...basePayload };
        await updateSale(editingSale.id, updateData);
        if (onSaleUpdated) {
          await onSaleUpdated(editingSale.id, updateData);
        }
      } else {
        const saleData: CreateSaleRequest = { ...basePayload };
        const createdSale = await createSale(saleData);
        onSaleCreated?.(createdSale);
      }

      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating sale:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[800px] max-h-[95vh] overflow-y-auto border-[#9d684e]/20 p-0">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <DialogTitle className="text-[#455a54] font-tan-nimbus text-lg sm:text-xl">
            {editingSale ? 'Editar Venta' : 'Crear Nueva Venta'}
          </DialogTitle>
          <DialogDescription className="font-winter-solid text-sm text-[#455a54]/50">
            <kbd className="px-1 py-0.5 text-[10px] font-mono bg-[#455a54]/8 border border-[#455a54]/20 rounded leading-none">F2</kbd> guardar &nbsp;·&nbsp; <kbd className="px-1 py-0.5 text-[10px] font-mono bg-[#455a54]/8 border border-[#455a54]/20 rounded leading-none">Esc</kbd> cerrar
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col h-full px-4 sm:px-6 pb-4 sm:pb-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Customer Information */}
            <div className="space-y-3">
              <h3 className="text-base sm:text-lg font-medium text-[#455a54] font-winter-solid">
                Información del Cliente
              </h3>
              
              {/* Selector de cliente: doble función como input de nombre.
                  Si se elige uno existente, hidrata email/teléfono/cuit.
                  Si se tipea libre y no se elige, al confirmar venta se crea. */}
              <div className="space-y-1.5">
                <Label className="text-xs text-[#455a54] font-winter-solid">
                  Cliente <span className="text-[#455a54]/50">(buscar o tipear nuevo)</span>
                </Label>
                <AsyncSelect<Client>
                  value={selectedClient}
                  onChange={handleClientChange}
                  fetcher={fetchClients}
                  getKey={(c) => c.id}
                  getLabel={(c) => c.fullName}
                  renderOption={(c) => (
                    <div className="flex justify-between items-center w-full gap-2">
                      <span className="font-medium text-[#455a54] truncate">{c.fullName}</span>
                      <span className="text-xs text-[#455a54]/60 truncate">
                        {[c.cuit, c.phone].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  )}
                  placeholder="Nombre completo *"
                  allowFreeText
                  freeTextValue={customerName}
                  onFreeTextChange={setCustomerName}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="customerCuit" className="text-xs text-[#455a54] font-winter-solid">
                    CUIT
                  </Label>
                  <Input
                    id="customerCuit"
                    value={customerCuit}
                    onChange={(e) => setCustomerCuit(e.target.value)}
                    placeholder="20-12345678-9"
                    className="h-9 border-[#9d684e]/20 focus:border-[#9d684e]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="customerPhone" className="text-xs text-[#455a54] font-winter-solid">
                    Teléfono
                  </Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+54 11 1234-5678"
                    className="h-9 border-[#9d684e]/20 focus:border-[#9d684e]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="customerEmail" className="text-xs text-[#455a54] font-winter-solid">
                  Email
                </Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="h-9 border-[#9d684e]/20 focus:border-[#9d684e]"
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

              {/* Product Search: paginado + virtual scroll. Cada selección agrega
                  al carrito y limpia la query para seguir buscando rápido. */}
              <div className="space-y-1.5">
                <Label className="text-xs text-[#455a54] font-winter-solid">
                  Buscar Productos
                </Label>
                <AsyncSelect<Product>
                  value={null}
                  onChange={(p) => p && addProductToCart(p)}
                  fetcher={fetchProducts}
                  getKey={(p) => p.id}
                  getLabel={(p) => p.name}
                  renderOption={(p) => (
                    <div className="flex justify-between items-center w-full gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-[#455a54] truncate">{p.name}</p>
                        <p className="text-xs text-[#455a54]/60 truncate">{p.barcode || '—'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-medium text-[#9d684e] text-sm">${p.price.toFixed(2)}</p>
                        <p className="text-[10px] text-[#455a54]/60">Stock: {p.stock}</p>
                      </div>
                    </div>
                  )}
                  placeholder="Buscar por nombre o código..."
                  rowHeight={56}
                />
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
                  {/* Adjustment Section: descuento o recargo (excluyentes). */}
                  <div className="space-y-2">
                    {!showAdjustmentInput ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAdjustmentInput(true)}
                        className="w-full border-[#9d684e]/30 text-[#9d684e] hover:bg-[#9d684e]/10 touch-target"
                      >
                        <Percent className="h-4 w-4 mr-2" />
                        Aplicar Descuento o Recargo
                      </Button>
                    ) : (
                      <div className="p-3 bg-[#efcbb9]/20 border border-[#9d684e]/20 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1 rounded-md bg-white border border-[#9d684e]/20 p-0.5">
                            <button
                              type="button"
                              onClick={() => setAdjustmentType('discount')}
                              className={
                                'px-2 py-1 text-xs rounded font-winter-solid transition ' +
                                (adjustmentType === 'discount'
                                  ? 'bg-[#9d684e] text-white'
                                  : 'text-[#455a54] hover:bg-[#9d684e]/10')
                              }
                            >
                              Descuento
                            </button>
                            <button
                              type="button"
                              onClick={() => setAdjustmentType('surcharge')}
                              className={
                                'px-2 py-1 text-xs rounded font-winter-solid transition ' +
                                (adjustmentType === 'surcharge'
                                  ? 'bg-[#9d684e] text-white'
                                  : 'text-[#455a54] hover:bg-[#9d684e]/10')
                              }
                            >
                              Recargo
                            </button>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowAdjustmentInput(false);
                              setAdjustmentPercentage(0);
                            }}
                            className="h-6 w-6 p-0 text-[#9d684e] hover:text-[#9d684e]/80"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={adjustmentPercentage || ''}
                          onChange={(e) => setAdjustmentPercentage(parseFloat(e.target.value) || 0)}
                          placeholder="0.00%"
                          className="border-[#9d684e]/20 focus:border-[#9d684e]"
                        />
                        <p className="text-xs text-[#455a54]/70">
                          {adjustmentType === 'discount' ? 'Descuento' : 'Recargo'}:{' '}
                          {formatCurrency(Math.abs(adjustmentAmount))}
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
                    {adjustmentPercentage > 0 && (
                      <div
                        className={
                          'flex justify-between text-xs sm:text-sm ' +
                          (adjustmentType === 'discount' ? 'text-blue-600' : 'text-orange-600')
                        }
                      >
                        <span>{adjustmentType === 'discount' ? 'Descuento' : 'Recargo'}:</span>
                        <span>
                          {adjustmentType === 'discount' ? '-' : '+'}
                          {formatCurrency(Math.abs(adjustmentAmount))}
                        </span>
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
              ref={submitButtonRef}
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
                  <kbd className="ml-2 px-1 py-0.5 text-[10px] font-mono bg-white/20 border border-white/40 rounded leading-none">F2</kbd>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
