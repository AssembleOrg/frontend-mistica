'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Client, CreateClientRequest, UpdateClientRequest } from '@/services/clients.service';
import { formatCurrency } from '@/lib/sales-calculations';

interface PrepaidItem {
  amount: number;
  notes: string;
}

interface ClientFormProps {
  client?: Client | null;
  onSave: (clientData: CreateClientRequest | UpdateClientRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ClientForm({ client, onSave, onCancel, isLoading = false }: ClientFormProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    cuit: '',
    notes: '',
  });

  const [prepaids, setPrepaids] = useState<PrepaidItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (client) {
      setFormData({
        fullName: client.fullName || '',
        phone: client.phone || '',
        email: client.email || '',
        cuit: client.cuit || '',
        notes: client.notes || '',
      });
    } else {
      setFormData({
        fullName: '',
        phone: '',
        email: '',
        cuit: '',
        notes: '',
      });
    }
    setPrepaids([]);
    setErrors({});
  }, [client]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePrepaidChange = (index: number, field: keyof PrepaidItem, value: string | number) => {
    setPrepaids(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleAmountChange = (index: number, value: number) => {
    setPrepaids(prev => prev.map((item, i) => 
      i === index ? { ...item, amount: value } : item
    ));
  };

  const addPrepaid = () => {
    // Check if client already has an active prepaid
    if (client && client.prepaid && client.prepaid > 0) {
      showToast.error('Error', 'El cliente ya tiene una seña activa. No se puede agregar otra.');
      return;
    }
    
    setPrepaids(prev => [...prev, { amount: 0, notes: '' }]);
  };

  const removePrepaid = (index: number) => {
    setPrepaids(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'El nombre completo es requerido';
    }

    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'El email debe tener un formato válido';
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
      newErrors.phone = 'El teléfono debe tener un formato válido';
    }

    if (formData.cuit && !isValidCUIT(formData.cuit)) {
      newErrors.cuit = 'El CUIT debe tener el formato XX-XXXXXXXX-X';
    }

    // Validate prepaids
    prepaids.forEach((prepaid, index) => {
      if (prepaid.amount <= 0) {
        newErrors[`prepaid_${index}_amount`] = 'El monto debe ser mayor a 0';
      }
      if (prepaid.amount > 100000) {
        newErrors[`prepaid_${index}_amount`] = 'El monto no puede ser mayor a $100,000';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string): boolean => {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  };

  const isValidCUIT = (cuit: string): boolean => {
    const cuitRegex = /^\d{2}-\d{8}-\d{1}$/;
    return cuitRegex.test(cuit);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast.error('Error', 'Por favor corrige los errores en el formulario');
      return;
    }

    try {
      const clientData: CreateClientRequest | UpdateClientRequest = {
        ...formData,
        prepaids: prepaids.length > 0 ? prepaids : undefined,
      };

      await onSave(clientData);
    } catch (error) {
      console.error('Error saving client:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-[#455a54] font-tan-nimbus mt-6'>
            {client ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h1>
          <p className='text-[#455a54]/70 font-winter-solid'>
            {client ? 'Modifica la información del cliente' : 'Complete la información del nuevo cliente'}
          </p>
          <p className='text-sm text-[#455a54]/60 font-winter-solid mt-1'>
            Los campos marcados con <span className='text-red-500'>*</span> son obligatorios
          </p>
        </div>
      </div>

      <Card className="w-full max-w-2xl mx-auto border-[#9d684e]/20">
        <CardHeader>
          <CardTitle className="text-[#455a54] font-tan-nimbus">
            {client ? 'Editar Cliente' : 'Nuevo Cliente'}
          </CardTitle>
        </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#455a54] font-tan-nimbus">Información Básica</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-[#455a54] font-winter-solid">Nombre Completo *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className={`border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20 ${errors.fullName ? 'border-red-500' : ''}`}
                  placeholder="Ej: Juan Pérez"
                />
                {errors.fullName && (
                  <p className="text-sm text-red-500 font-winter-solid">{errors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[#455a54] font-winter-solid">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20 ${errors.phone ? 'border-red-500' : ''}`}
                  placeholder="Ej: +54 11 1234-5678"
                />
                {errors.phone && (
                  <p className="text-sm text-red-500 font-winter-solid">{errors.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#455a54] font-winter-solid">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20 ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="Ej: juan@email.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-500 font-winter-solid">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cuit" className="text-[#455a54] font-winter-solid">CUIT</Label>
                <Input
                  id="cuit"
                  value={formData.cuit}
                  onChange={(e) => handleInputChange('cuit', e.target.value)}
                  className={`border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20 ${errors.cuit ? 'border-red-500' : ''}`}
                  placeholder="Ej: 20-12345678-9"
                />
                {errors.cuit && (
                  <p className="text-sm text-red-500 font-winter-solid">{errors.cuit}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-[#455a54] font-winter-solid">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Información adicional sobre el cliente..."
                rows={3}
                className="border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20"
              />
            </div>
          </div>

          {/* Prepaids Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-[#455a54] font-tan-nimbus">Señas (Opcional)</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPrepaid}
                className="flex items-center gap-2 border-[#9d684e] text-[#9d684e] hover:bg-[#9d684e] hover:text-white disabled:opacity-50"
                disabled={!!(client && client.prepaid && client.prepaid > 0) || prepaids.length > 0}
              >
                <Plus className="h-4 w-4" />
                Agregar Seña
              </Button>
            </div>

            {client && client.prepaid && client.prepaid > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-700 font-winter-solid">
                  ⚠️ Este cliente ya tiene una seña activa de {formatCurrency(client.prepaid)}. No se puede agregar otra seña.
                </p>
              </div>
            )}

            {prepaids.length === 0 ? (
              <p className="text-sm text-[#455a54]/50 text-center py-4 font-winter-solid">
                No hay señas agregadas. Haz clic en &quot;Agregar Seña&quot; para agregar una.
              </p>
            ) : (
              <div className="space-y-3">
                {prepaids.map((prepaid, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Label htmlFor={`prepaid_amount_${index}`} className="text-[#455a54] font-winter-solid">Monto (ARS)</Label>
                      <CurrencyInput
                        id={`prepaid_amount_${index}`}
                        value={prepaid.amount || 0}
                        onChange={(value) => handleAmountChange(index, value)}
                        placeholder="0,00"
                        className={errors[`prepaid_${index}_amount`] ? 'border-red-500' : ''}
                      />
                      {errors[`prepaid_${index}_amount`] && (
                        <p className="text-sm text-red-500 font-winter-solid">{errors[`prepaid_${index}_amount`]}</p>
                      )}
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`prepaid_notes_${index}`} className="text-[#455a54] font-winter-solid">Notas</Label>
                      <Input
                        id={`prepaid_notes_${index}`}
                        value={prepaid.notes}
                        onChange={(e) => handlePrepaidChange(index, 'notes', e.target.value)}
                        placeholder="Descripción de la seña..."
                        className="border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePrepaid(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="border-[#9d684e] text-[#9d684e] hover:bg-[#9d684e] hover:text-white"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="flex items-center gap-2 bg-[#9d684e] hover:bg-[#9d684e]/90 text-white"
            >
              <Save className="h-4 w-4" />
              {isLoading ? 'Guardando...' : (client ? 'Actualizar' : 'Crear')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    </div>
  );
}
