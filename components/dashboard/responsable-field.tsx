'use client';

// "¿Quién lo hace?" en las cuentas compartidas (compu del mostrador, tablets):
// las usan varias personas, así que en algunas gestiones (lista de compras,
// piezas) se elige quién la hizo. En una cuenta personal no se muestra: el
// backend usa el nombre de la cuenta.

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { usersAdmin, type TeamPerson } from '@/services/users.admin.service';

/** Lo último elegido se propone un rato (la misma persona suele cargar varias). */
const MEMORY_KEY = 'mistica-responsable';
const MEMORY_MS = 15 * 60_000;

let teamCache: TeamPerson[] | null = null;

export function useIsSharedAccount(): boolean {
  const { user } = useAuth();
  return !!user?.sharedAccount;
}

function rememberedName(): string {
  try {
    const raw = window.localStorage.getItem(MEMORY_KEY);
    if (!raw) return '';
    const { name, at } = JSON.parse(raw) as { name?: string; at?: number };
    return name && at && Date.now() - at < MEMORY_MS ? name : '';
  } catch {
    return '';
  }
}

function remember(name: string) {
  try {
    window.localStorage.setItem(
      MEMORY_KEY,
      JSON.stringify({ name, at: Date.now() }),
    );
  } catch {
    // Sin storage: no pasa nada, sólo no se recuerda.
  }
}

/**
 * Estado del "¿quién lo hace?": arranca con lo último elegido (si fue hace
 * poco) y lo recuerda al elegir. En cuentas personales queda vacío.
 */
export function useResponsable() {
  const shared = useIsSharedAccount();
  const [value, setValue] = useState('');
  useEffect(() => {
    if (shared) setValue(rememberedName());
  }, [shared]);
  return {
    shared,
    value: shared ? value : '',
    onChange: (name: string) => {
      setValue(name);
      if (name.trim()) remember(name.trim());
    },
  };
}

export function ResponsableField({
  value,
  onChange,
  label = '¿Quién lo hace?',
  className,
}: {
  value: string;
  onChange: (name: string) => void;
  label?: string;
  className?: string;
}) {
  const shared = useIsSharedAccount();
  const [team, setTeam] = useState<TeamPerson[]>(teamCache ?? []);
  const [otherOpen, setOtherOpen] = useState(false);

  useEffect(() => {
    if (!shared || teamCache) return;
    let alive = true;
    usersAdmin
      .team()
      .then((t) => {
        teamCache = t;
        if (alive) setTeam(t);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [shared]);

  if (!shared) return null;

  const isTeam = team.some((p) => p.name === value);
  const showOther = otherOpen || (!!value && !isTeam);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className='text-[13px] font-medium text-[#455a54]'>{label}</span>
      <div className='flex flex-wrap gap-1.5'>
        {team.map((p) => {
          const on = value === p.name;
          return (
            <button
              key={p.id}
              type='button'
              onClick={() => {
                setOtherOpen(false);
                onChange(on ? '' : p.name);
              }}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition',
                on
                  ? 'border-[#455a54] bg-[#455a54] text-white'
                  : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]',
              )}
            >
              {p.name}
            </button>
          );
        })}
        <button
          type='button'
          onClick={() => {
            setOtherOpen(true);
            if (isTeam) onChange('');
          }}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-semibold transition',
            showOther
              ? 'border-[#455a54] bg-[#455a54] text-white'
              : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]',
          )}
        >
          Otro
        </button>
      </div>
      {showOther && (
        <Input
          value={isTeam ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder='Nombre'
          maxLength={80}
          autoFocus={otherOpen}
          className='h-9 border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54]'
        />
      )}
    </div>
  );
}
