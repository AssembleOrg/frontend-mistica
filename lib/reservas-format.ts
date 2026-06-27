// Helpers de formato compartidos por las vistas de reservas (admin y público).

export function fmtPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const time = d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${date} · ${time}`;
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
