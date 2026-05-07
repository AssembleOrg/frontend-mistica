'use client';

import { useMemo } from 'react';
import { ActivityTable } from '@/components/dashboard/activity-table';
import { useActivityStore } from '@/stores/activity.store';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { KpiStrip } from '@/components/ui/kpi-strip';
import { Plus } from 'lucide-react';

const isDev = process.env.NODE_ENV !== 'production';

export default function ActivityPage() {
  const { activities } = useActivityStore();
  const {
    logProductActivity,
    logStockActivity,
    logEmployeeActivity,
    logFinancialActivity,
    logSalesActivity,
    logAuthActivity,
  } = useActivityLogger();

  const kpis = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayCount = activities.filter((a) => new Date(a.date) >= startOfDay).length;
    const lastEvent = activities.length > 0 ? new Date(activities[0].date) : null;

    return {
      total: activities.length,
      today: todayCount,
      lastEvent,
    };
  }, [activities]);

  const lastEventLabel = useMemo(() => {
    if (!kpis.lastEvent) return '—';
    const diffMs = Date.now() - kpis.lastEvent.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'recién';
    if (diffMin < 60) return `hace ${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `hace ${diffHr}h`;
    const diffDay = Math.floor(diffHr / 24);
    return `hace ${diffDay}d`;
  }, [kpis.lastEvent]);

  const handleAddDemoActivity = () => {
    const demoActions = [
      () =>
        logProductActivity('producto_creado', 'Cristal de Amatista Premium', {
          productId: 'prod-123',
          employeeName: 'María González',
          amount: 8500,
        }),
      () =>
        logStockActivity('ajuste_stock', 'Aceite Esencial de Lavanda', 15, {
          productId: 'prod-456',
          reason: 'Reconteo de inventario',
          employeeName: 'Carlos Ruiz',
          oldQuantity: 25,
          newQuantity: 40,
        }),
      () =>
        logEmployeeActivity('empleado_creado', 'Ana Martínez', {
          employeeId: 'emp-789',
          role: 'Cajero',
          performedBy: 'Administrador',
        }),
      () =>
        logFinancialActivity('ingreso', 'Venta servicio de lectura de tarot', 12000, {
          paymentMethod: 'efectivo',
          serviceId: 'srv-001',
          employeeName: 'Luna Pérez',
        }),
      () =>
        logSalesActivity('servicio_cerrado', 'Mesa 3 - Consulta completa', {
          amount: 18500,
          serviceId: 'mesa-3',
          employeeName: 'Sofia Vega',
          paymentMethod: 'tarjeta',
          itemsCount: 4,
        }),
      () => logAuthActivity('login', 'Roberto Silva'),
    ];

    const randomAction = demoActions[Math.floor(Math.random() * demoActions.length)];
    randomAction();
  };

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Historial de Actividades'
        subtitle='Registro de movimientos y cambios en esta sesión'
        actions={
          isDev ? (
            <Button
              onClick={handleAddDemoActivity}
              variant='outline'
              className='border-[#9d684e]/30 text-[#9d684e] hover:bg-[#9d684e]/10 font-winter-solid w-full sm:w-auto'
            >
              <Plus className='w-4 h-4 mr-2' />
              Demo
            </Button>
          ) : null
        }
      />

      <KpiStrip
        items={[
          { label: 'Total registradas', value: kpis.total, hint: 'eventos' },
          { label: 'Hoy', value: kpis.today, accent: 'var(--color-terracota)' },
          { label: 'Último evento', value: lastEventLabel, accent: 'var(--color-naranja-medio)' },
        ]}
      />

      {/* Tabla con agrupado interno por fecha */}
      <Card className='border-[#9d684e]/20'>
        <CardContent className='pt-6'>
          <ActivityTable data={activities} isLoading={false} compact={false} />
        </CardContent>
      </Card>
    </div>
  );
}

