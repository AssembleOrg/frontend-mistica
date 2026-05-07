import {
  PageHeaderSkeleton,
  KpiGridSkeleton,
  ActivityFeedSkeleton,
} from '@/components/ui/loading-skeletons';
import { Card, CardContent } from '@/components/ui/card';

export default function ActivityLoading() {
  return (
    <div className='space-y-6'>
      <PageHeaderSkeleton />
      <KpiGridSkeleton count={3} />
      <Card className='border-[#9d684e]/20'>
        <CardContent className='pt-6'>
          <ActivityFeedSkeleton count={6} />
        </CardContent>
      </Card>
    </div>
  );
}
