'use client';

// Selector de alumnos con buscador. Filtra en memoria la lista que ya tiene la
// pantalla (no pega a la API), así que no necesita debounce. Elegido el alumno,
// se muestra como chip con X para cambiarlo, igual que `ClientPicker`.

import { useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const defaultFieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/** Tope de filas visibles: con más, se pide afinar la búsqueda. */
const MAX_ROWS = 50;

export function StudentPicker<T extends { _id: string; name: string }>({
  students,
  value,
  onChange,
  placeholder = 'Buscar alumno…',
  blockedReason,
  newOption,
  className,
}: Readonly<{
  students: ReadonlyArray<T>;
  /** Id del alumno elegido, `newOption.value` o '' si no hay nada. */
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  /** Si devuelve texto, el alumno se muestra pero no se puede elegir. */
  blockedReason?: (student: T) => string;
  /** Opción fija arriba de la lista (ej. "+ Persona nueva"). */
  newOption?: { value: string; label: string };
  className?: string;
}>) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const term = norm(query);
    return term ? students.filter((s) => norm(s.name).includes(term)) : students;
  }, [students, query]);

  if (value) {
    const label =
      newOption && value === newOption.value
        ? newOption.label
        : (students.find((s) => s._id === value)?.name ?? '');
    return (
      <div className='flex min-h-9 items-center gap-2 rounded-md border border-[#bfd2c9] bg-[#E7F0EC] px-3'>
        <span className='min-w-0 flex-1 truncate text-sm font-medium text-[#455a54]'>
          {label}
        </span>
        <button
          type='button'
          onClick={() => {
            onChange('');
            setQuery('');
          }}
          className='rounded p-1 text-[#6d7d77] hover:bg-white/70'
          aria-label='Cambiar alumno'
        >
          <X className='h-4 w-4' />
        </button>
      </div>
    );
  }

  const pick = (id: string) => {
    onChange(id);
    setQuery('');
    setOpen(false);
  };

  return (
    <div
      className='relative'
      onBlur={(event) => {
        // Sólo se cierra si el foco sale del selector (no al tocar una fila).
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Search className='pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#9d684e]/60' />
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
        }}
        placeholder={placeholder}
        className={cn(defaultFieldCls, 'h-9 pl-9', className)}
      />
      {open && (
        <div className='mt-1 max-h-48 overflow-y-auto rounded-md border border-[#e6dbcd] bg-white p-1 shadow-sm'>
          {newOption && (
            <button
              type='button'
              onClick={() => pick(newOption.value)}
              className='flex w-full items-center gap-1.5 rounded px-2 py-2 text-left text-sm font-medium text-[#9d684e] hover:bg-[#fbf5ef]'
            >
              <Plus className='h-3.5 w-3.5' />
              {newOption.label}
            </button>
          )}
          {matches.length === 0 ? (
            <p className='px-2 py-3 text-sm text-[#7a6e6f]'>No encontramos alumnos.</p>
          ) : (
            matches.slice(0, MAX_ROWS).map((s) => {
              const reason = blockedReason?.(s) ?? '';
              return (
                <button
                  key={s._id}
                  type='button'
                  disabled={!!reason}
                  onClick={() => pick(s._id)}
                  className='block w-full rounded px-2 py-2 text-left text-sm text-[#3d3338] hover:bg-[#fbf5ef] disabled:cursor-not-allowed disabled:text-[#7a6e6f]/70 disabled:hover:bg-transparent'
                >
                  {s.name}
                  {reason}
                </button>
              );
            })
          )}
          {matches.length > MAX_ROWS && (
            <p className='px-2 py-2 text-xs text-[#7a6e6f]'>
              Hay {matches.length - MAX_ROWS} más: escribí para afinar la búsqueda.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
