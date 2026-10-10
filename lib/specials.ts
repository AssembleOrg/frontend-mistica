// Ediciones especiales de las experiencias (Halloween, Navidad…): helpers de
// presentación para el panel y la landing. La lógica que decide precios y
// horarios vive en el backend (experiences/specials.ts); acá sólo se muestra.

import type {
  SpecialEdition,
  SpecialStatus,
} from '@/services/reservations.public.service';

const AR_TZ = 'America/Argentina/Buenos_Aires';
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Hoy ('YYYY-MM-DD') en Argentina. */
export function todayYmd(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: AR_TZ });
}

/** Estado de la edición hoy. Una apagada no rige nunca. */
export function specialStatus(
  s: Pick<SpecialEdition, 'dateFrom' | 'dateTo' | 'announceFrom' | 'active'>,
  today: string = todayYmd(),
): SpecialStatus | 'APAGADA' {
  if (s.active === false) return 'APAGADA';
  if (s.dateTo && today > s.dateTo) return 'FINALIZADA';
  if (s.announceFrom && today < s.announceFrom) return 'PROXIMA';
  return 'VIGENTE';
}

export const SPECIAL_STATUS_LABEL: Record<SpecialStatus | 'APAGADA', string> = {
  VIGENTE: 'Vigente',
  PROXIMA: 'Próxima',
  FINALIZADA: 'Finalizada',
  APAGADA: 'Apagada',
};

/** [fondo, texto] del badge de estado. */
export const SPECIAL_STATUS_COLOR: Record<SpecialStatus | 'APAGADA', [string, string]> = {
  VIGENTE: ['#E7F0EC', '#455a54'],
  PROXIMA: ['#F6E9DC', '#9d684e'],
  FINALIZADA: ['#f1ede6', '#7a6e6f'],
  APAGADA: ['#f1ede6', '#7a6e6f'],
};

/** 'YYYY-MM-DD' → 'sábado 31/10'. */
export function fmtSpecialDay(ymd?: string): string {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  const wd = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return `${DIAS[wd]} ${d}/${m}`;
}

/** 'el sábado 31/10' o 'del viernes 30/10 al domingo 1/11'. */
export function specialDatesLabel(s: Pick<SpecialEdition, 'dateFrom' | 'dateTo'>): string {
  if (!s.dateFrom || !s.dateTo) return 'sin fechas';
  return s.dateFrom === s.dateTo
    ? `el ${fmtSpecialDay(s.dateFrom)}`
    : `del ${fmtSpecialDay(s.dateFrom)} al ${fmtSpecialDay(s.dateTo)}`;
}

/** Edición que rige ese día ('YYYY-MM-DD'), si hay. */
export function specialOn(
  specials: SpecialEdition[] | undefined,
  dateKey: string,
): SpecialEdition | undefined {
  return (specials ?? []).find(
    (s) => s.active !== false && s.dateFrom <= dateKey && dateKey <= s.dateTo,
  );
}

/**
 * Misma normalización que el backend y el bot para apodos y activadores:
 * minúsculas, sin acentos, "&" pasa a "y", sólo letras y números.
 */
export function aliasKey(raw: string): string {
  return (raw ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]/g, '');
}

/** Edición nueva, lista para completar. */
export function emptySpecial(): SpecialEdition {
  return {
    name: '',
    aliases: [],
    description: '',
    dateFrom: '',
    dateTo: '',
    announceFrom: '',
    priceVariants: [],
    included: [],
    extras: [],
    schedule: [],
    active: true,
  };
}

/** Qué le falta a una edición para poder guardarse (null = está completa). */
export function specialProblem(s: SpecialEdition): string | null {
  if (!s.name.trim()) return 'Ponele un nombre a la edición';
  if (!s.dateFrom || !s.dateTo) return `Elegí desde y hasta cuándo se hace "${s.name}"`;
  if (s.dateFrom > s.dateTo) return `"${s.name}" termina antes de empezar`;
  if (s.announceFrom && s.announceFrom > s.dateTo)
    return `"${s.name}" se empezaría a ofrecer después de haber terminado`;
  if ((s.schedule ?? []).some((x) => !x.start)) return `Completá la hora de los horarios de "${s.name}"`;
  if ((s.schedule ?? []).some((x) => x.date === '')) return `Elegí la fecha de cada horario puntual de "${s.name}"`;
  if ((s.extras ?? []).some((x) => !x.name.trim())) return `Ponele nombre a cada extra de "${s.name}"`;
  return null;
}
