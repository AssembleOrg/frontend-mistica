'use client';

import { Activity, ActivityType } from '@/stores/activity.store';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Activity as ActivityIcon,
  DollarSign,
  Package,
  Users,
  Settings,
  TrendingUp,
  TrendingDown,
  Circle
} from 'lucide-react';

interface ActivityMobileViewProps {
  activities: Activity[];
}

// Activity type configuration for badges - EXPANDED
const activityTypeConfig: Record<
  ActivityType | 'general',
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  // Financial
  ingreso: { label: 'Ingreso', color: '#10b981', bgColor: '#10b981/10', icon: TrendingUp },
  egreso: { label: 'Egreso', color: '#ef4444', bgColor: '#ef4444/10', icon: TrendingDown },
  
  // Product Management
  cambio_producto: { label: 'Cambio Producto', color: '#6366f1', bgColor: '#6366f1/10', icon: Package },
  cambio_precio: { label: 'Cambio Precio', color: '#f59e0b', bgColor: '#f59e0b/10', icon: DollarSign },
  producto_creado: { label: 'Producto Creado', color: '#10b981', bgColor: '#10b981/10', icon: Package },
  producto_editado: { label: 'Producto Editado', color: '#3b82f6', bgColor: '#3b82f6/10', icon: Package },
  producto_eliminado: { label: 'Producto Eliminado', color: '#ef4444', bgColor: '#ef4444/10', icon: Package },
  
  // Stock Management
  ajuste_stock: { label: 'Ajuste Stock', color: '#8b5cf6', bgColor: '#8b5cf6/10', icon: Package },
  stock_entrada: { label: 'Stock Entrada', color: '#10b981', bgColor: '#10b981/10', icon: Package },
  stock_salida: { label: 'Stock Salida', color: '#f59e0b', bgColor: '#f59e0b/10', icon: Package },
  
  // Employee Management
  empleado_creado: { label: 'Empleado Creado', color: '#10b981', bgColor: '#10b981/10', icon: Users },
  empleado_editado: { label: 'Empleado Editado', color: '#3b82f6', bgColor: '#3b82f6/10', icon: Users },
  empleado_eliminado: { label: 'Empleado Eliminado', color: '#ef4444', bgColor: '#ef4444/10', icon: Users },
  
  // Sales & Service
  venta_realizada: { label: 'Venta Realizada', color: '#10b981', bgColor: '#10b981/10', icon: DollarSign },
  venta_asignada: { label: 'Venta Asignada', color: '#3b82f6', bgColor: '#3b82f6/10', icon: DollarSign },
  servicio_iniciado: { label: 'Servicio Iniciado', color: '#10b981', bgColor: '#10b981/10', icon: Settings },
  servicio_cerrado: { label: 'Servicio Cerrado', color: '#6b7280', bgColor: '#6b7280/10', icon: Settings },
  
  // Authentication & Security
  login: { label: 'Inicio Sesión', color: '#10b981', bgColor: '#10b981/10', icon: Users },
  logout: { label: 'Cerrar Sesión', color: '#6b7280', bgColor: '#6b7280/10', icon: Users },
  acceso_denegado: { label: 'Acceso Denegado', color: '#ef4444', bgColor: '#ef4444/10', icon: Users },
  
  // General
  otro: { label: 'Otro', color: '#6b7280', bgColor: '#6b7280/10', icon: Circle },
  general: { label: 'General', color: '#6b7280', bgColor: '#6b7280/10', icon: Circle }
};

export function ActivityMobileView({ activities }: ActivityMobileViewProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <ActivityIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="text-base">No hay actividad reciente.</p>
        <p className="text-sm text-gray-400 mt-1">Las actividades aparecerán aquí cuando ocurran.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const config = activityTypeConfig[activity.type] || activityTypeConfig.general;
        const IconComponent = config.icon;
        const activityDate = new Date(activity.date);

        return (
          <div key={activity.id} className="mobile-card">
            <div className="mobile-card-header">
              <div className="flex items-start gap-3 flex-1">
                <div 
                  className="p-2 rounded-lg shrink-0"
                  style={{ 
                    backgroundColor: config.bgColor,
                    color: config.color
                  }}
                >
                  <IconComponent className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      style={{ 
                        backgroundColor: config.color + '20',
                        color: config.color,
                        border: `1px solid ${config.color}40`
                      }}
                      className="text-xs"
                    >
                      {config.label}
                    </Badge>
                  </div>
                  
                  <h3 className="mobile-card-title line-clamp-2">
                    {activity.description}
                  </h3>
                  
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(activityDate, { 
                      addSuffix: true, 
                      locale: es 
                    })}
                  </p>
                </div>
              </div>
            </div>

            {activity.metadata && Object.keys(activity.metadata).length > 0 && (
              <div className="mobile-card-content">
                <div className="mobile-card-label mb-2">Detalles:</div>
                <div className="space-y-1">
                  {Object.entries(activity.metadata).map(([key, value]) => (
                    <div key={key} className="mobile-card-row">
                      <span className="mobile-card-label capitalize">
                        {key.replace(/_/g, ' ')}:
                      </span>
                      <span className="mobile-card-value">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activity.userId && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="mobile-card-label">Usuario:</div>
                  <div className="mobile-card-value">{activity.userId}</div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}