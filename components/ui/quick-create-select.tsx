'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

export interface QuickCreateField {
  key: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'email' | 'tel';
}

/** Campos del alta rápida de profesor / alumno (nombre obligatorio, resto opcional). */
export const professorFields: QuickCreateField[] = [
  { key: 'name', label: 'Nombre', required: true },
  { key: 'phone', label: 'Teléfono', type: 'tel' },
  { key: 'email', label: 'Email', type: 'email' },
];

export const studentFields: QuickCreateField[] = [
  { key: 'name', label: 'Nombre', required: true },
  { key: 'phone', label: 'Teléfono', type: 'tel' },
];

export interface QuickCreateOption {
  id: string;
  name: string;
}

interface QuickCreateButtonProps {
  onCreate: (values: Record<string, string>) => Promise<QuickCreateOption>;
  /** Se llama con la entidad creada (para tildarla, seleccionarla, etc.). */
  onCreated?: (created: QuickCreateOption) => void;
  fields: QuickCreateField[];
  createTitle?: string;
  /** Texto del botón (por defecto "Nuevo"). */
  label?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Botón "+" que abre un mini-form, crea la entidad y avisa por onCreated.
 * Base compartida por QuickCreateSelect y por listas multi-select (checkboxes).
 */
export function QuickCreateButton({
  onCreate,
  onCreated,
  fields,
  createTitle = 'Crear nuevo',
  label = 'Nuevo',
  disabled,
  className,
}: QuickCreateButtonProps) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const missingRequired = fields.some(
    (f) => f.required && !(values[f.key] ?? '').trim(),
  );

  async function submit() {
    if (missingRequired || saving) return;
    setSaving(true);
    try {
      const trimmed: Record<string, string> = {};
      for (const [k, v] of Object.entries(values)) {
        const t = v.trim();
        if (t) trimmed[k] = t;
      }
      const created = await onCreate(trimmed);
      onCreated?.(created);
      setOpen(false);
      setValues({});
      showToast.success('Creado');
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo crear');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        type='button'
        variant='outline'
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={createTitle}
        className={cn(
          'shrink-0 gap-1.5 border-[#e6dbcd] text-[#455a54] hover:bg-[#fbf5ef]',
          className,
        )}
      >
        <Plus className='h-4 w-4' />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader className='text-left'>
            <DialogTitle className='font-tan-nimbus text-xl text-[#455a54]'>
              {createTitle}
            </DialogTitle>
          </DialogHeader>
          <div className='flex flex-col gap-3'>
            {fields.map((f) => (
              <label key={f.key} className='flex flex-col gap-1'>
                <span className='text-xs font-medium text-[#7a6e6f]'>
                  {f.label}
                  {f.required && <span className='text-[#b23b2e]'> *</span>}
                </span>
                <Input
                  type={f.type ?? 'text'}
                  value={values[f.key] ?? ''}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.key]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !missingRequired) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  className={fieldCls}
                />
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOpen(false)}
              className='border-[#e6dbcd]'
            >
              Cancelar
            </Button>
            <Button
              type='button'
              onClick={submit}
              disabled={missingRequired || saving}
              className='bg-[#455a54] text-white hover:bg-[#3a4c47]'
            >
              {saving ? 'Creando…' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface QuickCreateSelectProps {
  value: string;
  onChange: (id: string) => void;
  options: QuickCreateOption[];
  /** Alta: recibe los valores del sub-form, devuelve la entidad creada normalizada. */
  onCreate: (values: Record<string, string>) => Promise<QuickCreateOption>;
  fields: QuickCreateField[];
  placeholder?: string;
  /** Primera opción "vacía" (ej. "Sin asignar"). Omitir para no ofrecerla. */
  emptyLabel?: string;
  /** Texto del título del sub-dialog. */
  createTitle?: string;
  className?: string;
  disabled?: boolean;
}

const EMPTY_SENTINEL = '__none__';

/**
 * Select + botón "+" que crea la entidad sin salir del modal actual y la deja
 * seleccionada. Reemplaza los selects sueltos de profesor/alumno para que no
 * haya callejones sin salida (grupo sin profesores, pieza sin el alumno, etc.).
 */
export function QuickCreateSelect({
  value,
  onChange,
  options,
  onCreate,
  fields,
  placeholder = 'Elegí una opción',
  emptyLabel,
  createTitle = 'Crear nuevo',
  className,
  disabled,
}: QuickCreateSelectProps) {
  return (
    <div className='flex items-center gap-2'>
      <Select
        value={value || (emptyLabel ? EMPTY_SENTINEL : undefined)}
        onValueChange={(v) => onChange(v === EMPTY_SENTINEL ? '' : v)}
        disabled={disabled}
      >
        <SelectTrigger className={cn('flex-1', fieldCls, className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {emptyLabel && (
            <SelectItem value={EMPTY_SENTINEL}>{emptyLabel}</SelectItem>
          )}
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <QuickCreateButton
        onCreate={onCreate}
        onCreated={(created) => onChange(created.id)}
        fields={fields}
        createTitle={createTitle}
        disabled={disabled}
      />
    </div>
  );
}
