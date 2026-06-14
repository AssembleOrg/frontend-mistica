export type NoteColor = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange' | 'pink';

export interface ClientNote {
  id: string;
  title: string;
  color: NoteColor;
  date: string; // YYYY-MM-DD
}

export const NOTE_COLORS: Record<NoteColor, { bg: string; text: string; dot: string }> = {
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-400' },
  green:  { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-400' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  red:    { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-400' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-400' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400' },
  pink:   { bg: 'bg-pink-100',   text: 'text-pink-700',   dot: 'bg-pink-400' },
};

export const NOTE_COLOR_KEYS = Object.keys(NOTE_COLORS) as NoteColor[];

export function parseNotes(notes?: string): ClientNote[] {
  if (!notes) return [];
  try {
    const parsed = JSON.parse(notes);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is ClientNote =>
        typeof n === 'object' &&
        typeof n.id === 'string' &&
        typeof n.title === 'string' &&
        typeof n.color === 'string' &&
        typeof n.date === 'string'
    );
  } catch {
    return [];
  }
}

export function serializeNotes(notes: ClientNote[]): string {
  return JSON.stringify(notes);
}

export function formatNoteDate(date: string): string {
  if (!date) return '';
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}
