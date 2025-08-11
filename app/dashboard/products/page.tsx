/**
 * CAPA 4: PRESENTATION LAYER - PRODUCTS PAGE (CLEAN VERSION)
 * 
 * Página UI PURA que solo renderiza y delega al controller
 * Sin lógica de negocio, sin acceso directo a stores
 */

'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ProductsTable } from '@/components/dashboard/products-table';
import { useProducts } from '@/hooks/useProducts';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
  // Simple hooks API
  const { products, stats } = useProducts();

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

      {/* Stats Cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card className='border-[#9d684e]/20'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-[#455a54] font-winter-solid'>
              Total Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-[#9d684e] font-tan-nimbus'>
              {stats.total}
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
              {stats.active}
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
              {stats.lowStock}
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
              {stats.outOfStock}
            </div>
            <p className='text-xs text-[#455a54]/70'>productos agotados</p>
          </CardContent>
        </Card>
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
          <ProductsTable data={products} />
        </CardContent>
      </Card>
    </div>
  );
}
