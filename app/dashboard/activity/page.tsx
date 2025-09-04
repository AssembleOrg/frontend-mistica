'use client';

import { ActivityTable } from '@/components/dashboard/activity-table';
import { useActivityStore } from '@/stores/activity.store';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { Button } from '@/components/ui/button';
import { Plus, History, Users, Package, DollarSign } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ActivityPage() {
  const { activities, getActivitiesByType } = useActivityStore();
  const {
    logProductActivity,
    logStockActivity,
    logEmployeeActivity,
    logFinancialActivity,
    logSalesActivity,
    logAuthActivity
  } = useActivityLogger();

  // Enhanced stats for all activity types
  const financialActivities = getActivitiesByType('ingreso').length + getActivitiesByType('egreso').length;
  const productActivities = getActivitiesByType('producto_creado').length + 
                          getActivitiesByType('producto_editado').length + 
                          getActivitiesByType('cambio_precio').length;
  const stockActivities = getActivitiesByType('ajuste_stock').length + 
                         getActivitiesByType('stock_entrada').length + 
                         getActivitiesByType('stock_salida').length;
  const employeeActivities = getActivitiesByType('empleado_creado').length + 
                           getActivitiesByType('empleado_editado').length;
  const salesActivities = getActivitiesByType('venta_realizada').length + 
                        getActivitiesByType('servicio_cerrado').length;
  const authActivities = getActivitiesByType('login').length + getActivitiesByType('logout').length;

  // Demo function to showcase the new logging system
  const handleAddDemoActivity = () => {
    const demoActions = [
      () => logProductActivity('producto_creado', 'Cristal de Amatista Premium', {
        productId: 'prod-123',
        employeeName: 'María González',
        amount: 8500
      }),
      () => logStockActivity('ajuste_stock', 'Aceite Esencial de Lavanda', 15, {
        productId: 'prod-456',
        reason: 'Reconteo de inventario',
        employeeName: 'Carlos Ruiz',
        oldQuantity: 25,
        newQuantity: 40
      }),
      () => logEmployeeActivity('empleado_creado', 'Ana Martínez', {
        employeeId: 'emp-789',
        role: 'Cajero',
        performedBy: 'Administrador'
      }),
      () => logFinancialActivity('ingreso', 'Venta servicio de lectura de tarot', 12000, {
        paymentMethod: 'efectivo',
        serviceId: 'srv-001',
        employeeName: 'Luna Pérez'
      }),
      () => logSalesActivity('servicio_cerrado', 'Mesa 3 - Consulta completa', {
        amount: 18500,
        serviceId: 'mesa-3',
        employeeName: 'Sofia Vega',
        paymentMethod: 'tarjeta',
        itemsCount: 4
      }),
      () => logAuthActivity('login', 'Roberto Silva'),
    ];

    const randomAction = demoActions[Math.floor(Math.random() * demoActions.length)];
    randomAction();
  };

  return (
    <div className='space-y-6 mt-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='space-y-1'>
          <h1 className='text-3xl font-tan-nimbus font-bold text-[var(--color-verde-profundo)]'>
            Historial de Actividades
          </h1>
          <p className='text-[var(--color-ciruela-oscuro)]/70 font-winter-solid'>
            Registro completo de movimientos y cambios en tu negocio
          </p>
        </div>
        <Button
          onClick={handleAddDemoActivity}
          className='bg-[#9d684e] hover:bg-[#9d684e]/90 text-white font-winter-solid'
        >
          <Plus className='w-4 h-4 mr-2' />
          Demo Sistema Auditoría
        </Button>
      </div>

      {/* Enhanced Stats Cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
        <Card className='border-[#10b981]/20'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-winter-solid text-[#10b981] flex items-center gap-2'>
              <DollarSign className='h-4 w-4' />
              Finanzas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-[#10b981]'>{financialActivities}</div>
            <p className='text-xs text-[#455a54]/70'>movimientos</p>
          </CardContent>
        </Card>

        <Card className='border-[#6366f1]/20'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-winter-solid text-[#6366f1] flex items-center gap-2'>
              <Package className='h-4 w-4' />
              Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-[#6366f1]'>{productActivities}</div>
            <p className='text-xs text-[#455a54]/70'>cambios</p>
          </CardContent>
        </Card>

        <Card className='border-[#8b5cf6]/20'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-winter-solid text-[#8b5cf6] flex items-center gap-2'>
              <Package className='h-4 w-4' />
              Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-[#8b5cf6]'>{stockActivities}</div>
            <p className='text-xs text-[#455a54]/70'>ajustes</p>
          </CardContent>
        </Card>

        <Card className='border-[#059669]/20'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-winter-solid text-[#059669] flex items-center gap-2'>
              <Users className='h-4 w-4' />
              Personal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-[#059669]'>{employeeActivities}</div>
            <p className='text-xs text-[#455a54]/70'>actividades</p>
          </CardContent>
        </Card>

        <Card className='border-[#dc2626]/20'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-winter-solid text-[#dc2626] flex items-center gap-2'>
              <History className='h-4 w-4' />
              Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-[#dc2626]'>{salesActivities}</div>
            <p className='text-xs text-[#455a54]/70'>servicios</p>
          </CardContent>
        </Card>

        <Card className='border-[#374151]/20'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-winter-solid text-[#374151] flex items-center gap-2'>
              <Users className='h-4 w-4' />
              Sesiones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-[#374151]'>{authActivities}</div>
            <p className='text-xs text-[#455a54]/70'>accesos</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Table */}
      <Card className='border-[#9d684e]/20'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='space-y-1'>
              <CardTitle className='text-[#455a54] font-tan-nimbus flex items-center gap-2'>
                <History className='w-5 h-5' />
                Todas las Actividades
              </CardTitle>
              <CardDescription className='font-winter-solid'>
                Lista completa con filtros y búsqueda
              </CardDescription>
            </div>
            <Badge
              variant='secondary'
              className='bg-[#efcbb9]/30 text-[#455a54]'
            >
              {activities.length} registros
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ActivityTable
            data={activities}
            isLoading={false}
            compact={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
