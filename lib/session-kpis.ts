import type { SessionTransaction } from '@/services/cashbox.service';

export interface SessionKpis {
  salesCount: number;
  salesTotal: number;
  egressCount: number;
  egressTotal: number;
  incomeCount: number;
  incomeTotal: number;
  /** Neto de EFECTIVO (CASH) de la sesión: entradas − salidas. */
  netBalance: number;
  /** Cobrado por método a partir de los ingresos de la sesión. */
  byMethod: { CASH: number; CARD: number; TRANSFER: number };
}

/**
 * Calcula los KPIs de una sesión a partir de sus transacciones (ventana
 * openedAt..closedAt exacta), no del summary del día calendario — así no se
 * mezclan dos cierres del mismo día y los ingresos sí se cuentan.
 *
 * Saldo de caja = SOLO efectivo (CASH). Tarjeta/transferencia no mueven la
 * caja física, así apertura + netBalance reconcilia con "Esperado al cierre".
 * Usa `amountByMethod` (no `paymentMethod`) para que las ventas MIXTO sumen su
 * porción CASH exacta.
 *
 * Lo comparten el detalle de sesión y el reporte descargable por sesión.
 */
export function computeSessionKpis(transactions: SessionTransaction[]): SessionKpis {
  let salesCount = 0, salesTotal = 0;
  let egressCount = 0, egressTotal = 0;
  let incomeCount = 0, incomeTotal = 0;
  let cashInflow = 0, cashOutflow = 0;
  const byMethod = { CASH: 0, CARD: 0, TRANSFER: 0 };

  for (const t of transactions) {
    if (t.source === 'sale') { salesCount++; salesTotal += t.amount; }
    else if (t.source === 'egress') { egressCount++; egressTotal += t.amount; }
    else if (t.source === 'income') { incomeCount++; incomeTotal += t.amount; }

    const m = t.amountByMethod;
    if (t.type === 'ingreso') {
      byMethod.CASH += m.CASH;
      byMethod.CARD += m.CARD;
      byMethod.TRANSFER += m.TRANSFER;
      cashInflow += m.CASH;
    } else {
      cashOutflow += m.CASH;
    }
  }

  return {
    salesCount, salesTotal,
    egressCount, egressTotal,
    incomeCount, incomeTotal,
    netBalance: Number((cashInflow - cashOutflow).toFixed(2)),
    byMethod,
  };
}
