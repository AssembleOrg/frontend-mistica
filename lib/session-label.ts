export function defaultSessionLabel(openedAt: string): string {
  const d = new Date(openedAt);
  const tz = 'America/Argentina/Buenos_Aires';
  const weekday = d.toLocaleDateString('es-AR', { weekday: 'long', timeZone: tz });
  const date = d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    timeZone: tz,
  });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date}`;
}
