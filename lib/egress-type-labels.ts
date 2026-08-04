// lib/egress-type-labels.ts

/** Tipos de egreso soportados por el backend (enum fijo de `Egress.type`). */
export type EgressType = 'EXPENSE' | 'WITHDRAWAL' | 'REFUND' | 'TRANSFER' | 'OTHER';

/**
 * Única fuente de verdad de los tipos de egreso y sus etiquetas en español.
 * El orden es el que se usa en los selectores: primero el caso más común.
 */
export const EGRESS_TYPES: { value: EgressType; label: string }[] = [
  { value: 'EXPENSE', label: 'Gasto operativo' },
  { value: 'WITHDRAWAL', label: 'Retiro' },
  { value: 'REFUND', label: 'Devolución' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'OTHER', label: 'Otro' },
];

export const EGRESS_TYPE_LABEL = Object.fromEntries(
  EGRESS_TYPES.map((t) => [t.value, t.label]),
) as Record<EgressType, string>;

/**
 * Etiqueta legible de un tipo de egreso. Si el backend devuelve un valor que no
 * conocemos, se muestra crudo en vez de romper o mostrar vacío.
 */
export function egressTypeLabel(type: string): string {
  return EGRESS_TYPE_LABEL[type as EgressType] ?? type;
}
