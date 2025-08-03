'use client';

import { ActivityTable } from '@/components/dashboard/activity-table';
import { useActivityStore } from '@/stores/activity.store';
import { Button } from '@/components/ui/button';
import { Plus, History } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ActivityPage() {
  const { activities, getActivitiesByType, addActivity } = useActivityStore();

  // Stats for activity types
  const ingresos = getActivitiesByType('ingreso').length;
  const egresos = getActivitiesByType('egreso').length;
  const cambios =
    getActivitiesByType('cambio_producto').length +
    getActivitiesByType('cambio_precio').length;
  //* BORRAR Eejemplo
  const handleAddSampleActivity = () => {
    const samples = [
      {
        type: 'ingreso' as const,
        description: 'Venta de Cristal de Cuarzo',
        amount: 3500,
      },
      {
        type: 'egreso' as const,
        description: 'Compra de aceites esenciales',
        amount: 12000,
      },
      {
        type: 'cambio_precio' as const,
        description: 'Actualizado precio de Velas Aromáticas',
      },
      {
        type: 'cambio_producto' as const,
        description: 'Nuevo producto agregado: Incienso de Sándalo',
      },
    ];

    const randomSample = samples[Math.floor(Math.random() * samples.length)];
    addActivity(randomSample);
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
          onClick={handleAddSampleActivity}
          className='bg-[var(--color-verde-profundo)] hover:bg-[var(--color-verde-profundo)]/90 text-white font-winter-solid'
        >
          <Plus className='w-4 h-4 mr-2' />
          Agregar Actividad Demo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className='grid gap-4 md:grid-cols-3'>
        <Card className='border-[#10b981]/20'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-winter-solid text-[#10b981]'>
              Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-[#10b981]'>{ingresos}</div>
            <p className='text-xs text-[#455a54]/70'>actividades registradas</p>
          </CardContent>
        </Card>

        <Card className='border-[#ef4444]/20'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-winter-solid text-[#ef4444]'>
              Egresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-[#ef4444]'>{egresos}</div>
            <p className='text-xs text-[#455a54]/70'>actividades registradas</p>
          </CardContent>
        </Card>

        <Card className='border-[#3b82f6]/20'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-winter-solid text-[#3b82f6]'>
              Cambios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-[#3b82f6]'>{cambios}</div>
            <p className='text-xs text-[#455a54]/70'>productos y precios</p>
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
