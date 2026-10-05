'use client';

import { formatCurrency } from '@/lib/sales-calculations';
import { EgressBreakdownPrint } from './egress-breakdown';
import { C, KpiBand, PrintFooter, PrintHeader, PrintPage } from './print-shell';
import type { EgressBreakdown } from '@/hooks/useEgressBreakdown';

interface Props {
  egresses: EgressBreakdown;
  periodLabel: string;
}

/**
 * Reporte imprimible dedicado exclusivamente a los egresos de un período,
 * discriminados por categoría y con el detalle completo. El cierre de mes muestra el
 * total agregado, este reporte muestra en qué se gastó.
 */
export function EgressReportViewer({ egresses, periodLabel }: Props) {
  const { rows, items, total, count, error, truncated, totalAvailable } = egresses;

  const average = count > 0 ? total / count : 0;
  const topType = rows.length > 0 ? rows[0] : null;
  const cash = items.filter((e) => e.paymentMethod === 'CASH');
  const cashTotal = cash.reduce((sum, e) => sum + e.amount, 0);

  return (
    <PrintPage>
      <PrintHeader title="REPORTE DE EGRESOS" subtitle={periodLabel} />

      <KpiBand
        items={[
          {
            label: 'Total egresado',
            value: formatCurrency(total),
            sub: `${count} ${count === 1 ? 'egreso' : 'egresos'}`,
            color: C.terracota,
          },
          {
            label: 'Promedio',
            value: formatCurrency(average),
            sub: 'por egreso',
          },
          {
            label: 'Mayor gasto',
            value: topType ? formatCurrency(topType.amount) : '—',
            sub: topType ? topType.label : 'sin datos',
            color: C.terracota,
          },
          {
            label: 'En efectivo',
            value: formatCurrency(cashTotal),
            sub: `${cash.length} ${cash.length === 1 ? 'egreso' : 'egresos'}`,
            color: C.terracota,
          },
        ]}
      />

      <EgressBreakdownPrint
        rows={rows}
        items={items}
        total={total}
        count={count}
        error={error}
        truncated={truncated}
        totalAvailable={totalAvailable}
      />

      <PrintFooter />
    </PrintPage>
  );
}
