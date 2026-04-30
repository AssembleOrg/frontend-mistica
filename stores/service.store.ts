// stores/service.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ServiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface ServiceAssignment {
  id: string;
  serviceId: string; // "Mesa 1", "Servicio A", "Delivery #123", etc.
  serviceName: string;
  employeeId: string;
  employeeName: string;
  customerId?: string;
  customerName?: string;
  startTime: Date;
  endTime?: Date;
  totalAmount: number;
  status: 'active' | 'paused' | 'closed' | 'cancelled';
  items: ServiceItem[];
  paymentMethod?: 'efectivo' | 'tarjeta' | 'transferencia';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ServiceState {
  services: ServiceAssignment[];
  activeServices: ServiceAssignment[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;

  // Actions
  createService: (service: Omit<ServiceAssignment, 'id' | 'createdAt' | 'updatedAt' | 'totalAmount'>) => string;
  updateService: (id: string, updates: Partial<ServiceAssignment>) => void;
  addItemToService: (serviceId: string, item: Omit<ServiceItem, 'totalPrice'>) => void;
  removeItemFromService: (serviceId: string, productId: string) => void;
  updateServiceItem: (serviceId: string, productId: string, updates: Partial<ServiceItem>) => void;
  closeService: (serviceId: string, paymentMethod: ServiceAssignment['paymentMethod']) => void;
  cancelService: (serviceId: string, reason?: string) => void;
  pauseService: (serviceId: string) => void;
  resumeService: (serviceId: string) => void;
  
  // Getters
  getActiveServices: () => ServiceAssignment[];
  getServicesByEmployee: (employeeId: string) => ServiceAssignment[];
  getServiceHistory: (limit?: number) => ServiceAssignment[];
  getTodaysRevenue: () => number;
  getEmployeePerformance: (employeeId: string, days?: number) => {
    totalSales: number;
    serviceCount: number;
    averageServiceTime: number;
    totalRevenue: number;
  };
  
  // Utils
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearServices: () => void;
}

export const useServiceStore = create<ServiceState>()(
  persist(
    (set, get) => ({
      services: [],
      activeServices: [],
      status: 'idle',
      error: null,

      createService: (serviceData) => {
        const newService: ServiceAssignment = {
          ...serviceData,
          id: crypto.randomUUID(),
          totalAmount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          services: [newService, ...state.services],
          activeServices: serviceData.status === 'active' 
            ? [newService, ...state.activeServices] 
            : state.activeServices,
          status: 'success',
          error: null,
        }));

        return newService.id;
      },

      updateService: (id, updates) => {
        set((state) => {
          const updatedServices = state.services.map(service =>
            service.id === id
              ? { ...service, ...updates, updatedAt: new Date() }
              : service
          );
          
          const updatedActiveServices = state.activeServices.map(service =>
            service.id === id
              ? { ...service, ...updates, updatedAt: new Date() }
              : service
          ).filter(service => service.status === 'active');

          return {
            services: updatedServices,
            activeServices: updatedActiveServices,
          };
        });
      },

      addItemToService: (serviceId, item) => {
        set((state) => {
          const updatedServices = state.services.map(service => {
            if (service.id === serviceId) {
              const totalPrice = item.quantity * item.unitPrice;
              const newItem: ServiceItem = { ...item, totalPrice };
              
              const existingItemIndex = service.items.findIndex(
                i => i.productId === item.productId
              );

              let updatedItems: ServiceItem[];
              if (existingItemIndex >= 0) {
                // Update existing item
                updatedItems = service.items.map((existingItem, index) =>
                  index === existingItemIndex
                    ? {
                        ...existingItem,
                        quantity: existingItem.quantity + item.quantity,
                        totalPrice: (existingItem.quantity + item.quantity) * existingItem.unitPrice
                      }
                    : existingItem
                );
              } else {
                // Add new item
                updatedItems = [...service.items, newItem];
              }

              const newTotalAmount = updatedItems.reduce((sum, i) => sum + i.totalPrice, 0);

              return {
                ...service,
                items: updatedItems,
                totalAmount: newTotalAmount,
                updatedAt: new Date(),
              };
            }
            return service;
          });

          const updatedActiveServices = state.activeServices.map(service => {
            const updatedService = updatedServices.find(s => s.id === service.id);
            return updatedService || service;
          });

          return {
            services: updatedServices,
            activeServices: updatedActiveServices,
          };
        });
      },

      removeItemFromService: (serviceId, productId) => {
        set((state) => {
          const updatedServices = state.services.map(service => {
            if (service.id === serviceId) {
              const updatedItems = service.items.filter(item => item.productId !== productId);
              const newTotalAmount = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);

              return {
                ...service,
                items: updatedItems,
                totalAmount: newTotalAmount,
                updatedAt: new Date(),
              };
            }
            return service;
          });

          const updatedActiveServices = state.activeServices.map(service => {
            const updatedService = updatedServices.find(s => s.id === service.id);
            return updatedService || service;
          });

          return {
            services: updatedServices,
            activeServices: updatedActiveServices,
          };
        });
      },

      updateServiceItem: (serviceId, productId, updates) => {
        set((state) => {
          const updatedServices = state.services.map(service => {
            if (service.id === serviceId) {
              const updatedItems = service.items.map(item => {
                if (item.productId === productId) {
                  const updated = { ...item, ...updates };
                  updated.totalPrice = updated.quantity * updated.unitPrice;
                  return updated;
                }
                return item;
              });

              const newTotalAmount = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);

              return {
                ...service,
                items: updatedItems,
                totalAmount: newTotalAmount,
                updatedAt: new Date(),
              };
            }
            return service;
          });

          const updatedActiveServices = state.activeServices.map(service => {
            const updatedService = updatedServices.find(s => s.id === service.id);
            return updatedService || service;
          });

          return {
            services: updatedServices,
            activeServices: updatedActiveServices,
          };
        });
      },

      closeService: (serviceId, paymentMethod) => {
        const service = get().services.find(s => s.id === serviceId);
        if (service) {
          get().updateService(serviceId, {
            status: 'closed',
            endTime: new Date(),
            paymentMethod,
          });
        }
      },

      cancelService: (serviceId, reason) => {
        get().updateService(serviceId, {
          status: 'cancelled',
          endTime: new Date(),
          notes: reason ? `Cancelado: ${reason}` : 'Cancelado',
        });
      },

      pauseService: (serviceId) => {
        get().updateService(serviceId, { status: 'paused' });
      },

      resumeService: (serviceId) => {
        get().updateService(serviceId, { status: 'active' });
      },

      getActiveServices: () => {
        return get().services.filter(service => service.status === 'active');
      },

      getServicesByEmployee: (employeeId) => {
        return get().services.filter(service => service.employeeId === employeeId);
      },

      getServiceHistory: (limit = 50) => {
        return get().services
          .filter(service => service.status === 'closed')
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .slice(0, limit);
      },

      getTodaysRevenue: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return get().services
          .filter(service => 
            service.status === 'closed' && 
            service.endTime && 
            service.endTime >= today
          )
          .reduce((total, service) => total + service.totalAmount, 0);
      },

      getEmployeePerformance: (employeeId, days = 7) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const employeeServices = get().services.filter(service => 
          service.employeeId === employeeId &&
          service.status === 'closed' &&
          service.endTime &&
          service.endTime >= cutoffDate
        );

        const totalRevenue = employeeServices.reduce((sum, service) => sum + service.totalAmount, 0);
        const serviceCount = employeeServices.length;
        
        const totalServiceTime = employeeServices.reduce((sum, service) => {
          if (service.endTime && service.startTime) {
            return sum + (service.endTime.getTime() - service.startTime.getTime());
          }
          return sum;
        }, 0);

        const averageServiceTime = serviceCount > 0 ? totalServiceTime / serviceCount : 0;

        return {
          totalSales: serviceCount,
          serviceCount,
          averageServiceTime: Math.round(averageServiceTime / (1000 * 60)), // in minutes
          totalRevenue,
        };
      },

      setLoading: (loading) => {
        set({
          status: loading ? 'loading' : 'idle',
          error: loading ? null : get().error,
        });
      },

      setError: (error) => {
        set({
          status: error ? 'error' : 'success',
          error,
        });
      },

      clearServices: () => {
        set({
          services: [],
          activeServices: [],
          status: 'idle',
          error: null,
        });
      },
    }),
    {
      name: 'mistica-service-store',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert string dates to Date objects after rehydration
          state.services = state.services.map((service) => ({
            ...service,
            startTime: new Date(service.startTime),
            endTime: service.endTime ? new Date(service.endTime) : undefined,
            createdAt: new Date(service.createdAt),
            updatedAt: new Date(service.updatedAt),
          }));
          
          // Rebuild active services array
          state.activeServices = state.services.filter(service => service.status === 'active');
        }
      },
    }
  )
);

// Export types for component usage
export type { ServiceAssignment, ServiceItem };