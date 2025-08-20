/**
 * STAFF MANAGEMENT PAGE
 * 
 * Página de gestión de personal siguiendo la arquitectura establecida
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmployeesTable } from '@/components/dashboard/staff/employees-table';
import { StaffStatsWidget, StaffRoleBreakdown } from '@/components/dashboard/staff/staff-stats-widget';
import { EmployeeForm } from '@/components/dashboard/staff/employee-form';
import { useEmployees } from '@/hooks/useEmployees';
import { Plus, Search, Users } from 'lucide-react';

export default function StaffPage() {
  const { employees, stats, searchEmployees } = useEmployees();
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  // Filter employees based on search criteria
  const filteredEmployees = searchEmployees(searchQuery, selectedRole);

  const handleFormSuccess = () => {
    setShowForm(false);
  };

  if (showForm) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-[#455a54] font-tan-nimbus mt-6'>
              Nuevo Empleado
            </h1>
            <p className='text-[#455a54]/70 font-winter-solid'>
              Agregar un nuevo miembro al equipo
            </p>
          </div>
          <Button
            variant='outline'
            onClick={() => setShowForm(false)}
            className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30'
          >
            Volver a la lista
          </Button>
        </div>

        <EmployeeForm
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
        />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-[#455a54] font-tan-nimbus mt-6'>
            Gestión de Personal
          </h1>
          <p className='text-[#455a54]/70 font-winter-solid'>
            Administra el equipo de trabajo de MÍSTICA
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className='bg-[#9d684e] hover:bg-[#9d684e]/90 text-white font-winter-solid'
        >
          <Plus className='mr-2 h-4 w-4' />
          Agregar Empleado
        </Button>
      </div>

      {/* Stats Cards */}
      <StaffStatsWidget />

      {/* Search and Filters */}
      <Card className='border-[#9d684e]/20'>
        <CardHeader>
          <CardTitle className='text-lg font-tan-nimbus text-[#455a54] flex items-center gap-2'>
            <Search className='h-5 w-5' />
            Buscar Empleados
          </CardTitle>
          <CardDescription className='text-[#455a54]/70'>
            Encuentra empleados por nombre, email o teléfono
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex gap-4 flex-wrap'>
            <div className='flex-1 min-w-[250px]'>
              <Input
                placeholder='Buscar por nombre, email o teléfono...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='border-[#9d684e]/20 focus:border-[#9d684e]'
              />
            </div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className='px-3 py-2 border border-[#9d684e]/20 rounded-md focus:border-[#9d684e] focus:outline-none'
            >
              <option value=''>Todos los roles</option>
              <option value='gerente'>Gerente</option>
              <option value='cajero'>Cajero</option>
            </select>
            {(searchQuery || selectedRole) && (
              <Button
                variant='outline'
                onClick={() => {
                  setSearchQuery('');
                  setSelectedRole('');
                }}
                className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30'
              >
                Limpiar
              </Button>
            )}
          </div>
          
          {searchQuery || selectedRole ? (
            <div className='mt-3 text-sm text-[#455a54]/70'>
              Mostrando {filteredEmployees.length} de {employees.length} empleados
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Employees Table */}
        <div className='lg:col-span-2'>
          <Card className='border-[#9d684e]/20'>
            <CardHeader>
              <CardTitle className='text-lg font-tan-nimbus text-[#455a54] flex items-center gap-2'>
                <Users className='h-5 w-5' />
                Lista de Empleados
              </CardTitle>
              <CardDescription className='text-[#455a54]/70'>
                {stats.total > 0 
                  ? `${stats.total} empleados registrados en el sistema`
                  : 'No hay empleados registrados'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmployeesTable data={filteredEmployees} />
            </CardContent>
          </Card>
        </div>

        {/* Staff Role Breakdown */}
        <div className='space-y-6'>
          <StaffRoleBreakdown />
          
          {/* Quick Actions */}
          <Card className='border-[#9d684e]/20'>
            <CardHeader>
              <CardTitle className='text-lg font-tan-nimbus text-[#455a54]'>
                Acciones Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <Button
                onClick={() => setShowForm(true)}
                variant='outline'
                className='w-full border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30'
              >
                <Plus className='mr-2 h-4 w-4' />
                Nuevo Empleado
              </Button>
              
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}