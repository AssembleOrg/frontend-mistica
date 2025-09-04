/**
 * Services Hook - Integrates service.store with POS system
 */

import { useCallback } from 'react';
import { useServiceStore, ServiceAssignment } from '@/stores/service.store';
import { useAppStore } from '@/stores/app.store';
import { useSettingsStore } from '@/stores/settings.store';
import { Product, Sale, PaymentInfo } from '@/lib/types';
import { showToast } from '@/lib/toast';

export function useServices() {
  const {
    services,
    activeServices,
    createService,
    updateService,
    addItemToService,
    removeItemFromService,
    updateServiceItem,
    closeService,
    cancelService,
    pauseService,
    resumeService,
    getActiveServices,
    getServiceHistory,
    getTodaysRevenue
  } = useServiceStore();

  const { completeSale, products } = useAppStore();
  const { actions: settingsActions } = useSettingsStore();

  // Create a new service (mesa, delivery, etc.)
  const createNewService = useCallback((serviceName: string, employeeName: string = 'Sistema') => {
    try {
      const serviceId = createService({
        serviceId: serviceName,
        serviceName,
        employeeId: 'user',
        employeeName,
        status: 'active',
        startTime: new Date(),
        items: []
      });
      
      showToast.success(`Servicio "${serviceName}" creado`);
      return serviceId;
    } catch (error) {
      showToast.error('Error creando servicio');
      throw error;
    }
  }, [createService]);

  // Add product to service
  const addProductToService = useCallback((serviceId: string, productId: string, quantity: number = 1) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error('Producto no encontrado');
      
      // Check stock
      if (product.stock < quantity) throw new Error(`Stock insuficiente. Disponible: ${product.stock}`);
      
      addItemToService(serviceId, {
        productId,
        productName: product.name,
        quantity,
        unitPrice: product.price
      });
      
      showToast.success(`${product.name} agregado al servicio`);
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Error agregando producto');
      throw error;
    }
  }, [addItemToService, products]);

  // Remove product from service
  const removeProductFromService = useCallback((serviceId: string, productId: string) => {
    try {
      removeItemFromService(serviceId, productId);
      showToast.success('Producto removido del servicio');
    } catch (error) {
      showToast.error('Error removiendo producto');
      throw error;
    }
  }, [removeItemFromService]);

  // Update item quantity in service
  const updateServiceItemQuantity = useCallback((serviceId: string, productId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        removeProductFromService(serviceId, productId);
        return;
      }

      // Check stock availability
      const product = products.find(p => p.id === productId);
      if (product && product.stock < quantity) {
        throw new Error(`Stock insuficiente. Disponible: ${product.stock}`);
      }

      updateServiceItem(serviceId, productId, { quantity });
      showToast.success('Cantidad actualizada');
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Error actualizando cantidad');
      throw error;
    }
  }, [updateServiceItem, removeProductFromService, products]);

  // Close service and generate sale
  const closeServiceWithSale = useCallback(async (serviceId: string, paymentInfo: PaymentInfo) => {
    try {
      const service = services.find(s => s.id === serviceId);
      if (!service) throw new Error('Servicio no encontrado');
      if (service.items.length === 0) throw new Error('El servicio no tiene productos');

      // Calculate totals
      const subtotal = service.items.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxAmount = subtotal * 0.21; // Using fixed tax for now
      const totalBeforeAdjustment = subtotal + taxAmount;
      
      // Apply payment method adjustment
      const paymentAdjustment = settingsActions.calculatePaymentAdjustment(
        totalBeforeAdjustment,
        paymentInfo.method as 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto'
      );
      
      // Create temporary cart from service items
      const tempCart = service.items.map(item => ({
        id: crypto.randomUUID(),
        productId: item.productId,
        productName: item.productName,
        price: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.totalPrice
      }));

      // Temporarily set cart in app store
      const { cart: originalCart, addToCart, clearCart } = useAppStore.getState();
      clearCart(); // Clear existing cart
      
      // Add service items to cart
      for (const item of tempCart) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          for (let i = 0; i < item.quantity; i++) {
            addToCart(product, 1);
          }
        }
      }

      // Create sale with payment adjustment info
      const saleData = {
        paymentMethod: paymentInfo.method,
        cashReceived: paymentInfo.received,
        originalTotal: totalBeforeAdjustment,
        adjustmentType: paymentAdjustment.adjustmentType,
        adjustmentAmount: paymentAdjustment.adjustmentAmount,
        adjustmentPercentage: paymentAdjustment.adjustmentPercentage,
        finalTotal: paymentAdjustment.finalAmount,
        reference: `Servicio: ${service.serviceName}`
      };

      // Complete the sale
      const sale = completeSale(paymentInfo.method, paymentInfo.received, saleData);

      // Close the service
      closeService(serviceId, paymentInfo.method as ServiceAssignment['paymentMethod']);

      showToast.success(`Servicio "${service.serviceName}" cerrado y venta completada`);
      
      return { sale, service };
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Error cerrando servicio');
      throw error;
    }
  }, [services, closeService, completeSale, products, settingsActions]);

  // Cancel service
  const cancelServiceWithReason = useCallback((serviceId: string, reason?: string) => {
    try {
      const service = services.find(s => s.id === serviceId);
      if (!service) throw new Error('Servicio no encontrado');

      cancelService(serviceId, reason);
      showToast.success(`Servicio "${service.serviceName}" cancelado`);
    } catch (error) {
      showToast.error('Error cancelando servicio');
      throw error;
    }
  }, [cancelService, services]);

  // Pause/Resume service
  const pauseServiceAction = useCallback((serviceId: string) => {
    try {
      const service = services.find(s => s.id === serviceId);
      if (!service) throw new Error('Servicio no encontrado');

      pauseService(serviceId);
      showToast.success(`Servicio "${service.serviceName}" pausado`);
    } catch (error) {
      showToast.error('Error pausando servicio');
      throw error;
    }
  }, [pauseService, services]);

  const resumeServiceAction = useCallback((serviceId: string) => {
    try {
      const service = services.find(s => s.id === serviceId);
      if (!service) throw new Error('Servicio no encontrado');

      resumeService(serviceId);
      showToast.success(`Servicio "${service.serviceName}" reanudado`);
    } catch (error) {
      showToast.error('Error reanudando servicio');
      throw error;
    }
  }, [resumeService, services]);

  // Get service by ID
  const getServiceById = useCallback((serviceId: string) => {
    return services.find(s => s.id === serviceId);
  }, [services]);

  // Get service statistics
  const getServiceStats = useCallback(() => {
    const active = getActiveServices();
    const todayRevenue = getTodaysRevenue();
    const history = getServiceHistory(30);
    
    return {
      activeCount: active.length,
      todayRevenue,
      completedToday: history.filter(s => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return s.endTime && s.endTime >= today;
      }).length,
      totalServices: services.length
    };
  }, [services, getActiveServices, getTodaysRevenue, getServiceHistory]);

  return {
    // State
    services,
    activeServices,
    
    // Actions
    createNewService,
    addProductToService,
    removeProductFromService,
    updateServiceItemQuantity,
    closeServiceWithSale,
    cancelServiceWithReason,
    pauseServiceAction,
    resumeServiceAction,
    
    // Getters
    getServiceById,
    getActiveServices,
    getServiceHistory,
    getServiceStats,
    getTodaysRevenue
  };
}