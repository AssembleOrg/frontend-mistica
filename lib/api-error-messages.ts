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
