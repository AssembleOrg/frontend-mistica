'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Sale } from '@/services/sales.service';
import { SaleDetailContent } from './sale-detail-content';
import { MousePointerClick } from 'lucide-react';

interface SaleDetailPanelProps {
  sale: Sale | null;
  onSaleUpdated?: () => void;
  onRequestEdit?: (sale: Sale) => void;
  // mobile sheet
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
      <div className="rounded-full bg-[#efcbb9]/60 border border-[#9d684e]/20 p-4">
        <MousePointerClick className="h-5 w-5 text-[#9d684e]/70" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#455a54] font-winter-solid">
          Seleccioná una venta
        </p>
        <p className="text-xs text-[#455a54]/50 font-winter-solid mt-0.5">
          El detalle aparecerá aquí
        </p>
      </div>
    </div>
  );
}

// ── Desktop: panel lateral fijo ─────────────────────────────────────────────
export function SaleDetailPanel({
  sale,
  onSaleUpdated,
  onRequestEdit,
  mobileOpen,
  onMobileClose,
}: SaleDetailPanelProps) {
  return (
    <>
      {/* Desktop panel */}
      <aside className="hidden lg:flex flex-col lg:w-[300px] xl:w-[390px] shrink-0 overflow-hidden border-l-2 border-[#455a54]/20 bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.08)]">
        {sale ? (
          <ScrollArea className="flex-1">
            <div className="p-4 max-xl:p-3 min-w-0">
              <SaleDetailContent
                sale={sale}
                onSaleUpdated={onSaleUpdated}
                onRequestEdit={onRequestEdit}
              />
            </div>
          </ScrollArea>
        ) : (
          <EmptyState />
        )}
      </aside>

      {/* Mobile Sheet — slide desde abajo */}
      <Sheet open={mobileOpen} onOpenChange={onMobileClose}>
        <SheetContent
          side="bottom"
          className="h-[92vh] rounded-t-2xl bg-white border-t-2 border-[#455a54]/20 px-0 pt-0 flex flex-col"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Detalle de venta</SheetTitle>
          </SheetHeader>

          {/* Drag handle — lo único arriba del contenido */}
          <div className="flex justify-center pt-2 pb-0 shrink-0">
            <div className="w-10 h-1 rounded-full bg-[#d9dadb]" />
          </div>

          {sale ? (
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-4 pt-3 pb-4">
                <SaleDetailContent
                  sale={sale}
                  stickyActions
                  onSaleUpdated={() => {
                    onSaleUpdated?.();
                    onMobileClose();
                  }}
                  onRequestEdit={(s) => {
                    onRequestEdit?.(s);
                    onMobileClose();
                  }}
                />
              </div>
            </ScrollArea>
          ) : (
            <EmptyState />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
