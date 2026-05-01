'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  cashboxService,
  type CashSession,
  type CloseCashSessionRequest,
  type OpenCashSessionRequest,
} from '@/services/cashbox.service';
import { showToast } from '@/lib/toast';

/**
 * Hook que centraliza el estado de la caja abierta.
 * - `current` es la sesión OPEN o `null`.
 * - Llama a `refresh()` después de un POST /sales para revalidar.
 * - Expone `open()` y `close()` con manejo de errores y toasts.
 */
export function useCashbox() {
  const [current, setCurrent] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await cashboxService.getCurrent();
      setCurrent(res.data ?? null);
    } catch (err) {
      console.error('cashbox refresh:', err);
      setCurrent(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openSession = useCallback(
    async (req: OpenCashSessionRequest) => {
      setSubmitting(true);
      try {
        const res = await cashboxService.open(req);
        setCurrent(res.data);
        showToast.success('Caja abierta');
        return res.data;
      } catch (err: any) {
        showToast.error(err?.message || 'No se pudo abrir la caja');
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  const closeSession = useCallback(
    async (req: CloseCashSessionRequest) => {
      setSubmitting(true);
      try {
        const res = await cashboxService.close(req);
        setCurrent(null);
        const diff = res.data.discrepancy ?? 0;
        if (diff === 0) showToast.success('Caja cerrada sin diferencias');
        else if (diff > 0) showToast.info(`Caja cerrada con sobrante de $${diff.toFixed(2)}`);
        else showToast.info(`Caja cerrada con faltante de $${Math.abs(diff).toFixed(2)}`);
        return res.data;
      } catch (err: any) {
        showToast.error(err?.message || 'No se pudo cerrar la caja');
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  return {
    current,
    isOpen: current?.status === 'OPEN',
    loading,
    submitting,
    refresh,
    openSession,
    closeSession,
  };
}
