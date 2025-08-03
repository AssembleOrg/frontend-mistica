import { ProductForm } from '@/components/dashboard/product-form';

export default function AddProductPage() {
  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold text-[#455a54] font-tan-nimbus mt-6'>
          Agregar Producto
        </h1>
        <p className='text-[#455a54]/70 font-winter-solid'>
          Agrega un nuevo producto místico o wellness a tu catálogo
        </p>
      </div>

      {/* Form */}
      <ProductForm mode='add' />
    </div>
  );
}
