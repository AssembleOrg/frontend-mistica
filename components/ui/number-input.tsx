'use client';

import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, min, max, step = 1, className, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const numericValue = parseFloat(inputValue) || 0;
      
      // Apply min/max constraints
      let constrainedValue = numericValue;
      if (min !== undefined && numericValue < min) {
        constrainedValue = min;
      }
      if (max !== undefined && numericValue > max) {
        constrainedValue = max;
      }
      
      onChange(constrainedValue);
    };

    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      e.currentTarget.blur();
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="number"
        value={value || ''}
        onChange={handleChange}
        onWheel={handleWheel}
        min={min}
        max={max}
        step={step}
        className={cn(
          "border-2 border-gray-700 focus:border-gray-900 focus:ring-2 focus:ring-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className
        )}
      />
    );
  }
);

NumberInput.displayName = 'NumberInput';
