'use client';

import { useEffect, useState } from 'react';
import { PackageMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AsyncSelect } from '@/components/ui/async-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-skeletons';
import { showToast } from '@/lib/toast';
import { productsService } from '@/services/products.service';
import type { Product } from '@/lib/types';

// Mismos responsables que el Select de vendedor en el POS. "Otro" habilita
// texto libre. El responsable se guarda como parte del motivo (auditoría).
const RESPONSIBLES = ['Agus', 'Agos', 'Mel'] as const;
const RESPONSIBLE_OTHER = 'Otro';

interface StockConsumptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Registra el consumo interno de un producto (ej. material que se lleva un
 * taller): descuenta stock SIN generar venta ni tocar la caja. El motivo y el
 * responsable quedan en la auditoría (`audit_logs`, acción UPDATE_STOCK) porque
 * el backend registra la respuesta del endpoint de stock, que ahora incluye el
 * `reason`. No suma precio: no es una venta.
 */
export function StockConsumptionDialog({
  open,
  onOpenChange,
  onSuccess,
}: StockConsumptionDialogProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [responsible, setResponsible] = useState('');
  const [responsibleIsOther, setResponsibleIsOther] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setProduct(null);
      setQuantity('1');
      setReason('');
      setResponsible('');
      setResponsibleIsOther(false);
      setIsSubmitting(false);
    }
  }, [open]);

  // Buscador de productos con stock físico. Los SERVICE/PREPAID no tienen stock
  // que descontar, así que no tiene sentido consumirlos: se filtran del listado.
  const fetchProducts = async (search: string, page: number, pageSize: number) => {
    const res = await productsService.getProducts(
      page,
      pageSize,
      search.trim() ? { search } : undefined,
    );
    return {
      items: res.data.data.filter((p) => (p.kind ?? 'STANDARD') === 'STANDARD'),
      hasMore: res.data.meta.hasNextPage,
    };
  };

  const handleSubmit = async () => {
    if (!product) {
      showToast.error('Elegí un producto');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      showToast.error('La cantidad debe ser mayor a 0');
      return;
    }
    if (qty > product.stock) {
      showToast.error(`Stock insuficiente: hay ${product.stock} y querés consumir ${qty}`);
      return;
    }
    const who = responsible.trim();
    if (!who) {
      showToast.error('Indicá el responsable');
      return;
    }

    // El motivo que se audita combina la razón (si la hay) y el responsable.
    const motivo = reason.trim() ? `Consumo: ${reason.trim()} — ${who}` : `Consumo — ${who}`;

    setIsSubmitting(true);
    try {
      await productsService.subtractStock(product.id, qty, motivo);
      showToast.success(`Consumo registrado: ${qty} × ${product.name}`);
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || 'No se pudo registrar el consumo';
      showToast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (isSubmitting) return;
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md border-[#9d684e]/20 p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-[#9d684e]/10">
          <div className="flex items-center gap-2">
            <PackageMinus className="h-4 w-4 text-[#9d684e]" />
            <DialogTitle className="text-base font-bold text-[#455a54] font-tan-nimbus">
              Consumo interno
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs font-winter-solid text-[#455a54]/70 mt-1">
            Descuenta stock sin generar una venta.
            No suma precio ni toca la caja; queda registrado el motivo y el
            responsable.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[#455a54] font-winter-solid">
              Producto <span className="text-red-500">*</span>
            </Label>
            <AsyncSelect<Product>
              value={product}
              onChange={(p) => setProduct(p)}
              fetcher={fetchProducts}
              getKey={(p) => p.id}
              getLabel={(p) => p.name}
              renderOption={(p) => (
                <div className="flex justify-between items-center w-full gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-[#455a54] truncate">{p.name}</p>
                    <p className="text-xs text-[#455a54]/60 truncate">{p.barcode || '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-[#455a54]/60">Stock: {p.stock}</p>
                  </div>
                </div>
              )}
              placeholder="Buscar por nombre o código..."
              rowHeight={56}
            />
            {product && (
              <p className="text-xs text-[#455a54]/60">
                Stock actual: <span className="font-semibold">{product.stock}</span>
                {product.unitOfMeasure ? ` ${product.unitOfMeasure}` : ''}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="consumption-qty" className="text-[#455a54] font-winter-solid">
              Cantidad <span className="text-red-500">*</span>
            </Label>
            <Input
              id="consumption-qty"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={isSubmitting}
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[#455a54] font-winter-solid">
              Responsable <span className="text-red-500">*</span>
            </Label>
            <Select
              value={responsibleIsOther ? RESPONSIBLE_OTHER : responsible}
              onValueChange={(v) => {
                const isOther = v === RESPONSIBLE_OTHER;
                setResponsibleIsOther(isOther);
                setResponsible(isOther ? '' : v);
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="¿Quién lo retira?" />
              </SelectTrigger>
              <SelectContent>
                {RESPONSIBLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
                <SelectItem value={RESPONSIBLE_OTHER}>{RESPONSIBLE_OTHER}</SelectItem>
              </SelectContent>
            </Select>
            {responsibleIsOther && (
              <Input
                value={responsible}
                onChange={(e) => setResponsible(e.target.value.replace(/[\n\r]/g, ''))}
                placeholder="Nombre del responsable"
                disabled={isSubmitting}
                autoFocus
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="consumption-reason" className="text-[#455a54] font-winter-solid">
              Motivo <span className="text-[11px] text-[#455a54]/60">(opcional)</span>
            </Label>
            <Textarea
              id="consumption-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Taller de acrílico"
              disabled={isSubmitting}
              maxLength={200}
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#9d684e]/10 bg-[#efcbb9]/20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-8 text-xs font-winter-solid border-[#9d684e]/30 text-[#455a54]"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !product || !responsible.trim()}
            className="h-8 text-xs font-winter-solid bg-[#9d684e] hover:bg-[#9d684e]/90 text-white"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-1.5">Registrando…</span>
              </>
            ) : (
              'Registrar consumo'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
