'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, Edit, ArrowLeft, Copy } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { LoadingSpinner } from '@/components/ui/loading-skeletons';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/lib/types';
import { mockProducts, categoryConfig, statusConfig } from '@/lib/mock-data';
import { calculateProfitMargin } from '@/lib/barcode-utils';
import Barcode from 'react-barcode';

export default function ProductDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simular carga de producto
    const loadProduct = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const foundProduct = mockProducts.find(p => p.id === params.id);
      setProduct(foundProduct || null);
      setIsLoading(false);
    };

    if (params.id) {
      loadProduct();
    }
  }, [params.id]);

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
            }
            .barcode-code {
              font-weight: bold;
              margin-top: 10px;
              font-size: 14px;
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .barcode-container { border: none; margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            <h3>${productName}</h3>
            <div id="barcode"></div>
            <div class="barcode-code">${barcode}</div>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
          <script>
            JsBarcode("#barcode", "${barcode}", {
              width: 1,
              height: 50,
              fontSize: 12
            });
            window.print();
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

  const handleCopyBarcode = () => {
    if (product?.barcode) {
      navigator.clipboard.writeText(product.barcode);
      showToast.success('Código copiado', `Código de barras ${product.barcode} copiado al portapapeles.`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-[#9d684e]/20">
          <CardContent className="pt-6 text-center">
            <p className="text-[#455a54]/70">Producto no encontrado</p>
            <Button
              onClick={() => router.push('/dashboard/products')}
              className="mt-4 bg-[#9d684e] hover:bg-[#9d684e]/90 text-white"
            >
              Volver a Productos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const unitLabels = {
    gramo: 'g',
    litro: 'L'
  };
  
  const profitMargin = calculateProfitMargin(product.price, product.costPrice);

  return (
    <div className="max-w-2xl mx-auto mt-6 space-y-6">
      {/* Header con navegación */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/products')}
          className="border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Button
          onClick={() => router.push(`/dashboard/products/${product.id}/edit`)}
          className="bg-[#9d684e] hover:bg-[#9d684e]/90 text-white"
        >
          <Edit className="mr-2 h-4 w-4" />
          Editar Producto
        </Button>
      </div>

      {/* Detalles del producto */}
      <Card className="border-[#9d684e]/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-[#455a54] font-tan-nimbus">
                {product.name}
              </CardTitle>
              <CardDescription className="font-winter-solid">
                {product.description}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge
                style={{
                  color: categoryConfig[product.category].color,
                  backgroundColor: categoryConfig[product.category].bgColor,
                }}
              >
                {categoryConfig[product.category].label}
              </Badge>
              <Badge
                style={{
                  color: statusConfig[product.status].color,
                  backgroundColor: statusConfig[product.status].bgColor,
                }}
              >
                {statusConfig[product.status].label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Código de barras */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[#455a54] font-winter-solid font-medium">
                Código de Barras
              </h3>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyBarcode}
                  className="border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => printBarcode(product.barcode, product.name)}
                  className="border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30"
                >
                  <Printer className="h-4 w-4 mr-1" />
                  Imprimir
                </Button>
              </div>
            </div>
            <div className="p-4 border border-[#9d684e]/20 rounded-md bg-white text-center">
              <Barcode value={product.barcode} width={1} height={50} fontSize={12} />
              <p className="text-sm text-[#455a54] mt-2 font-winter-solid">{product.barcode}</p>
            </div>
          </div>

          {/* Información de precios */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-[#455a54]/70 font-winter-solid">Precio de Costo</p>
              <p className="text-lg font-medium text-[#455a54]">
                {new Intl.NumberFormat('es-AR', {
                  style: 'currency',
                  currency: 'ARS',
                }).format(product.costPrice)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-[#455a54]/70 font-winter-solid">Precio de Venta</p>
              <p className="text-lg font-medium text-[#9d684e]">
                {new Intl.NumberFormat('es-AR', {
                  style: 'currency',
                  currency: 'ARS',
                }).format(product.price)}
              </p>
            </div>
          </div>

          {/* Margen de ganancia */}
          <div className="p-3 bg-[#efcbb9]/20 border border-[#9d684e]/20 rounded-md">
            <p className="text-sm text-[#455a54] font-winter-solid">
              Margen de ganancia: <span className="font-bold">{profitMargin.toFixed(1)}%</span>
            </p>
          </div>

          {/* Stock e información adicional */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-[#455a54]/70 font-winter-solid">Stock Disponible</p>
              <p className={`text-lg font-medium ${
                product.stock === 0
                  ? 'text-red-500'
                  : product.stock <= 10
                  ? 'text-orange-500'
                  : 'text-[#455a54]'
              }`}>
                {product.stock} {unitLabels[product.unitOfMeasure]}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-[#455a54]/70 font-winter-solid">Unidad de Medida</p>
              <p className="text-lg font-medium text-[#455a54] capitalize">
                {product.unitOfMeasure}
              </p>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4 text-xs text-[#455a54]/60">
            <div>
              <p>Creado: {product.createdAt.toLocaleDateString('es-AR')}</p>
            </div>
            <div>
              <p>Actualizado: {product.updatedAt.toLocaleDateString('es-AR')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}