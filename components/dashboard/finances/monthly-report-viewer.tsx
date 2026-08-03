'use client';

import { type FinanceSummary } from '@/services/finance.service';
import { formatCurrency } from '@/lib/sales-calculations';
import { defaultSessionLabel } from '@/lib/session-label';
import {
  C,
  KpiBand,
  PrintFooter,
  PrintHeader,
  PrintPage,
  SectionTitle,
  cellBase,
  thBase,
  totalCell,
} from './print-shell';

interface Props {
  summary: FinanceSummary;
  monthLabel: string;
}

export function MonthlyReportViewer({ summary, monthLabel }: Props) {
  const paymentTotal = summary.byPaymentMethod.CASH + summary.byPaymentMethod.CARD + summary.byPaymentMethod.TRANSFER;
  const pct = (n: number) => paymentTotal > 0 ? Math.round((n / paymentTotal) * 100) : 0;

  const salesTotal = summary.byStatus.COMPLETED + summary.byStatus.PENDING + summary.byStatus.CANCELLED;
  const spct = (n: number) => salesTotal > 0 ? Math.round((n / salesTotal) * 100) : 0;

  return (
    <PrintPage>
      <PrintHeader title="CIERRE DE MES" subtitle={monthLabel} />

      <KpiBand
        items={[
          {
            label: 'Balance neto',
            value: formatCurrency(summary.netBalance),
            sub: `${summary.salesCount} ventas`,
            color: summary.netBalance >= 0 ? C.verde : C.rojo,
          },
          {
            label: 'Ingresos totales',
            value: formatCurrency(summary.totalRevenue),
            sub: summary.incomes.count > 0 ? `+ ${summary.incomes.count} otros ingresos` : 'ventas + señas',
          },
          {
            label: 'Egresos',
            value: formatCurrency(summary.expenses.total),
            sub: `${summary.expenses.count} gastos`,
            color: C.terracota,
          },
          {
            label: 'Ticket promedio',
            value: formatCurrency(summary.averageTicket),
            sub: 'por venta',
          },
        ]}
      />

      {/* Sesiones de caja */}
      <div style={{ marginBottom: 20 }}>
        <SectionTitle>Estado de caja — sesiones del período</SectionTitle>
        {summary.cashSessions.length === 0 ? (
          <p style={{ fontSize: 10, color: C.gris, fontStyle: 'italic' }}>
            Sin sesiones de caja registradas en este período.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thBase, textAlign: 'left' }}>Sesión</th>
                <th style={{ ...thBase, textAlign: 'right', width: 96 }}>Apertura</th>
                <th style={{ ...thBase, textAlign: 'right', width: 96 }}>Esperado</th>
                <th style={{ ...thBase, textAlign: 'right', width: 96 }}>Contado</th>
                <th style={{ ...thBase, textAlign: 'right', width: 100 }}>Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {summary.cashSessions.map((s) => {
                const diff = s.discrepancy;
                const diffColor = diff === null ? C.gris
                  : diff === 0 ? C.verde
                  : diff > 0 ? C.naranja
                  : C.rojo;

                return (
                  <tr key={s.id} style={{ breakInside: 'avoid' }}>
                    <td style={{ ...cellBase, color: C.tinta }}>
                      {s.label || defaultSessionLabel(s.openedAt)}
                      {s.closureType === 'AUTO' && (
                        <span style={{ fontSize: 8, color: C.naranja, marginLeft: 6 }}>AUTO</span>
                      )}
                      {s.wasEdited && (
                        <span style={{ fontSize: 8, color: C.gris, marginLeft: 6 }}>editada</span>
                      )}
                    </td>
                    <td className="tabular-nums" style={{ ...cellBase, textAlign: 'right', color: C.tinta }}>
                      {formatCurrency(s.openingCash)}
                    </td>
                    <td className="tabular-nums" style={{ ...cellBase, textAlign: 'right', color: C.tinta }}>
                      {s.expectedClosingCash !== null ? formatCurrency(s.expectedClosingCash) : '—'}
                    </td>
                    <td className="tabular-nums" style={{ ...cellBase, textAlign: 'right', color: C.tinta }}>
                      {s.countedClosingCash !== null ? formatCurrency(s.countedClosingCash) : '—'}
                    </td>
                    <td className="tabular-nums" style={{ ...cellBase, textAlign: 'right', fontWeight: 700, color: diffColor }}>
                      {diff === null ? '—'
                        : diff === 0 ? '✓'
                        : `${diff > 0 ? '+' : ''}${formatCurrency(diff)}`}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={4} style={totalCell}>
                  Diferencia neta del período
                </td>
                <td
                  className="tabular-nums"
                  style={{
                    ...totalCell,
                    textAlign: 'right',
                    fontWeight: 800,
                    fontSize: 11,
                    color: summary.totalDiscrepancy === 0 ? C.verde : summary.totalDiscrepancy > 0 ? C.naranja : C.rojo,
                  }}
                >
                  {summary.totalDiscrepancy === 0 ? 'Sin diferencias'
                    : `${summary.totalDiscrepancy > 0 ? '+' : ''}${formatCurrency(summary.totalDiscrepancy)}`}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Dos columnas: métodos de pago + estado de ventas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 20 }}>

        <div>
          <SectionTitle>Métodos de pago</SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                { label: 'Efectivo', amount: summary.byPaymentMethod.CASH },
                { label: 'Tarjeta', amount: summary.byPaymentMethod.CARD },
                { label: 'Transferencia', amount: summary.byPaymentMethod.TRANSFER },
              ].map(m => (
                <tr key={m.label}>
                  <td style={{ ...cellBase, color: C.gris }}>{m.label}</td>
                  <td className="tabular-nums" style={{ ...cellBase, textAlign: 'right', fontWeight: 700, color: C.tinta }}>
                    {formatCurrency(m.amount)}
                  </td>
                  <td className="tabular-nums" style={{ ...cellBase, textAlign: 'right', color: C.gris, width: 42 }}>
                    {pct(m.amount)}%
                  </td>
                </tr>
              ))}
              <tr>
                <td style={totalCell}>Total</td>
                <td className="tabular-nums" style={{ ...totalCell, textAlign: 'right', fontWeight: 800, fontSize: 11 }}>
                  {formatCurrency(paymentTotal)}
                </td>
                <td style={totalCell} />
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <SectionTitle>Estado de ventas</SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                { label: 'Completadas', count: summary.byStatus.COMPLETED, color: C.verde },
                { label: 'Pendientes', count: summary.byStatus.PENDING, color: C.naranja },
                { label: 'Canceladas', count: summary.byStatus.CANCELLED, color: C.rojo },
              ].map(s => (
                <tr key={s.label}>
                  <td style={{ ...cellBase, color: C.gris }}>{s.label}</td>
                  <td className="tabular-nums" style={{ ...cellBase, textAlign: 'right', fontWeight: 700, color: s.color }}>
                    {s.count}
                  </td>
                  <td className="tabular-nums" style={{ ...cellBase, textAlign: 'right', color: C.gris, width: 42 }}>
                    {spct(s.count)}%
                  </td>
                </tr>
              ))}
              <tr>
                <td style={totalCell}>Total ventas registradas</td>
                <td className="tabular-nums" style={{ ...totalCell, textAlign: 'right', fontWeight: 800, fontSize: 11 }}>
                  {salesTotal}
                </td>
                <td style={totalCell} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Top productos */}
      <div style={{ marginBottom: 24 }}>
        <SectionTitle>Top productos del mes</SectionTitle>
        {summary.topProducts.length === 0 ? (
          <p style={{ fontSize: 10, color: C.gris, fontStyle: 'italic' }}>
            Sin ventas registradas en el período.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thBase, textAlign: 'right', width: 28 }}>#</th>
                <th style={{ ...thBase, textAlign: 'left' }}>Producto</th>
                <th style={{ ...thBase, textAlign: 'right', width: 70 }}>Unidades</th>
                <th style={{ ...thBase, textAlign: 'right', width: 100 }}>Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {summary.topProducts.map((p, i) => (
                <tr key={p.productId} style={{ breakInside: 'avoid' }}>
                  <td className="tabular-nums" style={{ ...cellBase, textAlign: 'right', color: C.gris }}>{i + 1}</td>
                  <td style={{ ...cellBase, color: C.tinta }}>{p.productName}</td>
                  <td className="tabular-nums" style={{ ...cellBase, textAlign: 'right', color: C.gris }}>{p.quantity}</td>
                  <td className="tabular-nums" style={{ ...cellBase, textAlign: 'right', fontWeight: 700, color: C.tinta }}>
                    {formatCurrency(p.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PrintFooter />
    </PrintPage>
  );
}
