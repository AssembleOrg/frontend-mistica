// Paleta de colores de experiencia para la agenda. Mantener en sync con
// mistica-backend/scripts/backfill-experience-colors.js.

export const DEFAULT_EXPERIENCE_COLOR = '#9d684e';

export const EXPERIENCE_COLOR_PALETTE: { hex: string; label: string }[] = [
  { hex: '#9d684e', label: 'Terracota' },
  { hex: '#455a54', label: 'Verde Mística' },
  { hex: '#cc844a', label: 'Ocre' },
  { hex: '#7a8c5c', label: 'Oliva' },
  { hex: '#4a7a8c', label: 'Petróleo' },
  { hex: '#8c6f9d', label: 'Lavanda' },
  { hex: '#c47a6d', label: 'Arcilla rosada' },
  { hex: '#c2a24b', label: 'Mostaza' },
];

export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
