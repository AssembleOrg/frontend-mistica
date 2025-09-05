'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/stores/app.store';
import { showToast } from '@/lib/toast';
import { Expense } from '@/lib/types';
import { Minus, X } from 'lucide-react';

interface ExpenseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const expenseCategories = [
  'compras_inventario',
  'servicios_publicos', 
  'alquiler',
  'sueldos',
  'marketing',
  'mantenimiento',
  'impuestos',
  'otros'
] as const;

const categoryLabels = {
  compras_inventario: 'Compras de Inventario',
  servicios_publicos: 'Servicios Públicos',
  alquiler: 'Alquiler',
  sueldos: 'Sueldos',
  marketing: 'Marketing',
  mantenimiento: 'Mantenimiento', 
  impuestos: 'Impuestos',
  otros: 'Otros'
};

export function ExpenseForm({ onSuccess, onCancel }: ExpenseFormProps) {
  const { addExpense } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '' as Expense['category'] | '',
    paymentMethod: '' as 'CASH' | 'CARD' | 'TRANSFER' | '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.description.trim()) {
        throw new Error('La descripción es requerida');
      }
      
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('El monto debe ser mayor a 0');
      }
      
      if (!formData.category) {
        throw new Error('La categoría es requerida');
      }
      
      if (!formData.paymentMethod) {
        throw new Error('El método de pago es requerido');
      }

      const expense: Expense = {
        id: crypto.randomUUID(),
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes.trim() || undefined,
        userId: 'current-user-id', // TODO: Get from auth context
        createdAt: new Date(),
      };

      addExpense(expense);
      showToast.success('Egreso registrado', 'El gasto ha sido registrado correctamente.');
      
      onSuccess?.();
    } catch (error) {
      console.error('Error saving expense:', error);
      showToast.error(
        'Error',
        error instanceof Error ? error.message : 'Error al registrar el gasto'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card className='border-[#9d684e]/20'>
      <CardHeader>
        <CardTitle className='text-lg font-tan-nimbus text-[#455a54] flex items-center gap-2'>
          <Minus className='h-5 w-5' />
          Registrar Egreso
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='description' className='text-sm font-medium text-[#455a54]'>
                Descripción *
              </Label>
              <Input
                id='description'
                type='text'
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder='Ej: Compra de aceites esenciales'
                className='border-[#9d684e]/20 focus:border-[#9d684e]'
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='amount' className='text-sm font-medium text-[#455a54]'>
                Monto ($) *
              </Label>
              <Input
                id='amount'
                type='number'
                step='0.01'
                min='0'
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder='0.00'
                className='border-[#9d684e]/20 focus:border-[#9d684e]'
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='category' className='text-sm font-medium text-[#455a54]'>
                Categoría *
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value: Expense['category']) => handleInputChange('category', value)}
              >
                <SelectTrigger className='border-[#9d684e]/20 focus:border-[#9d684e]'>
                  <SelectValue placeholder='Seleccionar categoría' />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {categoryLabels[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='paymentMethod' className='text-sm font-medium text-[#455a54]'>
                Método de Pago *
              </Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value: 'efectivo' | 'tarjeta' | 'transferencia') => 
                  handleInputChange('paymentMethod', value)
                }
              >
                <SelectTrigger className='border-[#9d684e]/20 focus:border-[#9d684e]'>
                  <SelectValue placeholder='Seleccionar método' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='efectivo'>Efectivo</SelectItem>
                  <SelectItem value='tarjeta'>Tarjeta</SelectItem>
                  <SelectItem value='transferencia'>Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='notes' className='text-sm font-medium text-[#455a54]'>
              Notas (Opcional)
            </Label>
            <Textarea
              id='notes'
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder='Información adicional sobre el gasto...'
              className='border-[#9d684e]/20 focus:border-[#9d684e] min-h-[80px]'
            />
          </div>

          <div className='flex gap-3 pt-4'>
            <Button
              type='submit'
              disabled={isLoading}
              className='bg-red-600 hover:bg-red-700 text-white flex-1'
            >
              {isLoading ? 'Registrando...' : 'Registrar Egreso'}
            </Button>
            {onCancel && (
              <Button
                type='button'
                variant='outline'
                onClick={onCancel}
                disabled={isLoading}
                className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30'
              >
                <X className='mr-2 h-4 w-4' />
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}