'use client';

import { useFinances } from '@/hooks/useFinances';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, RefreshCw, CheckCircle } from 'lucide-react';

export function EgressIntegrationStatus() {
  const { refreshData, isLoading, expenses } = useFinances();

  return (
    <Card className="border-[#9d684e]/20">
      <CardHeader>
        <CardTitle className="text-lg font-tan-nimbus text-[#455a54] flex items-center gap-2">
          Estado de Integración de Egresos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">Modo Servidor</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Conectado
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={isLoading}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Egresos Cargados</span>
            </div>
            <p className="text-2xl font-bold text-[#455a54]">{expenses.length}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              <span className="text-sm font-medium">Estado</span>
            </div>
            <p className="text-sm text-gray-600">
              {isLoading ? 'Cargando...' : 'Listo'}
            </p>
          </div>
        </div>

        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <p className="font-medium mb-1">Información:</p>
          <ul className="space-y-1">
            <li>• Los egresos se guardan directamente en la base de datos</li>
            <li>• Los datos se sincronizan automáticamente con el servidor</li>
            <li>• Todos los egresos están respaldados en el backend</li>
            <li>• El sistema está optimizado para rendimiento y confiabilidad</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
