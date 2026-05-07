'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AsyncSelectFetchResult<T> {
  items: T[];
  hasMore: boolean;
}

export interface AsyncSelectProps<T> {
  /** Item actualmente seleccionado (se muestra en el trigger). null = sin selección. */
  value: T | null;
  onChange: (item: T | null) => void;
  /** Carga una página de items para un término de búsqueda. */
  fetcher: (search: string, page: number, pageSize: number) => Promise<AsyncSelectFetchResult<T>>;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  renderOption?: (item: T, isHighlighted: boolean) => React.ReactNode;
  renderTrigger?: (item: T | null, freeText: string) => React.ReactNode;
  placeholder?: string;
  pageSize?: number;
  rowHeight?: number;
  maxListHeight?: number;
  className?: string;
  disabled?: boolean;
  noResultsLabel?: string;
  /** Si true, permite que el usuario tipee texto libre cuando no hay match. */
  allowFreeText?: boolean;
  freeTextValue?: string;
  onFreeTextChange?: (text: string) => void;
}

/**
 * Combobox async con paginación incremental + virtualización liviana.
 *
 * - Pide la primera página al abrir y al cambiar el término de búsqueda (debounce 250 ms).
 * - Carga la siguiente página cuando el scroll llega cerca del final.
 * - Renderiza solo las filas visibles (windowing) usando posicionamiento absoluto;
 *   esto mantiene el costo O(visibles) aunque haya 1000 items cargados.
 */
export function AsyncSelect<T>({
  value,
  onChange,
  fetcher,
  getKey,
  getLabel,
  renderOption,
  renderTrigger,
  placeholder = 'Buscar...',
  pageSize = 20,
  rowHeight = 40,
  maxListHeight = 320,
  className,
  disabled = false,
  noResultsLabel = 'Sin resultados',
  allowFreeText = false,
  freeTextValue = '',
  onFreeTextChange,
}: AsyncSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqIdRef = useRef(0); // protege contra respuestas obsoletas

  // Debounce de búsqueda
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const loadPage = useCallback(
    async (pageNum: number, term: string) => {
      const reqId = ++reqIdRef.current;
      setLoading(true);
      try {
        const result = await fetcher(term, pageNum, pageSize);
        if (reqId !== reqIdRef.current) return; // descartamos respuesta tardía
        setItems((prev) => (pageNum === 1 ? result.items : [...prev, ...result.items]));
        setHasMore(result.hasMore);
        setPage(pageNum);
      } finally {
        if (reqId === reqIdRef.current) setLoading(false);
      }
    },
    [fetcher, pageSize],
  );

  // Reset + primera página al abrir o al cambiar el término de búsqueda
  useEffect(() => {
    if (!open) return;
    setItems([]);
    setHasMore(true);
    setPage(1);
    setHighlightedIndex(0);
    if (listRef.current) listRef.current.scrollTop = 0;
    setScrollTop(0);
    void loadPage(1, debouncedSearch);
  }, [debouncedSearch, open, loadPage]);

  // Cerrar al hacer click afuera
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Auto-foco del input al abrir
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    if (loading || !hasMore) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < rowHeight * 3) {
      void loadPage(page + 1, debouncedSearch);
    }
  }, [debouncedSearch, hasMore, loadPage, loading, page, rowHeight]);

  const selectItem = (item: T) => {
    onChange(item);
    onFreeTextChange?.(getLabel(item));
    setOpen(false);
    setSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[highlightedIndex];
      if (item) selectItem(item);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  // Math de virtualización
  const overscan = 5;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const end = Math.min(items.length, Math.ceil((scrollTop + maxListHeight) / rowHeight) + overscan);
  const visible = items.slice(start, end);
  const totalHeight = items.length * rowHeight;

  // Asegurar que la fila highlighteada esté visible
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const top = highlightedIndex * rowHeight;
    const bottom = top + rowHeight;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (bottom > el.scrollTop + el.clientHeight) el.scrollTop = bottom - el.clientHeight;
  }, [highlightedIndex, rowHeight]);

  const triggerLabel = value ? getLabel(value) : freeTextValue;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {renderTrigger ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          className="w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {renderTrigger(value, freeTextValue)}
        </button>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={open ? search : triggerLabel}
            onChange={(e) => {
              const v = e.target.value;
              setSearch(v);
              if (allowFreeText) {
                onFreeTextChange?.(v);
                if (value) onChange(null);
              }
              if (!open) setOpen(true);
            }}
            onFocus={() => !disabled && setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'w-full h-9 pl-9 pr-9 rounded-md border border-[#9d684e]/20 bg-background text-sm',
              'focus:outline-none focus:border-[#9d684e] focus:ring-1 focus:ring-[#9d684e]/20',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9d684e]/60 pointer-events-none" />
          {value && !disabled ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
                onFreeTextChange?.('');
                setSearch('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9d684e]/60 hover:text-[#9d684e]"
              aria-label="Limpiar selección"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9d684e]/60 pointer-events-none" />
          )}
        </div>
      )}

      {open && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-full rounded-md border border-[#9d684e]/20 bg-background shadow-lg',
            'overflow-hidden',
          )}
        >
          <div
            ref={listRef}
            onScroll={handleScroll}
            style={{ maxHeight: maxListHeight }}
            className="overflow-y-auto"
          >
            {items.length === 0 && !loading ? (
              <div className="py-6 text-center text-sm text-[#455a54]/60">{noResultsLabel}</div>
            ) : (
              <div style={{ height: totalHeight, position: 'relative' }}>
                {visible.map((item, i) => {
                  const idx = start + i;
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <div
                      key={getKey(item)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onMouseDown={(e) => {
                        e.preventDefault(); // evita perder foco antes del click
                        selectItem(item);
                      }}
                      style={{
                        position: 'absolute',
                        top: idx * rowHeight,
                        left: 0,
                        right: 0,
                        height: rowHeight,
                      }}
                      className={cn(
                        'flex items-center px-3 cursor-pointer text-sm',
                        isHighlighted ? 'bg-[#9d684e]/10' : 'hover:bg-[#9d684e]/5',
                      )}
                    >
                      {renderOption ? renderOption(item, isHighlighted) : <span>{getLabel(item)}</span>}
                    </div>
                  );
                })}
              </div>
            )}
            {loading && (
              <div className="py-2 flex items-center justify-center text-xs text-[#455a54]/60 gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Cargando...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
