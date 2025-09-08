'use client';

import { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { categoryConfig, statusConfig } from '@/lib/mock-data';
import { calculateProfitMargin } from '@/lib/barcode-utils';
import { TableFilters, FilterOption } from '@/components/ui/table-filters';
import { DateRange } from 'react-day-picker';

interface ProductsMobileViewProps {
  products: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  // Filters props
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  categoryFilter?: string;
  onCategoryFilterChange?: (category: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function ProductsMobileView({ 
  products, 
  onEdit, 
  onDelete,
  searchValue,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  categoryFilter,
  onCategoryFilterChange,
  onRefresh,
  isLoading
}: ProductsMobileViewProps) {

  // Category options for filters
  const categoryOptions: FilterOption[] = [
    { value: 'all', label: 'Todas las categorías' },
    { value: 'treatments', label: 'Tratamientos' },
    { value: 'products', label: 'Productos' },
    { value: 'accessories', label: 'Accesorios' },
    { value: 'equipment', label: 'Equipamiento' },
  ];

  const handleClearFilters = () => {
    onSearchChange?.('');
    onDateRangeChange?.(undefined);
    onCategoryFilterChange?.('all');
  };

  if (products.length === 0) {
    return (
      <div className="space-y-4">
        {/* Mobile Filters */}
        <TableFilters
          searchValue={searchValue || ''}
          onSearchChange={onSearchChange || (() => {})}
          searchPlaceholder="Buscar productos..."
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange || (() => {})}
          customFilters={[
            {
              key: 'category',
              label: 'Categoría',
              value: categoryFilter || 'all',
              options: categoryOptions,
              onChange: onCategoryFilterChange || (() => {}),
            },
          ]}
          onClearFilters={handleClearFilters}
          onRefresh={onRefresh || (() => {})}
          isLoading={isLoading || false}
        />
        
        <div className="text-center py-8 text-gray-500">
          <p>No se encontraron productos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile Filters */}
      <TableFilters
        searchValue={searchValue || ''}
        onSearchChange={onSearchChange || (() => {})}
        searchPlaceholder="Buscar productos..."
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange || (() => {})}
        customFilters={[
          {
            key: 'category',
            label: 'Categoría',
            value: categoryFilter || 'all',
            options: categoryOptions,
            onChange: onCategoryFilterChange || (() => {}),
          },
        ]}
        onClearFilters={handleClearFilters}
        onRefresh={onRefresh || (() => {})}
        isLoading={isLoading || false}
      />
      
      {/* Products Cards */}
      <div className="space-y-3">
      {products.map((product) => {
        const categoryInfo = categoryConfig[product.category];
        const statusInfo = statusConfig[product.status];
        const profitMargin = calculateProfitMargin(product.costPrice, product.price);

        return (
          <div key={product.id} className="mobile-card">
            <div className="mobile-card-header">
              <div className="flex-1">
                <h3 className="mobile-card-title">{product.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    style={{ 
                      backgroundColor: categoryInfo.color + '20',
                      color: categoryInfo.color,
                      border: `1px solid ${categoryInfo.color}40`
                    }}
                    className="text-xs"
                  >
                    {categoryInfo.label}
                  </Badge>
                  <Badge
                    style={{ 
                      backgroundColor: statusInfo.color + '20',
                      color: statusInfo.color,
                      border: `1px solid ${statusInfo.color}40`
                    }}
                    className="text-xs"
                  >
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit?.(product)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete?.(product.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mobile-card-content">
              <div className="mobile-card-row">
                <span className="mobile-card-label">Código de barras</span>
                <span className="mobile-card-value font-mono">{product.barcode}</span>
              </div>
              
              <div className="mobile-card-row">
                <span className="mobile-card-label">Precio</span>
                <span className="mobile-card-value font-semibold text-[#9d684e]">
                  ${product.price.toFixed(2)}
                </span>
              </div>
              
              <div className="mobile-card-row">
                <span className="mobile-card-label">Stock</span>
                <span className={`mobile-card-value font-medium ${
                  product.stock <= 5 ? 'text-red-600' : 
                  product.stock <= 10 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {product.stock} unidades
                </span>
              </div>

              <div className="mobile-card-row">
                <span className="mobile-card-label">Costo</span>
                <span className="mobile-card-value">${product.costPrice.toFixed(2)}</span>
              </div>

              <div className="mobile-card-row">
                <span className="mobile-card-label">Margen</span>
                <span className={`mobile-card-value font-medium ${
                  profitMargin >= 50 ? 'text-green-600' : 
                  profitMargin >= 30 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {profitMargin.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}