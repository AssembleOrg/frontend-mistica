'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { showToast } from '@/lib/toast';
import { errorText } from '@/lib/api-error-messages';
import {
  egressesService,
  type EgressCategory,
} from '@/services/egresses.service';

const NONE = '__none__';

/**
 * Selector de categoría de egreso (Sueldos, Servicios…). Carga las categorías
 * activas (la primera vez el backend siembra las básicas) y muestra el chip
 * de color de cada una. Valor '' = sin categoría. Debajo, «Nueva categoría»
 * crea una al vuelo y la deja elegida.
 */
export function EgressCategorySelect({
  value,
  onChange,
  disabled,
}: Readonly<{
  value: string;
  onChange: (categoryId: string) => void;
  disabled?: boolean;
}>) {
  const [categories, setCategories] = useState<EgressCategory[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    egressesService
      .listCategories()
      .then((res) => setCategories(res.data ?? []))
      .catch(() => setCategories([]));
  }, []);

  async function createCategory() {
    const name = newName.trim();
    if (!name) return;
    const existing = categories.find(
      (c) => c.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      onChange(existing._id);
      setAdding(false);
      setNewName('');
      return;
    }
    setSaving(true);
    try {
      const res = await egressesService.createCategory({ name });
      const created = res.data;
      if (created?._id) {
        setCategories((prev) => [...prev, created]);
        onChange(created._id);
      }
      showToast.success(`Categoría «${name}» creada`);
      setAdding(false);
      setNewName('');
    } catch (err) {
      showToast.error(errorText(err, 'No se pudo crear la categoría'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='space-y-1.5'>
      <Select
        value={value || NONE}
        onValueChange={(v) => onChange(v === NONE ? '' : v)}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder='Sin categoría' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Sin categoría</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c._id} value={c._id}>
              <span className='inline-flex items-center gap-2'>
                <span
                  className='h-2.5 w-2.5 rounded-full'
                  style={{ backgroundColor: c.color ?? '#9d684e' }}
                />
                {c.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {adding ? (
        <div className='flex items-center gap-2'>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                createCategory();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setAdding(false);
                setNewName('');
              }
            }}
            placeholder='Nombre de la categoría'
            maxLength={60}
            disabled={saving || disabled}
            autoFocus
            className='h-8 text-sm'
          />
          <Button
            type='button'
            size='sm'
            onClick={createCategory}
            disabled={saving || disabled || !newName.trim()}
            className='h-8 bg-[#9d684e] text-xs text-white hover:bg-[#9d684e]/90'
          >
            {saving ? 'Creando…' : 'Crear'}
          </Button>
          <Button
            type='button'
            size='sm'
            variant='ghost'
            onClick={() => {
              setAdding(false);
              setNewName('');
            }}
            disabled={saving}
            className='h-8 text-xs text-[#455a54]'
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <button
          type='button'
          onClick={() => setAdding(true)}
          disabled={disabled}
          className='inline-flex items-center gap-1 text-[12px] font-winter-solid text-[#9d684e] underline-offset-2 hover:underline disabled:opacity-50'
        >
          <Plus className='h-3.5 w-3.5' />
          Nueva categoría
        </button>
      )}
    </div>
  );
}
