/**
 * Traducción de errores del backend a mensajes para el usuario.
 *
 * El backend (NestJS + class-validator) responde en inglés y con jerga técnica
 * ("category must be a string"). Ese texto nunca debe llegar a pantalla: acá lo
 * mapeamos a español y, si no reconocemos el error, devolvemos un genérico
 * según el status. El mensaje original se sigue logueando para debug.
 */

interface ErrorPattern {
  /** Se evalúa contra el mensaje del backend en minúsculas. */
  match: RegExp;
  message: string;
}

// El orden importa: el primer patrón que matchea gana, así que los específicos
// van antes que los genéricos de class-validator.
const PATTERNS: ErrorPattern[] = [
  { match: /category must be a string|category should not be empty/, message: 'Elegí una categoría para el producto.' },
  { match: /barcode.*already exists|duplicate.*barcode|e11000.*barcode/, message: 'Ya existe un producto con ese código de barras.' },
  { match: /barcode should not be empty|barcode must be a string/, message: 'El código de barras es obligatorio.' },
  { match: /name should not be empty|name must be a string/, message: 'El nombre del producto es obligatorio.' },
  { match: /price must be a (number|positive)|price should not be empty/, message: 'Ingresá un precio válido.' },
  { match: /stock must be a (number|positive)/, message: 'Ingresá una cantidad de stock válida.' },
  { match: /duplicate key|e11000/, message: 'Ya existe un registro con esos datos.' },
  { match: /unauthorized|invalid credentials/, message: 'Tu sesión expiró. Iniciá sesión de nuevo.' },
  { match: /forbidden/, message: 'No tenés permisos para hacer esta acción.' },
  { match: /not found/, message: 'No se encontró el registro solicitado.' },
  // Genéricos de class-validator: cualquier "X must be a Y" / "X should not be
  // empty" que no hayamos mapeado arriba.
  { match: /must be a|should not be empty|must not be less than|is not a valid/, message: 'Revisá los datos del formulario: hay un campo incompleto o inválido.' },
];

const STATUS_FALLBACKS: Record<number, string> = {
  0: 'No pudimos conectarnos al servidor. Revisá tu conexión.',
  400: 'Revisá los datos del formulario.',
  401: 'Tu sesión expiró. Iniciá sesión de nuevo.',
  403: 'No tenés permisos para hacer esta acción.',
  404: 'No se encontró el registro solicitado.',
  408: 'La operación tardó demasiado. Intentá de nuevo.',
  409: 'Ya existe un registro con esos datos.',
  429: 'Demasiadas solicitudes seguidas. Esperá un momento.',
  500: 'Error del servidor. Intentá de nuevo en unos minutos.',
};

/**
 * Convierte el `message` de un ApiError en texto en español apto para el
 * usuario. `fallback` se usa cuando no hay patrón ni status conocido.
 */
export function translateApiError(
  message: unknown,
  status?: number,
  fallback = 'Ocurrió un error inesperado. Intentá de nuevo.',
): string {
  // NestJS manda un array de strings cuando falla la validación.
  const raw = Array.isArray(message) ? message.join('. ') : String(message ?? '');

  if (raw.trim()) {
    const normalized = raw.toLowerCase();
    const hit = PATTERNS.find((p) => p.match.test(normalized));
    if (hit) return hit.message;
  }

  if (status !== undefined && STATUS_FALLBACKS[status]) {
    return STATUS_FALLBACKS[status];
  }

  return fallback;
}

// Mensajes de class-validator: en inglés y con el nombre técnico del campo
// ("priceVariants.0.name should not be empty").
const VALIDATOR_RE =
  /\b(must be|should not be|must match|must not be|must contain|is not a valid|should not exist|must be (longer|shorter))\b/i;
// Textos por defecto de NestJS / del cliente HTTP: no dicen nada a la persona.
const GENERIC_RE =
  /^(bad request|unauthorized|forbidden( resource)?|not found|internal server error|http error|request (timeout|blocked)|network error)/i;

/**
 * Texto para mostrar de un error atrapado en un `catch`.
 *
 * Los errores del apiService son objetos `{ message, status }`, NO instancias
 * de Error: con `e instanceof Error ? e.message : fallback` el motivo que manda
 * el backend ("El apodo ya lo usa…") nunca llegaba a pantalla.
 *
 * - 4xx con un mensaje del backend escrito para la persona → ese mensaje.
 * - Mensaje técnico de validación → aviso en español; con `labels` (campo del
 *   backend → cómo se llama en el formulario) dice además en qué parte está.
 * - Sin conexión, timeout o 5xx → texto genérico según el status, o `fallback`.
 */
export function errorText(
  e: unknown,
  fallback: string,
  labels: Record<string, string> = {},
): string {
  const obj = (typeof e === 'object' && e !== null ? e : {}) as {
    message?: unknown;
    status?: unknown;
  };
  const raw = (
    Array.isArray(obj.message)
      ? obj.message.join('. ')
      : typeof obj.message === 'string'
        ? obj.message
        : ''
  ).trim();
  const status = typeof obj.status === 'number' ? obj.status : undefined;

  // Errores propios del front (`throw new Error('…')`): ya vienen en criollo.
  if (status === undefined) return e instanceof Error && raw ? raw : fallback;

  if (status >= 400 && status < 500 && raw) {
    if (VALIDATOR_RE.test(raw)) {
      const label = labels[raw.split(/[.\s]/)[0]];
      return label
        ? `Revisá "${label}": hay un dato incompleto o inválido.`
        : 'Revisá los datos del formulario: hay un campo incompleto o inválido.';
    }
    if (status !== 401 && status !== 403 && status !== 429 && !GENERIC_RE.test(raw)) {
      return raw;
    }
  }
  return STATUS_FALLBACKS[status] ?? fallback;
}
