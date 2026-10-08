// Catálogo de piezas de Mística (listado de la clienta, 8/10/2026). Se carga
// desde "Gestionar catálogo de piezas" → "Cargar catálogo completo": crea o
// actualiza por nombre (sin mayúsculas ni tildes) y no borra nada.
//
// `amount` = upgrade sobre la pieza incluida en la entrada (la estándar).
// `addAmount` = precio si la pieza se SUMA además de la incluida.
// `material` = no es cerámica: la ficha no pide firma ni colores.

export interface CatalogCategory {
  name: string;
  amount: number;
  addAmount?: number;
  pair?: boolean;
  material?: string;
}

export const PIECE_CATEGORIES: CatalogCategory[] = [
  // Cerámica
  { name: 'Estándar', amount: 0, addAmount: 7000 },
  { name: 'Especial', amount: 4000, addAmount: 11000 },
  { name: 'Premium', amount: 7000, addAmount: 15000 },
  { name: 'Premium XL', amount: 15000, addAmount: 25000 },
  // Se eligen 2 piezas y se cargan los colores como si fuera una sola.
  { name: '2x1', amount: 0, addAmount: 7000, pair: true },
  // Otros materiales (se los llevan en el día)
  { name: 'Tela', amount: 0, material: 'Tela' },
  { name: 'Tela premium', amount: 7000, addAmount: 15000, material: 'Tela' },
  { name: 'Bastidor', amount: 0, material: 'Bastidor' },
  { name: 'Bastidor 30x40', amount: 7000, material: 'Bastidor' },
  { name: 'Bastidor 40x50', amount: 10000, material: 'Bastidor' },
  { name: 'Bastidor 60x50', amount: 13000, material: 'Bastidor' },
  { name: 'Fibrofácil', amount: 0, material: 'Fibrofácil' },
  { name: 'Fibrofácil especial', amount: 7000, material: 'Fibrofácil' },
  { name: 'Fibrofácil premium', amount: 12000, material: 'Fibrofácil' },
  { name: 'Yeso', amount: 0, material: 'Yeso' },
  { name: 'Yeso 2x1', amount: 0, material: 'Yeso' },
  { name: 'Yeso especial', amount: 4000, material: 'Yeso' },
  { name: 'Yeso premium', amount: 7000, material: 'Yeso' },
  { name: '3D', amount: 0, material: '3D' },
];

/** Materiales que no son cerámica (para elegir en la categoría). */
export const PIECE_MATERIALS = ['Tela', 'Bastidor', 'Fibrofácil', 'Yeso', '3D'];

const PIECES_BY_CATEGORY: Record<string, string[]> = {
  '2x1': [
    'Regador',
    'Adornos de navidad',
    'Portasahumerios redondos',
    'Portasahumerios fases lunares',
    'Mano de fátima',
    'Pocillos de café',
    'Mini corazón',
    'Mini bandejitas',
    'Porta espiral',
  ],
  Estándar: [
    'Taza selva',
    'Taza plumas',
    'Taza bombé',
    'Taza athenas',
    'Taza jarrito',
    'Taza cookie',
    'Taza agos',
    'Taza marti',
    'Cuenco bombé',
    'Cuenco corazón',
    'Lata',
    'Taza nd',
    'Taza ondulada',
    'Cactus',
    'Azucarera',
    'Mate con asa',
    'Saca perejil',
    'Bandejita pizza',
    'Bandejita ostra',
    'Bandejita ojo',
    'Bandejita tostada',
    'Bandejita estrella',
    'Bandejita corazón',
    'Mate asimétrico',
    'Porta cuchara',
    'Mini floreros',
    'Conejito pascua',
    'Erizo',
    'Mate mística',
    'Mate tradicional',
    'Cabeza de buda',
    'Cenicero',
    'Maceta',
    'Autito',
    'Mate facetado',
    'Cuenco hda',
    'Cuenco perezoso',
    'Cuenco gatito / pajarito',
    'Cuenco cerdito / perrito',
    'Jarrita de leche',
    'Colador',
    'Loro',
  ],
  Especial: [
    'Florero athenas',
    'Botella de leche',
    'Florero dona chico',
    'Florero oval',
    'Florero oval largo',
    'Azucarera grande',
    'Sifón',
    'Dinosaurio',
    'Gato de la fortuna',
    'Taza bocha',
    'Kitty',
    'Llama grande',
    'Taza panzona',
    'Paleta de pintura',
    'Taza caldero',
    'Erizo grande',
    'Taza esmaltada',
    'Tazón de campo',
  ],
  Premium: [
    'Combi',
    // En el listado "Maceta" figura en Estándar y en Premium: la premium va
    // con otro nombre para que no se pisen (renombrable desde el catálogo).
    'Maceta premium',
    'Fernetero',
    'Tazón XL',
    'Taza larga',
    'Koala',
    'Jarra pingüino',
    'Aceitero pingüino',
    'Alcancía conejo',
    'Florero acordeón',
    'Porta espiral XL',
    'Caracol',
    'Hipopótamo',
    'Florero acordeón XL',
    'Budinera',
    'Tartera',
    'Cuenco mediano alto',
    'Salchicha',
  ],
  'Premium XL': ['Florero XL', 'Alcancía cerdito', 'Argentina completa'],
};

/** Piezas con su categoría. Los materiales tienen una "pieza" por opción. */
export const PIECE_TYPES: Array<{ name: string; category: string }> = [
  ...Object.entries(PIECES_BY_CATEGORY).flatMap(([category, names]) =>
    names.map((name) => ({ name, category })),
  ),
  ...PIECE_CATEGORIES.filter((c) => c.material).map((c) => ({
    name: c.name,
    category: c.name,
  })),
];
