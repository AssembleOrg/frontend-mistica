'use client';

import { formatCurrency } from '@/lib/sales-calculations';
import { EgressBreakdownPrint } from './egress-breakdown';
import type { EgressBreakdown } from '@/hooks/useEgressBreakdown';

const C = {
  verde: '#455a54',
  terracota: '#9d684e',
  ciruela: '#4e4247',
  gris: '#d9dadb',
  fondo: '#f8f6f4',
  blanco: '#ffffff',
};

interface Props {
  egresses: EgressBreakdown;
  periodLabel: string;
}

/**
 * Reporte imprimible dedicado exclusivamente a los egresos de un período,
 * discriminados por tipo y con el detalle completo. Espejo visual de
 * MonthlyReportViewer, pero sin ventas ni arqueo: el cierre de mes muestra el
 * total agregado, este reporte muestra en qué se gastó.
 */
export function EgressReportViewer({ egresses, periodLabel }: Props) {
  const { rows, items, total, count, error, truncated, totalAvailable } = egresses;

  const average = count > 0 ? total / count : 0;
  const topType = rows.length > 0 ? rows[0] : null;

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
          <div style={{ width: 6, background: C.terracota, flexShrink: 0 }} />
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
                REPORTE DE EGRESOS
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ciruela, marginTop: 2 }}>
                {periodLabel}
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
            {
              label: 'TOTAL EGRESADO',
              value: formatCurrency(total),
              sub: `${count} ${count === 1 ? 'egreso' : 'egresos'}`,
              accent: C.terracota,
            },
            {
              label: 'PROMEDIO',
              value: formatCurrency(average),
              sub: 'por egreso',
              accent: C.verde,
            },
            {
              label: 'MAYOR GASTO',
              value: topType ? formatCurrency(topType.amount) : '—',
              sub: topType ? topType.label : 'sin datos',
              accent: C.terracota,
            },
            {
              label: 'TIPOS',
              value: String(rows.length),
              sub: rows.length === 1 ? 'categoría usada' : 'categorías usadas',
              accent: C.verde,
            },
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

        {/* Desglose por tipo + detalle */}
        <EgressBreakdownPrint
          rows={rows}
          items={items}
          total={total}
          count={count}
          error={error}
          truncated={truncated}
          totalAvailable={totalAvailable}
        />

        {/* Footer */}
        <div style={{
          borderTop: '1px solid #e5e0d8',
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
