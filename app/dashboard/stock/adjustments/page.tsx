/*  eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
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
import { ArrowLeft, Package, Search, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStockStore } from '@/stores/stock.store';
import { useProductStore } from '@/stores/product.store';
import { showToast } from '@/lib/toast';
import { validateStockAdjustment } from '@/lib/stock-utils';
import { LoadingSpinner } from '@/components/ui/loading-skeletons';

export default function StockAdjustmentsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [newStock, setNewStock] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { addAdjustment } = useStockStore();
  const { products, updateStock } = useProductStore();

  // Filter products based on search
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
    setNewStock(product.stock.toString());
    setSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      showToast.error('Error', 'Debe seleccionar un producto');
      return;
    }

    const newStockValue = parseInt(newStock);
    const validation = validateStockAdjustment(
      selectedProduct.stock,
      newStockValue,
      reason
    );

    if (!validation.isValid) {
      showToast.error('Error de validación', validation.error || '');
      return;
    }

    setIsLoading(true);

    try {
      // Create adjustment record
      addAdjustment({
        productId: selectedProduct.id,
        oldQuantity: selectedProduct.stock,
        newQuantity: newStockValue,
        difference: newStockValue - selectedProduct.stock,
        reason,
        notes,
        userId: 'current-user', // This would come from auth
      });

      // Update product stock
      await updateStock(selectedProduct.id, newStockValue, reason);

      showToast.success(
        'Ajuste realizado',
        `Stock de "${selectedProduct.name}" actualizado correctamente`
      );

      // Reset form
      setSelectedProduct(null);
      setNewStock('');
      setReason('');
      setNotes('');

      // Optional: navigate back to stock dashboard
      setTimeout(() => {
        router.push('/dashboard/stock');
      }, 1500);
    } catch (error) {
      showToast.error(
        'Error al realizar ajuste',
        error instanceof Error ? error.message : 'Error desconocido'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const difference =
    selectedProduct && newStock
      ? parseInt(newStock) - selectedProduct.stock
      : 0;

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
              <div className='space-y-2'>
                <Label
                  htmlFor='search'
                  className='text-[#455a54] font-winter-solid'
                >
                  Buscar Producto
                </Label>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#455a54]/50' />
                  <Input
                    id='search'
                    type='text'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder='Buscar por nombre o código de barras...'
                    className='pl-10 border-[#9d684e]/20 focus:border-[#9d684e]'
                  />
                </div>

                {/* Search Results */}
                {searchQuery && (
                  <div className='max-h-48 overflow-y-auto border border-[#9d684e]/20 rounded-md'>
                    {filteredProducts.length > 0 ? (
                      filteredProducts.slice(0, 5).map((product) => (
                        <button
                          key={product.id}
                          type='button'
                          onClick={() => handleProductSelect(product)}
                          className='w-full text-left p-3 hover:bg-[#efcbb9]/20 border-b border-[#9d684e]/10 last:border-b-0'
                        >
                          <div className='flex justify-between items-center'>
                            <div>
                              <p className='font-medium text-[#455a54]'>
                                {product.name}
                              </p>
                              <p className='text-sm text-[#455a54]/70'>
                                {product.barcode}
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
                      ))
                    ) : (
                      <div className='p-3 text-center text-[#455a54]/70'>
                        No se encontraron productos
                      </div>
                    )}
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
                        Código: {selectedProduct.barcode}
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

                <Button
                  type='submit'
                  disabled={isLoading || !newStock || !reason}
                  className='w-full bg-[#9d684e] hover:bg-[#9d684e]/90 text-white font-winter-solid'
                >
                  {isLoading ? (
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
