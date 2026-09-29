'use client';

import { useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PopoverPortal } from '@/components/ui/popover-portal';
import { cn } from '@/lib/utils';

export const catalogFieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

/** Minúsculas y sin tildes: "Plató" matchea "plato". */
export const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

export const errMsg = (e: unknown, fallback: string) =>
  e instanceof Error ? e.message : fallback;

export interface CatalogOption {
  key: string;
  label: string;
  /** Texto a la derecha (ej. el monto). */
  hint?: string;
}

/**
 * Desplegable de un catálogo con búsqueda en memoria (flechas, Enter, Esc).
 * Si lo escrito no está y hay `onAdd`, ofrece agregarlo desde la misma lista.
 * `onManage` muestra al lado el botón que abre el ABM del catálogo.
 */
export function CatalogCombobox({
  options,
  selectedKey,
  onPick,
  loaded,
  placeholder,
  onAdd,
  onManage,
  manageLabel = 'Gestionar catálogo',
  emptyText = 'El catálogo está vacío.',
  fallbackLabel,
  className,
}: {
  options: CatalogOption[];
  selectedKey: string;
  onPick: (key: string) => void;
  loaded: boolean;
  placeholder: string;
  onAdd?: (query: string) => Promise<void> | void;
  onManage?: () => void;
  manageLabel?: string;
  emptyText?: string;
  /** Qué mostrar si el valor elegido no está en el catálogo (ej. uno viejo). */
  fallbackLabel?: string;
  className?: string;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [adding, setAdding] = useState(false);

  const selected = options.find((o) => o.key === selectedKey) ?? null;
  const q = norm(query);
  const filtered = useMemo(
    () => (q ? options.filter((o) => norm(o.label).includes(q)) : options),
    [options, q],
  );
  const canAdd = !!onAdd && !!q && !options.some((o) => norm(o.label) === q);
  // Opciones navegables: las del catálogo + "Agregar …" al final.
  const optionCount = filtered.length + (canAdd ? 1 : 0);

  function openList() {
    setQuery('');
    setActive(Math.max(0, options.findIndex((o) => o.key === selectedKey)));
    setOpen(true);
  }

  function pick(key: string) {
    onPick(key);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  }

  async function add() {
    if (!onAdd || !query.trim()) return;
    setAdding(true);
    try {
      await onAdd(query.trim());
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
    } finally {
      setAdding(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      openList();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(optionCount - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active < filtered.length) pick(filtered[active].key);
      else if (canAdd) void add();
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
    }
  }

  const shown = selected
    ? selected.hint
      ? `${selected.label} · ${selected.hint}`
      : selected.label
    : (fallbackLabel ?? '');

  return (
    <div className={cn('flex gap-1.5', className)}>
      <div ref={anchorRef} className='relative min-w-0 flex-1'>
        <Input
          ref={inputRef}
          value={open ? query : shown}
          placeholder={open ? shown || 'Buscar…' : placeholder}
          onFocus={openList}
          onClick={() => !open && openList()}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            if (!open) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          role='combobox'
          aria-expanded={open}
          autoComplete='off'
          className={cn('pr-8', catalogFieldCls)}
        />
        <ChevronDown className='pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a6e6f]' />
        <PopoverPortal
          open={open}
          onClose={() => setOpen(false)}
          anchorRef={anchorRef}
          className='max-h-64 overflow-y-auto rounded-lg border border-[#e6dbcd] bg-white py-1 shadow-lg'
        >
          {!loaded ? (
            <p className='px-3 py-2 text-sm text-[#7a6e6f]'>Cargando…</p>
          ) : (
            <>
              {filtered.map((o, i) => (
                <button
                  key={o.key}
                  type='button'
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o.key)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-[#3d3338]',
                    i === active && 'bg-[#fbf5ef]',
                  )}
                >
                  <span className='truncate'>{o.label}</span>
                  <span className='flex shrink-0 items-center gap-2'>
                    {o.hint && <span className='text-xs text-[#7a6e6f]'>{o.hint}</span>}
                    {o.key === selectedKey && <Check className='h-4 w-4 text-[#455a54]' />}
                  </span>
                </button>
              ))}
              {filtered.length === 0 && !canAdd && (
                <p className='px-3 py-2 text-sm text-[#7a6e6f]'>
                  {q ? 'Sin resultados.' : emptyText}
                </p>
              )}
              {canAdd && (
                <button
                  type='button'
                  disabled={adding}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void add()}
                  onMouseEnter={() => setActive(filtered.length)}
                  className={cn(
                    'flex w-full items-center gap-2 border-t border-[#e6dbcd] px-3 py-2 text-left text-sm font-medium text-[#9d684e] disabled:opacity-60',
                    active === filtered.length && 'bg-[#fbf5ef]',
                  )}
                >
                  <Plus className='h-4 w-4' />
                  Agregar “{query.trim()}”
                </button>
              )}
            </>
          )}
        </PopoverPortal>
      </div>
      {onManage && (
        <Button
          type='button'
          variant='outline'
          size='icon'
          onClick={onManage}
          title={manageLabel}
          aria-label={manageLabel}
          className='shrink-0 border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
        >
          <Settings2 className='h-4 w-4' />
        </Button>
      )}
    </div>
  );
}
