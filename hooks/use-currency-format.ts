import { useMemo } from 'react';

interface UseCurrencyFormatOptions {
  currency?: string;
  locale?: string;
  showSymbol?: boolean;
}

export function useCurrencyFormat(options: UseCurrencyFormatOptions = {}) {
  const {
    currency = 'ARS',
    locale = 'es-AR',
    showSymbol = true
  } = options;

  const formatter = useMemo(() => {
    return new Intl.NumberFormat(locale, {
      style: showSymbol ? 'currency' : 'decimal',
      currency: showSymbol ? currency : undefined,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [currency, locale, showSymbol]);

  const formatCurrency = (amount: number) => {
    return formatter.format(amount);
  };

  const formatNumber = (amount: number, fractionDigits: number = 2) => {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  };

  return {
    formatCurrency,
    formatNumber,
    formatter
  };
}
