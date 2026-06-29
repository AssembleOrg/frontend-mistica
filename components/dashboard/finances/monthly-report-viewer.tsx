'use client';

import { type FinanceSummary } from '@/services/finance.service';
import { formatCurrency } from '@/lib/sales-calculations';
import { defaultSessionLabel } from '@/lib/session-label';

const C = {
  verde: '#455a54',
  terracota: '#9d684e',
  ciruela: '#4e4247',
  naranja: '#cc844a',
  durazno: '#e0a38d',
  rosa: '#efcbb9',
  gris: '#d9dadb',
  fondo: '#f8f6f4',
  blanco: '#ffffff',
};

interface Props {
  summary: FinanceSummary;
  monthLabel: string;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: C.verde,
      color: C.blanco,
      padding: '5px 10px',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      marginBottom: 0,
    }}>
      {children}
    </div>
  );
}

export function MonthlyReportViewer({ summary, monthLabel }: Props) {
  const paymentTotal = summary.byPaymentMethod.CASH + summary.byPaymentMethod.CARD + summary.byPaymentMethod.TRANSFER + (summary.byPaymentMethod.MERCADOPAGO ?? 0);
  const pct = (n: number) => paymentTotal > 0 ? Math.round((n / paymentTotal) * 100) : 0;

  const salesTotal = summary.byStatus.COMPLETED + summary.byStatus.PENDING + summary.byStatus.CANCELLED;
  const spct = (n: number) => salesTotal > 0 ? Math.round((n / salesTotal) * 100) : 0;

  const generatedAt = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });

  return (
    <div
      className="receipt-a4"
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: C.blanco,
        color: C.ciruela,
        maxWidth: 794,
        margin: '0 auto',
        padding: '28px 32px 24px',
        position: 'relative',
        minHeight: 1123,
        boxSizing: 'border-box',
      }}
    >
      {/* Watermark */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 0,
          overflow: 'hidden',
        }}
      >
        <span style={{
          fontSize: 140,
          fontWeight: 900,
          color: C.verde,
          opacity: 0.035,
          transform: 'rotate(-28deg)',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          letterSpacing: '0.05em',
        }}>
          MÍSTICA
        </span>
      </div>

      {/* Contenido principal sobre el watermark */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'stretch',
          marginBottom: 18,
          borderRadius: 6,
          overflow: 'hidden',
          border: `1px solid ${C.gris}`,
        }}>
          <div style={{ width: 6, background: C.verde, flexShrink: 0 }} />
          <div style={{
            flex: 1,
            padding: '14px 18px',
            background: C.fondo,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.terracota, letterSpacing: '0.02em', lineHeight: 1 }}>
                MÍSTICA AUTÉNTICA
              </div>
              <div style={{ fontSize: 11, color: C.ciruela, opacity: 0.6, marginTop: 3, letterSpacing: '0.04em' }}>
                Comprobante interno de gestión
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.verde, letterSpacing: '0.01em' }}>
                CIERRE DE MES
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ciruela, marginTop: 2 }}>
                {monthLabel}
              </div>
              <div style={{ fontSize: 9, color: C.ciruela, opacity: 0.5, marginTop: 4 }}>
                Generado: {generatedAt}
              </div>
            </div>
          </div>
        </div>

        {/* KPI Banner */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          border: `1px solid ${C.gris}`,
          borderRadius: 6,
          overflow: 'hidden',
          marginBottom: 16,
        }}>
          {[
            { label: 'BALANCE NETO', value: formatCurrency(summary.netBalance), sub: `${summary.salesCount} ventas`, accent: summary.netBalance >= 0 ? C.verde : C.terracota },
            { label: 'INGRESOS TOTALES', value: formatCurrency(summary.totalRevenue), sub: `${summary.incomes.count > 0 ? `+ ${summary.incomes.count} otros ingresos` : 'ventas + señas'}`, accent: C.verde },
            { label: 'EGRESOS', value: formatCurrency(summary.expenses.total), sub: `${summary.expenses.count} gastos`, accent: C.terracota },
            { label: 'TICKET PROMEDIO', value: formatCurrency(summary.averageTicket), sub: 'por venta', accent: C.verde },
          ].map((kpi, i) => (
            <div
              key={kpi.label}
              style={{
                padding: '12px 14px',
                background: i % 2 === 0 ? C.fondo : C.blanco,
                borderRight: i < 3 ? `1px solid ${C.gris}` : undefined,
              }}
            >
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: C.ciruela, opacity: 0.55, textTransform: 'uppercase', marginBottom: 5 }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: kpi.accent, lineHeight: 1 }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: 9, color: C.ciruela, opacity: 0.5, marginTop: 4 }}>
                {kpi.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Sesiones de caja */}
        <div style={{ marginBottom: 16, border: `1px solid ${C.gris}`, borderRadius: 6, overflow: 'hidden' }}>
          <SectionHeader>Estado de Caja — Sesiones del Período</SectionHeader>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr style={{ background: '#edf0ef' }}>
                {['Sesión', 'Apertura ($)', 'Esperado ($)', 'Contado ($)', 'Diferencia'].map(h => (
                  <th key={h} style={{
                    padding: '6px 10px',
                    textAlign: h === 'Sesión' ? 'left' : 'right',
                    fontWeight: 700,
                    color: C.verde,
                    fontSize: 9,
                    letterSpacing: '0.04em',
                    borderBottom: `1px solid ${C.gris}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.cashSessions.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '12px 10px', color: C.ciruela, opacity: 0.5, fontSize: 10, textAlign: 'center' }}>
                    Sin sesiones de caja registradas en este período
                  </td>
                </tr>
              ) : (
                summary.cashSessions.map((s, i) => {
                  const diff = s.discrepancy;
                  const diffColor = diff === null ? C.ciruela
                    : diff === 0 ? C.verde
                    : diff > 0 ? C.naranja
                    : C.terracota;

                  return (
                    <tr key={s.id} style={{ background: i % 2 === 0 ? C.blanco : '#fafafa' }}>
                      <td style={{ padding: '6px 10px', color: C.ciruela, borderBottom: `1px solid ${C.gris}` }}>
                        {s.label || defaultSessionLabel(s.openedAt)}
                        {s.closureType === 'AUTO' && (
                          <span style={{ fontSize: 8, color: C.naranja, marginLeft: 5, opacity: 0.8 }}>AUTO</span>
                        )}
                        {s.wasEdited && (
                          <span style={{ fontSize: 8, color: C.ciruela, marginLeft: 5, opacity: 0.5 }}>editada</span>
                        )}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: C.ciruela, borderBottom: `1px solid ${C.gris}` }}>
                        {formatCurrency(s.openingCash)}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: C.ciruela, borderBottom: `1px solid ${C.gris}` }}>
                        {s.expectedClosingCash !== null ? formatCurrency(s.expectedClosingCash) : '—'}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: C.ciruela, borderBottom: `1px solid ${C.gris}` }}>
                        {s.countedClosingCash !== null ? formatCurrency(s.countedClosingCash) : '—'}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: diffColor, borderBottom: `1px solid ${C.gris}` }}>
                        {diff === null ? '—'
                          : diff === 0 ? '✓'
                          : `${diff > 0 ? '+' : ''}${formatCurrency(diff)}`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {summary.cashSessions.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: `2px solid ${C.verde}`, background: C.fondo }}>
                  <td colSpan={4} style={{ padding: '7px 10px', fontWeight: 700, fontSize: 10, color: C.verde }}>
                    DIFERENCIA NETA DEL PERÍODO
                  </td>
                  <td style={{
                    padding: '7px 10px',
                    textAlign: 'right',
                    fontWeight: 800,
                    fontSize: 11,
                    color: summary.totalDiscrepancy === 0 ? C.verde : summary.totalDiscrepancy > 0 ? C.naranja : C.terracota,
                  }}>
                    {summary.totalDiscrepancy === 0 ? '✓ Sin diferencias'
                      : `${summary.totalDiscrepancy > 0 ? '+' : ''}${formatCurrency(summary.totalDiscrepancy)}`}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Dos columnas: Métodos de pago + Estado de ventas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>

          {/* Métodos de pago */}
          <div style={{ border: `1px solid ${C.gris}`, borderRadius: 6, overflow: 'hidden' }}>
            <SectionHeader>Métodos de Pago</SectionHeader>
            <div style={{ padding: '10px 12px' }}>
              {[
                { label: 'Efectivo', amount: summary.byPaymentMethod.CASH, p: pct(summary.byPaymentMethod.CASH) },
                { label: 'Tarjeta', amount: summary.byPaymentMethod.CARD, p: pct(summary.byPaymentMethod.CARD) },
                { label: 'Transferencia', amount: summary.byPaymentMethod.TRANSFER, p: pct(summary.byPaymentMethod.TRANSFER) },
                { label: 'MercadoPago', amount: summary.byPaymentMethod.MERCADOPAGO ?? 0, p: pct(summary.byPaymentMethod.MERCADOPAGO ?? 0) },
              ].map(m => (
                <div key={m.label} style={{ marginBottom: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: C.ciruela }}>{m.label}</span>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.verde }}>{formatCurrency(m.amount)}</span>
                      <span style={{ fontSize: 9, color: C.ciruela, opacity: 0.5, minWidth: 28, textAlign: 'right' }}>{m.p}%</span>
                    </span>
                  </div>
                  <div style={{ height: 3, borderRadius: 99, background: C.gris }}>
                    <div style={{ height: 3, borderRadius: 99, width: `${m.p}%`, background: C.terracota }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estado de ventas */}
          <div style={{ border: `1px solid ${C.gris}`, borderRadius: 6, overflow: 'hidden' }}>
            <SectionHeader>Estado de Ventas</SectionHeader>
            <div style={{ padding: '10px 12px' }}>
              {[
                { label: 'Completadas', count: summary.byStatus.COMPLETED, p: spct(summary.byStatus.COMPLETED), color: C.verde },
                { label: 'Pendientes', count: summary.byStatus.PENDING, p: spct(summary.byStatus.PENDING), color: C.naranja },
                { label: 'Canceladas', count: summary.byStatus.CANCELLED, p: spct(summary.byStatus.CANCELLED), color: C.terracota },
              ].map(s => (
                <div key={s.label} style={{ marginBottom: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: C.ciruela }}>{s.label}</span>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: s.color }}>{s.count}</span>
                      <span style={{ fontSize: 9, color: C.ciruela, opacity: 0.5, minWidth: 28, textAlign: 'right' }}>{s.p}%</span>
                    </span>
                  </div>
                  <div style={{ height: 3, borderRadius: 99, background: C.gris }}>
                    <div style={{ height: 3, borderRadius: 99, width: `${s.p}%`, background: s.color }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.gris}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9, color: C.ciruela, opacity: 0.5 }}>Total ventas registradas</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.verde }}>{salesTotal}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Productos */}
        <div style={{ border: `1px solid ${C.gris}`, borderRadius: 6, overflow: 'hidden', marginBottom: 20 }}>
          <SectionHeader>Top Productos del Mes</SectionHeader>
          {summary.topProducts.length === 0 ? (
            <p style={{ padding: '12px 12px', fontSize: 10, color: C.ciruela, opacity: 0.5 }}>
              Sin ventas registradas en el período.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr style={{ background: '#edf0ef' }}>
                  <th style={{ padding: '5px 10px', textAlign: 'left', fontWeight: 700, color: C.verde, fontSize: 9, letterSpacing: '0.04em', borderBottom: `1px solid ${C.gris}`, width: 28 }}>#</th>
                  <th style={{ padding: '5px 10px', textAlign: 'left', fontWeight: 700, color: C.verde, fontSize: 9, letterSpacing: '0.04em', borderBottom: `1px solid ${C.gris}` }}>Producto</th>
                  <th style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 700, color: C.verde, fontSize: 9, letterSpacing: '0.04em', borderBottom: `1px solid ${C.gris}`, width: 60 }}>Unidades</th>
                  <th style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 700, color: C.verde, fontSize: 9, letterSpacing: '0.04em', borderBottom: `1px solid ${C.gris}`, width: 100 }}>Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {summary.topProducts.map((p, i) => (
                  <tr key={p.productId} style={{ background: i % 2 === 0 ? C.blanco : '#fafafa' }}>
                    <td style={{ padding: '5px 10px', borderBottom: `1px solid ${C.gris}` }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: i < 3 ? C.verde : C.gris,
                        color: C.blanco,
                        fontSize: 8,
                        fontWeight: 800,
                      }}>
                        {i + 1}
                      </span>
                    </td>
                    <td style={{ padding: '5px 10px', color: C.ciruela, borderBottom: `1px solid ${C.gris}` }}>{p.productName}</td>
                    <td style={{ padding: '5px 10px', textAlign: 'right', color: C.ciruela, opacity: 0.7, borderBottom: `1px solid ${C.gris}` }}>{p.quantity}</td>
                    <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 700, color: C.verde, borderBottom: `1px solid ${C.gris}` }}>{formatCurrency(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: `1px solid #e5e0d8`,
          paddingTop: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 8, color: C.ciruela, opacity: 0.4 }}>
            Comprobante interno · No válido como factura fiscal
          </span>
          <span style={{ fontSize: 8, color: C.ciruela, opacity: 0.35, letterSpacing: '0.03em' }}>
            Desarrollado por Pistech
          </span>
        </div>
      </div>
    </div>
  );
}
