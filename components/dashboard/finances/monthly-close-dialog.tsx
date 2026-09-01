'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ruta del reporte a abrir con el período elegido. */
  targetPath?: string;
  title?: string;
  description?: string;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const START_YEAR = 2026;

function getPreviousMonth(): { month: number; year: number } {
  const now = new Date();
  const month = now.getMonth(); // 0-based
  if (month === 0) return { month: 12, year: now.getFullYear() - 1 };
  return { month, year: now.getFullYear() };
}

type Tipo = 'mes' | 'quincena' | 'custom';

export function MonthlyCloseDialog({
  open,
  onOpenChange,
  targetPath = '/monthly-report',
  title = 'Reporte de Caja',
  description = 'Seleccioná el período para generar el reporte PDF.',
}: Props) {
  const prev = getPreviousMonth();
  const [selectedMonth, setSelectedMonth] = useState(prev.month); // 1-based
  const [selectedYear, setSelectedYear] = useState(prev.year);
  const [tipo, setTipo] = useState<Tipo>('mes');
  const [quincena, setQuincena] = useState<1 | 2>(1);
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - START_YEAR + 2 },
    (_, i) => START_YEAR + i,
  );

  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
  const monthStr = pad(selectedMonth);

  let from = '';
  let to = '';
  let label = '';

  if (tipo === 'mes') {
    // Mes contable del negocio: del 10 del mes anterior al 10 del mes elegido.
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    from = `${prevYear}-${pad(prevMonth)}-10`;
    to = `${selectedYear}-${monthStr}-10`;
    label = `${MONTHS[selectedMonth - 1]} ${selectedYear} (10 al 10)`;
  } else if (tipo === 'quincena') {
    from = quincena === 1
      ? `${selectedYear}-${monthStr}-01`
      : `${selectedYear}-${monthStr}-16`;
    to = quincena === 1
      ? `${selectedYear}-${monthStr}-15`
      : `${selectedYear}-${monthStr}-${pad(lastDay)}`;
    label = `${quincena === 1 ? '1ra' : '2da'} Quincena — ${MONTHS[selectedMonth - 1]} ${selectedYear}`;
  } else if (customRange?.from && customRange?.to) {
    from = format(customRange.from, 'yyyy-MM-dd');
    to = format(customRange.to, 'yyyy-MM-dd');
    label = `${format(customRange.from, 'dd/MM/yyyy')} – ${format(customRange.to, 'dd/MM/yyyy')}`;
  }

  const canGenerate = Boolean(from && to);
  const previewRange = canGenerate
    ? `${from.split('-').reverse().join('/')} – ${to.split('-').reverse().join('/')}`
    : 'Elegí un rango de fechas';

  function handleGenerate() {
    if (!canGenerate) return;
    const params = new URLSearchParams({ from, to, label });
    window.open(`${targetPath}?${params.toString()}`, '_blank');
    onOpenChange(false);
  }

  const pillBase: React.CSSProperties = {
    flex: 1,
    padding: '5px 0',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-tan-nimbus" style={{ color: 'var(--color-verde-profundo)' }}>
            {title}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}>
          {description}
        </p>

        {/* Toggle tipo */}
        <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 8, background: '#f0eeec' }}>
          <button
            style={{
              ...pillBase,
              background: tipo === 'mes' ? 'var(--color-verde-profundo)' : 'transparent',
              color: tipo === 'mes' ? 'white' : 'var(--color-ciruela-oscuro)',
            }}
            onClick={() => setTipo('mes')}
          >
            Mes (10 al 10)
          </button>
          <button
            style={{
              ...pillBase,
              background: tipo === 'quincena' ? 'var(--color-verde-profundo)' : 'transparent',
              color: tipo === 'quincena' ? 'white' : 'var(--color-ciruela-oscuro)',
            }}
            onClick={() => setTipo('quincena')}
          >
            Quincena
          </button>
          <button
            style={{
              ...pillBase,
              background: tipo === 'custom' ? 'var(--color-verde-profundo)' : 'transparent',
              color: tipo === 'custom' ? 'white' : 'var(--color-ciruela-oscuro)',
            }}
            onClick={() => setTipo('custom')}
          >
            Personalizado
          </button>
        </div>

        {/* Selectores mes + año (no aplican al rango personalizado) */}
        {tipo !== 'custom' && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-winter-solid mb-1 block" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>
              Mes
            </label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="w-full rounded-md border px-3 py-2 text-sm font-winter-solid"
              style={{ borderColor: 'var(--color-gris-claro)', color: 'var(--color-ciruela-oscuro)', background: 'var(--color-blanco)' }}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div style={{ width: 90 }}>
            <label className="text-xs font-winter-solid mb-1 block" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>
              Año
            </label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="w-full rounded-md border px-3 py-2 text-sm font-winter-solid"
              style={{ borderColor: 'var(--color-gris-claro)', color: 'var(--color-ciruela-oscuro)', background: 'var(--color-blanco)' }}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        )}

        {/* Calendario para rango a medida */}
        {tipo === 'custom' && (
          <div>
            <label className="text-xs font-winter-solid mb-1 block" style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}>
              Rango de fechas
            </label>
            <DateRangePicker
              date={customRange}
              onDateChange={setCustomRange}
              placeholder="Elegí desde y hasta"
            />
          </div>
        )}

        {/* Selector quincena */}
        {tipo === 'quincena' && (
          <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 8, background: '#f0eeec' }}>
            <button
              style={{
                ...pillBase,
                background: quincena === 1 ? 'var(--color-terracota)' : 'transparent',
                color: quincena === 1 ? 'white' : 'var(--color-ciruela-oscuro)',
              }}
              onClick={() => setQuincena(1)}
            >
              1ra quincena (1–15)
            </button>
            <button
              style={{
                ...pillBase,
                background: quincena === 2 ? 'var(--color-terracota)' : 'transparent',
                color: quincena === 2 ? 'white' : 'var(--color-ciruela-oscuro)',
              }}
              onClick={() => setQuincena(2)}
            >
              2da quincena (16–{lastDay})
            </button>
          </div>
        )}

        {/* Preview */}
        <div
          className="rounded-lg px-3 py-2 text-xs font-winter-solid"
          style={{ background: '#f8f6f4', color: 'var(--color-ciruela-oscuro)', border: '1px solid var(--color-gris-claro)' }}
        >
          {canGenerate ? (
            <>
              <span style={{ fontWeight: 600 }}>{label}</span>
              <span style={{ opacity: 0.5, marginLeft: 6 }}>· {previewRange}</span>
            </>
          ) : (
            <span style={{ opacity: 0.6 }}>{previewRange}</span>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-1">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={!canGenerate}
            style={{ background: 'var(--color-verde-profundo)', color: 'white', opacity: canGenerate ? 1 : 0.5 }}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Generar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
