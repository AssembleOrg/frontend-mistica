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
import { useInitialProductsData } from '@/hooks/useInitialProductsData';
import { useSessionManager } from '@/hooks/useSessionManager';
import { PaymentInfo, ProductCategory } from '@/lib/types';

// Clean UI Components
import { ProductSearchSection } from '@/components/dashboard/sales/ProductSearchSection';
import { ShoppingCartSection } from '@/components/dashboard/sales/ShoppingCartSection';
import { CheckoutSection } from '@/components/dashboard/sales/CheckoutSection';
import { SalesStatsWidget } from '@/components/dashboard/sales/sales-stats-widget';
import { SessionManager } from '@/components/dashboard/session-manager';

export default function SalesPage() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [searchResults, setSearchResults] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [isSearching, setIsSearching] = useState(false);

  // Initialize products data from backend
  console.log('🏪 Sales Page: Inicializando datos de productos');
  const { isLoading: loadingProducts, error: productsError } = useInitialProductsData();

  // Session-aware POS operations
  const sessionManager = useSessionManager({ autoCreateSession: true });
  const {
    currentSession,
    cart: sessionCart,
    cartStats,
    addProductToCart: addToSessionCart,
    removeFromCart: removeFromSessionCart,
    updateCartQuantity: updateSessionCartQuantity,
    clearCart: clearSessionCart,
    quickCheckout,
    hasActiveSession
  } = sessionManager;

  // Fallback to old system for backward compatibility
  const { searchProducts, products } = useProducts();
  const oldSalesHook = useSales();

  // Convert session cart items to CartItem format for backward compatibility
  const sessionCartAsCartItems = sessionCart.map(item => ({
    id: item.product.id,
    productId: item.product.id,
    productName: item.product.name,
    price: item.product.price,
    quantity: item.quantity,
    subtotal: item.product.price * item.quantity,
    product: item.product
  }));

  // Use session cart if available, fallback to old system
  const cart = sessionCart.length > 0 ? sessionCartAsCartItems : oldSalesHook.cart;
  const cartTotal = sessionCart.length > 0 ? cartStats.subtotal : oldSalesHook.cartTotal;
  const cartTaxAmount = sessionCart.length > 0 ? cartStats.tax : oldSalesHook.cartTaxAmount;
  const cartGrandTotal = sessionCart.length > 0 ? cartStats.total : oldSalesHook.cartGrandTotal;
  const cartItemCount = sessionCart.length > 0 ? cartStats.itemCount : oldSalesHook.cartItemCount;

  console.log('🏪 Sales Page: Productos disponibles:', products.length);
  console.log('🏪 Sales Page: Loading productos:', loadingProducts);
  console.log('🏪 Sales Page: Sesión activa:', currentSession?.id);
  console.log('🏪 Sales Page: Items en carrito de sesión:', sessionCart.length);

  // Pure event handlers - delegate to session manager
  const handleProductSelect = async (productId: string, quantity = 1) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) {
        throw new Error('Producto no encontrado');
      }

      if (hasActiveSession) {
        // Use session-aware cart management
        addToSessionCart(product, quantity);
      } else {
        // Fallback to old system
        oldSalesHook.addProductToCart(productId, quantity);
        showToast.success('Producto agregado al carrito');
      }
      
      setSelectedProductId(null);
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Error agregando producto'
      );
    }
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    try {
      if (hasActiveSession) {
        updateSessionCartQuantity(productId, quantity);
      } else {
        oldSalesHook.updateCartQuantity(productId, quantity);
      }
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Error actualizando cantidad'
      );
    }
  };

  const handleRemoveItem = (productId: string) => {
    try {
      if (hasActiveSession) {
        removeFromSessionCart(productId);
      } else {
        oldSalesHook.removeFromCart(productId);
        showToast.info('Producto removido');
      }
    } catch (_error) {
      showToast.error('Error removiendo producto');
    }
  };

  const handleClearCart = () => {
    try {
      if (hasActiveSession) {
        clearSessionCart();
      } else {
        oldSalesHook.clearCart();
        showToast.info('Carrito limpiado');
      }
    } catch (_error) {
      showToast.error('Error limpiando carrito');
    }
  };

  const handleCheckout = async (paymentInfo: PaymentInfo) => {
    try {
      if (hasActiveSession) {
        await quickCheckout(paymentInfo);
      } else {
        oldSalesHook.checkout(paymentInfo);
        showToast.success('Venta completada exitosamente');
      }
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Error procesando venta'
      );
    }
  };

  const handleSearch = async (query: string, category?: string) => {
    try {
      setIsSearching(true);
      console.log('🏪 Sales Page: Buscando productos con query:', query, 'categoria:', category);
      const results = searchProducts(query, category as ProductCategory);
      console.log('🏪 Sales Page: Resultados encontrados:', results.length);
      setSearchResults(results);
    } catch (error) {
      console.error('🏪 Sales Page: Error en búsqueda:', error);
      showToast.error(
        error instanceof Error ? error.message : 'Error en búsqueda'
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Handle loading and error states to prevent hydration issues
  if (productsError) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-600 mb-2'>Error cargando productos</h1>
          <p className='text-gray-600'>{productsError}</p>
        </div>
      </div>
    );
  }

  if (loadingProducts) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[#9d684e] mx-auto mb-2'></div>
          <p className='text-[#455a54]'>Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6 p-6'>
      {/* Session Manager */}
      <SessionManager compact={true} className="mb-4" />
      
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
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
    </div>
  );
}