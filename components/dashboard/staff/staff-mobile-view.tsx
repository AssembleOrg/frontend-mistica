'use client';

import { Employee } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DateRange } from 'react-day-picker';
import {
  MoreVertical,
  Users,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
} from 'lucide-react';

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

const roleStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  gerente: {
    bg: 'bg-[#9d684e]/10',
    text: 'text-[#9d684e]',
    border: 'border-[#9d684e]/30',
    label: 'Gerente',
  },
  cajero: {
    bg: 'bg-[#cc844a]/10',
    text: 'text-[#cc844a]',
    border: 'border-[#cc844a]/30',
    label: 'Cajero',
  },
  mozo: {
    bg: 'bg-[#455a54]/10',
    text: 'text-[#455a54]',
    border: 'border-[#455a54]/30',
    label: 'Mozo',
  },
};

const getRoleBadge = (role: string) => roleStyles[role] || roleStyles.mozo;

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

export function StaffMobileView({
  employees,
  onEdit,
  onDelete,
}: StaffMobileViewProps) {
  if (employees.length === 0) {
    return (
      <EmptyState
        variant='compact'
        icon={Users}
        title='Sin empleados'
        description='No se encontraron empleados con los filtros actuales.'
      />
    );
  }

  return (
    <div className='space-y-3'>
      {employees.map((employee) => {
        const role = getRoleBadge(employee.role);
        return (
          <Card key={employee.id} className='border-[#9d684e]/20'>
            <CardContent className='p-4'>
              <div className='flex items-start justify-between gap-3'>
                <div className='flex items-start gap-3 min-w-0 flex-1'>
                  <div className='w-10 h-10 rounded-full bg-[#9d684e]/15 flex items-center justify-center text-[#9d684e] font-tan-nimbus text-sm flex-shrink-0'>
                    {getInitials(employee.name)}
                  </div>
                  <div className='min-w-0 flex-1 space-y-1'>
                    <div className='font-medium text-[#455a54] font-winter-solid truncate'>
                      {employee.name}
                    </div>
                    <div className='flex items-center gap-1 text-xs text-[#455a54]/70'>
                      <Mail className='h-3 w-3 text-[#9d684e] flex-shrink-0' />
                      <span className='truncate'>{employee.email}</span>
                    </div>
                  </div>
                </div>
                <div className='flex items-start gap-2 flex-shrink-0'>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium font-winter-solid border ${role.bg} ${role.text} ${role.border}`}
                  >
                    {role.label}
                  </span>
                  {(onEdit || onDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-8 w-8 p-0 hover:bg-[#9d684e]/10'
                        >
                          <MoreVertical className='h-4 w-4 text-[#455a54]' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(employee)}>
                            <Edit className='mr-2 h-4 w-4' />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem
                            onClick={() => onDelete(employee)}
                            className='text-red-600'
                          >
                            <Trash2 className='mr-2 h-4 w-4' />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              <div className='mt-3 pt-3 border-t border-[#9d684e]/10 grid grid-cols-2 gap-3 text-xs'>
                {employee.phone && (
                  <div>
                    <div className='flex items-center gap-1 text-[#455a54]/60 mb-0.5'>
                      <Phone className='w-3 h-3' />
                      Teléfono
                    </div>
                    <div className='font-medium text-[#455a54] tabular-nums'>
                      {employee.phone}
                    </div>
                  </div>
                )}
                <div>
                  <div className='flex items-center gap-1 text-[#455a54]/60 mb-0.5'>
                    <Calendar className='w-3 h-3' />
                    Ingreso
                  </div>
                  <div className='font-medium text-[#455a54] tabular-nums'>
                    {new Date(employee.startDate).toLocaleDateString('es-AR')}
                  </div>
                </div>
                {employee.address && (
                  <div className='col-span-2'>
                    <div className='flex items-center gap-1 text-[#455a54]/60 mb-0.5'>
                      <MapPin className='w-3 h-3' />
                      Dirección
                    </div>
                    <div className='font-medium text-[#455a54] truncate'>
                      {employee.address}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
