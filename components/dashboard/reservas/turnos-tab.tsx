'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CalendarOff,
  CopyPlus,
  Pencil,
  Plus,
  Sparkles,
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
  SESSION_STATUS_LABEL,
} from '@/lib/reservas-format';
import {
  reservationsAdmin,
  type AdminExperience,
  type AdminSession,
  type SessionSlotInput,
} from '@/services/reservations.admin.service';
import { fmtYmd } from '@/lib/reservas-format';
import {
  closedDatesAdmin,
  WEEKDAY_LABELS,
  type ClosedDate,
  type ClosedDateKind,
} from '@/services/closed-dates.admin.service';
import { AnotadosModal } from './anotados-modal';

interface SlotRow {
  date: string;
  time: string;
}

const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#3d3338] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';
const triggerCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#3d3338] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30 data-[placeholder]:text-[#7a6e6f]';

// Columnas explícitas (sin `auto`) para alinear header y filas. Sólo desktop;
// en mobile se usan tarjetas.
const COLS = 'grid grid-cols-[1.4fr_1.6fr_1.4fr_5rem_14rem] gap-3';

export function TurnosTab() {
  const [experiences, setExperiences] = useState<AdminExperience[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [anotados, setAnotados] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminSession | null>(null);

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
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => setAnotados(s.id)}
          className='border-[#e6dbcd] bg-[#fbf5ef] font-mono text-xs text-[#3d3338] hover:bg-[#f3e9df]'
        >
          <Users className='h-3.5 w-3.5' /> Anotados
        </Button>
        <Button
          type='button'
          variant='outline'
          size='icon'
          onClick={() => setEditing(s)}
          title='Editar turno'
          className='size-8 border-[#e6dbcd] text-[#7a6e6f] hover:bg-[#fbf5ef] hover:text-[#3d3338]'
        >
          <Pencil className='h-3.5 w-3.5' />
        </Button>
        <Button
          type='button'
          variant='outline'
          size='icon'
          onClick={() => doDelete(s)}
          title='Eliminar turno'
          className='size-8 border-[#e6dbcd] text-[#7a6e6f] hover:bg-red-50 hover:text-[#b23b2e]'
        >
          <Trash2 className='h-3.5 w-3.5' />
        </Button>
      </div>
    );
  }

  function cupoBar(s: AdminSession) {
    const pct = Math.round((s.seatsTaken / s.capacity) * 100);
    const full = s.seatsTaken >= s.capacity;
    return (
      <div className='flex flex-col gap-1.5'>
        <span className='text-xs text-[#3d3338]'>
          {s.seatsTaken} / {s.capacity} personas
        </span>
        <div className='h-1.5 w-32 max-w-full overflow-hidden rounded-full bg-[#e6dbcd]'>
          <div
            className='h-full rounded-full'
            style={{
              width: `${pct}%`,
              backgroundColor: full ? '#9d684e' : '#455a54',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-5'>
      {/* Panel generar */}
      <div className='flex flex-col gap-4 rounded-xl border border-[#e6dbcd] bg-white p-5'>
        <div className='flex items-center gap-2'>
          <CopyPlus className='h-5 w-5 text-[#9d684e]' />
          <h2 className='font-playfair text-lg text-[#3d3338]'>
            Generar turnos rápido
          </h2>
          <span className='text-xs text-[#7a6e6f]'>
            · repetí la experiencia en varias fechas
          </span>
        </div>

        <div className='grid gap-3 sm:grid-cols-[2fr_1fr_1fr]'>
          <Field label='Experiencia'>
            <Select value={expId || undefined} onValueChange={setExpId}>
              <SelectTrigger className={`w-full ${triggerCls}`}>
                <SelectValue placeholder='Elegí una experiencia' />
              </SelectTrigger>
              <SelectContent>
                {experiences.map((e) => (
                  <SelectItem key={e._id} value={e._id}>
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
          <span className='font-mono text-[11px] tracking-wider text-[#7a6e6f]'>
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
                  className='size-9 text-[#7a6e6f] hover:bg-[#fbf5ef] hover:text-[#b23b2e]'
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
            className='w-fit border-[#e6dbcd] text-[#7a6e6f] hover:bg-[#fbf5ef] hover:text-[#3d3338]'
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
            <Label htmlFor='publish' className='text-sm text-[#3d3338]'>
              Publicar (visible al público)
            </Label>
          </div>
          <Button
            type='button'
            variant='terracota'
            onClick={generate}
            disabled={generating}
            className='font-mono text-xs tracking-wider'
          >
            <Sparkles className='h-4 w-4' />
            {generating
              ? 'GENERANDO…'
              : `GENERAR ${validSlots.length || ''} TURNO${validSlots.length === 1 ? '' : 'S'}`}
          </Button>
        </div>
      </div>

      {/* Días cerrados */}
      <ClosedDatesPanel />

      {/* Lista de turnos — Desktop: tabla */}
      <div className='hidden overflow-x-auto rounded-xl border border-[#e6dbcd] bg-white md:block'>
        <div className='min-w-[52rem]'>
          <div className={`${COLS} border-b border-[#e6dbcd] bg-[#fbf5ef] px-5 py-3 font-mono text-[11px] tracking-wider text-[#7a6e6f]`}>
            <span>FECHA</span>
            <span>EXPERIENCIA</span>
            <span>CUPO</span>
            <span>ESTADO</span>
            <span></span>
          </div>
          {loading ? (
            <div className='p-6 text-sm text-[#7a6e6f]'>Cargando…</div>
          ) : sessions.length === 0 ? (
            <div className='p-6 text-sm text-[#7a6e6f]'>
              No hay turnos futuros. Generá arriba.
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className={`${COLS} items-center border-b border-[#e6dbcd] px-5 py-4 last:border-0`}
              >
                <span className='text-sm font-medium text-[#3d3338]'>
                  {fmtDateTime(s.startAt)}
                </span>
                <span className='text-sm text-[#3d3338]'>
                  {s.experienceName}
                </span>
                {cupoBar(s)}
                <span className='text-xs text-[#7a6e6f]'>
                  {SESSION_STATUS_LABEL[s.status] ?? s.status}
                </span>
                {renderTurnoActions(s)}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lista de turnos — Mobile: tarjetas */}
      <div className='flex flex-col gap-3 md:hidden'>
        {loading ? (
          <div className='rounded-xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#7a6e6f]'>
            Cargando…
          </div>
        ) : sessions.length === 0 ? (
          <div className='rounded-xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#7a6e6f]'>
            No hay turnos futuros. Generá arriba.
          </div>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className='rounded-xl border border-[#e6dbcd] bg-white p-4'
            >
              <div className='flex items-start justify-between gap-2'>
                <span className='text-sm font-medium text-[#3d3338]'>
                  {fmtDateTime(s.startAt)}
                </span>
                <span className='shrink-0 text-xs text-[#7a6e6f]'>
                  {SESSION_STATUS_LABEL[s.status] ?? s.status}
                </span>
              </div>
              <p className='mt-1 text-sm text-[#3d3338]'>{s.experienceName}</p>
              <div className='mt-2'>{cupoBar(s)}</div>
              <div className='mt-3'>{renderTurnoActions(s)}</div>
            </div>
          ))
        )}
      </div>

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
          <DialogTitle className='font-playfair text-xl text-[#3d3338]'>
            Editar turno
          </DialogTitle>
          <p className='text-sm text-[#7a6e6f]'>
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
      showToast.error('Elegí una fecha');
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
        <h2 className='font-playfair text-lg text-[#3d3338]'>Días cerrados</h2>
        <span className='text-xs text-[#7a6e6f]'>
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
          <Field label='Desde → Hasta (opcional)'>
            <div className='flex items-center gap-2'>
              <DatePicker
                value={from}
                onChange={setFrom}
                placeholder='Desde'
                className='flex-1'
              />
              <span className='text-[#7a6e6f]'>→</span>
              <DatePicker
                value={to}
                onChange={setTo}
                placeholder='Hasta'
                clearable
                className='flex-1'
              />
            </div>
          </Field>
        ) : (
          <Field label='Día'>
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
        <p className='text-sm text-[#7a6e6f]'>Cargando…</p>
      ) : items.length === 0 ? (
        <p className='text-sm text-[#7a6e6f]'>No hay días cerrados cargados.</p>
      ) : (
        <div className='flex flex-wrap gap-2'>
          {items.map((c) => (
            <span
              key={c.id}
              className='flex items-center gap-2 rounded-full border border-[#e6dbcd] bg-[#fbf5ef] px-3 py-1.5 text-xs text-[#3d3338]'
            >
              <span className='font-medium'>{describe(c)}</span>
              {c.reason && <span className='text-[#7a6e6f]'>· {c.reason}</span>}
              <button
                type='button'
                onClick={() => remove(c.id)}
                title='Quitar'
                className='text-[#7a6e6f] hover:text-[#b23b2e]'
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
      <span className='font-mono text-[11px] tracking-wider text-[#7a6e6f]'>
        {label.toUpperCase()}
      </span>
      {children}
    </div>
  );
}
