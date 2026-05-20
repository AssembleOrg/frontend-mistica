'use client';

import { useCallback, useEffect, useState } from 'react';
import { TransactionsTable } from '@/components/dashboard/finances/transactions-table';
import { cashboxService, type SessionTransaction, type CashSession } from '@/services/cashbox.service';
import { Button } from '@/components/ui/button';
import { showToast } from '@/lib/toast';
import { RefreshCw } from 'lucide-react';

/**
 * Pestaña "Transacciones" de la página de Ventas. Muestra el detalle
 * cronológico de la sesión de caja actual: ventas, señas y egresos.
 *
 * Si no hay caja abierta, muestra mensaje informativo.
 */
export function SalesTransactionsTab() {
  const [session, setSession] = useState<CashSession | null>(null);
  const [transactions, setTransactions] = useState<SessionTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const sessionRes = await cashboxService.getCurrent();
      const current = sessionRes.data ?? null;
      setSession(current);
      if (!current) {
        setTransactions([]);
        return;
      }
      const txRes = await cashboxService.getSessionTransactions(current.id);
      setTransactions(txRes.data?.transactions ?? []);
    } catch (err) {
      showToast.error('No se pudieron cargar las transacciones');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-5 w-5 animate-spin text-[#9d684e]" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-md border border-[#9d684e]/20 bg-white p-8 text-center">
        <p className="text-[#455a54] font-winter-solid">
          No hay caja abierta en este momento.
        </p>
        <p className="text-xs text-[#455a54]/60 font-winter-solid mt-1">
          Abrí la caja desde la sección de Finanzas para empezar a registrar movimientos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs font-winter-solid text-[#455a54]/70">
          Sesión abierta el{' '}
          <span className="font-semibold text-[#455a54]">
            {new Date(session.openedAt).toLocaleString('es-AR', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </span>
          {' · '}
          Apertura:{' '}
          <span className="font-semibold text-[#455a54]">
            ${session.openingCash.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => load(true)}
          disabled={refreshing}
          className="border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>
      <TransactionsTable transactions={transactions} />
    </div>
  );
}
