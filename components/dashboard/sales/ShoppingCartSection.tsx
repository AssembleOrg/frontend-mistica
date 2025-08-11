/**
 * CAPA 4: PRESENTATION - SHOPPING CART COMPONENT
 * 
 * Componente UI puro para el carrito de compras
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { CartItem } from '@/lib/types';
import { formatCurrency } from '@/lib/sales-calculations';
import { cn } from '@/lib/utils';

interface ShoppingCartSectionProps {
  items: CartItem[];
  total: number;
  subtotal: number;
  tax: number;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  isLoading: boolean;
  className?: string;
}

export function ShoppingCartSection({
  items,
  total,
  subtotal,
  tax,
  onQuantityChange,
  onRemoveItem,
  onClearCart,
  isLoading,
  className
}: ShoppingCartSectionProps) {
  
  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      onRemoveItem(productId);
    } else {
      onQuantityChange(productId, newQuantity);
    }
  };

  if (items.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 text-muted-foreground', className)}>
        <ShoppingCart className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-center">El carrito está vacío</p>
        <p className="text-sm text-center">Busca productos para agregar</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      
      {/* Cart Header */}
      <div className="flex justify-between items-center">
        <h3 className="font-medium">
          {items.length} {items.length === 1 ? 'artículo' : 'artículos'}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearCart}
          disabled={isLoading}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Limpiar
        </Button>
      </div>

      {/* Cart Items */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.productId}
            className="flex items-center gap-3 p-3 border rounded-lg"
          >
            
            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">
                {item.productName}
              </h4>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(item.price)} c/u
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Badge variant="outline" className="text-xs">
                  {item.productId.slice(-6)}
                </Badge>
                {false && (
                  <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                    Stock bajo
                  </Badge>
                )}
              </div>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                disabled={isLoading}
              >
                <Minus className="w-3 h-3" />
              </Button>
              
              <Input
                type="number"
                value={item.quantity}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    handleQuantityChange(item.productId, value);
                  }
                }}
                className="w-16 h-6 text-center text-xs"
                min="1"
                disabled={isLoading}
              />
              
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                disabled={isLoading}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>

            {/* Item Total */}
            <div className="text-right min-w-0">
              <div className="font-semibold text-sm">
                {formatCurrency(item.subtotal)}
              </div>
              {item.discounts && item.discounts.length > 0 && (
                <div className="text-xs text-green-600">
                  -{formatCurrency(item.discounts[0].amount || 0)}
                </div>
              )}
            </div>

            {/* Remove Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => onRemoveItem(item.productId)}
              disabled={isLoading}
            >
              <Trash2 className="w-3 h-3" />
            </Button>

          </div>
        ))}
      </div>

      {/* Cart Summary */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Impuestos:</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <Separator />
        <div className="flex justify-between font-semibold">
          <span>Total:</span>
          <span className="text-lg">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Cart Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={isLoading}
        >
          Guardar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={isLoading}
        >
          Aplicar Desc.
        </Button>
      </div>

    </div>
  );
}