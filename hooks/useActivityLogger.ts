import { useActivityStore, ActivityType, ActivityMetadata } from '@/stores/activity.store';

interface LogActivityParams {
  type: ActivityType;
  description: string;
  amount?: number;
  metadata?: Partial<ActivityMetadata>;
}

/**
 * Hook for automatic activity logging across the application
 * This centralizes all logging functionality and ensures consistency
 */
export function useActivityLogger() {
  const { addActivity } = useActivityStore();

  /**
   * Log an activity with proper metadata enrichment
   */
  const logActivity = ({
    type,
    description,
    amount,
    metadata = {},
  }: LogActivityParams) => {
    // Enrich metadata with system context
    const enrichedMetadata: ActivityMetadata = {
      ...metadata,
      // Add browser info if available
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      sessionId: typeof window !== 'undefined' ? sessionStorage.getItem('session-id') || undefined : undefined,
    };

    addActivity({
      type,
      description,
      amount,
      metadata: enrichedMetadata,
    });
  };

  // Convenience methods for common logging patterns
  
  /**
   * Log product-related activities
   */
  const logProductActivity = (
    type: 'producto_creado' | 'producto_editado' | 'producto_eliminado' | 'cambio_precio',
    productName: string,
    additionalInfo?: {
      productId?: string;
      oldValue?: any;
      newValue?: any;
      employeeName?: string;
      amount?: number;
    }
  ) => {
    const descriptions = {
      producto_creado: `Producto creado: ${productName}`,
      producto_editado: `Producto editado: ${productName}`,
      producto_eliminado: `Producto eliminado: ${productName}`,
      cambio_precio: `Precio actualizado: ${productName}`,
    };

    logActivity({
      type,
      description: descriptions[type],
      amount: additionalInfo?.amount,
      metadata: {
        productName,
        productId: additionalInfo?.productId,
        oldValue: additionalInfo?.oldValue,
        newValue: additionalInfo?.newValue,
        employeeName: additionalInfo?.employeeName,
      },
    });
  };

  /**
   * Log stock-related activities
   */
  const logStockActivity = (
    type: 'ajuste_stock' | 'stock_entrada' | 'stock_salida',
    productName: string,
    quantityChange: number,
    additionalInfo?: {
      productId?: string;
      reason?: string;
      employeeName?: string;
      oldQuantity?: number;
      newQuantity?: number;
    }
  ) => {
    const action = type === 'ajuste_stock' ? 'ajustado' : 
                   type === 'stock_entrada' ? 'entrada' : 'salida';
    
    const description = `Stock ${action}: ${productName} (${quantityChange > 0 ? '+' : ''}${quantityChange})`;
    
    logActivity({
      type,
      description: additionalInfo?.reason ? `${description} - ${additionalInfo.reason}` : description,
      metadata: {
        productName,
        productId: additionalInfo?.productId,
        quantityChanged: quantityChange,
        oldValue: additionalInfo?.oldQuantity,
        newValue: additionalInfo?.newQuantity,
        employeeName: additionalInfo?.employeeName,
      },
    });
  };

  /**
   * Log employee-related activities
   */
  const logEmployeeActivity = (
    type: 'empleado_creado' | 'empleado_editado' | 'empleado_eliminado',
    employeeName: string,
    additionalInfo?: {
      employeeId?: string;
      role?: string;
      oldValue?: any;
      newValue?: any;
      performedBy?: string;
    }
  ) => {
    const descriptions = {
      empleado_creado: `Empleado creado: ${employeeName}`,
      empleado_editado: `Empleado editado: ${employeeName}`,
      empleado_eliminado: `Empleado eliminado: ${employeeName}`,
    };

    logActivity({
      type,
      description: descriptions[type],
      metadata: {
        employeeName,
        employeeRole: additionalInfo?.role,
        oldValue: additionalInfo?.oldValue,
        newValue: additionalInfo?.newValue,
        performedBy: additionalInfo?.performedBy,
      },
    });
  };

  /**
   * Log financial activities
   */
  const logFinancialActivity = (
    type: 'ingreso' | 'egreso',
    description: string,
    amount: number,
    additionalInfo?: {
      paymentMethod?: string;
      serviceId?: string;
      employeeName?: string;
      customerId?: string;
    }
  ) => {
    logActivity({
      type,
      description,
      amount,
      metadata: {
        paymentMethod: additionalInfo?.paymentMethod,
        serviceId: additionalInfo?.serviceId,
        employeeName: additionalInfo?.employeeName,
        customerId: additionalInfo?.customerId,
      },
    });
  };

  /**
   * Log sales and service activities
   */
  const logSalesActivity = (
    type: 'venta_realizada' | 'venta_asignada' | 'servicio_iniciado' | 'servicio_cerrado',
    description: string,
    additionalInfo?: {
      amount?: number;
      serviceId?: string;
      employeeName?: string;
      customerId?: string;
      paymentMethod?: string;
      itemsCount?: number;
    }
  ) => {
    logActivity({
      type,
      description,
      amount: additionalInfo?.amount,
      metadata: {
        serviceId: additionalInfo?.serviceId,
        employeeName: additionalInfo?.employeeName,
        customerId: additionalInfo?.customerId,
        paymentMethod: additionalInfo?.paymentMethod,
        itemsCount: additionalInfo?.itemsCount,
      },
    });
  };

  /**
   * Log authentication activities
   */
  const logAuthActivity = (
    type: 'login' | 'logout' | 'acceso_denegado',
    employeeName: string,
    additionalInfo?: {
      reason?: string;
      ipAddress?: string;
    }
  ) => {
    const descriptions = {
      login: `Login exitoso: ${employeeName}`,
      logout: `Logout: ${employeeName}`,
      acceso_denegado: `Acceso denegado: ${employeeName}`,
    };

    logActivity({
      type,
      description: additionalInfo?.reason ? 
        `${descriptions[type]} - ${additionalInfo.reason}` : 
        descriptions[type],
      metadata: {
        employeeName,
        ipAddress: additionalInfo?.ipAddress,
      },
    });
  };

  return {
    logActivity,
    logProductActivity,
    logStockActivity,
    logEmployeeActivity,
    logFinancialActivity,
    logSalesActivity,
    logAuthActivity,
  };
}