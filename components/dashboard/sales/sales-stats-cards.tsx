'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSalesStats } from '@/hooks/useSalesStats';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw
} from 'lucide-react';

interface SalesStatsCardsProps {
  // Props are now handled by the hook
}

export function SalesStatsCards() {
  const { statistics, isLoading, refreshData } = useSalesStats();
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
      <div className="space-y-6">
        {/* Header with refresh button */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#455a54] font-tan-nimbus">
            Estadísticas de Ventas
          </h2>
          <button
            onClick={refreshData}
            disabled={isLoading}
            className="p-2 text-[#9d684e] hover:bg-[#9d684e]/10 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#455a54] font-tan-nimbus">
          Estadísticas de Ventas
        </h2>
        <button
          onClick={refreshData}
          disabled={isLoading}
          className="p-2 text-[#9d684e] hover:bg-[#9d684e]/10 rounded-lg transition-colors"
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

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
              {statistics.dailySales.count}
            </div>
            <p className="text-xs text-[#455a54]/70">
              {formatCurrency(statistics.dailySales.amount)}
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
              {formatCurrency(statistics.totalRevenue.amount)}
            </div>
            <p className="text-xs text-[#455a54]/70">
              {statistics.totalRevenue.period}
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
              {statistics.completed.count}
            </div>
            <p className="text-xs text-[#455a54]/70">
              {Math.round(statistics.completed.percentage)}% del total
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
              {formatCurrency(statistics.averagePerSale.amount)}
            </div>
            <p className="text-xs text-[#455a54]/70">
              {statistics.averagePerSale.description}
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
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                <span className="font-medium text-[#455a54]">Efectivo</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-[#9d684e]">
                  {formatCurrency(statistics.paymentMethods.cash.amount)}
                </div>
                <div className="text-xs text-[#455a54]/70">
                  {Math.round(statistics.paymentMethods.cash.percentage)}%
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="font-medium text-[#455a54]">Tarjeta</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-[#9d684e]">
                  {formatCurrency(statistics.paymentMethods.card.amount)}
                </div>
                <div className="text-xs text-[#455a54]/70">
                  {Math.round(statistics.paymentMethods.card.percentage)}%
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <span className="font-medium text-[#455a54]">Transferencia</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-[#9d684e]">
                  {formatCurrency(statistics.paymentMethods.transfer.amount)}
                </div>
                <div className="text-xs text-[#455a54]/70">
                  {Math.round(statistics.paymentMethods.transfer.percentage)}%
                </div>
              </div>
            </div>
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
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-[#455a54]">Pendientes</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-[#455a54]">
                  {statistics.salesStatus.pending.count}
                </div>
                <div className="text-xs text-[#455a54]/70">
                  {Math.round(statistics.salesStatus.pending.percentage)}%
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-[#455a54]">Completadas</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-[#455a54]">
                  {statistics.salesStatus.completed.count}
                </div>
                <div className="text-xs text-[#455a54]/70">
                  {Math.round(statistics.salesStatus.completed.percentage)}%
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="font-medium text-[#455a54]">Canceladas</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-[#455a54]">
                  {statistics.salesStatus.cancelled.count}
                </div>
                <div className="text-xs text-[#455a54]/70">
                  {Math.round(statistics.salesStatus.cancelled.percentage)}%
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Cash Status (including prepaids and egresses) */}
      <Card className="border-[#9d684e]/20">
        <CardHeader>
          <CardTitle className="text-lg font-tan-nimbus text-[#455a54]">
            Estado Total de la Caja
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-sm font-medium text-green-700 mb-1">Ventas Totales</div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(statistics.totalCashStatus.totalSales)}
              </div>
            </div>
            
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-700 mb-1">Dinero en Señas</div>
              <div className="text-lg font-bold text-blue-600">
                {formatCurrency(statistics.totalCashStatus.totalPrepaids)}
              </div>
            </div>
            
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-sm font-medium text-red-700 mb-1">Egresos</div>
              <div className="text-lg font-bold text-red-600">
                {formatCurrency(statistics.totalCashStatus.totalEgresses)}
              </div>
            </div>
            
            <div className={`text-center p-3 rounded-lg ${
              statistics.totalCashStatus.netBalance >= 0 
                ? 'bg-green-50' 
                : 'bg-red-50'
            }`}>
              <div className={`text-sm font-medium mb-1 ${
                statistics.totalCashStatus.netBalance >= 0 
                  ? 'text-green-700' 
                  : 'text-red-700'
              }`}>
                Balance Neto
              </div>
              <div className={`text-lg font-bold ${
                statistics.totalCashStatus.netBalance >= 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {formatCurrency(statistics.totalCashStatus.netBalance)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
