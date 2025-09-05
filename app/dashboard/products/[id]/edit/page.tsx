'use client';

import { useState, useEffect } from 'react';
import { ProductForm } from '@/components/dashboard/product-form';
import { ProductFormSkeleton } from '@/components/ui/loading-skeletons';
import { Product } from '@/lib/types';
import { notFound } from 'next/navigation';
import { productsService } from '@/services/products.service';

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const resolvedParams = await params;
        
        // Get product from backend
        const response = await productsService.getProduct(resolvedParams.id);
        
        if (!response.data) {
          notFound();
        }

        setProduct(response.data);
      } catch (error) {
        console.error('Error loading product:', error);
        notFound();
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [params]);

  if (isLoading) {
    return (
      <div className='space-y-6'>
        {/* Header skeleton */}
        <div>
          <h1 className='text-3xl font-bold text-[#455a54] font-tan-nimbus'>
            Editar Producto
          </h1>
          <p className='text-[#455a54]/70 font-winter-solid'>
            Cargando información del producto...
          </p>
        </div>

        {/* Form skeleton */}
        <ProductFormSkeleton />
      </div>
    );
  }

  return (
    <div className='space-y-6 mt-6'>
      {/* Header */}
      {/* <div>
        <h1 className='text-3xl font-bold text-[#455a54] font-tan-nimbus'>
          Editar Producto
        </h1>
        <p className='text-[#455a54]/70 font-winter-solid'>
          Modifica la información de:{' '}
          <span className='font-medium'>{product?.name}</span>
        </p>
      </div> */}

      {/* Form */}
      <ProductForm
        mode='edit'
        product={product || undefined}
      />
    </div>
  );
}
