'use client';

// Primitivas visuales compartidas por las pestañas de Reservas (Reservas, Turnos,
// Consultas, Piezas, Experiencias, Agenda). Fiel al diseño del .pen: badges tipo
// pill con punto, chips de filtro con contador, botones-ícono y paginación
// numerada. Los colores salen de la paleta de Mística (hex arbitrarios, igual
// que el resto del panel).

import type { LucideIcon } from 'lucide-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Badge de estado (pill con punto) ──
export function StatusBadge({
  label,
  bg,
  fg,
}: {
  label: string;
  bg: string;
  fg: string;
}) {
  return (
    <span
      className='inline-flex items-center gap-1.5 rounded-full px-2.5 py-1'
      style={{ backgroundColor: bg }}
    >
      <span
        className='h-1.5 w-1.5 shrink-0 rounded-full'
        style={{ backgroundColor: fg }}
      />
      <span className='whitespace-nowrap text-xs font-semibold' style={{ color: fg }}>
        {label}
      </span>
    </span>
  );
}

// ── Chip de filtro con contador opcional ──
// `color` es el acento del estado (texto/relleno) y `tint` el fondo suave del
// estado inactivo. Activo = relleno sólido con `color` y texto blanco; inactivo
// = fondo `tint` con texto `color`.
export function FilterChip({
  label,
  count,
  active,
  color = '#455a54',
  tint = '#E7F0EC',
  onClick,
}: {
  label: string;
  count?: number | null;
  active: boolean;
  color?: string;
  tint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors'
      style={
        active
          ? { backgroundColor: color, color: '#ffffff' }
          : { backgroundColor: tint, color }
      }
    >
      {label}
      {count != null && (
        <span
          className='rounded-full px-1.5 py-0.5 font-mono text-[11px] font-semibold'
          style={
            active
              ? { backgroundColor: '#ffffff33', color: '#ffffff' }
              : { backgroundColor: '#ffffff99', color }
          }
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ── Botón-ícono de acción (34px, borde arena) ──
export function IconBtn({
  icon: Icon,
  title,
  onClick,
  disabled,
  tone = 'verde',
}: {
  icon: LucideIcon;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'verde' | 'terracota' | 'rojo';
}) {
  const color =
    tone === 'rojo' ? '#b23b2e' : tone === 'terracota' ? '#9d684e' : '#455a54';
  const hover =
    tone === 'rojo'
      ? 'hover:bg-red-50'
      : tone === 'terracota'
        ? 'hover:bg-[#fbf5ef]'
        : 'hover:bg-[#E7F0EC]';
  return (
    <button
      type='button'
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex size-[34px] shrink-0 items-center justify-center rounded-[9px] border border-[#e6dbcd] bg-white transition-colors disabled:opacity-50',
        hover,
      )}
      style={{ color }}
    >
      <Icon className='h-4 w-4' />
    </button>
  );
}

// ── Paginación numerada ──
export function Pager({
  page,
  totalPages,
  total,
  from,
  to,
  onPage,
}: {
  page: number;
  totalPages: number;
  total?: number;
  from?: number;
  to?: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1 && !total) return null;

  // Ventana de páginas alrededor de la actual (máx 5 números).
  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  for (let p = start; p <= end; p++) pages.push(p);

  const box =
    'inline-flex size-[34px] items-center justify-center rounded-[9px] text-sm font-medium transition-colors';

  return (
    <div className='flex flex-wrap items-center justify-between gap-3 px-0.5 pt-1'>
      <span className='text-[13px] text-[#7a6e6f]'>
        {total != null && from != null && to != null
          ? `Mostrando ${from}–${to} de ${total} ${total === 1 ? 'resultado' : 'resultados'}`
          : `Página ${page} de ${totalPages}`}
      </span>
      <div className='flex items-center gap-1.5'>
        <button
          type='button'
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className={cn(box, 'border border-[#e6dbcd] bg-white text-[#7a6e6f] hover:bg-[#fbf5ef] disabled:opacity-40')}
          aria-label='Anterior'
        >
          <ChevronLeft className='h-4 w-4' />
        </button>
        {pages.map((p) => {
          const on = p === page;
          return (
            <button
              key={p}
              type='button'
              onClick={() => onPage(p)}
              className={cn(
                box,
                on
                  ? 'bg-[#455a54] text-white'
                  : 'border border-[#e6dbcd] bg-white text-[#3d3338] hover:bg-[#fbf5ef]',
              )}
            >
              {p}
            </button>
          );
        })}
        <button
          type='button'
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className={cn(box, 'border border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef] disabled:opacity-40')}
          aria-label='Siguiente'
        >
          <ChevronRight className='h-4 w-4' />
        </button>
      </div>
    </div>
  );
}
