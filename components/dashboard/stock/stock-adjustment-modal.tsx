'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Package, Save, AlertCircle } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { useStock } from '@/hooks/useStock';
import { useProducts } from '@/hooks/useProducts';
import { LoadingSpinner } from '@/components/ui/loading-skeletons';
import type { Product } from '@/lib/types';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export function StockAdjustmentModal({ isOpen, onClose, product }: StockAdjustmentModalProps) {
  const [newStock, setNewStock] = useState('');
  const [newUnitOfMeasure, setNewUnitOfMeasure] = useState<'gramo' | 'litro' | 'unidad'>('gramo');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { adjustStockQuantity } = useStock();
  const { updateProduct } = useProducts();

  // Initialize form when product changes
  useEffect(() => {
    if (product) {
      setNewStock(product.stock.toString());
      setNewUnitOfMeasure(product.unitOfMeasure);
      setReason('');
    }
  }, [product]);

  const difference = useMemo(() => {
    return product && newStock
      ? parseInt(newStock) - product.stock
      : 0;
  }, [product, newStock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product) {
      showToast.error('Debe seleccionar un producto');
      return;
    }

    // if (!reason.trim()) {
    //   showToast.error('Debe especificar un motivo para el ajuste');
    //   return;
    // }

    const newStockValue = parseInt(newStock);
    if (isNaN(newStockValue) || newStockValue < 0) {
      showToast.error('El stock debe ser un número válido mayor o igual a 0');
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate the adjustment quantity
      const adjustment = newStockValue - product.stock;

      if (adjustment === 0) {
        showToast.info('No hay cambios en el stock');
        setIsSubmitting(false);
        return;
      }

      // Check if unit of measure has changed and update it
      if (newUnitOfMeasure !== product.unitOfMeasure) {
        console.log('🔄 Actualizando unidad de medida:', product.unitOfMeasure, '→', newUnitOfMeasure);
        await updateProduct(product.id, { unitOfMeasure: newUnitOfMeasure });
      }

      // Use simple hook to adjust stock with backend integration
      await adjustStockQuantity(product.id, adjustment, reason);

      showToast.success(
        `Stock de "${product.name}" actualizado correctamente`
      );

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error en ajuste de stock:', error);
      showToast.error(
        error instanceof Error ? error.message : 'Error al realizar ajuste'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form
    if (product) {
      setNewStock(product.stock.toString());
      setNewUnitOfMeasure(product.unitOfMeasure);
      setReason('');
    }
    onClose();
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] border-[#9d684e]/20">
        <DialogHeader>
          <DialogTitle className="text-[#455a54] font-tan-nimbus text-xl">
            Ajustar Stock
          </DialogTitle>
          <DialogDescription className="font-winter-solid">
            Actualiza la cantidad de inventario para este producto
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Information */}
          <div className="flex items-center justify-between p-4 bg-[#efcbb9]/20 rounded-lg border border-[#9d684e]/20">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-[#9d684e]" />
              <div>
                <h3 className="font-medium text-[#455a54] font-winter-solid">
                  {product.name}
                </h3>
                <p className="text-sm text-[#455a54]/70">
                  {product.category} • Código: {product.barcode}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-medium text-[#455a54]">
                Stock actual: {product.stock}
              </p>
              <p className="text-sm text-[#455a54]/70">
                {product.unitOfMeasure}
              </p>
            </div>
          </div>

          {/* Stock Adjustment Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="newStock"
                className="text-[#455a54] font-winter-solid"
              >
                Nuevo Stock *
              </Label>
              <Input
                id="newStock"
                type="number"
                min="0"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                className="border-2 border-gray-700 focus:border-gray-900 focus:ring-2 focus:ring-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#455a54] font-winter-solid">
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

          {/* <div className="space-y-2">
            <Label
              htmlFor="reason"
              className="text-[#455a54] font-winter-solid"
            >
              Motivo del Ajuste *
            </Label>
            <Input
              id="reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Inventario físico, producto dañado, error de carga..."
              className="border-2 border-gray-700 focus:border-gray-900 focus:ring-2 focus:ring-gray-300"
              required
            />
          </div> */}

          <div className="space-y-2">
            <Label
              htmlFor="unitOfMeasure"
              className="text-[#455a54] font-winter-solid"
            >
              Unidad de Medida
            </Label>
            <Select 
              value={newUnitOfMeasure} 
              onValueChange={(value: 'gramo' | 'litro' | 'unidad') => setNewUnitOfMeasure(value)}
            >
              <SelectTrigger className="bg-white border-2 border-gray-700 hover:border-gray-800 focus:border-gray-900 focus:ring-2 focus:ring-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gramo">Gramo</SelectItem>
                <SelectItem value="litro">Litro</SelectItem>
                <SelectItem value="unidad">Unidad</SelectItem>
              </SelectContent>
            </Select>
            {newUnitOfMeasure !== product.unitOfMeasure && (
              <p className="text-xs text-orange-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Se cambiará de &ldquo;{product.unitOfMeasure}&rdquo; a &ldquo;{newUnitOfMeasure}&rdquo;
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!newStock  || isSubmitting}
              className="flex-1 bg-[#9d684e] hover:bg-[#9d684e]/90 text-white font-winter-solid"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Procesando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Realizar Ajuste
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
