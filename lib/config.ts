import { CategoryConfig, StatusConfig } from './types';

/**
 * Fallback estático que se usa cuando una categoría no figura en la lista
 * dinámica de `/categories`. Sirve para no romper la UI mientras se cargan
 * las categorías o si un producto guarda una categoría vieja que el usuario
 * borró. Para la lista real de categorías administrables usar el endpoint
 * `GET /categories` y/o `useCategories()`.
 */
export const categoryConfigFallback: { label: string; color: string; bgColor: string } = {
  label: '—',
  color: '#9d684e',
  bgColor: '#9d684e/10',
};

/**
 * Estilos por nombre de categoría legacy. Si la categoría existe en el mapa,
 * la usamos; si no, caemos al fallback. `categoryConfig` se mantiene
 * exportada para no romper imports existentes, pero ya no es la fuente de
 * verdad — la lista real viene de la DB.
 */
export const categoryConfig: CategoryConfig = {
  organicos: { label: 'Orgánicos', color: '#455a54', bgColor: '#455a54/10' },
  aromaticos: { label: 'Aromáticos', color: '#e0a38d', bgColor: '#e0a38d/10' },
  wellness: { label: 'Wellness', color: '#4e4247', bgColor: '#4e4247/10' },
};

/** Lookup tolerante a categoría inexistente o vacía. */
export function getCategoryStyle(name?: string) {
  if (!name) return categoryConfigFallback;
  return categoryConfig[name] ?? { ...categoryConfigFallback, label: name };
}

/**
 * `statusConfig` queda exportado por compatibilidad con código viejo, pero
 * el campo `status` se quitó de la UI: el cliente no lo usa.
 * @deprecated
 */
export const statusConfig: StatusConfig = {
  active: { label: 'Activo', color: '#10b981', bgColor: '#10b981/10' },
  inactive: { label: 'Inactivo', color: '#6b7280', bgColor: '#6b7280/10' },
  out_of_stock: { label: 'Sin Stock', color: '#ef4444', bgColor: '#ef4444/10' },
};
