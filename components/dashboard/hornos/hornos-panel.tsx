'use client';

// Registro de los hornos. Quien prende un horno lo marca acá y arranca un
// timer (13 h el frontal, 26 h el superior); hasta que termina no se puede
// volver a prender. Ya no se anota cuándo se apagó. Sirve para ver cuántas
// veces se prendió en la semana y si algún día se olvidaron.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Flame, History, PowerOff, RotateCcw, Timer, Trash2 } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { cn } from '@/lib/utils';
import { AR_TZ } from '@/lib/reservas-format';
import { useAuth } from '@/hooks/useAuth';
import { canManageRole } from '@/lib/views';
import {
  ResponsableField,
  useResponsable,
} from '@/components/dashboard/responsable-field';
import {
  kilnsAdmin,
  type KilnAction,
  type KilnKey,
  type KilnLogItem,
  type KilnStatus,
} from '@/services/kilns.admin.service';
import { errorText } from '@/lib/api-error-messages';

const DAY_MS = 86_400_000;
const RESET_NOTE = 'Timer reiniciado';

// Fecha de hoy en Argentina, YYYY-MM-DD.
function todayAR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: AR_TZ });
}

function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  return new Date(d.getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

// Lunes de la semana de `ymd`.
function mondayOf(ymd: string): string {
  const dow = new Date(`${ymd}T12:00:00Z`).getUTCDay();
  return addDays(ymd, dow === 0 ? -6 : 1 - dow);
}

function dayKeyAR(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: AR_TZ });
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: AR_TZ,
  });
  const time = d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: AR_TZ,
  });
  return `${day} ${time}`;
}

// "12 h 05 min" / "8 min".
function fmtLeft(ms: number): string {
  const totalMin = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, '0')} min`;
}

function dayTitle(ymd: string): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    timeZone: 'UTC',
  });
}

export function HornosPanel() {
  const { user } = useAuth();
  const canManage = canManageRole(user?.role);
  const confirm = useConfirm();
  const responsable = useResponsable();
  const [status, setStatus] = useState<KilnStatus[]>([]);
  const [logs, setLogs] = useState<KilnLogItem[]>([]);
  const [monday, setMonday] = useState(() => mondayOf(todayAR()));
  const [busy, setBusy] = useState<string | null>(null);
  // Horno que se prendió y nadie marcó: admin/encargado lo cargan después.
  const [pastOpen, setPastOpen] = useState(false);
  const [past, setPast] = useState<{ kiln: KilnKey; action: KilnAction; day: string; time: string }>(
    () => ({ kiln: 'SUPERIOR', action: 'ON', day: todayAR(), time: '09:00' }),
  );
  const sunday = addDays(monday, 6);
  // Reloj para la cuenta regresiva de los hornos prendidos.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    try {
      const [st, lg] = await Promise.all([
        kilnsAdmin.status(),
        kilnsAdmin.logs(monday, sunday),
      ]);
      setStatus(st);
      setLogs(lg);
    } catch (e) {
      showToast.error(errorText(e, 'Error al cargar los hornos'));
    }
  }, [monday, sunday]);

  useEffect(() => {
    void load();
  }, [load]);

  // Cuando termina un timer, se refresca el estado para habilitar el botón.
  const nextEnd = useMemo(() => {
    const ends = status
      .map((k) => (k.endsAt ? new Date(k.endsAt).getTime() : 0))
      .filter((t) => t > Date.now());
    return ends.length ? Math.min(...ends) : 0;
  }, [status]);
  useEffect(() => {
    if (nextEnd && now >= nextEnd) void load();
  }, [now, nextEnd, load]);

  async function register(kiln: KilnKey, action: KilnAction) {
    if (responsable.shared && !responsable.value.trim()) {
      return showToast.error('Elegí quién lo hace');
    }
    setBusy(kiln);
    try {
      await kilnsAdmin.register({
        kiln,
        action,
        ...(responsable.value.trim() ? { registeredBy: responsable.value.trim() } : {}),
      });
      showToast.success('Horno prendido: arrancó el timer');
      await load();
    } catch (e) {
      showToast.error(errorText(e, 'No se pudo registrar'));
    } finally {
      setBusy(null);
    }
  }

  // Por si lo prendieron por error: corta el timer y el horno queda libre.
  // Se guarda como un apagado con nota, así queda en el historial.
  async function resetTimer(k: KilnStatus) {
    if (responsable.shared && !responsable.value.trim()) {
      return showToast.error('Elegí quién lo hace');
    }
    const ok = await confirm({
      title: 'Reiniciar timer',
      description: `El horno de ${k.kilnName.toLowerCase()} queda libre para volver a prenderlo. Usalo sólo si se marcó por error o hay que empezar de nuevo.`,
      confirmLabel: 'Reiniciar',
      typeToConfirm: 'confirmar',
    });
    if (!ok) return;
    setBusy(k.kiln);
    try {
      await kilnsAdmin.register({
        kiln: k.kiln,
        action: 'OFF',
        note: RESET_NOTE,
        ...(responsable.value.trim() ? { registeredBy: responsable.value.trim() } : {}),
      });
      showToast.success('Timer reiniciado');
      await load();
    } catch (e) {
      showToast.error(errorText(e, 'No se pudo reiniciar'));
    } finally {
      setBusy(null);
    }
  }

  async function registerPast() {
    if (!past.day || !past.time) return showToast.error('Elegí día y hora');
    const at = new Date(`${past.day}T${past.time}:00-03:00`);
    if (at.getTime() > Date.now()) return showToast.error('Esa hora todavía no pasó');
    setBusy('past');
    try {
      await kilnsAdmin.register({
        kiln: past.kiln,
        action: past.action,
        at: at.toISOString(),
        ...(responsable.value.trim() ? { registeredBy: responsable.value.trim() } : {}),
      });
      showToast.success('Horno cargado');
      setPastOpen(false);
      setMonday(mondayOf(past.day));
      await load();
    } catch (e) {
      showToast.error(errorText(e, 'No se pudo cargar'));
    } finally {
      setBusy(null);
    }
  }

  async function remove(l: KilnLogItem) {
    const ok = await confirm({
      title: 'Borrar registro',
      description: `${l.actionName} · ${l.kilnName} · ${fmtWhen(l.at)}. Se borra del registro.`,
    });
    if (!ok) return;
    try {
      await kilnsAdmin.remove(l.id);
      await load();
    } catch (e) {
      showToast.error(errorText(e, 'No se pudo borrar'));
    }
  }

  // Semana: por día, cuántas veces se prendió cada horno.
  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    return days.map((d) => {
      const on = logs.filter((l) => l.action === 'ON' && dayKeyAR(l.at) === d);
      return {
        day: d,
        superior: on.filter((l) => l.kiln === 'SUPERIOR').length,
        frontal: on.filter((l) => l.kiln === 'FRONTAL').length,
      };
    });
  }, [logs, monday]);
  const totalOn = logs.filter((l) => l.action === 'ON').length;

  return (
    <div className='flex flex-col gap-4'>
      {responsable.shared && (
        <div className='max-w-xs'>
          <ResponsableField
            value={responsable.value}
            onChange={responsable.onChange}
            label='¿Quién lo hace?'
          />
        </div>
      )}

      {/* Cada horno: estado y el botón que corresponde. */}
      <div className='grid gap-3 sm:grid-cols-2'>
        {status.map((k) => {
          const endsAt = k.endsAt ? new Date(k.endsAt).getTime() : 0;
          const left = endsAt - now;
          const running = endsAt > 0 && left > 0;
          const total = k.durationMs ?? 0;
          const pct = running && total ? Math.min(100, Math.max(0, ((total - left) / total) * 100)) : 0;
          const hours = total ? Math.round(total / 3_600_000) : null;
          return (
            <div
              key={k.kiln}
              className={cn(
                'flex flex-col gap-3 rounded-2xl border p-4',
                running ? 'border-[#9d684e]/50 bg-[#f3e2d0]' : 'border-[#e6dbcd] bg-white',
              )}
            >
              <div className='flex items-center gap-2'>
                <Flame className={cn('size-5 shrink-0', running ? 'text-[#9d684e]' : 'text-[#c4b8aa]')} />
                <p className='min-w-0 flex-1 text-base font-semibold text-[#3d3338]'>
                  Horno de {k.kilnName.toLowerCase()}
                </p>
                {hours && (
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-[#7a6e6f]',
                      running ? 'bg-white/70' : 'bg-[#fbf5ef]',
                    )}
                  >
                    {hours} h
                  </span>
                )}
              </div>

              {running ? (
                <div className='flex flex-col gap-2'>
                  <div className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5'>
                    <p className='text-2xl font-semibold tabular-nums text-[#9d684e]'>
                      {fmtLeft(left)}
                    </p>
                    <p className='text-xs text-[#7a6e6f]'>termina {fmtWhen(new Date(endsAt).toISOString())}</p>
                  </div>
                  <div
                    className='h-2 overflow-hidden rounded-full bg-white/80'
                    role='progressbar'
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(pct)}
                    aria-label={`Horno de ${k.kilnName.toLowerCase()}: quedan ${fmtLeft(left)}`}
                  >
                    <div className='h-full rounded-full bg-[#9d684e] transition-[width] duration-700' style={{ width: `${pct}%` }} />
                  </div>
                  <p className='text-sm text-[#7a6e6f]'>
                    Prendido {k.last ? fmtWhen(k.last.at) : ''}
                    {k.last?.byName ? ` · ${k.last.byName}` : ''}
                  </p>
                </div>
              ) : (
                <p className='text-sm text-[#7a6e6f]'>
                  {k.last
                    ? `${k.last.action === 'ON' ? 'Último prendido' : k.last.note === RESET_NOTE ? RESET_NOTE : 'Apagado'} ${fmtWhen(k.last.at)}${k.last.byName ? ` · ${k.last.byName}` : ''}`
                    : 'Sin registros todavía'}
                </p>
              )}

              <Button
                type='button'
                variant={running ? 'outline' : 'verde'}
                disabled={running || busy === k.kiln}
                onClick={() => register(k.kiln, 'ON')}
                className={cn('gap-2', running && 'border-[#9d684e]/30 bg-white/60 text-[#9d684e] disabled:opacity-100')}
              >
                {running ? <Timer className='size-4' /> : <Flame className='size-4' />}
                {running ? `Se libera en ${fmtLeft(left)}` : 'Prendí el horno'}
              </Button>
              {running && (
                <button
                  type='button'
                  disabled={busy === k.kiln}
                  onClick={() => resetTimer(k)}
                  className='inline-flex items-center justify-center gap-1.5 self-center rounded-md px-2 py-1 text-xs font-medium text-[#7a6e6f] hover:text-[#9d684e] hover:underline disabled:opacity-50'
                >
                  <RotateCcw className='size-3.5' />
                  Reiniciar timer
                </button>
              )}
            </div>
          );
        })}
      </div>

      {canManage && (
        <div className='rounded-2xl border border-[#e6dbcd] bg-white p-4'>
          {!pastOpen ? (
            <button
              type='button'
              onClick={() => setPastOpen(true)}
              className='inline-flex items-center gap-2 text-sm font-semibold text-[#9d684e] hover:underline'
            >
              <History className='size-4' />
              Cargar un horno de otro día
            </button>
          ) : (
            <div className='flex flex-col gap-3'>
              <p className='text-sm font-semibold text-[#455a54]'>
                Horno que se prendió y no se marcó en el momento
              </p>
              <div className='flex flex-wrap items-center gap-2'>
                {(['SUPERIOR', 'FRONTAL'] as const).map((k) => (
                  <Chip key={k} active={past.kiln === k} onClick={() => setPast({ ...past, kiln: k })}>
                    {status.find((x) => x.kiln === k)?.kilnName ?? k}
                  </Chip>
                ))}
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <div className='w-44'>
                  <DatePicker value={past.day} onChange={(day) => setPast({ ...past, day })} />
                </div>
                <div className='w-32'>
                  <TimePicker value={past.time} onChange={(time) => setPast({ ...past, time })} fromHour={6} toHour={23} />
                </div>
                <Button type='button' variant='verde' disabled={busy === 'past'} onClick={registerPast}>
                  Cargar
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setPastOpen(false)}
                  className='border-[#e6dbcd] bg-white text-[#455a54]'
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Semana: cuántas veces se prendió, día por día. */}
      <div className='rounded-2xl border border-[#e6dbcd] bg-white p-4'>
        <div className='mb-3 flex items-center gap-2'>
          <button
            type='button'
            onClick={() => setMonday(addDays(monday, -7))}
            className='rounded-md p-1 text-[#455a54] hover:bg-[#fbf5ef]'
            aria-label='Semana anterior'
          >
            <ChevronLeft className='size-4' />
          </button>
          <p className='text-sm font-semibold text-[#455a54]'>
            Semana del {dayTitle(monday)} · {totalOn} {totalOn === 1 ? 'vez prendido' : 'veces prendido'}
          </p>
          <button
            type='button'
            onClick={() => setMonday(addDays(monday, 7))}
            className='rounded-md p-1 text-[#455a54] hover:bg-[#fbf5ef]'
            aria-label='Semana siguiente'
          >
            <ChevronRight className='size-4' />
          </button>
        </div>
        <div className='grid grid-cols-7 gap-1.5 text-center'>
          {week.map((d) => {
            const n = d.superior + d.frontal;
            return (
              <div
                key={d.day}
                className={cn(
                  'rounded-lg px-1 py-2',
                  n > 0 ? 'bg-[#E7F0EC]' : 'bg-[#fbf5ef]',
                )}
              >
                <p className='text-[11px] capitalize text-[#7a6e6f]'>{dayTitle(d.day)}</p>
                <p className='text-lg font-semibold text-[#455a54]'>{n}</p>
                {n > 0 && (
                  <p className='text-[10px] leading-tight text-[#7a6e6f]'>
                    {[d.superior && `${d.superior} sup.`, d.frontal && `${d.frontal} front.`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className='mt-4 flex flex-col divide-y divide-[#e6dbcd]'>
          {logs.length === 0 ? (
            <p className='py-3 text-sm text-[#7a6e6f]'>Sin movimientos esta semana.</p>
          ) : (
            logs.map((l) => (
              <div key={l.id} className='flex items-center gap-3 py-2 text-sm'>
                {l.action === 'ON' ? (
                  <Flame className='size-4 shrink-0 text-[#9d684e]' />
                ) : (
                  <PowerOff className='size-4 shrink-0 text-[#455a54]' />
                )}
                <span className='min-w-0 flex-1 truncate text-[#3d3338]'>
                  {l.action === 'OFF' && l.note === RESET_NOTE ? RESET_NOTE : l.actionName} · {l.kilnName}
                  {l.byName && <span className='text-[#7a6e6f]'> · {l.byName}</span>}
                </span>
                <span className='shrink-0 text-xs text-[#7a6e6f]'>{fmtWhen(l.at)}</span>
                {canManage && (
                  <button
                    type='button'
                    onClick={() => remove(l)}
                    className='shrink-0 text-[#a99f92] hover:text-[#a33]'
                    aria-label='Borrar registro'
                  >
                    <Trash2 className='size-4' />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: Readonly<{ active: boolean; onClick: () => void; children: React.ReactNode }>) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-[#455a54] bg-[#455a54] text-white'
          : 'border-[#e6dbcd] bg-white text-[#7a6e6f] hover:text-[#455a54]',
      )}
    >
      {children}
    </button>
  );
}
