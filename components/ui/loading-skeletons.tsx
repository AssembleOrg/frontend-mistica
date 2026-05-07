import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  TableHead, 
  TableHeader, 
  TableRow, 
  TableCell, 
  TableBody,
  Table 
} from '@/components/ui/table';

// Stats Card Skeleton
export function StatsCardSkeleton() {
  return (
    <Card className="border-[#9d684e]/20 hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-[100px] bg-[#efcbb9]/30" />
        <Skeleton className="h-4 w-4 bg-[#efcbb9]/30 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-[120px] bg-[#9d684e]/20 mb-2" />
        <Skeleton className="h-3 w-[80px] bg-[#efcbb9]/30" />
      </CardContent>
    </Card>
  );
}

// Products Table Row Skeleton
export function ProductsTableRowSkeleton() {
  return (
    <TableRow className="hover:bg-[#efcbb9]/10">
      <TableCell>
        <Skeleton className="h-4 w-4 bg-[#efcbb9]/30 rounded" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-[150px] bg-[#efcbb9]/30" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-[80px] bg-[#9d684e]/20 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-[100px] bg-[#efcbb9]/30" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-[60px] bg-[#efcbb9]/30" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-[70px] bg-[#9d684e]/20 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-8 bg-[#efcbb9]/30 rounded" />
      </TableCell>
    </TableRow>
  );
}

// Products Table Skeleton
export function ProductsTableSkeleton() {
  return (
    <div className="w-full">
      {/* Search and filters skeleton */}
      <div className="flex items-center py-4">
        <Skeleton className="h-10 w-[250px] bg-[#efcbb9]/30" />
        <Skeleton className="h-10 w-[100px] bg-[#efcbb9]/30 ml-auto" />
      </div>
      
      {/* Table skeleton */}
      <div className="rounded-md border border-[#9d684e]/20">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-[#efcbb9]/20">
              <TableHead>
                <Skeleton className="h-4 w-4 bg-[#efcbb9]/30 rounded" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-6 w-[80px] bg-[#efcbb9]/30" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-6 w-[80px] bg-[#efcbb9]/30" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-6 w-[60px] bg-[#efcbb9]/30" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-6 w-[50px] bg-[#efcbb9]/30" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-6 w-[60px] bg-[#efcbb9]/30" />
              </TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductsTableRowSkeleton key={index} />
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination skeleton */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Skeleton className="h-4 w-[120px] bg-[#efcbb9]/30" />
        <div className="space-x-2 flex">
          <Skeleton className="h-8 w-[70px] bg-[#efcbb9]/30" />
          <Skeleton className="h-8 w-[70px] bg-[#efcbb9]/30" />
        </div>
      </div>
    </div>
  );
}

// Quick Action Button Skeleton
export function QuickActionSkeleton() {
  return (
    <div className="h-auto p-4 flex flex-col items-start gap-2 bg-[#efcbb9]/20 rounded-md border border-[#9d684e]/20">
      <div className="flex items-center gap-2 w-full">
        <Skeleton className="h-5 w-5 bg-[#9d684e]/30 rounded" />
        <Skeleton className="h-5 w-[100px] bg-[#9d684e]/30" />
      </div>
      <Skeleton className="h-3 w-full bg-[#efcbb9]/40" />
    </div>
  );
}

// Quick Actions Section Skeleton
export function QuickActionsSkeleton() {
  return (
    <Card className="border-[#9d684e]/20">
      <CardHeader>
        <Skeleton className="h-6 w-[150px] bg-[#9d684e]/30 mb-2" />
        <Skeleton className="h-4 w-[250px] bg-[#efcbb9]/30" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <QuickActionSkeleton key={index} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Dashboard Info Card Skeleton
export function DashboardInfoCardSkeleton() {
  return (
    <Card className="border-[#9d684e]/20">
      <CardHeader>
        <Skeleton className="h-6 w-[200px] bg-[#9d684e]/30 mb-2" />
        <Skeleton className="h-4 w-[300px] bg-[#efcbb9]/30" />
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div className="space-y-4">
            <Skeleton className="h-4 w-full bg-[#efcbb9]/30" />
            <Skeleton className="h-4 w-[90%] bg-[#efcbb9]/30" />
            <Skeleton className="h-4 w-[80%] bg-[#efcbb9]/30" />
            
            <div className="grid grid-cols-2 gap-4 pt-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Skeleton className="w-2 h-2 bg-[#9d684e]/40 rounded-full" />
                  <Skeleton className="h-3 w-[100px] bg-[#efcbb9]/30" />
                </div>
              ))}
            </div>
          </div>
          <div className="text-center">
            <Skeleton className="w-[120px] h-[120px] bg-[#efcbb9]/30 rounded mx-auto" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Form Field Skeleton
export function FormFieldSkeleton({ height = 'h-10' }: { height?: string }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-[120px] bg-[#efcbb9]/30" />
      <Skeleton className={`${height} w-full bg-[#efcbb9]/30`} />
    </div>
  );
}

// Product Form Skeleton
export function ProductFormSkeleton() {
  return (
    <Card className="max-w-2xl mx-auto border-[#9d684e]/20">
      <CardHeader>
        <Skeleton className="h-6 w-[200px] bg-[#9d684e]/30 mb-2" />
        <Skeleton className="h-4 w-[300px] bg-[#efcbb9]/30" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <FormFieldSkeleton />
          <FormFieldSkeleton />
          
          <div className="grid grid-cols-2 gap-4">
            <FormFieldSkeleton />
            <FormFieldSkeleton />
          </div>
          
          <FormFieldSkeleton height="h-24" />
          
          <div className="flex gap-4 pt-6">
            <Skeleton className="h-10 flex-1 bg-[#9d684e]/30" />
            <Skeleton className="h-10 flex-1 bg-[#efcbb9]/30" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading Spinner for inline loading states
export function LoadingSpinner({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  return (
    <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-[#efcbb9]/30 border-t-[#9d684e]`}></div>
  );
}

// Page Loading Overlay
export function PageLoadingOverlay({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-[#455a54] font-winter-solid">{message}</p>
      </div>
    </div>
  );
}

// Page Header Skeleton
export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[260px] bg-[#9d684e]/20" />
        <Skeleton className="h-4 w-[320px] bg-[#efcbb9]/40" />
      </div>
      <Skeleton className="h-10 w-[140px] bg-[#9d684e]/20" />
    </div>
  );
}

// KPI Grid Skeleton — matches the KpiStrip pattern (single bordered card with internal grid)
export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  const colsClass =
    count <= 2
      ? 'grid-cols-2'
      : count === 3
        ? 'grid-cols-2 sm:grid-cols-3'
        : 'grid-cols-2 lg:grid-cols-4';
  return (
    <div
      className={`grid ${colsClass} divide-x divide-y sm:divide-y-0 rounded-xl border overflow-hidden`}
      style={{
        borderColor: 'var(--color-gris-claro)',
        background: 'var(--color-blanco)',
      }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className='p-4 flex flex-col gap-1.5'>
          <Skeleton className='h-3 w-[60%] bg-[#efcbb9]/40' />
          <Skeleton className='h-6 w-[40%] bg-[#9d684e]/25' />
          <Skeleton className='h-2.5 w-[50%] bg-[#efcbb9]/40' />
        </div>
      ))}
    </div>
  );
}

// List Item Skeleton (for mobile cards / lists)
export function ListItemSkeleton() {
  return (
    <Card className="border-[#9d684e]/20">
      <CardContent className="p-4 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full bg-[#efcbb9]/40 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-[60%] bg-[#9d684e]/20" />
          <Skeleton className="h-3 w-[40%] bg-[#efcbb9]/40" />
        </div>
        <Skeleton className="h-6 w-[60px] rounded-full bg-[#efcbb9]/40" />
      </CardContent>
    </Card>
  );
}

// Settings Section Skeleton
export function SettingsSectionSkeleton() {
  return (
    <Card className="border-[#9d684e]/20 border-l-4 border-l-[#9d684e]/40">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded bg-[#efcbb9]/40" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-[120px] bg-[#9d684e]/20" />
              <Skeleton className="h-3 w-[200px] bg-[#efcbb9]/40" />
            </div>
          </div>
          <Skeleton className="h-6 w-12 rounded-full bg-[#efcbb9]/40" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormFieldSkeleton />
          <Skeleton className="h-10 w-full bg-[#efcbb9]/30 self-end" />
        </div>
      </CardContent>
    </Card>
  );
}

// Activity Feed Skeleton
export function ActivityFeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-[80px] bg-[#9d684e]/20" />
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-start gap-3 p-3 rounded-lg border border-[#9d684e]/10"
        >
          <Skeleton className="h-8 w-8 rounded-full bg-[#efcbb9]/40 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-[180px] bg-[#9d684e]/20" />
              <Skeleton className="h-3 w-[60px] bg-[#efcbb9]/40" />
            </div>
            <Skeleton className="h-3 w-[80%] bg-[#efcbb9]/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Generic Page Skeleton (header + KPIs + table)
export function DashboardPageSkeleton({ kpiCount = 4 }: { kpiCount?: number }) {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <KpiGridSkeleton count={kpiCount} />
      <ProductsTableSkeleton />
    </div>
  );
}