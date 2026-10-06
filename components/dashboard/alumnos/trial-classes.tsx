'use client';

// Clases de prueba agendadas: alguien que todavía no es alumno viene a probar
// un grupo un día puntual. La profe lo ve en el grupo, en la asistencia de ese
// día y en la agenda. No genera cuota: recién al inscribirse arranca su mes
// (desde la clase que se elija), y la prueba queda afuera.

import { useMemo, useState } from 'react';
import { CalendarPlus, Loader2, UserCheck, X } from 'lucide-react';
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
import { useConfirm } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { fmtPrice } from '@/lib/reservas-format';
import {
  tallerAdmin,
  type Group,
  type Student,
  type TrialClass,
} from '@/services/taller.admin.service';
import { ResponsableField, useResponsable } from '@/components/dashboard/responsable-field';

const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

/** 'YYYY-MM-DD' de hoy en Argentina. */
export function todayAR(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

/** Próximas fechas de clase del grupo desde `from` (incluido). */
function classDatesFrom(group: Group, from: string, count = 6): string[] {
  const slot = group.schedule[0];
  if (!slot) return [];
  const d = new Date(`${from}T12:00:00Z`);
  const out: string[] = [];
  for (let i = 0; i < 120 && out.length < count; i++) {
    if ((d.getUTCDay() || 7) === slot.weekday) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

const addDays = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** "mié 8/10". */
export function trialDateLabel(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  const day = d.toLocaleDateString('es-AR', { weekday: 'short', timeZone: 'UTC' });
  return `${day.replace('.', '')} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

/** Pruebas de un grupo, en su tarjeta: agendadas, si vino y si se inscribió. */
export function GroupTrials({
  trials,
  canManage,
  onCancel,
  onEnroll,
}: {
  trials: TrialClass[];
  canManage: boolean;
  onCancel: (t: TrialClass) => void;
  onEnroll: (t: TrialClass) => void;
}) {
  const today = todayAR();
  if (trials.length === 0) return null;
  return (
    <div className='flex flex-col gap-1 rounded-lg border border-dashed border-[#cc844a]/50 bg-[#fdf6ee] px-2.5 py-2'>
      <span className='font-mono text-[10px] tracking-wider text-[#cc844a]'>CLASES DE PRUEBA</span>
      {trials.map((t) => {
        const past = t.date < today;
        const state = t.enrolled
          ? { label: 'se inscribió', cls: 'bg-[#E7F0EC] text-[#455a54]' }
          : t.attended
            ? { label: 'vino', cls: 'bg-[#E7F0EC] text-[#455a54]' }
            : past
              ? { label: 'no vino', cls: 'bg-[#f1ede6] text-[#7a6e6f]' }
              : t.date === today
                ? { label: 'hoy', cls: 'bg-[#F6E9DC] text-[#cc844a]' }
                : null;
        return (
          <div key={t._id} className='flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#3d3338]'>
            <span className='font-semibold'>{trialDateLabel(t.date)}</span>
            <span className='min-w-0 truncate'>{t.student.name}</span>
            {t.student.phone && <span className='text-[#7a6e6f]'>{t.student.phone}</span>}
            {state && (
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', state.cls)}>
                {state.label}
              </span>
            )}
            <span className='ml-auto flex items-center gap-1'>
              {canManage && !t.enrolled && (t.attended || t.date <= today) && (
                <button
                  type='button'
                  onClick={() => onEnroll(t)}
                  className='inline-flex items-center gap-1 rounded-full border border-[#455a54]/30 bg-[#E7F0EC] px-2 py-0.5 text-[11px] font-medium text-[#455a54] hover:bg-[#d9e8e1]'
                >
                  <UserCheck className='h-3 w-3' />
                  Inscribir
                </button>
              )}
              {!past && !t.enrolled && (
                <button
                  type='button'
                  onClick={() => onCancel(t)}
                  title='Cancelar la clase de prueba'
                  aria-label='Cancelar la clase de prueba'
                  className='inline-flex size-6 items-center justify-center rounded-md text-[#a33] hover:bg-[#fbe4e4]'
                >
                  <X className='h-3.5 w-3.5' />
                </button>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Agendar una clase de prueba: el día (de los del grupo) y quién viene. */
export function ScheduleTrialDialog({
  group,
  students,
  groups,
  onClose,
  onDone,
}: {
  group: Group;
  students: Student[];
  groups: Group[];
  onClose: () => void;
  onDone: (t: TrialClass) => void;
}) {
  const dates = classDatesFrom(group, todayAR());
  const responsable = useResponsable();
  const [date, setDate] = useState(dates[0] ?? '');
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // La prueba es para quien todavía no está en ningún grupo ni la usó.
  const candidates = useMemo(
    () =>
      students.filter(
        (s) => !s.trialDate && !groups.some((g) => g.studentIds.includes(s._id)),
      ),
    [students, groups],
  );

  async function submit() {
    if (!date) return showToast.error('Elegí el día de la clase');
    if (mode === 'existing' && !studentId) return showToast.error('Elegí quién viene');
    if (mode === 'new' && name.trim().length < 2)
      return showToast.error('Escribí el nombre de quien viene a probar');
    setSaving(true);
    try {
      const t = await tallerAdmin.scheduleTrial({
        groupId: group._id,
        date,
        ...(mode === 'existing'
          ? { studentId }
          : { name: name.trim(), phone: phone.trim() || undefined }),
        notes: notes.trim() || undefined,
        doneBy: responsable.value.trim() || undefined,
      });
      showToast.success(`Clase de prueba agendada para el ${trialDateLabel(date)}`);
      onDone(t);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo agendar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader className='text-left'>
          <DialogTitle className='font-tan-nimbus text-xl text-[#455a54]'>
            Clase de prueba · {group.name}
          </DialogTitle>
          <DialogDescription>
            Es gratis y no cuenta para el mes: si se queda, su mes arranca desde la
            clase que elijas al inscribirla. La profe la ve en el grupo y en la
            asistencia de ese día.
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-3'>
          <div className='flex flex-col gap-1.5'>
            <span className='text-[13px] font-medium text-[#455a54]'>Día de la clase</span>
            {dates.length === 0 ? (
              <p className='text-sm text-[#a33]'>El grupo no tiene horario cargado.</p>
            ) : (
              <div className='flex flex-wrap gap-1.5'>
                {dates.map((d) => (
                  <button
                    key={d}
                    type='button'
                    onClick={() => setDate(d)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-semibold transition',
                      date === d
                        ? 'border-[#455a54] bg-[#455a54] text-white'
                        : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]',
                    )}
                  >
                    {trialDateLabel(d)}
                    {group.schedule[0] ? ` · ${group.schedule[0].start}` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className='flex gap-1.5'>
            {(
              [
                { key: 'new', label: 'Persona nueva' },
                { key: 'existing', label: 'Ya está cargada' },
              ] as const
            ).map((o) => (
              <button
                key={o.key}
                type='button'
                onClick={() => setMode(o.key)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-semibold transition',
                  mode === o.key
                    ? 'border-[#9d684e] bg-[#9d684e] text-white'
                    : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          {mode === 'new' ? (
            <div className='grid gap-2 sm:grid-cols-2'>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Nombre y apellido'
                autoFocus
                className={fieldCls}
              />
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder='Teléfono (opcional)'
                inputMode='tel'
                className={fieldCls}
              />
            </div>
          ) : (
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className={cn(fieldCls, 'h-10 rounded-md border px-2 text-sm')}
            >
              <option value=''>Elegí quién viene…</option>
              {candidates.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder='Nota para la profe (opcional)'
            maxLength={300}
            className={fieldCls}
          />
          <ResponsableField
            value={responsable.value}
            onChange={responsable.onChange}
            label='¿Quién la agenda?'
          />
        </div>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={onClose} className='border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54]'>
            Cancelar
          </Button>
          <Button type='button' variant='verde' onClick={() => void submit()} disabled={saving || !date} className='gap-1.5'>
            {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : <CalendarPlus className='h-4 w-4' />}
            Agendar prueba
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Días entre dos fechas 'YYYY-MM-DD'. */
const daysBetween = (a: string, b: string) =>
  Math.round(
    (new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86_400_000,
  );

/** El próximo 10 después de una fecha (el de ese mes si todavía no pasó). */
function nextTenth(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const target = d < 10 ? new Date(Date.UTC(y, m - 1, 10)) : new Date(Date.UTC(y, m, 10));
  return target.toISOString().slice(0, 10);
}

/**
 * Inscribir a quien vino a probar: entra al grupo y su mes arranca en la clase
 * elegida (la de prueba no cuenta). Paga ese mismo día de cada mes, o un
 * proporcional para pasar a pagar del 1 al 10 como el resto.
 */
export function EnrollTrialDialog({
  trial,
  group,
  students,
  onClose,
  onDone,
}: {
  trial: TrialClass;
  group: Group;
  students: Student[];
  onClose: () => void;
  onDone: () => void;
}) {
  const starts = classDatesFrom(group, addDays(trial.date, 1));
  // Cuota de referencia: la que más se repite en el grupo.
  const suggestedFee = useMemo(() => {
    const counts = new Map<number, number>();
    for (const s of students) {
      if (!group.studentIds.includes(s._id) || !s.monthlyFee) continue;
      counts.set(s.monthlyFee, (counts.get(s.monthlyFee) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [students, group.studentIds]);

  const [start, setStart] = useState(starts[0] ?? '');
  const [plan, setPlan] = useState<'same-day' | 'tenth'>('same-day');
  const [fee, setFee] = useState(suggestedFee ? String(suggestedFee) : '');
  const [firstEdited, setFirstEdited] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const feeN = Number(fee) || 0;
  const startDay = start ? Number(start.slice(8, 10)) : 0;
  // Del 1 al 10: si arranca después del 10, paga los días hasta el próximo 10.
  const tenth = start ? nextTenth(start) : '';
  const proportionalDays = start && startDay > 10 ? daysBetween(start, tenth) : 0;
  const proportional = proportionalDays
    ? Math.round((feeN * proportionalDays) / 30 / 100) * 100
    : feeN;
  const firstAmount =
    plan === 'tenth' ? (firstEdited !== null ? Number(firstEdited) || 0 : proportional) : feeN;

  async function submit() {
    if (!start) return showToast.error('Elegí desde qué clase arranca');
    setSaving(true);
    try {
      await tallerAdmin.enrollTrial(trial._id, {
        startDate: start,
        paymentDay: plan === 'tenth' ? 10 : startDay,
        ...(fee !== '' && { monthlyFee: feeN }),
        ...(plan === 'tenth' && { firstAmount }),
      });
      showToast.success(`${trial.student.name} quedó inscripta en ${group.name}`);
      onDone();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo inscribir');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader className='text-left'>
          <DialogTitle className='font-tan-nimbus text-xl text-[#455a54]'>
            Inscribir a {trial.student.name}
          </DialogTitle>
          <DialogDescription>
            Probó el {trialDateLabel(trial.date)} en {group.name}. Esa clase no se cobra: el mes
            arranca en la clase que elijas.
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-3'>
          <div className='flex flex-col gap-1.5'>
            <span className='text-[13px] font-medium text-[#455a54]'>Arranca el</span>
            <div className='flex flex-wrap gap-1.5'>
              {starts.map((d) => (
                <button
                  key={d}
                  type='button'
                  onClick={() => {
                    setStart(d);
                    setFirstEdited(null);
                  }}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-semibold transition',
                    start === d
                      ? 'border-[#455a54] bg-[#455a54] text-white'
                      : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]',
                  )}
                >
                  {trialDateLabel(d)}
                </button>
              ))}
            </div>
          </div>

          <label className='flex flex-col gap-1.5'>
            <span className='text-[13px] font-medium text-[#455a54]'>Cuota mensual</span>
            <Input
              value={fee}
              onChange={(e) => {
                setFee(e.target.value.replace(/[^\d]/g, ''));
                setFirstEdited(null);
              }}
              inputMode='numeric'
              placeholder='$'
              className={fieldCls}
            />
          </label>

          <div className='flex flex-col gap-1.5'>
            <span className='text-[13px] font-medium text-[#455a54]'>Cómo paga</span>
            <button
              type='button'
              onClick={() => setPlan('same-day')}
              className={cn(
                'rounded-xl border px-3 py-2 text-left text-[13px] transition',
                plan === 'same-day'
                  ? 'border-[#455a54] bg-[#E7F0EC] text-[#3d3338]'
                  : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]',
              )}
            >
              <b>Del {startDay || '…'} al {startDay || '…'}</b> de cada mes: paga {fmtPrice(feeN)} el día que
              arranca.
            </button>
            <button
              type='button'
              onClick={() => setPlan('tenth')}
              className={cn(
                'rounded-xl border px-3 py-2 text-left text-[13px] transition',
                plan === 'tenth'
                  ? 'border-[#455a54] bg-[#E7F0EC] text-[#3d3338]'
                  : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]',
              )}
            >
              <b>Del 1 al 10</b>, como el resto:{' '}
              {proportionalDays
                ? `ahora paga el proporcional hasta el ${trialDateLabel(tenth)} (${proportionalDays} días).`
                : 'paga el mes entero al arrancar.'}
            </button>
            {plan === 'tenth' && (
              <label className='flex items-center gap-2 text-[13px] text-[#455a54]'>
                Primera cuota
                <Input
                  value={firstEdited ?? String(proportional)}
                  onChange={(e) => setFirstEdited(e.target.value.replace(/[^\d]/g, ''))}
                  inputMode='numeric'
                  className={cn(fieldCls, 'h-8 w-28')}
                />
              </label>
            )}
          </div>
          <p className='text-xs text-[#7a6e6f]'>
            Queda una cuota pendiente de {fmtPrice(firstAmount)} que vence el día que arranca; se
            cobra desde Ventas o Alumnos como siempre.
          </p>
        </div>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={onClose} className='border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54]'>
            Cancelar
          </Button>
          <Button type='button' variant='verde' onClick={() => void submit()} disabled={saving || !start} className='gap-1.5'>
            {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : <UserCheck className='h-4 w-4' />}
            Inscribir en el grupo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Confirmación para cancelar una prueba agendada. */
export function useCancelTrial(onCancelled: (id: string) => void) {
  const confirm = useConfirm();
  return async (t: TrialClass) => {
    const ok = await confirm({
      title: 'Cancelar clase de prueba',
      description: `${t.student.name} ya no viene el ${trialDateLabel(t.date)}. Queda cargada por si la reagendás.`,
      confirmLabel: 'Cancelar la prueba',
    });
    if (!ok) return;
    try {
      await tallerAdmin.cancelTrial(t._id);
      onCancelled(t._id);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo cancelar');
    }
  };
}
