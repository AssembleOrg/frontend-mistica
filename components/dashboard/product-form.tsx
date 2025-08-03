'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { LoadingSpinner } from '@/components/ui/loading-skeletons';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Product } from '@/lib/types';
import {
  generateMisticaBarcode,
  calculateProfitMargin,
} from '@/lib/barcode-utils';
import Barcode from 'react-barcode';

interface ProductFormProps {
  product?: Product;
  mode: 'add' | 'edit';
}

const categories = [
  { value: 'organicos', label: 'Orgánicos' },
  { value: 'aromaticos', label: 'Aromáticos' },
  { value: 'wellness', label: 'Wellness' },
];

const unitsOfMeasure = [
  { value: 'gramo', label: 'Gramo' },
  { value: 'litro', label: 'Litro' },
];

export function ProductForm({ product, mode }: ProductFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: product?.name || '',
    category: product?.category || 'organicos',
    price: product?.price?.toString() || '',
    costPrice: product?.costPrice?.toString() || '',
    stock: product?.stock?.toString() || '',
    unitOfMeasure: product?.unitOfMeasure || 'gramo',
    description: product?.description || '',
    barcode: product?.barcode || '',
  });

  // Generar código de barras para productos nuevos
  useEffect(() => {
    if (mode === 'add' && !formData.barcode) {
      const newBarcode = generateMisticaBarcode(Date.now());
      setFormData((prev) => ({ ...prev, barcode: newBarcode }));
    }
  }, [mode, formData.barcode]);

  const [isLoading, setIsLoading] = useState(false);

  const printBarcode = (barcode: string, productName: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Código de Barras - ${productName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
              margin: 0;
            }
            .barcode-container {
              border: 1px solid #ddd;
              padding: 20px;
              margin: 20px auto;
              max-width: 400px;
              background: white;
            }
            .product-name {
              font-size: 14px;
              color: #333;
              margin-bottom: 10px;
              font-weight: bold;
            }
            .barcode-code {
              font-size: 12px;
              color: #666;
              margin-top: 10px;
              font-family: monospace;
            }
            @media print {
              body { padding: 0; }
              .barcode-container { 
                border: none; 
                margin: 0;
                box-shadow: none;
              }
            }
          </style>
          <script src="https://unpkg.com/react-barcode@1.4.6/lib/react-barcode.min.js"></script>
        </head>
        <body>
          <div class="barcode-container">
            <div class="product-name">${productName}</div>
            <svg id="barcode"></svg>
            <div class="barcode-code">${barcode}</div>
          </div>
          
          <script>
            // Create SVG barcode using JsBarcode
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
            script.onload = function() {
              JsBarcode("#barcode", "${barcode}", {
                format: "CODE128",
                width: 1,
                height: 50,
                fontSize: 12,
                textAlign: "center",
                textPosition: "bottom",
                textMargin: 2,
                fontOptions: "",
                font: "Arial"
              });
              
              // Auto-print after a short delay
              setTimeout(() => {
                window.print();
              }, 500);
            };
            document.head.appendChild(script);
            
            // Close window after printing
            window.onafterprint = function() {
              window.close();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validación simple
    if (
      !formData.name ||
      !formData.price ||
      !formData.costPrice ||
      !formData.stock
    ) {
      showToast.error(
        'Campos obligatorios incompletos',
        'Por favor completa todos los campos obligatorios.'
      );
      setIsLoading(false);
      return;
    }

    if (
      isNaN(Number(formData.price)) ||
      isNaN(Number(formData.costPrice)) ||
      isNaN(Number(formData.stock))
    ) {
      showToast.error(
        'Datos inválidos',
        'Los precios y stock deben ser números válidos.'
      );
      setIsLoading(false);
      return;
    }

    if (Number(formData.costPrice) >= Number(formData.price)) {
      showToast.error(
        'Error en precios',
        'El precio de costo debe ser menor al precio de venta.'
      );
      setIsLoading(false);
      return;
    }

    try {
      // Mostrar toast de carga
      const loadingToast = showToast.loading(`Guardando producto...`);

      // Simular guardado
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Dismiss loading toast
      showToast.dismiss(loadingToast);

      // Mensaje de éxito
      const action = mode === 'add' ? 'agregado' : 'actualizado';
      showToast.success(
        `Producto ${action} exitosamente`,
        `El producto "${formData.name}" ha sido ${action} correctamente.`
      );

      // Volver a la lista después de un breve delay para que el usuario vea el toast
      setTimeout(() => {
        router.push('/dashboard/products');
      }, 1500);
    } catch (_error) {
      showToast.error(
        'Error al guardar',
        'Ocurrió un error inesperado al guardar el producto. Por favor intenta nuevamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/products');
  };

  return (
    <Card className='max-w-2xl mx-auto border-[#9d684e]/20'>
      <CardHeader>
        <CardTitle className='text-[#455a54] font-tan-nimbus'>
          {mode === 'add' ? 'Agregar Nuevo Producto' : 'Editar Producto'}
        </CardTitle>
        <CardDescription className='font-winter-solid'>
          {mode === 'add'
            ? 'Completa la información para agregar un nuevo producto al catálogo'
            : 'Modifica la información del producto'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className='space-y-6'
        >
          {/* Nombre del producto */}
          <div className='space-y-2'>
            <Label
              htmlFor='name'
              className='text-[#455a54] font-winter-solid'
            >
              Nombre del Producto *
            </Label>
            <Input
              id='name'
              type='text'
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder='Ej: Aceite Esencial de Lavanda'
              className='border-[#9d684e]/20 focus:border-[#9d684e]'
              disabled={isLoading}
              required
            />
          </div>

          {/* Categoría */}
          <div className='space-y-2'>
            <Label
              htmlFor='category'
              className='text-[#455a54] font-winter-solid'
            >
              Categoría *
            </Label>
            <select
              id='category'
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as Product['category'],
                })
              }
              className='w-full px-3 py-2 border border-[#9d684e]/20 rounded-md focus:border-[#9d684e] focus:outline-none'
              disabled={isLoading}
              required
            >
              {categories.map((cat) => (
                <option
                  key={cat.value}
                  value={cat.value}
                >
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Código de barras */}
          {formData.barcode && (
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label className='text-[#455a54] font-winter-solid'>
                  Código de Barras
                </Label>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => printBarcode(formData.barcode, formData.name)}
                  className='border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30'
                >
                  <Printer className='h-4 w-4 mr-1' />
                  Imprimir
                </Button>
              </div>
              <div
                id='barcode-container'
                className='p-4 border border-[#9d684e]/20 rounded-md bg-white text-center'
              >
                <Barcode
                  value={formData.barcode}
                  width={1}
                  height={50}
                  fontSize={12}
                />
                <p className='text-sm text-[#455a54] mt-2 font-winter-solid'>
                  {formData.barcode}
                </p>
              </div>
            </div>
          )}

          {/* Precios */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label
                htmlFor='costPrice'
                className='text-[#455a54] font-winter-solid'
              >
                Precio de Costo *
              </Label>
              <Input
                id='costPrice'
                type='number'
                step='0.01'
                value={formData.costPrice}
                onChange={(e) =>
                  setFormData({ ...formData, costPrice: e.target.value })
                }
                placeholder='0.00'
                className='border-[#9d684e]/20 focus:border-[#9d684e]'
                disabled={isLoading}
                required
              />
            </div>

            <div className='space-y-2'>
              <Label
                htmlFor='price'
                className='text-[#455a54] font-winter-solid'
              >
                Precio de Venta *
              </Label>
              <Input
                id='price'
                type='number'
                step='0.01'
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                placeholder='0.00'
                className='border-[#9d684e]/20 focus:border-[#9d684e]'
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Margen de ganancia (calculado) */}
          {formData.price && formData.costPrice && (
            <div className='p-3 bg-[#efcbb9]/20 border border-[#9d684e]/20 rounded-md'>
              <p className='text-sm text-[#455a54] font-winter-solid'>
                Margen de ganancia:{' '}
                <span className='font-bold'>
                  {calculateProfitMargin(
                    Number(formData.price),
                    Number(formData.costPrice)
                  ).toFixed(1)}
                  %
                </span>
              </p>
            </div>
          )}

          {/* Stock y Unidad de medida */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label
                htmlFor='stock'
                className='text-[#455a54] font-winter-solid'
              >
                Stock *
              </Label>
              <Input
                id='stock'
                type='number'
                min='0'
                value={formData.stock}
                onChange={(e) =>
                  setFormData({ ...formData, stock: e.target.value })
                }
                placeholder='0'
                className='border-[#9d684e]/20 focus:border-[#9d684e]'
                disabled={isLoading}
                required
              />
            </div>

            <div className='space-y-2'>
              <Label
                htmlFor='unitOfMeasure'
                className='text-[#455a54] font-winter-solid'
              >
                Unidad de Medida *
              </Label>
              <Select
                value={formData.unitOfMeasure}
                onValueChange={(value: string) =>
                  setFormData({
                    ...formData,
                    unitOfMeasure: value as Product['unitOfMeasure'],
                  })
                }
                disabled={isLoading}
              >
                <SelectTrigger className='border-[#9d684e]/20 focus:border-[#9d684e]'>
                  <SelectValue placeholder='Seleccionar unidad' />
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
          </div>

          {/* Descripción */}
          <div className='space-y-2'>
            <Label
              htmlFor='description'
              className='text-[#455a54] font-winter-solid'
            >
              Descripción
            </Label>
            <textarea
              id='description'
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder='Descripción detallada del producto...'
              className='w-full px-3 py-2 border border-[#9d684e]/20 rounded-md focus:border-[#9d684e] focus:outline-none min-h-[100px] resize-vertical'
              disabled={isLoading}
              rows={4}
            />
          </div>

          {/* Botones */}
          <div className='flex gap-4 pt-6'>
            <Button
              type='submit'
              disabled={isLoading}
              className='flex-1 bg-[#9d684e] hover:bg-[#9d684e]/90 text-white font-winter-solid'
            >
              {isLoading ? (
                <div className='flex items-center gap-2'>
                  <LoadingSpinner size='sm' />
                  <span>Guardando...</span>
                </div>
              ) : mode === 'add' ? (
                'Agregar Producto'
              ) : (
                'Guardar Cambios'
              )}
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={handleCancel}
              disabled={isLoading}
              className='flex-1 border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30'
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
