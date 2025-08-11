/**
 * CAPA 4: PRESENTATION LAYER - SALES PAGE (CLEAN VERSION)
 *
 * Componente UI PURO que solo renderiza y delega al controller
 * Sin lógica de negocio, sin acceso directo a stores
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showToast } from '@/lib/toast';
import { useSales } from '@/hooks/useSales';
import { useProducts } from '@/hooks/useProducts';
import { PaymentInfo } from '@/lib/types';

// Clean UI Components
import { ProductSearchSection } from '@/components/dashboard/sales/ProductSearchSection';
import { ShoppingCartSection } from '@/components/dashboard/sales/ShoppingCartSection';
import { CheckoutSection } from '@/components/dashboard/sales/CheckoutSection';
import { SalesStatsWidget } from '@/components/dashboard/sales/sales-stats-widget';

export default function SalesPage() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [searchResults, setSearchResults] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [isSearching, setIsSearching] = useState(false);

  // Simple hooks API
  const { 
    cart, 
    cartTotal, 
    cartTaxAmount, 
    cartGrandTotal, 
    cartItemCount,
    addProductToCart, 
    removeFromCart, 
    updateCartQuantity, 
    clearCart, 
    checkout 
  } = useSales();
  const { searchProducts } = useProducts();

  // Pure event handlers - delegate to hooks
  const handleProductSelect = async (productId: string, quantity = 1) => {
    try {
      addProductToCart(productId, quantity);
      showToast.success('Producto agregado al carrito');
      setSelectedProductId(null);
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Error agregando producto'
      );
    }
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    try {
      updateCartQuantity(productId, quantity);
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Error actualizando cantidad'
      );
    }
  };

  const handleRemoveItem = (productId: string) => {
    try {
      removeFromCart(productId);
      showToast.info('Producto removido');
    } catch (_error) {
      showToast.error('Error removiendo producto');
    }
  };

  const handleClearCart = () => {
    try {
      clearCart();
      showToast.info('Carrito limpiado');
    } catch (_error) {
      showToast.error('Error limpiando carrito');
    }
  };

  const handleCheckout = async (paymentInfo: PaymentInfo) => {
    try {
      checkout(paymentInfo.method, paymentInfo.cashReceived);
      showToast.success('Venta completada exitosamente');
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Error procesando venta'
      );
    }
  };

  const handleSearch = async (query: string, _category?: string) => {
    try {
      setIsSearching(true);
      const results = searchProducts(query);
      setSearchResults(results);
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Error en búsqueda'
      );
    } finally {
      setIsSearching(false);
    }
  };


  return (
    <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 p-6'>
      {/* Column 1: Product Search */}
      <div className='lg:col-span-1'>
        <Card className='border-[#9d684e]/20'>
          <CardHeader>
            <CardTitle className='text-[#455a54] font-tan-nimbus flex items-center gap-2'>
              🔍 Buscar Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProductSearchSection
              onSearch={handleSearch}
              searchResults={searchResults}
              isSearching={isSearching}
              onProductSelect={handleProductSelect}
              selectedProductId={selectedProductId}
              className='h-full'
            />
          </CardContent>
        </Card>
      </div>

      {/* Column 2: Shopping Cart */}
      <div className='lg:col-span-1'>
        <Card className='border-[#9d684e]/20'>
          <CardHeader>
            <CardTitle className='text-[#455a54] font-tan-nimbus flex items-center gap-2'>
              🛒 Carrito ({cartItemCount} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ShoppingCartSection
              items={cart}
              total={cartGrandTotal}
              subtotal={cartTotal}
              tax={cartTaxAmount}
              onQuantityChange={handleQuantityChange}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              isLoading={false}
              className='h-full'
            />
          </CardContent>
        </Card>
      </div>

      {/* Column 3: Checkout */}
      <div className='lg:col-span-1'>
        <div className='space-y-6'>
          {/* Checkout Section */}
          <Card className='border-[#9d684e]/20'>
            <CardHeader>
              <CardTitle className='text-[#455a54] font-tan-nimbus flex items-center gap-2'>
                💳 Checkout
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CheckoutSection
                total={cartGrandTotal}
                subtotal={cartTotal}
                tax={cartTaxAmount}
                items={cart}
                paymentMethods={[
                  { id: 'efectivo', name: 'Efectivo' },
                  { id: 'tarjeta', name: 'Tarjeta' },
                  { id: 'transferencia', name: 'Transferencia' }
                ]}
                onCheckout={handleCheckout}
                isProcessing={false}
                isDisabled={cart.length === 0}
                className='h-full'
              />
            </CardContent>
          </Card>

          {/* Sales Stats */}
          <SalesStatsWidget />
        </div>
      </div>

    </div>
  );
}