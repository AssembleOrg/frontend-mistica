import * as XLSX from 'xlsx';
import type { Product, ProductCategory } from './types';
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
  status: 'Estado',
  description: 'Descripción',
} as const;

type HeaderKey = keyof typeof HEADERS;

const VALID_CATEGORIES: ProductCategory[] = ['organicos', 'aromaticos', 'wellness'];
const VALID_UNITS: Product['unitOfMeasure'][] = ['litro', 'gramo', 'unidad'];
const VALID_STATUSES: Product['status'][] = ['active', 'inactive', 'out_of_stock'];

/**
 * Exporta productos a Excel. El archivo resultante sirve también como
 * **template para re-importar** (los headers y los valores son los mismos
 * que el parser espera).
 */
export function exportProductsToExcel(products: Product[], filename?: string): void {
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
    [HEADERS.unitOfMeasure]: p.unitOfMeasure,
    [HEADERS.status]: p.status,
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
  const legendRows = [
    { Campo: 'Categoría', Valor: 'organicos', Significado: categoryConfig.organicos?.label ?? 'Orgánicos' },
    { Campo: 'Categoría', Valor: 'aromaticos', Significado: categoryConfig.aromaticos?.label ?? 'Aromáticos' },
    { Campo: 'Categoría', Valor: 'wellness', Significado: categoryConfig.wellness?.label ?? 'Wellness' },
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
    status: Product['status'];
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
  // Excel a veces manda strings con coma decimal o $; intentamos limpiar.
  const cleaned = String(v).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(cleaned);
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

    const category = asString(r[HEADERS.category])?.toLowerCase();
    if (category !== undefined) {
      if (!VALID_CATEGORIES.includes(category as ProductCategory)) {
        errors.push({
          rowNumber,
          barcode,
          message: `Categoría inválida: "${category}". Valores: ${VALID_CATEGORIES.join(', ')}`,
        });
        return;
      }
      row.fields.category = category as ProductCategory;
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

    const status = asString(r[HEADERS.status])?.toLowerCase();
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status as Product['status'])) {
        errors.push({
          rowNumber,
          barcode,
          message: `Estado inválido: "${status}". Valores: ${VALID_STATUSES.join(', ')}`,
        });
        return;
      }
      row.fields.status = status as Product['status'];
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
    const label = categoryConfig[p.category]?.label || p.category;
    summary.categories[label] = (summary.categories[label] || 0) + 1;
    summary.totalValue += p.price * p.stock;
  }

  return summary;
}
