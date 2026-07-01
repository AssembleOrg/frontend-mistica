'use client';

import { useCallback, useEffect, useState } from 'react';
import { Minus, Plus, UserPlus } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  fmtDateTime,
  fmtPrice,
  prettyCode,
  RESERVATION_STATUS_LABEL,
} from '@/lib/reservas-format';
import {
  reservationsAdmin,
  type AdminSession,
  type ReservationItem,
  type ReservationPaymentMethod,
} from '@/services/reservations.admin.service';

const METHODS: { key: ReservationPaymentMethod; label: string }[] = [
  { key: 'CASH', label: 'Efectivo' },
  { key: 'TRANSFER', label: 'Transfer.' },
  { key: 'COURTESY', label: 'Cortesía' },
];

const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

export function AnotadosModal({
  sessionId,
  onClose,
  onChanged,
}: {
  sessionId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState<ReservationPaymentMethod>('CASH');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reservationsAdmin.attendees(sessionId);
      setSession(data.session);
      setReservations(data.reservations);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const maxQty = session ? Math.max(1, session.seatsAvailable) : 1;
  const isCourtesy = method === 'COURTESY';
  const total = session && !isCourtesy ? session.price * qty : 0;

  async function create() {
    if (!session) return;
    if (name.trim().length < 2) {
      showToast.error('Ingresá el nombre del cliente');
      return;
    }
    const emailLike = contact.includes('@');
    setSaving(true);
    try {
      await reservationsAdmin.createReservation({
        sessionId: session.id,
        quantity: qty,
        customerName: name.trim(),
        customerEmail: emailLike ? contact.trim() : undefined,
        customerPhone: emailLike ? undefined : contact.trim() || undefined,
        paymentMethod: method,
      });
      showToast.success('Reserva creada');
      setName('');
      setContact('');
      setQty(1);
      await load();
      onChanged();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo crear');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-3xl'>
        <DialogHeader className='border-b border-[#e6dbcd] px-6 py-4 text-left'>
          <p className='font-mono text-[11px] tracking-wider text-[#9d684e]'>
            ANOTADOS
          </p>
          <DialogTitle className='font-tan-nimbus text-xl font-bold text-[#455a54]'>
            {session
              ? `${session.experienceName} · ${fmtDateTime(session.startAt)}`
              : 'Turno'}
          </DialogTitle>
        </DialogHeader>

        <div className='grid flex-1 gap-5 overflow-y-auto p-6 md:grid-cols-[1fr_300px]'>
          {/* Lista de anotados */}
          <div className='overflow-hidden rounded-lg border border-[#e6dbcd]'>
            <div className='grid grid-cols-[auto_1fr_auto_auto] gap-2 bg-[#fbf5ef] px-4 py-2.5 font-mono text-[11px] tracking-wider text-[#455a54]/60'>
              <span>CÓDIGO</span>
              <span>CLIENTE</span>
              <span>PERS.</span>
              <span>ESTADO</span>
            </div>
            {loading ? (
              <div className='p-4 text-sm text-[#455a54]/60'>Cargando…</div>
            ) : reservations.length === 0 ? (
              <div className='p-4 text-sm text-[#455a54]/60'>Sin anotados aún.</div>
            ) : (
              reservations.map((r) => (
                <div
                  key={r._id}
                  className='grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 border-t border-[#e6dbcd] px-4 py-3'
                >
                  <span className='font-mono text-sm font-semibold text-[#9d684e]'>
                    {prettyCode(r.code)}
                  </span>
                  <div>
                    <p className='text-sm font-medium text-[#455a54]'>
                      {r.customerName}
                    </p>
                    <p className='text-xs text-[#455a54]/60'>
                      {r.customerEmail ?? r.customerPhone ?? '—'}
                    </p>
                  </div>
                  <span className='text-sm text-[#455a54]'>{r.quantity}</span>
                  <span className='text-xs text-[#455a54]/60'>
                    {RESERVATION_STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Alta de reserva */}
          <div className='flex flex-col gap-3 rounded-lg border border-[#e6dbcd] p-4'>
            <div className='flex items-center gap-2'>
              <UserPlus className='h-4 w-4 text-[#9d684e]' />
              <h3 className='font-tan-nimbus text-lg font-bold text-[#455a54]'>
                Agregar reserva
              </h3>
            </div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Nombre y apellido'
              className={fieldCls}
            />
            <Input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder='Teléfono o email'
              className={fieldCls}
            />
            <div className='flex items-center gap-3'>
              <div className='flex items-center overflow-hidden rounded-lg border border-[#e6dbcd]'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className='size-10 rounded-none text-[#455a54] hover:bg-[#fbf5ef]'
                >
                  <Minus className='h-4 w-4' />
                </Button>
                <span className='w-10 text-center font-tan-nimbus text-lg text-[#455a54]'>
                  {qty}
                </span>
                <Button
                  type='button'
                  variant='terracota'
                  size='icon'
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  className='size-10 rounded-none'
                >
                  <Plus className='h-4 w-4' />
                </Button>
              </div>
              <span className='text-xs text-[#455a54]/60'>
                {session ? `${session.seatsAvailable} disp.` : ''}
              </span>
            </div>
            <div className='grid grid-cols-3 gap-2'>
              {METHODS.map((m) => {
                const on = m.key === method;
                return (
                  <Button
                    key={m.key}
                    type='button'
                    variant={on ? 'terracota' : 'outline'}
                    size='sm'
                    onClick={() => setMethod(m.key)}
                    className={cn(
                      !on && 'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] hover:bg-[#f3e9df]',
                    )}
                  >
                    {m.label}
                  </Button>
                );
              })}
            </div>
            <div className='flex items-center justify-between border-t border-[#e6dbcd] pt-3'>
              <span className='text-sm text-[#455a54]/60'>
                {isCourtesy ? 'Sin cargo' : 'Total a cobrar'}
              </span>
              <span className='font-tan-nimbus text-xl font-semibold text-[#9d684e]'>
                {fmtPrice(total)}
              </span>
            </div>
            {!isCourtesy && (
              <p className='text-[11px] text-[#455a54]/60'>
                Impacta caja (requiere caja abierta).
              </p>
            )}
            <Button
              type='button'
              variant='naranja'
              onClick={create}
              disabled={saving}
              className='font-mono text-xs tracking-wider'
            >
              {saving ? 'CREANDO…' : 'CONFIRMAR RESERVA'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
