'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { fmtDate } from '@/lib/reservas-format';
import {
  piecesAdmin,
  PIECE_STATUS_LABEL,
  PIECE_STATUS_ORDER,
  type PieceItem,
  type PieceStatus,
  type CreatePieceInput,
} from '@/services/pieces.admin.service';
import {
  reservationsAdmin,
  type AdminExperience,
  type ReservationItem,
} from '@/services/reservations.admin.service';
import {
  professorsAdmin,
  type Professor,
} from '@/services/professors.admin.service';
import { useAuth } from '@/hooks/useAuth';
import { normalizePhoneAR, phoneCoreAR } from '@/lib/utils/whatsapp';
import { FilterChip, IconBtn, Pager, StatusBadge } from './_shared';

const LIMIT = 20;

// Etapas "en proceso" (previas a estar lista). El resto son estados finales.
const IN_PROCESS: PieceStatus[] = [
  'SECADO',
  'PRIMERA_HORNEADA',
  'ESMALTADO',
  'SEGUNDA_HORNEADA',
];

// Color del badge/chip por estado: en proceso → terracota suave, lista → verde,
// retirada → piedra.
function statusColors(s: PieceStatus): { bg: string; fg: string } {
  if (s === 'LISTA') return { bg: '#E7F0EC', fg: '#455a54' };
  if (s === 'RETIRADA') return { bg: '#f1ede6', fg: '#7a6e6f' };
  return { bg: '#F6E9DC', fg: '#cc844a' };
}

// Filtros: "Todas" + uno por estado, con el acento/tinte de cada estado.
const FILTERS: { key: string; label: string; color: string; tint: string }[] = [
  { key: '', label: 'Todas', color: '#455a54', tint: '#E7F0EC' },
  ...PIECE_STATUS_ORDER.map((s) => {
    const { bg, fg } = statusColors(s);
    return { key: s, label: PIECE_STATUS_LABEL[s], color: fg, tint: bg };
  }),
];

const COLS =
  'grid grid-cols-[9rem_8.5rem_1fr_8rem_9.5rem_9rem_7rem_11.5rem] items-center gap-3';
const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

// Barra de progreso de 6 segmentos según la etapa de la pieza.
function ProgressStepper({ status }: Readonly<{ status: PieceStatus }>) {
  const stage = PIECE_STATUS_ORDER.indexOf(status) + 1; // 1..6
  const fill =
    status === 'RETIRADA' ? '#7a6e6f' : stage >= 5 ? '#455a54' : '#9d684e';
  return (
    <div className='flex items-center gap-1'>
      {Array.from({ length: 6 }, (_, i) => (
        <span
          key={i}
          className='h-1.5 flex-1 rounded-full'
          style={{ backgroundColor: i + 1 <= stage ? fill : '#e6dbcd' }}
        />
      ))}
    </div>
  );
}

// Texto de la columna "Retiro".
function retiroNode(p: PieceItem) {
  if (p.status === 'RETIRADA') {
    return (
      <span className='text-xs text-[#7a6e6f]'>
        Retirada
        {p.pickedUpAt ? ` · ${fmtDate(p.pickedUpAt)}` : ''}
      </span>
    );
  }
  if (p.status === 'LISTA') {
    return <span className='text-xs text-[#455a54]'>Lista para retirar</span>;
  }
  return <span className='text-xs text-[#7a6e6f]'>—</span>;
}

export function PiezasTab() {
  const { user } = useAuth();
  // Cuentas comunes (ej. profesores) sólo OBSERVAN el estado de las piezas:
  // sin alta, sin borrado y sin cambiar la etapa.
  const canManage = user?.role === 'admin';
  const [items, setItems] = useState<PieceItem[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [professorId, setProfessorId] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    professorsAdmin
      .list()
      .then(setProfessors)
      .catch(() => setProfessors([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await piecesAdmin.list({
        status: status || undefined,
        search: search || undefined,
        professorId: professorId || undefined,
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
  }, [status, search, professorId, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(p: PieceItem, next: PieceStatus) {
    if (next === p.status) return;
    setBusy(p._id);
    try {
      await piecesAdmin.update(p._id, { status: next });
      showToast.success(
        next === 'LISTA'
          ? 'Pieza lista — se avisó al cliente'
          : 'Estado actualizado',
      );
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setBusy(null);
    }
  }

  async function remove(p: PieceItem) {
    if (!confirm('¿Eliminar este registro de pieza?')) return;
    setBusy(p._id);
    try {
      await piecesAdmin.remove(p._id);
      showToast.success('Pieza eliminada');
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo eliminar');
    } finally {
      setBusy(null);
    }
  }

  function statusSelect(p: PieceItem) {
    return (
      <Select
        value={p.status}
        onValueChange={(v) => changeStatus(p, v as PieceStatus)}
        disabled={busy === p._id}
      >
        <SelectTrigger className={cn('h-8 w-full text-xs', fieldCls)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PIECE_STATUS_ORDER.map((s) => (
            <SelectItem key={s} value={s}>
              {PIECE_STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to = (page - 1) * LIMIT + items.length;

  return (
    <div className='flex flex-col gap-5'>
      {/* Filtros de estado + búsqueda + nueva pieza */}
      <div className='flex flex-wrap items-center gap-x-3 gap-y-2.5'>
        <div className='flex flex-wrap items-center gap-2'>
          {FILTERS.map((f) => (
            <FilterChip
              key={f.key || 'all'}
              label={f.label}
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
        <div className='flex w-full flex-wrap items-center gap-2.5 sm:ml-auto sm:w-auto'>
          {professors.length > 0 && (
            <Select
              value={professorId || 'all'}
              onValueChange={(v) => {
                setProfessorId(v === 'all' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className={cn('h-9 w-44 rounded-full text-xs', fieldCls)}>
                <SelectValue placeholder='Profesor' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Todos los profesores</SelectItem>
                {professors.map((pr) => (
                  <SelectItem key={pr.id} value={pr.id}>
                    {pr.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className='relative w-full sm:w-72'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a99]' />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder='Buscar por nombre, teléfono o experiencia'
              className='rounded-full border-[#e6dbcd] bg-white pl-9 text-[#455a54] placeholder:text-[#a99] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30'
            />
          </div>
          {canManage && (
            <Button
              type='button'
              variant='verde'
              onClick={() => setCreating(true)}
              className='shrink-0 gap-2'
            >
              <Plus className='h-4 w-4' />
              Nueva pieza
            </Button>
          )}
        </div>
      </div>

      {/* Desktop: tabla */}
      <div className='hidden overflow-x-auto rounded-2xl border border-[#e6dbcd] bg-white md:block'>
        <div className='min-w-[60rem]'>
          <div
            className={`${COLS} border-b border-[#e6dbcd] bg-[#fbf5ef] px-5 py-3 font-mono text-[11px] tracking-wider text-[#7a6e6f]`}
          >
            <span>CLIENTE</span>
            <span>EXPERIENCIA</span>
            <span>PIEZA</span>
            <span>PROFESOR</span>
            <span>PROGRESO</span>
            <span>ESTADO</span>
            <span>RETIRO</span>
            <span />
          </div>
          {loading ? (
            <div className='p-6 text-sm text-[#7a6e6f]'>Cargando…</div>
          ) : items.length === 0 ? (
            <div className='p-6 text-sm text-[#7a6e6f]'>
              {search ? `Sin resultados para “${search}”.` : 'Sin piezas cargadas.'}
            </div>
          ) : (
            items.map((p) => {
              const { bg, fg } = statusColors(p.status);
              return (
                <div
                  key={p._id}
                  className={cn(
                    `${COLS} border-b border-[#e6dbcd] px-5 py-3.5 last:border-0`,
                    p.status === 'RETIRADA' && 'opacity-60',
                  )}
                >
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-medium text-[#3d3338]'>
                      {p.customerName || p.customerPhone || '—'}
                    </p>
                    <p className='truncate font-mono text-xs text-[#7a6e6f]'>
                      {p.reservationCode
                        ? `Reserva ${p.reservationCode}`
                        : p.customerName
                          ? p.customerPhone
                          : ''}
                    </p>
                  </div>
                  <span className='truncate text-sm text-[#7a6e6f]'>
                    {p.experienceName || '—'}
                  </span>
                  <span className='truncate text-sm text-[#3d3338]'>
                    {p.notes || `${p.quantity} pieza(s)`}
                  </span>
                  <span className='truncate text-sm text-[#7a6e6f]'>
                    {p.professorName || '—'}
                  </span>
                  <ProgressStepper status={p.status} />
                  <div>
                    <StatusBadge label={PIECE_STATUS_LABEL[p.status]} bg={bg} fg={fg} />
                  </div>
                  <div>{retiroNode(p)}</div>
                  <div className='flex items-center justify-end gap-2'>
                    {canManage ? (
                      <>
                        <div className='w-[8rem]'>{statusSelect(p)}</div>
                        <IconBtn
                          icon={Trash2}
                          title='Eliminar'
                          tone='rojo'
                          disabled={busy === p._id}
                          onClick={() => remove(p)}
                        />
                      </>
                    ) : (
                      <span className='text-[11px] text-[#a99f92]'>sólo lectura</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Mobile: tarjetas */}
      <div className='flex flex-col gap-3 md:hidden'>
        {loading ? (
          <div className='rounded-2xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#7a6e6f]'>
            Cargando…
          </div>
        ) : items.length === 0 ? (
          <div className='rounded-2xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#7a6e6f]'>
            {search ? `Sin resultados para “${search}”.` : 'Sin piezas cargadas.'}
          </div>
        ) : (
          items.map((p) => {
            const { bg, fg } = statusColors(p.status);
            return (
              <div
                key={p._id}
                className={cn(
                  'rounded-2xl border border-[#e6dbcd] bg-white p-4',
                  p.status === 'RETIRADA' && 'opacity-60',
                )}
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-medium text-[#3d3338]'>
                      {p.customerName || p.customerPhone}
                    </p>
                    {p.customerName && (
                      <p className='truncate font-mono text-xs text-[#7a6e6f]'>
                        {p.customerPhone}
                      </p>
                    )}
                  </div>
                  <StatusBadge label={PIECE_STATUS_LABEL[p.status]} bg={bg} fg={fg} />
                </div>
                <p className='mt-2 text-sm text-[#3d3338]'>
                  {p.notes || `${p.quantity} pieza(s)`}
                </p>
                <p className='text-xs text-[#7a6e6f]'>
                  {[p.experienceName, p.professorName && `Prof. ${p.professorName}`, p.reservationCode && `Reserva ${p.reservationCode}`]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </p>
                <div className='mt-3'>
                  <ProgressStepper status={p.status} />
                </div>
                <div className='mt-3 flex items-center justify-between gap-2'>
                  {retiroNode(p)}
                  {canManage && (
                    <div className='flex items-center gap-2'>
                      <div className='w-[9rem]'>{statusSelect(p)}</div>
                      <IconBtn
                        icon={Trash2}
                        title='Eliminar'
                        tone='rojo'
                        disabled={busy === p._id}
                        onClick={() => remove(p)}
                      />
                    </div>
                  )}
                </div>
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

      {creating && (
        <NewPieceModal
          professors={professors}
          onClose={() => setCreating(false)}
          onDone={async () => {
            setCreating(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function NewPieceModal({
  professors,
  onClose,
  onDone,
}: Readonly<{
  professors: Professor[];
  onClose: () => void;
  onDone: () => void | Promise<void>;
}>) {
  // Camino NORMAL: la pieza se asigna a una RESERVA (el contacto ya está ahí).
  // El modo manual queda para piezas sin reserva (huérfanas, históricas).
  const [mode, setMode] = useState<'reserva' | 'manual'>('reserva');

  // Búsqueda de reserva por nombre / código / teléfono.
  const [resSearch, setResSearch] = useState('');
  const [resResults, setResResults] = useState<ReservationItem[]>([]);
  const [resLoading, setResLoading] = useState(false);
  const [reservation, setReservation] = useState<ReservationItem | null>(null);

  const [professorId, setProfessorId] = useState('');
  const [form, setForm] = useState<CreatePieceInput>({
    customerPhone: '',
    customerName: '',
    experienceName: '',
    quantity: 1,
    status: 'SECADO',
  });
  const [qtyInput, setQtyInput] = useState('1');
  const [notes, setNotes] = useState('');
  const [experiences, setExperiences] = useState<AdminExperience[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setExperiences(await reservationsAdmin.listExperiences(false));
      } catch {
        /* si falla, el select queda vacío y se avisa en submit */
      }
    })();
  }, []);

  // Reservas que matchean la búsqueda (debounce corto).
  useEffect(() => {
    if (mode !== 'reserva' || reservation) return;
    const term = resSearch.trim();
    let alive = true;
    setResLoading(true);
    const t = setTimeout(() => {
      reservationsAdmin
        .listReservations({ search: term || undefined, limit: 8 })
        .then((res) => {
          if (alive) setResResults(res.items);
        })
        .catch(() => {
          if (alive) setResResults([]);
        })
        .finally(() => {
          if (alive) setResLoading(false);
        });
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [resSearch, mode, reservation]);

  const phoneCore = useMemo(
    () => phoneCoreAR(form.customerPhone ?? ''),
    [form.customerPhone],
  );
  const phoneValid = phoneCore.length >= 6;

  async function submit() {
    const quantity = Math.trunc(Number(qtyInput));
    if (!Number.isFinite(quantity) || quantity < 1) {
      showToast.error('La cantidad debe ser 1 o más');
      return;
    }

    if (mode === 'reserva') {
      if (!reservation) {
        showToast.error('Elegí la reserva a la que pertenece la pieza');
        return;
      }
    } else {
      if (!form.customerPhone?.trim()) {
        showToast.error('El teléfono es obligatorio');
        return;
      }
      if (!phoneValid) {
        showToast.error('Teléfono inválido: revisá el número (área + abonado)');
        return;
      }
      if (!form.experienceName?.trim()) {
        showToast.error('Elegí una experiencia');
        return;
      }
    }

    setSaving(true);
    try {
      await piecesAdmin.create(
        mode === 'reserva'
          ? {
              reservationId: reservation!._id,
              professorId: professorId || undefined,
              quantity,
              status: form.status,
              notes: notes.trim() || undefined,
            }
          : {
              ...form,
              customerPhone: normalizePhoneAR(form.customerPhone ?? ''),
              professorId: professorId || undefined,
              quantity,
              notes: notes.trim() || undefined,
            },
      );
      showToast.success('Pieza cargada');
      await onDone();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-left'>
          <DialogTitle className='font-tan-nimbus text-xl text-[#455a54]'>
            Nueva pieza
          </DialogTitle>
        </DialogHeader>

        <div className='flex flex-col gap-3'>
          {/* Origen: reserva (normal) o carga manual */}
          <div className='flex gap-1.5'>
            <button
              type='button'
              onClick={() => setMode('reserva')}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                mode === 'reserva'
                  ? 'border-[#455a54] bg-[#455a54] text-white'
                  : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]',
              )}
            >
              Desde una reserva
            </button>
            <button
              type='button'
              onClick={() => setMode('manual')}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                mode === 'manual'
                  ? 'border-[#455a54] bg-[#455a54] text-white'
                  : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]',
              )}
            >
              Sin reserva (manual)
            </button>
          </div>

          {mode === 'reserva' ? (
            reservation ? (
              <div className='flex items-center justify-between gap-2 rounded-xl border border-[#455a54]/30 bg-[#E7F0EC] px-3.5 py-2.5'>
                <div className='min-w-0'>
                  <p className='truncate text-sm font-semibold text-[#3d3338]'>
                    {reservation.customerName}
                    <span className='ml-2 font-mono text-[11px] font-normal text-[#7a6e6f]'>
                      {reservation.code}
                    </span>
                  </p>
                  <p className='truncate text-[12px] text-[#7a6e6f]'>
                    {reservation.experienceName}
                    {reservation.customerPhone ? ` · ${reservation.customerPhone}` : ''}
                  </p>
                </div>
                <button
                  type='button'
                  onClick={() => setReservation(null)}
                  className='shrink-0 text-[12px] font-medium text-[#9d684e] underline-offset-2 hover:underline'
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <Field label='Reserva (contacto y experiencia salen de acá)'>
                <div className='relative'>
                  <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a99]' />
                  <Input
                    value={resSearch}
                    onChange={(e) => setResSearch(e.target.value)}
                    placeholder='Buscá por nombre, código o teléfono'
                    className={cn('pl-9', fieldCls)}
                  />
                </div>
                <div className='max-h-44 overflow-y-auto rounded-xl border border-[#e6dbcd]'>
                  {resLoading ? (
                    <p className='p-3 text-sm text-[#7a6e6f]'>Buscando…</p>
                  ) : resResults.length === 0 ? (
                    <p className='p-3 text-sm text-[#7a6e6f]'>Sin reservas que coincidan.</p>
                  ) : (
                    resResults.map((r) => (
                      <button
                        key={r._id}
                        type='button'
                        onClick={() => setReservation(r)}
                        className='flex w-full items-center justify-between gap-2 border-b border-[#e6dbcd] px-3 py-2 text-left last:border-0 hover:bg-[#fbf5ef]'
                      >
                        <span className='min-w-0'>
                          <span className='block truncate text-sm font-medium text-[#3d3338]'>
                            {r.customerName}
                          </span>
                          <span className='block truncate text-[12px] text-[#7a6e6f]'>
                            {r.experienceName}
                            {r.startAt ? ` · ${fmtDate(r.startAt)}` : ''}
                          </span>
                        </span>
                        <span className='shrink-0 font-mono text-[11px] text-[#a99f92]'>
                          {r.code}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </Field>
            )
          ) : (
            <>
              <Field label='Teléfono del cliente'>
                <Input
                  value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  placeholder='11 3456-7890'
                  className={fieldCls}
                />
                {(form.customerPhone ?? '').trim() &&
                  (phoneValid ? (
                    <span className='font-mono text-[11px] text-[#7a6e6f]'>
                      Se guarda como {normalizePhoneAR(form.customerPhone ?? '')}
                    </span>
                  ) : (
                    <span className='text-[11px] text-[#b23b2e]'>
                      Número incompleto — revisá área + abonado.
                    </span>
                  ))}
              </Field>
              <Field label='Nombre'>
                <Input
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  className={fieldCls}
                />
              </Field>
              <Field label='Experiencia'>
                <Select
                  value={form.experienceName || undefined}
                  onValueChange={(v) => setForm({ ...form, experienceName: v })}
                >
                  <SelectTrigger className={fieldCls}>
                    <SelectValue placeholder='Elegí una experiencia' />
                  </SelectTrigger>
                  <SelectContent>
                    {experiences.map((exp) => (
                      <SelectItem key={exp._id} value={exp.name}>
                        {exp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}

          <Field label='Profesor asignado'>
            <Select
              value={professorId || 'none'}
              onValueChange={(v) => setProfessorId(v === 'none' ? '' : v)}
            >
              <SelectTrigger className={fieldCls}>
                <SelectValue placeholder='Sin asignar' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='none'>Sin asignar</SelectItem>
                {professors
                  .filter((pr) => pr.active)
                  .map((pr) => (
                    <SelectItem key={pr.id} value={pr.id}>
                      {pr.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>

          <div className='grid grid-cols-2 gap-3'>
            <Field label='Cantidad'>
              <Input
                type='number'
                min={1}
                step={1}
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                onBlur={() => {
                  const n = Math.trunc(Number(qtyInput));
                  setQtyInput(Number.isFinite(n) && n >= 1 ? String(n) : '1');
                }}
                className={fieldCls}
              />
            </Field>
            <Field label='Estado inicial'>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as PieceStatus })
                }
              >
                <SelectTrigger className={fieldCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIECE_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PIECE_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label='Notas (qué pieza es)'>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder='Ej: bowl esmaltado azul'
              className={fieldCls}
            />
          </Field>
          <p className='text-[11px] text-[#7a6e6f]'>
            El estado es la etapa actual de la pieza — es lo que el cliente ve
            cuando la consulta por WhatsApp.
          </p>
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
            variant='terracota'
            onClick={submit}
            disabled={saving}
          >
            {saving ? 'Guardando…' : 'Cargar pieza'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className='flex flex-col gap-1.5'>
      <span className='font-mono text-[11px] tracking-wider text-[#7a6e6f]'>
        {label.toUpperCase()}
      </span>
      {children}
    </div>
  );
}
