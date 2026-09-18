'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera, Plus, Search, Trash2, X } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
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
  type PieceStatusConfig,
} from '@/services/pieces.admin.service';
import { ImageUploadButton } from '@/components/ui/image-upload-button';
import {
  reservationsAdmin,
  type ReservationItem,
} from '@/services/reservations.admin.service';
import {
  professorsAdmin,
  type Professor,
} from '@/services/professors.admin.service';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/hooks/useAuth';
import { FilterChip, IconBtn, Pager, StatusBadge } from './_shared';

const LIMIT = 20;

// Los estados del proceso son CONFIGURABLES por el taller (el backend los
// sirve en /pieces/statuses). Mientras cargan, se usan los históricos.
const FALLBACK_CFG: PieceStatusConfig[] = PIECE_STATUS_ORDER.map((key) => ({
  key,
  label: PIECE_STATUS_LABEL[key],
  isReady: key === 'LISTA',
  isFinal: key === 'RETIRADA',
}));

function cfgOf(s: string, cfg: PieceStatusConfig[]) {
  return cfg.find((c) => c.key === s);
}

function labelOf(s: string, cfg: PieceStatusConfig[]) {
  return cfgOf(s, cfg)?.label ?? s;
}

// Color del badge/chip por estado: en proceso → terracota suave, lista → verde,
// final (retirada/entregada) → piedra.
function statusColors(
  s: string,
  cfg: PieceStatusConfig[],
): { bg: string; fg: string } {
  // Contraste alto sobre tinte de marca: fg oscuro sobre bg claro. El naranja
  // medio (#cc844a) sobre crema era ilegible; usamos terracota oscuro (#8a5638).
  const c = cfgOf(s, cfg);
  if (c?.isReady) return { bg: '#dcebe1', fg: '#2f4a40' };
  if (c?.isFinal) return { bg: '#eae4db', fg: '#5c5148' };
  return { bg: '#f3e2d0', fg: '#8a5638' };
}

const COLS =
  'grid grid-cols-[10rem_8rem_1fr_8rem_9rem_7rem_14rem] items-center gap-3';
const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

// Barra de progreso: un segmento por estado configurado.
function ProgressStepper({
  status,
  cfg,
}: Readonly<{ status: string; cfg: PieceStatusConfig[] }>) {
  const idx = cfg.findIndex((c) => c.key === status);
  const stage = idx + 1; // 1..n (0 si el estado no figura)
  const c = cfgOf(status, cfg);
  const fill = c?.isFinal ? '#7a6e6f' : c?.isReady ? '#455a54' : '#9d684e';
  return (
    <div className='flex items-center gap-1'>
      {cfg.map((seg, i) => (
        <span
          key={seg.key}
          className='h-1.5 flex-1 rounded-full'
          style={{ backgroundColor: i + 1 <= stage ? fill : '#e6dbcd' }}
        />
      ))}
    </div>
  );
}

// Texto de la columna "Retiro".
function retiroNode(p: PieceItem, cfg: PieceStatusConfig[]) {
  const c = cfgOf(p.status, cfg);
  if (c?.isFinal) {
    return (
      <span className='text-xs text-[#7a6e6f]'>
        {c.label}
        {p.pickedUpAt ? ` · ${fmtDate(p.pickedUpAt)}` : ''}
      </span>
    );
  }
  if (c?.isReady) {
    return <span className='text-xs text-[#455a54]'>{c.label}</span>;
  }
  return <span className='text-xs text-[#7a6e6f]'>—</span>;
}

export function PiezasTab() {
  const { user } = useAuth();
  // El PROFESOR registra y gestiona piezas (alta, estado, fotos), como pide
  // el alcance del taller. Borrar registros y configurar los estados del
  // proceso queda para el admin.
  const isAdmin = user?.role === 'admin';
  const canManage = true;
  const confirm = useConfirm();
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
  const [counts, setCounts] = useState<Record<string, number>>({});
  // Se incrementa en cada recarga para refrescar los contadores por estado
  // (cambiar el estado de una pieza no altera el total de la lista).
  const [countsKey, setCountsKey] = useState(0);
  // Estados configurables del proceso (con fallback histórico hasta cargar).
  const [statusCfg, setStatusCfg] = useState<PieceStatusConfig[]>(FALLBACK_CFG);
  const [photosOf, setPhotosOf] = useState<PieceItem | null>(null);

  const loadCfg = useCallback(() => {
    piecesAdmin
      .statuses()
      .then((cfg) => cfg.length && setStatusCfg(cfg))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    loadCfg();
  }, [loadCfg]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadProfessors = useCallback(async () => {
    try {
      setProfessors(await professorsAdmin.list());
    } catch {
      setProfessors([]);
    }
  }, []);

  useEffect(() => {
    void loadProfessors();
  }, [loadProfessors]);

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
      setCountsKey((k) => k + 1);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [status, search, professorId, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Un único agregado evita disparar una request por estado (React StrictMode
  // duplicaba el efecto en desarrollo y podía alcanzar el límite concurrente).
  useEffect(() => {
    let alive = true;
    piecesAdmin
      .counts({
        search: search || undefined,
        professorId: professorId || undefined,
      })
      .then((result) => {
        if (alive) setCounts({ '': result.total, ...result.byStatus });
      })
      .catch(() => {
        if (alive) setCounts({});
      });
    return () => {
      alive = false;
    };
  }, [search, professorId, countsKey]);

  async function changeStatus(p: PieceItem, next: string) {
    if (next === p.status) return;
    setBusy(p._id);
    try {
      await piecesAdmin.update(p._id, { status: next });
      showToast.success(
        cfgOf(next, statusCfg)?.isReady
          ? 'Pieza marcada como lista para retirar'
          : 'Estado actualizado',
      );
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setBusy(null);
    }
  }

  async function sendReadyNotice(p: PieceItem) {
    setBusy(p._id);
    try {
      await piecesAdmin.notifyReady(p._id);
      showToast.success('Aviso de retiro enviado');
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo enviar el aviso');
    } finally {
      setBusy(null);
    }
  }

  async function remove(p: PieceItem) {
    const ok = await confirm({
      title: 'Eliminar pieza',
      description: 'Se eliminará este registro de pieza. No se puede deshacer.',
    });
    if (!ok) return;
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
    if (!isAdmin) {
      if (cfgOf(p.status, statusCfg)?.isReady || cfgOf(p.status, statusCfg)?.isFinal) {
        return <StatusBadge label={labelOf(p.status, statusCfg)} bg='#dcebe1' fg='#2f4a40' />;
      }
      return (
        <Button type='button' variant='verde' size='sm' onClick={() => changeStatus(p, 'LISTA')} disabled={busy === p._id} className='h-8 w-full text-xs'>
          Marcar lista
        </Button>
      );
    }
    return (
      <Select
        value={p.status}
        onValueChange={(v) => changeStatus(p, v)}
        disabled={busy === p._id}
      >
        <SelectTrigger className={cn('h-8 w-full text-xs', fieldCls)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statusCfg.map((c) => (
            <SelectItem key={c.key} value={c.key}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const filters = useMemo(
    () => [
      { key: '', label: 'Todas', color: '#455a54', tint: '#E7F0EC' },
      ...statusCfg.map((c) => {
        const { bg, fg } = statusColors(c.key, statusCfg);
        return { key: c.key, label: c.label, color: fg, tint: bg };
      }),
    ],
    [statusCfg],
  );

  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to = (page - 1) * LIMIT + items.length;

  return (
    <div className='flex flex-col gap-5'>
      {/* Filtros de estado + búsqueda + nueva pieza */}
      <div className='flex flex-col gap-2.5'>
        <div className='-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0'>
          {filters.map((f) => (
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
        {/* Mobile: buscador full-width arriba; profesor + acciones en la fila de
            abajo. Desktop: todo en una sola fila que envuelve. */}
        <div className='flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center'>
          <div className='relative order-first w-full min-w-[12rem] sm:order-none sm:w-auto sm:flex-1'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a99]' />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder='Buscar por nombre, teléfono o experiencia'
              className='rounded-full border-[#e6dbcd] bg-white pl-9 text-[#455a54] placeholder:text-[#a99] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30'
            />
          </div>
          <div className='flex items-center gap-2.5'>
            {professors.length > 0 && (
              <Select
                value={professorId || 'all'}
                onValueChange={(v) => {
                  setProfessorId(v === 'all' ? '' : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className={cn('h-9 min-w-0 flex-1 rounded-full text-xs sm:w-44 sm:flex-none', fieldCls)}>
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
            <Button
              type='button'
              variant='verde'
              onClick={() => setCreating(true)}
              className='shrink-0 gap-2'
            >
              <Plus className='h-4 w-4' />
              Nueva pieza
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop: tabla */}
      <div className='hidden overflow-x-auto rounded-2xl border border-[#e6dbcd] bg-white md:block'>
        <div className='min-w-[60rem]'>
          <div
            className={`${COLS} border-b border-[#e6dbcd] bg-[#fbf5ef] px-5 py-3 font-mono text-[11px] tracking-wider text-[#7a6e6f]`}
          >
            <span>PERSONA</span>
            <span>RESERVA</span>
            <span>FICHA DE PIEZA</span>
            <span>PROFESORA</span>
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
              const { bg, fg } = statusColors(p.status, statusCfg);
              return (
                <div
                  key={p._id}
                  className={cn(
                    `${COLS} border-b border-[#e6dbcd] px-5 py-3.5 last:border-0`,
                    !!cfgOf(p.status, statusCfg)?.isFinal && 'opacity-60',
                  )}
                >
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-medium text-[#3d3338]'>
                      {p.personName || p.customerName || '—'}
                    </p>
                    <p className='truncate font-mono text-xs text-[#7a6e6f]'>
                      Firma: {p.signature || '—'}
                    </p>
                  </div>
                  <span className='truncate text-sm text-[#7a6e6f]'>
                    {p.reservationCode || '—'}
                  </span>
                  <div className='min-w-0 text-sm text-[#3d3338]'>
                    <p className='truncate font-medium'>{p.pieceType || 'Pieza sin detalle'}</p>
                    <p className='truncate text-xs text-[#7a6e6f]'>Colores: {p.colorsUsed || '—'}</p>
                  </div>
                  <span className='truncate text-sm text-[#7a6e6f]'>
                    {p.professorName || '—'}
                  </span>
                  <div>
                    <StatusBadge label={labelOf(p.status, statusCfg)} bg={bg} fg={fg} />
                  </div>
                  <div>{retiroNode(p, statusCfg)}</div>
                  <div className='flex items-center justify-end gap-2'>
                    <button
                      type='button'
                      onClick={() => setPhotosOf(p)}
                      title={`Fotos (${p.photos?.length ?? 0})`}
                      className='relative text-[#7a6e6f] hover:text-[#455a54]'
                    >
                      <Camera className='h-4 w-4' />
                      {(p.photos?.length ?? 0) > 0 && (
                        <span className='absolute -right-2 -top-1.5 rounded-full bg-[#9d684e] px-1 text-[9px] font-bold text-white'>
                          {p.photos!.length}
                        </span>
                      )}
                    </button>
                    <div className='w-[8rem]'>{statusSelect(p)}</div>
                    {isAdmin && cfgOf(p.status, statusCfg)?.isReady && !p.notifiedReadyAt && (
                      <Button type='button' variant='verde' size='sm' onClick={() => sendReadyNotice(p)} disabled={busy === p._id} className='h-8 px-2 text-[11px]'>Avisar retiro</Button>
                    )}
                    {isAdmin && p.notifiedReadyAt && (
                      <span className='text-[10px] text-[#455a54]'>Avisado</span>
                    )}
                    {isAdmin && (
                      <IconBtn
                        icon={Trash2}
                        title='Eliminar'
                        tone='rojo'
                        disabled={busy === p._id}
                        onClick={() => remove(p)}
                      />
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
            const { bg, fg } = statusColors(p.status, statusCfg);
            return (
              <div
                key={p._id}
                className={cn(
                  'rounded-2xl border border-[#e6dbcd] bg-white p-4',
                  !!cfgOf(p.status, statusCfg)?.isFinal && 'opacity-60',
                )}
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-medium text-[#3d3338]'>
                      {p.personName || p.customerName || p.customerPhone}
                    </p>
                    {p.signature && (
                      <p className='truncate font-mono text-xs text-[#7a6e6f]'>
                        Firma: {p.signature}
                      </p>
                    )}
                  </div>
                  <StatusBadge label={labelOf(p.status, statusCfg)} bg={bg} fg={fg} />
                </div>
                <p className='mt-2 text-sm text-[#3d3338]'>
                  {p.pieceType || 'Pieza sin detalle'}
                </p>
                <p className='text-xs text-[#7a6e6f]'>
                  {[p.colorsUsed && `Colores: ${p.colorsUsed}`, p.professorName && `Prof. ${p.professorName}`, p.reservationCode && `Reserva ${p.reservationCode}`]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </p>
                <div className='mt-3 flex items-center justify-between gap-2'>
                  {retiroNode(p, statusCfg)}
                  <div className='flex items-center gap-2'>
                    <div className='w-[9rem]'>{statusSelect(p)}</div>
                    {isAdmin && cfgOf(p.status, statusCfg)?.isReady && !p.notifiedReadyAt && (
                      <Button type='button' variant='verde' size='sm' onClick={() => sendReadyNotice(p)} disabled={busy === p._id} className='h-8 px-2 text-[11px]'>Avisar</Button>
                    )}
                    {isAdmin && p.notifiedReadyAt && (
                      <span className='text-[10px] text-[#455a54]'>Avisado</span>
                    )}
                    {isAdmin && (
                      <IconBtn
                        icon={Trash2}
                        title='Eliminar'
                        tone='rojo'
                        disabled={busy === p._id}
                        onClick={() => remove(p)}
                      />
                    )}
                  </div>
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
          onClose={() => setCreating(false)}
          onDone={async () => {
            setCreating(false);
            await load();
          }}
        />
      )}

      {photosOf && (
        <PhotosDialog
          piece={photosOf}
          canManage={canManage}
          onClose={() => setPhotosOf(null)}
          onSaved={async () => {
            setPhotosOf(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function NewPieceModal({
  onClose,
  onDone,
}: Readonly<{
  onClose: () => void;
  onDone: () => void | Promise<void>;
}>) {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [classDate, setClassDate] = useState(todayKey);
  const [search, setSearch] = useState('');
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [reservation, setReservation] = useState<ReservationItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<Array<{
    personName: string;
    signature: string;
    pieceType: string;
    colorsUsed: string;
  }>>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      reservationsAdmin
        .listReservations({ date: classDate, search: search.trim() || undefined, limit: 50 })
        .then((result) => {
          if (alive) setReservations(result.items.filter((item) => item.status !== 'CANCELLED' && item.status !== 'EXPIRED'));
        })
        .catch(() => {
          if (alive) setReservations([]);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [classDate, search]);

  function selectReservation(item: ReservationItem) {
    setReservation(item);
    setEntries(
      Array.from({ length: Math.max(1, item.quantity) }, (_, index) => ({
        personName: (item.quantity === 1 || index === 0 ? item.customerName : '') ?? '',
        signature: '',
        pieceType: '',
        colorsUsed: '',
      })),
    );
  }

  function updateEntry(index: number, key: keyof (typeof entries)[number], value: string) {
    setEntries((current) => current.map((entry, i) => i === index ? { ...entry, [key]: value } : entry));
  }

  async function submit() {
    if (!reservation) return showToast.error('Seleccioná una reserva del día');
    if (entries.some((entry) => Object.values(entry).some((value) => !value.trim()))) {
      return showToast.error('Completá nombre, firma, pieza y colores de cada ficha');
    }
    setSaving(true);
    try {
      await piecesAdmin.createReservationBatch(
        reservation._id,
        entries.map((entry) => ({
          personName: entry.personName.trim(),
          signature: entry.signature.trim(),
          pieceType: entry.pieceType.trim(),
          colorsUsed: entry.colorsUsed.trim(),
        })),
      );
      showToast.success(`${entries.length} ficha(s) anexadas a la reserva`);
      await onDone();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudieron registrar las piezas');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader className='text-left'>
          <DialogTitle className='font-tan-nimbus text-xl text-[#455a54]'>
            Registrar piezas de una reserva
          </DialogTitle>
        </DialogHeader>

        <div className='flex flex-col gap-4'>
          {!reservation ? (
            <>
              <div className='grid gap-2 sm:grid-cols-[12rem_1fr]'>
                <DatePicker
                  value={classDate}
                  onChange={(value) => {
                    setClassDate(value);
                    setReservation(null);
                  }}
                  placeholder='Día de la reserva'
                />
                <div className='relative'>
                  <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a99]' />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder='Filtrar las reservas de ese día'
                    className={cn('pl-9', fieldCls)}
                  />
                </div>
              </div>
              <div className='max-h-72 overflow-y-auto rounded-xl border border-[#e6dbcd]'>
                {loading ? (
                  <p className='p-4 text-sm text-[#7a6e6f]'>Buscando reservas del día…</p>
                ) : reservations.length === 0 ? (
                  <p className='p-4 text-sm text-[#7a6e6f]'>No hay reservas para la fecha seleccionada.</p>
                ) : reservations.map((item) => (
                  <button
                    key={item._id}
                    type='button'
                    onClick={() => selectReservation(item)}
                    className='flex w-full items-center justify-between gap-3 border-b border-[#e6dbcd] px-4 py-3 text-left last:border-0 hover:bg-[#fbf5ef]'
                  >
                    <span>
                      <span className='block text-sm font-semibold text-[#3d3338]'>{item.customerName}</span>
                      <span className='block text-xs text-[#7a6e6f]'>{item.experienceName} · {fmtDate(item.startAt)} · {item.quantity} persona(s)</span>
                    </span>
                    <span className='font-mono text-xs text-[#9d684e]'>{item.code}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className='flex items-center justify-between rounded-xl border border-[#455a54]/30 bg-[#E7F0EC] px-4 py-3'>
                <div>
                  <p className='text-sm font-semibold text-[#3d3338]'>{reservation.customerName} · {reservation.code}</p>
                  <p className='text-xs text-[#7a6e6f]'>{reservation.experienceName} · {fmtDate(reservation.startAt)}</p>
                </div>
                <button type='button' onClick={() => setReservation(null)} className='text-xs font-semibold text-[#9d684e] hover:underline'>Cambiar reserva</button>
              </div>

              <div className='flex max-h-[55vh] flex-col gap-3 overflow-y-auto pr-1'>
                {entries.map((entry, index) => (
                  <div key={index} className='rounded-xl border border-[#e6dbcd] bg-white p-3'>
                    <div className='mb-2 flex items-center justify-between'>
                      <span className='text-sm font-semibold text-[#455a54]'>Ficha {index + 1}</span>
                      {entries.length > 1 && (
                        <button type='button' onClick={() => setEntries((current) => current.filter((_, i) => i !== index))} className='text-xs text-[#a33] hover:underline'>Quitar</button>
                      )}
                    </div>
                    <div className='grid gap-2 sm:grid-cols-2'>
                      <Field label='Nombre y apellido'>
                        <Input value={entry.personName} onChange={(event) => updateEntry(index, 'personName', event.target.value)} className={fieldCls} />
                      </Field>
                      <Field label='Firma colocada en la pieza'>
                        <Input value={entry.signature} onChange={(event) => updateEntry(index, 'signature', event.target.value)} placeholder='Ej. CH, estrella, iniciales…' className={fieldCls} />
                      </Field>
                      <Field label='Pieza elegida'>
                        <Input value={entry.pieceType} onChange={(event) => updateEntry(index, 'pieceType', event.target.value)} placeholder='Ej. taza, bowl, plato…' className={fieldCls} />
                      </Field>
                      <Field label='Colores utilizados'>
                        <Input value={entry.colorsUsed} onChange={(event) => updateEntry(index, 'colorsUsed', event.target.value)} placeholder='Ej. azul, blanco y rosa' className={fieldCls} />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setEntries((current) => [...current, { personName: '', signature: '', pieceType: '', colorsUsed: '' }])}
                className='w-fit gap-1 border-[#e6dbcd] text-[#455a54]'
              >
                <Plus className='h-3.5 w-3.5' /> Agregar otra ficha
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={onClose} className='border-[#e6dbcd] text-[#455a54]'>Cancelar</Button>
          {reservation && (
            <Button type='button' variant='terracota' onClick={submit} disabled={saving}>
              {saving ? 'Guardando…' : 'Registrar fichas'}
            </Button>
          )}
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
      <span className='font-mono text-xs tracking-wider text-[#7a6e6f]'>
        {label.toUpperCase()}
      </span>
      {children}
    </div>
  );
}

// ───────────────────── Fotos de una pieza (registro fotográfico) ─────────────────────

/**
 * Registro fotográfico de la pieza: URLs de fotos con miniatura. El equipo
 * sube la foto a su hosting/Drive público y pega el link. Cuentas de sólo
 * lectura pueden verlas pero no editarlas.
 */
function PhotosDialog({
  piece,
  canManage,
  onClose,
  onSaved,
}: Readonly<{
  piece: PieceItem;
  canManage: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}>) {
  const [photos, setPhotos] = useState<string[]>(piece.photos ?? []);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const valid = /^https?:\/\/.+/.test(draft.trim());

  async function save() {
    setSaving(true);
    try {
      await piecesAdmin.update(piece._id, { photos });
      showToast.success('Fotos guardadas');
      await onSaved();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader className='text-left'>
          <DialogTitle className='font-tan-nimbus text-xl text-[#455a54]'>
            Fotos · {piece.pieceType || piece.personName || piece.customerName || 'Pieza'}
          </DialogTitle>
        </DialogHeader>
        <div className='flex flex-col gap-3'>
          {photos.length === 0 ? (
            <p className='text-sm text-[#7a6e6f]'>Sin fotos todavía.</p>
          ) : (
            <div className='grid grid-cols-3 gap-2'>
              {photos.map((url) => (
                <div key={url} className='relative'>
                  <a href={url} target='_blank' rel='noreferrer'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=''
                      className='h-24 w-full rounded-lg border border-[#e6dbcd] object-cover'
                    />
                  </a>
                  {canManage && (
                    <button
                      type='button'
                      onClick={() => setPhotos(photos.filter((x) => x !== url))}
                      className='absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#a33] text-white'
                      aria-label='Quitar foto'
                    >
                      <X className='h-3 w-3' />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {canManage && (
            <div className='flex flex-wrap items-center gap-2'>
              <ImageUploadButton
                folder='piezas'
                onUploaded={(url) => setPhotos((prev) => [...prev, url])}
              />
              <span className='text-[11px] text-[#a99f92]'>o pegá una URL:</span>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && valid) {
                    setPhotos([...photos, draft.trim()]);
                    setDraft('');
                  }
                }}
                placeholder='https://…'
                className={`${fieldCls} h-9 min-w-40 flex-1`}
              />
              <Button
                type='button'
                variant='ghost'
                disabled={!valid}
                onClick={() => {
                  setPhotos([...photos, draft.trim()]);
                  setDraft('');
                }}
                className='shrink-0 border border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
              >
                Agregar
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={onClose}
            className='border-[#e6dbcd] text-[#455a54] hover:bg-[#fbf5ef]'
          >
            {canManage ? 'Cancelar' : 'Cerrar'}
          </Button>
          {canManage && (
            <Button type='button' variant='verde' onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar fotos'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────── Estados configurables del proceso ─────────────────────

/**
 * Editor de los ESTADOS del proceso de piezas (adaptables al taller: Fresco,
 * En proceso, Horneado…). Reglas: al menos un estado, y uno marcado "lista"
 * (dispara el aviso al cliente). Cambiar los estados no toca piezas viejas:
 * conservan su clave aunque se renombre o borre.
 */
