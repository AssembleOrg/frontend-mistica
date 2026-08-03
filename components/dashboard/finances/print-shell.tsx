'use client';

import Image from 'next/image';

export const C = {
  terracota: '#9d684e',
  verde: '#455a54',
  rojo: '#9d2f2f',
  naranja: '#b5701f',
  tinta: '#1f1b1a',
  gris: '#6b6360',
  linea: '#d9d5d1',
  lineaSuave: '#ece9e5',
};

export const COMPANY = {
  name: 'Mística Auténtica',
  address: 'Videla 57',
  phone: '011-7988-3333',
  email: 'contacto@mistica.com',
};

export const cellBase: React.CSSProperties = {
  padding: '5px 8px',
  borderBottom: `1px solid ${C.lineaSuave}`,
  fontSize: 10,
};

export const thBase: React.CSSProperties = {
  padding: '5px 8px',
  borderBottom: `1px solid ${C.linea}`,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.04em',
  color: C.gris,
  textTransform: 'uppercase',
};

/** Fila de cierre de una tabla: separador fuerte, sin borde inferior. */
export const totalCell: React.CSSProperties = {
  padding: '7px 8px',
  borderTop: `1px solid ${C.linea}`,
  fontSize: 10,
  fontWeight: 700,
  color: C.tinta,
};

export function SectionTitle({ children }: { children: React.ReactNode }) {
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

export function PrintHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const generatedAt = new Date().toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });

  return (
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
          {title}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.tinta, marginTop: 3 }}>
          {subtitle}
        </div>
        <div style={{ fontSize: 9, color: C.gris, marginTop: 5 }}>
          Generado: {generatedAt}
        </div>
      </div>
    </div>
  );
}

export interface Kpi {
  label: string;
  value: string;
  sub: string;
  color?: string;
}

export function KpiBand({ items }: { items: Kpi[] }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${items.length}, 1fr)`,
      border: `1px solid ${C.linea}`,
      marginBottom: 20,
    }}>
      {items.map((kpi, i) => (
        <div
          key={kpi.label}
          style={{
            padding: '11px 12px',
            borderRight: i < items.length - 1 ? `1px solid ${C.linea}` : undefined,
          }}
        >
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', color: C.gris, textTransform: 'uppercase', marginBottom: 5 }}>
            {kpi.label}
          </div>
          <div className="tabular-nums" style={{ fontSize: 16, fontWeight: 800, color: kpi.color ?? C.tinta, lineHeight: 1.1 }}>
            {kpi.value}
          </div>
          <div style={{ fontSize: 9, color: C.gris, marginTop: 4 }}>
            {kpi.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PrintFooter() {
  return (
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
  );
}

/** Hoja A4 con la marca de agua detrás del contenido. */
export function PrintPage({ children }: { children: React.ReactNode }) {
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
        position: 'relative',
        boxSizing: 'border-box',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
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
        {children}
      </div>
    </div>
  );
}
