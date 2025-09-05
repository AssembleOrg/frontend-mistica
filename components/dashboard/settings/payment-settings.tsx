'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/stores/settings.store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Banknote, CreditCard, ArrowUpDown, Percent, Save } from 'lucide-react';
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
      color: 'text-green-600',
    },
    tarjeta: {
      icon: CreditCard,
      title: 'Tarjeta',
      description: 'Recargo por comisión bancaria',
      fieldLabel: 'Recargo (%)',
      fieldKey: 'surchargePercentage' as const,
      color: 'text-blue-600',
    },
    transferencia: {
      icon: ArrowUpDown,
      title: 'Transferencia',
      description: 'Sin recargo por defecto',
      fieldLabel: 'Descuento (%)',
      fieldKey: 'discountPercentage' as const,
      color: 'text-purple-600',
    },
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 500));
      showToast.success('Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving payment settings:', error);
      showToast.error('Error al guardar la configuración');
    } finally {
      setIsLoading(false);
    }
  };

  const testPaymentCalculation = (method: keyof typeof paymentMethodConfig, amount: number) => {
    const result = actions.calculatePaymentAdjustment(amount, method);
    if (result.adjustmentType !== 'ninguno') {
      showToast.info(
        `Ejemplo: $${amount} → $${result.finalAmount.toFixed(2)} (${result.adjustmentType} ${result.adjustmentPercentage}%)`
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {Object.entries(paymentMethodConfig).map(([method, config]) => {
          const methodKey = method as keyof typeof paymentMethodConfig;
          const methodSettings = settings.paymentMethods[methodKey];
          const Icon = config.icon;

          return (
            <Card key={method} className="border-l-4 border-l-[#9d684e]">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-6 h-6 ${config.color}`} />
                    <div>
                      <CardTitle className="text-lg">{config.title}</CardTitle>
                      <CardDescription>{config.description}</CardDescription>
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
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${method}-percentage`}>
                      {config.fieldLabel}
                    </Label>
                    <div className="relative">
                      <Input
                        id={`${method}-percentage`}
                        type="number"
                        min="0"
                        max="50"
                        step="0.1"
                        value={(methodSettings as any)[config.fieldKey] || 0} // eslint-disable-line @typescript-eslint/no-explicit-any
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          actions.updatePaymentMethodSettings(methodKey, { 
                            [config.fieldKey]: Math.max(0, Math.min(50, value))
                          });
                        }}
                        disabled={!methodSettings.enabled}
                        className="pr-8"
                      />
                      <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testPaymentCalculation(methodKey, 1000)}
                      disabled={!methodSettings.enabled || !(methodSettings as any)[config.fieldKey]} // eslint-disable-line @typescript-eslint/no-explicit-any
                      className="h-10"
                    >
                      Probar con $1000
                    </Button>
                  </div>
                </div>

                {methodSettings.enabled && (methodSettings as any)[config.fieldKey] > 0 && ( // eslint-disable-line @typescript-eslint/no-explicit-any
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <p className="text-sm text-gray-600">
                      <strong>Vista previa:</strong> Con {(methodSettings as any)[config.fieldKey]}% de {' '} {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                      {config.fieldKey === 'discountPercentage' ? 'descuento' : 'recargo'}, 
                      una venta de $1000 quedará en ${' '}
                      {actions.calculatePaymentAdjustment(1000, methodKey).finalAmount.toFixed(2)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800 text-base">💡 Información Importante</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 space-y-2">
          <p>• Los descuentos y recargos se aplicarán automáticamente al seleccionar el método de pago</p>
          <p>• Para pagos mixtos, no se aplicarán descuentos/recargos automáticos</p>
          <p>• Los cambios se guardan automáticamente al modificar los valores</p>
          <p>• Usa el botón &ldquo;Probar&rdquo; para verificar los cálculos con ejemplos</p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={isLoading}
          className="bg-[#9d684e] hover:bg-[#8a5a45]"
        >
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </div>
  );
}