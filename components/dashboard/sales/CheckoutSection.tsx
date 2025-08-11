/**
 * CAPA 4: PRESENTATION - CHECKOUT COMPONENT
 *
 * Componente UI puro para el proceso de checkout
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, DollarSign, Receipt, Calculator } from 'lucide-react';
import { CartItem, PaymentInfo } from '@/lib/types';
import { formatCurrency, getTaxRateDisplay } from '@/lib/sales-calculations';
import { cn } from '@/lib/utils';

interface PaymentMethod {
  id: string;
  name: string;
  icon?: React.ReactNode;
  requiresChange?: boolean;
}

interface CheckoutSectionProps {
  total: number;
  subtotal: number;
  tax: number;
  items: CartItem[];
  paymentMethods: PaymentMethod[];
  onCheckout: (paymentInfo: PaymentInfo) => Promise<void>;
  isProcessing: boolean;
  isDisabled: boolean;
  className?: string;
}

const defaultPaymentMethods: PaymentMethod[] = [
  {
    id: 'efectivo',
    name: 'Efectivo',
    icon: <DollarSign className='w-4 h-4' />,
    requiresChange: true,
  },
  {
    id: 'tarjeta',
    name: 'Tarjeta',
    icon: <CreditCard className='w-4 h-4' />,
    requiresChange: false,
  },
  {
    id: 'transferencia',
    name: 'Transferencia',
    icon: <Receipt className='w-4 h-4' />,
    requiresChange: false,
  },
];

export function CheckoutSection({
  total,
  subtotal,
  tax,
  items,
  paymentMethods = defaultPaymentMethods,
  onCheckout,
  isProcessing,
  isDisabled,
  className,
}: CheckoutSectionProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>('efectivo');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [showChangeCalculator, setShowChangeCalculator] = useState(false);

  const selectedMethod =
    paymentMethods.find((m) => m.id === selectedPaymentMethod) ||
    defaultPaymentMethods[0];
  const change = selectedMethod.requiresChange
    ? Math.max(0, cashReceived - total)
    : 0;
  const isValidPayment = selectedMethod.requiresChange
    ? cashReceived >= total
    : true;

  const handleQuickCash = (amount: number) => {
    setCashReceived(amount);
  };

  const handleCheckout = async () => {
    if (!isValidPayment || isDisabled) return;

    const paymentInfo: PaymentInfo = {
      method: selectedPaymentMethod,
      amount: total,
      received: selectedMethod.requiresChange ? cashReceived : total,
      change: change,
      reference: customerNotes || undefined,
    };

    try {
      await onCheckout(paymentInfo);
      // Reset form on success
      setCashReceived(0);
      setCustomerNotes('');
    } catch (error) {
      // Error handling is done by parent component
      console.error('Checkout error:', error);
    }
  };

  if (isDisabled) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-8 text-muted-foreground',
          className
        )}
      >
        <Receipt className='w-12 h-12 mb-4 opacity-50' />
        <p className='text-center'>Agrega productos para continuar</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Payment Summary */}
      <Card>
        <CardContent className='pt-4'>
          <div className='space-y-2'>
            <div className='flex justify-between text-sm'>
              <span>Subtotal ({items.length} items):</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className='flex justify-between text-sm'>
              <span>Impuestos ({getTaxRateDisplay(tax/subtotal)}):</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <Separator />
            <div className='flex justify-between font-semibold text-lg'>
              <span>Total a Pagar:</span>
              <span className='text-primary'>{formatCurrency(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <div className='space-y-2'>
        <label className='text-sm font-medium'>Método de Pago</label>
        <Select
          value={selectedPaymentMethod}
          onValueChange={setSelectedPaymentMethod}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {paymentMethods.map((method) => (
              <SelectItem
                key={method.id}
                value={method.id}
              >
                <div className='flex items-center gap-2'>
                  {method.icon}
                  {method.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cash Payment Details */}
      {selectedMethod.requiresChange && (
        <div className='space-y-4'>
          <div className='space-y-2'>
            <div className='flex justify-between items-center'>
              <label className='text-sm font-medium'>Efectivo Recibido</label>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setShowChangeCalculator(!showChangeCalculator)}
              >
                <Calculator className='w-4 h-4' />
              </Button>
            </div>
            <Input
              type='number'
              value={cashReceived || ''}
              onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
              placeholder='0.00'
              className='text-lg font-mono'
              step='0.01'
            />
          </div>

          {/* Quick Cash Buttons */}
          {showChangeCalculator && (
            <div className='grid grid-cols-3 gap-2'>
              {[
                Math.ceil(total),
                Math.ceil(total / 10) * 10,
                Math.ceil(total / 100) * 100,
                total + 10,
                total + 50,
                total + 100,
              ].map((amount, index) => (
                <Button
                  key={index}
                  variant='outline'
                  size='sm'
                  onClick={() => handleQuickCash(amount)}
                  className='text-xs'
                >
                  {formatCurrency(amount)}
                </Button>
              ))}
            </div>
          )}

          {/* Change Display */}
          {cashReceived > 0 && (
            <div className='p-3 border rounded-lg'>
              <div className='flex justify-between items-center'>
                <span className='text-sm'>Cambio:</span>
                <span
                  className={cn(
                    'font-semibold text-lg',
                    change >= 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {formatCurrency(change)}
                </span>
              </div>
              {change < 0 && (
                <Badge
                  variant='default'
                  className='mt-2'
                >
                  Efectivo insuficiente
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Customer Notes */}
      <div className='space-y-2'>
        <label className='text-sm font-medium'>Notas (Opcional)</label>
        <Textarea
          value={customerNotes}
          onChange={(e) => setCustomerNotes(e.target.value)}
          placeholder='Información adicional...'
          className='min-h-[80px]'
        />
      </div>

      {/* Checkout Actions */}
      <div className='space-y-2 pt-2'>
        <Button
          onClick={handleCheckout}
          disabled={!isValidPayment || isProcessing}
          className='w-full h-12 text-lg font-semibold'
          size='lg'
        >
          {isProcessing ? (
            <>
              <div className='animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2' />
              Procesando...
            </>
          ) : (
            <>
              <Receipt className='w-5 h-5 mr-2' />
              Completar Venta
            </>
          )}
        </Button>

        <div className='flex gap-2'>
          <Button
            variant='outline'
            className='flex-1'
            disabled={isProcessing}
          >
            Guardar Borrador
          </Button>
          <Button
            variant='outline'
            className='flex-1'
            disabled={isProcessing}
          >
            Vista Previa
          </Button>
        </div>
      </div>

      {/* Payment Validation Messages */}
      {!isValidPayment && selectedMethod.requiresChange && (
        <div className='text-sm text-destructive text-center'>
          El efectivo recibido debe ser mayor o igual al total
        </div>
      )}
    </div>
  );
}
