'use client';

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
import { Switch } from '@/components/ui/switch';
import { Banknote, CreditCard, ArrowUpDown, Percent, Save, Info } from 'lucide-react';
import { showToast } from '@/lib/toast';

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
      accent: '#455a54',
    },
    tarjeta: {
      icon: CreditCard,
      title: 'Tarjeta',
      description: 'Recargo por comisión bancaria',
      fieldLabel: 'Recargo (%)',
      fieldKey: 'surchargePercentage' as const,
      accent: '#9d684e',
    },
    transferencia: {
      icon: ArrowUpDown,
      title: 'Transferencia',
      description: 'Descuento opcional por transferencia',
      fieldLabel: 'Descuento (%)',
      fieldKey: 'discountPercentage' as const,
      accent: '#cc844a',
    },
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      showToast.success('Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving payment settings:', error);
      showToast.error('Error al guardar la configuración');
    } finally {
      setIsLoading(false);
    }
  };

  const testPaymentCalculation = (
    method: keyof typeof paymentMethodConfig,
    amount: number
  ) => {
    const result = actions.calculatePaymentAdjustment(amount, method);
    if (result.adjustmentType !== 'ninguno') {
      showToast.info(
        `Ejemplo: $${amount} → $${result.finalAmount.toFixed(2)} (${
          result.adjustmentType
        } ${result.adjustmentPercentage}%)`
      );
    }
  };

  return (
    <div className='space-y-5'>
      <div className='space-y-4'>
        {Object.entries(paymentMethodConfig).map(([method, config]) => {
          const methodKey = method as keyof typeof paymentMethodConfig;
          const methodSettings = settings.paymentMethods[methodKey];
          const Icon = config.icon;
          const value = (methodSettings as any)[config.fieldKey] || 0; // eslint-disable-line @typescript-eslint/no-explicit-any

          return (
            <Card
              key={method}
              className='border-[#9d684e]/20 border-l-4'
              style={{ borderLeftColor: config.accent }}
            >
              <CardHeader className='pb-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex items-center gap-3'>
                    <div
                      className='w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0'
                      style={{ backgroundColor: `${config.accent}15` }}
                    >
                      <Icon className='w-5 h-5' style={{ color: config.accent }} />
                    </div>
                    <div>
                      <CardTitle className='text-base font-tan-nimbus text-[#455a54]'>
                        {config.title}
                      </CardTitle>
                      <CardDescription className='font-winter-solid text-xs text-[#455a54]/70'>
                        {config.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={methodSettings.enabled}
                    onCheckedChange={(enabled) =>
                      actions.updatePaymentMethodSettings(methodKey, { enabled })
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end'>
                  <div className='space-y-2'>
                    <Label
                      htmlFor={`${method}-percentage`}
                      className='text-xs font-winter-solid text-[#455a54]/80'
                    >
                      {config.fieldLabel}
                    </Label>
                    <div className='relative'>
                      <Input
                        id={`${method}-percentage`}
                        type='number'
                        min='0'
                        max='50'
                        step='0.1'
                        value={value}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          actions.updatePaymentMethodSettings(methodKey, {
                            [config.fieldKey]: Math.max(0, Math.min(50, v)),
                          });
                        }}
                        disabled={!methodSettings.enabled}
                        className='pr-9 font-mono tabular-nums border-[#9d684e]/20 focus:border-[#9d684e]'
                      />
                      <Percent className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#455a54]/40' />
                    </div>
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => testPaymentCalculation(methodKey, 1000)}
                    disabled={!methodSettings.enabled || !value}
                    className='h-10 border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30 font-winter-solid'
                  >
                    Probar con $1000
                  </Button>
                </div>

                {methodSettings.enabled && value > 0 && (
                  <div
                    className='rounded-md p-3 text-sm font-winter-solid'
                    style={{
                      backgroundColor: `${config.accent}08`,
                      border: `1px solid ${config.accent}25`,
                      color: '#455a54',
                    }}
                  >
                    <span className='text-[#455a54]/70'>Vista previa:</span>{' '}
                    <span className='tabular-nums font-mono'>$1000</span> →{' '}
                    <span className='tabular-nums font-mono font-semibold'>
                      $
                      {actions
                        .calculatePaymentAdjustment(1000, methodKey)
                        .finalAmount.toFixed(2)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className='border-[#9d684e]/20 bg-[#efcbb9]/20'>
        <CardContent className='pt-6 text-sm text-[#455a54]/80 font-winter-solid space-y-2'>
          <div className='flex items-start gap-2'>
            <Info className='h-4 w-4 text-[#9d684e] flex-shrink-0 mt-0.5' />
            <div className='space-y-1.5'>
              <p>
                Los descuentos y recargos se aplican automáticamente al elegir el método
                de pago en una venta.
              </p>
              <p>En pagos mixtos no se aplican ajustes automáticos.</p>
              <p>
                Usá <strong>Probar</strong> para ver el cálculo final con un ejemplo de
                $1000.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end'>
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className='bg-[#9d684e] hover:bg-[#8a5a45] text-white font-winter-solid'
        >
          <Save className='w-4 h-4 mr-2' />
          {isLoading ? 'Guardando...' : 'Guardar configuración'}
        </Button>
      </div>
    </div>
  );
}
