/**
 * STAFF MANAGEMENT PAGE
 * 
 * Página de gestión de personal siguiendo la arquitectura establecida
 */

'use client';

import { useState } from 'react';
import { DateRange } from 'react-day-picker';
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
import { StaffStatsWidget } from '@/components/dashboard/staff/staff-stats-widget';
import { EmployeeForm } from '@/components/dashboard/staff/employee-form';
import { StaffMobileView } from '@/components/dashboard/staff/staff-mobile-view';
import { QuickActionsWidget } from '@/components/dashboard/quick-actions-widget';
import { useEmployees } from '@/hooks/useEmployees';
import { useInitialEmployeesData } from '@/hooks/useInitialEmployeesData';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, Search, Users } from 'lucide-react';

export default function StaffPage() {
  // Initialize employees data
  useInitialEmployeesData();
  
  const { employees, stats, loading, filteredEmployees, setSearchQuery, setSelectedRole, searchQuery, selectedRole } = useEmployees();
  const [showForm, setShowForm] = useState(false);
  const isMobile = useIsMobile();

  // Filter state for TableFilters
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Filter handlers
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    // TODO: Implement date filtering in the hook
  };

  const handleRoleFilterChange = (role: string) => {
    setSelectedRole(role as typeof selectedRole);
  };

  const handleRefresh = () => {
    // Clear filters and reload
    setSearchQuery('');
    setSelectedRole('all');
    setDateRange(undefined);
  };

  // Mobile filter handlers
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedRole('all');
    setDateRange(undefined);
  };

  const handleEditEmployee = (employee: any) => {
    // TODO: Implement edit employee functionality
    console.log('Edit employee:', employee);
  };

  const handleDeleteEmployee = (employee: any) => {
    // TODO: Implement delete employee functionality
    console.log('Delete employee:', employee);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
  };

  if (showForm) {
    return (
      <div className='space-y-6'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <div>
            <h1 className='text-2xl sm:text-3xl font-bold text-[#455a54] font-tan-nimbus mt-6'>
              Nuevo Empleado
            </h1>
            <p className='text-[#455a54]/70 font-winter-solid text-sm sm:text-base'>
              Agregar un nuevo miembro al equipo
            </p>
          </div>
          <Button
            variant='outline'
            onClick={() => setShowForm(false)}
            className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30 w-full sm:w-auto'
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
          <h1 className='text-2xl sm:text-3xl font-bold text-[#455a54] font-tan-nimbus mt-6'>
            Gestión de Personal
          </h1>
          <p className='text-[#455a54]/70 font-winter-solid text-sm sm:text-base'>
            Administra el equipo de trabajo de MÍSTICA
          </p>
        </div>
        {/* Actions moved to dedicated widget below */}
      </div>

      {/* Quick Actions */}
      <QuickActionsWidget
        title="Gestión de Personal"
        description="Acciones rápidas para el equipo"
        layout="horizontal"
        actions={[
          {
            id: 'new-employee',
            title: 'Nuevo Empleado',
            description: 'Agregar miembro al equipo',
            icon: Plus,
            color: 'primary',
            onClick: () => setShowForm(true)
          }
        ]}
      />

      {/* Combined Stats & Search - Horizontal Layout */}
      <Card className='border-[#9d684e]/20'>
        <CardHeader>
          <CardTitle className='text-lg font-tan-nimbus text-[#455a54] flex items-center gap-2'>
            <Users className='h-5 w-5' />
            Control de Personal
          </CardTitle>
          <CardDescription className='text-[#455a54]/70'>
            Resumen de equipo y herramientas de búsqueda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 lg:grid-cols-5 gap-6'>
            {/* Quick Stats - Compact */}
            <div className='lg:col-span-2'>
              <div className='grid grid-cols-2 gap-3'>
                <div className='bg-gradient-to-br from-[#9d684e]/10 to-[#9d684e]/5 p-4 rounded-lg border border-[#9d684e]/20'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <div className='text-xl font-bold font-tan-nimbus text-[#455a54]'>
                        {stats.total}
                      </div>
                      <div className='text-xs text-[#455a54]/70 uppercase tracking-wide'>Total</div>
                    </div>
                    <Users className='h-6 w-6 text-[#9d684e]/40' />
                  </div>
                </div>
                
                <div className='bg-gradient-to-br from-[#e0a38d]/10 to-[#e0a38d]/5 p-4 rounded-lg border border-[#e0a38d]/20'>
                  <div className='text-lg font-bold font-tan-nimbus text-[#9d684e]'>
                    {stats.byRole.gerente || 0}
                  </div>
                  <div className='text-xs text-[#455a54]/70 uppercase tracking-wide'>Gerentes</div>
                </div>
                
                <div className='bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4 rounded-lg border border-blue-500/20'>
                  <div className='text-lg font-bold font-tan-nimbus text-blue-600'>
                    {stats.byRole.cajero || 0}
                  </div>
                  <div className='text-xs text-[#455a54]/70 uppercase tracking-wide'>Cajeros</div>
                </div>
                
                <div className='bg-gradient-to-br from-green-500/10 to-green-500/5 p-4 rounded-lg border border-green-500/20'>
                  <div className='text-lg font-bold font-tan-nimbus text-green-600'>
                    {stats.byRole.mozo || 0}
                  </div>
                  <div className='text-xs text-[#455a54]/70 uppercase tracking-wide'>Mozos</div>
                </div>
              </div>
            </div>
            
            {/* Search Controls */}
            <div className='lg:col-span-3'>
              <div className='space-y-4'>
                <div>
                  <label className='text-sm font-winter-solid text-[#455a54] mb-2 block flex items-center gap-2'>
                    <Search className='h-4 w-4' />
                    Buscar Empleados
                  </label>
                  <div className='flex flex-col sm:flex-row gap-3'>
                    <div className='flex-1'>
                      <Input
                        placeholder='Buscar por nombre, email o teléfono...'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='border-[#9d684e]/20 focus:border-[#9d684e] h-11'
                      />
                    </div>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as typeof selectedRole)}
                      className='px-4 py-2 border border-[#9d684e]/20 rounded-md focus:border-[#9d684e] focus:outline-none h-11 w-full sm:min-w-[140px] sm:w-auto'
                    >
                      <option value='all'>Todos</option>
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
                        className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30 h-11 px-4'
                      >
                        Limpiar
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className='flex justify-between items-center'>
                  {searchQuery || selectedRole !== 'all' ? (
                    <div className='text-sm text-[#455a54]/70 bg-[#efcbb9]/20 px-3 py-2 rounded-lg'>
                      🔍 {filteredEmployees.length} de {employees.length} empleados
                    </div>
                  ) : (
                    <div className='text-sm text-[#455a54]/70'>
                      📋 {employees.length} empleados en total
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
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
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9d684e]"></div>
              <span className="ml-2 text-[#455a54]/70">Cargando empleados...</span>
            </div>
          ) : isMobile ? (
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