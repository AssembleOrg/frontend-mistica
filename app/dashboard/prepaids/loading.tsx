import {
  PageHeaderSkeleton,
  KpiGridSkeleton,
  ProductsTableSkeleton,
} from '@/components/ui/loading-skeletons';
import { Card, CardContent } from '@/components/ui/card';

export default function PrepaidsLoading() {
  return (
    <div className='space-y-6'>
      <PageHeaderSkeleton />
      <KpiGridSkeleton count={4} />
      <Card className='border-[#9d684e]/20'>
        <CardContent className='pt-6'>
          <ProductsTableSkeleton />
        </CardContent>
      </Card>
    </div>
  );
}
