'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Prepaid, UpdatePrepaidRequest } from '@/services/prepaids.service';
import { formatCurrency } from '@/lib/sales-calculations';
import { X, Save, CreditCard } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { usePrepaidsAPI } from '@/hooks/usePrepaidsAPI';

interface EditPrepaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  prepaid: Prepaid | null;
  onPrepaidUpdated: () => void;
}

export function EditPrepaidModal({ isOpen, onClose, prepaid, onPrepaidUpdated }: EditPrepaidModalProps) {
  const [formData, setFormData] = useState({
    amount: 0,
    notes: '',
    status: 'PENDING' as 'PENDING' | 'CONSUMED'
  });

  const [isLoading, setIsLoading] = useState(false);
  const { updatePrepaid } = usePrepaidsAPI();

  useEffect(() => {
    if (prepaid) {
      setFormData({
        amount: prepaid.amount,
        notes: prepaid.notes || '',
        status: prepaid.status
      });
    }
  }, [prepaid]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!prepaid) return;

    try {
      setIsLoading(true);
      const updateData: UpdatePrepaidRequest = {
        amount: formData.amount,
        notes: formData.notes.trim() || undefined,
        status: formData.status
      };

      await updatePrepaid(prepaid.id, updateData);
      showToast.success('Seña actualizada exitosamente');
      onPrepaidUpdated();
      onClose();
    } catch (error) {
      showToast.error('Error actualizando la seña');
      console.error('Error updating prepaid:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!prepaid) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#455a54] font-tan-nimbus flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Editar Seña #{prepaid.id.slice(-6)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información Actual */}
          <Card className="border-[#9d684e]/20">
            <CardHeader>
              <CardTitle className="text-[#455a54] font-tan-nimbus">
                Información Actual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#455a54]/70 font-winter-solid">
                    ID de Seña
                  </label>
                  <p className="text-[#455a54] font-winter-solid">#{prepaid.id.slice(-6)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#455a54]/70 font-winter-solid">
                    Fecha de Creación
                  </label>
                  <p className="text-[#455a54] font-winter-solid">
                    {new Date(prepaid.createdAt).toLocaleDateString('es-AR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#455a54]/70 font-winter-solid">
                    Estado Actual
                  </label>
                  <p className="text-[#455a54] font-winter-solid">
                    {prepaid.status === 'PENDING' ? 'Pendiente' : 'Consumida'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#455a54]/70 font-winter-solid">
                    Monto Actual
                  </label>
                  <p className="text-[#455a54] font-winter-solid font-bold">
                    {formatCurrency(prepaid.amount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulario de Edición */}
          <Card className="border-[#9d684e]/20">
            <CardHeader>
              <CardTitle className="text-[#455a54] font-tan-nimbus">
                Editar Información
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[#455a54] font-winter-solid">
                  Monto de la Seña *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                  className="border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20"
                  placeholder="0.00"
                />
                <p className="text-sm text-[#455a54]/60 font-winter-solid mt-1">
                  Formato: {formatCurrency(formData.amount)}
                </p>
              </div>

              <div>
                <Label className="text-[#455a54] font-winter-solid">
                  Estado
                </Label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full p-2 border border-[#9d684e]/20 rounded-md focus:border-[#9d684e] focus:ring-[#9d684e]/20"
                >
                  <option value="PENDING">Pendiente</option>
                  <option value="CONSUMED">Consumida</option>
                </select>
              </div>

              <div>
                <Label className="text-[#455a54] font-winter-solid">
                  Notas
                </Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20"
                  placeholder="Notas adicionales sobre la seña..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-[#9d684e] text-[#9d684e] hover:bg-[#9d684e] hover:text-white"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || formData.amount <= 0}
            className="bg-[#9d684e] hover:bg-[#9d684e]/90 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
