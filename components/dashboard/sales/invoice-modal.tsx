'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, CheckCircle, X } from 'lucide-react';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: InvoiceData) => void;
  saleTotal: number;
}

export interface InvoiceData {
  invoiceType: 'A' | 'B' | 'C';
  customerCuit: string;
  customerIva: string;
}

export function InvoiceModal({ isOpen, onClose, onConfirm, saleTotal }: InvoiceModalProps) {
  const [invoiceType, setInvoiceType] = useState<'A' | 'B' | 'C'>('C');
  const [customerCuit, setCustomerCuit] = useState('');
  const [customerIva, setCustomerIva] = useState('');

  const handleConfirm = () => {
    // Validaciones
    if (saleTotal > 200000 && !customerCuit) {
      alert('Para ventas superiores a $200,000 se requiere CUIT del cliente');
      return;
    }
    
    if (invoiceType === 'A' && (!customerCuit || !customerIva)) {
      alert('Para factura tipo A se requiere CUIT e IVA del cliente');
      return;
    }
    
    onConfirm({
      invoiceType,
      customerCuit,
      customerIva
    });
    
    onClose();
  };

  const handleClose = () => {
    setInvoiceType('C');
    setCustomerCuit('');
    setCustomerIva('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#455a54] font-tan-nimbus flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Configurar Facturación
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tipo de Factura */}
          <div>
            <Label htmlFor="invoiceType" className="text-sm font-medium text-[#455a54]">
              Tipo de Factura
            </Label>
            <Select value={invoiceType} onValueChange={(value: 'A' | 'B' | 'C') => setInvoiceType(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="C">Factura C</SelectItem>
                <SelectItem value="B">Factura B</SelectItem>
                <SelectItem value="A">Factura A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* CUIT del Cliente */}
          <div>
            <Label htmlFor="customerCuit" className="text-sm font-medium text-[#455a54]">
              CUIT Cliente {(saleTotal > 200000 || invoiceType === 'A') ? '*' : ''}
            </Label>
            <Input
              id="customerCuit"
              value={customerCuit}
              onChange={(e) => setCustomerCuit(e.target.value)}
              placeholder="Ingrese CUIT (cualquier formato)"
              className="mt-1"
            />
          </div>

          {/* Condición IVA - Solo para Factura A */}
          {invoiceType === 'A' && (
            <div>
              <Label htmlFor="customerIva" className="text-sm font-medium text-[#455a54]">
                Alícuota IVA *
              </Label>
              <Select value={customerIva} onValueChange={setCustomerIva}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar alícuota IVA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="21">21%</SelectItem>
                  <SelectItem value="10.5">10.5%</SelectItem>
                  <SelectItem value="27">27%</SelectItem>
                  <SelectItem value="0">0% (Exento)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Información sobre tipos de factura */}
          <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-md">
            <strong>Tipos de factura:</strong><br/>
            • <strong>Factura C:</strong> Consumidor final - CUIT opcional<br/>
            • <strong>Factura B:</strong> Monotributista - CUIT opcional<br/>
            • <strong>Factura A:</strong> Responsable inscripto - Requiere CUIT e IVA
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleClose}
            variant="outline"
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-[#9d684e] hover:bg-[#8a5a45]"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirmar Factura
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}