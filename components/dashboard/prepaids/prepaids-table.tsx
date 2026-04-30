'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  Edit,
  Clock,
  CheckCircle
} from 'lucide-react';
import { Prepaid } from '@/services/prepaids.service';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface PrepaidsTableProps {
  data: Prepaid[];
  isLoading?: boolean;
  onViewPrepaid?: (prepaid: Prepaid) => void;
  onEditPrepaid?: (prepaid: Prepaid) => void;
  onDeletePrepaid?: (prepaid: Prepaid) => void;
  onCreatePrepaid?: () => void;
  onSearch?: (query: string) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onMarkAsConsumed?: (prepaid: Prepaid) => void;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  totalItems?: number;
}

export function PrepaidsTable({ 
  data, 
  isLoading, 
  onViewPrepaid, 
  onEditPrepaid, 
  onDeletePrepaid, 
  onCreatePrepaid,
  onSearch,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onMarkAsConsumed,
  pageSize = 20,
  onPageSizeChange,
  totalItems = 0
}: PrepaidsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status: 'PENDING' | 'CONSUMED') => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="text-yellow-700 border-yellow-200 bg-yellow-50 font-winter-solid">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
      case 'CONSUMED':
        return (
          <Badge variant="secondary" className="text-gray-700 bg-gray-100 font-winter-solid">
            <CheckCircle className="h-3 w-3 mr-1" />
            Consumido
          </Badge>
        );
      default:
        return (
          <Badge variant="default" className="font-winter-solid">
            Desconocido
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Señas</h2>
          <Button onClick={onCreatePrepaid} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Seña
          </Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando señas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#455a54]/50 h-4 w-4" />
          <Input
            placeholder="Buscar señas por cliente, monto o notas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20"
          />
        </div>
        <Button type="submit" variant="outline" className="border-[#9d684e] text-[#9d684e] hover:bg-[#9d684e] hover:text-white">
          Buscar
        </Button>
      </form>

      {/* Table */}
      <div className="border border-[#9d684e]/20 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-[#9d684e]/5">
            <TableRow className="border-[#9d684e]/10">
              <TableHead className="text-[#455a54] font-winter-solid font-medium">Cliente</TableHead>
              <TableHead className="text-[#455a54] font-winter-solid font-medium">Monto</TableHead>
              <TableHead className="text-[#455a54] font-winter-solid font-medium">Estado</TableHead>
              <TableHead className="text-[#455a54] font-winter-solid font-medium">Notas</TableHead>
              <TableHead className="text-[#455a54] font-winter-solid font-medium">Fecha Creación</TableHead>
              <TableHead className="text-[#455a54] font-winter-solid font-medium">Fecha Consumo</TableHead>
              <TableHead className="text-[#455a54] font-winter-solid font-medium text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-[#455a54]/50 font-winter-solid">
                  No se encontraron señas
                </TableCell>
              </TableRow>
            ) : (
              data.map((prepaid) => (
                <TableRow key={prepaid.id} className="border-[#9d684e]/10 hover:bg-[#9d684e]/5">
                  <TableCell>
                    <div className="font-medium text-[#455a54] font-winter-solid">
                      {prepaid.clientId}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-lg text-[#455a54] font-winter-solid">
                      {formatCurrency(prepaid.amount)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(prepaid.status)}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate text-[#455a54] font-winter-solid">
                      {prepaid.notes || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[#455a54] font-winter-solid">
                      {formatDate(prepaid.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[#455a54] font-winter-solid">
                      {prepaid.consumedAt ? formatDate(prepaid.consumedAt) : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditPrepaid?.(prepaid)}
                        className="text-[#455a54] hover:text-[#9d684e] hover:bg-[#9d684e]/10"
                        title="Editar seña"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange || (() => {})}
        isLoading={isLoading}
        className="pt-4"
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        showPageSizeSelector={true}
        totalItems={totalItems}
      />
    </div>
  );
}
