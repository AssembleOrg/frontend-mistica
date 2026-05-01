/**
 * CAPA 4: PRESENTATION LAYER - PRODUCT FORM (CLEAN VERSION)
 *
 * Componente UI PURO que solo renderiza y delega al controller
 * Sin lógica de negocio, sin acceso directo a stores
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { NumberInput } from '@/components/ui/number-input';
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
import { AlertCircle, Calculator, CheckCircle2, RefreshCw, Save, X } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { useProducts } from '@/hooks/useProducts';
import { Product } from '@/lib/types';
import { formatCurrency } from '@/lib/sales-calculations';
import { generateBarcode } from '@/lib/barcode-utils';
import { validateBarcode } from '@/lib/barcode-validation';

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
  image: string;
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
  { value: 'litro' as const, label: 'Litro' },
  { value: 'gramo' as const, label: 'Gramo' },
  { value: 'unidad' as const, label: 'Unidad' },
];

const statusOptions = [
  { value: 'active' as const, label: 'Activo' },
  { value: 'inactive' as const, label: 'Inactivo' },
  { value: 'out_of_stock' as const, label: 'Sin Stock' },
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

  // Form state.
  // En modo "add" el barcode arranca VACÍO: el primer gesto del operador es
  // disparar el scanner. Si el producto no tiene barcode externo (artesanal),
  // el botón "Generar" lo llena con un código nuevo.
  const [formData, setFormData] = useState<FormData>({
    name: product?.name || '',
    barcode: product?.barcode || '',
    category: product?.category || 'organicos',
    price: product?.price || 0,
    costPrice: product?.costPrice || 0,
    stock: product?.stock || 0,
    unitOfMeasure: product?.unitOfMeasure || 'litro',
    image: product?.image || '',
    description: product?.description || '',
    status: product?.status || 'active',
    profitMargin: product?.profitMargin,
  });

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const [isLoading, setIsLoading] = useState(false);

  // Estado del barcode reconocido (se muestra como badge debajo del input).
  const [barcodeFormat, setBarcodeFormat] = useState<string | null>(null);

  // Refs para el flow scanner-first: al detectar un código válido, el foco
  // salta del input de barcode al de nombre.
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus inicial en el barcode cuando estamos creando un producto
  // (caso típico: el operador apenas abre la pantalla y dispara el scanner).
  useEffect(() => {
    if (mode === 'add' && !formData.barcode) {
      barcodeInputRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si entró un barcode válido al hidratar (mode='edit'), mostramos su formato.
  useEffect(() => {
    if (formData.barcode) {
      const v = validateBarcode(formData.barcode);
      setBarcodeFormat(v.isValid ? v.format : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Computed values
  const profitMargin =
    formData.price && formData.costPrice
      ? ((formData.price - formData.costPrice) / formData.costPrice) * 100
      : 0;

  const isFormValid =
    formData.name.trim().length >= 3 &&
    formData.price > 0 &&
    formData.costPrice > 0 &&
    formData.description.trim().length > 0 &&
    formData.barcode.trim().length > 0;

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
      showToast.success(
        mode === 'add' 
          ? 'Producto creado correctamente' 
          : 'Producto actualizado correctamente'
      );
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

  // Scanner-first: al cambiar el barcode (sea por scanner o tipeo manual),
  // si quedó un código válido (EAN-13, UPC-A, EAN-8 o el MST interno) movemos
  // foco al siguiente campo (Nombre) para que el operador siga sin clicks.
  // Para evitar saltos repetidos al re-tipear el mismo código, recordamos
  // el último valor con el que avanzamos.
  const lastAdvancedBarcodeRef = useRef<string>('');

  const handleBarcodeInput = (value: string) => {
    handleInputChange('barcode', value);
    const trimmed = value.trim();

    if (!trimmed) {
      setBarcodeFormat(null);
      lastAdvancedBarcodeRef.current = '';
      return;
    }

    const v = validateBarcode(trimmed);
    setBarcodeFormat(v.isValid ? v.format : null);

    if (v.autoAccept && trimmed !== lastAdvancedBarcodeRef.current) {
      lastAdvancedBarcodeRef.current = trimmed;
      // Pequeño delay para que el scanner termine de "tipear" y para que el
      // toast no compita con el cambio de foco.
      setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }, 50);
    }
  };

  // Algunos scanners disparan Enter al final; en ese caso forzamos avance
  // aunque el código no haya superado todavía la longitud típica.
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (formData.barcode.trim()) {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }
    }
  };

  // Generar un código interno (producto artesanal sin GTIN del proveedor).
  const handleGenerateBarcode = () => {
    const generated = generateBarcode();
    handleInputChange('barcode', generated);
    setBarcodeFormat(null);
    lastAdvancedBarcodeRef.current = generated;
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 50);
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-responsive-lg font-bold text-[#455a54] font-tan-nimbus mt-6'>
            {mode === 'add' ? 'Agregar Producto' : 'Editar Producto'}
          </h1>
          <p className='text-[#455a54]/70 font-winter-solid text-responsive-sm'>
            {mode === 'add'
              ? 'Complete la información del nuevo producto'
              : 'Modifique la información del producto'}
          </p>
          <p className='text-xs sm:text-sm text-[#455a54]/60 font-winter-solid mt-1'>
            Los campos marcados con <span className='text-red-500'>*</span> son obligatorios
          </p>
        </div>
      </div>


      {/* Edit Form */}
      <form
        onSubmit={handleSubmit}
        className='space-y-4 sm:space-y-6'
      >
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6'>
          {/* Basic Information */}
          <Card className='border-[#9d684e]/20'>
            <CardHeader className="pb-4">
              <CardTitle className='text-[#455a54] font-tan-nimbus text-base sm:text-lg'>Información Básica</CardTitle>
              <CardDescription className='text-[#455a54]/70 font-winter-solid text-sm'>Datos principales del producto</CardDescription>
            </CardHeader>
            <CardContent className='space-y-3 sm:space-y-4'>
              {/* Barcode (PRIMER campo: foco automático en alta) */}
              <div>
                <Label htmlFor='barcode' className='text-[#455a54] font-winter-solid text-sm'>
                  Código de Barras <span className='text-red-500'>*</span>
                </Label>
                <div className="relative">
                  <Input
                    id='barcode'
                    ref={barcodeInputRef}
                    value={formData.barcode}
                    onChange={(e) => handleBarcodeInput(e.target.value)}
                    onKeyDown={handleBarcodeKeyDown}
                    placeholder='Escaneá el código (o tipealo)'
                    autoComplete='off'
                    inputMode='text'
                    className={`border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20 pr-28 touch-target font-mono ${validationErrors.barcode ? 'border-red-500' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-2 text-xs text-[#9d684e] hover:bg-[#9d684e]/10 touch-target"
                    onClick={handleGenerateBarcode}
                    title="Generar código interno (producto sin barcode externo)"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Generar
                  </Button>
                </div>
                {/* Indicador del formato detectado */}
                {barcodeFormat && (
                  <p className='text-xs text-green-700 mt-1 flex items-center gap-1 font-winter-solid'>
                    <CheckCircle2 className='w-3 h-3' />
                    {barcodeFormat} detectado
                  </p>
                )}
                {validationErrors.barcode && (
                  <p className='text-xs sm:text-sm text-red-500 mt-1 flex items-center gap-1 font-winter-solid'>
                    <AlertCircle className='w-3 h-3' />
                    {validationErrors.barcode}
                  </p>
                )}
              </div>

              {/* Name */}
              <div>
                <Label htmlFor='name' className='text-[#455a54] font-winter-solid text-sm'>Nombre del Producto <span className='text-red-500'>*</span></Label>
                <Input
                  id='name'
                  ref={nameInputRef}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder='Ingrese el nombre del producto'
                  autoComplete='off'
                  className={`border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20 touch-target ${validationErrors.name ? 'border-red-500' : ''}`}
                />
                {validationErrors.name && (
                  <p className='text-xs sm:text-sm text-red-500 mt-1 flex items-center gap-1 font-winter-solid'>
                    <AlertCircle className='w-3 h-3' />
                    {validationErrors.name}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <Label htmlFor='category' className='text-[#455a54] font-winter-solid'>Categoría <span className='text-red-500'>*</span></Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    handleInputChange('category', value)
                  }
                >
                  <SelectTrigger className="border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20">
                    <SelectValue placeholder='Seleccione una categoría' />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem
                        key={category.value}
                        value={category.value}
                        className="hover:bg-[#9d684e]/10 focus:bg-[#9d684e]/10"
                      >
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Unit of Measure */}
              <div>
                <Label htmlFor='unitOfMeasure' className='text-[#455a54] font-winter-solid'>Unidad de Medida <span className='text-red-500'>*</span></Label>
                <Select
                  value={formData.unitOfMeasure}
                  onValueChange={(value) =>
                    handleInputChange('unitOfMeasure', value)
                  }
                >
                  <SelectTrigger className="border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20">
                    <SelectValue placeholder='Seleccione la unidad de medida' />
                  </SelectTrigger>
                  <SelectContent>
                    {unitsOfMeasure.map((unit) => (
                      <SelectItem
                        key={unit.value}
                        value={unit.value}
                        className="hover:bg-[#9d684e]/10 focus:bg-[#9d684e]/10"
                      >
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Image URL */}
              <div>
                <Label htmlFor='image' className='text-[#455a54] font-winter-solid'>URL de Imagen</Label>
                <Input
                  id='image'
                  value={formData.image}
                  onChange={(e) => handleInputChange('image', e.target.value)}
                  placeholder='https://ejemplo.com/imagen.jpg'
                  className={`border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20 ${validationErrors.image ? 'border-red-500' : ''}`}
                />
                {validationErrors.image && (
                  <p className='text-sm text-red-500 mt-1 flex items-center gap-1 font-winter-solid'>
                    <AlertCircle className='w-3 h-3' />
                    {validationErrors.image}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <Label htmlFor='description' className='text-[#455a54] font-winter-solid'>Descripción <span className='text-red-500'>*</span></Label>
                <Textarea
                  id='description'
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange('description', e.target.value)
                  }
                  placeholder='Ingrese la descripción del producto'
                  rows={3}
                  required
                  className={`border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20 ${validationErrors.description ? 'border-red-500' : ''}`}
                />
                {validationErrors.description && (
                  <p className='text-sm text-red-500 mt-1 flex items-center gap-1 font-winter-solid'>
                    <AlertCircle className='w-3 h-3' />
                    {validationErrors.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Commercial Information */}
          <Card className='border-[#9d684e]/20'>
            <CardHeader>
              <CardTitle className='text-[#455a54] font-tan-nimbus'>Información Comercial</CardTitle>
              <CardDescription className='text-[#455a54]/70 font-winter-solid'>
                Precios, stock y estado del producto
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {/* Price */}
              <div>
                <Label htmlFor='price' className='text-[#455a54] font-winter-solid'>Precio de Venta <span className='text-red-500'>*</span></Label>
                <CurrencyInput
                  id='price'
                  value={formData.price || 0}
                  onChange={(value) => handleInputChange('price', value)}
                  placeholder='0,00'
                  className={validationErrors.price ? 'border-red-500' : ''}
                />
                {validationErrors.price && (
                  <p className='text-sm text-red-500 mt-1 flex items-center gap-1 font-winter-solid'>
                    <AlertCircle className='w-3 h-3' />
                    {validationErrors.price}
                  </p>
                )}
              </div>

              {/* Cost Price */}
              <div>
                <Label htmlFor='costPrice' className='text-[#455a54] font-winter-solid'>Precio de Costo <span className='text-red-500'>*</span></Label>
                <CurrencyInput
                  id='costPrice'
                  value={formData.costPrice || 0}
                  onChange={(value) => handleInputChange('costPrice', value)}
                  placeholder='0,00'
                  className={validationErrors.costPrice ? 'border-red-500' : ''}
                />
                {validationErrors.costPrice && (
                  <p className='text-sm text-red-500 mt-1 flex items-center gap-1 font-winter-solid'>
                    <AlertCircle className='w-3 h-3' />
                    {validationErrors.costPrice}
                  </p>
                )}
              </div>

              {/* Stock */}
              <div>
                <Label htmlFor='stock' className='text-[#455a54] font-winter-solid'>Stock <span className='text-red-500'>*</span></Label>
                <NumberInput
                  id='stock'
                  value={formData.stock || 0}
                  onChange={(value) => handleInputChange('stock', value)}
                  min={0}
                  step={1}
                  placeholder='0'
                  className={validationErrors.stock ? 'border-red-500' : ''}
                />
                {validationErrors.stock && (
                  <p className='text-sm text-red-500 mt-1 flex items-center gap-1 font-winter-solid'>
                    <AlertCircle className='w-3 h-3' />
                    {validationErrors.stock}
                  </p>
                )}
              </div>

              {/* Status */}
              <div>
                <Label htmlFor='status' className='text-[#455a54] font-winter-solid'>Estado <span className='text-red-500'>*</span></Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    handleInputChange('status', value)
                  }
                >
                  <SelectTrigger className="border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20">
                    <SelectValue placeholder='Seleccione el estado' />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem
                        key={status.value}
                        value={status.value}
                        className="hover:bg-[#9d684e]/10 focus:bg-[#9d684e]/10"
                      >
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Profit Margin Display */}
              {formData.price > 0 && formData.costPrice > 0 && (
                <div className='p-3 border border-[#9d684e]/20 rounded-lg bg-[#9d684e]/5'>
                  <div className='flex items-center gap-2 text-sm text-[#455a54] font-winter-solid'>
                    <Calculator className='w-4 h-4 text-[#9d684e]' />
                    <span>Margen de Ganancia:</span>
                    <Badge variant={profitMargin > 0 ? 'default' : 'outline'} className={profitMargin > 0 ? 'bg-[#9d684e] text-white' : 'border-[#9d684e] text-[#455a54]'}>
                      {profitMargin.toFixed(1)}%
                    </Badge>
                  </div>
                  <p className='text-xs text-[#455a54]/70 mt-1 font-winter-solid'>
                    Ganancia por unidad:{' '}
                    {formatCurrency(formData.price - formData.costPrice)}
                  </p>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        {/* Form Actions */}
        <div className='flex justify-end gap-4 pt-4 border-t border-[#9d684e]/20'>
          <Button
            type='button'
            variant='outline'
            onClick={handleCancel}
            disabled={isLoading}
            className='border-[#9d684e] text-[#9d684e] hover:bg-[#9d684e] hover:text-white'
          >
            <X className='w-4 h-4 mr-2' />
            Cancelar
          </Button>

          <Button
            type='submit'
            disabled={!isFormValid || isLoading}
            className='bg-[#9d684e] hover:bg-[#9d684e]/90 text-white'
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
