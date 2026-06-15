'use client';

import { useState } from 'react';
import { Pencil, Trash2, Check, X, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { showToast } from '@/lib/toast';
import { clientLabelsService, ClientLabel } from '@/services/client-labels.service';

const LABEL_COLORS = [
  { hex: '#3b82f6', name: 'Azul' },
  { hex: '#22c55e', name: 'Verde' },
  { hex: '#eab308', name: 'Amarillo' },
  { hex: '#ef4444', name: 'Rojo' },
  { hex: '#a855f7', name: 'Violeta' },
  { hex: '#f97316', name: 'Naranja' },
  { hex: '#ec4899', name: 'Rosa' },
];

interface ClientLabelsManagerProps {
  labels: ClientLabel[];
  onLabelsChange: (labels: ClientLabel[]) => void;
}

export function ClientLabelsManager({ labels, onLabelsChange }: ClientLabelsManagerProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New label form state
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<string>(LABEL_COLORS[0].hex);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<string>('');

  const refreshLabels = async () => {
    try {
      const updated = await clientLabelsService.getLabels();
      onLabelsChange(updated);
    } catch {
      // silently ignore — labels are non-critical
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      showToast.error('Error', 'El nombre de la etiqueta es requerido');
      return;
    }
    setIsSaving(true);
    try {
      await clientLabelsService.createLabel({ name, color: newColor });
      showToast.success('Etiqueta creada');
      setNewName('');
      setNewColor(LABEL_COLORS[0].hex);
      await refreshLabels();
    } catch (error) {
      const msg = (error as { message?: string }).message || 'Error al crear la etiqueta';
      showToast.error('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (label: ClientLabel) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color ?? LABEL_COLORS[0].hex);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
  };

  const handleUpdate = async (id: string) => {
    const name = editName.trim();
    if (!name) {
      showToast.error('Error', 'El nombre de la etiqueta es requerido');
      return;
    }
    setIsSaving(true);
    try {
      await clientLabelsService.updateLabel(id, { name, color: editColor });
      showToast.success('Etiqueta actualizada');
      cancelEdit();
      await refreshLabels();
    } catch (error) {
      const msg = (error as { message?: string }).message || 'Error al actualizar la etiqueta';
      showToast.error('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSaving(true);
    try {
      await clientLabelsService.deleteLabel(id);
      showToast.success('Etiqueta eliminada');
      await refreshLabels();
    } catch (error) {
      const msg = (error as { message?: string }).message || 'Error al eliminar la etiqueta';
      showToast.error('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant='outline'
          className='border-[#455a54]/30 text-[#455a54] hover:bg-[#455a54]/10 font-winter-solid w-full sm:w-auto'
        >
          <Tag className='h-4 w-4 mr-2' />
          Etiquetas
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='text-[#455a54] font-tan-nimbus'>Gestionar Etiquetas</DialogTitle>
        </DialogHeader>

        <div className='space-y-4 mt-2'>
          {/* Existing labels list */}
          {labels.length > 0 ? (
            <div className='space-y-2'>
              {labels.map((label) =>
                editingId === label.id ? (
                  <div key={label.id} className='flex flex-col gap-2 p-2 border border-[#9d684e]/20 rounded-lg'>
                    <div className='flex items-center gap-2'>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className='h-8 text-sm border-[#9d684e]/20 focus:border-[#9d684e]'
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate(label.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => handleUpdate(label.id)}
                        disabled={isSaving}
                        className='h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50'
                      >
                        <Check className='h-3.5 w-3.5' />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={cancelEdit}
                        className='h-8 w-8 p-0 text-[#455a54]/60 hover:text-[#455a54]'
                      >
                        <X className='h-3.5 w-3.5' />
                      </Button>
                    </div>
                    <ColorPicker value={editColor} onChange={setEditColor} />
                  </div>
                ) : (
                  <div
                    key={label.id}
                    className='flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[#efcbb9]/20 group'
                  >
                    <span
                      className='inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-winter-solid'
                      style={{
                        backgroundColor: label.color ? `${label.color}22` : '#455a5422',
                        color: label.color ?? '#455a54',
                      }}
                    >
                      <span
                        className='w-2 h-2 rounded-full flex-shrink-0'
                        style={{ backgroundColor: label.color ?? '#455a54' }}
                      />
                      {label.name}
                    </span>
                    <div className='flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity'>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => startEdit(label)}
                        className='h-7 w-7 p-0 text-[#455a54]/60 hover:text-[#9d684e] hover:bg-[#9d684e]/10'
                      >
                        <Pencil className='h-3 w-3' />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => handleDelete(label.id)}
                        disabled={isSaving}
                        className='h-7 w-7 p-0 text-[#455a54]/60 hover:text-red-600 hover:bg-red-50'
                      >
                        <Trash2 className='h-3 w-3' />
                      </Button>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <p className='text-sm text-[#455a54]/50 text-center py-2 font-winter-solid'>
              Todavía no hay etiquetas creadas.
            </p>
          )}

          {/* Divider */}
          <div className='border-t border-[#9d684e]/15' />

          {/* Create new label */}
          <div className='space-y-3'>
            <Label className='text-[#455a54] font-winter-solid text-sm'>Nueva etiqueta</Label>
            <div className='flex items-center gap-2'>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder='Nombre de la etiqueta'
                className='border-[#9d684e]/20 focus:border-[#9d684e] h-9 text-sm'
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
              />
              <Button
                onClick={handleCreate}
                disabled={isSaving || !newName.trim()}
                className='bg-[#9d684e] hover:bg-[#8a5a45] text-white font-winter-solid h-9 px-3 whitespace-nowrap'
              >
                Crear
              </Button>
            </div>
            <ColorPicker value={newColor} onChange={setNewColor} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  return (
    <div className='flex items-center gap-1.5'>
      {LABEL_COLORS.map((c) => (
        <button
          key={c.hex}
          type='button'
          title={c.name}
          onClick={() => onChange(c.hex)}
          className='w-6 h-6 rounded-full flex-shrink-0 transition-transform hover:scale-110'
          style={{
            backgroundColor: c.hex,
            outline: value === c.hex ? `2px solid ${c.hex}` : '2px solid transparent',
            outlineOffset: '2px',
          }}
        />
      ))}
    </div>
  );
}
