/**
 * STAFF MANAGEMENT PAGE
 *
 * Página de gestión de personal siguiendo la arquitectura establecida
 */

'use client';

import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { KpiStrip } from '@/components/ui/kpi-strip';
import { EmployeesTable } from '@/components/dashboard/staff/employees-table';
import { EmployeeForm } from '@/components/dashboard/staff/employee-form';
import { StaffMobileView } from '@/components/dashboard/staff/staff-mobile-view';
import { useEmployees } from '@/hooks/useEmployees';
import { useInitialEmployeesData } from '@/hooks/useInitialEmployeesData';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, Search } from 'lucide-react';

export default function StaffPage() {
  useInitialEmployeesData();

  const {
    employees,
    stats,
    loading,
    filteredEmployees,
    setSearchQuery,
    setSelectedRole,
    searchQuery,
    selectedRole,
  } = useEmployees();
  const [showForm, setShowForm] = useState(false);
  const isMobile = useIsMobile();

  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
  };

  const handleRoleFilterChange = (role: string) => {
    setSelectedRole(role as typeof selectedRole);
  };

  const handleRefresh = () => {
    setSearchQuery('');
    setSelectedRole('all');
    setDateRange(undefined);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedRole('all');
    setDateRange(undefined);
  };

  const handleEditEmployee = (employee: any) => {
    console.log('Edit employee:', employee);
  };

  const handleDeleteEmployee = (employee: any) => {
    console.log('Delete employee:', employee);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
  };

  if (showForm) {
    return (
      <div className='space-y-6'>
        <PageHeader
          title='Nuevo Empleado'
          subtitle='Agregar un nuevo miembro al equipo'
          actions={
            <Button
              variant='outline'
              onClick={() => setShowForm(false)}
              className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30 w-full sm:w-auto'
            >
              Volver a la lista
            </Button>
          }
        />

        <EmployeeForm
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
        />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Gestión de Personal'
        subtitle='Administrá el equipo de trabajo de MÍSTICA'
        actions={
          <Button
            onClick={() => setShowForm(true)}
            className='bg-[#9d684e] hover:bg-[#8a5a45] text-white font-winter-solid w-full sm:w-auto'
          >
            <Plus className='h-4 w-4 mr-2' />
            Nuevo empleado
          </Button>
        }
      />

      <KpiStrip
        items={[
          { label: 'Total', value: stats.total, hint: 'empleados' },
          { label: 'Gerentes', value: stats.byRole.gerente || 0, accent: 'var(--color-terracota)' },
          { label: 'Cajeros', value: stats.byRole.cajero || 0, accent: 'var(--color-naranja-medio)' },
          { label: 'Mozos', value: stats.byRole.mozo || 0, accent: 'var(--color-ciruela-oscuro)' },
        ]}
      />

      {/* Lista + filtros compactos */}
      <Card className='border-[#9d684e]/20'>
        <CardContent className='pt-6 space-y-4'>
          <div className='flex flex-col sm:flex-row gap-3'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-[#455a54]/50 h-4 w-4 pointer-events-none' />
              <Input
                placeholder='Buscar por nombre, email o teléfono...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-10 border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20 h-10'
              />
            </div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as typeof selectedRole)}
              className='px-4 py-2 border border-[#9d684e]/20 rounded-md focus:border-[#9d684e] focus:outline-none h-10 w-full sm:w-[160px] bg-white text-[#455a54] font-winter-solid text-sm'
            >
              <option value='all'>Todos los roles</option>
              <option value='gerente'>Gerente</option>
              <option value='cajero'>Cajero</option>
              <option value='mozo'>Mozo</option>
            </select>
            {(searchQuery || selectedRole !== 'all') && (
              <Button
                variant='outline'
                onClick={() => {
                  setSearchQuery('');
                  setSelectedRole('all');
                }}
                className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30 h-10 px-4'
              >
                Limpiar
              </Button>
            )}
          </div>

          {(searchQuery || selectedRole !== 'all') && (
            <div className='text-sm text-[#455a54]/70 font-winter-solid'>
              Mostrando {filteredEmployees.length} de {employees.length} empleados
            </div>
          )}

          {isMobile ? (
            <StaffMobileView
              employees={filteredEmployees}
              onEdit={handleEditEmployee}
              onDelete={handleDeleteEmployee}
              searchTerm={searchQuery}
              onSearchChange={handleSearchChange}
              dateRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
              roleFilter={selectedRole}
              onRoleFilterChange={handleRoleFilterChange}
              onClearFilters={handleClearFilters}
            />
          ) : (
            <EmployeesTable
              data={filteredEmployees}
              isLoading={loading}
              searchValue={searchQuery}
              onSearchChange={handleSearchChange}
              dateRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
              roleFilter={selectedRole}
              onRoleFilterChange={handleRoleFilterChange}
              onRefresh={handleRefresh}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

