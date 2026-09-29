'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Users, X } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fmtYmd } from '@/lib/reservas-format';
import { WEEKDAY_LABELS } from '@/services/closed-dates.admin.service';
import {
  spaceBlocksAdmin,
  type SpaceBlock,
  type SpaceBlockKind,
} from '@/services/space-blocks.admin.service';

const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';
const triggerCls = `w-full ${fieldCls} data-[placeholder]:text-[#455a54]/60`;

export function SpaceBlocksPanel() {
  const confirm = useConfirm();
  const [items, setItems] = useState<SpaceBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<SpaceBlockKind>('WEEKLY');
  const [weekday, setWeekday] = useState('2');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('18:00');
  const [end, setEnd] = useState('20:00');
  const [seats, setSeats] = useState('10');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await spaceBlocksAdmin.list());
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar bloqueos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (kind === 'ONE_OFF' && !date) {
      showToast.error('Elegí una fecha');
      return;
    }
    if (!start || !end) {
      showToast.error('Completá el horario');
      return;
    }
    if (start >= end) {
      showToast.error('El horario de fin debe ser posterior al de inicio');
      return;
    }
    const seatsNum = Math.trunc(Number(seats));
    if (!Number.isFinite(seatsNum) || seatsNum < 1) {
      showToast.error('Los lugares deben ser 1 o más');
      return;
    }
    setSaving(true);
    try {
      await spaceBlocksAdmin.create({
        kind,
        weekday: kind === 'WEEKLY' ? Number(weekday) : undefined,
        date: kind === 'ONE_OFF' ? date : undefined,
        start,
        end,
        seats: seatsNum,
        label: label || undefined,
      });
      showToast.success('Bloqueo agregado');
      setDate('');
      setLabel('');
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo agregar');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: 'Quitar bloqueo de espacio',
      description: '¿Quitar este bloqueo de espacio?',
      confirmLabel: 'Quitar',
    });
    if (!ok) return;
    try {
      await spaceBlocksAdmin.remove(id);
      showToast.success('Quitado');
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo quitar');
    }
  }

  function describe(b: SpaceBlock): string {
    const cuando =
      b.kind === 'WEEKLY'
        ? `Todos los ${(WEEKDAY_LABELS[b.weekday ?? 0] ?? '').toLowerCase()}`
        : b.date
          ? fmtYmd(b.date)
          : '';
    return `${cuando} · ${b.start}–${b.end} · ${b.seats} lugares`;
  }

  return (
    <div className='flex flex-col gap-4 rounded-xl border border-[#e6dbcd] bg-white p-5'>
      <div className='flex flex-wrap items-center gap-2'>
        <Users className='h-5 w-5 text-[#9d684e]' />
        <h2 className='font-tan-nimbus text-lg font-bold text-[#455a54]'>
          Bloqueos de espacio
        </h2>
        <span className='text-xs text-[#455a54]/60'>
          · talleres/eventos que ocupan el salón · restan cupo del local en su
          horario
        </span>
      </div>

      {/* Form */}
      <div className='grid items-end gap-3 sm:grid-cols-[1.1fr_1.4fr_1.4fr_0.8fr_auto]'>
        <Field label='Tipo'>
          <Select value={kind} onValueChange={(v) => setKind(v as SpaceBlockKind)}>
            <SelectTrigger className={triggerCls}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='WEEKLY'>Taller (semanal)</SelectItem>
              <SelectItem value='ONE_OFF'>Evento (fecha)</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {kind === 'WEEKLY' ? (
          <Field label='Día (todas las semanas)'>
            <Select value={weekday} onValueChange={setWeekday}>
              <SelectTrigger className={triggerCls}>
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
        ) : (
          <Field label='Fecha'>
            <DatePicker
              value={date}
              onChange={setDate}
              placeholder='Fecha'
              disablePast
            />
          </Field>
        )}

        <Field label='Horario'>
          <div className='flex items-center gap-2'>
            <TimePicker value={start} onChange={setStart} className='flex-1' />
            <span className='text-[#455a54]/60'>→</span>
            <TimePicker value={end} onChange={setEnd} className='flex-1' />
          </div>
        </Field>

        <Field label='Lugares que ocupa'>
          <Input
            type='number'
            min={1}
            step={1}
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
            onBlur={() => {
              const n = Math.trunc(Number(seats));
              setSeats(Number.isFinite(n) && n >= 1 ? String(n) : '1');
            }}
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

      <Field label='Etiqueta (opcional)'>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder='Escuelita de niños, cumple de Sofi…'
          className={fieldCls}
        />
      </Field>

      {/* Lista */}
      {loading ? (
        <p className='text-sm text-[#455a54]/60'>Cargando…</p>
      ) : items.length === 0 ? (
        <p className='text-sm text-[#455a54]/60'>
          No hay bloqueos cargados. El tope de local igual cuenta las reservas.
        </p>
      ) : (
        <div className='flex flex-wrap gap-2'>
          {items.map((b) => (
            <span
              key={b._id}
              className='inline-flex items-center gap-2 rounded-full border border-[#e6dbcd] bg-[#fbf5ef] px-3 py-1.5 text-xs text-[#455a54]'
            >
              <span className='font-medium'>{b.label || 'Bloqueo'}</span>
              <span className='text-[#455a54]/70'>{describe(b)}</span>
              <button
                type='button'
                onClick={() => remove(b._id)}
                className='text-[#455a54]/50 hover:text-[#b23b2e]'
                title='Quitar'
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
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className='flex flex-col gap-1.5'>
      <span className='font-mono text-[11px] tracking-wider text-[#455a54]/60'>
        {label.toUpperCase()}
      </span>
      {children}
    </div>
  );
}
