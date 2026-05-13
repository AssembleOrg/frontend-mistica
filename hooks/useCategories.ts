'use client';

import { useCallback, useEffect, useState } from 'react';
import { categoriesService } from '@/services/categories.service';
import type { Category } from '@/lib/types';
import { showToast } from '@/lib/toast';

/**
 * Hook compartido para cargar la lista de categorías desde el backend.
 * Cachea en estado local; los consumers llaman `refresh()` después de
 * crear/editar/borrar para refrescar.
 */
export function useCategories(autoload: boolean = true) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await categoriesService.list();
      setCategories(res.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al obtener categorías';
      showToast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoload) void refresh();
  }, [autoload, refresh]);

  return { categories, isLoading, refresh, setCategories };
}
