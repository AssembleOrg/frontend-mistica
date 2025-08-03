import * as XLSX from 'xlsx';
import { Product } from './types';
import { categoryConfig, statusConfig } from './mock-data';
import { calculateProfitMargin } from './barcode-utils';

/**
 * Exporta productos filtrados a Excel
 * @param products - Array de productos a exportar
 * @param filename - Nombre del archivo (opcional)
 */
export function exportProductsToExcel(products: Product[], filename?: string): void {
  if (products.length === 0) {
    console.warn('No hay productos para exportar');
    return;
  }

  // Mapear unidades de medida a etiquetas cortas
  const unitLabels = {
    gramo: 'g',
    litro: 'L'
  };

  // Transformar datos para Excel con headers en español
  const exportData = products.map(product => ({
    'Código de Barras': product.barcode,
    'Producto': product.name,
    'Categoría': categoryConfig[product.category]?.label || product.category,
    'Precio Costo (ARS)': product.costPrice,
    'Precio Venta (ARS)': product.price,
    'Margen (%)': calculateProfitMargin(product.price, product.costPrice).toFixed(1),
    'Stock': product.stock,
    'Unidad de Medida': unitLabels[product.unitOfMeasure] || product.unitOfMeasure,
    'Estado': statusConfig[product.status]?.label || product.status,
    'Descripción': product.description || ''
  }));

  // Crear worksheet
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Configurar ancho de columnas
  const colWidths = [
    { wch: 15 }, // Código de Barras
    { wch: 30 }, // Producto
    { wch: 12 }, // Categoría
    { wch: 15 }, // Precio Costo
    { wch: 15 }, // Precio Venta
    { wch: 10 }, // Margen
    { wch: 8 },  // Stock
    { wch: 12 }, // Unidad
    { wch: 10 }, // Estado
    { wch: 40 }  // Descripción
  ];
  ws['!cols'] = colWidths;

  // Crear workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');

  // Generar nombre de archivo
  const today = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `productos-mistica-${today}.xlsx`;

  // Descargar archivo
  XLSX.writeFile(wb, finalFilename);
}

/**
 * Obtiene información resumida de los productos para mostrar en la UI
 * @param products - Array de productos
 */
export function getExportSummary(products: Product[]): {
  total: number;
  categories: Record<string, number>;
  totalValue: number;
} {
  const summary = {
    total: products.length,
    categories: {} as Record<string, number>,
    totalValue: 0
  };

  products.forEach(product => {
    // Contar por categoría
    const categoryLabel = categoryConfig[product.category]?.label || product.category;
    summary.categories[categoryLabel] = (summary.categories[categoryLabel] || 0) + 1;

    // Calcular valor total de inventario
    summary.totalValue += product.price * product.stock;
  });

  return summary;
}