'use client';

import * as React from 'react';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ShoppingCart,
  UserPlus,
  Wallet,
  TrendingDown,
  Package,
  Edit2,
  Trash2,
  DollarSign,
  Tag,
  Users,
  ArrowUpDown,
  History,
  LogIn,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import type { AuditLog } from '@/services/audit.service';

// ── Configuración de eventos con branding MÍSTICA ──────────────────────────

type EventKey = `${string}:${string}`;

interface EventConfig {
  label: string;
  icon: React.ElementType;
  color: string;   // texto y borde
  bg: string;      // fondo del badge (Tailwind inline style)
}

const EVENT_CONFIG: Partial<Record<EventKey, EventConfig>> = {
  'Sale:CREATE':     { label: 'Venta registrada',   icon: ShoppingCart, color: '#9d684e', bg: 'rgba(157,104,78,0.12)' },
  'Sale:UPDATE':     { label: 'Venta modificada',   icon: Edit2,        color: '#cc844a', bg: 'rgba(204,132,74,0.12)' },
  'Sale:DELETE':     { label: 'Venta eliminada',    icon: Trash2,       color: '#4e4247', bg: 'rgba(78,66,71,0.12)'   },
  'Client:CREATE':   { label: 'Cliente creado',     icon: UserPlus,     color: '#455a54', bg: 'rgba(69,90,84,0.12)'   },
  'Client:UPDATE':   { label: 'Cliente editado',    icon: Edit2,        color: '#cc844a', bg: 'rgba(204,132,74,0.12)' },
  'Client:DELETE':   { label: 'Cliente eliminado',  icon: Trash2,       color: '#4e4247', bg: 'rgba(78,66,71,0.12)'   },
  'Cashbox:OPEN':    { label: 'Apertura de caja',   icon: Wallet,       color: '#455a54', bg: 'rgba(69,90,84,0.12)'   },
  'Cashbox:CLOSE':   { label: 'Cierre de caja',     icon: DollarSign,   color: '#9d684e', bg: 'rgba(157,104,78,0.12)' },
  'Cashbox:INCOME':  { label: 'Ingreso a caja',     icon: Wallet,       color: '#455a54', bg: 'rgba(69,90,84,0.12)'   },
  'Cashbox:EXPENSE': { label: 'Egreso de caja',     icon: TrendingDown, color: '#4e4247', bg: 'rgba(78,66,71,0.12)'   },
  'Egress:CREATE':   { label: 'Egreso registrado',  icon: TrendingDown, color: '#4e4247', bg: 'rgba(78,66,71,0.12)'   },
  'Product:CREATE':  { label: 'Producto creado',    icon: Package,      color: '#cc844a', bg: 'rgba(204,132,74,0.12)' },
  'Product:UPDATE':  { label: 'Producto editado',   icon: Edit2,        color: '#cc844a', bg: 'rgba(204,132,74,0.12)' },
  'Product:BULK_UPDATE': { label: 'Actualiz. masiva', icon: Package,    color: '#cc844a', bg: 'rgba(204,132,74,0.12)' },
  'Product:UPDATE_STOCK': { label: 'Ajuste de stock', icon: Package,   color: '#cc844a', bg: 'rgba(204,132,74,0.12)' },
  'Product:DELETE':  { label: 'Producto eliminado', icon: Trash2,       color: '#4e4247', bg: 'rgba(78,66,71,0.12)'   },
  'Category:CREATE': { label: 'Categoría creada',   icon: Tag,          color: '#455a54', bg: 'rgba(69,90,84,0.12)'   },
  'Category:UPDATE': { label: 'Categoría editada',  icon: Tag,          color: '#cc844a', bg: 'rgba(204,132,74,0.12)' },
  'Category:DELETE': { label: 'Categoría eliminada',icon: Trash2,       color: '#4e4247', bg: 'rgba(78,66,71,0.12)'   },
  'Employee:CREATE': { label: 'Empleado creado',    icon: Users,        color: '#455a54', bg: 'rgba(69,90,84,0.12)'   },
  'Employee:UPDATE': { label: 'Empleado editado',   icon: Users,        color: '#cc844a', bg: 'rgba(204,132,74,0.12)' },
  'Employee:DELETE': { label: 'Empleado eliminado', icon: Trash2,       color: '#4e4247', bg: 'rgba(78,66,71,0.12)'   },
  'User:CREATE':     { label: 'Usuario creado',     icon: LogIn,        color: '#455a54', bg: 'rgba(69,90,84,0.12)'   },
  'User:UPDATE':     { label: 'Usuario editado',    icon: Edit2,        color: '#cc844a', bg: 'rgba(204,132,74,0.12)' },
  'User:DELETE':     { label: 'Usuario eliminado',  icon: LogOut,       color: '#4e4247', bg: 'rgba(78,66,71,0.12)'   },
};

const FALLBACK_CONFIG: EventConfig = {
  label: 'Acción',
  icon: History,
  color: '#455a54',
  bg: 'rgba(69,90,84,0.10)',
};

function getEventConfig(entity: string, action: string): EventConfig {
  return EVENT_CONFIG[`${entity}:${action}` as EventKey] ?? {
    ...FALLBACK_CONFIG,
    label: `${entity} · ${action}`,
  };
}

function fmt(n: number) {
  return `$${n.toLocaleString('es-AR')}`;
}

function getInlineDetail(log: AuditLog): string | null {
  const v = log.newValues;
  if (!v) return null;
  const key = `${log.entity}:${log.action}`;
  switch (key) {
    case 'Cashbox:OPEN':
      return v.openingCash != null ? `Apertura: ${fmt(v.openingCash)}` : null;
    case 'Cashbox:CLOSE':
      return v.countedClosingCash != null
        ? `Contado: ${fmt(v.countedClosingCash)} · Dif: ${fmt(v.discrepancy ?? 0)}`
        : null;
    case 'Cashbox:INCOME':
    case 'Cashbox:EXPENSE':
    case 'Egress:CREATE':
      return v.amount != null ? `${fmt(v.amount)}${v.concept ? ` · ${v.concept}` : ''}` : null;
    case 'Sale:CREATE': {
      const sale = v.data ?? v;
      if (sale.total == null) return null;
      const items = sale.items?.length ?? 0;
      return `${fmt(sale.total)}${items > 0 ? ` · ${items} ítem${items !== 1 ? 's' : ''}` : ''}`;
    }
    case 'Client:CREATE': {
      const client = v.data ?? v;
      return client.fullName ?? null;
    }
    default:
      return null;
  }
}

function EventBadge({ entity, action }: { entity: string; action: string }) {
  const cfg = getEventConfig(entity, action);
  const Icon = cfg.icon;
  return (
    <span
      className='inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-winter-solid font-semibold whitespace-nowrap'
      style={{ color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.color}22` }}
    >
      <Icon className='h-3 w-3 shrink-0' />
      {cfg.label}
    </span>
  );
}

// ── Tabla ─────────────────────────────────────────────────────────────────

interface ActivityTableProps {
  data: AuditLog[];
  isLoading?: boolean;
  compact?: boolean;
}

export function ActivityTable({ data, isLoading = false, compact = false }: ActivityTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'timestamp', desc: true }]);

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: 'timestamp',
      header: ({ column }) => (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className='h-9 px-2 text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid hover:text-[#9d684e] hover:bg-transparent'
        >
          Fecha
          <ArrowUpDown className='ml-2 h-3.5 w-3.5' />
        </Button>
      ),
      cell: ({ row }) => {
        const ts = row.getValue('timestamp') as string;
        const d = new Date(ts);
        const date = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(d);
        const time = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(d);
        return (
          <div className='flex flex-col leading-tight'>
            <span className='text-[12px] text-[#455a54]/80 font-winter-solid'>{date}</span>
            <span className='text-[11px] text-[#455a54]/45 font-mono tabular-nums'>{time}</span>
          </div>
        );
      },
    },
    {
      id: 'event',
      header: () => (
        <span className='px-2 text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid'>
          Evento
        </span>
      ),
      cell: ({ row }) => (
        <EventBadge entity={row.original.entity} action={row.original.action} />
      ),
    },
    {
      id: 'detail',
      header: () => (
        <span className='px-2 text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid'>
          Detalle
        </span>
      ),
      cell: ({ row }) => {
        const detail = getInlineDetail(row.original);
        return detail ? (
          <span className='text-[12px] text-[#455a54]/70 font-winter-solid'>{detail}</span>
        ) : (
          <span className='text-[11px] text-[#455a54]/30'>—</span>
        );
      },
    },
    {
      accessorKey: 'userEmail',
      header: () => (
        <span className='px-2 text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid'>
          Usuario
        </span>
      ),
      cell: ({ row }) => {
        const email = row.getValue('userEmail') as string;
        return (
          <span className='text-[12px] text-[#455a54]/75 font-winter-solid truncate max-w-[160px] block'>
            {email ?? '—'}
          </span>
        );
      },
    },
    ...(!compact ? [{
      accessorKey: 'entityId',
      header: () => (
        <span className='px-2 text-[11px] uppercase tracking-wide text-[#455a54]/70 font-winter-solid'>
          Ref
        </span>
      ),
      cell: ({ row }: { row: { original: AuditLog } }) => {
        const id = row.original.entityId ?? '';
        const short = id.length > 6 ? `…${id.slice(-6)}` : id;
        return (
          <span className='text-[11px] text-[#455a54]/40 font-mono'>
            {short || '—'}
          </span>
        );
      },
    }] as ColumnDef<AuditLog>[] : []),
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    initialState: { pagination: { pageSize: compact ? 5 : 20 } },
  });

  if (isLoading) {
    return (
      <div className='rounded-lg border border-[#9d684e]/15 p-8 text-center'>
        <div className='inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#9d684e] border-t-transparent' />
        <p className='mt-2 text-sm text-[#455a54]/60 font-winter-solid'>Cargando auditoría…</p>
      </div>
    );
  }

  // Agrupado por día
  const visibleRows = table.getRowModel().rows;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  const labelFor = (ts: string) => {
    const d = new Date(ts); d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) return 'Hoy';
    if (d.getTime() === yesterday.getTime()) return 'Ayer';
    return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  };

  const groups: { label: string; rows: typeof visibleRows }[] = [];
  for (const row of visibleRows) {
    const label = labelFor(row.original.timestamp);
    if (!groups.length || groups[groups.length - 1].label !== label) {
      groups.push({ label, rows: [] });
    }
    groups[groups.length - 1].rows.push(row);
  }

  return (
    <div className='w-full'>
      <div className='rounded-lg border border-[#9d684e]/15 overflow-hidden'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className='border-[#9d684e]/12 hover:bg-transparent bg-[#efcbb9]/30'>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {visibleRows.length ? (
              groups.map((group) => (
                <React.Fragment key={group.label}>
                  <TableRow className='bg-[#efcbb9]/20 hover:bg-[#efcbb9]/20 border-[#9d684e]/12'>
                    <TableCell
                      colSpan={columns.length}
                      className='py-1.5 px-4 text-[10px] uppercase tracking-widest font-winter-solid text-[#455a54]/50 font-semibold'
                    >
                      {group.label}
                    </TableCell>
                  </TableRow>
                  {group.rows.map((row) => (
                    <TableRow key={row.id} className='border-[#9d684e]/10 hover:bg-[#efcbb9]/12'>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className='py-2.5 px-3'>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='py-10'>
                  <EmptyState
                    variant='compact'
                    icon={History}
                    title='Sin actividad registrada'
                    description='Las acciones del cajero aparecerán aquí en tiempo real.'
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!compact && (
        <div className='flex items-center justify-between pt-4'>
          <span className='text-[12px] text-[#455a54]/55 font-winter-solid'>
            {table.getFilteredRowModel().rows.length} registro{table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
          </span>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30 font-winter-solid text-xs'
            >
              Anterior
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30 font-winter-solid text-xs'
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
