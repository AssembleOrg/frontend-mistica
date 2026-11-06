// Cocina: qué come cada reserva (buffet libre, merienda o nada) y qué tortas
// hay que preparar.

/**
 * Buffet libre (se arma para todos), merienda (porción servida en la mesa) o
 * nada. Lo define la experiencia; una reserva lo puede cambiar.
 */
export type FoodKind = 'BUFFET' | 'MERIENDA' | 'NONE';

export const FOOD_OPTIONS: { value: FoodKind; label: string }[] = [
  { value: 'BUFFET', label: 'Buffet libre' },
  { value: 'MERIENDA', label: 'Merienda' },
  { value: 'NONE', label: 'Sin comida' },
];

export const FOOD_LABEL: Record<FoodKind, string> = {
  BUFFET: 'Buffet libre',
  MERIENDA: 'Merienda',
  NONE: 'Sin comida',
};

type ExperienceLike = {
  name: string;
  description?: string;
  food?: FoodKind;
  /** Viejo: «incluye buffet o merienda», de antes de separarlos. */
  hasBuffet?: boolean;
};

const LOOKS_LIKE_BUFFET = /buffet|brunch|degustaci|desayuno/i;
const LOOKS_LIKE_MERIENDA = /merienda/i;

/**
 * Qué come la gente de una experiencia. Sin elegir, usa el tilde viejo y si
 * tampoco está, lo deduce del nombre (igual que el backend, common/food.ts).
 */
export function experienceFood(exp: ExperienceLike): FoodKind {
  if (exp.food) return exp.food;
  if (exp.hasBuffet === false) return 'NONE';
  const text = `${exp.name} ${exp.description ?? ''}`;
  const guess: FoodKind | undefined = LOOKS_LIKE_BUFFET.test(text)
    ? 'BUFFET'
    : LOOKS_LIKE_MERIENDA.test(text)
      ? 'MERIENDA'
      : undefined;
  if (exp.hasBuffet === true) return guess ?? 'BUFFET';
  return guess ?? 'NONE';
}

/** Los cumpleaños de 10 o más llevan la torta simbólica de regalo. */
export const FREE_CAKE_MIN_PEOPLE = 10;

export const SYMBOLIC_CAKE_LABEL = 'Torta simbólica';

/**
 * Tortas del catálogo (productos, por código de barras): cómo las ve cocina y
 * si llevan color de cobertura y sabor. El precio es el del producto.
 */
export const CAKE_PRODUCTS = [
  { barcode: 'MST8285257705', kitchenLabel: SYMBOLIC_CAKE_LABEL, withFlavor: false },
  { barcode: 'MST9103971513', kitchenLabel: 'Torta 12 cm', withFlavor: true },
  { barcode: 'MST8710137672', kitchenLabel: 'Torta 12 cm (upgrade)', withFlavor: true },
] as const;

export type CakeProduct = (typeof CAKE_PRODUCTS)[number];

export const cakeProductOf = (barcode?: string): CakeProduct | undefined =>
  CAKE_PRODUCTS.find((c) => c.barcode === barcode);
