'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { usePrepaidsAPI } from '@/hooks/usePrepaidsAPI';
import { formatCurrency } from '@/lib/sales-calculations';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

interface PrepaidSelectorProps {
  clientId?: string;
  onPrepaidSelected: (prepaidId: string | null, consumed: boolean) => void;
  selectedPrepaidId?: string | null;
  consumedPrepaid?: boolean;
  className?: string;
}

export function PrepaidSelector({ 
  clientId, 
  onPrepaidSelected, 
  selectedPrepaidId, 
  consumedPrepaid = false,
  className = '' 
}: PrepaidSelectorProps) {
  const { getPrepaidsByClient } = usePrepaidsAPI();
  const [prepaids, setPrepaids] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClientPrepaids = useCallback(async (clientId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getPrepaidsByClient(clientId);
      setPrepaids(response.data || []);
    } catch (err) {
      setError('Error cargando señas del cliente');
      console.error('Error loading client prepaids:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getPrepaidsByClient]);

  useEffect(() => {
    if (clientId) {
      loadClientPrepaids(clientId);
    } else {
      setPrepaids([]);
    }
  }, [clientId, loadClientPrepaids]);

  const availablePrepaids = prepaids.filter(prepaid => 
    prepaid.status === 'PENDING' && prepaid.amount > 0
  );

  const handlePrepaidSelect = (prepaidId: string) => {
    if (selectedPrepaidId === prepaidId) {
      // Deseleccionar
      onPrepaidSelected(null, false);
    } else {
      // Seleccionar
      onPrepaidSelected(prepaidId, consumedPrepaid);
    }
  };

  const handleConsumedChange = (consumed: boolean) => {
    if (selectedPrepaidId) {
      onPrepaidSelected(selectedPrepaidId, consumed);
    }
  };

  if (!clientId) {
    return (
      <Card className={`border-[#9d684e]/20 ${className}`}>
        <CardHeader>
          <CardTitle className="text-[#455a54] font-tan-nimbus flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Señas del Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-[#455a54]/60 font-winter-solid py-4">
            Seleccione un cliente para ver sus señas disponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={`border-[#9d684e]/20 ${className}`}>
        <CardHeader>
          <CardTitle className="text-[#455a54] font-tan-nimbus flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Señas del Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-[#455a54]/60 font-winter-solid py-4">
            Cargando señas...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`border-[#9d684e]/20 ${className}`}>
        <CardHeader>
          <CardTitle className="text-[#455a54] font-tan-nimbus flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Señas del Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 font-winter-solid py-4">
            <AlertCircle className="h-5 w-5 mx-auto mb-2" />
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-[#9d684e]/20 ${className}`}>
      <CardHeader>
        <CardTitle className="text-[#455a54] font-tan-nimbus flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Señas del Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {availablePrepaids.length === 0 ? (
          <div className="text-center text-[#455a54]/60 font-winter-solid py-4">
            <CreditCard className="h-8 w-8 mx-auto mb-2 text-[#455a54]/40" />
            No hay señas disponibles para este cliente
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-[#455a54]/70 font-winter-solid">
              Señas disponibles ({availablePrepaids.length}):
            </div>
            
            {availablePrepaids.map((prepaid) => (
              <div
                key={prepaid.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedPrepaidId === prepaid.id
                    ? 'border-[#9d684e] bg-[#9d684e]/5'
                    : 'border-[#9d684e]/20 hover:border-[#9d684e]/40'
                }`}
                onClick={() => handlePrepaidSelect(prepaid.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedPrepaidId === prepaid.id}
                      onChange={() => handlePrepaidSelect(prepaid.id)}
                      className="border-[#9d684e]/20"
                    />
                    <div>
                      <div className="font-medium text-[#455a54] font-winter-solid">
                        Seña #{prepaid.id.slice(-6)}
                      </div>
                      <div className="text-sm text-[#455a54]/70 font-winter-solid">
                        Creada: {new Date(prepaid.createdAt).toLocaleDateString('es-AR')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#9d684e] font-tan-nimbus">
                      {formatCurrency(prepaid.amount)}
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      Disponible
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
            
            {selectedPrepaidId && (
              <div className="mt-4 p-3 bg-[#9d684e]/5 rounded-lg border border-[#9d684e]/20">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="consume-prepaid"
                    checked={consumedPrepaid}
                    onCheckedChange={(checked) => handleConsumedChange(!!checked)}
                    className="border-[#9d684e]/20"
                  />
                  <Label 
                    htmlFor="consume-prepaid" 
                    className="text-[#455a54] font-winter-solid cursor-pointer"
                  >
                    Consumir esta seña en la venta
                  </Label>
                </div>
                <div className="text-xs text-[#455a54]/60 font-winter-solid mt-1">
                  Si está marcado, la seña se descontará del total de la venta
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
