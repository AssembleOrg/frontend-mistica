'use client';

// Agenda de MESAS del día. El horario es LIBRE: una reserva arranca a
// cualquier hora dentro de la ventana del negocio (apertura–cierre) y cada
// mesa queda tomada de su inicio hasta el fin + limpieza. Dos reservas pueden
// usar la misma mesa el mismo día si sus horarios no se pisan.
//
// Se ven dos cosas: las reservas del día con las mesas que ocupan, y la
// grilla completa de mesas con sus ocupaciones (y bloqueos por rango horario).

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  Pencil,
  Users,
  UsersRound,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { AR_TZ, RESERVATION_STATUS_COLOR, prettyCode } from '@/lib/reservas-format';
import {
  tablesAdmin,
  type AgendaReservation,
  type DayAgenda,
  type TableHolder,
  type TableStatus,
} from '@/services/tables.admin.service';
import { StatusBadge } from './_shared';
import { ShiftTemplatesPanel } from './shift-templates-panel';
import { RecurringBlocksPanel } from './recurring-blocks-panel';
import { DietaryTags } from './dietary-badge';

// ─────────────────────────── helpers de fecha (AR) ───────────────────────────

function ymdInAR(iso: string | Date): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: AR_TZ });
}
function todayYmd(): string {
  return ymdInAR(new Date());
}
function atNoonUTC(ymd: string): Date {
  return new Date(`${ymd}T12:00:00Z`);
}
function addDays(ymd: string, days: number): string {
  const d = atNoonUTC(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function hourAR(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: AR_TZ,
  });
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function longDayLabel(ymd: string): string {
  const dt = atNoonUTC(ymd);
  return `${DIAS[dt.getUTCDay()]} ${Number(ymd.slice(8, 10))} de ${MESES[Number(ymd.slice(5, 7)) - 1]}`;
}

/** ¿Dos ocupaciones se pisan en el tiempo? Sin horas se asume que sí. */
function overlaps(
  a: { startAt?: string; busyUntil?: string; endAt?: string },
  b: { startAt?: string; busyUntil?: string; endAt?: string },
): boolean {
  const aStart = a.startAt ? new Date(a.startAt).getTime() : null;
  const aEnd = a.busyUntil ?? a.endAt;
  const bStart = b.startAt ? new Date(b.startAt).getTime() : null;
  const bEnd = b.busyUntil ?? b.endAt;
  if (aStart == null || aEnd == null || bStart == null || bEnd == null) {
    return true;
  }
  return aStart < new Date(bEnd).getTime() && new Date(aEnd).getTime() > bStart;
}

// ─────────────────────────────── pestaña ───────────────────────────────

export function MesasTab() {
  const [anchor, setAnchor] = useState<string>(todayYmd());
  const [agenda, setAgenda] = useState<DayAgenda | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  /** Mesas seleccionadas para armar un bloqueo (multi-selección). */
  const [blocking, setBlocking] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAgenda(await tablesAdmin.agenda(anchor));
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar la agenda de mesas');
    } finally {
      setLoading(false);
    }
  }, [anchor]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setBlocking([]);
  }, [anchor]);

  async function unblock(t: TableStatus, holder: TableHolder) {
    setBusy(true);
    try {
      await tablesAdmin.unblockTable({
        date: anchor,
        code: t.code,
        start: holder.startAt ? hourAR(holder.startAt) : undefined,
      });
      showToast.success(`${t.code} liberada`);
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo quitar el bloqueo');
    } finally {
      setBusy(false);
    }
  }

  async function block(
    codes: string[],
    label: string,
    start?: string,
    end?: string,
  ) {
    setBusy(true);
    try {
      await tablesAdmin.blockTable({ date: anchor, codes, label, start, end });
      showToast.success(
        codes.length === 1
          ? `${codes[0]} bloqueada`
          : `${codes.length} mesas bloqueadas (${codes.join(', ')})`,
      );
      setBlocking([]);
      await load();
    } catch (e) {
      showToast.error(
        e instanceof Error ? e.message : 'No se pudieron bloquear las mesas',
      );
    } finally {
      setBusy(false);
    }
  }

  async function reassign(r: AgendaReservation, codes: string[]) {
    try {
      await tablesAdmin.reassign({ reservationId: r.reservationId, tables: codes });
      showToast.success(`Mesas de ${r.customerName}: ${codes.join(', ')}`);
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudieron cambiar las mesas');
    }
  }

  const personas = agenda?.reservations.reduce((n, r) => n + r.qty, 0) ?? 0;
  const conUso = agenda?.tables.filter((t) => t.occupied).length ?? 0;

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2.5'>
          <button
            type='button'
            onClick={() => setAnchor(addDays(anchor, -1))}
            className='inline-flex size-8 items-center justify-center rounded-lg border border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
            aria-label='Día anterior'
          >
            <ChevronLeft className='h-4 w-4' />
          </button>
          <button
            type='button'
            onClick={() => setAnchor(addDays(anchor, 1))}
            className='inline-flex size-8 items-center justify-center rounded-lg border border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
            aria-label='Día siguiente'
          >
            <ChevronRight className='h-4 w-4' />
          </button>
          <h2 className='font-tan-nimbus text-xl font-semibold capitalize text-[#455a54] sm:text-[22px]'>
            {longDayLabel(anchor)}
          </h2>
          <button
            type='button'
            onClick={() => setAnchor(todayYmd())}
            className='rounded-lg border border-[#e6dbcd] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#3d3338] hover:bg-[#fbf5ef]'
          >
            Hoy
          </button>
          {loading && <span className='text-xs text-[#7a6e6f]'>cargando…</span>}
        </div>
        {agenda && (
          <div className='flex flex-wrap items-center gap-2 text-xs'>
            <Pill icon={Clock} text={`${agenda.open} – ${agenda.close}`} />
            <Pill icon={UsersRound} text={`${personas} personas`} />
            <Pill icon={Users} text={`${conUso}/${agenda.tables.length} mesas con uso`} />
            <span className='rounded-full border border-[#e6dbcd] bg-white px-2.5 py-1 text-[#7a6e6f]'>
              limpieza {agenda.cleaningMinutes} min
            </span>
          </div>
        )}
      </div>

      {agenda && (
        <section className='overflow-hidden rounded-2xl border border-[#e6dbcd] bg-white'>
          {/* Reservas del día */}
          <div className='flex flex-col gap-2.5 p-4'>
            {agenda.reservations.length === 0 && agenda.blocks.length === 0 ? (
              <p className='py-4 text-center text-sm text-[#7a6e6f]'>Sin reservas este día.</p>
            ) : (
              <>
                {agenda.reservations.map((r) => (
                  <ReservationRow
                    key={r.reservationId}
                    r={r}
                    allTables={agenda.tables}
                    onReassign={reassign}
                  />
                ))}
                {agenda.blocks.map((b, i) => (
                  <div
                    key={`${b.table}-${b.startAt ?? i}`}
                    className='flex items-center gap-2.5 rounded-xl border border-dashed border-[#e6dbcd] bg-[#fbf5ef] px-3.5 py-2.5'
                  >
                    <Lock className='h-4 w-4 shrink-0 text-[#7a6e6f]' />
                    <span className='text-sm font-medium text-[#3d3338]'>{b.label}</span>
                    {b.startAt && b.endAt && (
                      <span className='font-mono text-sm text-[#7a6e6f]'>
                        {hourAR(b.startAt)}–{hourAR(b.endAt)}
                      </span>
                    )}
                    {b.recurring && (
                      <span className='rounded-full bg-[#f4ead9] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#9d684e]'>
                        fijo semanal
                      </span>
                    )}
                    <TableChip code={b.table} tone='blocked' />
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Grilla de mesas */}
          <div className='border-t border-[#e6dbcd] px-4 py-4'>
            <div className='flex flex-col gap-4 lg:flex-row lg:gap-8'>
              <TableGroup
                title='Mesas de 2 personas'
                tables={agenda.tables.filter((t) => t.kind === 'SMALL')}
                busy={busy}
                selected={blocking}
                onPick={(t) => {
                  const manual = t.holders.find(
                    (h) => !h.reservationId && !h.recurring,
                  );
                  if (manual) {
                    unblock(t, manual);
                  } else if (
                    t.holders.some((h) => h.recurring) &&
                    !t.holders.some((h) => h.reservationId)
                  ) {
                    showToast.error(
                      'Es un bloqueo fijo semanal: editalo en el panel de abajo.',
                    );
                  } else {
                    // Multi-selección: se juntan varias mesas y se bloquean
                    // juntas (un cumpleaños puede ocupar más de una).
                    setBlocking((prev) =>
                      prev.includes(t.code)
                        ? prev.filter((c) => c !== t.code)
                        : [...prev, t.code],
                    );
                  }
                }}
              />
              <TableGroup
                title='Mesas grandes (10 personas)'
                tables={agenda.tables.filter((t) => t.kind === 'LARGE')}
                busy={busy}
                selected={blocking}
                onPick={(t) => {
                  const manual = t.holders.find(
                    (h) => !h.reservationId && !h.recurring,
                  );
                  if (manual) {
                    unblock(t, manual);
                  } else if (
                    t.holders.some((h) => h.recurring) &&
                    !t.holders.some((h) => h.reservationId)
                  ) {
                    showToast.error(
                      'Es un bloqueo fijo semanal: editalo en el panel de abajo.',
                    );
                  } else {
                    // Multi-selección: se juntan varias mesas y se bloquean
                    // juntas (un cumpleaños puede ocupar más de una).
                    setBlocking((prev) =>
                      prev.includes(t.code)
                        ? prev.filter((c) => c !== t.code)
                        : [...prev, t.code],
                    );
                  }
                }}
              />
            </div>

            {blocking.length > 0 && (
              <BlockForm
                codes={blocking}
                open={agenda.open}
                close={agenda.close}
                busy={busy}
                onRemove={(code) =>
                  setBlocking((prev) => prev.filter((c) => c !== code))
                }
                onCancel={() => setBlocking([])}
                onSave={(label, start, end) => block(blocking, label, start, end)}
              />
            )}

            <div className='mt-3.5 flex flex-wrap items-center gap-4 text-xs text-[#7a6e6f]'>
              <Legend swatch='bg-white border-[#e6dbcd]' label='Libre todo el día' />
              <Legend swatch='bg-[#e6dbcd] border-[#d8c9b6]' label='Con reservas' />
              <Legend swatch='bg-[#fbf5ef] border-dashed border-[#c3b7a4]' label='Bloqueada a mano' />
              <span className='text-[#a99f92]'>
                Clic en mesas libres para seleccionarlas y bloquearlas juntas;
                en una bloqueada, para liberarla.
              </span>
            </div>
          </div>
        </section>
      )}

      <p className='rounded-2xl border border-[#e6dbcd] bg-[#fbf5ef] px-4 py-3 text-[13px] text-[#7a6e6f]'>
        El horario es libre: una reserva puede arrancar a cualquier hora entre la
        apertura y el cierre. Cada mesa queda ocupada hasta el fin de la
        experiencia más {agenda?.cleaningMinutes ?? 10} minutos de limpieza. Los
        turnos de abajo son sugerencias para ordenar la oferta, no un límite.
      </p>

      <RecurringBlocksPanel />

      <ShiftTemplatesPanel />
    </div>
  );
}

// ─────────────────────────── bloqueo por rango ───────────────────────────

function BlockForm({
  codes,
  open,
  close,
  busy,
  onRemove,
  onCancel,
  onSave,
}: {
  codes: string[];
  open: string;
  close: string;
  busy: boolean;
  onRemove: (code: string) => void;
  onCancel: () => void;
  onSave: (label: string, start?: string, end?: string) => void;
}) {
  const [label, setLabel] = useState('Taller');
  const [allDay, setAllDay] = useState(true);
  const [start, setStart] = useState(open);
  const [end, setEnd] = useState(close);

  return (
    <div className='mt-4 flex flex-col gap-3 rounded-xl border-2 border-[#9d684e]/40 bg-[#fbf5ef] px-3.5 py-3'>
      <span className='flex flex-wrap items-center gap-1.5 text-sm font-semibold text-[#3d3338]'>
        Bloquear
        {codes.map((code) => (
          <button
            key={code}
            type='button'
            onClick={() => onRemove(code)}
            title='Quitar de la selección'
            className='inline-flex items-center gap-1 rounded-md border border-[#9d684e]/40 bg-white px-2 py-0.5 font-mono text-[12px] font-semibold text-[#455a54] hover:bg-[#f6e2e2] hover:line-through'
          >
            {code}
          </button>
        ))}
        <span className='font-normal text-[#7a6e6f]'>
          — seguí tocando mesas libres para agregar más
        </span>
      </span>
      <div className='flex flex-wrap items-center gap-3'>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder='Motivo (taller, evento, mesa rota)'
          className='w-56 rounded-lg border border-[#e6dbcd] bg-white px-3 py-2 text-sm text-[#3d3338] outline-none focus:border-[#9d684e]'
        />
        <label className='flex items-center gap-2 text-[13px] text-[#3d3338]'>
          <input
            type='checkbox'
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
          />
          Todo el día ({open}–{close})
        </label>
        {!allDay && (
          <span className='flex items-center gap-2 text-[13px] text-[#3d3338]'>
            de
            <input
              type='time'
              value={start}
              min={open}
              max={close}
              onChange={(e) => setStart(e.target.value)}
              className='rounded-lg border border-[#e6dbcd] bg-white px-2 py-1.5 text-sm'
            />
            a
            <input
              type='time'
              value={end}
              min={open}
              max={close}
              onChange={(e) => setEnd(e.target.value)}
              className='rounded-lg border border-[#e6dbcd] bg-white px-2 py-1.5 text-sm'
            />
          </span>
        )}
      </div>
      <div className='flex items-center gap-2'>
        <button
          type='button'
          disabled={busy || !label.trim() || (!allDay && end <= start)}
          onClick={() =>
            onSave(
              label.trim(),
              allDay ? undefined : start,
              allDay ? undefined : end,
            )
          }
          className='rounded-[9px] bg-[#455a54] px-3.5 py-1.5 text-[13px] font-medium text-white disabled:opacity-40'
        >
          {codes.length === 1 ? 'Bloquear mesa' : `Bloquear ${codes.length} mesas`}
        </button>
        <button
          type='button'
          disabled={busy}
          onClick={onCancel}
          className='rounded-[9px] border border-[#e6dbcd] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#7a6e6f] hover:bg-[#fbf5ef]'
        >
          Cancelar
        </button>
        {!allDay && end <= start && (
          <span className='text-[12px] font-medium text-[#a33]'>
            El fin tiene que ser después del inicio.
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── fila de reserva ───────────────────────────

function ReservationRow({
  r,
  allTables,
  onReassign,
}: {
  r: AgendaReservation;
  allTables: TableStatus[];
  onReassign: (r: AgendaReservation, codes: string[]) => Promise<void>;
}) {
  const [bg, fg] = RESERVATION_STATUS_COLOR[r.status ?? ''] ?? ['#E7F0EC', '#455a54'];
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <ReassignRow
        r={r}
        allTables={allTables}
        onCancel={() => setEditing(false)}
        onSave={async (codes) => {
          await onReassign(r, codes);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className='flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[#e6dbcd] bg-white px-3.5 py-2.5'>
      <span className='font-mono text-[13px] font-semibold text-[#455a54]'>
        {hourAR(r.startAt)}–{hourAR(r.endAt)}
      </span>
      <span className='min-w-0 flex-1 truncate text-sm font-semibold text-[#3d3338]'>
        {r.customerName}
      </span>
      <span className='inline-flex items-center gap-1.5 text-[13px] text-[#7a6e6f]'>
        <Users className='h-3.5 w-3.5' />
        {r.qty}
      </span>
      <span className='truncate text-[13px] text-[#7a6e6f]'>{r.experienceName}</span>
      {r.code && (
        <span className='font-mono text-[11px] text-[#a99f92]'>{prettyCode(r.code)}</span>
      )}
      {r.status && <StatusBadge label={r.status} bg={bg} fg={fg} />}
      {r.shared && (
        <span className='rounded-full bg-[#f4ead9] px-2.5 py-1 text-[11px] font-semibold text-[#9d684e]'>
          mesa compartida
        </span>
      )}
      <span className='flex flex-wrap gap-1.5'>
        {r.tables.map((code) => (
          <TableChip key={code} code={code} tone='assigned' />
        ))}
      </span>
      <DietaryTags tags={r.dietaryTags} notes={r.dietaryNotes} compact />
      <button
        type='button'
        onClick={() => setEditing(true)}
        className='inline-flex items-center gap-1.5 rounded-[9px] border border-[#e6dbcd] bg-white px-2.5 py-1 text-[12px] font-medium text-[#455a54] hover:bg-[#fbf5ef]'
      >
        <Pencil className='h-3 w-3' />
        Cambiar mesas
      </button>
    </div>
  );
}

/**
 * Selección manual de mesas para una reserva. Se pueden elegir las libres EN
 * EL HORARIO de la reserva: una mesa ocupada por otro grupo a otra hora del
 * día sigue disponible para ésta.
 */
function ReassignRow({
  r,
  allTables,
  onCancel,
  onSave,
}: {
  r: AgendaReservation;
  allTables: TableStatus[];
  onCancel: () => void;
  onSave: (codes: string[]) => Promise<void>;
}) {
  const [picked, setPicked] = useState<string[]>(r.tables);
  const [saving, setSaving] = useState(false);

  const seats = useMemo(() => {
    const kinds = picked.map(
      (c) => allTables.find((t) => t.code === c)?.kind ?? 'SMALL',
    );
    const larges = kinds.filter((k) => k === 'LARGE').length;
    const smalls = kinds.filter((k) => k === 'SMALL').length;
    if (larges === 0) return smalls * 2;
    // Una mesa grande rinde 10 sola y 9 en cuanto se le une otra mesa.
    const perLarge = larges > 1 || smalls > 0 ? 9 : 10;
    return larges * perLarge + smalls * 2;
  }, [picked, allTables]);

  const falta = seats < r.qty;

  /** ¿La mesa está tomada por OTRO en el horario de esta reserva? */
  function takenByOther(t: TableStatus): boolean {
    return t.holders.some(
      (h) => h.reservationId !== r.reservationId && overlaps(h, r),
    );
  }

  return (
    <div className='flex flex-col gap-2.5 rounded-xl border-2 border-[#9d684e]/40 bg-[#fbf5ef] px-3.5 py-3'>
      <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
        <span className='text-sm font-semibold text-[#3d3338]'>{r.customerName}</span>
        <span className='font-mono text-[13px] text-[#7a6e6f]'>
          {hourAR(r.startAt)}–{hourAR(r.endAt)}
        </span>
        <span className='text-[13px] text-[#7a6e6f]'>{r.qty} personas</span>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-[11px] font-semibold',
            falta ? 'bg-[#f6e2e2] text-[#a33]' : 'bg-[#E7F0EC] text-[#455a54]',
          )}
        >
          {picked.length} mesas · {seats} lugares
          {falta ? ` — faltan ${r.qty - seats}` : ''}
        </span>
      </div>

      <div className='flex flex-wrap gap-2'>
        {allTables.map((t) => {
          const taken = takenByOther(t);
          const on = picked.includes(t.code);
          return (
            <button
              key={t.code}
              type='button'
              disabled={taken || saving}
              onClick={() =>
                setPicked((p) =>
                  p.includes(t.code) ? p.filter((c) => c !== t.code) : [...p, t.code],
                )
              }
              className={cn(
                'rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors',
                taken
                  ? 'cursor-not-allowed border-[#e6dbcd] bg-[#e6dbcd] text-[#a99f92] line-through'
                  : on
                    ? 'border-[#455a54] bg-[#455a54] text-white'
                    : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-white/60',
              )}
              title={taken ? 'Ocupada en este horario por otra reserva' : t.code}
            >
              {t.code}
              {t.kind === 'LARGE' && (
                <span className='ml-1 text-[11px] font-normal opacity-70'>10</span>
              )}
            </button>
          );
        })}
      </div>

      <div className='flex items-center gap-2'>
        <button
          type='button'
          disabled={saving || falta || picked.length === 0}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave(picked);
            } finally {
              setSaving(false);
            }
          }}
          className='rounded-[9px] bg-[#455a54] px-3.5 py-1.5 text-[13px] font-medium text-white disabled:opacity-40'
        >
          {saving ? 'Guardando…' : 'Guardar mesas'}
        </button>
        <button
          type='button'
          disabled={saving}
          onClick={onCancel}
          className='rounded-[9px] border border-[#e6dbcd] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#7a6e6f] hover:bg-[#fbf5ef]'
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────── grilla de mesas ───────────────────────────

function TableGroup({
  title,
  tables,
  busy,
  selected,
  onPick,
}: {
  title: string;
  tables: TableStatus[];
  busy: boolean;
  /** Mesas marcadas para el próximo bloqueo (multi-selección). */
  selected: string[];
  onPick: (t: TableStatus) => void;
}) {
  return (
    <div className='min-w-0 flex-1'>
      <p className='mb-2 text-[13px] font-medium text-[#7a6e6f]'>{title}</p>
      <div className='flex flex-wrap gap-2'>
        {tables.map((t) => {
          const manual = t.holders.find((h) => !h.reservationId && !h.recurring);
          const fijo = t.holders.find((h) => h.recurring);
          const reservas = t.holders.filter((h) => h.reservationId);
          const picked = selected.includes(t.code);
          const usos = reservas
            .map((h) => `${hourAR(h.startAt)}–${hourAR(h.endAt)} (${h.qty}p)`)
            .join(' · ');
          return (
            <button
              key={t.code}
              type='button'
              disabled={busy}
              onClick={() => onPick(t)}
              title={
                manual
                  ? `${manual.label ?? 'Bloqueada'} — clic para liberar`
                  : fijo && !reservas.length
                    ? `${fijo.label ?? 'Bloqueo fijo'} (${hourAR(fijo.startAt)}–${hourAR(fijo.endAt)}) — fijo semanal, se edita en su panel`
                    : reservas.length
                      ? `Reservas: ${usos} — clic para bloquear otro horario`
                      : 'Libre — clic para bloquear'
              }
              className={cn(
                'relative inline-flex min-w-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors disabled:opacity-50',
                picked
                  ? 'border-[#9d684e] bg-[#9d684e] text-white'
                  : manual || (fijo && !reservas.length)
                    ? 'border-dashed border-[#c3b7a4] bg-[#fbf5ef] text-[#7a6e6f]'
                    : reservas.length
                      ? 'border-[#d8c9b6] bg-[#e6dbcd] text-[#3d3338]'
                      : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]',
              )}
            >
              <span className='inline-flex items-center gap-1'>
                {(manual || fijo) && <Lock className='h-3 w-3' />}
                {t.code}
              </span>
              {reservas.length > 0 ? (
                <span className='text-xs font-normal leading-none opacity-80'>
                  {reservas.length === 1
                    ? `${hourAR(reservas[0].startAt)}–${hourAR(reservas[0].endAt)}`
                    : `${reservas.length} usos`}
                </span>
              ) : fijo ? (
                <span className='text-xs font-normal leading-none opacity-80'>
                  {hourAR(fijo.startAt)}–{hourAR(fijo.endAt)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TableChip({ code, tone }: { code: string; tone: 'assigned' | 'blocked' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold',
        tone === 'assigned'
          ? 'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54]'
          : 'border-dashed border-[#c3b7a4] bg-white text-[#7a6e6f]',
      )}
    >
      {code}
    </span>
  );
}

function Pill({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return (
    <span className='inline-flex items-center gap-1.5 rounded-full border border-[#e6dbcd] bg-white px-2.5 py-1 text-[#455a54]'>
      <Icon className='h-3.5 w-3.5' />
      {text}
    </span>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className='inline-flex items-center gap-1.5'>
      <span className={cn('inline-block h-3.5 w-3.5 rounded border', swatch)} />
      {label}
    </span>
  );
}
