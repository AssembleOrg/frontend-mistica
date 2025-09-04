'use client';

import { useSettingsStore } from '@/stores/settings.store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Building, Phone, MessageSquare, User, Eye, Save } from 'lucide-react';
import { useState } from 'react';
import { showToast } from '@/lib/toast';

export function ReceiptSettings() {
  const { settings, actions } = useSettingsStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      showToast.success('Configuración de recibos guardada');
    } catch (error) {
      showToast.error('Error al guardar la configuración');
    } finally {
      setIsLoading(false);
    }
  };

  const previewReceiptFormat = () => {
    const preview = `
=================================
${settings.receipt.showLogo ? '[LOGO MÍSTICA]' : ''}
${settings.receipt.businessName}
${settings.receipt.businessAddress}
${settings.receipt.businessPhone}
=================================

RECIBO DE VENTA #12345
Fecha: ${new Date().toLocaleDateString()}

---------------------------------
1x Producto Ejemplo      $100.00
---------------------------------
Subtotal:               $100.00
${settings.receipt.showPaymentMethodDetails ? 'Método: Efectivo (5% desc)    -$5.00' : ''}
TOTAL:                   $95.00

${settings.receipt.showEmployeeInfo ? 'Atendido por: Juan Pérez' : ''}

${settings.receipt.footerMessage}
=================================
    `.trim();
    
    showToast.info('Vista previa del recibo:', preview);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Información del Negocio
            </CardTitle>
            <CardDescription>
              Datos que aparecerán en todos los recibos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business-name">Nombre del Negocio</Label>
                <Input
                  id="business-name"
                  value={settings.receipt.businessName}
                  onChange={(e) => actions.updateReceiptSettings({ businessName: e.target.value })}
                  placeholder="MÍSTICA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-phone">Teléfono</Label>
                <Input
                  id="business-phone"
                  value={settings.receipt.businessPhone}
                  onChange={(e) => actions.updateReceiptSettings({ businessPhone: e.target.value })}
                  placeholder="(011) 1234-5678"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="business-address">Dirección</Label>
              <Input
                id="business-address"
                value={settings.receipt.businessAddress}
                onChange={(e) => actions.updateReceiptSettings({ businessAddress: e.target.value })}
                placeholder="Dirección del negocio"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Opciones de Visualización
            </CardTitle>
            <CardDescription>
              Controla qué información se muestra en los recibos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Mostrar logo</Label>
                <p className="text-sm text-gray-600">Incluir el logo de MÍSTICA en el encabezado</p>
              </div>
              <Switch
                checked={settings.receipt.showLogo}
                onCheckedChange={(checked) => actions.updateReceiptSettings({ showLogo: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Detalles del método de pago</Label>
                <p className="text-sm text-gray-600">Mostrar descuentos/recargos aplicados</p>
              </div>
              <Switch
                checked={settings.receipt.showPaymentMethodDetails}
                onCheckedChange={(checked) => actions.updateReceiptSettings({ showPaymentMethodDetails: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Información del empleado</Label>
                <p className="text-sm text-gray-600">Mostrar quién atendió la venta</p>
              </div>
              <Switch
                checked={settings.receipt.showEmployeeInfo}
                onCheckedChange={(checked) => actions.updateReceiptSettings({ showEmployeeInfo: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Mensaje de Pie
            </CardTitle>
            <CardDescription>
              Mensaje personalizado que aparece al final del recibo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="footer-message">Mensaje</Label>
              <Textarea
                id="footer-message"
                value={settings.receipt.footerMessage}
                onChange={(e) => actions.updateReceiptSettings({ footerMessage: e.target.value })}
                placeholder="Gracias por su compra"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-green-800">Vista Previa del Recibo</h4>
              <p className="text-sm text-green-600">Haz clic para ver cómo se verá el recibo con la configuración actual</p>
            </div>
            <Button
              variant="outline"
              onClick={previewReceiptFormat}
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              <Eye className="w-4 h-4 mr-2" />
              Vista Previa
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