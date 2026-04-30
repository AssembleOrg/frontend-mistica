'use client';

import { Employee } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TableFilters } from '@/components/ui/table-filters';
import { DateRange } from 'react-day-picker';
import { MoreVertical, Users, Calendar, Mail, Phone, MapPin, Edit, Trash2, UserCheck } from 'lucide-react';

interface StaffMobileViewProps {
  employees: Employee[];
  onEdit?: (employee: Employee) => void;
  onDelete?: (employee: Employee) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  dateRange?: DateRange | undefined;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  roleFilter: string;
  onRoleFilterChange: (role: string) => void;
  onClearFilters?: () => void;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'gerente':
      return <UserCheck className="w-4 h-4" />;
    case 'cajero':
      return <Users className="w-4 h-4" />;
    case 'mozo':
      return <Users className="w-4 h-4" />;
    default:
      return <Users className="w-4 h-4" />;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'gerente':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'cajero':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'mozo':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'gerente':
      return 'Gerente';
    case 'cajero':
      return 'Cajero';
    case 'mozo':
      return 'Mozo';
    default:
      return 'Sin rol';
  }
};

export function StaffMobileView({
  employees,
  onEdit,
  onDelete,
  searchTerm,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  roleFilter,
  onRoleFilterChange,
  onClearFilters,
}: StaffMobileViewProps) {
  const roleOptions = [
    { value: 'all', label: 'Todos los roles' },
    { value: 'gerente', label: 'Gerente' },
    { value: 'cajero', label: 'Cajero' },
    { value: 'mozo', label: 'Mozo' },
  ];

  const handleClearFilters = () => {
    onSearchChange('');
    onDateRangeChange?.(undefined);
    onRoleFilterChange('all');
    onClearFilters?.();
  };

  return (
    <div className="space-y-4">
      <TableFilters
        searchValue={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar empleados por nombre o email..."
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
        showDateFilter={true}
        customFilters={[
          {
            key: 'role',
            label: 'Rol',
            value: roleFilter,
            onChange: onRoleFilterChange,
            options: roleOptions,
          },
        ]}
        onClearFilters={handleClearFilters}
      />
      
      <div className="grid gap-4">
        {employees.map((employee) => (
          <Card key={employee.id} className="w-full">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="truncate">{employee.name}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{employee.email}</span>
                  </CardDescription>
                </div>
                <div className="flex items-start gap-2 flex-shrink-0">
                  <Badge
                    variant="outline"
                    className={`${getRoleColor(employee.role)} flex items-center gap-1 whitespace-nowrap text-xs`}
                  >
                    {getRoleIcon(employee.role)}
                    {getRoleLabel(employee.role)}
                  </Badge>
                  {(onEdit || onDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(employee)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem 
                            onClick={() => onDelete(employee)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 text-sm">
                {employee.phone && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      Teléfono
                    </div>
                    <div className="font-medium">
                      {employee.phone}
                    </div>
                  </div>
                )}
                
                {employee.address && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      Dirección
                    </div>
                    <div className="font-medium">
                      {employee.address}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Fecha de ingreso
                    </div>
                    <div className="font-medium">
                      {new Date(employee.startDate).toLocaleDateString('es-AR')}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Registrado
                    </div>
                    <div className="font-medium">
                      {new Date(employee.createdAt).toLocaleDateString('es-AR')}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {employees.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No se encontraron empleados</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}