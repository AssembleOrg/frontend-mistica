'use client';

// Registro de los hornos. Quien prende un horno lo marca acá, y lo mismo al
// apagarlo y descargarlo. No se anota qué se horneó: sirve para ver cuántas
// veces se prendió en la semana y si algún día se olvidaron.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Flame, PowerOff, Trash2 } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
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

const DAY_MS = 86_400_000;

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
  const sunday = addDays(monday, 6);

  const load = useCallback(async () => {
    try {
      const [st, lg] = await Promise.all([
        kilnsAdmin.status(),
        kilnsAdmin.logs(monday, sunday),
      ]);
      setStatus(st);
      setLogs(lg);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar los hornos');
    }
  }, [monday, sunday]);

  useEffect(() => {
    void load();
  }, [load]);

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
      showToast.success(action === 'ON' ? 'Horno prendido registrado' : 'Horno apagado y descargado');
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo registrar');
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
      showToast.error(e instanceof Error ? e.message : 'No se pudo borrar');
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
        {status.map((k) => (
          <div
            key={k.kiln}
            className={cn(
              'flex flex-col gap-3 rounded-2xl border p-4',
              k.on ? 'border-[#9d684e]/50 bg-[#f3e2d0]' : 'border-[#e6dbcd] bg-white',
            )}
          >
            <div className='flex items-center gap-2'>
              <Flame className={cn('size-5', k.on ? 'text-[#9d684e]' : 'text-[#c4b8aa]')} />
              <p className='text-base font-semibold text-[#3d3338]'>Horno de {k.kilnName.toLowerCase()}</p>
            </div>
            <p className='text-sm text-[#7a6e6f]'>
              {k.last
                ? `${k.on ? 'Prendido' : 'Apagado'} desde ${fmtWhen(k.last.at)}${k.last.byName ? ` · ${k.last.byName}` : ''}`
                : 'Sin registros todavía'}
            </p>
            {k.on ? (
              <Button
                type='button'
                variant='outline'
                disabled={busy === k.kiln}
                onClick={() => register(k.kiln, 'OFF')}
                className='gap-2 border-[#455a54]/40 bg-white text-[#455a54]'
              >
                <PowerOff className='size-4' />
                Lo apagué y descargué
              </Button>
            ) : (
              <Button
                type='button'
                variant='verde'
                disabled={busy === k.kiln}
                onClick={() => register(k.kiln, 'ON')}
                className='gap-2'
              >
                <Flame className='size-4' />
                Prendí el horno
              </Button>
            )}
          </div>
        ))}
      </div>

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
                  {l.actionName} · {l.kilnName}
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
