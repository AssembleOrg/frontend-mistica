'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ProductsTable } from '@/components/dashboard/products-table';
import {
  StatsCardSkeleton,
  ProductsTableSkeleton,
} from '@/components/ui/loading-skeletons';
import { useProductStore } from '@/stores/product.store';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
  const { products, status, loadProducts, getProductStats } = useProductStore();

  const isLoading = status === 'loading';
  const productStats = getProductStats();

  useEffect(() => {
    if (products.length === 0) {
      loadProducts();
    }
  }, [loadProducts, products.length]);

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-[#455a54] font-tan-nimbus mt-6'>
            Gestión de Productos
          </h1>
          <p className='text-[#455a54]/70 font-winter-solid'>
            Administra tu catálogo de productos místicos y wellness
          </p>
        </div>
        <Button
          asChild
          className='bg-[#9d684e] hover:bg-[#9d684e]/90 text-white font-winter-solid'
        >
          <Link href='/dashboard/products/add'>
            <Plus className='mr-2 h-4 w-4' />
            Agregar Producto
          </Link>
        </Button>
      </div>

      {/* Stats Cards with loading states */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <Card className='border-[#9d684e]/20'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-[#455a54] font-winter-solid'>
                  Total Productos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-[#9d684e] font-tan-nimbus'>
                  {productStats.total}
                </div>
                <p className='text-xs text-[#455a54]/70'>
                  productos en catálogo
                </p>
              </CardContent>
            </Card>

            <Card className='border-[#9d684e]/20'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-[#455a54] font-winter-solid'>
                  Productos Activos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-green-600 font-tan-nimbus'>
                  {productStats.active}
                </div>
                <p className='text-xs text-[#455a54]/70'>
                  disponibles para venta
                </p>
              </CardContent>
            </Card>

            <Card className='border-[#9d684e]/20'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-[#455a54] font-winter-solid'>
                  Stock Bajo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-orange-500 font-tan-nimbus'>
                  {productStats.lowStock}
                </div>
                <p className='text-xs text-[#455a54]/70'>
                  requieren reposición
                </p>
              </CardContent>
            </Card>

            <Card className='border-[#9d684e]/20'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-[#455a54] font-winter-solid'>
                  Sin Stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-red-500 font-tan-nimbus'>
                  {productStats.outOfStock}
                </div>
                <p className='text-xs text-[#455a54]/70'>productos agotados</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Products Table with loading state */}
      <Card className='border-[#9d684e]/20'>
        <CardHeader>
          <CardTitle className='text-[#455a54] font-tan-nimbus'>
            Catálogo de Productos
          </CardTitle>
          <CardDescription className='font-winter-solid'>
            Lista completa de productos con opciones de filtrado y ordenamiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ProductsTableSkeleton />
          ) : (
            <ProductsTable data={products} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
