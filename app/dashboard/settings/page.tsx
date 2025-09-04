'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PaymentSettings } from '@/components/dashboard/settings/payment-settings';
import { ReceiptSettings } from '@/components/dashboard/settings/receipt-settings';
import { GeneralSettings } from '@/components/dashboard/settings/general-settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard,
  Receipt,
  Settings as SettingsIcon,
  Percent,
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className='p-6 space-y-6'>
      <div className='flex items-center gap-3 mb-6'>
        <SettingsIcon className='w-8 h-8 text-[#9d684e]' />
        <div>
          <h1 className='text-3xl font-bold text-[#455a54] font-tan-nimbus'>
            Configuración TEST. Necita refactorizar vistas{' '}
          </h1>
          <p className='text-gray-600'>
            Configura los descuentos, recargos y opciones del sistema
          </p>
        </div>
      </div>

      <Tabs
        defaultValue='payments'
        className='space-y-6'
      >
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger
            value='payments'
            className='flex items-center gap-2'
          >
            <CreditCard className='w-4 h-4' />
            Métodos de Pago
          </TabsTrigger>
          <TabsTrigger
            value='receipts'
            className='flex items-center gap-2'
          >
            <Receipt className='w-4 h-4' />
            Recibos
          </TabsTrigger>
          <TabsTrigger
            value='general'
            className='flex items-center gap-2'
          >
            <SettingsIcon className='w-4 h-4' />
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent value='payments'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Percent className='w-5 h-5' />
                Descuentos y Recargos por Método de Pago
              </CardTitle>
              <CardDescription>
                Configura descuentos y recargos que se aplicarán automáticamente
                según el método de pago seleccionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='receipts'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Receipt className='w-5 h-5' />
                Configuración de Recibos
              </CardTitle>
              <CardDescription>
                Personaliza la información y apariencia de los recibos generados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReceiptSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='general'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <SettingsIcon className='w-5 h-5' />
                Configuración General
              </CardTitle>
              <CardDescription>
                Opciones generales del sistema de ventas y stock
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GeneralSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
