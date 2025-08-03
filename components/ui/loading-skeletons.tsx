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