import { CategoryConfig, StatusConfig, Category } from './types';

export const categoryConfigFallback: { label: string; color: string; bgColor: string } = {
  label: '—',
  color: '#9d684e',
  bgColor: '#9d684e1A',
};

export const categoryConfig: CategoryConfig = {
  organicos: { label: 'Orgánicos', color: '#455a54', bgColor: '#455a541A' },
  aromaticos: { label: 'Aromáticos', color: '#e0a38d', bgColor: '#e0a38d1A' },
  wellness: { label: 'Wellness', color: '#4e4247', bgColor: '#4e42471A' },
};

function isHex(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function getCategoryStyle(name?: string, categories?: Category[]) {
  if (!name) return categoryConfigFallback;
  if (categories && categories.length > 0) {
    const match = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (match && match.color && isHex(match.color)) {
      return { label: match.name, color: match.color, bgColor: `${match.color}1A` };
    }
  }
  return categoryConfig[name] ?? { ...categoryConfigFallback, label: name };
}

/**
 * @deprecated `status` no se usa en la UI.
 */
export const statusConfig: StatusConfig = {
  active: { label: 'Activo', color: '#10b981', bgColor: '#10b9811A' },
  inactive: { label: 'Inactivo', color: '#6b7280', bgColor: '#6b72801A' },
  out_of_stock: { label: 'Sin Stock', color: '#ef4444', bgColor: '#ef44441A' },
};
