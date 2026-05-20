'use client';

import * as React from 'react';
import { useMemo } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronDown, FileCheck2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SessionTransaction } from '@/services/cashbox.service';

interface TransactionsTableProps {
  transactions: SessionTransaction[];
}

const typeConfig: Record<SessionTransaction['type'], { label: string; color: string; bgColor: string }> = {
  ingreso: { label: 'Ingreso', color: '#2f6f3b', bgColor: 'rgba(47,111,59,0.12)' },
  egreso: { label: 'Egreso', color: '#9d2f2f', bgColor: 'rgba(157,47,47,0.12)' },
};

const sourceBadge: Record<SessionTransaction['source'], { label: string; color: string; bg: string } | null> = {
  sale: null,
  prepaid: { label: 'Seña', color: '#92400e', bg: '#fef3c7' },
  egress: null,
};

const paymentLabel = (m: string) => {
  switch (m) {
    case 'CASH':
      return { label: 'Efectivo', color: 'text-[#455a54]' };
    case 'CARD':
      return { label: 'Tarjeta', color: 'text-[#9d684e]' };
    case 'TRANSFER':
      return { label: 'Transferencia', color: 'text-[#e0a38d]' };
    case 'MIXTO':
      return { label: 'Mixto', color: 'text-purple-600' };
    default:
      return { label: m, color: 'text-gray-600' };
  }
};

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const columns: ColumnDef<SessionTransaction>[] = useMemo(
    () => [
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="text-white font-winter-solid hover:text-white/80 hover:bg-transparent px-1"
          >
            Fecha
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const date = new Date(row.getValue<string>('createdAt'));
          return (
            <div className="text-[#455a54] text-sm">
              <div>{date.toLocaleDateString('es-AR')}</div>
              <div className="text-xs text-[#455a54]/70">
                {date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'type',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="text-white font-winter-solid hover:text-white/80 hover:bg-transparent px-1"
          >
            Tipo
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const t = row.original;
          const cfg = typeConfig[t.type];
          const badge = sourceBadge[t.source];
          return (
            <div className="flex items-center gap-1.5">
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium font-winter-solid"
                style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
              >
                {cfg.label}
              </span>
              {badge && (
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold font-winter-solid"
                  style={{ color: badge.color, backgroundColor: badge.bg }}
                >
                  {badge.label}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'description',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="text-white font-winter-solid hover:text-white/80 hover:bg-transparent px-1"
          >
            Descripción
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-[#455a54] text-sm max-w-[280px] truncate">
            {row.getValue('description')}
          </div>
        ),
      },
      {
        accessorKey: 'paymentMethod',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="text-white font-winter-solid hover:text-white/80 hover:bg-transparent px-1"
          >
            Método
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const cfg = paymentLabel(row.getValue<string>('paymentMethod'));
          return <div className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</div>;
        },
      },
      {
        accessorKey: 'afipCae',
        header: () => (
          <span className="text-white font-winter-solid px-3">Facturado</span>
        ),
        cell: ({ row }) => {
          const cae = row.getValue<string | undefined>('afipCae');
          if (!cae) return <span className="text-[#455a54]/30 text-xs">—</span>;
          return (
            <span
              title={`CAE: ${cae}`}
              className="inline-flex items-center gap-1 text-xs font-winter-solid"
              style={{ color: 'var(--color-verde-profundo)' }}
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              AFIP
            </span>
          );
        },
      },
      {
        accessorKey: 'amount',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="text-white font-winter-solid hover:text-white/80 hover:bg-transparent px-1"
          >
            Monto
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const amount = parseFloat(row.getValue<string>('amount'));
          const type = row.original.type;
          return (
            <div
              className={`font-medium text-right ${
                type === 'ingreso' ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {type === 'egreso' ? '-' : '+'}$
              {amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: transactions,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnFilters, columnVisibility },
  });

  const totalIngresos = transactions
    .filter((t) => t.type === 'ingreso')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalEgresos = transactions
    .filter((t) => t.type === 'egreso')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="w-full">
      <div className="flex items-center py-4 justify-between flex-wrap gap-2">
        <div className="flex gap-4 text-sm font-winter-solid">
          <div className="text-[#455a54]/70">
            {transactions.length} {transactions.length === 1 ? 'movimiento' : 'movimientos'}
          </div>
          <div className="text-green-700 font-medium">
            Ingresos: $
            {totalIngresos.toLocaleString('es-AR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-red-700 font-medium">
            Egresos: $
            {totalEgresos.toLocaleString('es-AR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        <DropdownMenu>
          {/* @ts-ignore - shadcn/ui type issue */}
          <DropdownMenuTrigger asChild>
            <Button
              className="h-8 px-3 text-xs text-white bg-[#9d684e] hover:bg-[#9d684e]/90 font-winter-solid border-0"
            >
              Columnas <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                // @ts-ignore - shadcn/ui type issue
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="hover:bg-[#efcbb9]/30 capitalize text-[#455a54] text-xs font-winter-solid"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value: boolean) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border-2 border-[#455a54]/40 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="bg-[#9d684e] hover:bg-[#9d684e] border-b border-[#9d684e]"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-white">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const isPrepaid = row.original.source === 'prepaid';
                return (
                  <TableRow
                    key={row.id}
                    className={`hover:bg-[#efcbb9]/30 border-b border-[#455a54]/10 ${isPrepaid ? 'bg-amber-50/40' : ''}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="font-winter-solid">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-[#455a54]/70 font-winter-solid"
                >
                  No hay movimientos registrados en esta sesión.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30"
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30"
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
