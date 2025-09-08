import { CategoryConfig, StatusConfig } from './types';

export const categoryConfig: CategoryConfig = {
  organicos: {
    label: 'Orgánicos',
    color: '#455a54',
    bgColor: '#455a54/10',
  },
  aromaticos: {
    label: 'Aromáticos',
    color: '#e0a38d',
    bgColor: '#e0a38d/10',
  },
  wellness: {
    label: 'Wellness',
    color: '#4e4247',
    bgColor: '#4e4247/10',
  },
};

export const statusConfig: StatusConfig = {
  active: {
    label: 'Activo',
    color: '#10b981',
    bgColor: '#10b981/10',
  },
  inactive: {
    label: 'Inactivo',
    color: '#6b7280',
    bgColor: '#6b7280/10',
  },
  out_of_stock: {
    label: 'Sin Stock',
    color: '#ef4444',
    bgColor: '#ef4444/10',
  },
};