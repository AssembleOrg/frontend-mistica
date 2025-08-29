'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEmployees } from '@/hooks/useEmployees';
import { showToast } from '@/lib/toast';
import { Employee, EmployeeCreationData } from '@/lib/types';

interface EmployeeFormProps {
  employee?: Employee;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EmployeeForm({ employee, onSuccess, onCancel }: EmployeeFormProps) {
  const { createEmployee, updateEmployee } = useEmployees();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<EmployeeCreationData>({
    name: employee?.name || '',
    email: employee?.email || '',
    role: employee?.role || 'cajero',
    phone: employee?.phone || '',
    address: employee?.address || '',
    startDate: employee?.startDate || new Date(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (employee) {
        // Update existing employee
        const updateData = {
          ...formData,
          startDate: formData.startDate instanceof Date 
            ? formData.startDate.toISOString().split('T')[0] 
            : formData.startDate
        };
        await updateEmployee(employee.id, updateData);
        showToast.success('Empleado actualizado', 'Los datos del empleado han sido actualizados correctamente.');
      } else {
        // Create new employee
        const createData = {
          ...formData,
          startDate: formData.startDate instanceof Date 
            ? formData.startDate.toISOString().split('T')[0] 
            : formData.startDate
        };
        await createEmployee(createData);
        showToast.success('Empleado creado', 'El nuevo empleado ha sido agregado al sistema.');
      }
      
      onSuccess?.();
    } catch (error) {
      console.error('Error saving employee:', error);
      showToast.error(
        'Error',
        error instanceof Error ? error.message : 'Error al guardar el empleado'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof EmployeeCreationData, value: string | number | Date) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card className='border-[#9d684e]/20'>
      <CardHeader>
        <CardTitle className='text-lg font-tan-nimbus text-[#455a54]'>
          {employee ? 'Editar Empleado' : 'Nuevo Empleado'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='name' className='text-sm font-medium text-[#455a54]'>
                Nombre completo *
              </Label>
              <Input
                id='name'
                type='text'
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder='Nombre y apellido'
                className='border-[#9d684e]/20 focus:border-[#9d684e]'
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='email' className='text-sm font-medium text-[#455a54]'>
                Email *
              </Label>
              <Input
                id='email'
                type='email'
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder='email@mistica.com'
                className='border-[#9d684e]/20 focus:border-[#9d684e]'
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='role' className='text-sm font-medium text-[#455a54]'>
                Rol *
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value: Employee['role']) => handleInputChange('role', value)}
              >
                <SelectTrigger className='border-[#9d684e]/20 focus:border-[#9d684e]'>
                  <SelectValue placeholder='Seleccionar rol' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='gerente'>Gerente</SelectItem>
                  <SelectItem value='cajero'>Cajero</SelectItem>
                  <SelectItem value='mozo'>Mozo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='phone' className='text-sm font-medium text-[#455a54]'>
                Teléfono
              </Label>
              <Input
                id='phone'
                type='tel'
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder='+54 11 1234-5678'
                className='border-[#9d684e]/20 focus:border-[#9d684e]'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='startDate' className='text-sm font-medium text-[#455a54]'>
                Fecha de ingreso *
              </Label>
              <Input
                id='startDate'
                type='date'
                value={formData.startDate.toISOString().split('T')[0]}
                onChange={(e) => handleInputChange('startDate', new Date(e.target.value))}
                className='border-[#9d684e]/20 focus:border-[#9d684e]'
                required
              />
            </div>

          </div>

          <div className='space-y-2'>
            <Label htmlFor='address' className='text-sm font-medium text-[#455a54]'>
              Dirección
            </Label>
            <Input
              id='address'
              type='text'
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder='Dirección completa'
              className='border-[#9d684e]/20 focus:border-[#9d684e]'
            />
          </div>

          <div className='flex gap-3 pt-4'>
            <Button
              type='submit'
              disabled={isLoading}
              className='bg-[#455a54] hover:bg-[#455a54]/90 text-white flex-1'
            >
              {isLoading ? 'Guardando...' : employee ? 'Actualizar' : 'Crear Empleado'}
            </Button>
            {onCancel && (
              <Button
                type='button'
                variant='outline'
                onClick={onCancel}
                disabled={isLoading}
                className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30'
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}