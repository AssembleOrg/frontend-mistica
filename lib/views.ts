// Catálogo de vistas del panel, la fuente de verdad del control de acceso.
//
// `key` es el segmento de la URL bajo /dashboard ('' = inicio). Las cuentas
// no-admin pueden tener una whitelist (`allowedViews`) con estas claves: si
// está vacía, ven las vistas estándar (las no adminOnly). Los admin ven todo.

export interface PanelView {
  key: string;
  label: string;
  /** Sólo la ven los admin: no se puede habilitar a una cuenta común. */
  adminOnly: boolean;
}

export const PANEL_VIEWS: PanelView[] = [
  { key: '', label: 'Dashboard', adminOnly: false },
  { key: 'sales', label: 'Ventas', adminOnly: false },
  { key: 'clients', label: 'Clientes', adminOnly: false },
  { key: 'reservas', label: 'Reservas', adminOnly: false },
  { key: 'products', label: 'Productos', adminOnly: false },
  // Taller: alumnos y grupos. Los profesores la usan en modo práctico
  // (sin plata); la parte administrativa (pagos) la gatea el backend por rol.
  { key: 'alumnos', label: 'Alumnos y grupos', adminOnly: false },
  // Herramientas del equipo: tareas asignadas y lista de compras.
  { key: 'equipo', label: 'Equipo', adminOnly: false },
  { key: 'bot', label: 'Bot WhatsApp', adminOnly: true },
  { key: 'finances', label: 'Caja y Finanzas', adminOnly: true },
  { key: 'categories', label: 'Categorías', adminOnly: true },
  { key: 'stock', label: 'Stock', adminOnly: true },
  { key: 'activity', label: 'Actividad', adminOnly: true },
  { key: 'settings', label: 'Configuración', adminOnly: true },
  { key: 'cuentas', label: 'Cuentas', adminOnly: true },
];

/** Vistas que se le pueden habilitar/quitar a una cuenta común. */
export const ASSIGNABLE_VIEWS = PANEL_VIEWS.filter((v) => !v.adminOnly);

/**
 * Pestañas de la vista Reservas, asignables una por una: la clave granular es
 * 'reservas:<tab>'. Habilitar 'reservas' entera equivale a todas. Ejemplo: un
 * profesor con SOLO 'reservas:piezas' entra al panel y ve únicamente Piezas.
 */
export const RESERVAS_TABS = [
  // Reservas = agenda (día/semana) + lista completa. Antes eran dos pestañas
  // ('agenda' y 'reservas'); se fusionaron para no multiplicar vistas.
  { key: 'reservas', label: 'Reservas', adminOnly: false },
  { key: 'mesas', label: 'Mesas', adminOnly: false },
  { key: 'experiencias', label: 'Experiencias', adminOnly: false },
  { key: 'consultas', label: 'Consultas', adminOnly: false },
  { key: 'piezas', label: 'Piezas', adminOnly: false },
  // Configuración del bot de WhatsApp: sólo el dueño/admin.
  { key: 'bot', label: 'Bot', adminOnly: true },
] as const;

/** Pestañas que se le pueden habilitar a una cuenta común. */
export const ASSIGNABLE_RESERVAS_TABS = RESERVAS_TABS.filter((t) => !t.adminOnly);

export type ReservasTabKey = (typeof RESERVAS_TABS)[number]['key'];

/**
 * Claves granulares viejas que siguen guardadas en cuentas existentes.
 * 'reservas:agenda' → 'reservas:reservas' (la agenda vive en Reservas),
 * 'reservas:charlas' → 'reservas:consultas' (bandeja vieja).
 */
const LEGACY_VIEW_KEYS: Record<string, string> = {
  'reservas:agenda': 'reservas:reservas',
  'reservas:charlas': 'reservas:consultas',
};

export function normalizeViewKey(key: string): string {
  return LEGACY_VIEW_KEYS[key] ?? key;
}

export function normalizeViewKeys(keys: string[]): string[] {
  return Array.from(new Set(keys.map(normalizeViewKey)));
}

/**
 * ¿Esta cuenta puede ver esta vista? Los admin siempre; una cuenta común con
 * whitelist vacía ve las vistas estándar; con whitelist, sólo las listadas.
 * Tener alguna pestaña granular ('reservas:piezas') habilita la vista madre.
 */
export function canAccessView(
  view: string,
  role: string | null | undefined,
  allowedViews: string[] | null | undefined,
): boolean {
  const def = PANEL_VIEWS.find((v) => v.key === view);
  if (!def) return true; // rutas fuera del catálogo no se gatean acá
  if (role === 'admin') return true;
  if (def.adminOnly) return false;
  if (!allowedViews || allowedViews.length === 0) return true;
  return (
    allowedViews.includes(view) ||
    allowedViews.some((v) => v.startsWith(`${view}:`))
  );
}

/**
 * Pestañas de Reservas visibles para esta cuenta. Admin, whitelist vacía o
 * 'reservas' entera → todas; si sólo tiene claves granulares, ésas.
 */
export function allowedReservasTabs(
  role: string | null | undefined,
  allowedViews: string[] | null | undefined,
): ReservasTabKey[] {
  const all = RESERVAS_TABS.map((t) => t.key);
  if (role === 'admin') return all;
  const common = ASSIGNABLE_RESERVAS_TABS.map((t) => t.key);
  if (!allowedViews || allowedViews.length === 0) return common;
  if (allowedViews.includes('reservas')) return common;
  const granted = normalizeViewKeys(allowedViews);
  return common.filter((k) => granted.includes(`reservas:${k}`));
}

/**
 * ¿La cuenta ve los datos personales y los importes de las reservas? Los admin
 * y quien tenga la vista Reservas completa, sí. Una cuenta con sólo alguna
 * pestaña suelta (cocina con 'reservas:agenda') ve turnos, cantidad de
 * personas y restricciones alimentarias, nada más. El backend recorta igual.
 */
export function canSeeReservationDetails(
  role: string | null | undefined,
  allowedViews: string[] | null | undefined,
): boolean {
  if (role === 'admin') return true;
  const views = allowedViews ?? [];
  return views.length === 0 || views.includes('reservas');
}
