'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  Flame,
  Search,
  Wallet,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  AR_TZ,
  fmtDateTime,
  fmtPrice,
  prettyCode,
  RESERVATION_STATUS_COLOR,
  RESERVATION_STATUS_LABEL,
} from '@/lib/reservas-format';
import {
  reservationsAdmin,
  type AdminExperience,
  type AdminSession,
  type ReservationItem,
  type ReservationPaymentMethod,
} from '@/services/reservations.admin.service';
import { FilterChip, IconBtn, Pager, StatusBadge } from './_shared';
import { DietaryTags } from './dietary-badge';
import { ClientPicker, clientIdOf } from '@/components/dashboard/client-picker';
import type { Client } from '@/services/clients.service';
import { ReservationDetailPanel } from './reservation-detail-panel';
import { NewPieceModal } from './piezas-tab';
import { useAuth } from '@/hooks/useAuth';
import { allowedReservasTabs } from '@/lib/views';
import { ChargeNow, partialAmount, type ChargeMode } from './charge-now';
import { SlotPicker, useSlotPicker } from './slot-picker';
import { DietaryPicker } from './dietary-badge';
import { FormField, FormSection } from '@/components/ui/form-section';

const LIMIT = 20;

/** Mandó un comprobante por WhatsApp que todavía nadie verificó. */
const hasPendingReceipt = (r: ReservationItem) =>
  (r.transferReceipts ?? []).some((x) => x.status === 'PENDING');

// Política del local: las modificaciones se aceptan hasta 48 hs antes del turno.
const RESCHEDULE_MIN_HOURS = 48;

const PAY_METHODS: { key: ReservationPaymentMethod; label: string }[] = [
  { key: 'CASH', label: 'Efectivo' },
  { key: 'TRANSFER', label: 'Transferencia' },
  { key: 'CARD', label: 'Tarjeta' },
];

// Filtros de estado con su acento (color) y tinte (fondo suave) del .pen.
const FILTERS: { key: string; label: string; color: string; tint: string }[] = [
  { key: '', label: 'Todas', color: '#455a54', tint: '#E7F0EC' },
  { key: 'CONFIRMED', label: 'Confirmadas', color: '#455a54', tint: '#E7F0EC' },
  { key: 'PENDING', label: 'Pendientes', color: '#cc844a', tint: '#F6E9DC' },
  { key: 'NEEDS_REVIEW', label: 'Revisión', color: '#b23b2e', tint: '#F6E0DA' },
  { key: 'CANCELLED', label: 'Canceladas', color: '#7a6e6f', tint: '#f1ede6' },
];

// 'YYYY-MM-DD' de hoy en hora de Argentina (para el orden "Próximas").
function todayYmdAR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: AR_TZ });
}

/**
 * Listado completo de reservas (buscador, filtros por estado/experiencia,
 * historial). Es el modo "Lista" de la pestaña Reservas; el día a día se
 * maneja desde la agenda (día/semana) de la misma pestaña.
 */
export function ReservasListado({ refreshKey = 0 }: { refreshKey?: number }) {
  const confirm = useConfirm();
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  // Orden del listado: 'created' = recientes (default histórico); 'upcoming' =
  // por fecha de turno, próximas primero (desde hoy). Resuelve "no encuentro la
  // reserva que pidieron por WhatsApp para tal día".
  const [order, setOrder] = useState<'created' | 'upcoming'>('created');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [collect, setCollect] = useState<ReservationItem | null>(null);
  // Cargar piezas directo desde la reserva (sin pasar por la pestaña Piezas).
  const [piecesFor, setPiecesFor] = useState<ReservationItem | null>(null);
  const { user } = useAuth();
  const canPieces = allowedReservasTabs(user?.role, user?.allowedViews).includes('piezas');
  const [reschedule, setReschedule] = useState<ReservationItem | null>(null);
  const [detail, setDetail] = useState<ReservationItem | null>(null);
  const [experiences, setExperiences] = useState<AdminExperience[]>([]);
  const [expFilter, setExpFilter] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [localTick, setLocalTick] = useState(0);
  // Se recarga por cambios propios (acciones) o de afuera (nueva reserva).
  const tick = localTick + refreshKey;

  const refresh = () => setLocalTick((t) => t + 1);

  // Debounce del buscador: espera 350 ms tras la última tecla y vuelve a página 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Experiencias para el filtro (una vez).
  useEffect(() => {
    reservationsAdmin
      .listExperiences(false)
      .then(setExperiences)
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reservationsAdmin.listReservations({
        status: status || undefined,
        search: search || undefined,
        experienceId: expFilter || undefined,
        ...(order === 'upcoming'
          ? { sort: 'startAt' as const, from: todayYmdAR() }
          : {}),
        page,
        limit: LIMIT,
      });
      setItems(res.items);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [status, search, expFilter, order, page]);

  useEffect(() => {
    load();
  }, [load, tick]);

  // Contadores por estado (para los chips). Respetan la búsqueda y la experiencia.
  useEffect(() => {
    let alive = true;
    const keys = ['', 'CONFIRMED', 'PENDING', 'NEEDS_REVIEW', 'CANCELLED'];
    Promise.all(
      keys.map((k) =>
        reservationsAdmin
          .listReservations({
            status: k || undefined,
            search: search || undefined,
            experienceId: expFilter || undefined,
            // Coherente con la lista: si mostramos próximas, contamos desde hoy.
            ...(order === 'upcoming' ? { from: todayYmdAR() } : {}),
            page: 1,
            limit: 1,
          })
          .then((r) => [k, r.total] as const)
          .catch(() => [k, 0] as const),
      ),
    ).then((pairs) => {
      if (alive) setCounts(Object.fromEntries(pairs));
    });
    return () => {
      alive = false;
    };
  }, [search, expFilter, order, tick]);

  async function doCancel(r: ReservationItem) {
    const ok = await confirm({
      title: 'Cancelar reserva',
      description: `¿Cancelar la reserva ${prettyCode(r.code)}? Libera el cupo y reembolsa si fue MercadoPago.`,
      confirmLabel: 'Cancelar reserva',
    });
    if (!ok) return;
    setBusy(r._id);
    try {
      await reservationsAdmin.cancelReservation(r._id);
      showToast.success('Reserva cancelada');
      setDetail(null);
      refresh();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo cancelar');
    } finally {
      setBusy(null);
    }
  }

  async function doResolve(r: ReservationItem, action: 'confirm' | 'cancel') {
    setBusy(r._id);
    try {
      await reservationsAdmin.resolveReservation(r._id, action);
      showToast.success(
        action === 'confirm' ? 'Reserva confirmada' : 'Reserva cancelada',
      );
      setDetail(null);
      refresh();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo resolver');
    } finally {
      setBusy(null);
    }
  }

  function renderActions(r: ReservationItem) {
    const canConfirm = r.status === 'NEEDS_REVIEW';
    const canCollect =
      r.balanceDue != null && r.balanceDue > 0 && r.status === 'CONFIRMED';
    const canReschedule = r.status === 'CONFIRMED';
    const canCancel = ['PENDING', 'CONFIRMED', 'NEEDS_REVIEW'].includes(
      r.status,
    );
    const canLoadPieces = canPieces && r.status === 'CONFIRMED';
    if (!canConfirm && !canCollect && !canReschedule && !canCancel && !canLoadPieces)
      return <span className='text-sm text-[#7a6e6f]'>—</span>;
    return (
      <div className='flex items-center justify-end gap-1.5'>
        {canLoadPieces && (
          <IconBtn
            icon={Flame}
            title='Cargar piezas de esta reserva'
            tone='terracota'
            onClick={() => setPiecesFor(r)}
          />
        )}
        {canReschedule && (
          <IconBtn
            icon={CalendarClock}
            title='Reprogramar'
            disabled={busy === r._id}
            onClick={() => setReschedule(r)}
          />
        )}
        {canConfirm && (
          <IconBtn
            icon={CheckCircle2}
            title='Confirmar'
            disabled={busy === r._id}
            onClick={() => doResolve(r, 'confirm')}
          />
        )}
        {canCollect && (
          <IconBtn
            icon={Wallet}
            title='Cobrar saldo'
            tone='terracota'
            disabled={busy === r._id}
            onClick={() => setCollect(r)}
          />
        )}
        {canCancel && (
          <IconBtn
            icon={Ban}
            title='Cancelar'
            tone='rojo'
            disabled={busy === r._id}
            onClick={() => doCancel(r)}
          />
        )}
      </div>
    );
  }

  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to = (page - 1) * LIMIT + items.length;

  return (
    <div className='flex flex-col gap-5'>
      {/* Filtros de estado con contador + búsqueda. Mobile: buscador arriba,
          chips en tira scrollable debajo. Desktop: chips a la izq, buscador a la der. */}
      <div className='flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center'>
        <div className='-mx-4 order-last flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:order-none sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0'>
          {FILTERS.map((f) => (
            <FilterChip
              key={f.key || 'all'}
              label={f.label}
              count={counts[f.key]}
              active={f.key === status}
              color={f.color}
              tint={f.tint}
              onClick={() => {
                setStatus(f.key);
                setPage(1);
              }}
            />
          ))}
        </div>
        <div className='flex w-full items-center gap-2.5 sm:ml-auto sm:w-auto'>
          {/* Orden: recientes vs por fecha de turno. "Próximas" muestra
                  las reservas de hoy en adelante ordenadas por su día — así se
                  encuentran las cargadas por WhatsApp para una fecha futura. */}
          <div className='inline-flex shrink-0 items-center rounded-[11px] border border-[#e6dbcd] bg-[#fbf5ef] p-1'>
            {(
              [
                ['created', 'Recientes'],
                ['upcoming', 'Próximas'],
              ] as const
            ).map(([key, label]) => {
              const on = order === key;
              return (
                <button
                  key={key}
                  type='button'
                  onClick={() => {
                    setOrder(key);
                    setPage(1);
                  }}
                  className={cn(
                    'rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                    on
                      ? 'bg-[#455a54] text-white'
                      : 'text-[#7a6e6f] hover:text-[#455a54]',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <select
            value={expFilter}
            onChange={(e) => {
              setExpFilter(e.target.value);
              setPage(1);
            }}
            className='h-10 min-w-0 rounded-[10px] border border-[#e6dbcd] bg-white px-3 text-[13px] font-medium text-[#3d3338] focus-visible:border-[#9d684e] focus-visible:outline-none sm:h-9'
          >
            <option value=''>Todas las experiencias</option>
            {experiences.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name}
              </option>
            ))}
          </select>
          <div className='relative w-full sm:w-72'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a99]' />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder='Buscar por código, nombre o teléfono'
              className='rounded-full border-[#e6dbcd] bg-white pl-9 text-[#455a54] placeholder:text-[#a99] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30'
            />
          </div>
        </div>
      </div>

      {/* Desktop: tabla */}
      <div className='hidden overflow-x-auto rounded-2xl border border-[#e6dbcd] bg-white md:block'>
        <div className='min-w-[68rem]'>
          <div className='grid grid-cols-[6rem_11rem_1fr_3.5rem_8rem_6rem_8rem_12rem] items-center gap-3 border-b border-[#e6dbcd] bg-[#fbf5ef] px-5 py-3 font-mono text-[11px] tracking-wider text-[#7a6e6f]'>
            <span>CÓDIGO</span>
            <span>CLIENTE</span>
            <span>EXPERIENCIA · TURNO</span>
            <span className='text-center'>PERS.</span>
            <span>MONTO</span>
            <span>ORIGEN</span>
            <span>ESTADO</span>
            <span className='text-right'>ACCIONES</span>
          </div>
          {loading ? (
            <div className='p-6 text-sm text-[#7a6e6f]'>Cargando…</div>
          ) : items.length === 0 ? (
            <div className='p-6 text-sm text-[#7a6e6f]'>
              {search ? `Sin resultados para “${search}”.` : 'Sin reservas.'}
            </div>
          ) : (
            items.map((r) => {
              const [bg, fg] = RESERVATION_STATUS_COLOR[r.status] ?? [
                '#f1ede6',
                '#7a6e6f',
              ];
              return (
                <div
                  key={r._id}
                  className={cn(
                    'grid grid-cols-[6rem_11rem_1fr_3.5rem_8rem_6rem_8rem_12rem] items-center gap-3 border-b border-[#e6dbcd] px-5 py-3.5 last:border-0 transition-colors hover:bg-[#fbf5ef]/50',
                    r.status === 'CANCELLED' && 'opacity-55',
                  )}
                >
                  <button
                    type='button'
                    onClick={() => setDetail(r)}
                    className='text-left font-mono text-sm font-semibold text-[#9d684e] hover:underline'
                  >
                    {prettyCode(r.code)}
                  </button>
                  <button
                    type='button'
                    onClick={() => setDetail(r)}
                    className='truncate text-left text-sm font-medium text-[#455a54]'
                  >
                    {r.customerName}
                  </button>
                  <div className='min-w-0'>
                    <p className='truncate text-sm text-[#3d3338]'>
                      {r.experienceName}
                      {r.isBirthday && (
                        <span title='Cumpleaños: beneficios aplicados'>
                          {' '}
                          🎉
                        </span>
                      )}
                      {hasPendingReceipt(r) && (
                        <span title='Mandó un comprobante: verificalo en la ficha'>
                          {' '}
                          📎
                        </span>
                      )}
                    </p>
                    <p className='font-mono text-xs text-[#7a6e6f]'>
                      {fmtDateTime(r.startAt)}
                    </p>
                    <DietaryTags
                      tags={r.dietaryTags}
                      notes={r.dietaryNotes}
                      compact
                    />
                  </div>
                  <span className='text-center text-sm text-[#455a54]'>
                    {r.quantity}
                  </span>
                  <div className='text-sm'>
                    <p className='font-medium text-[#3d3338]'>
                      {fmtPrice(r.totalAmount ?? r.amount ?? 0)}
                    </p>
                    {r.balanceDue != null && r.balanceDue > 0 && (
                      <p className='text-[11px] text-[#7a6e6f]'>
                        saldo {fmtPrice(r.balanceDue)}
                      </p>
                    )}
                  </div>
                  <span className='inline-flex w-fit rounded-md border border-[#e6dbcd] px-2 py-1 font-mono text-[11px] text-[#7a6e6f]'>
                    {r.source === 'ADMIN' ? 'Admin' : 'Público'}
                  </span>
                  <div>
                    <StatusBadge
                      label={RESERVATION_STATUS_LABEL[r.status] ?? r.status}
                      bg={bg}
                      fg={fg}
                    />
                  </div>
                  {renderActions(r)}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Mobile: tarjetas */}
      <div className='flex flex-col gap-3 md:hidden'>
        {loading ? (
          <div className='rounded-xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#7a6e6f]'>
            Cargando…
          </div>
        ) : items.length === 0 ? (
          <div className='rounded-xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#7a6e6f]'>
            {search ? `Sin resultados para “${search}”.` : 'Sin reservas.'}
          </div>
        ) : (
          items.map((r) => {
            const [bg, fg] = RESERVATION_STATUS_COLOR[r.status] ?? [
              '#f1ede6',
              '#7a6e6f',
            ];
            const actions = renderActions(r);
            return (
              <div
                key={r._id}
                className='rounded-2xl border border-[#e6dbcd] bg-white p-4'
                onClick={() => setDetail(r)}
              >
                <div className='flex items-center justify-between gap-2'>
                  <span className='font-mono text-sm font-semibold text-[#9d684e]'>
                    {prettyCode(r.code)}
                  </span>
                  <StatusBadge
                    label={RESERVATION_STATUS_LABEL[r.status] ?? r.status}
                    bg={bg}
                    fg={fg}
                  />
                </div>
                <p className='mt-1.5 text-sm font-semibold text-[#3d3338]'>
                  {r.customerName}
                </p>
                <p className='mt-1.5 text-sm text-[#3d3338]'>
                  {r.experienceName}
                  {r.isBirthday && (
                    <span title='Cumpleaños: beneficios aplicados'> 🎉</span>
                  )}
                  {hasPendingReceipt(r) && (
                    <span title='Mandó un comprobante: verificalo en la ficha'> 📎</span>
                  )}
                  <span className='ml-1.5 font-mono text-xs text-[#7a6e6f]'>
                    · {fmtDateTime(r.startAt)}
                  </span>
                </p>
                {/* Meta condensada: personas · monto (saldo) · origen, en una línea. */}
                <div className='mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm'>
                  <span className='text-[#455a54]'>{r.quantity} pers.</span>
                  <span className='text-[#c3b7a4]'>·</span>
                  <span className='font-medium text-[#3d3338]'>
                    {fmtPrice(r.totalAmount ?? r.amount ?? 0)}
                  </span>
                  {r.balanceDue != null && r.balanceDue > 0 && (
                    <span className='text-[11px] text-[#9d684e]'>
                      (saldo {fmtPrice(r.balanceDue)})
                    </span>
                  )}
                  <span className='ml-auto rounded-md border border-[#e6dbcd] px-2 py-0.5 font-mono text-[11px] text-[#7a6e6f]'>
                    {r.source === 'ADMIN' ? 'Admin' : 'Público'}
                  </span>
                  <DietaryTags
                    tags={r.dietaryTags}
                    notes={r.dietaryNotes}
                    compact
                  />
                </div>
                {actions && (
                  <div className='mt-3' onClick={(e) => e.stopPropagation()}>
                    {actions}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Pager
        page={page}
        totalPages={totalPages}
        total={total}
        from={from}
        to={to}
        onPage={setPage}
      />

      <ReservationDetailPanel
        reservation={detail}
        onClose={() => setDetail(null)}
        onCollect={(r) => {
          setDetail(null);
          setCollect(r);
        }}
        onReschedule={(r) => {
          setDetail(null);
          setReschedule(r);
        }}
        onConfirm={(r) => doResolve(r, 'confirm')}
        onCancel={doCancel}
        onUpdated={() => {
          setDetail(null);
          refresh();
        }}
        busy={busy != null}
      />

      {piecesFor && (
        <NewPieceModal
          reservation={piecesFor}
          onClose={() => setPiecesFor(null)}
          onDone={() => {
            setPiecesFor(null);
            refresh();
          }}
        />
      )}

      {collect && (
        <CollectBalanceModal
          reservation={collect}
          onClose={() => setCollect(null)}
          onDone={() => {
            setCollect(null);
            refresh();
          }}
        />
      )}

      {reschedule && (
        <RescheduleModal
          reservation={reschedule}
          onClose={() => setReschedule(null)}
          onDone={() => {
            setReschedule(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────── Nueva reserva (admin) ───────────────────────────

export function NewReservationModal({
  experiences,
  onClose,
  onDone,
}: {
  experiences: AdminExperience[];
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const picker = useSlotPicker(experiences);
  const { expId, day, time, maxParty, unit } = picker;

  const [qty, setQty] = useState('1');
  // Cliente existente (buscador) o, si no está, nombre + teléfono a mano.
  const [client, setClient] = useState<Client | null>(null);
  const [manual, setManual] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<ReservationPaymentMethod>('CASH');
  // Cobrar todo o una parte (seña); el resto queda como saldo.
  const [chargeMode, setChargeMode] = useState<ChargeMode>('total');
  const [chargeAmount, setChargeAmount] = useState('');
  // Cumpleaños: el backend aplica los beneficios (regalos, lugares
  // bonificados) sobre el precio de la experiencia elegida.
  const [isBday, setIsBday] = useState(false);
  // Para cocina: restricciones del grupo y lo que haya que saber (cumpleañero,
  // torta…). Las reservas del bot ya las traen; las del local, se cargan acá.
  const [diet, setDiet] = useState<string[]>([]);
  const [dietNotes, setDietNotes] = useState('');
  const [kitchenNotes, setKitchenNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const quantity = Math.max(1, Number(qty) || 1);
  const total = unit * quantity;

  async function submit() {
    if (!expId) return showToast.error('Elegí una experiencia');
    if (!day || !time) return showToast.error('Elegí día y horario');
    if (!client && name.trim().length < 2)
      return showToast.error('Elegí un cliente o ingresá el nombre');
    if (maxParty != null && quantity > maxParty)
      return showToast.error(`A esa hora entran hasta ${maxParty} personas`);
    const charge = partialAmount(chargeMode, chargeAmount, total);
    if (charge.error) return showToast.error(charge.error);
    setSaving(true);
    try {
      await reservationsAdmin.createReservation({
        experienceId: expId,
        date: day,
        startTime: time,
        quantity,
        ...(client
          ? {
              clientId: clientIdOf(client),
              customerName: client.fullName,
              customerEmail: client.email || undefined,
              customerPhone: client.phone || undefined,
            }
          : {
              customerName: name.trim(),
              customerPhone: phone.trim() || undefined,
            }),
        paymentMethod: method,
        amount: charge.amount,
        isBirthday: isBday || undefined,
        ...(diet.length ? { dietaryTags: diet } : {}),
        ...(dietNotes.trim() ? { dietaryNotes: dietNotes.trim() } : {}),
        ...(kitchenNotes.trim() ? { kitchenNotes: kitchenNotes.trim() } : {}),
      });
      showToast.success('Reserva creada');
      await onDone();
    } catch (e) {
      showToast.error(
        e instanceof Error ? e.message : 'No se pudo crear la reserva',
      );
    } finally {
      setSaving(false);
    }
  }

  const field =
    'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>Nueva reserva</DialogTitle>
        </DialogHeader>

        <div className='flex flex-col gap-3'>
          <FormSection
            title='1 · Cuándo'
            description={`Horario libre entre las ${picker.hours.open} y las ${picker.hours.close}; los destacados son los turnos sugeridos.`}
          >
            <SlotPicker picker={picker} experiences={experiences} />
            <FormField
              label={`Personas${maxParty != null ? ` (hasta ${maxParty})` : ''}`}
              htmlFor='res-qty'
            >
              <Input
                id='res-qty'
                type='number'
                min={1}
                max={maxParty ?? undefined}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className={cn('w-28', field)}
              />
            </FormField>
          </FormSection>

          <FormSection title='2 · Quién'>
            {manual ? (
              <>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <FormField label='Nombre y apellido' htmlFor='res-name'>
                    <Input
                      id='res-name'
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={field}
                      autoFocus
                    />
                  </FormField>
                  <FormField label='Teléfono (opcional)' htmlFor='res-phone'>
                    <Input
                      id='res-phone'
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={field}
                    />
                  </FormField>
                </div>
                <button
                  type='button'
                  onClick={() => {
                    setManual(false);
                    setName('');
                    setPhone('');
                  }}
                  className='w-fit text-xs font-medium text-[#9d684e] hover:underline'
                >
                  ← Buscar un cliente existente
                </button>
              </>
            ) : (
              <FormField label='Cliente'>
                <ClientPicker
                  value={client}
                  onChange={setClient}
                  placeholder='Buscar cliente por nombre o teléfono…'
                  onCreateNew={(q) => {
                    setClient(null);
                    setName(q);
                    setManual(true);
                  }}
                />
              </FormField>
            )}
          </FormSection>

          <FormSection title='3 · Cobro'>
            <FormField label='Cómo abona'>
              <div className='grid grid-cols-3 gap-2'>
                {PAY_METHODS.map((m) => {
                  const on = m.key === method;
                  return (
                    <Button
                      key={m.key}
                      type='button'
                      variant={on ? 'verde' : 'outline'}
                      size='sm'
                      aria-pressed={on}
                      onClick={() => setMethod(m.key)}
                      className={cn(
                        !on &&
                          'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] hover:bg-[#f3e9df]',
                      )}
                    >
                      {m.label}
                    </Button>
                  );
                })}
              </div>
            </FormField>
            <ChargeNow
              total={total}
              mode={chargeMode}
              onModeChange={setChargeMode}
              amount={chargeAmount}
              onAmountChange={setChargeAmount}
            />
          </FormSection>

          {/* Para cocina: siempre a la vista y en terracota, para que no se
              pase por alto (restricciones y alergias son lo que más importa). */}
          <section className='rounded-xl border border-linea border-t-[3px] border-t-terracota bg-white'>
            <h3 className='px-4 pt-4 text-sm font-semibold text-terracota'>
              4 · Para cocina
            </h3>
            <div className='flex flex-col gap-3 p-4 pt-3'>
              <SwitchCard
                checked={isBday}
                onChange={setIsBday}
                label='Es un cumpleaños 🎉'
                hint='Se aplican los beneficios del festejo sobre el precio de la experiencia (regalos, lugares bonificados).'
              />
              <FormField label='Restricciones alimentarias'>
                <DietaryPicker
                  tags={diet}
                  onTagsChange={setDiet}
                  notes={dietNotes}
                  onNotesChange={setDietNotes}
                />
              </FormField>
              <FormField label='Nota para cocina' htmlFor='res-kitchen'>
                <Input
                  id='res-kitchen'
                  value={kitchenNotes}
                  onChange={(e) => setKitchenNotes(e.target.value)}
                  placeholder='Cumpleañero, torta, horario…'
                  maxLength={500}
                  className={field}
                />
              </FormField>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={onClose}
            className='border-[#e6dbcd] text-[#455a54] hover:bg-[#fbf5ef]'
          >
            Cancelar
          </Button>
          <Button
            type='button'
            variant='verde'
            onClick={submit}
            disabled={saving}
          >
            {saving ? 'Creando…' : 'Crear reserva'}
          </Button>
          {/* Total siempre a la vista (footer fijo). Va último en el DOM: en
              mobile el footer está invertido y así queda arriba de los botones. */}
          {total > 0 && (
            <div className='flex flex-col text-sm text-[#455a54] sm:order-first sm:mr-auto sm:justify-center'>
              <span>
                Total <strong className='text-base'>{fmtPrice(total)}</strong>{' '}
                <span className='text-texto-suave'>
                  ({quantity} × {fmtPrice(unit)})
                </span>
              </span>
              {isBday && (
                <span className='text-[11px] text-[#6d5a78]'>
                  Estimado: los beneficios de cumpleaños se calculan al crear.
                </span>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Tarjeta clickeable tipo checkbox (ej. "Es un cumpleaños"). */
function SwitchCard({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type='button'
      role='checkbox'
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition',
        checked
          ? 'border-[#6d5a78] bg-[#efe6f2] text-[#6d5a78]'
          : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]',
      )}
    >
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px]',
          checked
            ? 'border-[#6d5a78] bg-[#6d5a78] text-white'
            : 'border-[#c9bfb0] bg-white',
        )}
      >
        {checked ? '✓' : ''}
      </span>
      <span>
        {label}
        <span className='block text-[11px] text-texto-suave'>{hint}</span>
      </span>
    </button>
  );
}

// ─────────────────────────── Reprogramar (sin cambios de lógica) ───────────────────────────

export function RescheduleModal({
  reservation,
  onClose,
  onDone,
}: {
  reservation: ReservationItem;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const confirm = useConfirm();
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const insideWindow =
    new Date(reservation.startAt).getTime() - Date.now() <
    RESCHEDULE_MIN_HOURS * 3600_000;

  useEffect(() => {
    (async () => {
      try {
        const all = await reservationsAdmin.listSessions({
          experienceId: reservation.experienceId,
        });
        setSessions(all.filter((s) => s.id !== reservation.sessionId));
      } catch (e) {
        showToast.error(
          e instanceof Error ? e.message : 'Error al cargar turnos',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [reservation]);

  async function submit() {
    if (!selected) {
      showToast.error('Elegí el nuevo turno');
      return;
    }
    if (insideWindow) {
      const ok = await confirm({
        title: 'Reprogramar dentro de la ventana',
        description:
          `Faltan menos de ${RESCHEDULE_MIN_HOURS} hs para el turno original. ` +
          '¿Reprogramar igual (override admin)?',
        confirmLabel: 'Reprogramar igual',
        variant: 'normal',
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      await reservationsAdmin.rescheduleReservation(
        reservation._id,
        selected,
        insideWindow,
      );
      showToast.success('Reserva reprogramada; se avisó al cliente');
      await onDone();
    } catch (e) {
      showToast.error(
        e instanceof Error ? e.message : 'No se pudo reprogramar',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Reprogramar reserva</DialogTitle>
          <DialogDescription>
            {reservation.experienceName} · {prettyCode(reservation.code)} ·{' '}
            {reservation.quantity} pers. · actual:{' '}
            {fmtDateTime(reservation.startAt)}
          </DialogDescription>
        </DialogHeader>

        {insideWindow && (
          <p className='rounded-lg border border-[#e0b98a] bg-[#fdf6ec] px-3 py-2 text-xs text-[#8a5a2a]'>
            Faltan menos de {RESCHEDULE_MIN_HOURS} hs para el turno: por
            política no se aceptan modificaciones. Podés forzarla como admin.
          </p>
        )}

        <div className='max-h-72 space-y-1.5 overflow-y-auto'>
          {loading ? (
            <p className='p-3 text-sm text-[#7a6e6f]'>Cargando turnos…</p>
          ) : sessions.length === 0 ? (
            <p className='p-3 text-sm text-[#7a6e6f]'>
              No hay otros turnos de esta experiencia.
            </p>
          ) : (
            sessions.map((s) => {
              const noSeats = s.seatsAvailable < reservation.quantity;
              const otherPrice = s.price !== reservation.unitPrice;
              const disabled = noSeats || otherPrice;
              const on = selected === s.id;
              return (
                <button
                  key={s.id}
                  type='button'
                  disabled={disabled}
                  onClick={() => setSelected(s.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    on
                      ? 'border-[#455a54] bg-[#E7F0EC] text-[#455a54]'
                      : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]',
                    disabled && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <span className='font-mono text-xs'>
                    {fmtDateTime(s.startAt)}
                  </span>
                  <span className='text-xs text-[#7a6e6f]'>
                    {noSeats
                      ? 'sin cupo'
                      : otherPrice
                        ? 'otro precio'
                        : `${s.seatsAvailable} lugares`}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='terracota'
            onClick={submit}
            disabled={saving || !selected}
            className='w-full'
          >
            {saving ? 'REPROGRAMANDO…' : 'REPROGRAMAR'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────── Cobrar saldo (todo o una parte) ───────────────────────────

export function CollectBalanceModal({
  reservation,
  onClose,
  onDone,
}: {
  reservation: ReservationItem;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const balance = reservation.balanceDue ?? 0;
  const [method, setMethod] = useState<ReservationPaymentMethod>('CASH');
  const [amount, setAmount] = useState<string>(String(balance));
  const [saving, setSaving] = useState(false);
  const value = Number(amount) || 0;
  const remaining = Math.max(0, balance - value);

  async function submit() {
    if (!value || value <= 0) {
      showToast.error('Ingresá un monto válido');
      return;
    }
    if (value > balance) {
      showToast.error(`El saldo es ${fmtPrice(balance)}`);
      return;
    }
    setSaving(true);
    try {
      await reservationsAdmin.collectBalance(reservation._id, [
        { method, amount: value },
      ]);
      showToast.success(
        remaining > 0
          ? `Cobro registrado · queda ${fmtPrice(remaining)}`
          : 'Saldo cobrado',
      );
      await onDone();
    } catch (e) {
      showToast.error(
        e instanceof Error ? e.message : 'No se pudo cobrar el saldo',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Cobrar saldo</DialogTitle>
          <DialogDescription>
            {reservation.experienceName} · {prettyCode(reservation.code)} ·
            saldo {fmtPrice(balance)}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3'>
          <div className='space-y-1.5'>
            <label className='text-[13px] font-medium text-[#455a54]'>
              Medio de pago
            </label>
            <div className='grid grid-cols-3 gap-2'>
              {PAY_METHODS.map((m) => {
                const on = m.key === method;
                return (
                  <Button
                    key={m.key}
                    type='button'
                    variant={on ? 'terracota' : 'outline'}
                    size='sm'
                    onClick={() => setMethod(m.key)}
                    className={cn(
                      !on &&
                        'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] hover:bg-[#f3e9df]',
                    )}
                  >
                    {m.label}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className='space-y-1.5'>
            <label className='text-[13px] font-medium text-[#455a54]'>
              Monto a cobrar
            </label>
            <Input
              type='number'
              inputMode='decimal'
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className='border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30'
            />
            <p className='text-[12px] text-[#7a6e6f]'>
              {remaining > 0 && value > 0
                ? `Cobro parcial: queda ${fmtPrice(remaining)} de saldo para después.`
                : 'Podés cobrar una parte; el resto queda como saldo.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='terracota'
            onClick={submit}
            disabled={saving}
            className='w-full'
          >
            {saving ? 'COBRANDO…' : 'CONFIRMAR COBRO'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
