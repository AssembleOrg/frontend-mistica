'use client';

import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';

interface DateRangeFilterProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (dateRange: { from: Date; to: Date }) => void;
}

export function DateRangeFilter({ dateRange, onDateRangeChange }: DateRangeFilterProps) {
  
  const resetToToday = () => {
    const today = new Date();
    onDateRangeChange({ from: today, to: today });
  };

  const setThisWeek = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    onDateRangeChange({ from: startOfWeek, to: today });
  };

  const setThisMonth = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    onDateRangeChange({ from: startOfMonth, to: today });
  };

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex gap-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={resetToToday}
          className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30'
        >
          <CalendarIcon className='mr-1 h-3 w-3' />
          Hoy
        </Button>
        <Button
          variant='outline'
          size='sm'
          onClick={setThisWeek}
          className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30'
        >
          Esta Semana
        </Button>
        <Button
          variant='outline'
          size='sm'
          onClick={setThisMonth}
          className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30'
        >
          Este Mes
        </Button>
      </div>
      
      <div className='text-sm text-[#455a54]'>
        <span className='font-medium'>Período: </span>
        {dateRange.from ? (
          dateRange.to && dateRange.to !== dateRange.from ? (
            <>
              {dateRange.from.toLocaleDateString('es-AR')} - {' '}
              {dateRange.to.toLocaleDateString('es-AR')}
            </>
          ) : (
            dateRange.from.toLocaleDateString('es-AR')
          )
        ) : (
          <span>Sin fecha seleccionada</span>
        )}
      </div>
      
      <div className='text-xs text-[#455a54]/70'>
        {dateRange.from && dateRange.to && dateRange.from !== dateRange.to
          ? `Rango de ${Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} días`
          : 'Un solo día seleccionado'
        }
      </div>
    </div>
  );
}