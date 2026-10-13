/**
 * Fecha `YYYY-MM-DD` según el reloj de quien usa el panel. `toISOString()` la
 * da en UTC: después de las 21:00 de Argentina devuelve el día siguiente.
 */
export function localDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
