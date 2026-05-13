'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useCategories } from '@/hooks/useCategories';
import { Product, ProductKind } from '@/lib/types';
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
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  unitOfMeasure: '' | 'litro' | 'gramo' | 'unidad';
  image: string;
  description: string;
  kind: ProductKind;
  profitMargin?: number;
}

const unitsOfMeasure = [
  { value: 'litro' as const, label: 'Litro' },
  { value: 'gramo' as const, label: 'Gramo' },
  { value: 'unidad' as const, label: 'Unidad' },
];

export function ProductForm({ product, mode, onSuccess, onCancel }: ProductFormProps) {
  const router = useRouter();

  const { createProduct, updateProduct } = useProducts();
  const { categories, isLoading: loadingCategories } = useCategories();

  // El operador-tipo arranca scaneando el código primero. En "add" el barcode
  // queda vacío para que el primer gesto sea el scanner; el botón "Generar"
  // crea uno interno si el producto no tiene GTIN del proveedor.
  const [formData, setFormData] = useState<FormData>({
    name: product?.name || '',
    barcode: product?.barcode || '',
    category: product?.category || '',
    price: product?.price || 0,
    costPrice: product?.costPrice || 0,
    stock: product?.stock || 0,
    unitOfMeasure: product?.unitOfMeasure || '',
    image: product?.image || '',
    description: product?.description || '',
    kind: product?.kind || 'STANDARD',
    profitMargin: product?.profitMargin,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [barcodeFormat, setBarcodeFormat] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'add' && !formData.barcode) {
      barcodeInputRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (formData.barcode) {
      const v = validateBarcode(formData.barcode);
      setBarcodeFormat(v.isValid ? v.format : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isService = formData.kind === 'SERVICE';

  // Margen sólo aplica cuando hay costo y no es servicio.
  const profitMargin =
    !isService && formData.price > 0 && formData.costPrice > 0
      ? ((formData.price - formData.costPrice) / formData.costPrice) * 100
      : 0;

  const isFormValid =
    formData.name.trim().length >= 3 &&
    formData.price > 0 &&
    formData.barcode.trim().length > 0;

  const handleInputChange = (field: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value as FormData[typeof field] }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleServiceToggle = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      kind: checked ? 'SERVICE' : 'STANDARD',
      // Al marcar servicio, limpiamos campos que dejan de aplicar.
      costPrice: checked ? 0 : prev.costPrice,
      stock: checked ? 0 : prev.stock,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      showToast.error('Por favor completá los campos obligatorios');
      return;
    }

    setIsLoading(true);
    try {
      // Construimos el payload omitiendo campos vacíos opcionales para que el
      // backend respete sus defaults y validaciones permisivas.
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        barcode: formData.barcode.trim(),
        price: formData.price,
        kind: formData.kind,
      };
      if (formData.category) payload.category = formData.category;
      if (!isService && formData.costPrice > 0) payload.costPrice = formData.costPrice;
      if (!isService) payload.stock = formData.stock;
      if (formData.unitOfMeasure) payload.unitOfMeasure = formData.unitOfMeasure;
      if (formData.image) payload.image = formData.image.trim();
      if (formData.description) payload.description = formData.description.trim();

      if (mode === 'add') {
        await createProduct(payload as never);
      } else {
        await updateProduct(product!.id, payload as never);
      }
      onSuccess?.();
      showToast.success(mode === 'add' ? 'Producto creado' : 'Producto actualizado');
      router.push('/dashboard/products');
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Error al guardar producto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    router.back();
  };

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
      setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }, 50);
    }
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (formData.barcode.trim()) {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }
    }
  };

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
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-responsive-lg font-bold text-[#455a54] font-tan-nimbus mt-6'>
            {mode === 'add' ? 'Agregar Producto' : 'Editar Producto'}
          </h1>
          <p className='text-[#455a54]/70 font-winter-solid text-responsive-sm'>
            {mode === 'add' ? 'Complete la información del nuevo producto' : 'Modifique la información del producto'}
          </p>
          <p className='text-xs sm:text-sm text-[#455a54]/60 font-winter-solid mt-1'>
            Los campos marcados con <span className='text-red-500'>*</span> son obligatorios
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className='space-y-4 sm:space-y-6'>
        {/* Toggle servicio/producto */}
        <Card className='border-[#9d684e]/20'>
          <CardContent className='py-3 flex items-center gap-3'>
            <Checkbox
              id='kindService'
              checked={isService}
              onCheckedChange={(v) => handleServiceToggle(v === true)}
              className='data-[state=checked]:bg-[#9d684e] data-[state=checked]:border-[#9d684e]'
            />
            <Label htmlFor='kindService' className='cursor-pointer text-[#455a54] font-winter-solid'>
              Es un servicio (sin stock ni precio de costo)
            </Label>
          </CardContent>
        </Card>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6'>
          <Card className='border-[#9d684e]/20'>
            <CardHeader className='pb-4'>
              <CardTitle className='text-[#455a54] font-tan-nimbus text-base sm:text-lg'>Información Básica</CardTitle>
              <CardDescription className='text-[#455a54]/70 font-winter-solid text-sm'>Datos principales del producto</CardDescription>
            </CardHeader>
            <CardContent className='space-y-3 sm:space-y-4'>
              <div>
                <Label htmlFor='barcode' className='text-[#455a54] font-winter-solid text-sm'>
                  Código de Barras <span className='text-red-500'>*</span>
                </Label>
                <div className='relative'>
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
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='absolute right-1 top-1/2 -translate-y-1/2 h-8 px-2 text-xs text-[#9d684e] hover:bg-[#9d684e]/10 touch-target'
                    onClick={handleGenerateBarcode}
                    title='Generar código interno'
                  >
                    <RefreshCw className='h-3 w-3 mr-1' />
                    Generar
                  </Button>
                </div>
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

              <div>
                <Label htmlFor='name' className='text-[#455a54] font-winter-solid text-sm'>
                  Nombre del Producto <span className='text-red-500'>*</span>
                </Label>
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

              <div>
                <Label htmlFor='category' className='text-[#455a54] font-winter-solid'>Categoría</Label>
                <Select
                  value={formData.category || undefined}
                  onValueChange={(value) => handleInputChange('category', value)}
                >
                  <SelectTrigger className='border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20'>
                    <SelectValue placeholder={loadingCategories ? 'Cargando...' : 'Seleccione una categoría'} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem
                        key={c.id}
                        value={c.name}
                        className='hover:bg-[#9d684e]/10 focus:bg-[#9d684e]/10'
                      >
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className='text-[10px] text-[#455a54]/50 mt-1 font-winter-solid'>
                  ¿No ves la categoría? Cargala desde <a href='/dashboard/categories' className='underline'>Categorías</a>.
                </p>
              </div>

              <div>
                <Label htmlFor='unitOfMeasure' className='text-[#455a54] font-winter-solid'>Unidad de Medida</Label>
                <Select
                  value={formData.unitOfMeasure || undefined}
                  onValueChange={(value) => handleInputChange('unitOfMeasure', value)}
                >
                  <SelectTrigger className='border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20'>
                    <SelectValue placeholder='Seleccione la unidad de medida' />
                  </SelectTrigger>
                  <SelectContent>
                    {unitsOfMeasure.map((unit) => (
                      <SelectItem
                        key={unit.value}
                        value={unit.value}
                        className='hover:bg-[#9d684e]/10 focus:bg-[#9d684e]/10'
                      >
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor='image' className='text-[#455a54] font-winter-solid'>URL de Imagen</Label>
                <Input
                  id='image'
                  value={formData.image}
                  onChange={(e) => handleInputChange('image', e.target.value)}
                  placeholder='https://ejemplo.com/imagen.jpg'
                  className='border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20'
                />
              </div>

              <div>
                <Label htmlFor='description' className='text-[#455a54] font-winter-solid'>Descripción</Label>
                <Textarea
                  id='description'
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder='Ingrese la descripción del producto'
                  rows={3}
                  className='border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20'
                />
              </div>
            </CardContent>
          </Card>

          <Card className='border-[#9d684e]/20'>
            <CardHeader>
              <CardTitle className='text-[#455a54] font-tan-nimbus'>Información Comercial</CardTitle>
              <CardDescription className='text-[#455a54]/70 font-winter-solid'>
                {isService ? 'Sólo precio de venta — los servicios no tienen stock ni costo' : 'Precios y stock del producto'}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <Label htmlFor='price' className='text-[#455a54] font-winter-solid'>
                  Precio de Venta <span className='text-red-500'>*</span>
                </Label>
                <CurrencyInput
                  id='price'
                  value={formData.price || 0}
                  onChange={(value) => handleInputChange('price', value)}
                  placeholder='0,00'
                />
              </div>

              {!isService && (
                <>
                  <div>
                    <Label htmlFor='costPrice' className='text-[#455a54] font-winter-solid'>Precio de Costo</Label>
                    <CurrencyInput
                      id='costPrice'
                      value={formData.costPrice || 0}
                      onChange={(value) => handleInputChange('costPrice', value)}
                      placeholder='0,00'
                    />
                  </div>

                  <div>
                    <Label htmlFor='stock' className='text-[#455a54] font-winter-solid'>Stock</Label>
                    <NumberInput
                      id='stock'
                      value={formData.stock || 0}
                      onChange={(value) => handleInputChange('stock', value)}
                      min={0}
                      step={1}
                      placeholder='0'
                    />
                  </div>
                </>
              )}

              {!isService && formData.price > 0 && formData.costPrice > 0 && (
                <div className='p-3 border border-[#9d684e]/20 rounded-lg bg-[#9d684e]/5'>
                  <div className='flex items-center gap-2 text-sm text-[#455a54] font-winter-solid'>
                    <Calculator className='w-4 h-4 text-[#9d684e]' />
                    <span>Margen de Ganancia:</span>
                    <Badge variant={profitMargin > 0 ? 'default' : 'outline'} className={profitMargin > 0 ? 'bg-[#9d684e] text-white' : 'border-[#9d684e] text-[#455a54]'}>
                      {profitMargin.toFixed(1)}%
                    </Badge>
                  </div>
                  <p className='text-xs text-[#455a54]/70 mt-1 font-winter-solid'>
                    Ganancia por unidad: {formatCurrency(formData.price - formData.costPrice)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
            <Save className='w-4 h-4 mr-2' />
            {isLoading ? 'Guardando...' : mode === 'add' ? 'Crear Producto' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}
