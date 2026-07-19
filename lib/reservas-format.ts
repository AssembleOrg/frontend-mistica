// Helpers de formato compartidos por las vistas de reservas (admin y público).

// Zona horaria del negocio. Fijamos timeZone en cada formateo de fecha para no
// depender de la zona del navegador (un admin en otra TZ vería fechas corridas).
export const AR_TZ = 'America/Argentina/Buenos_Aires';

export function fmtPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

// Fecha + hora: "mié 24/12/2026 · 18:00" (la fecha siempre DD/MM/YYYY).
export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: AR_TZ,
  });
  const time = d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: AR_TZ,
  });
  return `${date} · ${time}`;
}

// Solo fecha: "24/12/2026".
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: AR_TZ,
  });
}

// 'YYYY-MM-DD' (string plano, sin hora) -> 'DD/MM/YYYY'. Se hace por string,
// SIN new Date(), para no correr el día por interpretación UTC.
export function fmtYmd(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ymd;
}

export function prettyCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

export const SESSION_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  OPEN: 'Abierto',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
};

export const RESERVATION_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  EXPIRED: 'Vencida',
  CANCELLED: 'Cancelada',
  NEEDS_REVIEW: 'Revisión',
};

// [bg, text] por estado, en hex de la paleta.
export const RESERVATION_STATUS_COLOR: Record<string, [string, string]> = {
  CONFIRMED: ['#E7F0EC', '#455a54'],
  PENDING: ['#F6E9DC', '#cc844a'],
  CANCELLED: ['#f1ede6', '#7a6e6f'],
  EXPIRED: ['#f1ede6', '#7a6e6f'],
  NEEDS_REVIEW: ['#F6E0DA', '#b23b2e'],
};

// ─────────────────────── rangos de día en hora AR ───────────────────────
// Para mandarle rangos [from, to] al backend representando un DÍA de Argentina
// como instante UTC exacto, SIN hardcodear el offset -03:00: se deriva de la
// zona IANA AR_TZ (mismo mecanismo que el resto de la app). Argentina es GMT-3
// fijo, pero derivarlo de la zona evita magic numbers y no corre la hora.

// Minutos que la zona `tz` adelanta a UTC en el instante `at`.
function zoneOffsetMinutes(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const m: Record<string, string> = {};
  for (const p of parts) m[p.type] = p.value;
  const asUTC = Date.UTC(
    +m.year,
    +m.month - 1,
    +m.day,
    +m.hour,
    +m.minute,
    +m.second,
  );
  return (asUTC - at.getTime()) / 60000;
}

// Hora de pared de Argentina ('YYYY-MM-DD' + 'HH:mm:ss') -> instante UTC (ISO).
// El offset se calcula sobre el instante SIN milisegundos (formatToParts los
// descarta), y los ms se suman aparte, para no contaminar el offset.
function arWallToISO(ymd: string, time: string, ms = 0): string {
  const [Y, M, D] = ymd.split('-').map(Number);
  const [h, mi, s] = time.split(':').map(Number);
  const base = Date.UTC(Y, M - 1, D, h, mi, s || 0);
  const off = zoneOffsetMinutes(AR_TZ, new Date(base));
  return new Date(base + ms - off * 60000).toISOString();
}

/** Inicio del día AR (00:00:00.000) como instante UTC ISO. */
export function arDayStartISO(ymd: string): string {
  return arWallToISO(ymd, '00:00:00', 0);
}

/** Fin del día AR (23:59:59.999) como instante UTC ISO. */
export function arDayEndISO(ymd: string): string {
  return arWallToISO(ymd, '23:59:59', 999);
}
