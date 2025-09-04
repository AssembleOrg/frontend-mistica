/**
 * CAPA 4: PRESENTATION LAYER - STOCK ADJUSTMENTS PAGE
 *
 * Página UI PURA que solo renderiza y delega al controller
 * Sin lógica de negocio, sin acceso directo a stores
 */

'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Package, Search, Save, Filter, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { showToast } from '@/lib/toast';
import { LoadingSpinner } from '@/components/ui/loading-skeletons';
import { useStock } from '@/hooks/useStock';
import { useProducts } from '@/hooks/useProducts';
import { useInitialProductsData } from '@/hooks/useInitialProductsData';
import { PaginationWithMore } from '@/components/ui/pagination-with-more';
import type { Product } from '@/lib/types';

function StockAdjustmentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newStock, setNewStock] = useState('');
  const [newUnitOfMeasure, setNewUnitOfMeasure] = useState<'gramo' | 'litro'>('gramo');
  const [reason, setReason] = useState('');
  const [_notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle initial data loading
  const { isLoading: loadingProducts } = useInitialProductsData();

  // Simple hooks API
  const { adjustStockQuantity } = useStock();
  const { products, updateProduct } = useProducts();

  // Pre-select product from URL parameters
  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId && products.length > 0 && !selectedProduct) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedProduct(product);
        setNewStock(product.stock.toString());
        setNewUnitOfMeasure(product.unitOfMeasure);
        console.log('🎯 Pre-seleccionado producto desde URL:', product.name);
      }
    }
  }, [searchParams, products, selectedProduct]);

  // Filter products based on search and category - optimized with useMemo
  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const matchesSearch =
        searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode.includes(searchQuery);

      const matchesCategory =
        selectedCategory === 'all' || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    // Only log when values actually change
    console.log(
      '📦 StockAdjustments: Productos cargados:',
      products.length,
      'Filtrados:',
      filtered.length
    );

    return filtered;
  }, [products, searchQuery, selectedCategory]);

  const categories = [
    { value: 'all', label: 'Todas las categorías' },
    { value: 'organicos', label: 'Orgánicos' },
    { value: 'aromaticos', label: 'Aromáticos' },
    { value: 'wellness', label: 'Wellness' },
  ];

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setNewStock(product.stock.toString());
    setNewUnitOfMeasure(product.unitOfMeasure);
    setSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      showToast.error('Debe seleccionar un producto');
      return;
    }

    if (!reason.trim()) {
      showToast.error('Debe especificar un motivo para el ajuste');
      return;
    }

    const newStockValue = parseInt(newStock);
    if (isNaN(newStockValue) || newStockValue < 0) {
      showToast.error('El stock debe ser un número válido mayor o igual a 0');
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate the adjustment quantity
      const adjustment = newStockValue - selectedProduct.stock;

      if (adjustment === 0) {
        showToast.info('No hay cambios en el stock');
        setIsSubmitting(false);
        return;
      }

      // Check if unit of measure has changed and update it
      if (newUnitOfMeasure !== selectedProduct.unitOfMeasure) {
        console.log('🔄 Actualizando unidad de medida:', selectedProduct.unitOfMeasure, '→', newUnitOfMeasure);
        await updateProduct(selectedProduct.id, { unitOfMeasure: newUnitOfMeasure });
      }

      // Use simple hook to adjust stock with backend integration
      await adjustStockQuantity(selectedProduct.id, adjustment, reason);

      showToast.success(
        `Stock de "${selectedProduct.name}" actualizado correctamente`
      );

      // Reset form
      setSelectedProduct(null);
      setNewStock('');
      setNewUnitOfMeasure('gramo');
      setReason('');
      setNotes('');

      // Optional: navigate back to stock dashboard
      setTimeout(() => {
        router.push('/dashboard/stock');
      }, 1500);
    } catch (error) {
      console.error('Error en ajuste de stock:', error);
      showToast.error(
        error instanceof Error ? error.message : 'Error al realizar ajuste'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const difference = useMemo(() => {
    return selectedProduct && newStock
      ? parseInt(newStock) - selectedProduct.stock
      : 0;
  }, [selectedProduct, newStock]);

  return (
    <div className='space-y-6 mt-6'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <Button
          variant='outline'
          asChild
        >
          <Link href='/dashboard/stock'>
            <ArrowLeft className='h-4 w-4 mr-2' />
            Volver
          </Link>
        </Button>
        <div>
          <h1 className='text-3xl font-bold text-[#455a54] font-tan-nimbus'>
            Ajustar Stock
          </h1>
          <p className='text-[#455a54]/70 font-winter-solid'>
            Corregir cantidades de inventario manualmente
          </p>
        </div>
      </div>

      {/* Adjustment Form */}
      <Card className='max-w-2xl mx-auto border-[#9d684e]/20'>
        <CardHeader>
          <CardTitle className='text-[#455a54] font-tan-nimbus'>
            Nuevo Ajuste de Stock
          </CardTitle>
          <CardDescription className='font-winter-solid'>
            Selecciona un producto y actualiza su cantidad
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit}
            className='space-y-6'
          >
            {/* Product Search */}
            {!selectedProduct && (
              <div className='space-y-4'>
                <Label className='text-[#455a54] font-winter-solid'>
                  Buscar Producto
                </Label>

                {/* Search and Filter Controls */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#455a54]/50' />
                    <Input
                      type='text'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder='Buscar por nombre o código...'
                      className='pl-10 border-[#9d684e]/20 focus:border-[#9d684e]'
                    />
                  </div>

                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger className='border-[#9d684e]/20 focus:border-[#9d684e]'>
                      <Filter className='h-4 w-4 mr-2' />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem
                          key={category.value}
                          value={category.value}
                        >
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Product Results with Pagination */}
                {(searchQuery || selectedCategory !== 'all') && (
                  <div className='border border-[#9d684e]/20 rounded-md max-h-80 overflow-hidden'>
                    <PaginationWithMore
                      items={filteredProducts}
                      itemsPerPage={10}
                      loading={loadingProducts}
                      className='p-2'
                      noItemsText='No se encontraron productos'
                      renderItem={(product) => (
                        <button
                          key={product.id}
                          type='button'
                          onClick={() => handleProductSelect(product)}
                          className='w-full text-left p-3 hover:bg-[#efcbb9]/20 border border-[#9d684e]/10 rounded-md'
                        >
                          <div className='flex justify-between items-center'>
                            <div>
                              <p className='font-medium text-[#455a54]'>
                                {product.name}
                              </p>
                              <p className='text-sm text-[#455a54]/70'>
                                {product.barcode} • {product.category}
                              </p>
                            </div>
                            <div className='text-right'>
                              <p className='text-sm text-[#455a54]'>
                                Stock: {product.stock}
                              </p>
                              <p className='text-xs text-[#455a54]/70'>
                                {product.unitOfMeasure}
                              </p>
                            </div>
                          </div>
                        </button>
                      )}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Selected Product */}
            {selectedProduct && (
              <div className='space-y-4'>
                <div className='flex items-center justify-between p-4 bg-[#efcbb9]/20 rounded-lg border border-[#9d684e]/20'>
                  <div className='flex items-center gap-3'>
                    <Package className='h-8 w-8 text-[#9d684e]' />
                    <div>
                      <h3 className='font-medium text-[#455a54] font-winter-solid'>
                        {selectedProduct.name}
                      </h3>
                      <p className='text-sm text-[#455a54]/70'>
                        {selectedProduct.category} • Código: {selectedProduct.barcode}
                      </p>
                    </div>
                  </div>
                  <div className='text-right'>
                    <p className='text-lg font-medium text-[#455a54]'>
                      Stock actual: {selectedProduct.stock}
                    </p>
                    <p className='text-sm text-[#455a54]/70'>
                      {selectedProduct.unitOfMeasure}
                    </p>
                  </div>
                </div>

                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    setSelectedProduct(null);
                    setNewStock('');
                    setNewUnitOfMeasure('gramo');
                    setReason('');
                    setNotes('');
                  }}
                  className='w-full border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30'
                >
                  Cambiar producto
                </Button>
              </div>
            )}

            {/* Stock Adjustment Fields */}
            {selectedProduct && (
              <>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label
                      htmlFor='newStock'
                      className='text-[#455a54] font-winter-solid'
                    >
                      Nuevo Stock *
                    </Label>
                    <Input
                      id='newStock'
                      type='number'
                      min='0'
                      value={newStock}
                      onChange={(e) => setNewStock(e.target.value)}
                      className='border-[#9d684e]/20 focus:border-[#9d684e]'
                      required
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label className='text-[#455a54] font-winter-solid'>
                      Diferencia
                    </Label>
                    <div
                      className={`p-2 rounded-md border text-center font-medium ${
                        difference > 0
                          ? 'bg-green-50 border-green-200 text-green-700'
                          : difference < 0
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : 'bg-gray-50 border-gray-200 text-gray-700'
                      }`}
                    >
                      {difference > 0 ? '+' : ''}
                      {difference}
                    </div>
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label
                    htmlFor='reason'
                    className='text-[#455a54] font-winter-solid'
                  >
                    Motivo del Ajuste *
                  </Label>
                  <Input
                    id='reason'
                    type='text'
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder='Ej: Inventario físico, producto dañado, error de carga...'
                    className='border-[#9d684e]/20 focus:border-[#9d684e]'
                    required
                  />
                </div>

                <div className='space-y-2'>
                  <Label
                    htmlFor='unitOfMeasure'
                    className='text-[#455a54] font-winter-solid'
                  >
                    Unidad de Medida
                  </Label>
                  <Select value={newUnitOfMeasure} onValueChange={(value: 'gramo' | 'litro') => setNewUnitOfMeasure(value)}>
                    <SelectTrigger className='border-[#9d684e]/20 focus:border-[#9d684e]'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='gramo'>Gramo</SelectItem>
                      <SelectItem value='litro'>Litro</SelectItem>
                    </SelectContent>
                  </Select>
                  {newUnitOfMeasure !== selectedProduct.unitOfMeasure && (
                    <p className='text-xs text-orange-600 flex items-center gap-1'>
                      <AlertCircle className='w-3 h-3' />
                      Se cambiará de &ldquo;{selectedProduct.unitOfMeasure}&rdquo; a &ldquo;{newUnitOfMeasure}&rdquo;
                    </p>
                  )}
                </div>

                <Button
                  type='submit'
                  disabled={!newStock || !reason || isSubmitting}
                  className='w-full bg-[#9d684e] hover:bg-[#9d684e]/90 text-white font-winter-solid'
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size='sm' />
                      <span className='ml-2'>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <Save className='h-4 w-4 mr-2' />
                      Realizar Ajuste
                    </>
                  )}
                </Button>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StockAdjustmentsPage() {
  return (
    <Suspense fallback={<div className="space-y-6 mt-6"><div className="animate-pulse h-8 bg-gray-200 rounded w-64"></div></div>}>
      <StockAdjustmentsContent />
    </Suspense>
  );
}
