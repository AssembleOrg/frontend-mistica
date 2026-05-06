'use client';

import { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { showToast } from '@/lib/toast';
import { parseProductsExcel, type ParsedRow, type ParseError } from '@/lib/excel-utils';
import { productsService } from '@/services/products.service';

type Phase = 'idle' | 'parsing' | 'preview' | 'submitting' | 'done';

interface PreviewState {
  rows: ParsedRow[];
  parseErrors: ParseError[];
  fileName: string;
}

interface ResultState {
  updated: string[];
  notFound: string[];
  errors: Array<{ barcode: string; message: string }>;
  /** Errores de parseo del archivo (no llegaron al backend) */
  parseErrors: ParseError[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Llamado tras un import exitoso (para refrescar la lista). */
  onApplied?: () => void;
}

export function BulkUpdateProductsDialog({ open, onOpenChange, onApplied }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setPhase('idle');
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  async function handleFileSelected(file: File) {
    setPhase('parsing');
    try {
      const { rows, errors } = await parseProductsExcel(file);
      setPreview({ rows, parseErrors: errors, fileName: file.name });
      setPhase('preview');
    } catch (err) {
      console.error('Error parseando Excel:', err);
      showToast.error(err instanceof Error ? err.message : 'No se pudo leer el archivo');
      setPhase('idle');
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setPhase('submitting');

    try {
      const items = preview.rows.map((r) => ({ barcode: r.barcode, fields: r.fields }));
      const response = await productsService.bulkUpdateByBarcode(items);
      setResult({
        updated: response.data.updated,
        notFound: response.data.notFound,
        errors: response.data.errors,
        parseErrors: preview.parseErrors,
      });
      setPhase('done');

      if (response.data.updated.length > 0) {
        showToast.success(`${response.data.updated.length} producto(s) actualizado(s)`);
        onApplied?.();
      } else {
        showToast.info('No se actualizó ningún producto');
      }
    } catch (err) {
      console.error('Bulk update falló:', err);
      showToast.error(err instanceof Error ? err.message : 'Error al actualizar productos');
      setPhase('preview');
    }
  }

  // Conteos del preview
  const noopCount = preview ? preview.rows.filter((r) => Object.keys(r.fields).length === 0).length : 0;
  const willUpdateCount = preview ? preview.rows.length - noopCount : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Actualizar productos desde Excel
          </DialogTitle>
          <DialogDescription>
            Subí un archivo Excel exportado desde esta misma pantalla. Se actualizan los productos
            por código de barras. No se crean productos nuevos.
          </DialogDescription>
        </DialogHeader>

        {phase === 'idle' && (
          <div className="space-y-4">
            <div className="rounded-md border border-dashed border-[#9d684e]/30 p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-[#9d684e]/60" />
              <p className="text-sm text-[#455a54]/70 mb-3">
                Formato esperado: el archivo que descargás con &quot;Exportar Excel&quot;.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelected(f);
                }}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#9d684e] hover:bg-[#9d684e]/90 text-white"
              >
                Seleccionar archivo
              </Button>
            </div>
          </div>
        )}

        {phase === 'parsing' && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#9d684e]" />
            <span className="ml-2 text-[#455a54]">Leyendo archivo…</span>
          </div>
        )}

        {phase === 'preview' && preview && (
          <div className="space-y-4">
            <p className="text-sm text-[#455a54]/70">
              Archivo: <span className="font-medium text-[#455a54]">{preview.fileName}</span>
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <SummaryCard
                label="A actualizar"
                value={willUpdateCount}
                tone="info"
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
              <SummaryCard
                label="Sin cambios"
                value={noopCount}
                tone="muted"
              />
              <SummaryCard
                label="Errores en archivo"
                value={preview.parseErrors.length}
                tone={preview.parseErrors.length > 0 ? 'danger' : 'muted'}
                icon={<AlertCircle className="h-4 w-4" />}
              />
            </div>

            {preview.parseErrors.length > 0 && (
              <ErrorList
                title="Filas con errores en el archivo (se ignoran):"
                errors={preview.parseErrors.map((e) => ({
                  key: `row-${e.rowNumber}`,
                  primary: `Fila ${e.rowNumber}${e.barcode ? ` · ${e.barcode}` : ''}`,
                  message: e.message,
                }))}
              />
            )}
          </div>
        )}

        {phase === 'submitting' && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#9d684e]" />
            <span className="ml-2 text-[#455a54]">Aplicando cambios…</span>
          </div>
        )}

        {phase === 'done' && result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <SummaryCard
                label="Actualizados"
                value={result.updated.length}
                tone="success"
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
              <SummaryCard
                label="No encontrados"
                value={result.notFound.length}
                tone={result.notFound.length > 0 ? 'warning' : 'muted'}
                icon={<XCircle className="h-4 w-4" />}
              />
              <SummaryCard
                label="Con error"
                value={result.errors.length + result.parseErrors.length}
                tone={
                  result.errors.length + result.parseErrors.length > 0 ? 'danger' : 'muted'
                }
                icon={<AlertCircle className="h-4 w-4" />}
              />
            </div>

            {result.notFound.length > 0 && (
              <ErrorList
                title="Códigos no existentes en el catálogo:"
                errors={result.notFound.map((bc) => ({
                  key: `nf-${bc}`,
                  primary: bc,
                  message: 'No existe un producto con ese código',
                }))}
              />
            )}

            {result.errors.length > 0 && (
              <ErrorList
                title="Errores de validación al actualizar:"
                errors={result.errors.map((e) => ({
                  key: `er-${e.barcode}`,
                  primary: e.barcode,
                  message: e.message,
                }))}
              />
            )}

            {result.parseErrors.length > 0 && (
              <ErrorList
                title="Errores en el archivo (no llegaron al backend):"
                errors={result.parseErrors.map((e) => ({
                  key: `pe-${e.rowNumber}`,
                  primary: `Fila ${e.rowNumber}${e.barcode ? ` · ${e.barcode}` : ''}`,
                  message: e.message,
                }))}
              />
            )}
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          {phase === 'preview' && (
            <>
              <Button variant="outline" onClick={() => reset()} className="w-full sm:w-auto">
                Elegir otro archivo
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={willUpdateCount === 0}
                className="bg-[#9d684e] hover:bg-[#9d684e]/90 text-white w-full sm:w-auto"
              >
                Aplicar {willUpdateCount} cambio(s)
              </Button>
            </>
          )}
          {phase === 'done' && (
            <Button
              onClick={() => handleClose(false)}
              className="bg-[#9d684e] hover:bg-[#9d684e]/90 text-white w-full sm:w-auto"
            >
              Cerrar
            </Button>
          )}
          {(phase === 'idle' || phase === 'parsing') && (
            <Button variant="outline" onClick={() => handleClose(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================================
// Subcomponentes locales
// =====================================================================

function SummaryCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'muted';
  icon?: React.ReactNode;
}) {
  const toneClasses: Record<typeof tone, string> = {
    success: 'border-[#455a54]/30 bg-[#455a54]/8 text-[#455a54]',
    warning: 'border-[#cc844a]/30 bg-[#cc844a]/8 text-[#cc844a]',
    danger:  'border-[#4e4247]/30 bg-[#4e4247]/8 text-[#4e4247]',
    info:    'border-[#9d684e]/30 bg-[#efcbb9]/30 text-[#9d684e]',
    muted:   'border-[#9d684e]/15 bg-[#9d684e]/5 text-[#455a54]/50',
  };

  return (
    <div className={`rounded-md border p-3 ${toneClasses[tone]}`}>
      <div className="flex items-center gap-1 text-xs uppercase tracking-wide font-medium">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function ErrorList({
  title,
  errors,
}: {
  title: string;
  errors: Array<{ key: string; primary: string; message: string }>;
}) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50/50 p-3">
      <p className="text-sm font-medium text-red-700 mb-2">{title}</p>
      <ul className="text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
        {errors.map((e) => (
          <li key={e.key}>
            <span className="font-mono">{e.primary}</span> — {e.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
