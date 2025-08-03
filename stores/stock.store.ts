import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StockMovement, StockAlert, StockAdjustment, StockSettings } from '@/lib/types';

interface StockState {
  movements: StockMovement[];
  alerts: StockAlert[];
  adjustments: StockAdjustment[];
  settings: StockSettings[];
  
  // Actions para movimientos
  addMovement: (movement: Omit<StockMovement, 'id' | 'createdAt'>) => void;
  getMovementsByProduct: (productId: string) => StockMovement[];
  getRecentMovements: (limit?: number) => StockMovement[];
  
  // Actions para alertas
  createAlert: (alert: Omit<StockAlert, 'id' | 'createdAt'>) => void;
  resolveAlert: (alertId: string) => void;
  getActiveAlerts: () => StockAlert[];
  getAlertsByProduct: (productId: string) => StockAlert[];
  
  // Actions para ajustes
  addAdjustment: (adjustment: Omit<StockAdjustment, 'id' | 'createdAt'>) => void;
  getAdjustmentsByProduct: (productId: string) => StockAdjustment[];
  
  // Actions para configuración
  updateStockSettings: (productId: string, settings: Omit<StockSettings, 'productId'>) => void;
  getStockSettings: (productId: string) => StockSettings | undefined;
  
  // Funciones de utilidad
  checkStockAlerts: (productId: string, currentStock: number) => void;
  getStockSummary: () => {
    totalProducts: number;
    lowStockProducts: number;
    criticalStockProducts: number;
    outOfStock: number;
  };
}

export const useStockStore = create<StockState>()(
  persist(
    (set, get) => ({
      movements: [],
      alerts: [],
      adjustments: [],
      settings: [],

      // Movimientos
      addMovement: (movementData) => {
        const movement: StockMovement = {
          ...movementData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
        };
        
        set((state) => ({
          movements: [movement, ...state.movements],
        }));
        
        // Crear actividad en el store de actividades si está disponible
        if (typeof window !== 'undefined') {
          const activityStore = (window as any).activityStore;
          if (activityStore?.addActivity) {
            const typeMap = {
              'entrada': 'ingreso',
              'salida': 'egreso',
              'ajuste': 'cambio_producto'
            } as const;
            
            activityStore.addActivity({
              type: typeMap[movement.type] || 'otro',
              description: `${movement.type === 'entrada' ? 'Entrada' : movement.type === 'salida' ? 'Salida' : 'Ajuste'} de stock: ${movement.reason}`,
              reference: movement.productId,
            });
          }
        }
      },

      getMovementsByProduct: (productId) => {
        return get().movements.filter(m => m.productId === productId);
      },

      getRecentMovements: (limit = 10) => {
        return get().movements
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, limit);
      },

      // Alertas
      createAlert: (alertData) => {
        // Verificar si ya existe una alerta activa para este producto del mismo tipo
        const existingAlert = get().alerts.find(
          a => a.productId === alertData.productId && 
               a.type === alertData.type && 
               a.isActive
        );
        
        if (existingAlert) {
          // Actualizar alerta existente
          set((state) => ({
            alerts: state.alerts.map(a => 
              a.id === existingAlert.id 
                ? { ...a, currentStock: alertData.currentStock }
                : a
            ),
          }));
        } else {
          // Crear nueva alerta
          const alert: StockAlert = {
            ...alertData,
            id: crypto.randomUUID(),
            createdAt: new Date(),
          };
          
          set((state) => ({
            alerts: [alert, ...state.alerts],
          }));
        }
      },

      resolveAlert: (alertId) => {
        set((state) => ({
          alerts: state.alerts.map(alert =>
            alert.id === alertId
              ? { ...alert, isActive: false, resolvedAt: new Date() }
              : alert
          ),
        }));
      },

      getActiveAlerts: () => {
        return get().alerts.filter(a => a.isActive);
      },

      getAlertsByProduct: (productId) => {
        return get().alerts.filter(a => a.productId === productId);
      },

      // Ajustes
      addAdjustment: (adjustmentData) => {
        const adjustment: StockAdjustment = {
          ...adjustmentData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
        };
        
        set((state) => ({
          adjustments: [adjustment, ...state.adjustments],
        }));
        
        // Crear movimiento correspondiente
        get().addMovement({
          productId: adjustment.productId,
          type: 'ajuste',
          quantity: Math.abs(adjustment.difference),
          reason: `Ajuste manual: ${adjustment.reason}`,
          userId: adjustment.userId,
          previousStock: adjustment.oldQuantity,
          newStock: adjustment.newQuantity,
        });
      },

      getAdjustmentsByProduct: (productId) => {
        return get().adjustments.filter(a => a.productId === productId);
      },

      // Configuración
      updateStockSettings: (productId, settingsData) => {
        const settings: StockSettings = {
          ...settingsData,
          productId,
        };
        
        set((state) => ({
          settings: [
            ...state.settings.filter(s => s.productId !== productId),
            settings,
          ],
        }));
      },

      getStockSettings: (productId) => {
        return get().settings.find(s => s.productId === productId);
      },

      // Utilidades
      checkStockAlerts: (productId, currentStock) => {
        const settings = get().getStockSettings(productId);
        if (!settings || !settings.alertEnabled) return;
        
        if (currentStock === 0) {
          get().createAlert({
            productId,
            type: 'sin_stock',
            threshold: 0,
            currentStock,
            isActive: true,
          });
        } else if (currentStock <= settings.minStock * 0.5) {
          get().createAlert({
            productId,
            type: 'stock_critico',
            threshold: settings.minStock * 0.5,
            currentStock,
            isActive: true,
          });
        } else if (currentStock <= settings.minStock) {
          get().createAlert({
            productId,
            type: 'stock_bajo',
            threshold: settings.minStock,
            currentStock,
            isActive: true,
          });
        }
      },

      getStockSummary: () => {
        const alerts = get().getActiveAlerts();
        
        return {
          totalProducts: get().settings.length,
          lowStockProducts: alerts.filter(a => a.type === 'stock_bajo').length,
          criticalStockProducts: alerts.filter(a => a.type === 'stock_critico').length,
          outOfStock: alerts.filter(a => a.type === 'sin_stock').length,
        };
      },
    }),
    {
      name: 'mistica-stock-store',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convertir strings de fecha a objetos Date después de la hidratación
          state.movements = state.movements.map(m => ({
            ...m,
            createdAt: new Date(m.createdAt),
          }));
          
          state.alerts = state.alerts.map(a => ({
            ...a,
            createdAt: new Date(a.createdAt),
            resolvedAt: a.resolvedAt ? new Date(a.resolvedAt) : undefined,
          }));
          
          state.adjustments = state.adjustments.map(a => ({
            ...a,
            createdAt: new Date(a.createdAt),
          }));
        }
      },
    }
  )
);