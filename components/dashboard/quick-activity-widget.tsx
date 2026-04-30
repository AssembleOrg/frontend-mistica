'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Clock, User, AlertCircle } from 'lucide-react';
import { useActivityStore, ActivityType as ActivityTypeEnum } from '@/stores/activity.store';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Activity type configuration for icons and colors
const activityConfig: Record<
  ActivityTypeEnum,
  { 
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; 
    color: string; 
    bgColor: string; 
    label: string;
  }
> = {
  // Financial
  ingreso: { icon: Activity, color: '#10b981', bgColor: 'bg-green-100', label: 'Ingreso' },
  egreso: { icon: Activity, color: '#ef4444', bgColor: 'bg-red-100', label: 'Egreso' },
  
  // Product Management
  cambio_producto: { icon: AlertCircle, color: '#6366f1', bgColor: 'bg-indigo-100', label: 'Cambio Producto' },
  cambio_precio: { icon: AlertCircle, color: '#f59e0b', bgColor: 'bg-amber-100', label: 'Cambio Precio' },
  producto_creado: { icon: Activity, color: '#10b981', bgColor: 'bg-green-100', label: 'Producto Creado' },
  producto_editado: { icon: Activity, color: '#3b82f6', bgColor: 'bg-blue-100', label: 'Producto Editado' },
  producto_eliminado: { icon: AlertCircle, color: '#ef4444', bgColor: 'bg-red-100', label: 'Producto Eliminado' },
  
  // Stock Management
  ajuste_stock: { icon: Activity, color: '#8b5cf6', bgColor: 'bg-purple-100', label: 'Ajuste Stock' },
  stock_entrada: { icon: Activity, color: '#10b981', bgColor: 'bg-green-100', label: 'Stock Entrada' },
  stock_salida: { icon: Activity, color: '#f59e0b', bgColor: 'bg-amber-100', label: 'Stock Salida' },
  
  // Employee Management
  empleado_creado: { icon: User, color: '#10b981', bgColor: 'bg-green-100', label: 'Empleado Creado' },
  empleado_editado: { icon: User, color: '#3b82f6', bgColor: 'bg-blue-100', label: 'Empleado Editado' },
  empleado_eliminado: { icon: User, color: '#ef4444', bgColor: 'bg-red-100', label: 'Empleado Eliminado' },
  
  // Sales & Service
  venta_realizada: { icon: Activity, color: '#10b981', bgColor: 'bg-green-100', label: 'Venta Realizada' },
  venta_asignada: { icon: User, color: '#3b82f6', bgColor: 'bg-blue-100', label: 'Venta Asignada' },
  servicio_iniciado: { icon: Clock, color: '#3b82f6', bgColor: 'bg-blue-100', label: 'Servicio Iniciado' },
  servicio_cerrado: { icon: Clock, color: '#10b981', bgColor: 'bg-green-100', label: 'Servicio Cerrado' },
  
  // Authentication & Security
  login: { icon: User, color: '#10b981', bgColor: 'bg-green-100', label: 'Login' },
  logout: { icon: User, color: '#6b7280', bgColor: 'bg-gray-100', label: 'Logout' },
  acceso_denegado: { icon: AlertCircle, color: '#ef4444', bgColor: 'bg-red-100', label: 'Acceso Denegado' },
  
  // General
  otro: { icon: Activity, color: '#6b7280', bgColor: 'bg-gray-100', label: 'Otro' },
};

interface QuickActivityWidgetProps {
  title?: string;
  limit?: number;
  filterTypes?: ActivityTypeEnum[];
  compact?: boolean;
  showHeader?: boolean;
}

export function QuickActivityWidget({
  title = "Actividad Reciente",
  limit = 5,
  filterTypes,
  compact = false,
  showHeader = true,
}: QuickActivityWidgetProps) {
  const { getRecentActivities, activities } = useActivityStore();
  
  let recentActivities = getRecentActivities(limit * 2); // Get more to filter if needed
  
  // Apply type filter if specified
  if (filterTypes && filterTypes.length > 0) {
    recentActivities = recentActivities.filter(activity => 
      filterTypes.includes(activity.type)
    ).slice(0, limit);
  } else {
    recentActivities = recentActivities.slice(0, limit);
  }

  if (compact && recentActivities.length === 0) {
    return null;
  }

  return (
    <Card className='border-[#9d684e]/20'>
      {showHeader && (
        <CardHeader className={compact ? 'pb-3' : 'pb-4'}>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-lg font-tan-nimbus text-[#455a54] flex items-center gap-2'>
              <Clock className='h-5 w-5' />
              {title}
            </CardTitle>
            <Badge variant='secondary' className='bg-[#efcbb9]/30 text-[#455a54]'>
              {activities.length} total
            </Badge>
          </div>
        </CardHeader>
      )}
      <CardContent className={compact ? 'pt-0' : ''}>
        {recentActivities.length === 0 ? (
          <div className='text-center py-6 text-[#455a54]/70'>
            <Clock className='h-8 w-8 mx-auto mb-2 opacity-50' />
            <p className='font-winter-solid text-sm'>No hay actividad reciente</p>
          </div>
        ) : (
          <ScrollArea className={compact ? 'h-32' : 'h-48'}>
            <div className='space-y-3'>
              {recentActivities.map((activity) => {
                const config = activityConfig[activity.type];
                const IconComponent = config.icon;
                
                return (
                  <div
                    key={activity.id}
                    className='flex items-start gap-3 p-2 rounded-lg hover:bg-[#efcbb9]/10 transition-colors'
                  >
                    <div
                      className={`p-1.5 rounded-full ${config.bgColor} flex-shrink-0`}
                    >
                      <IconComponent 
                        className='h-3 w-3'
                        style={{ color: config.color }}
                      />
                    </div>
                    
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-start justify-between gap-2'>
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-medium text-[#455a54] leading-tight'>
                            {activity.description}
                          </p>
                          
                          {activity.metadata?.employeeName && (
                            <p className='text-xs text-[#455a54]/60 mt-0.5'>
                              Por {activity.metadata.employeeName}
                            </p>
                          )}
                          
                          {activity.amount && (
                            <p className='text-xs font-medium mt-0.5' style={{ color: config.color }}>
                              ${activity.amount.toLocaleString('es-AR')}
                            </p>
                          )}
                        </div>
                        
                        <div className='flex flex-col items-end gap-1 flex-shrink-0'>
                          <Badge
                            variant='secondary'
                            className='text-xs px-2 py-0.5'
                            style={{
                              backgroundColor: `${config.color}15`,
                              color: config.color,
                              border: `1px solid ${config.color}30`,
                            }}
                          >
                            {config.label}
                          </Badge>
                          
                          <time
                            className='text-xs text-[#455a54]/50'
                            title={format(activity.date, 'PPpp', { locale: es })}
                          >
                            {formatDistanceToNow(activity.date, { 
                              addSuffix: true, 
                              locale: es 
                            })}
                          </time>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
        
        {recentActivities.length > 0 && !compact && (
          <div className='mt-3 pt-3 border-t border-[#9d684e]/10'>
            <a
              href='/dashboard/activity'
              className='text-sm text-[#9d684e] hover:text-[#9d684e]/80 font-winter-solid flex items-center justify-center gap-2 py-2 rounded-md hover:bg-[#efcbb9]/10 transition-colors'
            >
              Ver todo el historial
              <Activity className='h-4 w-4' />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}