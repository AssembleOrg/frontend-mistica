import { ProductForm } from '@/components/dashboard/product-form';

export default function AddProductPage() {
  return (
    <div className='space-y-6'>
      <ProductForm mode='add' />
    </div>
  );
}
