'use client';

// Ventas → Por cobrar: los fiados (lo que se llevaron el equipo, la familia o
// clientes de confianza para pagar después), agrupados por quién debe.

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, HandCoins, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-skeletons';
import { formatCurrency } from '@/lib/sales-calculations';
import { showToast } from '@/lib/toast';
import {
  salesService,
  type ReceivableGroup,
  type Sale,
} from '@/services/sales.service';
import { AddSalePaymentDialog } from './add-payment-dialog';

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

export function ReceivablesTab() {
  const [groups, setGroups] = useState<ReceivableGroup[] | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [paying, setPaying] = useState<Sale | null>(null);
  const [loadingSale, setLoadingSale] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setGroups(await salesService.receivables());
    } catch (e) {
      showToast.error((e as { message?: string })?.message ?? 'No se pudo cargar');
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function cobrar(saleId: string) {
    setLoadingSale(saleId);
    try {
      const res = await salesService.getSale(saleId);
      setPaying(res.data);
    } catch (e) {
      showToast.error((e as { message?: string })?.message ?? 'No se pudo abrir la venta');
    } finally {
      setLoadingSale(null);
    }
  }

  if (!groups) {
    return (
      <div className='flex justify-center p-8'>
        <LoadingSpinner />
      </div>
    );
  }

  const total = groups.reduce((acc, g) => acc + g.balanceDue, 0);
  const keyOf = (g: ReceivableGroup) => g.clientId ?? g.clientName;

  return (
    <div className='flex flex-col gap-3 p-4 sm:p-6'>
      <div className='flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#9d684e]/20 bg-[#fdf6f0] px-4 py-3'>
        <div>
          <p className='text-sm font-semibold text-[#455a54] font-winter-solid'>
            Fiados por cobrar
          </p>
          <p className='text-[11px] text-[#455a54]/70 font-winter-solid'>
            Lo que se llevaron para pagar después. Se cobra con la caja abierta.
          </p>
        </div>
        <p className='font-tan-nimbus text-xl font-bold text-[#9d684e]'>
          {formatCurrency(total)}
        </p>
      </div>

      {groups.length === 0 ? (
        <p className='rounded-lg border border-[#9d684e]/20 bg-white p-6 text-center text-sm text-[#455a54]/70'>
          No hay fiados pendientes.
        </p>
      ) : (
        groups.map((g) => {
          const key = keyOf(g);
          const isOpen = open[key] ?? groups.length === 1;
          return (
            <div key={key} className='overflow-hidden rounded-lg border border-[#9d684e]/20 bg-white'>
              <button
                type='button'
                onClick={() => setOpen({ ...open, [key]: !isOpen })}
                className='flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#fdf6f0]'
              >
                <span className='min-w-0'>
                  <span className='block truncate text-sm font-semibold text-[#4e4247]'>
                    {g.clientName}
                  </span>
                  <span className='flex items-center gap-1 text-[11px] text-[#455a54]/70'>
                    {g.sales.length} venta{g.sales.length > 1 ? 's' : ''}
                    {g.phone && (
                      <>
                        {' · '}
                        <Phone className='h-3 w-3' /> {g.phone}
                      </>
                    )}
                  </span>
                </span>
                <span className='flex shrink-0 items-center gap-2'>
                  <span className='text-sm font-bold text-[#9d684e]'>
                    {formatCurrency(g.balanceDue)}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-[#455a54] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </span>
              </button>
              {isOpen && (
                <div className='divide-y divide-[#9d684e]/10 border-t border-[#9d684e]/10'>
                  {g.sales.map((s) => (
                    <div key={s.id} className='flex flex-wrap items-start justify-between gap-3 px-4 py-3'>
                      <div className='min-w-0 flex-1'>
                        <p className='text-[12px] text-[#455a54]/70'>
                          {fmtDay(s.createdAt)} · {s.saleNumber}
                          {s.seller ? ` · vendió ${s.seller}` : ''}
                        </p>
                        <p className='text-sm text-[#4e4247]'>
                          {s.items
                            .map((i) => `${i.quantity > 1 ? `${i.quantity} × ` : ''}${i.productName}`)
                            .join(', ')}
                        </p>
                        <p className='text-[12px] text-[#455a54]/70'>
                          Total {formatCurrency(s.total)}
                          {s.paid > 0 && ` · pagó ${formatCurrency(s.paid)}`}
                          {' · '}
                          <span className='font-semibold text-[#9d684e]'>
                            debe {formatCurrency(s.balanceDue)}
                          </span>
                        </p>
                        {s.notes && (
                          <p className='text-[12px] italic text-[#455a54]/60'>{s.notes}</p>
                        )}
                      </div>
                      <Button
                        type='button'
                        size='sm'
                        disabled={loadingSale === s.id}
                        onClick={() => void cobrar(s.id)}
                        className='gap-1.5 bg-[#455a54] text-white hover:bg-[#455a54]/90'
                      >
                        <HandCoins className='h-3.5 w-3.5' />
                        Cobrar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      <AddSalePaymentDialog
        sale={paying}
        onOpenChange={(o) => !o && setPaying(null)}
        onSuccess={() => {
          setPaying(null);
          void load();
        }}
      />
    </div>
  );
}
