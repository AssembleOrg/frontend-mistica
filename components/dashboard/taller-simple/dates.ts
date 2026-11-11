import { AR_TZ } from '@/lib/reservas-format';

/** Hoy en Argentina, YYYY-MM-DD. */
export function todayAR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: AR_TZ });
}

/** `ymd` corrido `n` días. */
export function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const DIAS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

/** "JUE 14" */
export function shortDay(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()}`;
}
