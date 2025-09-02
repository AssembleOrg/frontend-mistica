/**
 * CAPA 4: PRESENTATION LAYER - PRODUCT FORM (CLEAN VERSION)
 *
 * Componente UI PURO que solo renderiza y delega al controller
 * Sin lógica de negocio, sin acceso directo a stores
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, X, AlertCircle, Calculator } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { useProducts } from '@/hooks/useProducts';
import { Product } from '@/lib/types';
import { formatCurrency } from '@/lib/sales-calculations';
import { generateBarcode } from '@/lib/barcode-utils';

interface ProductFormProps {
  product?: Product;
  mode: 'add' | 'edit';
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  name: string;
  barcode: string;
  category: Product['category'];
  price: number;
  costPrice: number;
  stock: number;
  unitOfMeasure: Product['unitOfMeasure'];
  description: string;
  status: Product['status'];
  profitMargin?: number;
}

const categories = [
  { value: 'organicos' as const, label: 'Orgánicos' },
  { value: 'aromaticos' as const, label: 'Aromáticos' },
  { value: 'wellness' as const, label: 'Wellness' },
];

const unitsOfMeasure = [
  { value: 'gramo' as const, label: 'Gramo' },
  { value: 'litro' as const, label: 'Litro' },
];

export function ProductForm({
  product,
  mode,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const router = useRouter();

  // Simple hooks API
  const { createProduct, updateProduct } = useProducts();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: product?.name || '',
    barcode: product?.barcode || generateBarcode(),
    category: product?.category || 'organicos',
    price: product?.price || 0,
    costPrice: product?.costPrice || 0,
    stock: product?.stock || 0,
    unitOfMeasure: product?.unitOfMeasure || 'gramo',
    description: product?.description || '',
    status: product?.status || 'active',
    profitMargin: product?.profitMargin,
  });

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  
  const [isLoading, setIsLoading] = useState(false);

  // Computed values
  const profitMargin =
    formData.price && formData.costPrice
      ? ((formData.price - formData.costPrice) / formData.costPrice) * 100
      : 0;

  const isFormValid =
    formData.name.trim().length >= 3 &&
    formData.price > 0 &&
    formData.costPrice > 0 &&
    formData.description.trim().length > 0;

  // Form handlers - delegate to controller
  const handleInputChange = (field: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      showToast.error('Por favor completa todos los campos requeridos');
      return;
    }

    console.log('📤 Enviando producto:', formData);
    
    setIsLoading(true);

    try {
      if (mode === 'add') {
        await createProduct(formData);
      } else {
        await updateProduct(product!.id, formData);
      }

      onSuccess?.();
      router.push('/dashboard/products');
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Error al guardar producto'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    router.back();
  };

  return (
    <div className='max-w-4xl mx-auto p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>
            {mode === 'add' ? 'Agregar Producto' : 'Editar Producto'}
          </h1>
          <p className='text-muted-foreground'>
            {mode === 'add'
              ? 'Complete la información del nuevo producto'
              : 'Modifique la información del producto'}
          </p>
          <p className='text-sm text-muted-foreground mt-1'>
            Los campos marcados con <span className='text-destructive'>*</span> son obligatorios
          </p>
        </div>
      </div>


      {/* Edit Form */}
      <form
        onSubmit={handleSubmit}
        className='space-y-6'
      >
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
              <CardDescription>Datos principales del producto</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {/* Name */}
              <div>
                <Label htmlFor='name'>Nombre del Producto <span className='text-destructive'>*</span></Label>
                <Input
                  id='name'
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder='Ingrese el nombre del producto'
                  className={validationErrors.name ? 'border-destructive' : ''}
                />
                {validationErrors.name && (
                  <p className='text-sm text-destructive mt-1 flex items-center gap-1'>
                    <AlertCircle className='w-3 h-3' />
                    {validationErrors.name}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <Label htmlFor='category'>Categoría <span className='text-destructive'>*</span></Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    handleInputChange('category', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Seleccione una categoría' />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem
                        key={category.value}
                        value={category.value}
                      >
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Unit of Measure */}
              <div>
                <Label htmlFor='unitOfMeasure'>Unidad de Medida <span className='text-destructive'>*</span></Label>
                <Select
                  value={formData.unitOfMeasure}
                  onValueChange={(value) =>
                    handleInputChange('unitOfMeasure', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Seleccione una unidad' />
                  </SelectTrigger>
                  <SelectContent>
                    {unitsOfMeasure.map((unit) => (
                      <SelectItem
                        key={unit.value}
                        value={unit.value}
                      >
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor='description'>Descripción <span className='text-destructive'>*</span></Label>
                <Textarea
                  id='description'
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange('description', e.target.value)
                  }
                  placeholder='Ingrese la descripción del producto'
                  rows={3}
                  required
                  className={validationErrors.description ? 'border-destructive' : ''}
                />
                {validationErrors.description && (
                  <p className='text-sm text-destructive mt-1 flex items-center gap-1'>
                    <AlertCircle className='w-3 h-3' />
                    {validationErrors.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Stock */}
          <Card>
            <CardHeader>
              <CardTitle>Precios y Stock</CardTitle>
              <CardDescription>
                Información comercial del producto
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {/* Price */}
              <div>
                <Label htmlFor='price'>Precio de Venta <span className='text-destructive'>*</span></Label>
                <Input
                  id='price'
                  type='number'
                  step='0.01'
                  value={formData.price || ''}
                  onChange={(e) =>
                    handleInputChange('price', parseFloat(e.target.value) || 0)
                  }
                  placeholder='0.00'
                  className={validationErrors.price ? 'border-destructive' : ''}
                />
                {validationErrors.price && (
                  <p className='text-sm text-destructive mt-1 flex items-center gap-1'>
                    <AlertCircle className='w-3 h-3' />
                    {validationErrors.price}
                  </p>
                )}
              </div>

              {/* Cost Price */}
              <div>
                <Label htmlFor='costPrice'>Precio de Costo <span className='text-destructive'>*</span></Label>
                <Input
                  id='costPrice'
                  type='number'
                  step='0.01'
                  value={formData.costPrice || ''}
                  onChange={(e) =>
                    handleInputChange(
                      'costPrice',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder='0.00'
                  className={
                    validationErrors.costPrice ? 'border-destructive' : ''
                  }
                />
                {validationErrors.costPrice && (
                  <p className='text-sm text-destructive mt-1 flex items-center gap-1'>
                    <AlertCircle className='w-3 h-3' />
                    {validationErrors.costPrice}
                  </p>
                )}
              </div>

              {/* Profit Margin Display */}
              {formData.price > 0 && formData.costPrice > 0 && (
                <div className='p-3 border rounded-lg bg-accent/50'>
                  <div className='flex items-center gap-2 text-sm'>
                    <Calculator className='w-4 h-4' />
                    <span>Margen de Ganancia:</span>
                    <Badge variant={profitMargin > 0 ? 'default' : 'outline'}>
                      {profitMargin.toFixed(1)}%
                    </Badge>
                  </div>
                  <p className='text-xs text-muted-foreground mt-1'>
                    Ganancia por unidad:{' '}
                    {formatCurrency(formData.price - formData.costPrice)}
                  </p>
                </div>
              )}

              {/* Stock */}
              <div>
                <Label htmlFor='stock'>Stock Inicial</Label>
                <Input
                  id='stock'
                  type='number'
                  value={formData.stock || ''}
                  onChange={(e) =>
                    handleInputChange('stock', parseInt(e.target.value) || 0)
                  }
                  placeholder='0'
                  min='0'
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form Actions */}
        <div className='flex justify-end gap-4 pt-4 border-t'>
          <Button
            type='button'
            variant='outline'
            onClick={handleCancel}
            disabled={isLoading}
          >
            <X className='w-4 h-4 mr-2' />
            Cancelar
          </Button>

          <Button
            type='submit'
            disabled={!isFormValid || isLoading}
            variant="terracota"
          >
            <>
              <Save className='w-4 h-4 mr-2' />
              {isLoading 
                ? 'Guardando...' 
                : mode === 'add' 
                  ? 'Crear Producto' 
                  : 'Guardar Cambios'
              }
            </>
          </Button>
        </div>
      </form>

    </div>
  );
}
