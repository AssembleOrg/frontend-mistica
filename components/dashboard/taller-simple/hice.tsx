'use client';

// HICE: lo que produjo hoy, como un carrito. Tocar una pieza la suma al
// carrito (no guarda nada); abajo se corrige con − / + y recién GUARDAR lo
// manda. El carrito vive en el navegador: si la tablet se bloquea, no se pierde.
// Arriba van las que más hace y filtros por familia, para no tener que buscar.

import { useEffect, useMemo, useState } from 'react';
import {
  Amphora,
  Coffee,
  Disc,
  Heart,
  Minus,
  Plus,
  RectangleHorizontal,
  Soup,
  type LucideIcon,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { errorText } from '@/lib/api-error-messages';
import { useAuth } from '@/hooks/useAuth';
import { usePieceTypesStore } from '@/stores/piece-types.store';
import type { PieceTypeItem } from '@/services/pieces.admin.service';
import {
  kitchenProductionAdmin,
  type KitchenProductionItem,
} from '@/services/kitchen-production.admin.service';
import { BackButton } from './back-button';
import { ErrorBox } from './error-box';
import { addDays, todayAR } from './dates';

// Familia por palabra del nombre: ícono, color y nombre del filtro.
interface Family {
  key: string;
  label: string;
  match?: RegExp;
  icon: LucideIcon;
  color: string;
}
const FAMILIES: Family[] = [
  { key: 'taza', label: 'Tazas', match: /taza|mate|jarr/, icon: Coffee, color: 'bg-[#cc844a]' },
  { key: 'plato', label: 'Platos', match: /plat/, icon: Disc, color: 'bg-[#455a54]' },
  { key: 'cuenco', label: 'Cuencos', match: /cuenco|bowl/, icon: Soup, color: 'bg-[#9d684e]' },
  { key: 'bandeja', label: 'Bandejas', match: /bandej/, icon: RectangleHorizontal, color: 'bg-[#4e4247]' },
  { key: 'corazon', label: 'Corazones', match: /coraz/, icon: Heart, color: 'bg-[#d0607a]' },
];
const OTHER: Family = { key: 'otra', label: 'Otras', icon: Amphora, color: 'bg-[#c59a3a]' };
const MAX_QTY = 99;
const FREQUENT_DAYS = 30;
const FREQUENT_MAX = 6;

const familyOf = (name: string): Family => {
  const n = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return FAMILIES.find((f) => f.match?.test(n)) ?? OTHER;
};

/** Carrito: el día en que se armó y cantidad por nombre de pieza. */
interface Cart {
  day: string;
  items: Record<string, number>;
}

const cartKey = (userId?: string) => `mistica-taller-cart:${userId ?? 'anon'}`;

/** Lee el carrito guardado quedándose sólo con cantidades válidas (1–99). */
function readCart(key: string): Cart {
  const empty = { day: todayAR(), items: {} };
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return empty;
    const c = JSON.parse(raw) as Partial<Cart>;
    if (typeof c.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(c.day) || !c.items) return empty;
    const items: Record<string, number> = {};
    for (const [name, qty] of Object.entries(c.items)) {
      if (name.trim() && Number.isInteger(qty) && qty >= 1 && qty <= MAX_QTY) items[name] = qty;
    }
    return { day: c.day, items };
  } catch {
    // Storage roto o bloqueado: arranca vacío.
    return empty;
  }
}

function writeCart(key: string, cart: Cart) {
  try {
    if (Object.keys(cart.items).length === 0) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(cart));
  } catch {
    // Sin storage sólo no se recuerda.
  }
}

export function Hice({
  made,
  failed,
  reload,
  onBack,
}: {
  made: KitchenProductionItem[] | null;
  /** No se pudo cargar lo de hoy (sin conexión, sin permiso…). */
  failed: boolean;
  reload: () => Promise<void>;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const key = cartKey(user?.id);
  const { items: types, loaded, load } = usePieceTypesStore();
  const [cart, setCartState] = useState<Cart>(() => ({ day: todayAR(), items: {} }));
  const [view, setView] = useState<'pick' | 'saved'>('pick');
  const [saving, setSaving] = useState(false);
  const [family, setFamily] = useState<string | null>(null);
  const [frequentNames, setFrequentNames] = useState<string[]>([]);

  useEffect(() => {
    load().catch((e) => showToast.error(errorText(e, 'No se pudo cargar')));
  }, [load]);

  // El carrito guardado se lee recién en el cliente (no existe en el server).
  useEffect(() => {
    setCartState(readCart(key));
  }, [key]);

  // Las que más cargó en el último mes. Si falla, simplemente no aparecen.
  useEffect(() => {
    let alive = true;
    const today = todayAR();
    kitchenProductionAdmin
      .list(addDays(today, -FREQUENT_DAYS), today, undefined, 'taller')
      .then((rows) => {
        if (!alive) return;
        const count = new Map<string, number>();
        for (const r of rows) count.set(r.item, (count.get(r.item) ?? 0) + r.quantity);
        setFrequentNames([...count.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const frequent = useMemo(() => {
    const byName = new Map(types.map((t) => [t.name, t]));
    return frequentNames
      .map((n) => byName.get(n))
      .filter((t): t is PieceTypeItem => !!t)
      .slice(0, FREQUENT_MAX);
  }, [types, frequentNames]);

  // Sólo los filtros de familias que existen en el catálogo.
  const families = useMemo(() => {
    const present = new Set(types.map((t) => familyOf(t.name).key));
    return [...FAMILIES, OTHER].filter((f) => present.has(f.key));
  }, [types]);

  const shown = family ? types.filter((t) => familyOf(t.name).key === family) : types;

  function setCart(next: Cart) {
    setCartState(next);
    writeCart(key, next);
  }

  function change(name: string, delta: number) {
    const qty = Math.min(MAX_QTY, Math.max(0, (cart.items[name] ?? 0) + delta));
    const items = { ...cart.items };
    if (qty === 0) delete items[name];
    else items[name] = qty;
    // Carrito vacío que se vuelve a llenar: es de hoy.
    const day = Object.keys(cart.items).length === 0 ? todayAR() : cart.day;
    setCart({ day, items });
  }

  const entries = Object.entries(cart.items);
  const cartTotal = entries.reduce((n, [, q]) => n + q, 0);

  // Uno por pieza, en orden. Lo que se guarda sale del carrito al toque, así
  // que si algo falla a mitad, reintentar no duplica lo ya guardado.
  async function save() {
    if (saving || entries.length === 0) return;
    setSaving(true);
    let pending = { ...cart };
    let ok = false;
    try {
      for (const [item, quantity] of entries) {
        await kitchenProductionAdmin.create({ day: pending.day, item, quantity, area: 'taller' });
        const items = { ...pending.items };
        delete items[item];
        pending = { ...pending, items };
        setCart(pending);
      }
      ok = true;
    } catch (e) {
      showToast.error(errorText(e, 'No se pudo guardar. Tocá Guardar de nuevo.'));
    }
    await reload();
    setSaving(false);
    if (ok) {
      showToast.success('Guardado');
      setView('saved');
    }
  }

  if (view === 'saved') {
    return <Guardado made={made} reload={reload} onMore={() => setView('pick')} onBack={onBack} />;
  }

  const savedTotal = (made ?? []).reduce((n, m) => n + m.quantity, 0);

  const tile = (t: PieceTypeItem) => {
    const { icon: Icon, color } = familyOf(t.name);
    const qty = cart.items[t.name] ?? 0;
    return (
      <button
        key={t.id}
        type='button'
        onClick={() => change(t.name, 1)}
        disabled={saving}
        className={cn(
          'relative flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-3xl p-3 text-white shadow-md transition-transform active:scale-95 disabled:opacity-60',
          color,
          qty > 0 && 'ring-4 ring-[#3d3338] ring-offset-2 ring-offset-[#fbf5ef]',
        )}
      >
        <Icon className='size-14' strokeWidth={1.75} />
        <span className='line-clamp-2 text-center text-lg font-bold leading-tight'>{t.name}</span>
        {qty > 0 && (
          <span className='absolute right-2 top-2 flex size-12 items-center justify-center rounded-full bg-white text-2xl font-black text-[#3d3338] shadow'>
            {qty}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className='pb-4'>
      <BackButton onClick={onBack} title='HICE' />

      {failed && <ErrorBox />}

      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <p className='text-lg font-semibold text-[#455a54]'>
          Tocá las piezas que hiciste y después Guardar
        </p>
        {savedTotal > 0 && (
          <button
            type='button'
            onClick={() => setView('saved')}
            className='h-12 rounded-xl border-2 border-[#455a54]/25 bg-white px-4 text-base font-bold text-[#455a54]'
          >
            Guardado hoy: {savedTotal}
          </button>
        )}
      </div>

      {!loaded && <p className='py-10 text-center text-xl text-[#7a6e6f]'>Cargando…</p>}
      {loaded && types.length === 0 && (
        <p className='rounded-3xl bg-white py-12 text-center text-xl font-bold text-[#455a54]'>
          No hay piezas cargadas en el catálogo
        </p>
      )}

      {frequent.length > 0 && !family && (
        <section className='mb-6'>
          <h2 className='mb-3 text-xl font-black text-[#4e4247]'>LAS QUE MÁS HACÉS</h2>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'>{frequent.map(tile)}</div>
        </section>
      )}

      {families.length > 1 && (
        <div className='mb-4 flex flex-wrap gap-2'>
          <FilterButton active={!family} onClick={() => setFamily(null)} color='bg-[#3d3338]'>
            Todas
          </FilterButton>
          {families.map((f) => (
            <FilterButton
              key={f.key}
              active={family === f.key}
              onClick={() => setFamily(family === f.key ? null : f.key)}
              color={f.color}
            >
              <f.icon className='size-6' strokeWidth={2} />
              {f.label}
            </FilterButton>
          ))}
        </div>
      )}

      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>{shown.map(tile)}</div>

      {entries.length > 0 && (
        <div className='sticky bottom-0 -mx-4 mt-5 border-t-2 border-[#e6dbcd] bg-white px-4 pb-4 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]'>
          <div className='flex max-h-52 flex-col gap-2 overflow-y-auto'>
            {entries.map(([name, qty]) => (
              <div key={name} className='flex items-center gap-3'>
                <span className='min-w-0 flex-1 truncate text-lg font-bold text-[#3d3338]'>{name}</span>
                <button
                  type='button'
                  onClick={() => change(name, -1)}
                  disabled={saving}
                  aria-label={`Restar 1: ${name}`}
                  className='flex size-12 items-center justify-center rounded-xl bg-[#f3e2d0] text-[#8a5638] active:scale-90 disabled:opacity-50'
                >
                  <Minus className='size-6' strokeWidth={3} />
                </button>
                <span className='w-10 text-center text-2xl font-black tabular-nums text-[#3d3338]'>{qty}</span>
                <button
                  type='button'
                  onClick={() => change(name, 1)}
                  disabled={saving || qty >= MAX_QTY}
                  aria-label={`Sumar 1: ${name}`}
                  className='flex size-12 items-center justify-center rounded-xl bg-[#dcebe1] text-[#2f6b4a] active:scale-90 disabled:opacity-50'
                >
                  <Plus className='size-6' strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
          {cart.day !== todayAR() && (
            <p className='mt-2 text-sm font-semibold text-[#a33]'>
              Estas piezas son del {cart.day.split('-').reverse().join('/')}: se guardan con ese día.
            </p>
          )}
          <button
            type='button'
            onClick={() => void save()}
            disabled={saving}
            className='mt-3 h-16 w-full rounded-2xl bg-[#3f8a5f] text-2xl font-black text-white shadow-md active:scale-[0.98] disabled:opacity-60'
          >
            {saving ? 'Guardando…' : `GUARDAR · ${cartTotal} ${cartTotal === 1 ? 'pieza' : 'piezas'}`}
          </button>
        </div>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'inline-flex h-14 items-center gap-2 rounded-2xl px-4 text-lg font-bold transition-transform active:scale-95',
        active ? `${color} text-white shadow-md` : 'border-2 border-[#e6dbcd] bg-white text-[#4e4247]',
      )}
    >
      {children}
    </button>
  );
}

/** Lo guardado hoy, con "Quitar" (pide un segundo toque para no borrar sin querer). */
function Guardado({
  made,
  reload,
  onMore,
  onBack,
}: {
  made: KitchenProductionItem[] | null;
  reload: () => Promise<void>;
  onMore: () => void;
  onBack: () => void;
}) {
  const [armed, setArmed] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // "¿Quitar?" se desarma solo a los 4 s.
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(null), 4000);
    return () => window.clearTimeout(t);
  }, [armed]);

  async function remove(id: string) {
    if (busy) return;
    setBusy(id);
    try {
      await kitchenProductionAdmin.remove(id);
      await reload();
    } catch (e) {
      showToast.error(errorText(e, 'No se pudo quitar'));
    } finally {
      setBusy(null);
      setArmed(null);
    }
  }

  const total = (made ?? []).reduce((n, m) => n + m.quantity, 0);

  return (
    <div className='pb-4'>
      <BackButton onClick={onBack} title={`HOY: ${total}`} />

      {made === null && <p className='py-10 text-center text-xl text-[#7a6e6f]'>Cargando…</p>}
      {made !== null && made.length === 0 && (
        <p className='rounded-3xl bg-white py-12 text-center text-xl font-bold text-[#455a54]'>
          Todavía no guardaste nada hoy
        </p>
      )}

      <div className='flex flex-col gap-2'>
        {(made ?? []).map((m) => (
          <div key={m.id} className='flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm'>
            <span className='w-12 text-center text-2xl font-black tabular-nums text-[#3d3338]'>{m.quantity}</span>
            <span className='min-w-0 flex-1 truncate text-lg font-bold text-[#3d3338]'>{m.item}</span>
            <button
              type='button'
              onClick={() => (armed === m.id ? void remove(m.id) : setArmed(m.id))}
              disabled={busy !== null}
              className={cn(
                'h-12 shrink-0 rounded-xl px-4 text-base font-bold disabled:opacity-50',
                armed === m.id
                  ? 'bg-[#c0392b] text-white'
                  : 'border-2 border-[#c0392b]/40 bg-white text-[#a33]',
              )}
            >
              {busy === m.id ? 'Quitando…' : armed === m.id ? '¿Quitar? Tocá de nuevo' : 'Quitar'}
            </button>
          </div>
        ))}
      </div>

      <button
        type='button'
        onClick={onMore}
        className='mt-5 h-16 w-full rounded-2xl bg-[#cc844a] text-2xl font-black text-white shadow-md active:scale-[0.98]'
      >
        CARGAR MÁS
      </button>
    </div>
  );
}
