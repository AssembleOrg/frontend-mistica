'use client';

import { useSettingsStore } from '@/stores/settings.store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShoppingCart, Percent, Save, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { showToast } from '@/lib/toast';

export function GeneralSettings() {
  const { settings, actions } = useSettingsStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      showToast.success('Configuración general guardada');
    } catch (error) {
      console.error('Error saving general settings:', error);
      showToast.error('Error al guardar la configuración');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm('¿Estás seguro de que quieres restaurar toda la configuración a los valores por defecto?')) {
      actions.resetToDefaults();
      showToast.success('Configuración restaurada a valores por defecto');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5" />
              Configuración Fiscal
            </CardTitle>
            <CardDescription>
              Configuración de impuestos y aspectos fiscales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tax-rate">Tasa de IVA (%)</Label>
              <div className="relative">
                <Input
                  id="tax-rate"
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={settings.general.taxRate}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    actions.updateGeneralSettings({ taxRate: Math.max(0, Math.min(50, value)) });
                  }}
                  className="pr-8"
                />
                <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">
                Tasa de IVA que se aplicará a las ventas (21% por defecto en Argentina)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Configuración de Ventas
            </CardTitle>
            <CardDescription>
              Opciones para el sistema de punto de venta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Permitir stock negativo</Label>
                <p className="text-sm text-gray-600">
                  Permite vender productos aunque el stock sea insuficiente
                </p>
              </div>
              <Switch
                checked={settings.general.allowNegativeStock}
                onCheckedChange={(checked) => actions.updateGeneralSettings({ allowNegativeStock: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Requerir información del cliente</Label>
                <p className="text-sm text-gray-600">
                  Obligar a ingresar datos del cliente en cada venta
                </p>
              </div>
              <Switch
                checked={settings.general.requireCustomerInfo}
                onCheckedChange={(checked) => actions.updateGeneralSettings({ requireCustomerInfo: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Generar recibo automáticamente</Label>
                <p className="text-sm text-gray-600">
                  Crear y mostrar el recibo inmediatamente después de completar la venta
                </p>
              </div>
              <Switch
                checked={settings.general.autoGenerateReceipt}
                onCheckedChange={(checked) => actions.updateGeneralSettings({ autoGenerateReceipt: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Alertas y Notificaciones
            </CardTitle>
            <CardDescription>
              Configuración de alertas del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Alertas de stock bajo</Label>
                <p className="text-sm text-gray-600">
                  Mostrar avisos cuando los productos tengan stock bajo
                </p>
              </div>
              <Switch
                checked={settings.general.lowStockWarning}
                onCheckedChange={(checked) => actions.updateGeneralSettings({ lowStockWarning: checked })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-yellow-800 text-base">⚠️ Zona de Riesgo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 mb-2">
                <strong>Restaurar configuración por defecto</strong>
              </p>
              <p className="text-sm text-yellow-600">
                Esta acción eliminará toda tu configuración personalizada y restaurará los valores por defecto. 
                Esta acción no se puede deshacer.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleReset}
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Restaurar
            </Button>
          </div>
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