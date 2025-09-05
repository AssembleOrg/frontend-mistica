'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sale, DailySalesData } from '@/services/sales.service';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

interface SalesStatsCardsProps {
  dailySales?: DailySalesData | null;
  allSales?: Sale[];
  isLoading?: boolean;
}

export function SalesStatsCards({ dailySales, allSales, isLoading }: SalesStatsCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'CASH':
        return <Banknote className="h-4 w-4" />;
      case 'CARD':
        return <CreditCard className="h-4 w-4" />;
      case 'TRANSFER':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <ShoppingCart className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-[#9d684e]/20">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const summary = dailySales?.summary || {
    totalSales: 0,
    totalAmount: 0,
    totalByPaymentMethod: { CASH: 0, CARD: 0, TRANSFER: 0 },
    totalByStatus: { COMPLETED: 0, PENDING: 0, CANCELLED: 0 },
  };

  return (
    <div className="space-y-6">
      {/* Daily Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#9d684e]/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#455a54]">
              Ventas del Día
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-[#9d684e]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#455a54]">
              {summary.totalSales}
            </div>
            <p className="text-xs text-[#455a54]/70">
              {formatCurrency(summary.totalAmount)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#9d684e]/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#455a54]">
              Ingresos Totales
            </CardTitle>
            <DollarSign className="h-4 w-4 text-[#9d684e]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#9d684e]">
              {formatCurrency(summary.totalAmount)}
            </div>
            <p className="text-xs text-[#455a54]/70">
              Hoy
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#9d684e]/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#455a54]">
              Completadas
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary.totalByStatus.COMPLETED}
            </div>
            <p className="text-xs text-[#455a54]/70">
              {summary.totalSales > 0 
                ? `${Math.round((summary.totalByStatus.COMPLETED / summary.totalSales) * 100)}% del total`
                : '0% del total'
              }
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#9d684e]/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#455a54]">
              Promedio por Venta
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-[#9d684e]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#455a54]">
              {summary.totalSales > 0 
                ? formatCurrency(summary.totalAmount / summary.totalSales)
                : formatCurrency(0)
              }
            </div>
            <p className="text-xs text-[#455a54]/70">
              Por transacción
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods Breakdown */}
      <Card className="border-[#9d684e]/20">
        <CardHeader>
          <CardTitle className="text-lg font-tan-nimbus text-[#455a54]">
            Métodos de Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(summary.totalByPaymentMethod).map(([method, amount]) => (
              <div key={method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {getPaymentMethodIcon(method)}
                  <span className="font-medium text-[#455a54]">
                    {method === 'CASH' ? 'Efectivo' : 
                     method === 'CARD' ? 'Tarjeta' : 
                     method === 'TRANSFER' ? 'Transferencia' : method}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#9d684e]">
                    {formatCurrency(amount)}
                  </div>
                  <div className="text-xs text-[#455a54]/70">
                    {summary.totalAmount > 0 
                      ? `${Math.round((amount / summary.totalAmount) * 100)}%`
                      : '0%'
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <Card className="border-[#9d684e]/20">
        <CardHeader>
          <CardTitle className="text-lg font-tan-nimbus text-[#455a54]">
            Estado de las Ventas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(summary.totalByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(status)}
                  <span className="font-medium text-[#455a54]">
                    {status === 'COMPLETED' ? 'Completadas' :
                     status === 'PENDING' ? 'Pendientes' :
                     status === 'CANCELLED' ? 'Canceladas' : status}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#455a54]">
                    {count}
                  </div>
                  <div className="text-xs text-[#455a54]/70">
                    {summary.totalSales > 0 
                      ? `${Math.round((count / summary.totalSales) * 100)}%`
                      : '0%'
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
