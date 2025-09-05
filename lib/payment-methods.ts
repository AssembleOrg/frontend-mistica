import type { ReactNode } from 'react';

export type PaymentMethod =
  | 'efectivo'
  | 'tarjeta'
  | 'transferencia'
  | 'mixto'
  | 'qr'
  | 'giftcard'
  | 'precio_lista';

export interface PaymentMethodDef {
  id: PaymentMethod;
  name: string;
  requiresChange?: boolean;
  icon?: ReactNode;
}

export const PAYMENT_METHODS: PaymentMethodDef[] = [
  { id: 'efectivo', name: 'Efectivo', requiresChange: true },
  { id: 'tarjeta', name: 'Tarjeta' },
  { id: 'transferencia', name: 'Transferencia' },
  { id: 'mixto', name: 'Mixto' },
  { id: 'qr', name: 'QR' },
  { id: 'giftcard', name: 'Gift Card' },
  { id: 'precio_lista', name: 'Precio de Lista' },
];

// Helper: get label from id
export function getPaymentMethodLabel(id: PaymentMethod): string {
  return PAYMENT_METHODS.find((m) => m.id === id)?.name || id;
}

// Helper: get badge class (bg/text color) for consistent UI
export function getPaymentMethodBadgeClass(id: PaymentMethod): string {
  switch (id) {
    case 'efectivo':
      return 'bg-green-100 text-green-800';
    case 'tarjeta':
      return 'bg-blue-100 text-blue-800';
    case 'transferencia':
      return 'bg-purple-100 text-purple-800';
    case 'mixto':
      return 'bg-yellow-100 text-yellow-800';
    case 'qr':
      return 'bg-teal-100 text-teal-800';
    case 'giftcard':
      return 'bg-pink-100 text-pink-800';
    case 'precio_lista':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
