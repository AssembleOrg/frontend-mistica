'use client';

import { useRouter } from 'next/navigation';

/**
 * Cobrar el saldo de una reserva: lleva a Ventas → Nueva venta con la reserva
 * cargada (cliente, experiencia, adicionales y saldo). Así el cobro entra a la
 * caja, sale con comprobante y se le pueden sumar productos (un sahumerio, una
 * piedra). Al guardar la venta, la reserva queda saldada.
 */
export function useCobrarEnVentas() {
  const router = useRouter();
  return (reservationId: string) =>
    router.push(`/dashboard/sales?reserva=${reservationId}`);
}
