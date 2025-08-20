/**
 * EDIT EMPLOYEE PAGE
 * 
 * Página de edición de empleado individual
 */

'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { EmployeeForm } from '@/components/dashboard/staff/employee-form';
import { useEmployees } from '@/hooks/useEmployees';
import { Employee } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';

interface EditEmployeePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditEmployeePage({ params }: EditEmployeePageProps) {
  const router = useRouter();
  const { getEmployeeById } = useEmployees();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  
  const resolvedParams = use(params);

  useEffect(() => {
    const emp = getEmployeeById(resolvedParams.id);
    setEmployee(emp || null);
    setLoading(false);
  }, [resolvedParams.id, getEmployeeById]);

  const handleSuccess = () => {
    router.push('/dashboard/staff');
  };

  const handleCancel = () => {
    router.push('/dashboard/staff');
  };

  if (loading) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-[#455a54] font-tan-nimbus mt-6'>
              Cargando...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-[#455a54] font-tan-nimbus mt-6'>
              Empleado no encontrado
            </h1>
            <p className='text-[#455a54]/70 font-winter-solid'>
              El empleado que buscas no existe o ha sido eliminado
            </p>
          </div>
          <Button
            onClick={() => router.push('/dashboard/staff')}
            variant='outline'
            className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30'
          >
            <ArrowLeft className='mr-2 h-4 w-4' />
            Volver a Personal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-[#455a54] font-tan-nimbus mt-6'>
            Editar Empleado
          </h1>
          <p className='text-[#455a54]/70 font-winter-solid'>
            Modificar información de {employee?.name}
          </p>
        </div>
        <Button
          onClick={handleCancel}
          variant='outline'
          className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30'
        >
          <ArrowLeft className='mr-2 h-4 w-4' />
          Volver a Personal
        </Button>
      </div>

      <EmployeeForm
        employee={employee}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}