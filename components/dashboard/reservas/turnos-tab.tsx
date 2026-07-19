'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CalendarOff,
  CalendarPlus,
  ChevronDown,
  CopyPlus,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  fmtDateTime,
  fmtPrice,
  SESSION_STATUS_LABEL,
} from '@/lib/reservas-format';
import {
  reservationsAdmin,
  type AdminExperience,
  type AdminSession,
  type SessionSlotInput,
} from '@/services/reservations.admin.service';
import { fmtYmd } from '@/lib/reservas-format';
import { DEFAULT_EXPERIENCE_COLOR } from '@/lib/experience-colors';
import {
  closedDatesAdmin,
  WEEKDAY_LABELS,
  type ClosedDate,
  type ClosedDateKind,
} from '@/services/closed-dates.admin.service';
import { AnotadosModal } from './anotados-modal';
import { SpaceBlocksPanel } from './space-blocks-panel';
import { IconBtn, StatusBadge } from './_shared';

interface SlotRow {
  date: string;
  time: string;
}

const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';
const triggerCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30 data-[placeholder]:text-[#455a54]/60';

// Columnas explícitas (sin `auto`) para alinear header y filas. Sólo desktop;
// en mobile se usan tarjetas. EXPERIENCIA = 1fr, el resto ancho fijo.
const COLS =
  'grid grid-cols-[1fr_12rem_9.5rem_7rem_7rem_8rem] items-center gap-3';

// Filtros de estado del toolbar (incluye "Completos", pseudo-estado = lleno).
const STATUS_FILTERS: { v: string; l: string }[] = [
  { v: '', l: 'Todos los estados' },
  { v: 'OPEN', l: 'Abiertos' },
  { v: 'FULL', l: 'Completos' },
  { v: 'DRAFT', l: 'Borradores' },
  { v: 'CANCELLED', l: 'Cancelados' },
];

function matchStatus(s: AdminSession, f: string): boolean {
  const full = s.seatsTaken >= s.capacity;
  switch (f) {
    case '':
      return true;
    case 'OPEN':
      return s.status === 'OPEN' && !full;
    case 'FULL':
      return full && (s.status === 'OPEN' || s.status === 'CLOSED');
    case 'DRAFT':
      return s.status === 'DRAFT';
    case 'CANCELLED':
      return s.status === 'CANCELLED';
    default:
      return true;
  }
}

// Mapea estado del turno a los tintes aprobados. OPEN lleno = "Completo" con los
// colores de CLOSED.
function sessionBadge(s: AdminSession): { bg: string; fg: string; label: string } {
  const full = s.seatsTaken >= s.capacity;
  const base = SESSION_STATUS_LABEL[s.status] ?? s.status;
  switch (s.status) {
    case 'OPEN':
      return full
        ? { bg: '#f1ede6', fg: '#7a6e6f', label: 'Completo' }
        : { bg: '#E7F0EC', fg: '#455a54', label: base };
    case 'DRAFT':
      return { bg: '#F6E9DC', fg: '#cc844a', label: base };
    case 'CLOSED':
      return { bg: '#f1ede6', fg: '#7a6e6f', label: full ? 'Completo' : base };
    default:
      return { bg: '#f1ede6', fg: '#7a6e6f', label: base };
  }
}

export function TurnosTab() {
  const [experiences, setExperiences] = useState<AdminExperience[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [anotados, setAnotados] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminSession | null>(null);

  // Filtros del toolbar + apertura del modal de generación + config colapsable.
  const [expFilter, setExpFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genOpen, setGenOpen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Form de generación
  const [expId, setExpId] = useState('');
  const [capacity, setCapacity] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [slots, setSlots] = useState<SlotRow[]>([{ date: '', time: '' }]);
  const [publish, setPublish] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      setSessions(await reservationsAdmin.listSessions({}));
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar turnos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const exps = await reservationsAdmin.listExperiences(false);
        setExperiences(exps);
        if (exps[0]) setExpId(exps[0]._id);
      } catch {
        /* noop */
      }
    })();
    loadSessions();
  }, [loadSessions]);

  const validSlots = slots.filter((s) => s.date && s.time);

  // Lista visible según los filtros del toolbar (experiencia + estado).
  const filtered = sessions.filter(
    (s) =>
      (!expFilter || s.experienceId === expFilter) && matchStatus(s, statusFilter),
  );

  async function generate() {
    if (!expId) {
      showToast.error('Elegí una experiencia');
      return;
    }
    if (validSlots.length === 0) {
      showToast.error('Agregá al menos una fecha y hora');
      return;
    }
    setGenerating(true);
    try {
      const payloadSlots: SessionSlotInput[] = validSlots.map((s) => ({
        date: s.date,
        time: s.time,
        capacity: capacity ? Number(capacity) : undefined,
        price: price ? Number(price) : undefined,
      }));
      await reservationsAdmin.generateSessions({
        experienceId: expId,
        slots: payloadSlots,
        publish,
      });
      showToast.success(`${validSlots.length} turno(s) generado(s)`);
      setSlots([{ date: '', time: '' }]);
      setGenOpen(false);
      await loadSessions();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo generar');
    } finally {
      setGenerating(false);
    }
  }

  async function doDelete(s: AdminSession) {
    if (
      !confirm(
        `¿Eliminar el turno de ${fmtDateTime(s.startAt)}? Si tiene reservas, cancelalo (estado Cancelado) en vez de eliminar.`,
      )
    )
      return;
    try {
      await reservationsAdmin.deleteSession(s.id);
      showToast.success('Turno eliminado');
      await loadSessions();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  function renderTurnoActions(s: AdminSession) {
    return (
      <div className='flex items-center justify-end gap-1.5'>
        <IconBtn
          icon={Users}
          title='Anotados'
          onClick={() => setAnotados(s.id)}
        />
        <IconBtn
          icon={Pencil}
          title='Editar'
          onClick={() => setEditing(s)}
        />
        <IconBtn
          icon={Trash2}
          title='Eliminar'
          tone='rojo'
          onClick={() => doDelete(s)}
        />
      </div>
    );
  }

  function cupoBar(s: AdminSession, fullWidth = false) {
    const full = s.seatsTaken >= s.capacity;
    const pct = Math.min(100, Math.round((s.seatsTaken / s.capacity) * 100));
    return (
      <div className='flex flex-col gap-1.5'>
        <span
          className='text-xs font-medium'
          style={{ color: full ? '#b23b2e' : '#3d3338' }}
        >
          {s.seatsTaken} / {s.capacity} lugares
        </span>
        <div
          className={`h-1.5 overflow-hidden rounded-full bg-[#e6dbcd] ${fullWidth ? 'w-full' : 'w-[120px] max-w-full'}`}
        >
          <div
            className='h-full rounded-full'
            style={{
              width: s.seatsTaken > 0 ? `max(6px, ${pct}%)` : '0%',
              backgroundColor: full ? '#b23b2e' : '#455a54',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-5'>
      {/* Toolbar: filtros + generar */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-2.5'>
          <select
            value={expFilter}
            onChange={(e) => setExpFilter(e.target.value)}
            className='h-10 rounded-[10px] border border-[#e6dbcd] bg-white px-3 text-[13px] font-medium text-[#3d3338] focus-visible:border-[#9d684e] focus-visible:outline-none sm:h-9'
          >
            <option value=''>Todas las experiencias</option>
            {experiences.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className='h-10 rounded-[10px] border border-[#e6dbcd] bg-white px-3 text-[13px] font-medium text-[#3d3338] focus-visible:border-[#9d684e] focus-visible:outline-none sm:h-9'
          >
            {STATUS_FILTERS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        </div>
        <Button
          type='button'
          variant='verde'
          className='gap-2'
          onClick={() => setGenOpen(true)}
        >
          <CalendarPlus className='h-4 w-4' />
          Generar turnos
        </Button>
      </div>

      {/* Modal: generar turnos rápido */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader className='text-left'>
            <DialogTitle className='flex items-center gap-2'>
              <CopyPlus className='h-5 w-5 text-[#9d684e]' />
              Generar turnos rápido
            </DialogTitle>
          </DialogHeader>
          <div className='flex flex-col gap-4'>
            <span className='text-xs text-[#455a54]/60'>
              Repetí la experiencia en varias fechas de una.
            </span>

        <div className='grid gap-3 sm:grid-cols-[2fr_1fr_1fr]'>
          <Field label='Experiencia'>
            <Select value={expId || undefined} onValueChange={setExpId}>
              <SelectTrigger className={`w-full ${triggerCls}`}>
                <SelectValue placeholder='Elegí una experiencia' />
              </SelectTrigger>
              <SelectContent>
                {experiences.map((e) => (
                  <SelectItem key={e._id} value={e._id}>
                    <span
                      className='h-2.5 w-2.5 shrink-0 rounded-full'
                      style={{
                        backgroundColor: e.color ?? DEFAULT_EXPERIENCE_COLOR,
                      }}
                    />
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label='Cupo (opcional)'>
            <Input
              type='number'
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder='default'
              className={fieldCls}
            />
          </Field>
          <Field label='Precio p/p (opcional)'>
            <Input
              type='number'
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder='default'
              className={fieldCls}
            />
          </Field>
        </div>

        <div className='flex flex-col gap-2'>
          <span className='font-mono text-[11px] tracking-wider text-[#455a54]/60'>
            FECHAS Y HORARIOS
          </span>
          {slots.map((s, i) => (
            <div key={i} className='flex items-center gap-2'>
              <DatePicker
                value={s.date}
                onChange={(date) =>
                  setSlots((prev) =>
                    prev.map((p, j) => (j === i ? { ...p, date } : p)),
                  )
                }
                className='max-w-[200px] flex-1'
              />
              <TimePicker
                value={s.time}
                onChange={(time) =>
                  setSlots((prev) =>
                    prev.map((p, j) => (j === i ? { ...p, time } : p)),
                  )
                }
                className='w-[120px]'
              />
              {slots.length > 1 && (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  onClick={() =>
                    setSlots((prev) => prev.filter((_, j) => j !== i))
                  }
                  className='size-9 text-[#455a54]/60 hover:bg-[#fbf5ef] hover:text-[#b23b2e]'
                >
                  <X className='h-4 w-4' />
                </Button>
              )}
            </div>
          ))}
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setSlots((prev) => [...prev, { date: '', time: '' }])}
            className='w-fit border-[#e6dbcd] text-[#455a54]/60 hover:bg-[#fbf5ef] hover:text-[#455a54]'
          >
            <Plus className='h-3.5 w-3.5' /> Agregar fecha
          </Button>
        </div>

        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2.5'>
            <Switch
              id='publish'
              checked={publish}
              onCheckedChange={setPublish}
              className='data-[state=checked]:bg-[#455a54]'
            />
            <Label htmlFor='publish' className='text-sm text-[#455a54]'>
              Publicar (visible al público)
            </Label>
          </div>
          <Button
            type='button'
            variant='verde'
            onClick={generate}
            disabled={generating}
            className='gap-2 font-mono text-xs tracking-wider'
          >
            <CalendarPlus className='h-4 w-4' />
            {generating
              ? 'GENERANDO…'
              : `GENERAR ${validSlots.length || ''} TURNO${validSlots.length === 1 ? '' : 'S'}`}
          </Button>
        </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lista de turnos — Desktop: tabla */}
      <div className='hidden overflow-x-auto rounded-2xl border border-[#e6dbcd] bg-white md:block'>
        <div className='min-w-[52rem]'>
          <div className={`${COLS} border-b border-[#e6dbcd] bg-[#fbf5ef] px-5 py-3 font-mono text-[11px] tracking-wider text-[#7a6e6f]`}>
            <span>EXPERIENCIA</span>
            <span>FECHA Y HORA</span>
            <span>CUPO</span>
            <span>PRECIO</span>
            <span>ESTADO</span>
            <span className='text-right'>ACCIONES</span>
          </div>
          {loading ? (
            <div className='p-6 text-sm text-[#7a6e6f]'>Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className='p-6 text-sm text-[#7a6e6f]'>
              {sessions.length === 0
                ? 'No hay turnos. Generá turnos con el botón de arriba.'
                : 'No hay turnos para este filtro.'}
            </div>
          ) : (
            filtered.map((s) => {
              const badge = sessionBadge(s);
              return (
                <div
                  key={s.id}
                  className={`${COLS} border-b border-[#e6dbcd] px-5 py-3.5 last:border-0`}
                >
                  <span className='truncate text-sm font-medium text-[#3d3338]'>
                    {s.experienceName}
                  </span>
                  <span className='font-mono text-[13px] text-[#7a6e6f]'>
                    {fmtDateTime(s.startAt)}
                  </span>
                  {cupoBar(s)}
                  <span className='text-sm font-medium text-[#3d3338]'>
                    {fmtPrice(s.price)}
                  </span>
                  <div>
                    <StatusBadge label={badge.label} bg={badge.bg} fg={badge.fg} />
                  </div>
                  {renderTurnoActions(s)}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Lista de turnos — Mobile: tarjetas */}
      <div className='flex flex-col gap-3 md:hidden'>
        {loading ? (
          <div className='rounded-2xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#7a6e6f]'>
            Cargando…
          </div>
        ) : filtered.length === 0 ? (
          <div className='rounded-2xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#7a6e6f]'>
            {sessions.length === 0
              ? 'No hay turnos. Generá turnos con el botón de arriba.'
              : 'No hay turnos para este filtro.'}
          </div>
        ) : (
          filtered.map((s) => {
            const badge = sessionBadge(s);
            return (
              <div
                key={s.id}
                className='rounded-2xl border border-[#e6dbcd] bg-white p-4'
              >
                <div className='flex items-start justify-between gap-2'>
                  <span className='text-sm font-medium text-[#3d3338]'>
                    {s.experienceName}
                  </span>
                  <StatusBadge label={badge.label} bg={badge.bg} fg={badge.fg} />
                </div>
                <p className='mt-1 font-mono text-[13px] text-[#7a6e6f]'>
                  {fmtDateTime(s.startAt)}
                </p>
                <div className='mt-2'>{cupoBar(s, true)}</div>
                <div className='mt-3 flex items-center justify-between gap-2'>
                  <span className='text-sm font-medium text-[#3d3338]'>
                    {fmtPrice(s.price)}
                  </span>
                  {renderTurnoActions(s)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Ajustes de disponibilidad (días cerrados + bloqueos), colapsable */}
      <button
        type='button'
        onClick={() => setShowConfig((v) => !v)}
        className='flex items-center justify-between gap-2 rounded-2xl border border-[#e6dbcd] bg-white px-5 py-3.5 text-left'
      >
        <span className='flex items-center gap-2 text-sm font-medium text-[#455a54]'>
          <SlidersHorizontal className='h-4 w-4 text-[#9d684e]' />
          Días cerrados y bloqueos de espacio
        </span>
        <ChevronDown
          className={
            'h-4 w-4 text-[#7a6e6f] transition-transform' +
            (showConfig ? ' rotate-180' : '')
          }
        />
      </button>
      {showConfig && (
        <>
          <ClosedDatesPanel />
          <SpaceBlocksPanel />
        </>
      )}

      {anotados && (
        <AnotadosModal
          sessionId={anotados}
          onClose={() => setAnotados(null)}
          onChanged={loadSessions}
        />
      )}

      {editing && (
        <SessionEditModal
          session={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await loadSessions();
          }}
        />
      )}
    </div>
  );
}

const STATUS_OPTIONS: { v: string; l: string }[] = [
  { v: 'OPEN', l: 'Abierto' },
  { v: 'CLOSED', l: 'Cerrado' },
  { v: 'DRAFT', l: 'Borrador' },
  { v: 'CANCELLED', l: 'Cancelado' },
];

function SessionEditModal({
  session,
  onClose,
  onSaved,
}: {
  session: AdminSession;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [price, setPrice] = useState(String(session.price));
  const [capacity, setCapacity] = useState(String(session.capacity));
  const [status, setStatus] = useState(session.status);
  const [notes, setNotes] = useState(session.notes ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await reservationsAdmin.updateSession(session.id, {
        price: Number(price),
        capacity: Number(capacity),
        status,
        notes,
      });
      showToast.success('Turno actualizado');
      await onSaved();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader className='text-left'>
          <DialogTitle className='font-tan-nimbus text-xl font-bold text-[#455a54]'>
            Editar turno
          </DialogTitle>
          <p className='text-sm text-[#455a54]/60'>
            {session.experienceName} · {fmtDateTime(session.startAt)}
          </p>
        </DialogHeader>

        <div className='grid grid-cols-2 gap-3'>
          <Field label='Precio p/p'>
            <Input
              type='number'
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={fieldCls}
            />
          </Field>
          <Field label='Cupo'>
            <Input
              type='number'
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className={fieldCls}
            />
          </Field>
        </div>
        <Field label='Estado'>
          <Select value={status} onValueChange={(v) => setStatus(v)}>
            <SelectTrigger className={`w-full ${triggerCls}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.v} value={o.v}>
                  {o.l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label='Notas'>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={fieldCls}
          />
        </Field>

        <DialogFooter>
          <Button
            type='button'
            variant='terracota'
            onClick={save}
            disabled={saving}
            className='w-full font-mono text-xs tracking-wider'
          >
            {saving ? 'GUARDANDO…' : 'GUARDAR'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClosedDatesPanel() {
  const [items, setItems] = useState<ClosedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<ClosedDateKind>('DATE');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [weekday, setWeekday] = useState('1');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await closedDatesAdmin.list());
    } catch (e) {
      showToast.error(
        e instanceof Error ? e.message : 'Error al cargar días cerrados',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (kind === 'DATE' && !from) {
      showToast.error('Elegí una fecha de inicio (Desde)');
      return;
    }
    if (kind === 'DATE' && to && to < from) {
      showToast.error('La fecha "Hasta" no puede ser anterior a "Desde"');
      return;
    }
    setSaving(true);
    try {
      await closedDatesAdmin.create(
        kind === 'DATE'
          ? { kind, from, to: to || undefined, reason: reason || undefined }
          : { kind, weekday: Number(weekday), reason: reason || undefined },
      );
      showToast.success('Día cerrado agregado');
      setFrom('');
      setTo('');
      setReason('');
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo agregar');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Quitar este día/regla de cierre?')) return;
    try {
      await closedDatesAdmin.remove(id);
      showToast.success('Quitado');
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo quitar');
    }
  }

  function describe(c: ClosedDate): string {
    if (c.kind === 'WEEKLY')
      return `Todos los ${(WEEKDAY_LABELS[c.weekday ?? 0] ?? '').toLowerCase()}`;
    if (c.from && c.to && c.from !== c.to)
      return `${fmtYmd(c.from)} al ${fmtYmd(c.to)}`;
    return c.from ? fmtYmd(c.from) : '';
  }

  return (
    <div className='flex flex-col gap-4 rounded-xl border border-[#e6dbcd] bg-white p-5'>
      <div className='flex flex-wrap items-center gap-2'>
        <CalendarOff className='h-5 w-5 text-[#9d684e]' />
        <h2 className='font-tan-nimbus text-lg font-bold text-[#455a54]'>Días cerrados</h2>
        <span className='text-xs text-[#455a54]/60'>
          · el local no abre · bloquea turnos y reservas, y el bot avisa
        </span>
      </div>

      {/* Form */}
      <div className='grid items-end gap-3 sm:grid-cols-[1fr_2fr_1fr_auto]'>
        <Field label='Tipo'>
          <Select
            value={kind}
            onValueChange={(v) => setKind(v as ClosedDateKind)}
          >
            <SelectTrigger className={`w-full ${triggerCls}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='DATE'>Fecha / rango</SelectItem>
              <SelectItem value='WEEKLY'>Día de semana</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {kind === 'DATE' ? (
          <Field label='Desde (Hasta es opcional)'>
            <div className='flex items-center gap-2'>
              <DatePicker
                value={from}
                onChange={setFrom}
                placeholder='Desde'
                disablePast
                className='flex-1'
              />
              <span className='text-[#455a54]/60'>→</span>
              <DatePicker
                value={to}
                onChange={setTo}
                placeholder='Hasta'
                clearable
                disablePast
                className='flex-1'
              />
            </div>
          </Field>
        ) : (
          <Field label='Día (todas las semanas)'>
            <Select value={weekday} onValueChange={setWeekday}>
              <SelectTrigger className={`w-full ${triggerCls}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(WEEKDAY_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field label='Motivo (opcional)'>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder='Feriado…'
            className={fieldCls}
          />
        </Field>
        <Button
          type='button'
          variant='terracota'
          onClick={add}
          disabled={saving}
          className='font-mono text-xs tracking-wider'
        >
          <Plus className='h-4 w-4' /> {saving ? '…' : 'AGREGAR'}
        </Button>
      </div>

      {/* Lista */}
      {loading ? (
        <p className='text-sm text-[#455a54]/60'>Cargando…</p>
      ) : items.length === 0 ? (
        <p className='text-sm text-[#455a54]/60'>No hay días cerrados cargados.</p>
      ) : (
        <div className='flex flex-wrap gap-2'>
          {items.map((c) => (
            <span
              key={c.id}
              className='flex items-center gap-2 rounded-full border border-[#e6dbcd] bg-[#fbf5ef] px-3 py-1.5 text-xs text-[#455a54]'
            >
              <span className='font-medium'>{describe(c)}</span>
              {c.reason && <span className='text-[#455a54]/60'>· {c.reason}</span>}
              <button
                type='button'
                onClick={() => remove(c.id)}
                title='Quitar'
                className='text-[#455a54]/60 hover:text-[#b23b2e]'
              >
                <X className='h-3.5 w-3.5' />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className='flex flex-col gap-1.5'>
      <span className='font-mono text-[11px] tracking-wider text-[#455a54]/60'>
        {label.toUpperCase()}
      </span>
      {children}
    </div>
  );
}
