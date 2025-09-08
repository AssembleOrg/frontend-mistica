'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { ReceiptViewer } from '@/components/receipts/receipt-viewer';
import { Sale } from '@/services/sales.service';
import { useSalesAPI } from '@/hooks/useSalesAPI';
import { showToast } from '@/lib/toast';

function ReceiptPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getSaleById } = useSalesAPI();
  
  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const saleId = searchParams.get('saleId');
  let type = (searchParams.get('type') as 'thermal' | 'a4') || 'a4';
  
  // También revisar el parámetro 'receipt' como alternativa
  const receiptParam = searchParams.get('receipt');
  if (receiptParam === 'thermal') {
    type = 'thermal';
  }
  
  useEffect(() => {
    if (!saleId) {
      showToast.error('ID de venta no proporcionado');
      router.back();
      return;
    }
    
    const loadSale = async () => {
      try {
        setIsLoading(true);
        const saleData = await getSaleById(saleId);
        setSale(saleData);
      } catch (error) {
        console.error('Error cargando venta:', error);
        showToast.error('Error al cargar la venta');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSale();
  }, [saleId, getSaleById, router]);
  
  const handleClose = () => {
    router.back();
  };
  
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#9d684e] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Cargando comprobante...</p>
        </div>
      </div>
    );
  }
  
  if (!sale) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Venta no encontrada</p>
        </div>
      </div>
    );
  }
  
  return (
    <ReceiptViewer 
      sale={sale} 
      onClose={handleClose} 
      type={type}
    />
  );
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#9d684e] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <ReceiptPageContent />
    </Suspense>
  );
}