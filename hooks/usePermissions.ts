import { useAuth } from './useAuth';

export function usePermissions() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  return {
    canEdit: isAdmin,
    canDelete: isAdmin,
    canManageProducts: isAdmin,
    canManageStock: isAdmin,
    canManageCategories: isAdmin,
    canCancelSale: isAdmin,
    canViewCosts: isAdmin,
  };
}
