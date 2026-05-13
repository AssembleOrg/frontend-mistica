import * as XLSX from 'xlsx';
import type { Product, ProductCategory, Category } from './types';
import { categoryConfig, statusConfig } from './config';

// =====================================================================
// Excel ↔ Producto: formato pensado para round-trip (export y re-import).
// =====================================================================
//
// Reglas:
// - El barcode es la clave de match (no se cambia en el flow de import).
// - Precios se exportan como NÚMEROS (no string formateado), así Excel los
//   muestra con su formato local pero al re-importar los parseamos directo.
// - Categoría / Unidad / Estado se exportan en valor "machine-readable"
//   (`organicos`, no `Orgánicos`), que es lo que entiende el backend. La
//   pestaña "Leyenda" muestra el listado humano para el operador.
// - Margen no se exporta porque es derivado (precio − costo) y al editarlo
//   manualmente quedaría desincronizado.

const HEADERS = {
  barcode: 'Código de Barras',
  name: 'Producto',
  category: 'Categoría',
  costPrice: 'Precio Costo',
  price: 'Precio Venta',
  stock: 'Stock',
  unitOfMeasure: 'Unidad',
  description: 'Descripción',
} as const;

type HeaderKey = keyof typeof HEADERS;

// Estos arrays son legacy. Category dejó de ser enum cerrado (free-text con
// CRUD en /dashboard/categories) y status se removió completo.
const VALID_UNITS: Product['unitOfMeasure'][] = ['litro', 'gramo', 'unidad'];

/**
 * Exporta productos a Excel. El archivo resultante sirve también como
 * **template para re-importar** (los headers y los valores son los mismos
 * que el parser espera).
 */
export function exportProductsToExcel(
  products: Product[],
  categories?: Category[],
  filename?: string,
): void {
  if (products.length === 0) {
    console.warn('No hay productos para exportar');
    return;
  }

  const rows = products.map((p) => ({
    [HEADERS.barcode]: p.barcode,
    [HEADERS.name]: p.name,
    [HEADERS.category]: p.category, // valor machine
    [HEADERS.costPrice]: Number(p.costPrice), // raw number
    [HEADERS.price]: Number(p.price),
    [HEADERS.stock]: Number(p.stock),
    [HEADERS.unitOfMeasure]: p.unitOfMeasure ?? '',
    [HEADERS.description]: p.description ?? '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Formato visual para Excel (los números siguen siendo números — solo es
  // la presentación al usuario).
  const fmt = '"$"#,##0.00';
  const numericColumns: HeaderKey[] = ['costPrice', 'price'];
  for (const col of numericColumns) {
    const colIndex = Object.keys(HEADERS).indexOf(col);
    for (let r = 1; r <= rows.length; r++) {
      const ref = XLSX.utils.encode_cell({ r, c: colIndex });
      if (ws[ref]) ws[ref].z = fmt;
    }
  }

  ws['!cols'] = [
    { wch: 16 }, // barcode
    { wch: 30 }, // name
    { wch: 14 }, // category
    { wch: 14 }, // costPrice
    { wch: 14 }, // price
    { wch: 8 },  // stock
    { wch: 10 }, // unit
    { wch: 12 }, // status
    { wch: 40 }, // description
  ];

  // Hoja "Leyenda" para que el usuario sepa qué valores son válidos.
  const categoryLegendRows = categories && categories.length > 0
    ? categories.map((c) => ({ Campo: 'Categoría', Valor: c.name, Significado: c.name }))
    : [
        { Campo: 'Categoría', Valor: 'organicos', Significado: categoryConfig.organicos?.label ?? 'Orgánicos' },
        { Campo: 'Categoría', Valor: 'aromaticos', Significado: categoryConfig.aromaticos?.label ?? 'Aromáticos' },
        { Campo: 'Categoría', Valor: 'wellness', Significado: categoryConfig.wellness?.label ?? 'Wellness' },
      ];
  const legendRows = [
    ...categoryLegendRows,
    { Campo: 'Unidad', Valor: 'litro', Significado: 'Litro' },
    { Campo: 'Unidad', Valor: 'gramo', Significado: 'Gramo' },
    { Campo: 'Unidad', Valor: 'unidad', Significado: 'Unidad' },
    { Campo: 'Estado', Valor: 'active', Significado: statusConfig.active?.label ?? 'Activo' },
    { Campo: 'Estado', Valor: 'inactive', Significado: statusConfig.inactive?.label ?? 'Inactivo' },
    { Campo: 'Estado', Valor: 'out_of_stock', Significado: statusConfig.out_of_stock?.label ?? 'Sin Stock' },
  ];
  const wsLegend = XLSX.utils.json_to_sheet(legendRows);
  wsLegend['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 24 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  XLSX.utils.book_append_sheet(wb, wsLegend, 'Leyenda');

  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, filename || `productos-mistica-${today}.xlsx`);
}

// =====================================================================
// Import: parseProductsExcel
// =====================================================================

export interface ParsedRow {
  /** Número de fila en la planilla (1-indexed, contando el header). */
  rowNumber: number;
  barcode: string;
  fields: Partial<{
    name: string;
    category: ProductCategory;
    price: number;
    costPrice: number;
    stock: number;
    unitOfMeasure: Product['unitOfMeasure'];
    description: string;
  }>;
}

export interface ParseError {
  rowNumber: number;
  barcode?: string;
  message: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: ParseError[];
}

function asString(v: unknown): string | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  return String(v).trim();
}

function asNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  const s = String(v).trim();
  // Detectar formato regional:
  // es-AR: 1.234,56 → miles=punto, decimal=coma
  // en-US: 1,234.56 → miles=coma, decimal=punto
  let cleaned: string;
  if (/\d\.\d{3}([,\s]|$)/.test(s)) {
    // Formato español: quitar puntos de miles, convertir coma a punto
    cleaned = s.replace(/\./g, '').replace(',', '.');
  } else {
    // Formato inglés o sin separadores de miles: quitar comas
    cleaned = s.replace(/,/g, '');
  }
  cleaned = cleaned.replace(/[^\d.-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Parsea un archivo Excel exportado y devuelve filas listas para `bulkUpdate`.
 * Empty cells = no se manda el campo (el backend mantiene el valor actual).
 */
export async function parseProductsExcel(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  // Buscamos primero la hoja "Productos"; si no, usamos la primera.
  const sheetName = wb.SheetNames.includes('Productos') ? 'Productos' : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    return {
      rows: [],
      errors: [{ rowNumber: 0, message: 'El archivo no contiene una hoja válida' }],
    };
  }

  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const rows: ParsedRow[] = [];
  const errors: ParseError[] = [];

  raw.forEach((r, i) => {
    const rowNumber = i + 2; // +1 por header, +1 porque 1-indexed

    const barcode = asString(r[HEADERS.barcode]);
    if (!barcode) {
      errors.push({ rowNumber, message: 'Falta el código de barras' });
      return;
    }

    const row: ParsedRow = { rowNumber, barcode, fields: {} };

    const name = asString(r[HEADERS.name]);
    if (name !== undefined) row.fields.name = name;

    const description = asString(r[HEADERS.description]);
    if (description !== undefined) row.fields.description = description;

    // Categoría: free-text. El backend acepta cualquier string; si querés
    // validar contra la lista actual lo hace /dashboard/categories. Acá sólo
    // chequeamos que no esté vacía.
    const category = asString(r[HEADERS.category]);
    if (category !== undefined && category.trim().length > 0) {
      row.fields.category = category.trim();
    }

    const unit = asString(r[HEADERS.unitOfMeasure])?.toLowerCase();
    if (unit !== undefined) {
      if (!VALID_UNITS.includes(unit as Product['unitOfMeasure'])) {
        errors.push({
          rowNumber,
          barcode,
          message: `Unidad inválida: "${unit}". Valores: ${VALID_UNITS.join(', ')}`,
        });
        return;
      }
      row.fields.unitOfMeasure = unit as Product['unitOfMeasure'];
    }

    const price = asNumber(r[HEADERS.price]);
    if (price !== undefined) {
      if (price < 0) {
        errors.push({ rowNumber, barcode, message: 'Precio venta no puede ser negativo' });
        return;
      }
      row.fields.price = price;
    }

    const costPrice = asNumber(r[HEADERS.costPrice]);
    if (costPrice !== undefined) {
      if (costPrice < 0) {
        errors.push({ rowNumber, barcode, message: 'Precio costo no puede ser negativo' });
        return;
      }
      row.fields.costPrice = costPrice;
    }

    const stock = asNumber(r[HEADERS.stock]);
    if (stock !== undefined) {
      if (stock < 0 || !Number.isInteger(stock)) {
        errors.push({ rowNumber, barcode, message: 'Stock debe ser un entero ≥ 0' });
        return;
      }
      row.fields.stock = stock;
    }

    // Si no se modifica ningún campo, igual la incluimos como "no-op". El
    // backend la deja pasar sin actualizar; es informativa para el preview.
    rows.push(row);
  });

  return { rows, errors };
}

// =====================================================================
// Resumen para el header de la página de productos
// =====================================================================

export function getExportSummary(products: Product[]): {
  total: number;
  categories: Record<string, number>;
  totalValue: number;
} {
  const summary = {
    total: products.length,
    categories: {} as Record<string, number>,
    totalValue: 0,
  };

  for (const p of products) {
    const label = p.category ? (categoryConfig[p.category]?.label ?? p.category) : 'Sin categoría';
    summary.categories[label] = (summary.categories[label] || 0) + 1;
    summary.totalValue += p.price * p.stock;
  }

  return summary;
}
