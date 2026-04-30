// stores/activity.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Activity types for tracking different operations - EXPANDED FOR AUDIT
type ActivityType =
  // Financial
  | 'ingreso'
  | 'egreso'
  // Product Management
  | 'cambio_producto'
  | 'cambio_precio'
  | 'producto_creado'
  | 'producto_editado'
  | 'producto_eliminado'
  // Stock Management
  | 'ajuste_stock'
  | 'stock_entrada'
  | 'stock_salida'
  // Employee Management
  | 'empleado_creado'
  | 'empleado_editado'
  | 'empleado_eliminado'
  // Sales & Service
  | 'venta_realizada'
  | 'venta_asignada'
  | 'servicio_iniciado'
  | 'servicio_cerrado'
  // Authentication & Security
  | 'login'
  | 'logout'
  | 'acceso_denegado'
  // General
  | 'otro';

// Enhanced metadata structure for better tracking
interface ActivityMetadata {
  // User tracking
  userId?: string;
  employeeName?: string;
  employeeRole?: string;
  
  // Product/Stock context  
  productId?: string;
  productName?: string;
  oldValue?: any;
  newValue?: any;
  quantityChanged?: number;
  
  // Service/Sales context
  serviceId?: string;
  customerId?: string;
  paymentMethod?: string;
  itemsCount?: number;
  saleId?: string;
  
  // Action context
  action?: string;
  updates?: any;
  performedBy?: string;
  movementId?: string;
  employeeId?: string;
  expenseId?: string;
  transactionId?: string;
  itemCount?: number;
  previousStock?: number;
  newStock?: number;
  category?: string;
  reason?: string;
  
  // System context
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  amount?: number;
  date: Date;
  userId?: string;
  metadata?: ActivityMetadata;
}

interface ActivityState {
  activities: Activity[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;

  // Actions
  addActivity: (activity: Omit<Activity, 'id' | 'date'>) => void;
  getActivities: () => Activity[];
  getActivitiesByType: (type: ActivityType) => Activity[];
  getRecentActivities: (limit?: number) => Activity[];
  clearActivities: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      activities: [],
      status: 'idle',
      error: null,

      addActivity: (activityData) => {
        const newActivity: Activity = {
          ...activityData,
          id: crypto.randomUUID(),
          date: new Date(),
        };

        set((state) => ({
          activities: [newActivity, ...state.activities],
          status: 'success',
          error: null,
        }));
      },

      getActivities: () => {
        return get().activities;
      },

      getActivitiesByType: (type) => {
        return get().activities.filter((activity) => activity.type === type);
      },

      getRecentActivities: (limit = 10) => {
        return get().activities.slice(0, limit);
      },

      clearActivities: () => {
        set({
          activities: [],
          status: 'idle',
          error: null,
        });
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
    }),
    {
      name: 'mistica-activity-store',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert string dates to Date objects after rehydration
          state.activities = state.activities.map((a) => ({
            ...a,
            date: new Date(a.date),
          }));
        }
      },
    }
  )
);

// Export types for component usage
export type { Activity, ActivityType, ActivityMetadata };
