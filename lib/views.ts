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
 * ¿Esta cuenta puede ver esta vista? Los admin siempre; una cuenta común con
 * whitelist vacía ve las vistas estándar; con whitelist, sólo las listadas.
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
  return allowedViews.includes(view);
}
