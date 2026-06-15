'use client';

import { Plus } from 'lucide-react';
import { ClientNote, NOTE_COLORS } from '@/lib/client-notes';

interface ClientNoteChipsProps {
  notes: ClientNote[];
  onManage?: () => void;
  maxVisible?: number;
}

export function ClientNoteChips({ notes, onManage, maxVisible = 2 }: ClientNoteChipsProps) {
  const visible = notes.slice(0, maxVisible);
  const overflow = notes.length - maxVisible;

  if (notes.length === 0) {
    if (!onManage) return <span className='text-[11px] text-[#455a54]/30'>—</span>;
    return (
      <button
        type='button'
        onClick={onManage}
        className='inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-[#455a54]/40 border border-dashed border-[#455a54]/20 hover:border-[#9d684e]/50 hover:text-[#9d684e] transition-colors'
      >
        <Plus className='h-2.5 w-2.5' />
        Agregar
      </button>
    );
  }

  return (
    <div
      className='flex flex-wrap items-center gap-1'
      onClick={onManage}
      role={onManage ? 'button' : undefined}
      tabIndex={onManage ? 0 : undefined}
      onKeyDown={onManage ? (e) => e.key === 'Enter' && onManage() : undefined}
      style={{ cursor: onManage ? 'pointer' : 'default' }}
    >
      {visible.map((note) => {
        const colors = NOTE_COLORS[note.color] ?? NOTE_COLORS.blue;
        return (
          <span
            key={note.id}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-winter-solid ${colors.bg} ${colors.text}`}
            title={note.title}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} flex-shrink-0`} />
            <span className='max-w-[80px] truncate'>{note.title}</span>
          </span>
        );
      })}
      {overflow > 0 && (
        <span className='inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-winter-solid bg-[#455a54]/10 text-[#455a54]/60'>
          +{overflow}
        </span>
      )}
    </div>
  );
}
