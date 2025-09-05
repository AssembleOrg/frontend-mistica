'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PaymentSettings } from '@/components/dashboard/settings/payment-settings';
import { Percent } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className='p-4 space-y-4'>
      <div className='flex items-center gap-3 mb-4'>
        <div>
          <h1 className='text-3xl font-bold text-[#455a54] font-tan-nimbus'>
            Configuración
          </h1>
          <p className='text-gray-600'>
            Ajustes de descuentos/recargos por método de pago
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Percent className='w-5 h-5' />
            Descuentos y Recargos por método de Pago
          </CardTitle>
          <CardDescription>
            Se aplican automáticamente según el método seleccionado en ventas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentSettings />
        </CardContent>
      </Card>
    </div>
  );
}
