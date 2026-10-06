import { canManageRole } from '@/lib/views';
import { useAuth } from './useAuth';

/**
 * Qué puede hacer la cuenta. El encargado/a hace lo operativo como el admin
 * (editar, cargar productos y stock); borrar, anular ventas y ver costos y
 * balances queda para el admin.
 */
export function usePermissions() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canManage = canManageRole(user?.role);
  return {
    isAdmin,
    canManage,
    canEdit: canManage,
    canDelete: isAdmin,
    canManageProducts: canManage,
    canManageStock: canManage,
    canManageCategories: canManage,
    canCancelSale: isAdmin,
    canViewCosts: isAdmin,
  };
}
