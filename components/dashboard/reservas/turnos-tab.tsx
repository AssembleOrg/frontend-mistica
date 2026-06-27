'use client';

import { useCallback, useEffect, useState } from 'react';
import { CopyPlus, Plus, Sparkles, Users, X } from 'lucide-react';
import { showToast } from '@/lib/toast';
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
import { AnotadosModal } from './anotados-modal';

interface SlotRow {
  date: string;
  time: string;
}

export function TurnosTab() {
  const [experiences, setExperiences] = useState<AdminExperience[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [anotados, setAnotados] = useState<string | null>(null);

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
            <select
              value={expId}
              onChange={(e) => setExpId(e.target.value)}
              className={inputCls}
            >
              {experiences.length === 0 && <option value=''>—</option>}
              {experiences.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label='Cupo (opcional)'>
            <input
              type='number'
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder='default'
              className={inputCls}
            />
          </Field>
          <Field label='Precio p/p (opcional)'>
            <input
              type='number'
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder='default'
              className={inputCls}
            />
          </Field>
        </div>

        <div className='flex flex-col gap-2'>
          <span className='font-mono text-[11px] tracking-wider text-[#7a6e6f]'>
            FECHAS Y HORARIOS
          </span>
          {slots.map((s, i) => (
            <div key={i} className='flex items-center gap-2'>
              <input
                type='date'
                value={s.date}
                onChange={(e) =>
                  setSlots((prev) =>
                    prev.map((p, j) =>
                      j === i ? { ...p, date: e.target.value } : p,
                    ),
                  )
                }
                className={inputCls + ' max-w-[180px]'}
              />
              <input
                type='time'
                value={s.time}
                onChange={(e) =>
                  setSlots((prev) =>
                    prev.map((p, j) =>
                      j === i ? { ...p, time: e.target.value } : p,
                    ),
                  )
                }
                className={inputCls + ' max-w-[130px]'}
              />
              {slots.length > 1 && (
                <button
                  type='button'
                  onClick={() =>
                    setSlots((prev) => prev.filter((_, j) => j !== i))
                  }
                >
                  <X className='h-4 w-4 text-[#7a6e6f]' />
                </button>
              )}
            </div>
          ))}
          <button
            type='button'
            onClick={() => setSlots((prev) => [...prev, { date: '', time: '' }])}
            className='flex w-fit items-center gap-1.5 rounded-lg border border-[#e6dbcd] px-3 py-2 text-xs text-[#7a6e6f]'
          >
            <Plus className='h-3.5 w-3.5' /> Agregar fecha
          </button>
        </div>

        <div className='flex items-center justify-between'>
          <label className='flex items-center gap-2 text-sm text-[#3d3338]'>
            <input
              type='checkbox'
              checked={publish}
              onChange={(e) => setPublish(e.target.checked)}
            />
            Publicar (visible al público)
          </label>
          <button
            type='button'
            onClick={generate}
            disabled={generating}
            className='flex items-center gap-2 rounded-lg bg-[#9d684e] px-5 py-3 font-mono text-xs tracking-wider text-white disabled:opacity-60'
          >
            <Sparkles className='h-4 w-4' />
            {generating
              ? 'GENERANDO…'
              : `GENERAR ${validSlots.length || ''} TURNO${validSlots.length === 1 ? '' : 'S'}`}
          </button>
        </div>
      </div>

      {/* Lista de turnos */}
      <div className='overflow-hidden rounded-xl border border-[#e6dbcd] bg-white'>
        <div className='grid grid-cols-[1.5fr_2fr_2fr_1fr_auto] gap-2 border-b border-[#e6dbcd] bg-[#fbf5ef] px-5 py-3 font-mono text-[11px] tracking-wider text-[#7a6e6f]'>
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
          sessions.map((s) => {
            const pct = Math.round((s.seatsTaken / s.capacity) * 100);
            const full = s.seatsTaken >= s.capacity;
            return (
              <div
                key={s.id}
                className='grid grid-cols-[1.5fr_2fr_2fr_1fr_auto] items-center gap-2 border-b border-[#e6dbcd] px-5 py-4 last:border-0'
              >
                <span className='text-sm font-medium text-[#3d3338]'>
                  {fmtDateTime(s.startAt)}
                </span>
                <span className='text-sm text-[#3d3338]'>
                  {s.experienceName}
                </span>
                <div className='flex flex-col gap-1.5'>
                  <span className='text-xs text-[#3d3338]'>
                    {s.seatsTaken} / {s.capacity} personas
                  </span>
                  <div className='h-1.5 w-32 overflow-hidden rounded-full bg-[#e6dbcd]'>
                    <div
                      className='h-full rounded-full'
                      style={{
                        width: `${pct}%`,
                        backgroundColor: full ? '#9d684e' : '#455a54',
                      }}
                    />
                  </div>
                </div>
                <span className='text-xs text-[#7a6e6f]'>
                  {SESSION_STATUS_LABEL[s.status] ?? s.status}
                </span>
                <button
                  type='button'
                  onClick={() => setAnotados(s.id)}
                  className='flex items-center gap-1.5 rounded-lg border border-[#e6dbcd] bg-[#fbf5ef] px-3 py-2 font-mono text-xs text-[#3d3338]'
                >
                  <Users className='h-3.5 w-3.5' /> Anotados
                </button>
              </div>
            );
          })
        )}
      </div>

      {anotados && (
        <AnotadosModal
          sessionId={anotados}
          onClose={() => setAnotados(null)}
          onChanged={loadSessions}
        />
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-[#e6dbcd] bg-[#fbf5ef] px-3 py-2.5 text-sm text-[#3d3338] outline-none focus:border-[#9d684e]';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className='flex flex-col gap-1.5'>
      <span className='font-mono text-[11px] tracking-wider text-[#7a6e6f]'>
        {label.toUpperCase()}
      </span>
      {children}
    </label>
  );
}
