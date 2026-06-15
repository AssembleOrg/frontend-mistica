'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { ActivityTable } from '@/components/dashboard/activity-table';
import { usePermissions } from '@/hooks/usePermissions';
import { auditService, type AuditLog } from '@/services/audit.service';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { KpiStrip } from '@/components/ui/kpi-strip';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function ActivityPage() {
  const router = useRouter();
  const { canEdit: isAdmin } = usePermissions();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  useEffect(() => {
    if (!isAdmin) router.replace('/dashboard');
  }, [isAdmin, router]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const from = dateRange?.from ? dateRange.from.toISOString().slice(0, 10) : undefined;
      const to = dateRange?.to ? dateRange.to.toISOString().slice(0, 10) : undefined;
      const res = await auditService.getAuditLogs(1, 200, { from, to });
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch {
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const kpis = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayCount = logs.filter((l) => new Date(l.timestamp) >= startOfDay).length;
    const lastTs = logs.length > 0 ? new Date(logs[0].timestamp) : null;

    let lastLabel = '—';
    if (lastTs) {
      const diffMin = Math.floor((Date.now() - lastTs.getTime()) / 60000);
      if (diffMin < 1) lastLabel = 'recién';
      else if (diffMin < 60) lastLabel = `hace ${diffMin}m`;
      else if (diffMin < 1440) lastLabel = `hace ${Math.floor(diffMin / 60)}h`;
      else lastLabel = `hace ${Math.floor(diffMin / 1440)}d`;
    }

    return { total: logs.length, today: todayCount, lastLabel };
  }, [logs]);

  if (!isAdmin) return null;

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Auditoría'
        subtitle='Registro de acciones del equipo en tiempo real'
        actions={
          <div className='flex items-center gap-2'>
            <DateRangePicker
              date={dateRange}
              onDateChange={setDateRange}
            />
            <Button
              variant='outline'
              size='sm'
              onClick={load}
              className='border-[#9d684e]/30 text-[#9d684e] hover:bg-[#9d684e]/10 font-winter-solid'
            >
              <RefreshCw className='h-3.5 w-3.5' />
            </Button>
          </div>
        }
      />

      <KpiStrip
        items={[
          { label: 'Total registros', value: kpis.total, hint: 'eventos' },
          { label: 'Hoy', value: kpis.today, accent: 'var(--color-terracota)' },
          { label: 'Último evento', value: kpis.lastLabel, accent: 'var(--color-naranja-medio)' },
        ]}
      />

      <Card className='border-[#9d684e]/20'>
        <CardContent className='pt-6'>
          <ActivityTable data={logs} isLoading={isLoading} compact={false} />
        </CardContent>
      </Card>
    </div>
  );
}
