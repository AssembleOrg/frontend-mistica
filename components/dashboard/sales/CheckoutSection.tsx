/**
 * CAPA 4: PRESENTATION - CHECKOUT COMPONENT
 *
 * Componente UI puro para el proceso de checkout
 */

import { useState, useMemo } from 'react';
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
import { CreditCard, DollarSign, Receipt, Calculator, TrendingDown, TrendingUp, User, Search, X } from 'lucide-react';
import { CartItem, PaymentInfo } from '@/lib/types';
import type { PaymentMethod, PaymentMethodDef } from '@/lib/payment-methods';
import { formatCurrency, getTaxRateDisplay } from '@/lib/sales-calculations';
import { cn } from '@/lib/utils';
import { useSettingsStore, type PaymentMethodSettings } from '@/stores/settings.store';
import { useCustomerStore, Customer } from '@/stores/customer.store';

interface CheckoutSectionProps {
  total: number;
  subtotal: number;
  tax: number;
  items: CartItem[];
  paymentMethods: PaymentMethodDef[];
  onCheckout: (paymentInfo: PaymentInfo) => Promise<void>;
  isProcessing: boolean;
  isDisabled: boolean;
  className?: string;
}

const defaultPaymentMethods: PaymentMethodDef[] = [
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
    useState<PaymentMethod>('efectivo');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [showChangeCalculator, setShowChangeCalculator] = useState(false);
  
  // Customer-related states
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [balanceToUse, setBalanceToUse] = useState<number>(0);
  
  const { actions: settingsActions } = useSettingsStore();
  const { 
    searchCustomers, 
    searchResults, 
    clearSearch,
    createCustomer
  } = useCustomerStore();

  const selectedMethod =
    paymentMethods.find((m) => m.id === selectedPaymentMethod) ||
    defaultPaymentMethods[0];

  // Calculate payment adjustments (discounts/surcharges)
  const paymentAdjustment = useMemo(() => {
    return settingsActions.calculatePaymentAdjustment(
      total,
      selectedPaymentMethod as keyof PaymentMethodSettings
    );
  }, [total, selectedPaymentMethod, settingsActions]);

  const finalTotal = paymentAdjustment.finalAmount;
  const totalAfterBalance = finalTotal - balanceToUse;
  
  const change = selectedMethod.requiresChange
    ? Math.max(0, cashReceived - totalAfterBalance)
    : 0;
  const isValidPayment = selectedMethod.requiresChange
    ? cashReceived >= totalAfterBalance
    : true;

  const handleQuickCash = (amount: number) => {
    setCashReceived(amount);
  };

  const handleCustomerSearch = (query: string) => {
    setCustomerSearch(query);
    if (query.trim()) {
      searchCustomers(query);
    } else {
      clearSearch();
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerSearch(false);
    setCustomerSearch('');
    clearSearch();
    
    // Auto-set balance to use up to the total amount
    const maxBalance = Math.min(customer.balance, finalTotal);
    setBalanceToUse(maxBalance);
  };

  const handleCreateNewCustomer = () => {
    if (!customerSearch.trim()) return;
    
    const newCustomer = createCustomer({
      name: customerSearch.trim(),
      phone: customerSearch.includes('@') ? undefined : customerSearch.trim()
    });
    
    handleSelectCustomer(newCustomer);
  };

  const handleRemoveCustomer = () => {
    setSelectedCustomer(null);
    setBalanceToUse(0);
    setCustomerSearch('');
    clearSearch();
  };

  const handleCheckout = async () => {
    if (!isValidPayment || isDisabled) return;

    const paymentInfo: PaymentInfo = {
      method: selectedPaymentMethod,
      amount: totalAfterBalance,
      received: selectedMethod.requiresChange ? cashReceived : totalAfterBalance,
      change: change,
      reference: customerNotes || undefined,
      // Customer information
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      balanceUsed: balanceToUse,
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
              <span className='whitespace-nowrap'>{formatCurrency(subtotal)}</span>
            </div>
            <div className='flex justify-between text-sm'>
              <span>Impuestos ({getTaxRateDisplay(tax/subtotal)}):</span>
              <span className='whitespace-nowrap'>{formatCurrency(tax)}</span>
            </div>
            <Separator />
            <div className='flex justify-between font-medium'>
              <span>Subtotal con impuestos:</span>
              <span className='whitespace-nowrap'>{formatCurrency(total)}</span>
            </div>
            
            {/* Payment Adjustment Display */}
            {paymentAdjustment.adjustmentType !== 'ninguno' && (
              <>
                <div className={cn(
                  'flex justify-between text-sm items-center',
                  paymentAdjustment.adjustmentType === 'descuento' ? 'text-green-600' : 'text-orange-600'
                )}>
                  <span className="flex items-center gap-1">
                    {paymentAdjustment.adjustmentType === 'descuento' ? (
                      <TrendingDown className="w-4 h-4" />
                    ) : (
                      <TrendingUp className="w-4 h-4" />
                    )}
                    {paymentAdjustment.adjustmentType === 'descuento' ? 'Descuento' : 'Recargo'} {selectedMethod.name} 
                    ({paymentAdjustment.adjustmentPercentage}%):
                  </span>
                  <span className="font-medium">
                    {paymentAdjustment.adjustmentType === 'descuento' ? '-' : '+'}{formatCurrency(paymentAdjustment.adjustmentAmount)}
                  </span>
                </div>
                <Separator />
              </>
            )}
            
            <div className='flex justify-between font-semibold text-lg'>
              <span>Total Final:</span>
              <span className={cn(
                'text-primary',
                paymentAdjustment.adjustmentType === 'descuento' && 'text-green-600',
                paymentAdjustment.adjustmentType === 'recargo' && 'text-orange-600'
              )}>
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <div className='space-y-2'>
        <label className='text-sm font-medium'>Método de Pago</label>
        <Select
          value={selectedPaymentMethod}
          onValueChange={(v: PaymentMethod) => setSelectedPaymentMethod(v)}
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

      {/* Customer Section */}
      <div className='space-y-2'>
        <label className='text-sm font-medium'>Cliente</label>
        {!selectedCustomer ? (
          <div className='space-y-2'>
            <div className='flex gap-2'>
              <div className='relative flex-1'>
                <Input
                  placeholder="Buscar por nombre o teléfono..."
                  value={customerSearch}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  onFocus={() => setShowCustomerSearch(true)}
                  className='pr-10'
                />
                <Search className='absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
              </div>
              <Button
                variant='outline'
                onClick={() => setShowCustomerSearch(!showCustomerSearch)}
              >
                <User className='w-4 h-4' />
              </Button>
            </div>

            {/* Search Results */}
            {(showCustomerSearch && (searchResults.length > 0 || customerSearch.trim())) && (
              <div className='border rounded-md max-h-32 overflow-y-auto bg-white'>
                {searchResults.length > 0 ? (
                  searchResults.map((customer) => (
                    <button
                      key={customer.id}
                      className='w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0'
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      <div className='font-medium'>{customer.name}</div>
                      <div className='text-sm text-gray-600'>
                        Saldo: {formatCurrency(customer.balance)}
                        {customer.phone && ` • ${customer.phone}`}
                      </div>
                    </button>
                  ))
                ) : (
                  customerSearch.trim() && (
                    <button
                      className='w-full text-left p-3 hover:bg-gray-50 text-blue-600'
                      onClick={handleCreateNewCustomer}
                    >
                      + Crear cliente &ldquo;{customerSearch}&rdquo;
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ) : (
          <div className='border rounded-lg p-3 bg-green-50 border-green-200'>
            <div className='flex items-center justify-between mb-2'>
              <div>
                <div className='font-medium flex items-center gap-2'>
                  <User className='w-4 h-4' />
                  {selectedCustomer.name}
                </div>
                <div className='text-sm text-gray-600'>
                  Saldo disponible: {formatCurrency(selectedCustomer.balance)}
                </div>
              </div>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleRemoveCustomer}
              >
                <X className='w-4 h-4' />
              </Button>
            </div>
            
            {selectedCustomer.balance > 0 && (
              <div className='space-y-2'>
                <label className='text-sm font-medium'>Saldo a usar</label>
                <Input
                  type='number'
                  value={balanceToUse || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    const maxBalance = Math.min(selectedCustomer.balance, finalTotal);
                    setBalanceToUse(Math.min(Math.max(0, value), maxBalance));
                  }}
                  max={Math.min(selectedCustomer.balance, finalTotal)}
                  placeholder='0.00'
                  step='0.01'
                />
                <div className='flex gap-1'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => setBalanceToUse(Math.min(selectedCustomer.balance, finalTotal))}
                  >
                    Usar todo
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => setBalanceToUse(0)}
                  >
                    No usar
                  </Button>
                </div>
              </div>
            )}
            
            {balanceToUse > 0 && (
              <div className='mt-2 p-2 bg-green-100 rounded text-sm'>
                <strong>A pagar después del saldo:</strong> {formatCurrency(totalAfterBalance)}
              </div>
            )}
          </div>
        )}
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
                Math.ceil(finalTotal),
                Math.ceil(finalTotal / 10) * 10,
                Math.ceil(finalTotal / 100) * 100,
                finalTotal + 10,
                finalTotal + 50,
                finalTotal + 100,
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
          variant="verde"
          className='w-full h-12 text-lg font-semibold font-tan-nimbus'
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
              Guardar Venta
            </>
          )}
        </Button>

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
