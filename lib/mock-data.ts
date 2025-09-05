import { Product, Sale, CategoryConfig, StatusConfig, Employee } from './types';
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
    barcode: generateMisticaBarcode(),
    category: 'aromaticos',
    price: 32500,
    costPrice: 18500,
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
    barcode: generateMisticaBarcode(),
    category: 'organicos',
    price: 18500,
    costPrice: 8500,
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
    barcode: generateMisticaBarcode(),
    category: 'wellness',
    price: 89500,
    costPrice: 55000,
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
    barcode: generateMisticaBarcode(),
    category: 'aromaticos',
    price: 8500,
    costPrice: 4500,
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
    barcode: generateMisticaBarcode(),
    category: 'organicos',
    price: 45000,
    costPrice: 28000,
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
    barcode: generateMisticaBarcode(),
    category: 'aromaticos',
    price: 15500,
    costPrice: 9500,
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
    barcode: generateMisticaBarcode(),
    category: 'wellness',
    price: 65000,
    costPrice: 35000,
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
    barcode: generateMisticaBarcode(),
    category: 'organicos',
    price: 25000,
    costPrice: 15500,
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
    barcode: generateMisticaBarcode(),
    category: 'aromaticos',
    price: 52500,
    costPrice: 32000,
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
    barcode: generateMisticaBarcode(),
    category: 'organicos',
    price: 12500,
    costPrice: 7500,
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
    barcode: generateMisticaBarcode(),
    category: 'wellness',
    price: 125000,
    costPrice: 75000,
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

// Mock sales data for development
export const mockSales: Sale[] = [
  {
    id: 'sale-1',
    saleNumber: 'SALE-001',
    customerName: 'Cliente Ejemplo',
    cashierId: 'cashier-1',
    items: [
      {
        id: 'item-1',
        productId: '1',
        productName: mockProducts[0].name,
        product: mockProducts[0],
        quantity: 2,
        unitPrice: mockProducts[0].price,
        subtotal: mockProducts[0].price * 2,
      },
      {
        id: 'item-2', 
        productId: '2',
        productName: mockProducts[1].name,
        product: mockProducts[1],
        quantity: 1,
        unitPrice: mockProducts[1].price,
        subtotal: mockProducts[1].price,
      }
    ],
    subtotal: mockProducts[0].price * 2 + mockProducts[1].price,
    discount: 0,
    tax: (mockProducts[0].price * 2 + mockProducts[1].price) * 0.21,
    total: (mockProducts[0].price * 2 + mockProducts[1].price) * 1.21,
    paymentMethod: 'CASH',
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sale-2',
    saleNumber: 'SALE-002',
    customerName: 'Cliente Dos',
    cashierId: 'cashier-1',
    items: [
      {
        id: 'item-3',
        productId: '3',
        productName: mockProducts[2].name,
        product: mockProducts[2],
        quantity: 1,
        unitPrice: mockProducts[2].price,
        subtotal: mockProducts[2].price,
      }
    ],
    subtotal: mockProducts[2].price,
    discount: 0,
    tax: mockProducts[2].price * 0.21,
    total: mockProducts[2].price * 1.21,
    paymentMethod: 'CARD',
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  }
];

export const mockEmployees: Employee[] = [
  {
    id: 'emp-1',
    name: 'Carlos Rodríguez',
    email: 'gerente@mistica.com',
    role: 'gerente',
    phone: '+54 11 2345-6789',
    address: 'San Martín 567, Vicente López',
    startDate: new Date('2023-03-20'),
    createdAt: new Date('2023-03-20'),
    updatedAt: new Date('2024-12-10')
  },
  {
    id: 'emp-2',
    name: 'Ana López',
    email: 'cajero@mistica.com',
    role: 'cajero',
    phone: '+54 11 8765-4321',
    address: 'Belgrano 890, San Isidro',
    startDate: new Date('2023-06-10'),
    createdAt: new Date('2023-06-10'),
    updatedAt: new Date('2024-12-01')
  }
];
