'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, UserX, Coffee } from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';

export function StaffStatsWidget() {
  const { stats } = useEmployees();

  const statCards = [
    {
      title: 'Total Empleados',
      value: stats.total,
      icon: Users,
      color: 'text-[#455a54]',
      bgColor: 'bg-[#455a54]/10',
    },
    {
      title: 'Gerentes',
      value: stats.byRole.gerente || 0,
      icon: UserCheck,
      color: 'text-[#9d684e]',
      bgColor: 'bg-[#9d684e]/10',
    },
    {
      title: 'Cajeros',
      value: stats.byRole.cajero || 0,
      icon: UserX,
      color: 'text-[#e0a38d]',
      bgColor: 'bg-[#e0a38d]/10',
    },
    {
      title: 'Mozos',
      value: stats.byRole.mozo || 0,
      icon: Coffee,
      color: 'text-[#455a54]',
      bgColor: 'bg-[#455a54]/10',
    },
  ];

  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className='border-[#9d684e]/20'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-winter-solid text-[#455a54]'>
                {stat.title}
              </CardTitle>
              <div className={`${stat.bgColor} p-2 rounded-lg`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-tan-nimbus text-[#455a54]'>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function StaffRoleBreakdown() {
  const { stats } = useEmployees();

  const roleStats = [
    {
      role: 'Gerentes',
      count: stats.byRole.gerente || 0,
      color: 'text-[#9d684e]',
      bgColor: 'bg-[#9d684e]/10',
    },
    {
      role: 'Cajeros',
      count: stats.byRole.cajero || 0,
      color: 'text-[#e0a38d]',
      bgColor: 'bg-[#e0a38d]/10',
    },
    {
      role: 'Mozos',
      count: stats.byRole.mozo || 0,
      color: 'text-[#455a54]',
      bgColor: 'bg-[#455a54]/10',
    },
  ];

  return (
    <Card className='border-[#9d684e]/20'>
      <CardHeader>
        <CardTitle className='text-lg font-tan-nimbus text-[#455a54]'>
          Personal por Rol
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          {roleStats.map((role, index) => (
            <div key={index} className='flex items-center justify-between'>
              <div className='flex items-center space-x-3'>
                <div className={`w-3 h-3 rounded-full ${role.bgColor}`} />
                <span className='text-sm font-medium text-[#455a54]'>
                  {role.role}
                </span>
              </div>
              <span className={`text-lg font-semibold ${role.color}`}>
                {role.count}
              </span>
            </div>
          ))}
        </div>
        
        {stats.total > 0 && (
          <div className='mt-4 pt-3 border-t border-[#9d684e]/10'>
            <div className='text-xs text-[#455a54]/70'>
              Distribución: Gerentes {(((stats.byRole.gerente || 0) / stats.total) * 100).toFixed(0)}%, 
              Cajeros {(((stats.byRole.cajero || 0) / stats.total) * 100).toFixed(0)}%,
              Mozos {(((stats.byRole.mozo || 0) / stats.total) * 100).toFixed(0)}%
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}