/**
 * Pagination Component with "Ver Más" Button
 * Allows progressive loading of items with a simple button click
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Loader2 } from 'lucide-react';

interface PaginationWithMoreProps<T> {
  items: T[];
  itemsPerPage?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  loading?: boolean;
  className?: string;
  noItemsText?: string;
  loadMoreText?: string;
  showLoadingOnMore?: boolean;
}

export function PaginationWithMore<T>({
  items,
  itemsPerPage = 10,
  renderItem,
  loading = false,
  className = '',
  noItemsText = 'No hay elementos para mostrar',
  loadMoreText = 'Ver Más',
  showLoadingOnMore = false
}: PaginationWithMoreProps<T>) {
  const [visibleCount, setVisibleCount] = useState(itemsPerPage);

  // Memoized visible items for performance
  const visibleItems = useMemo(() => 
    items.slice(0, visibleCount), 
    [items, visibleCount]
  );

  const hasMore = visibleCount < items.length;
  const remainingCount = items.length - visibleCount;

  const handleLoadMore = () => {
    console.log('🔄 PaginationWithMore: Cargando más items, actual:', visibleCount);
    setVisibleCount(prev => Math.min(prev + itemsPerPage, items.length));
  };

  // Reset pagination when items change
  useMemo(() => {
    if (visibleCount > items.length && items.length > 0) {
      setVisibleCount(itemsPerPage);
    }
  }, [items.length, itemsPerPage, visibleCount]);

  if (loading && items.length === 0) {
    return (
      <div className={`flex justify-center items-center p-8 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-[#9d684e]" />
        <span className="ml-2 text-[#455a54]/70">Cargando...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`text-center p-8 text-[#455a54]/70 ${className}`}>
        <p>{noItemsText}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Rendered Items */}
      <div className="space-y-2">
        {visibleItems.map((item, index) => (
          <div key={index}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loading && showLoadingOnMore}
            className="border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30 min-w-[140px]"
          >
            {loading && showLoadingOnMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Cargando...
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                {loadMoreText} ({remainingCount} más)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Items Counter */}
      <div className="mt-4 text-center text-sm text-[#455a54]/70">
        Mostrando {visibleItems.length} de {items.length} elementos
      </div>
    </div>
  );
}

// Export helper hook for external pagination state management
export function usePaginationWithMore(itemsPerPage = 10) {
  const [visibleCount, setVisibleCount] = useState(itemsPerPage);

  const resetPagination = () => setVisibleCount(itemsPerPage);
  const loadMore = () => setVisibleCount(prev => prev + itemsPerPage);

  return {
    visibleCount,
    resetPagination,
    loadMore,
    setVisibleCount
  };
}