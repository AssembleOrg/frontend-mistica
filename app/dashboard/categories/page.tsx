'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useCategories } from '@/hooks/useCategories';
import { categoriesService } from '@/services/categories.service';
import { showToast } from '@/lib/toast';
import type { Category } from '@/lib/types';

interface FormState {
  name: string;
  description: string;
  color: string;
}

const EMPTY: FormState = { name: '', description: '', color: '' };

export default function CategoriesPage() {
  const { categories, isLoading, refresh } = useCategories();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description ?? '', color: cat.color ?? '' });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      showToast.error('El nombre es requerido');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        color: form.color.trim() || undefined,
      };
      if (editing) {
        await categoriesService.update(editing.id, payload);
        showToast.success('Categoría actualizada');
      } else {
        await categoriesService.create(payload);
        showToast.success('Categoría creada');
      }
      setOpen(false);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      showToast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!window.confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;
    setDeletingId(cat.id);
    try {
      await categoriesService.remove(cat.id);
      showToast.success('Categoría eliminada');
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar';
      showToast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Categorías'
        subtitle='Gestioná las categorías que usan los productos'
        actions={
          <Button
            onClick={openCreate}
            className='bg-[#9d684e] hover:bg-[#8a5a45] text-white font-winter-solid'
          >
            <Plus className='h-4 w-4 mr-2' />
            Nueva categoría
          </Button>
        }
      />

      <Card className='border-[#9d684e]/20'>
        <CardContent className='pt-6'>
          {isLoading ? (
            <div className='flex items-center justify-center py-12 text-[#455a54]/60'>
              <Loader2 className='h-5 w-5 animate-spin mr-2' /> Cargando...
            </div>
          ) : categories.length === 0 ? (
            <div className='py-12 text-center text-[#455a54]/60 font-winter-solid'>
              Todavía no hay categorías. Creá la primera con el botón de arriba.
            </div>
          ) : (
            <ul className='divide-y divide-[#9d684e]/15'>
              {categories.map((cat) => (
                <li key={cat.id} className='flex items-center justify-between py-3 gap-3'>
                  <div className='flex items-center gap-3 min-w-0'>
                    <span
                      className='inline-block w-3 h-3 rounded-full shrink-0'
                      style={{ backgroundColor: cat.color || '#9d684e' }}
                    />
                    <div className='min-w-0'>
                      <p className='font-medium text-[#455a54] truncate font-winter-solid'>{cat.name}</p>
                      {cat.description && (
                        <p className='text-xs text-[#455a54]/60 truncate font-winter-solid'>{cat.description}</p>
                      )}
                    </div>
                  </div>
                  <div className='flex items-center gap-1 shrink-0'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => openEdit(cat)}
                      className='text-[#455a54] hover:bg-[#9d684e]/10'
                    >
                      <Edit2 className='h-4 w-4' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleDelete(cat)}
                      disabled={deletingId === cat.id}
                      className='text-red-600 hover:bg-red-50 disabled:opacity-50'
                    >
                      {deletingId === cat.id ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <Trash2 className='h-4 w-4' />
                      )}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-w-md border-[#9d684e]/20'>
          <DialogHeader>
            <DialogTitle className='text-[#455a54] font-tan-nimbus'>
              {editing ? 'Editar categoría' : 'Nueva categoría'}
            </DialogTitle>
            <DialogDescription className='text-[#455a54]/70 font-winter-solid'>
              {editing
                ? 'Si renombrás, los productos asociados se actualizan automáticamente.'
                : 'Va a aparecer disponible en el formulario de productos.'}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3'>
            <div className='space-y-1.5'>
              <Label className='text-xs text-[#455a54] font-winter-solid'>Nombre *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder='Ej: Wellness'
                className='h-9 border-[#9d684e]/20'
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-xs text-[#455a54] font-winter-solid'>Descripción</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder='Opcional'
                className='h-9 border-[#9d684e]/20'
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-xs text-[#455a54] font-winter-solid'>Color (hex)</Label>
              <div className='flex gap-2 items-center'>
                <Input
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  placeholder='#9d684e'
                  className='h-9 border-[#9d684e]/20 flex-1'
                />
                {form.color && (
                  <span
                    className='inline-block w-8 h-8 rounded-md border border-[#9d684e]/20'
                    style={{ backgroundColor: form.color }}
                  />
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setOpen(false)}
              disabled={submitting}
              className='border-[#9d684e]/30 text-[#455a54]'
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className='bg-[#9d684e] hover:bg-[#9d684e]/90 text-white'
            >
              {submitting ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
