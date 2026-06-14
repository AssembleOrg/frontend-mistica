'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit, Check, X } from 'lucide-react';
import { ClientNote, NOTE_COLORS, NOTE_COLOR_KEYS, NoteColor, formatNoteDate } from '@/lib/client-notes';

interface ClientNotesManagerProps {
  notes: ClientNote[];
  onChange: (notes: ClientNote[]) => void;
}

const EMPTY_FORM = { title: '', color: 'blue' as NoteColor, date: '' };

export function ClientNotesManager({ notes, onChange }: ClientNotesManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [titleError, setTitleError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: today });
    setTitleError('');
    setShowForm(true);
  };

  const openEdit = (note: ClientNote) => {
    setEditingId(note.id);
    setForm({ title: note.title, color: note.color, date: note.date });
    setTitleError('');
    setShowForm(true);
  };

  const cancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setTitleError('');
  };

  const save = () => {
    if (!form.title.trim()) {
      setTitleError('El título es requerido');
      return;
    }

    if (editingId) {
      onChange(notes.map((n) => n.id === editingId ? { ...n, ...form, title: form.title.trim() } : n));
    } else {
      const newNote: ClientNote = {
        id: crypto.randomUUID(),
        title: form.title.trim(),
        color: form.color,
        date: form.date,
      };
      onChange([...notes, newNote]);
    }

    cancel();
  };

  const remove = (id: string) => {
    onChange(notes.filter((n) => n.id !== id));
    if (editingId === id) cancel();
  };

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <Label className='text-[#455a54] font-winter-solid'>Etiquetas</Label>
        {!showForm && notes.length === 0 && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={openCreate}
            className='h-7 text-xs gap-1 border-[#9d684e] text-[#9d684e] hover:bg-[#9d684e] hover:text-white'
          >
            <Plus className='h-3 w-3' />
            Agregar
          </Button>
        )}
      </div>

      {/* Lista de notas existentes */}
      {notes.length > 0 && (
        <div className='space-y-1.5'>
          {notes.map((note) => {
            const colors = NOTE_COLORS[note.color] ?? NOTE_COLORS.blue;
            return (
              <div
                key={note.id}
                className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${colors.bg}`}
              >
                <div className='flex items-center gap-2 min-w-0'>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                  <span className={`text-sm font-winter-solid truncate ${colors.text}`}>{note.title}</span>
                  {note.date && (
                    <span className={`text-[11px] tabular-nums flex-shrink-0 ${colors.text} opacity-70`}>
                      {formatNoteDate(note.date)}
                    </span>
                  )}
                </div>
                <div className='flex items-center gap-0.5 flex-shrink-0'>
                  <button
                    type='button'
                    onClick={() => openEdit(note)}
                    className={`p-1 rounded hover:bg-black/10 ${colors.text} transition-colors`}
                  >
                    <Edit className='h-3 w-3' />
                  </button>
                  <button
                    type='button'
                    onClick={() => remove(note.id)}
                    className='p-1 rounded hover:bg-red-100 text-red-500 transition-colors'
                  >
                    <Trash2 className='h-3 w-3' />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {notes.length === 0 && !showForm && (
        <p className='text-xs text-[#455a54]/40 font-winter-solid text-center py-2'>
          Sin etiquetas. Usá &quot;Agregar&quot; para crear la primera.
        </p>
      )}

      {/* Formulario inline */}
      {showForm && (
        <div className='border border-[#9d684e]/20 rounded-lg p-3 space-y-3 bg-[#efcbb9]/10'>
          <div className='space-y-1'>
            <Label className='text-[#455a54] font-winter-solid text-xs'>Título *</Label>
            <Input
              value={form.title}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, title: e.target.value.slice(0, 60) }));
                if (titleError) setTitleError('');
              }}
              placeholder='Ej: Llamó para consultar'
              className={`h-8 text-sm border-[#9d684e]/20 focus:border-[#9d684e] ${titleError ? 'border-red-500' : ''}`}
              autoFocus
            />
            {titleError && <p className='text-xs text-red-500'>{titleError}</p>}
          </div>

          <div className='space-y-1'>
            <Label className='text-[#455a54] font-winter-solid text-xs'>Fecha</Label>
            <input
              type='date'
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              className='w-full h-8 rounded-md border border-[#9d684e]/20 bg-background px-3 text-sm focus:outline-none focus:border-[#9d684e] focus:ring-1 focus:ring-[#9d684e]/20'
            />
          </div>

          <div className='space-y-1'>
            <Label className='text-[#455a54] font-winter-solid text-xs'>Color</Label>
            <div className='flex gap-2 flex-wrap'>
              {NOTE_COLOR_KEYS.map((color) => (
                <button
                  key={color}
                  type='button'
                  onClick={() => setForm((prev) => ({ ...prev, color }))}
                  className={`w-6 h-6 rounded-full transition-all ${NOTE_COLORS[color].dot} ${
                    form.color === color ? 'ring-2 ring-offset-2 ring-[#455a54]' : 'opacity-60 hover:opacity-100'
                  }`}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div className='flex gap-2 pt-1'>
            <Button
              type='button'
              size='sm'
              onClick={save}
              className='h-7 text-xs gap-1 bg-[#9d684e] hover:bg-[#9d684e]/90 text-white'
            >
              <Check className='h-3 w-3' />
              {editingId ? 'Actualizar' : 'Guardar'}
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={cancel}
              className='h-7 text-xs gap-1 text-[#455a54]/60'
            >
              <X className='h-3 w-3' />
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
