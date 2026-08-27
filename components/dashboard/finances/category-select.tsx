'use client';

import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  egressesService,
  type EgressCategory,
} from '@/services/egresses.service';

const NONE = '__none__';

/**
 * Selector de categoría de egreso (Sueldos, Servicios…). Carga las categorías
 * activas (la primera vez el backend siembra las básicas) y muestra el chip
 * de color de cada una. Valor '' = sin categoría.
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

  useEffect(() => {
    egressesService
      .listCategories()
      .then((res) => setCategories(res.data ?? []))
      .catch(() => setCategories([]));
  }, []);

  return (
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
  );
}
