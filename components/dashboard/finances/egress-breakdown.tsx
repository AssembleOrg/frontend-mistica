'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ManageEgressCategoriesDialog } from './manage-egress-categories-dialog';
import { formatCurrency } from '@/lib/sales-calculations';
import { egressTypeLabel } from '@/lib/egress-type-labels';
import { C, SectionTitle, cellBase, thBase, totalCell } from './print-shell';
import type { EgressBreakdown } from '@/hooks/useEgressBreakdown';

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
  const [showCategories, setShowCategories] = useState(false);

  return (
    <Card style={{ borderColor: 'var(--color-gris-claro)' }}>
      <CardContent className="p-5">
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-base font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
            Egresos por tipo
          </p>
          <span className="flex items-center gap-2">
            <button
              type="button"
              title="Gestionar categorías de egreso"
              onClick={() => setShowCategories(true)}
              className="text-[11px] font-winter-solid underline-offset-2 hover:underline"
              style={{ color: 'var(--color-verde-profundo)' }}
            >
              Categorías
            </button>
            <span
              className="text-sm font-bold font-tan-nimbus"
              style={{ color: 'var(--color-terracota)' }}
            >
              {formatCurrency(total)}
            </span>
          </span>
        </div>
        <ManageEgressCategoriesDialog
          open={showCategories}
          onOpenChange={setShowCategories}
        />

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
      <div style={{ marginBottom: 20 }}>
        <SectionTitle>Egresos del período</SectionTitle>
        <p style={{ fontSize: 10, color: C.rojo }}>
          No se pudo cargar el desglose de egresos.
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ marginBottom: 20 }}>
        <SectionTitle>Egresos del período</SectionTitle>
        <p style={{ fontSize: 10, color: C.gris, fontStyle: 'italic' }}>
          Sin egresos registrados en el período.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desglose por tipo */}
      <div style={{ marginBottom: 20 }}>
        <SectionTitle>Egresos por tipo</SectionTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thBase, textAlign: 'left' }}>Tipo</th>
              <th style={{ ...thBase, textAlign: 'right', width: 70 }}>Egresos</th>
              <th style={{ ...thBase, textAlign: 'right', width: 110 }}>Monto</th>
              <th style={{ ...thBase, textAlign: 'right', width: 42 }}>%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.type} style={{ breakInside: 'avoid' }}>
                <td style={{ ...cellBase, color: C.tinta }}>{r.label}</td>
                <td className="tabular-nums" style={{ ...cellBase, textAlign: 'right', color: C.gris }}>
                  {r.count}
                </td>
                <td className="tabular-nums" style={{ ...cellBase, textAlign: 'right', fontWeight: 700, color: C.terracota }}>
                  {formatCurrency(r.amount)}
                </td>
                <td className="tabular-nums" style={{ ...cellBase, textAlign: 'right', color: C.gris }}>
                  {Math.round(r.pct)}%
                </td>
              </tr>
            ))}
            <tr>
              <td style={totalCell}>Total egresos del período</td>
              <td className="tabular-nums" style={{ ...totalCell, textAlign: 'right' }}>{count}</td>
              <td className="tabular-nums" style={{ ...totalCell, textAlign: 'right', fontWeight: 800, fontSize: 11, color: C.terracota }}>
                {formatCurrency(total)}
              </td>
              <td style={totalCell} />
            </tr>
          </tbody>
        </table>
        <p style={{ fontSize: 8, color: C.gris, marginTop: 8, lineHeight: 1.5 }}>
          {CLASSIFICATION_NOTE}
        </p>
      </div>

      {/* Detalle */}
      <div style={{ marginBottom: 24 }}>
        <SectionTitle>Detalle de egresos</SectionTitle>
        {truncated && (
          <p style={{ fontSize: 9, color: C.naranja, marginBottom: 6 }}>
            Mostrando los primeros {count} de {totalAvailable} egresos del período.
          </p>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thBase, textAlign: 'left', width: 60 }}>Fecha</th>
              <th style={{ ...thBase, textAlign: 'left' }}>Concepto</th>
              <th style={{ ...thBase, textAlign: 'left', width: 95 }}>Tipo</th>
              <th style={{ ...thBase, textAlign: 'left', width: 80 }}>Método</th>
              <th style={{ ...thBase, textAlign: 'right', width: 90 }}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e._id} style={{ breakInside: 'avoid' }}>
                <td className="tabular-nums" style={{ ...cellBase, color: C.gris }}>{formatDate(e.createdAt)}</td>
                <td style={{ ...cellBase, color: C.tinta }}>{e.concept}</td>
                <td style={{ ...cellBase, color: C.gris }}>{egressTypeLabel(e.type)}</td>
                <td style={{ ...cellBase, color: C.gris }}>{methodLabel(e.paymentMethod)}</td>
                <td className="tabular-nums" style={{ ...cellBase, textAlign: 'right', fontWeight: 700, color: C.terracota }}>
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
