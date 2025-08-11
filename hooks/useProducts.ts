/**
 * Simple Products Hook - KISS MVP
 */

import { useCallback } from 'react';
import { useAppStore } from '@/stores/app.store';
import { Product } from '@/lib/types';
import { generateBarcode } from '@/lib/barcode-utils';

interface ProductCreationData {
  name: string;
  category: Product['category'];
  price: number;
  costPrice: number;
  stock: number;
  unitOfMeasure: Product['unitOfMeasure'];
  description: string;
  image?: string;
}

export function useProducts() {
  const { 
    products, 
    addProduct, 
    updateProduct, 
    deleteProduct,
    getLowStockProducts 
  } = useAppStore();

  const createProduct = useCallback((data: ProductCreationData) => {
    // Simple validation
    if (!data.name.trim()) throw new Error('El nombre del producto es requerido');
    if (data.price <= 0) throw new Error('El precio debe ser mayor a 0');
    if (data.costPrice <= 0) throw new Error('El precio de costo debe ser mayor a 0');
    if (data.costPrice >= data.price) throw new Error('El precio de costo debe ser menor al precio de venta');

    // Check for duplicate names
    const existingProduct = products.find(p => p.name.toLowerCase() === data.name.toLowerCase());
    if (existingProduct) throw new Error('Ya existe un producto con este nombre');

    const newProduct: Product = {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      category: data.category,
      price: data.price,
      costPrice: data.costPrice,
      stock: data.stock,
      unitOfMeasure: data.unitOfMeasure,
      description: data.description.trim(),
      image: data.image || '',
      barcode: generateBarcode(),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    addProduct(newProduct);
    return newProduct;
  }, [products, addProduct]);

  const searchProducts = useCallback((query: string) => {
    if (!query.trim()) return products;
    
    const searchTerm = query.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm) ||
      product.description.toLowerCase().includes(searchTerm) ||
      product.barcode.includes(searchTerm)
    );
  }, [products]);

  const getProductById = useCallback((id: string) => {
    return products.find(p => p.id === id);
  }, [products]);

  const getProductByBarcode = useCallback((barcode: string) => {
    return products.find(p => p.barcode === barcode);
  }, [products]);

  const stats = {
    total: products.length,
    active: products.filter(p => p.status === 'active').length,
    inactive: products.filter(p => p.status === 'inactive').length,
    outOfStock: products.filter(p => p.stock === 0).length,
    lowStock: getLowStockProducts().length,
    averagePrice: products.reduce((acc, p) => acc + p.price, 0) / (products.length || 1),
    totalValue: products.reduce((acc, p) => acc + (p.price * p.stock), 0)
  };

  return {
    products,
    createProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
    getProductById,
    getProductByBarcode,
    getLowStockProducts,
    stats
  };
}