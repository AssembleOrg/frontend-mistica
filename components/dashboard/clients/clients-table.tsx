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
  Trash2, 
  Eye, 
  Phone, 
  Mail
} from 'lucide-react';
import { Client } from '@/services/clients.service';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface ClientsTableProps {
  data: Client[];
  isLoading?: boolean;
  onViewClient?: (client: Client) => void;
  onEditClient?: (client: Client) => void;
  onDeleteClient?: (client: Client) => void;
  onCreateClient?: () => void;
  onSearch?: (query: string) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  totalItems?: number;
}

export function ClientsTable({ 
  data, 
  isLoading, 
  onViewClient, 
  onEditClient, 
  onDeleteClient, 
  onCreateClient,
  onSearch,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSize = 20,
  onPageSizeChange,
  totalItems = 0
}: ClientsTableProps) {
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

  const getPrepaidStatus = (prepaid: number) => {
    if (prepaid === 0) return { status: 'Sin seña', color: 'text-gray-500' };
    if (prepaid < 100) return { status: 'Bajo', color: 'text-red-500' };
    if (prepaid < 500) return { status: 'Medio', color: 'text-yellow-500' };
    return { status: 'Alto', color: 'text-green-500' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Clientes</h2>
          <Button onClick={onCreateClient} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando clientes...</p>
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
            placeholder="Buscar clientes por nombre, teléfono o email..."
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
              <TableHead className="text-[#455a54] font-winter-solid font-medium">Contacto</TableHead>
              <TableHead className="text-[#455a54] font-winter-solid font-medium">Señas</TableHead>
              <TableHead className="text-[#455a54] font-winter-solid font-medium">Estado</TableHead>
              <TableHead className="text-[#455a54] font-winter-solid font-medium">Fecha Registro</TableHead>
              <TableHead className="text-right text-[#455a54] font-winter-solid font-medium">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-[#455a54]/50 font-winter-solid">
                  No se encontraron clientes
                </TableCell>
              </TableRow>
            ) : (
              data.map((client) => {
                const prepaidStatus = getPrepaidStatus(client.prepaid);
                return (
                  <TableRow key={client.id} className="border-[#9d684e]/10 hover:bg-[#9d684e]/5">
                    <TableCell>
                      <div>
                        <div className="font-medium text-[#455a54] font-winter-solid">{client.fullName}</div>
                        {client.cuit && (
                          <div className="text-sm text-[#455a54]/60">CUIT: {client.cuit}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm text-[#455a54]">
                            <Phone className="h-3 w-3 text-[#9d684e]" />
                            {client.phone}
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-2 text-sm text-[#455a54]">
                            <Mail className="h-3 w-3 text-[#9d684e]" />
                            {client.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-[#455a54] font-winter-solid">
                          {formatCurrency(client.prepaid)}
                        </div>
                        <div className={`text-sm font-winter-solid ${prepaidStatus.color}`}>
                          {prepaidStatus.status}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                        Activo
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-[#455a54] font-winter-solid">
                        {formatDate(client.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewClient?.(client)}
                          className="text-[#455a54] hover:text-[#9d684e] hover:bg-[#9d684e]/10"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditClient?.(client)}
                          className="text-[#455a54] hover:text-[#9d684e] hover:bg-[#9d684e]/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteClient?.(client)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
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
