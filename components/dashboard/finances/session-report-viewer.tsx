'use client';

import Image from 'next/image';
import { formatCurrency } from '@/lib/sales-calculations';
import { defaultSessionLabel } from '@/lib/session-label';
import { computeSessionKpis } from '@/lib/session-kpis';
import type { CashSession, SessionTransaction } from '@/services/cashbox.service';

// Paleta sobria de impresión: el texto va en tinta (negro/gris). El color de
// marca (terracota/verde) sólo aparece donde comunica: logo, montos y la
// diferencia de arqueo.
const C = {
  terracota: '#9d684e',
  verde: '#455a54',
  rojo: '#9d2f2f',
  naranja: '#b5701f',
  tinta: '#1f1b1a',
  gris: '#6b6360',
  linea: '#d9d5d1',
  lineaSuave: '#ece9e5',
};

const COMPANY = {
  name: 'Mística Auténtica',
  address: 'Videla 57',
  phone: '011-7988-3333',
  email: 'contacto@mistica.com',
};

interface Props {
  session: CashSession;
  transactions: SessionTransaction[];
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: C.tinta,
      borderBottom: `1px solid ${C.linea}`,
      paddingBottom: 4,
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

export function SessionReportViewer({ session, transactions }: Props) {
  const kpis = computeSessionKpis(transactions);
  const label = session.label?.trim() || defaultSessionLabel(session.openedAt);

  const fmtDateTime = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleString('es-AR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
          timeZone: 'America/Argentina/Buenos_Aires',
        })
      : '—';

  const generatedAt = new Date().toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });

  const opening = session.openingCash;
  const expected = session.expectedClosingCash ?? null;
  const counted = session.countedClosingCash ?? null;
  const discrepancy = session.discrepancy ?? null;

  const diffColor =
    discrepancy === null || discrepancy === 0 ? C.verde
    : discrepancy > 0 ? C.naranja
    : C.rojo;
  const diffLabel =
    discrepancy === null ? 'Diferencia'
    : discrepancy > 0 ? 'Sobrante'
    : discrepancy < 0 ? 'Faltante'
    : 'Diferencia';

  const payTotal = kpis.byMethod.CASH + kpis.byMethod.CARD + kpis.byMethod.TRANSFER;
  const pct = (n: number) => (payTotal > 0 ? Math.round((n / payTotal) * 100) : 0);

  const cellBase: React.CSSProperties = {
    padding: '5px 8px',
    borderBottom: `1px solid ${C.lineaSuave}`,
    fontSize: 10,
  };
  const thBase: React.CSSProperties = {
    padding: '5px 8px',
    borderBottom: `1px solid ${C.linea}`,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.04em',
    color: C.gris,
    textTransform: 'uppercase',
  };

  return (
    <div
      className="receipt-a4"
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: '#ffffff',
        color: C.tinta,
        maxWidth: 794,
        margin: '0 auto',
        padding: '32px 36px 28px',
        boxSizing: 'border-box',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* Header: logo real + datos de empresa, bloque de documento a la derecha.
          Borde inferior terracota. Sin franja lateral ni watermark. */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 24,
        borderBottom: `2px solid ${C.terracota}`,
        paddingBottom: 16,
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <Image
            src="/Logo-mistica.png"
            alt="Mística Auténtica"
            width={132}
            height={70}
            style={{ objectFit: 'contain', height: 'auto' }}
            priority
          />
          <div style={{ fontSize: 9, color: C.gris, lineHeight: 1.5, paddingTop: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.tinta }}>{COMPANY.name}</div>
            <div>{COMPANY.address}</div>
            <div>{COMPANY.phone}</div>
            <div>{COMPANY.email}</div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.02em', color: C.tinta }}>
            BALANCE DE SESIÓN
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.tinta, marginTop: 3 }}>
            {label}
          </div>
          <div style={{ fontSize: 9, color: C.gris, marginTop: 5 }}>
            {fmtDateTime(session.openedAt)} → {session.closedAt ? fmtDateTime(session.closedAt) : 'Abierta'}
          </div>
          <div style={{ fontSize: 9, color: C.gris, marginTop: 2 }}>
            Generado: {generatedAt}
          </div>
        </div>
      </div>

      {/* Arqueo de caja — banda de datos en tinta neutra; sólo la diferencia con color */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr',
        border: `1px solid ${C.linea}`,
        marginBottom: 20,
      }}>
        {[
          { label: 'Apertura', value: formatCurrency(opening), color: C.tinta },
          { label: 'Esperado al cierre', value: expected !== null ? formatCurrency(expected) : '—', color: C.tinta },
          { label: 'Contado al cierre', value: counted !== null ? formatCurrency(counted) : '—', color: C.tinta },
          {
            label: diffLabel,
            value: discrepancy === null ? '—' : discrepancy === 0 ? 'Sin diferencia' : formatCurrency(Math.abs(discrepancy)),
            color: diffColor,
          },
        ].map((kpi, i) => (
          <div
            key={kpi.label}
            style={{
              padding: '11px 12px',
              borderRight: i < 3 ? `1px solid ${C.linea}` : undefined,
            }}
          >
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', color: C.gris, textTransform: 'uppercase', marginBottom: 5 }}>
              {kpi.label}
            </div>
            <div className="tabular-nums" style={{ fontSize: 15, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Dos columnas: resumen de la sesión + cobrado por método (tablas, sin barras) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 20 }}>

        {/* Resumen de la sesión */}
        <div>
          <SectionTitle>Resumen de la sesión</SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                { label: 'Ventas', count: kpis.salesCount, total: kpis.salesTotal, color: C.tinta },
                { label: 'Ingresos', count: kpis.incomeCount, total: kpis.incomeTotal, color: C.tinta },
                { label: 'Egresos', count: kpis.egressCount, total: kpis.egressTotal, color: C.rojo },
              ].map(r => (
                <tr key={r.label}>
                  <td style={{ ...cellBase, color: C.gris }}>
                    {r.label} <span style={{ color: C.linea }}>·</span> {r.count}
                  </td>
                  <td className="tabular-nums" style={{ ...cellBase, textAlign: 'right', fontWeight: 700, color: r.color }}>
                    {formatCurrency(r.total)}
                  </td>
                </tr>
              ))}
              <tr>
                <td style={{ padding: '7px 8px', fontWeight: 700, color: C.tinta, fontSize: 10 }}>
                  Neto efectivo
                </td>
                <td className="tabular-nums" style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 800, fontSize: 11, color: kpis.netBalance >= 0 ? C.verde : C.rojo }}>
                  {formatCurrency(kpis.netBalance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cobrado por método — tabla, sin barras */}
        <div>
          <SectionTitle>Cobrado por método</SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                { label: 'Efectivo', amount: kpis.byMethod.CASH },
                { label: 'Tarjeta', amount: kpis.byMethod.CARD },
                { label: 'Transferencia', amount: kpis.byMethod.TRANSFER },
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
                <td style={{ padding: '7px 8px', fontWeight: 700, color: C.tinta, fontSize: 10 }}>Total</td>
                <td className="tabular-nums" style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 800, fontSize: 11, color: C.tinta }}>
                  {formatCurrency(payTotal)}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Movimientos */}
      <div style={{ marginBottom: 24 }}>
        <SectionTitle>Movimientos de la sesión</SectionTitle>
        {transactions.length === 0 ? (
          <p style={{ fontSize: 10, color: C.gris, fontStyle: 'italic' }}>
            Sin movimientos registrados en esta sesión.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thBase, textAlign: 'left', width: 46 }}>Hora</th>
                <th style={{ ...thBase, textAlign: 'left', width: 74 }}>Tipo</th>
                <th style={{ ...thBase, textAlign: 'left' }}>Detalle</th>
                <th style={{ ...thBase, textAlign: 'left', width: 84 }}>Método</th>
                <th style={{ ...thBase, textAlign: 'right', width: 92 }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => {
                const isIncome = t.type === 'ingreso';
                const hora = new Date(t.createdAt).toLocaleTimeString('es-AR', {
                  hour: '2-digit', minute: '2-digit',
                  timeZone: 'America/Argentina/Buenos_Aires',
                });
                return (
                  <tr key={t.id} style={{ breakInside: 'avoid' }}>
                    <td className="tabular-nums" style={{ ...cellBase, color: C.gris }}>{hora}</td>
                    <td style={{ ...cellBase, color: C.tinta }}>
                      {isIncome ? 'Ingreso' : 'Egreso'}{t.isSena ? ' · Seña' : ''}
                    </td>
                    <td style={{ ...cellBase, color: C.tinta }}>{t.description}</td>
                    <td style={{ ...cellBase, color: C.gris }}>{t.paymentMethod}</td>
                    <td className="tabular-nums" style={{ ...cellBase, textAlign: 'right', fontWeight: 700, color: isIncome ? C.verde : C.rojo }}>
                      {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: `1px solid ${C.linea}`,
        paddingTop: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 8, color: C.gris }}>
          Comprobante interno · No válido como factura fiscal
        </span>
        <span style={{ fontSize: 8, color: C.gris, letterSpacing: '0.03em' }}>
          Desarrollado por Pistech
        </span>
      </div>
    </div>
  );
}
