'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { useSettingsStore } from '@/stores/settings.store';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Banknote,
  CreditCard,
  ArrowUpDown,
  Percent,
  Save,
  QrCode,
  Gift,
  Tag,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function PaymentSettings() {
  const { settings, actions } = useSettingsStore();
  const [isLoading, setIsLoading] = useState(false);

  const paymentMethodConfig = {
    efectivo: {
      icon: Banknote,
      title: 'Efectivo',
      description: 'Descuento por pago en efectivo',
      fieldLabel: 'Descuento (%)',
      fieldKey: 'discountPercentage' as const,
      color: 'text-green-600',
    },
    tarjeta: {
      icon: CreditCard,
      title: 'Tarjeta',
      description: 'Configura descuento o recargo',
      fieldLabel: 'Ajuste (%)',
      fieldKey: 'surchargePercentage' as const,
      supportsBoth: true as const,
      color: 'text-blue-600',
    },
    transferencia: {
      icon: ArrowUpDown,
      title: 'Transferencia',
      description: 'Configura descuento o recargo',
      fieldLabel: 'Ajuste (%)',
      fieldKey: 'discountPercentage' as const,
      supportsBoth: true as const,
      color: 'text-purple-600',
    },
    qr: {
      icon: QrCode,
      title: 'QR',
      description: 'Configura descuento o recargo',
      fieldLabel: 'Ajuste (%)',
      color: 'text-teal-600',
      supportsBoth: true as const,
    },
    giftcard: {
      icon: Gift,
      title: 'Gift Card',
      description: 'Configura descuento o recargo',
      fieldLabel: 'Ajuste (%)',
      color: 'text-pink-600',
      supportsBoth: true as const,
    },
    precio_lista: {
      icon: Tag,
      title: 'Precio de Lista',
      description: 'Valor base, opcionalmente ajustable',
      fieldLabel: 'Ajuste (%)',
      color: 'text-amber-600',
      supportsBoth: true as const,
    },
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Simulate save delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      showToast.success('Configuración guardada correctamente');
    } catch (error) {
      showToast.error('Error al guardar la Configuración');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='space-y-4'>
      <div className='grid gap-4'>
        {Object.entries(paymentMethodConfig).map(([method, config]) => {
          const methodKey = method as keyof typeof paymentMethodConfig;
          const raw = (settings.paymentMethods as any)[methodKey];
          const Icon = config.icon;
          const supportsBoth = 'supportsBoth' in config;

          const methodSettings =
            raw ??
            (supportsBoth
              ? { discountPercentage: 0, surchargePercentage: 0, enabled: true }
              : { [(config as any).fieldKey]: 0, enabled: true });

          const activeMode: 'descuento' | 'recargo' = supportsBoth
            ? (methodSettings.surchargePercentage ?? 0) > 0
              ? 'recargo'
              : 'descuento'
            : (config as any).fieldKey === 'surchargePercentage'
            ? 'recargo'
            : 'descuento';

          const activeFieldKey: 'discountPercentage' | 'surchargePercentage' =
            supportsBoth
              ? activeMode === 'recargo'
                ? 'surchargePercentage'
                : 'discountPercentage'
              : (config as any).fieldKey;

          return (
            <Card
              key={method}
              className='border-l-4 border-l-[#9d684e]'
            >
              <CardHeader className='py-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <Icon className={`w-6 h-6 ${config.color}`} />
                    <div>
                      <CardTitle className='text-lg'>{config.title}</CardTitle>
                      <CardDescription>{config.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className='space-y-2'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                  {'supportsBoth' in config && (
                    <div className='space-y-2'>
                      <Label>Tipo de ajuste</Label>
                      <Select
                        value={
                          'surchargePercentage' in (methodSettings as any) &&
                          (methodSettings as any).surchargePercentage > 0
                            ? 'recargo'
                            : 'descuento'
                        }
                        onValueChange={(val) => {
                          if (val === 'recargo') {
                            actions.updatePaymentMethodSettings(methodKey, {
                              surchargePercentage:
                                (methodSettings as any).discountPercentage ||
                                (methodSettings as any).surchargePercentage ||
                                0,
                              discountPercentage: 0,
                            });
                          } else {
                            actions.updatePaymentMethodSettings(methodKey, {
                              discountPercentage:
                                (methodSettings as any).surchargePercentage ||
                                (methodSettings as any).discountPercentage ||
                                0,
                              surchargePercentage: 0,
                            });
                          }
                        }}
                      >
                        <SelectTrigger
                          size='sm'
                          className='w-full'
                          aria-label='Tipo de ajuste'
                        >
                          <SelectValue placeholder='Seleccionar' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='descuento'>Descuento</SelectItem>
                          <SelectItem value='recargo'>Recargo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className='space-y-2'>
                    <Label htmlFor={`${method}-percentage`}>
                      {'supportsBoth' in config
                        ? (methodSettings as any).surchargePercentage > 0
                          ? 'Recargo (%)'
                          : 'Descuento (%)'
                        : config.fieldLabel}
                    </Label>
                    <div className='relative'>
                      <Input
                        id={`${method}-percentage`}
                        type='number'
                        min='0'
                        max='50'
                        step='0.1'
                        value={
                          'supportsBoth' in config
                            ? (methodSettings as any).surchargePercentage > 0
                              ? (methodSettings as any).surchargePercentage || 0
                              : (methodSettings as any).discountPercentage || 0
                            : (methodSettings as any)[
                                (config as any).fieldKey
                              ] || 0
                        }
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          const clamped = Math.max(0, Math.min(50, value));
                          if ('supportsBoth' in config) {
                            if (
                              (methodSettings as any).surchargePercentage > 0
                            ) {
                              actions.updatePaymentMethodSettings(methodKey, {
                                surchargePercentage: clamped,
                                discountPercentage: 0,
                              });
                            } else {
                              actions.updatePaymentMethodSettings(methodKey, {
                                discountPercentage: clamped,
                                surchargePercentage: 0,
                              });
                            }
                          } else {
                            actions.updatePaymentMethodSettings(methodKey, {
                              [(config as any).fieldKey]: clamped,
                            });
                          }
                        }}
                        className='pr-8'
                      />
                      <Percent className='absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                    </div>
                  </div>
                  {/* Botón de prueba eliminado para simplificar */}
                </div>

                {/* Vista previa eliminada para simplificar */}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className='flex justify-end'>
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className='bg-[#9d684e] hover:bg-[#8a5a45]'
        >
          <Save className='w-4 h-4 mr-2' />
          {isLoading ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </div>
  );
}
