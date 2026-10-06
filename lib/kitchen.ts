// Cocina: qué experiencias llevan buffet y qué tortas hay que preparar.

type ExperienceLike = {
  name: string;
  description?: string;
  hasBuffet?: boolean;
};

/** Sin marcar en la experiencia, se deduce del nombre y la descripción. */
const LOOKS_LIKE_FOOD = /buffet|brunch|merienda|degustaci|desayuno/i;

/** ¿La experiencia incluye buffet/merienda? (cuenta para Cocina). */
export function experienceHasBuffet(exp: ExperienceLike): boolean {
  return exp.hasBuffet ?? LOOKS_LIKE_FOOD.test(`${exp.name} ${exp.description ?? ''}`);
}

/** Los cumpleaños de 10 o más llevan la torta simbólica de regalo. */
export const FREE_CAKE_MIN_PEOPLE = 10;

export const SYMBOLIC_CAKE_LABEL = 'Torta simbólica';
