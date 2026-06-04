'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-skeletons';
import { Sale, salesService } from '@/services/sales.service';
import { formatCurrency } from '@/lib/sales-calculations';
import { showToast } from '@/lib/toast';
import { Link2 } from 'lucide-react';

interface LinkSalesDialogProps {
  /** Venta sobre la que se editan los vínculos. Si es null, el dialog está cerrado. */
  sale: Sale | null;
  onOpenChange: (open: boolean) => void;
  onLinked?: () => void;
}

/**
 * Dialog para relacionar (vínculo MUTUO, informativo) una venta con otras del
 * MISMO cliente. Lista las ventas del cliente con checkboxes, precargando las
 * que ya estaban relacionadas. Guardar llama a setSaleLinks con el set completo.
 */
export function LinkSalesDialog({ sale, onOpenChange, onLinked }: LinkSalesDialogProps) {
  const open = !!sale;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<Sale[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!sale) return;
    setSelected(sale.relatedSaleIds || []);

    if (!sale.clientId) {
      setOptions([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    salesService
      .getSales(1, 50, { clientId: sale.clientId })
      .then((res) => {
        if (cancelled) return;
        // Excluimos la propia venta del listado de candidatas.
        setOptions((res.data?.data || []).filter((s) => s.id !== sale.id));
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sale]);

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const handleSave = async () => {
    if (!sale) return;
    setSaving(true);
    try {
      await salesService.setSaleLinks(sale.id, selected);
      showToast.success('Ventas relacionadas actualizadas');
      onLinked?.();
      onOpenChange(false);
    } catch (e) {
      console.error('Error al vincular ventas', e);
      showToast.error('No se pudieron actualizar las ventas relacionadas');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-[#9d684e]/20">
        <DialogHeader>
          <DialogTitle className="font-tan-nimbus text-[#455a54] flex items-center gap-2">
            <Link2 className="h-4 w-4 text-[#9d684e]" />
            Vincular venta
          </DialogTitle>
          <DialogDescription className="font-winter-solid text-[#455a54]/70 text-sm">
            Marcá otras ventas del cliente para relacionarlas con{' '}
            <span className="font-semibold">#{sale?.saleNumber}</span>. Es sólo
            informativo: no cambia montos ni saldos.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 overflow-y-auto -mx-1 px-1">
          {!sale?.clientId ? (
            <p className="text-sm text-[#455a54]/60 font-winter-solid py-6 text-center">
              La venta no tiene un cliente asociado, así que no hay otras ventas
              del cliente para relacionar.
            </p>
          ) : loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="sm" />
            </div>
          ) : options.length === 0 ? (
            <p className="text-sm text-[#455a54]/60 font-winter-solid py-6 text-center">
              El cliente no tiene otras ventas para relacionar.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {options.map((s) => {
                const checked = selected.includes(s.id);
                return (
                  <li key={s.id}>
                    <label className="flex items-center gap-2.5 cursor-pointer rounded-md border border-[#9d684e]/15 px-2.5 py-2 hover:bg-[#efcbb9]/20">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggle(s.id, e.target.checked)}
                        className="rounded border-[#9d684e]/40 text-[#cc844a] focus:ring-[#cc844a] shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#455a54] truncate">
                          #{s.saleNumber}
                          {s.name ? ` · ${s.name}` : ''}
                        </p>
                        <p className="text-[11px] text-[#455a54]/60 truncate">
                          {new Date(s.createdAt).toLocaleDateString('es-AR')} ·{' '}
                          {s.items.map((i) => i.productName).join(', ') || 'Sin productos'}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-[#9d684e] whitespace-nowrap">
                        {formatCurrency(s.total)}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30 font-winter-solid"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading || !sale?.clientId}
            className="bg-[#9d684e] hover:bg-[#9d684e]/90 text-white font-winter-solid"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
