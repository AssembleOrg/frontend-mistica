'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';

export function StaffStatsWidget() {
  const { stats } = useEmployees();

  return (
    <Card className='border-[#9d684e]/20'>
      <CardHeader>
        <CardTitle className='text-lg font-tan-nimbus text-[#455a54] flex items-center gap-2'>
          <Users className='h-5 w-5' />
          Personal Actual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          <div className='text-center'>
            <div className='text-xl font-bold font-tan-nimbus text-[#455a54]'>{stats.total}</div>
            <div className='text-xs text-[#455a54]/70'>Total</div>
          </div>
          <div className='text-center'>
            <div className='text-xl font-bold font-tan-nimbus text-[#9d684e]'>{stats.byRole.gerente || 0}</div>
            <div className='text-xs text-[#455a54]/70'>Gerentes</div>
          </div>
          <div className='text-center'>
            <div className='text-xl font-bold font-tan-nimbus text-[#e0a38d]'>{stats.byRole.cajero || 0}</div>
            <div className='text-xs text-[#455a54]/70'>Cajeros</div>
          </div>
          <div className='text-center'>
            <div className='text-xl font-bold font-tan-nimbus text-[#455a54]'>{stats.byRole.mozo || 0}</div>
            <div className='text-xs text-[#455a54]/70'>Mozos</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

