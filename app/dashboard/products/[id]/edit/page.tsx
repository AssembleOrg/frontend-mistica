'use client';

import { useState, useEffect } from 'react';
import { ProductForm } from '@/components/dashboard/product-form';
import { ProductFormSkeleton } from '@/components/ui/loading-skeletons';
import { mockProducts } from '@/lib/mock-data';
import { Product } from '@/lib/types';
import { notFound } from 'next/navigation';

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    // Simulate product loading with realistic delay
    const loadProduct = async () => {
      const resolvedParams = await params;
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay

      const foundProduct = mockProducts.find((p) => p.id === resolvedParams.id);

      if (!foundProduct) {
        notFound();
      }

      setProduct(foundProduct);
      setIsLoading(false);
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
      <div>
        <h1 className='text-3xl font-bold text-[#455a54] font-tan-nimbus'>
          Editar Producto
        </h1>
        <p className='text-[#455a54]/70 font-winter-solid'>
          Modifica la información de:{' '}
          <span className='font-medium'>{product?.name}</span>
        </p>
      </div>

      {/* Form */}
      <ProductForm
        mode='edit'
        product={product || undefined}
      />
    </div>
  );
}
