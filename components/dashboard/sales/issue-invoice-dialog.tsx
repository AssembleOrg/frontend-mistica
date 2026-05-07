'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Search, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showToast } from '@/lib/toast';
import {
  salesService,
  type InvoiceType,
  type TaxCondition,
} from '@/services/sales.service';
import { formatCurrency } from '@/lib/sales-calculations';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Total de la venta a facturar — sólo informativo */
  total: number;
  onConfirm: (data: {
    invoiceType: InvoiceType;
    cuit?: string;
    taxCondition?: TaxCondition;
    businessName?: string;
    fiscalAddress?: string;
  }) => Promise<void> | void;
}

const TAX_CONDITION_LABELS: Record<TaxCondition, string> = {
  RESPONSABLE_INSCRIPTO: 'Responsable Inscripto',
  MONOTRIBUTISTA: 'Monotributista',
  EXENTO: 'Exento',
  CONSUMIDOR_FINAL: 'Consumidor Final',
};

const onlyDigits = (s: string) => s.replace(/\D/g, '');

/**
 * Modal para emitir factura AFIP. Permite elegir tipo (A/B/C). Para A y B,
 * pide CUIT y consulta el padrón para autocompletar razón social, condición
 * fiscal y domicilio. Tipo C va siempre a consumidor final no identificado
 * y no requiere datos extra.
 */
export function IssueInvoiceDialog({ open, onOpenChange, total, onConfirm }: Props) {
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('C');
  const [cuit, setCuit] = useState('');
  const [taxCondition, setTaxCondition] = useState<TaxCondition>('CONSUMIDOR_FINAL');
  const [businessName, setBusinessName] = useState('');
  const [fiscalAddress, setFiscalAddress] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setInvoiceType('C');
      setCuit('');
      setTaxCondition('CONSUMIDOR_FINAL');
      setBusinessName('');
      setFiscalAddress('');
    }
  }, [open]);

  // Cuando cambia el tipo, ajustamos los defaults razonables.
  useEffect(() => {
    if (invoiceType === 'A') {
      // A va a Responsable Inscripto/Monotributista/Exento — nunca CF.
      if (taxCondition === 'CONSUMIDOR_FINAL') setTaxCondition('RESPONSABLE_INSCRIPTO');
    } else if (invoiceType === 'C') {
      setTaxCondition('CONSUMIDOR_FINAL');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceType]);

  const requiresCuit = invoiceType === 'A' || invoiceType === 'B';
  const cuitDigits = onlyDigits(cuit);
  const cuitValid = cuitDigits.length === 11;

  const handleLookup = async () => {
    if (!cuitValid) {
      showToast.error('El CUIT debe tener 11 dígitos');
      return;
    }
    setLookingUp(true);
    try {
      const res = await salesService.lookupAfipContributor(cuitDigits);
      const data = res.data;
      if (data.estado && data.estado.toUpperCase() !== 'ACTIVO') {
        showToast.error(`El contribuyente está ${data.estado}`);
      }
      if (data.businessName) setBusinessName(data.businessName);
      if (data.fiscalAddress) setFiscalAddress(data.fiscalAddress);
      // Solo sobrescribimos si AFIP dio una condición y respeta el tipo elegido.
      if (data.taxCondition) {
        if (invoiceType === 'A' && data.taxCondition === 'CONSUMIDOR_FINAL') {
          showToast.error('Un Consumidor Final no puede recibir Factura A');
        } else {
          setTaxCondition(data.taxCondition);
        }
      }
      showToast.success('Datos cargados desde AFIP');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error consultando AFIP';
      showToast.error(msg);
    } finally {
      setLookingUp(false);
    }
  };

  const validate = (): string | null => {
    if (invoiceType === 'C') return null;
    if (!cuitValid) return 'El CUIT es obligatorio y debe tener 11 dígitos';
    if (!businessName.trim()) return 'La razón social es obligatoria';
    if (invoiceType === 'A' && taxCondition === 'CONSUMIDOR_FINAL') {
      return 'Factura A no admite Consumidor Final';
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      showToast.error(err);
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm({
        invoiceType,
        cuit: requiresCuit ? cuitDigits : undefined,
        taxCondition: requiresCuit ? taxCondition : undefined,
        businessName: requiresCuit ? businessName.trim() : undefined,
        fiscalAddress: requiresCuit ? fiscalAddress.trim() : undefined,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-[#9d684e]/20">
        <DialogHeader>
          <DialogTitle className="text-[#455a54] font-tan-nimbus flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#9d684e]" />
            Emitir factura AFIP
          </DialogTitle>
          <DialogDescription className="font-winter-solid text-[#455a54]/70">
            Total a facturar: <strong>{formatCurrency(total)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selector de tipo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-winter-solid text-[#455a54]">Tipo de factura</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['A', 'B', 'C'] as InvoiceType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setInvoiceType(t)}
                  className={
                    'h-10 rounded-md border text-sm font-medium font-winter-solid transition ' +
                    (invoiceType === t
                      ? 'bg-[#9d684e] text-white border-[#9d684e]'
                      : 'bg-white text-[#455a54] border-[#9d684e]/20 hover:bg-[#9d684e]/5')
                  }
                >
                  Factura {t}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#455a54]/60 font-winter-solid">
              {invoiceType === 'A' && 'Para Responsable Inscripto / Monotributista / Exento.'}
              {invoiceType === 'B' && 'Para Consumidor Final identificado u otros casos.'}
              {invoiceType === 'C' && 'Consumidor Final no identificado. No requiere CUIT.'}
            </p>
          </div>

          {requiresCuit && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-winter-solid text-[#455a54]">CUIT *</Label>
                <div className="flex gap-2">
                  <Input
                    value={cuit}
                    onChange={(e) => setCuit(e.target.value)}
                    placeholder="20-12345678-9"
                    className="flex-1 h-9 border-[#9d684e]/20"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLookup}
                    disabled={!cuitValid || lookingUp}
                    className="h-9 px-3 border-[#9d684e]/30 text-[#9d684e] hover:bg-[#9d684e]/10"
                  >
                    {lookingUp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span className="ml-1.5 text-xs">Buscar</span>
                  </Button>
                </div>
                {cuit && !cuitValid && (
                  <p className="text-[10px] text-red-600 font-winter-solid">
                    El CUIT debe tener 11 dígitos
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-winter-solid text-[#455a54]">Condición fiscal</Label>
                <select
                  value={taxCondition}
                  onChange={(e) => setTaxCondition(e.target.value as TaxCondition)}
                  className="w-full h-9 rounded-md border border-[#9d684e]/20 bg-background px-3 text-sm focus:outline-none focus:border-[#9d684e]"
                >
                  {(Object.keys(TAX_CONDITION_LABELS) as TaxCondition[])
                    .filter((tc) => invoiceType === 'A' ? tc !== 'CONSUMIDOR_FINAL' : true)
                    .map((tc) => (
                      <option key={tc} value={tc}>
                        {TAX_CONDITION_LABELS[tc]}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-winter-solid text-[#455a54]">Razón social *</Label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Nombre o denominación"
                  className="h-9 border-[#9d684e]/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-winter-solid text-[#455a54]">Domicilio fiscal</Label>
                <Input
                  value={fiscalAddress}
                  onChange={(e) => setFiscalAddress(e.target.value)}
                  placeholder="Calle, localidad, provincia"
                  className="h-9 border-[#9d684e]/20"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="border-[#9d684e]/30 text-[#455a54] hover:bg-[#9d684e]/8"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || lookingUp}
            className="bg-[#9d684e] hover:bg-[#9d684e]/90 text-white"
          >
            {submitting ? 'Facturando…' : 'Emitir factura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
