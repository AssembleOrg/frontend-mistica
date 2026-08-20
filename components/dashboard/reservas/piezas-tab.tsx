'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera, Plus, Search, Settings2, Trash2, X } from 'lucide-react';
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
  type PieceStatusConfig,
  type CreatePieceInput,
} from '@/services/pieces.admin.service';
import { tallerAdmin, type Student } from '@/services/taller.admin.service';
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
  const c = cfgOf(s, cfg);
  if (c?.isReady) return { bg: '#E7F0EC', fg: '#455a54' };
  if (c?.isFinal) return { bg: '#f1ede6', fg: '#7a6e6f' };
  return { bg: '#F6E9DC', fg: '#cc844a' };
}

const COLS =
  'grid grid-cols-[9rem_8.5rem_1fr_8rem_9.5rem_9rem_7rem_11.5rem] items-center gap-3';
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
  // Estados configurables del proceso (con fallback histórico hasta cargar).
  const [statusCfg, setStatusCfg] = useState<PieceStatusConfig[]>(FALLBACK_CFG);
  const [students, setStudents] = useState<Student[]>([]);
  const [editingStatuses, setEditingStatuses] = useState(false);
  const [photosOf, setPhotosOf] = useState<PieceItem | null>(null);

  const loadCfg = useCallback(() => {
    piecesAdmin
      .statuses()
      .then((cfg) => cfg.length && setStatusCfg(cfg))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    loadCfg();
    tallerAdmin
      .listStudents(false)
      .then(setStudents)
      .catch(() => setStudents([]));
  }, [loadCfg]);

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

  async function changeStatus(p: PieceItem, next: string) {
    if (next === p.status) return;
    setBusy(p._id);
    try {
      await piecesAdmin.update(p._id, { status: next });
      showToast.success(
        cfgOf(next, statusCfg)?.isReady
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
      <div className='flex flex-wrap items-center gap-x-3 gap-y-2.5'>
        <div className='flex flex-wrap items-center gap-2'>
          {filters.map((f) => (
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
          {isAdmin && (
            <Button
              type='button'
              variant='ghost'
              onClick={() => setEditingStatuses(true)}
              title='Configurar los estados del proceso'
              className='shrink-0 gap-1.5 border border-[#e6dbcd] bg-white px-2.5 text-[12px] text-[#455a54] hover:bg-[#fbf5ef]'
            >
              <Settings2 className='h-4 w-4' />
              Estados
            </Button>
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
                  <ProgressStepper status={p.status} cfg={statusCfg} />
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
                      {p.customerName || p.customerPhone}
                    </p>
                    {p.customerName && (
                      <p className='truncate font-mono text-xs text-[#7a6e6f]'>
                        {p.customerPhone}
                      </p>
                    )}
                  </div>
                  <StatusBadge label={labelOf(p.status, statusCfg)} bg={bg} fg={fg} />
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
                  <ProgressStepper status={p.status} cfg={statusCfg} />
                </div>
                <div className='mt-3 flex items-center justify-between gap-2'>
                  {retiroNode(p, statusCfg)}
                  <div className='flex items-center gap-2'>
                    <div className='w-[9rem]'>{statusSelect(p)}</div>
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
          professors={professors}
          students={students}
          statusCfg={statusCfg}
          onClose={() => setCreating(false)}
          onDone={async () => {
            setCreating(false);
            await load();
          }}
        />
      )}

      {editingStatuses && (
        <StatusesDialog
          initial={statusCfg}
          onClose={() => setEditingStatuses(false)}
          onSaved={(cfg) => {
            setStatusCfg(cfg);
            setEditingStatuses(false);
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
  professors,
  students,
  statusCfg,
  onClose,
  onDone,
}: Readonly<{
  professors: Professor[];
  students: Student[];
  statusCfg: PieceStatusConfig[];
  onClose: () => void;
  onDone: () => void | Promise<void>;
}>) {
  // Camino NORMAL: la pieza se asigna a una RESERVA (el contacto ya está ahí)
  // o a un ALUMNO del taller. El modo manual queda para piezas sin origen.
  const [mode, setMode] = useState<'reserva' | 'alumno' | 'manual'>('reserva');
  const [studentId, setStudentId] = useState('');

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
    status: statusCfg[0]?.key ?? 'SECADO',
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
    } else if (mode === 'alumno') {
      if (!studentId) {
        showToast.error('Elegí el alumno al que pertenece la pieza');
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
          : mode === 'alumno'
            ? {
                studentId,
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
              onClick={() => setMode('alumno')}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                mode === 'alumno'
                  ? 'border-[#455a54] bg-[#455a54] text-white'
                  : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]',
              )}
            >
              De un alumno
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
              Sin origen (manual)
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
          ) : mode === 'alumno' ? (
            <Field label='Alumno (el aviso de lista le llega a su contacto)'>
              <Select
                value={studentId || undefined}
                onValueChange={setStudentId}
              >
                <SelectTrigger className={fieldCls}>
                  <SelectValue placeholder='Elegí el alumno' />
                </SelectTrigger>
                <SelectContent>
                  {students.map((st) => (
                    <SelectItem key={st._id} value={st._id}>
                      {st.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
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
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger className={fieldCls}>
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
            Fotos · {piece.notes || piece.customerName || 'Pieza'}
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
            <div className='flex gap-2'>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && valid) {
                    setPhotos([...photos, draft.trim()]);
                    setDraft('');
                  }
                }}
                placeholder='https://… (URL de la foto)'
                className={fieldCls}
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
function StatusesDialog({
  initial,
  onClose,
  onSaved,
}: Readonly<{
  initial: PieceStatusConfig[];
  onClose: () => void;
  onSaved: (cfg: PieceStatusConfig[]) => void;
}>) {
  const [rows, setRows] = useState<PieceStatusConfig[]>(
    initial.map((c) => ({ ...c })),
  );
  const [saving, setSaving] = useState(false);

  function patch(i: number, part: Partial<PieceStatusConfig>) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...part } : r)));
  }

  async function save() {
    setSaving(true);
    try {
      const cfg = await piecesAdmin.setStatuses(rows);
      showToast.success('Estados actualizados');
      onSaved(cfg);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-md'>
        <DialogHeader className='text-left'>
          <DialogTitle className='font-tan-nimbus text-xl text-[#455a54]'>
            Estados del proceso
          </DialogTitle>
        </DialogHeader>
        <div className='flex flex-col gap-2'>
          <p className='text-[12px] text-[#7a6e6f]'>
            En orden, del primero al último. Marcá cuál avisa al cliente que la
            pieza está <strong>lista</strong> y cuál <strong>cierra</strong> el
            ciclo (entregada).
          </p>
          {rows.map((r, i) => (
            <div
              key={i}
              className='flex flex-wrap items-center gap-2 rounded-lg border border-[#e6dbcd] px-3 py-2'
            >
              <span className='w-5 text-center font-mono text-[11px] text-[#a99f92]'>
                {i + 1}
              </span>
              <Input
                value={r.label}
                onChange={(e) => patch(i, { label: e.target.value })}
                placeholder='Nombre del estado'
                className={`${fieldCls} h-8 w-40 text-sm`}
              />
              <label className='flex items-center gap-1 text-[11px] text-[#455a54]'>
                <input
                  type='checkbox'
                  checked={!!r.isReady}
                  onChange={(e) => patch(i, { isReady: e.target.checked })}
                />
                lista
              </label>
              <label className='flex items-center gap-1 text-[11px] text-[#455a54]'>
                <input
                  type='checkbox'
                  checked={!!r.isFinal}
                  onChange={(e) => patch(i, { isFinal: e.target.checked })}
                />
                cierra
              </label>
              <button
                type='button'
                onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                className='ml-auto text-[#a33] hover:opacity-70'
                aria-label='Quitar estado'
              >
                <Trash2 className='h-4 w-4' />
              </button>
            </div>
          ))}
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() =>
              setRows([
                ...rows,
                {
                  key: `ESTADO_${rows.length + 1}`,
                  label: '',
                  isReady: false,
                  isFinal: false,
                },
              ])
            }
            className='h-8 w-fit gap-1 border-[#e6dbcd] bg-white px-2 text-[12px] text-[#455a54] hover:bg-[#fbf5ef]'
          >
            <Plus className='h-3 w-3' />
            Agregar estado
          </Button>
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
          <Button type='button' variant='verde' onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar estados'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
