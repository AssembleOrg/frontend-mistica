'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Ban,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  List,
  Plus,
  Search,
  Wallet,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { ReservasCalendar } from './reservas-calendar';
import { ReservationDetailPanel } from './reservation-detail-panel';

const LIMIT = 20;

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

type View = 'list' | 'calendar';

export function ReservasTab() {
  const [view, setView] = useState<View>('list');
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [collect, setCollect] = useState<ReservationItem | null>(null);
  const [reschedule, setReschedule] = useState<ReservationItem | null>(null);
  const [detail, setDetail] = useState<ReservationItem | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [experiences, setExperiences] = useState<AdminExperience[]>([]);
  const [expFilter, setExpFilter] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tick, setTick] = useState(0);

  const refresh = () => setTick((t) => t + 1);

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
  }, [status, search, expFilter, page]);

  useEffect(() => {
    if (view === 'list') load();
  }, [load, view, tick]);

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
  }, [search, expFilter, tick]);

  async function doCancel(r: ReservationItem) {
    if (
      !confirm(
        `¿Cancelar la reserva ${prettyCode(r.code)}? Libera el cupo y reembolsa si fue MercadoPago.`,
      )
    )
      return;
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
      showToast.success(action === 'confirm' ? 'Reserva confirmada' : 'Reserva cancelada');
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
    const canCancel = ['PENDING', 'CONFIRMED', 'NEEDS_REVIEW'].includes(r.status);
    if (!canConfirm && !canCollect && !canReschedule && !canCancel)
      return <span className='text-sm text-[#7a6e6f]'>—</span>;
    return (
      <div className='flex items-center justify-end gap-1.5'>
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
      {/* Fila de controles: vista + experiencia + nueva reserva */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='inline-flex items-center rounded-[11px] border border-[#e6dbcd] bg-[#fbf5ef] p-1'>
          {(
            [
              ['list', 'Lista', List],
              ['calendar', 'Calendario', CalendarDays],
            ] as const
          ).map(([key, label, Icon]) => {
            const on = view === key;
            return (
              <button
                key={key}
                type='button'
                onClick={() => setView(key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors',
                  on ? 'bg-[#455a54] text-white' : 'text-[#7a6e6f] hover:text-[#455a54]',
                )}
              >
                <Icon className='h-[15px] w-[15px]' />
                {label}
              </button>
            );
          })}
        </div>
        <div className='flex flex-wrap items-center gap-2.5'>
          <select
            value={expFilter}
            onChange={(e) => {
              setExpFilter(e.target.value);
              setPage(1);
            }}
            className='h-10 rounded-[10px] border border-[#e6dbcd] bg-white px-3 text-[13px] font-medium text-[#3d3338] focus-visible:border-[#9d684e] focus-visible:outline-none sm:h-9'
          >
            <option value=''>Todas las experiencias</option>
            {experiences.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name}
              </option>
            ))}
          </select>
          <Button type='button' variant='verde' className='gap-2' onClick={() => setNewOpen(true)}>
            <Plus className='h-4 w-4' />
            Nueva reserva
          </Button>
        </div>
      </div>

      {view === 'calendar' ? (
        <ReservasCalendar
          experienceId={expFilter || undefined}
          onOpen={setDetail}
          refreshKey={tick}
        />
      ) : (
        <>
          {/* Filtros de estado con contador + búsqueda */}
          <div className='flex flex-wrap items-center gap-x-3 gap-y-2.5'>
            <div className='flex flex-wrap items-center gap-2'>
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
            <div className='relative w-full sm:ml-auto sm:w-72'>
              <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a99]' />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder='Buscar por código, nombre o teléfono'
                className='rounded-full border-[#e6dbcd] bg-white pl-9 text-[#455a54] placeholder:text-[#a99] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30'
              />
            </div>
          </div>

          {/* Desktop: tabla */}
          <div className='hidden overflow-x-auto rounded-2xl border border-[#e6dbcd] bg-white md:block'>
            <div className='min-w-[56rem]'>
              <div className='grid grid-cols-[6rem_11rem_1fr_3.5rem_8rem_6rem_8rem_8.5rem] items-center gap-3 border-b border-[#e6dbcd] bg-[#fbf5ef] px-5 py-3 font-mono text-[11px] tracking-wider text-[#7a6e6f]'>
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
                        'grid grid-cols-[6rem_11rem_1fr_3.5rem_8rem_6rem_8rem_8.5rem] items-center gap-3 border-b border-[#e6dbcd] px-5 py-3.5 last:border-0 transition-colors hover:bg-[#fbf5ef]/50',
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
                        <p className='truncate text-sm text-[#3d3338]'>{r.experienceName}</p>
                        <p className='font-mono text-xs text-[#7a6e6f]'>
                          {fmtDateTime(r.startAt)}
                        </p>
                        <DietaryTags
                          tags={r.dietaryTags}
                          notes={r.dietaryNotes}
                          compact
                        />
                      </div>
                      <span className='text-center text-sm text-[#455a54]'>{r.quantity}</span>
                      <div className='text-sm'>
                        <p className='font-medium text-[#3d3338]'>{fmtPrice(r.amount)}</p>
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
                    <p className='mt-2 text-sm text-[#3d3338]'>{r.experienceName}</p>
                    <p className='font-mono text-xs text-[#7a6e6f]'>{fmtDateTime(r.startAt)}</p>
                    <div className='mt-1.5'>
                      <DietaryTags
                        tags={r.dietaryTags}
                        notes={r.dietaryNotes}
                        compact
                      />
                    </div>
                    <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm'>
                      <span className='text-[#455a54]'>{r.quantity} pers.</span>
                      <span className='font-medium text-[#3d3338]'>{fmtPrice(r.amount)}</span>
                      {r.balanceDue != null && r.balanceDue > 0 && (
                        <span className='text-[11px] text-[#7a6e6f]'>
                          saldo {fmtPrice(r.balanceDue)}
                        </span>
                      )}
                      <span className='rounded-md border border-[#e6dbcd] px-2 py-0.5 font-mono text-[11px] text-[#7a6e6f]'>
                        {r.source === 'ADMIN' ? 'Admin' : 'Público'}
                      </span>
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
        </>
      )}

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
        busy={busy != null}
      />

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

      {newOpen && (
        <NewReservationModal
          experiences={experiences}
          onClose={() => setNewOpen(false)}
          onDone={() => {
            setNewOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────── Nueva reserva (admin) ───────────────────────────

function NewReservationModal({
  experiences,
  onClose,
  onDone,
}: {
  experiences: AdminExperience[];
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const [expId, setExpId] = useState('');
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [qty, setQty] = useState('1');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<ReservationPaymentMethod>('CASH');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!expId) {
      setSessions([]);
      setSessionId('');
      return;
    }
    setLoadingSessions(true);
    reservationsAdmin
      .listSessions({ experienceId: expId, status: 'OPEN' })
      .then((all) => setSessions(all.filter((s) => s.seatsAvailable > 0)))
      .catch(() => setSessions([]))
      .finally(() => setLoadingSessions(false));
  }, [expId]);

  const session = sessions.find((s) => s.id === sessionId) ?? null;
  const quantity = Math.max(1, Number(qty) || 1);
  const total = session ? session.price * quantity : 0;

  async function submit() {
    if (!sessionId) return showToast.error('Elegí un turno');
    if (name.trim().length < 2) return showToast.error('Ingresá el nombre del cliente');
    if (session && quantity > session.seatsAvailable)
      return showToast.error(`Solo quedan ${session.seatsAvailable} lugares`);
    setSaving(true);
    try {
      await reservationsAdmin.createReservation({
        sessionId,
        quantity,
        customerName: name.trim(),
        customerPhone: phone.trim() || undefined,
        paymentMethod: method,
      });
      showToast.success('Reserva creada');
      await onDone();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo crear la reserva');
    } finally {
      setSaving(false);
    }
  }

  const field =
    'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Nueva reserva</DialogTitle>
          <DialogDescription>Cargá una reserva desde el panel.</DialogDescription>
        </DialogHeader>

        <div className='space-y-3.5'>
          <div className='space-y-1.5'>
            <label className='text-[13px] font-medium text-[#455a54]'>Experiencia</label>
            <select
              value={expId}
              onChange={(e) => setExpId(e.target.value)}
              className={cn('h-10 w-full rounded-md border px-3 text-sm sm:h-9', field)}
            >
              <option value=''>Elegí una experiencia…</option>
              {experiences
                .filter((e) => e.bookableOnline !== false)
                .map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.name}
                  </option>
                ))}
            </select>
          </div>

          {expId && (
            <div className='space-y-1.5'>
              <label className='text-[13px] font-medium text-[#455a54]'>Turno</label>
              {loadingSessions ? (
                <p className='text-sm text-[#7a6e6f]'>Cargando turnos…</p>
              ) : sessions.length === 0 ? (
                <p className='text-sm text-[#7a6e6f]'>No hay turnos con lugar para esta experiencia.</p>
              ) : (
                <div className='max-h-44 space-y-1.5 overflow-y-auto'>
                  {sessions.map((s) => {
                    const on = s.id === sessionId;
                    return (
                      <button
                        key={s.id}
                        type='button'
                        onClick={() => setSessionId(s.id)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                          on
                            ? 'border-[#455a54] bg-[#E7F0EC] text-[#455a54]'
                            : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]',
                        )}
                      >
                        <span className='font-mono text-xs'>{fmtDateTime(s.startAt)}</span>
                        <span className='text-xs text-[#7a6e6f]'>{s.seatsAvailable} lugares</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <label className='text-[13px] font-medium text-[#455a54]'>Personas</label>
              <Input
                type='number'
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className={field}
              />
            </div>
            <div className='space-y-1.5'>
              <label className='text-[13px] font-medium text-[#455a54]'>Teléfono</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder='Opcional'
                className={field}
              />
            </div>
          </div>

          <div className='space-y-1.5'>
            <label className='text-[13px] font-medium text-[#455a54]'>Nombre y apellido</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={field}
            />
          </div>

          <div className='space-y-1.5'>
            <label className='text-[13px] font-medium text-[#455a54]'>Cómo abona</label>
            <div className='grid grid-cols-3 gap-2'>
              {PAY_METHODS.map((m) => {
                const on = m.key === method;
                return (
                  <Button
                    key={m.key}
                    type='button'
                    variant={on ? 'verde' : 'outline'}
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

          {session && (
            <div className='flex items-center justify-between rounded-lg bg-[#fbf5ef] px-3 py-2 text-sm'>
              <span className='text-[#7a6e6f]'>Total</span>
              <span className='font-semibold text-[#3d3338]'>{fmtPrice(total)}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='verde'
            onClick={submit}
            disabled={saving || !sessionId}
            className='w-full'
          >
            {saving ? 'CREANDO…' : 'CREAR RESERVA'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────── Reprogramar (sin cambios de lógica) ───────────────────────────

function RescheduleModal({
  reservation,
  onClose,
  onDone,
}: {
  reservation: ReservationItem;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
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
        showToast.error(e instanceof Error ? e.message : 'Error al cargar turnos');
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
    if (
      insideWindow &&
      !confirm(
        `Faltan menos de ${RESCHEDULE_MIN_HOURS} hs para el turno original. ` +
          '¿Reprogramar igual (override admin)?',
      )
    )
      return;
    setSaving(true);
    try {
      await reservationsAdmin.rescheduleReservation(reservation._id, selected, insideWindow);
      showToast.success('Reserva reprogramada; se avisó al cliente');
      await onDone();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo reprogramar');
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
            {reservation.quantity} pers. · actual: {fmtDateTime(reservation.startAt)}
          </DialogDescription>
        </DialogHeader>

        {insideWindow && (
          <p className='rounded-lg border border-[#e0b98a] bg-[#fdf6ec] px-3 py-2 text-xs text-[#8a5a2a]'>
            Faltan menos de {RESCHEDULE_MIN_HOURS} hs para el turno: por política no se
            aceptan modificaciones. Podés forzarla como admin.
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
                  <span className='font-mono text-xs'>{fmtDateTime(s.startAt)}</span>
                  <span className='text-xs text-[#7a6e6f]'>
                    {noSeats ? 'sin cupo' : otherPrice ? 'otro precio' : `${s.seatsAvailable} lugares`}
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

// ─────────────────────────── Cobrar saldo (sin cambios de lógica) ───────────────────────────

function CollectBalanceModal({
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

  async function submit() {
    const value = Number(amount);
    if (!value || value <= 0) {
      showToast.error('Ingresá un monto válido');
      return;
    }
    setSaving(true);
    try {
      await reservationsAdmin.collectBalance(reservation._id, [{ method, amount: value }]);
      showToast.success('Saldo cobrado');
      await onDone();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo cobrar el saldo');
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
            {reservation.experienceName} · {prettyCode(reservation.code)} · saldo{' '}
            {fmtPrice(balance)}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3'>
          <div className='space-y-1.5'>
            <label className='text-[13px] font-medium text-[#455a54]'>Medio de pago</label>
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
            <label className='text-[13px] font-medium text-[#455a54]'>Monto a cobrar</label>
            <Input
              type='number'
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className='border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30'
            />
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
