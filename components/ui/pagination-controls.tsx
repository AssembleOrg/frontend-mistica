'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  className?: string;
  // For table pagination
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  showPageSizeSelector?: boolean;
  totalItems?: number;
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
  className = '',
  pageSize = 10,
  onPageSizeChange,
  showPageSizeSelector = false,
  totalItems = 0
}: PaginationControlsProps) {
  // Don't render if there's no data and no page size selector
  if (totalItems === 0 && !showPageSizeSelector) return null;

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handleFirstPage = () => {
    if (canGoPrevious && !isLoading) {
      onPageChange(1);
    }
  };

  const handlePreviousPage = () => {
    if (canGoPrevious && !isLoading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (canGoNext && !isLoading) {
      onPageChange(currentPage + 1);
    }
  };

  const handleLastPage = () => {
    if (canGoNext && !isLoading) {
      onPageChange(totalPages);
    }
  };

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-4">
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#455a54] font-winter-solid">
              Filas por página:
            </span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(parseInt(value))}
              disabled={isLoading}
            >
              <SelectTrigger className="w-20 border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="35">35</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
        {totalItems > 0 && (
          <div className="text-sm text-[#455a54]/70 font-winter-solid">
            {totalItems} elementos en total
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreviousPage}
          disabled={!canGoPrevious || isLoading}
          className="border-[#9d684e]/20 text-[#455a54] hover:bg-[#9d684e] hover:text-white disabled:opacity-50"
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextPage}
          disabled={!canGoNext || isLoading}
          className="border-[#9d684e]/20 text-[#455a54] hover:bg-[#9d684e] hover:text-white disabled:opacity-50"
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
