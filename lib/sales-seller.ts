const SELLER_PREFIX_REGEX = /^\[Vendedor: (.+?)\]\r?\n?/;
const NOTES_MAX_LENGTH = 500;

export function encodeNotesWithSeller(
  notes: string,
  seller: string,
): string | undefined {
  const trimmedNotes = (notes ?? '').trim();
  const trimmedSeller = (seller ?? '').trim();

  if (!trimmedSeller && !trimmedNotes) return undefined;
  if (!trimmedSeller) return trimmedNotes;

  const safeSeller = trimmedSeller.replace(/\]/g, ')').replace(/[\r\n]/g, ' ');
  const prefix = `[Vendedor: ${safeSeller}]`;

  const combined = trimmedNotes ? `${prefix}\n${trimmedNotes}` : prefix;
  if (combined.length <= NOTES_MAX_LENGTH) return combined;

  if (!trimmedNotes) return prefix.slice(0, NOTES_MAX_LENGTH);
  const remaining = NOTES_MAX_LENGTH - prefix.length - 1;
  if (remaining <= 0) return prefix.slice(0, NOTES_MAX_LENGTH);
  return `${prefix}\n${trimmedNotes.slice(0, remaining)}`;
}

export function parseNotesAndSeller(
  raw: string | null | undefined,
): { seller: string; notes: string } {
  if (!raw) return { seller: '', notes: '' };

  const match = raw.match(SELLER_PREFIX_REGEX);
  if (!match) return { seller: '', notes: raw };

  const seller = match[1].trim();
  const notes = raw.slice(match[0].length);
  return { seller, notes };
}
