'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/sales-calculations';
import { egressTypeLabel } from '@/lib/egress-type-labels';
import type { EgressBreakdown } from '@/hooks/useEgressBreakdown';

/** Paleta del PDF — espejo de la de monthly-report-viewer. */
const C = {
  verde: '#455a54',
  terracota: '#9d684e',
  ciruela: '#4e4247',
  gris: '#d9dadb',
  fondo: '#f8f6f4',
  blanco: '#ffffff',
};

/**
 * El backend clasifica como "Gasto operativo" todo egreso creado desde la caja
 * (ignora el tipo enviado). Sin esta aclaración el desglose parecería decir que
 * el 100% del gasto es operativo, cuando en realidad el dato no se capturó.
 */
const CLASSIFICATION_NOTE =
  'Los egresos registrados desde la caja se clasifican como Gasto operativo. Para reclasificar uno, editalo desde el detalle de la sesión.';

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  CHECK: 'Cheque',
  OTHER: 'Otro',
};

function methodLabel(m: string): string {
  return METHOD_LABELS[m] ?? m;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

/** Datos ya calculados. Los componentes no llaman al hook: lo hace quien los usa. */
type Data = Pick<
  EgressBreakdown,
  'rows' | 'items' | 'total' | 'count' | 'loading' | 'error' | 'truncated' | 'totalAvailable'
>;

/* ------------------------------------------------------------------ */
/* Versión web — /dashboard/finances                                   */
/* ------------------------------------------------------------------ */

export function EgressBreakdownCard({
  rows,
  items,
  total,
  count,
  loading,
  error,
  truncated,
  totalAvailable,
}: Data) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <Card style={{ borderColor: 'var(--color-gris-claro)' }}>
      <CardContent className="p-5">
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-base font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
            Egresos por tipo
          </p>
          <span
            className="text-sm font-bold font-tan-nimbus"
            style={{ color: 'var(--color-terracota)' }}
          >
            {formatCurrency(total)}
          </span>
        </div>

        {loading && (
          <div className="space-y-3 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-6 rounded" style={{ background: 'var(--color-gris-claro)' }} />
            ))}
          </div>
        )}

        {!loading && error && (
          <p
            className="text-sm font-winter-solid flex items-center gap-2"
            style={{ color: 'var(--color-terracota)' }}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        {!loading && !error && rows.length === 0 && (
          <p
            className="text-sm font-winter-solid"
            style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}
          >
            Sin egresos registrados en el período.
          </p>
        )}

        {!loading && !error && rows.length > 0 && (
          <>
            {truncated && (
              <p
                className="text-xs font-winter-solid mb-3 flex items-center gap-1.5"
                style={{ color: 'var(--color-naranja-medio)' }}
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Mostrando los primeros {count} de {totalAvailable} egresos del período.
              </p>
            )}

            <div className="space-y-4">
              {rows.map((r) => (
                <div key={r.type}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-sm font-medium font-winter-solid"
                      style={{ color: 'var(--color-ciruela-oscuro)' }}
                    >
                      {r.label}
                      <span className="ml-2 text-xs" style={{ opacity: 0.6 }}>
                        {r.count} {r.count === 1 ? 'egreso' : 'egresos'}
                      </span>
                    </span>
                    <div className="flex items-center gap-3">
                      <span
                        className="text-sm font-bold font-tan-nimbus"
                        style={{ color: 'var(--color-terracota)' }}
                      >
                        {formatCurrency(r.amount)}
                      </span>
                      <span
                        className="text-xs w-8 text-right font-winter-solid"
                        style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}
                      >
                        {Math.round(r.pct)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: 'var(--color-gris-claro)' }}>
                    <div
                      className="h-1 rounded-full transition-all"
                      style={{ width: `${r.pct}%`, background: 'var(--color-terracota)' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p
              className="mt-4 text-xs font-winter-solid leading-relaxed"
              style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.55 }}
            >
              {CLASSIFICATION_NOTE}
            </p>

            <button
              type="button"
              onClick={() => setShowDetail((v) => !v)}
              className="mt-3 flex items-center gap-1.5 text-sm font-winter-solid"
              style={{ color: 'var(--color-verde-profundo)' }}
            >
              {showDetail ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {showDetail ? 'Ocultar detalle' : `Ver detalle (${count})`}
            </button>

            {showDetail && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ color: 'var(--color-verde-profundo)' }}>
                      {['Fecha', 'Concepto', 'Tipo', 'Método', 'Monto'].map((h) => (
                        <th
                          key={h}
                          className="text-xs font-winter-solid font-semibold py-2 px-2 whitespace-nowrap"
                          style={{
                            textAlign: h === 'Monto' ? 'right' : 'left',
                            borderBottom: '1px solid var(--color-gris-claro)',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((e) => (
                      <tr key={e._id} style={{ color: 'var(--color-ciruela-oscuro)' }}>
                        <td
                          className="py-2 px-2 whitespace-nowrap font-winter-solid"
                          style={{ borderBottom: '1px solid var(--color-gris-claro)', opacity: 0.7 }}
                        >
                          {formatDate(e.createdAt)}
                        </td>
                        <td
                          className="py-2 px-2 font-winter-solid"
                          style={{ borderBottom: '1px solid var(--color-gris-claro)' }}
                        >
                          {e.concept}
                        </td>
                        <td
                          className="py-2 px-2 whitespace-nowrap font-winter-solid"
                          style={{ borderBottom: '1px solid var(--color-gris-claro)', opacity: 0.7 }}
                        >
                          {egressTypeLabel(e.type)}
                        </td>
                        <td
                          className="py-2 px-2 whitespace-nowrap font-winter-solid"
                          style={{ borderBottom: '1px solid var(--color-gris-claro)', opacity: 0.7 }}
                        >
                          {methodLabel(e.paymentMethod)}
                        </td>
                        <td
                          className="py-2 px-2 whitespace-nowrap text-right font-semibold font-tan-nimbus"
                          style={{
                            borderBottom: '1px solid var(--color-gris-claro)',
                            color: 'var(--color-terracota)',
                          }}
                        >
                          {formatCurrency(e.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Versión impresa — /monthly-report                                   */
/* ------------------------------------------------------------------ */

function PrintSectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: C.verde,
        color: C.blanco,
        padding: '5px 10px',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  );
}

const printCell: React.CSSProperties = {
  padding: '5px 10px',
  borderBottom: `1px solid ${C.gris}`,
  color: C.ciruela,
};

const printHead: React.CSSProperties = {
  padding: '5px 10px',
  fontWeight: 700,
  color: C.verde,
  fontSize: 9,
  letterSpacing: '0.04em',
  borderBottom: `1px solid ${C.gris}`,
};

export function EgressBreakdownPrint({
  rows,
  items,
  total,
  count,
  error,
  truncated,
  totalAvailable,
}: Omit<Data, 'loading'>) {
  if (error) {
    return (
      <div style={{ border: `1px solid ${C.gris}`, borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
        <PrintSectionHeader>Egresos del Período</PrintSectionHeader>
        <p style={{ padding: '12px 12px', fontSize: 10, color: C.terracota }}>
          No se pudo cargar el desglose de egresos.
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ border: `1px solid ${C.gris}`, borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
        <PrintSectionHeader>Egresos del Período</PrintSectionHeader>
        <p style={{ padding: '12px 12px', fontSize: 10, color: C.ciruela, opacity: 0.5 }}>
          Sin egresos registrados en el período.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desglose por tipo */}
      <div style={{ border: `1px solid ${C.gris}`, borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
        <PrintSectionHeader>Egresos por Tipo</PrintSectionHeader>
        <div style={{ padding: '10px 12px' }}>
          {rows.map((r) => (
            <div key={r.type} style={{ marginBottom: 9, breakInside: 'avoid' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: C.ciruela }}>
                  {r.label}
                  <span style={{ opacity: 0.5, marginLeft: 6 }}>
                    ({r.count} {r.count === 1 ? 'egreso' : 'egresos'})
                  </span>
                </span>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.terracota }}>
                    {formatCurrency(r.amount)}
                  </span>
                  <span style={{ fontSize: 9, color: C.ciruela, opacity: 0.5, minWidth: 28, textAlign: 'right' }}>
                    {Math.round(r.pct)}%
                  </span>
                </span>
              </div>
              <div style={{ height: 3, borderRadius: 99, background: C.gris }}>
                <div style={{ height: 3, borderRadius: 99, width: `${r.pct}%`, background: C.terracota }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.gris}`, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 9, color: C.ciruela, opacity: 0.5 }}>
              Total egresos del período ({count})
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.terracota }}>
              {formatCurrency(total)}
            </span>
          </div>
          <p style={{ fontSize: 8, color: C.ciruela, opacity: 0.5, marginTop: 8, lineHeight: 1.5 }}>
            {CLASSIFICATION_NOTE}
          </p>
        </div>
      </div>

      {/* Detalle */}
      <div style={{ border: `1px solid ${C.gris}`, borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
        <PrintSectionHeader>Detalle de Egresos</PrintSectionHeader>
        {truncated && (
          <p style={{ padding: '6px 10px', fontSize: 9, color: C.terracota, background: C.fondo }}>
            Mostrando los primeros {count} de {totalAvailable} egresos del período.
          </p>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr style={{ background: '#edf0ef' }}>
              <th style={{ ...printHead, textAlign: 'left', width: 60 }}>Fecha</th>
              <th style={{ ...printHead, textAlign: 'left' }}>Concepto</th>
              <th style={{ ...printHead, textAlign: 'left', width: 95 }}>Tipo</th>
              <th style={{ ...printHead, textAlign: 'left', width: 80 }}>Método</th>
              <th style={{ ...printHead, textAlign: 'right', width: 90 }}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e, i) => (
              <tr key={e._id} style={{ background: i % 2 === 0 ? C.blanco : '#fafafa', breakInside: 'avoid' }}>
                <td style={{ ...printCell, opacity: 0.7 }}>{formatDate(e.createdAt)}</td>
                <td style={printCell}>{e.concept}</td>
                <td style={{ ...printCell, opacity: 0.7 }}>{egressTypeLabel(e.type)}</td>
                <td style={{ ...printCell, opacity: 0.7 }}>{methodLabel(e.paymentMethod)}</td>
                <td style={{ ...printCell, textAlign: 'right', fontWeight: 700, color: C.terracota }}>
                  {formatCurrency(e.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
