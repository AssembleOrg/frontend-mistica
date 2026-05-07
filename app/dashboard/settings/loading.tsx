import {
  PageHeaderSkeleton,
  SettingsSectionSkeleton,
} from '@/components/ui/loading-skeletons';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className='space-y-6'>
      <PageHeaderSkeleton />
      <div className='grid lg:grid-cols-[240px_1fr] gap-6'>
        <Card className='hidden lg:block border-[#9d684e]/20'>
          <CardContent className='p-2 space-y-2'>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className='h-14 w-full bg-[#efcbb9]/30' />
            ))}
          </CardContent>
        </Card>
        <div className='space-y-4'>
          <SettingsSectionSkeleton />
          <SettingsSectionSkeleton />
          <SettingsSectionSkeleton />
        </div>
      </div>
    </div>
  );
}
