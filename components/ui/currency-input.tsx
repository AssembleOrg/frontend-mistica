'use client';

import { forwardRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  currency?: string;
  locale?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, currency = 'ARS', locale = 'es-AR', className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Format number with thousands separators
    const formatDisplayValue = (num: number) => {
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    };

    // Parse display value back to number
    const parseDisplayValue = (str: string) => {
      // Remove all non-numeric characters except decimal separator
      const cleaned = str.replace(/[^\d,.-]/g, '');
      // Replace comma with dot for parsing
      const normalized = cleaned.replace(',', '.');
      const parsed = parseFloat(normalized);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Update display value when value prop changes
    useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatDisplayValue(value));
      }
    }, [value, isFocused, locale]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      setDisplayValue(value === 0 ? '' : value.toString());
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      const numericValue = parseDisplayValue(displayValue);
      onChange(numericValue);
      setDisplayValue(formatDisplayValue(numericValue));
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      setDisplayValue(inputValue);
    };

    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      e.currentTarget.blur();
    };

    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onWheel={handleWheel}
          className={cn(
            "border-2 border-gray-700 focus:border-gray-900 focus:ring-2 focus:ring-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            className
          )}
        />
        {!isFocused && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
            {currency}
          </div>
        )}
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
