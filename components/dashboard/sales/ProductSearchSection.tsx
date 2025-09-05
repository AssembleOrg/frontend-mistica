/**
 * CAPA 4: PRESENTATION - PRODUCT SEARCH COMPONENT
 * 
 * Componente UI puro para búsqueda de productos
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ScanLine, Filter } from 'lucide-react';
import { Product } from '@/lib/types';
import { formatCurrency } from '@/lib/sales-calculations';
import { cn } from '@/lib/utils';

interface ProductSearchSectionProps {
  onSearch: (query: string, category?: string) => void;
  searchResults: Product[];
  isSearching: boolean;
  onProductSelect: (productId: string, quantity?: number) => void;
  selectedProductId: string | null;
  className?: string;
}

export function ProductSearchSection({
  onSearch,
  searchResults,
  isSearching,
  onProductSelect,
  selectedProductId,
  className
}: ProductSearchSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const categories = [
    { value: 'all', label: 'Todas las categorías' },
    { value: 'organicos', label: 'Orgánicos' },
    { value: 'aromaticos', label: 'Aromáticos' },
    { value: 'wellness', label: 'Wellness' },
  ];

  const handleSearch = (query: string = searchQuery, category: string = selectedCategory) => {
    setSearchQuery(query);
    if (query.length >= 2 || (category && category !== 'all')) {
      onSearch(query, category === 'all' ? undefined : category);
    } else if (category === 'all' && query.length < 2) {
      onSearch(query, undefined);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    handleSearch(searchQuery, category);
  };

  const handleBarcodeSearch = () => {
    // Simular escáner de códigos de barras
    const barcode = window.prompt('Escanear código de barras:');
    if (barcode) {
      handleSearch(barcode, selectedCategory);
    }
  };

  const handleProductClick = (product: Product) => {
    onProductSelect(product.id, selectedQuantity);
  };

  return (
    <div className={cn('space-y-4', className)}>
      
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o código..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 font-winter-solid"
            disabled={isSearching}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleBarcodeSearch}
          disabled={isSearching}
          title="Escanear código de barras"
          className="border-[#9d684e]/20"
        >
          <ScanLine className="w-4 h-4" />
        </Button>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-[#455a54]" />
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full border-[#9d684e]/20 font-winter-solid">
            <SelectValue placeholder="Filtrar por categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value} className="font-winter-solid">
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quantity Selector */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-winter-solid text-[#455a54]">Cantidad:</span>
        <Input
          type="number"
          min="1"
          value={selectedQuantity}
          onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
          className="w-20 h-8 border-[#9d684e]/20 font-winter-solid"
        />
      </div>

      {/* Search Results */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {isSearching && (
          <div className="text-center text-[#455a54]/70 py-4 font-winter-solid">
            Buscando productos...
          </div>
        )}

        {!isSearching && searchResults.length === 0 && (searchQuery || (selectedCategory && selectedCategory !== 'all')) && (
          <div className="text-center text-[#455a54]/70 py-4 font-winter-solid">
            No se encontraron productos
          </div>
        )}

        {!isSearching && searchResults.length === 0 && !searchQuery && (!selectedCategory || selectedCategory === 'all') && (
          <div className="text-center text-[#455a54]/70 py-4 font-winter-solid">
            Ingrese un término de búsqueda o seleccione una categoría
          </div>
        )}

        {searchResults.map((product) => (
          <div
            key={product.id}
            className={cn(
              'p-3 border border-[#9d684e]/20 rounded-lg cursor-pointer transition-colors hover:bg-[#efcbb9]/20',
              selectedProductId === product.id && 'bg-[#efcbb9]/30'
            )}
            onClick={() => handleProductClick(product)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-medium text-sm text-[#455a54] font-tan-nimbus">{product.name}</h4>
                <p className="text-xs text-[#455a54]/70 font-winter-solid">{product.barcode}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={product.stock > 0 ? 'default' : 'secondary'} className="font-winter-solid">
                    Stock: {product.stock}
                  </Badge>
                  <span className="text-xs text-[#455a54]/70 font-winter-solid">
                    {product.category}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-sm text-[#455a54] font-tan-nimbus">
                  {formatCurrency(product.price)}
                </div>
                <div className="text-xs text-[#455a54]/70 font-winter-solid">
                  Total: {formatCurrency(product.price * selectedQuantity)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}