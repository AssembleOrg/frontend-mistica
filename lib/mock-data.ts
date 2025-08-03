import { Product, CategoryConfig, StatusConfig } from './types';
import { generateMisticaBarcode } from './barcode-utils';

export const categoryConfig: CategoryConfig = {
  organicos: {
    label: 'Orgánicos',
    color: '#455a54',
    bgColor: '#455a54/10',
  },
  aromaticos: {
    label: 'Aromáticos',
    color: '#e0a38d',
    bgColor: '#e0a38d/10',
  },
  wellness: {
    label: 'Wellness',
    color: '#4e4247',
    bgColor: '#4e4247/10',
  },
};

export const statusConfig: StatusConfig = {
  active: {
    label: 'Activo',
    color: '#10b981',
    bgColor: '#10b981/10',
  },
  inactive: {
    label: 'Inactivo',
    color: '#6b7280',
    bgColor: '#6b7280/10',
  },
  out_of_stock: {
    label: 'Sin Stock',
    color: '#ef4444',
    bgColor: '#ef4444/10',
  },
};

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Aceite Esencial de Lavanda',
    barcode: generateMisticaBarcode(1),
    category: 'aromaticos',
    price: 25.99,
    costPrice: 18.50,
    stock: 15,
    unitOfMeasure: 'litro',
    image: '/products/lavanda.jpg',
    description:
      'Aceite esencial puro de lavanda francesa, ideal para relajación y aromaterapia.',
    status: 'active',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '3',
    name: 'Té Orgánico de Manzanilla',
    barcode: generateMisticaBarcode(3),
    category: 'organicos',
    price: 12.75,
    costPrice: 8.50,
    stock: 32,
    unitOfMeasure: 'gramo',
    image: '/products/te-manzanilla.jpg',
    description:
      'Té orgánico de manzanilla, cultivado sin pesticidas para una experiencia pura.',
    status: 'active',
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-18'),
  },
  {
    id: '4',
    name: 'Kit de Meditación Completo',
    barcode: generateMisticaBarcode(4),
    category: 'wellness',
    price: 89.99,
    costPrice: 55.00,
    stock: 5,
    unitOfMeasure: 'gramo',
    image: '/products/kit-meditacion.jpg',
    description:
      'Kit completo con cojín, incienso y guía de meditación.',
    status: 'active',
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-22'),
  },
  {
    id: '6',
    name: 'Incienso de Sándalo Premium',
    barcode: generateMisticaBarcode(6),
    category: 'aromaticos',
    price: 16.25,
    costPrice: 9.75,
    stock: 28,
    unitOfMeasure: 'gramo',
    image: '/products/incienso-sandalo.jpg',
    description:
      'Incienso premium de sándalo genuino de la India, para rituales y meditación.',
    status: 'active',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-13'),
  },
  {
    id: '7',
    name: 'Miel de Manuka Orgánica',
    barcode: generateMisticaBarcode(7),
    category: 'organicos',
    price: 32.5,
    costPrice: 22.00,
    stock: 0,
    unitOfMeasure: 'litro',
    image: '/products/miel-manuka.jpg',
    description:
      'Miel de Manuka pura de Nueva Zelanda con propiedades medicinales únicas.',
    status: 'out_of_stock',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-30'),
  },
  {
    id: '8',
    name: 'Velas Aromáticas de Soja',
    barcode: generateMisticaBarcode(8),
    category: 'aromaticos',
    price: 22.99,
    costPrice: 14.50,
    stock: 18,
    unitOfMeasure: 'gramo',
    image: '/products/velas-soja.jpg',
    description:
      'Set de 3 velas aromáticas de cera de soja con esencias naturales.',
    status: 'active',
    createdAt: new Date('2023-12-28'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: '10',
    name: 'Sesión de Reiki Virtual',
    barcode: generateMisticaBarcode(10),
    category: 'wellness',
    price: 65.0,
    costPrice: 35.00,
    stock: 0,
    unitOfMeasure: 'gramo',
    image: '/products/reiki-session.jpg',
    description:
      'Sesión personalizada de Reiki a distancia con maestro certificado.',
    status: 'inactive',
    createdAt: new Date('2023-12-20'),
    updatedAt: new Date('2024-01-28'),
  },
  {
    id: '11',
    name: 'Aceite de Coco Virgen Extra',
    barcode: generateMisticaBarcode(11),
    category: 'organicos',
    price: 15.5,
    costPrice: 9.25,
    stock: 24,
    unitOfMeasure: 'litro',
    image: '/products/aceite-coco.jpg',
    description:
      'Aceite de coco virgen extra prensado en frío, multiuso para belleza y cocina.',
    status: 'active',
    createdAt: new Date('2023-12-18'),
    updatedAt: new Date('2024-01-08'),
  },
  {
    id: '12',
    name: 'Difusor Ultrasónico Premium',
    barcode: generateMisticaBarcode(12),
    category: 'aromaticos',
    price: 52.99,
    costPrice: 32.00,
    stock: 7,
    unitOfMeasure: 'gramo',
    image: '/products/difusor.jpg',
    description:
      'Difusor ultrasónico con luces LED y temporizador para aceites esenciales.',
    status: 'active',
    createdAt: new Date('2023-12-15'),
    updatedAt: new Date('2024-01-02'),
  },
  {
    id: '14',
    name: 'Cúrcuma en Polvo Orgánica',
    barcode: generateMisticaBarcode(14),
    category: 'organicos',
    price: 9.99,
    costPrice: 6.50,
    stock: 45,
    unitOfMeasure: 'gramo',
    image: '/products/curcuma.jpg',
    description:
      'Cúrcuma orgánica en polvo, rica en curcumina con propiedades antiinflamatorias.',
    status: 'active',
    createdAt: new Date('2023-12-10'),
    updatedAt: new Date('2023-12-28'),
  },
  {
    id: '15',
    name: 'Curso Online de Tarot',
    barcode: generateMisticaBarcode(15),
    category: 'wellness',
    price: 125.0,
    costPrice: 75.00,
    stock: 999,
    unitOfMeasure: 'gramo',
    image: '/products/curso-tarot.jpg',
    description:
      'Curso completo de tarot para principiantes con certificación incluida.',
    status: 'active',
    createdAt: new Date('2023-12-05'),
    updatedAt: new Date('2023-12-25'),
  },
];

// Función para obtener productos por categoría
export function getProductsByCategory(
  category: Product['category']
): Product[] {
  return mockProducts.filter((product) => product.category === category);
}

// Función para obtener productos con stock bajo
export function getLowStockProducts(threshold: number = 10): Product[] {
  return mockProducts.filter(
    (product) => product.stock <= threshold && product.stock > 0
  );
}

// Función para obtener estadísticas
export function getProductStats() {
  const total = mockProducts.length;
  const active = mockProducts.filter((p) => p.status === 'active').length;
  const outOfStock = mockProducts.filter(
    (p) => p.status === 'out_of_stock'
  ).length;
  const lowStock = getLowStockProducts().length;

  return {
    total,
    active,
    outOfStock,
    lowStock,
  };
}
