import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: LucideIcon;
  trend: 'up' | 'down' | 'neutral';
  color: 'green' | 'terracota' | 'orange' | 'red';
}

const colorConfig = {
  green: {
    icon: 'text-[#455a54]',
    value: 'text-[#455a54]',
    border: 'border-[#455a54]/20',
  },
  terracota: {
    icon: 'text-[#9d684e]',
    value: 'text-[#9d684e]',
    border: 'border-[#9d684e]/20',
  },
  orange: {
    icon: 'text-[#cc844a]',
    value: 'text-[#cc844a]',
    border: 'border-[#cc844a]/20',
  },
  red: {
    icon: 'text-red-500',
    value: 'text-red-500',
    border: 'border-red-500/20',
  },
};

const trendConfig = {
  up: 'text-green-600',
  down: 'text-red-500',
  neutral: 'text-[#455a54]/70',
};

export function StatsCard({ title, value, change, icon: Icon, trend, color }: StatsCardProps) {
  const colors = colorConfig[color];
  const trendColor = trendConfig[trend];

  return (
    <Card className={`${colors.border} hover:shadow-md transition-shadow duration-200`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-[#455a54] font-winter-solid">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${colors.icon}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold font-tan-nimbus ${colors.value}`}>
          {value}
        </div>
        <p className={`text-xs ${trendColor}`}>
          {change}
        </p>
      </CardContent>
    </Card>
  );
}