'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductForm } from '@/components/dashboard/product-form';
import { usePermissions } from '@/hooks/usePermissions';

export default function AddProductPage() {
  const router = useRouter();
  const { canManageProducts } = usePermissions();

  useEffect(() => {
    if (!canManageProducts) {
      router.replace('/dashboard/products');
    }
  }, [canManageProducts, router]);

  if (!canManageProducts) return null;

  return (
    <div className='space-y-6'>
      <ProductForm mode='add' />
    </div>
  );
}
