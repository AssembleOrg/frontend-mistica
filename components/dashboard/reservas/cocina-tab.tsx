'use client';

// Cocina: la semana de un vistazo para preparar con tiempo. Cuántas personas
// comen el buffet cada día, qué tortas hay (cumpleaños, la simbólica de
// regalo, las que se vendieron aparte) y las restricciones de cada grupo, sin
// tener que recorrer la agenda día por día.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Cake, ChevronLeft, ChevronRight, Loader2, Users, UtensilsCrossed } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { AR_TZ } from '@/lib/reservas-format';
import {
  experienceHasBuffet,
  FREE_CAKE_MIN_PEOPLE,
  SYMBOLIC_CAKE_LABEL,
} from '@/lib/kitchen';
import {
  reservationsAdmin,
  type AdminExperience,
  type ReservationItem,
} from '@/services/reservations.admin.service';
import { DietaryTags } from './dietary-badge';

const ymdInAR = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-CA', { timeZone: AR_TZ });

function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function mondayOf(ymd: string): string {
  const dow = new Date(`${ymd}T12:00:00Z`).getUTCDay(); // 0 = domingo
  return addDays(ymd, dow === 0 ? -6 : 1 - dow);
}

function dayLabel(ymd: string): string {
  const s = new Date(`${ymd}T12:00:00Z`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    timeZone: 'UTC',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: AR_TZ,
  });

/** Tortas a preparar en una reserva (las cargadas o la simbólica que le toca). */
function cakesOf(r: ReservationItem): { label: string; qty: number; missing?: boolean; notes?: string }[] {
  const cakes = (r.cakes ?? []).map((c) => ({ label: c.label, qty: c.qty, notes: c.notes }));
  if (cakes.length === 0 && r.isBirthday && r.quantity >= FREE_CAKE_MIN_PEOPLE) {
    return [{ label: SYMBOLIC_CAKE_LABEL, qty: 1, missing: true }];
  }
  return cakes;
}

export function CocinaTab() {
  const [monday, setMonday] = useState(() => mondayOf(ymdInAR(new Date())));
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [experiences, setExperiences] = useState<AdminExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const sunday = addDays(monday, 6);

  useEffect(() => {
    reservationsAdmin
      .listExperiences(true)
      .then(setExperiences)
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reservationsAdmin.listReservations({
        from: monday,
        to: sunday,
        status: 'CONFIRMED',
        sort: 'startAt',
        limit: 500,
      });
      setItems(res.items);
    } catch (e) {
      showToast.error((e as { message?: string })?.message ?? 'No se pudo cargar la semana');
    } finally {
      setLoading(false);
    }
  }, [monday, sunday]);

  useEffect(() => {
    void load();
  }, [load]);

  // ¿La experiencia lleva buffet? Por id; si no está, por el nombre.
  const buffetOf = useMemo(() => {
    const byId = new Map(experiences.map((e) => [e._id, experienceHasBuffet(e)]));
    return (r: ReservationItem) =>
      byId.get(r.experienceId ?? '') ??
      experienceHasBuffet({ name: r.experienceName });
  }, [experiences]);

  const days = useMemo(() => {
    const map = new Map<string, ReservationItem[]>();
    for (const r of items) {
      const key = ymdInAR(r.startAt);
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const totals = useMemo(() => {
    let buffet = 0;
    let cakes = 0;
    let birthdays = 0;
    let diets = 0;
    for (const r of items) {
      if (buffetOf(r)) buffet += r.quantity;
      cakes += cakesOf(r).reduce((n, c) => n + c.qty, 0);
      if (r.isBirthday) birthdays += 1;
      if ((r.dietaryTags?.length ?? 0) > 0 || r.dietaryNotes) diets += 1;
    }
    return { buffet, cakes, birthdays, diets };
  }, [items, buffetOf]);

  const weekCakes = items.flatMap((r) =>
    cakesOf(r).map((c) => ({ r, c })),
  );

  const isThisWeek = monday === mondayOf(ymdInAR(new Date()));

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-1.5'>
          <Button type='button' variant='ghost' size='icon' onClick={() => setMonday(addDays(monday, -7))} aria-label='Semana anterior' className='bg-white'>
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <span className='px-1 text-sm font-semibold text-[#455a54]'>
            {isThisWeek ? 'Esta semana · ' : ''}
            {dayLabel(monday)} al {dayLabel(sunday).replace(/^\S+ /, '')}
          </span>
          <Button type='button' variant='ghost' size='icon' onClick={() => setMonday(addDays(monday, 7))} aria-label='Semana siguiente' className='bg-white'>
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
        {!isThisWeek && (
          <Button type='button' variant='ghost' size='sm' onClick={() => setMonday(mondayOf(ymdInAR(new Date())))} className='bg-white text-[#455a54]'>
            Volver a esta semana
          </Button>
        )}
      </div>

      <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
        <Stat icon={Users} value={totals.buffet} label='personas con buffet' />
        <Stat icon={Cake} value={totals.cakes} label={totals.cakes === 1 ? 'torta' : 'tortas'} />
        <Stat icon={Cake} value={totals.birthdays} label='cumpleaños' />
        <Stat icon={UtensilsCrossed} value={totals.diets} label='grupos con restricciones' />
      </div>

      {loading ? (
        <div className='flex justify-center p-8'>
          <Loader2 className='h-5 w-5 animate-spin text-[#455a54]' />
        </div>
      ) : items.length === 0 ? (
        <p className='rounded-2xl border border-[#e6dbcd] bg-white p-8 text-center text-sm text-[#7a6e6f]'>
          No hay reservas confirmadas esta semana.
        </p>
      ) : (
        <>
          {weekCakes.length > 0 && (
            <div className='flex flex-col gap-2 rounded-2xl border border-[#e6dbcd] bg-white p-4'>
              <h3 className='flex items-center gap-2 text-sm font-semibold text-[#455a54]'>
                <Cake className='h-4 w-4 text-[#9d684e]' /> Tortas de la semana
              </h3>
              {weekCakes.map(({ r, c }, i) => (
                <p key={`${r._id}-${i}`} className='text-[13px] text-[#3d3338]'>
                  <span className='font-semibold'>
                    {dayLabel(ymdInAR(r.startAt))} {timeOf(r.startAt)}
                  </span>
                  {' · '}
                  {c.qty > 1 ? `${c.qty} × ` : ''}
                  {c.label}
                  {c.notes ? ` (${c.notes})` : ''}
                  {' · '}
                  <span className='text-[#7a6e6f]'>
                    {r.isBirthday ? 'cumple' : r.experienceName}
                    {r.customerName ? ` de ${r.customerName}` : ''} · {r.quantity} pers.
                  </span>
                  {c.missing && (
                    <span className='ml-1 text-[11px] font-semibold text-[#b07d12]'>
                      (le corresponde, todavía sin cargar)
                    </span>
                  )}
                </p>
              ))}
            </div>
          )}

          {days.map(([ymd, list]) => {
            const buffet = list.filter(buffetOf).reduce((n, r) => n + r.quantity, 0);
            const sinBuffet = list.filter((r) => !buffetOf(r)).reduce((n, r) => n + r.quantity, 0);
            const cakes = list.reduce((n, r) => n + cakesOf(r).reduce((m, c) => m + c.qty, 0), 0);
            return (
              <div key={ymd} className='flex flex-col gap-2 rounded-2xl border border-[#e6dbcd] bg-white p-4'>
                <div className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1'>
                  <h3 className='font-tan-nimbus text-lg font-semibold text-[#455a54]'>{dayLabel(ymd)}</h3>
                  <span className='text-[13px] text-[#455a54]'>
                    <strong>{buffet}</strong> con buffet
                    {sinBuffet > 0 && <span className='text-[#7a6e6f]'> · {sinBuffet} sin buffet</span>}
                    {cakes > 0 && (
                      <span className='text-[#9d684e]'> · {cakes} torta{cakes > 1 ? 's' : ''}</span>
                    )}
                  </span>
                </div>
                <div className='divide-y divide-[#f1ebe2]'>
                  {list.map((r) => (
                    <div key={r._id} className='flex flex-col gap-1 py-2'>
                      <p className='text-[13px] text-[#3d3338]'>
                        <span className='font-mono font-semibold'>{timeOf(r.startAt)}</span>
                        {' · '}
                        {r.experienceName} · <strong>{r.quantity}</strong> pers.
                        {!buffetOf(r) && <span className='text-[#7a6e6f]'> · sin buffet</span>}
                        {r.isBirthday && <span> · 🎂 cumple</span>}
                        {r.customerName && <span className='text-[#7a6e6f]'> · {r.customerName}</span>}
                      </p>
                      <DietaryTags tags={r.dietaryTags} notes={r.dietaryNotes} compact />
                      {cakesOf(r).map((c, i) => (
                        <p key={i} className='text-[12px] text-[#9d684e]'>
                          🎂 {c.qty > 1 ? `${c.qty} × ` : ''}
                          {c.label}
                          {c.notes ? ` (${c.notes})` : ''}
                          {c.missing && ' · le corresponde, todavía sin cargar'}
                        </p>
                      ))}
                      {r.kitchenNotes && (
                        <p className='rounded-lg bg-[#fbf5ef] px-2.5 py-1.5 text-[12px] text-[#3d3338]'>
                          {r.kitchenNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: number;
  label: string;
}) {
  return (
    <div className='flex items-center gap-2.5 rounded-2xl border border-[#e6dbcd] bg-white px-3 py-3'>
      <Icon className='h-4 w-4 shrink-0 text-[#455a54]' />
      <span className='flex min-w-0 flex-col leading-tight'>
        <span className='font-tan-nimbus text-xl font-semibold text-[#3d3338]'>{value}</span>
        <span className='truncate text-[11px] text-[#7a6e6f]'>{label}</span>
      </span>
    </div>
  );
}
