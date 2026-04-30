'use client';

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scan, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { validateBarcode } from '@/lib/barcode-validation';

interface BarcodeScannerProps {
  onProductScanned: (barcode: string) => void;
  isScanning?: boolean;
  className?: string;
}

export interface BarcodeScannerRef {
  clearInput: () => void;
  focusInput: () => void;
}

export const BarcodeScanner = forwardRef<BarcodeScannerRef, BarcodeScannerProps>(
  ({ onProductScanned, isScanning = false, className = '' }, ref) => {
  const [barcode, setBarcode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
    type?: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    clearInput: () => {
      setBarcode('');
      setValidationResult(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    focusInput: () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }));

  // Auto-focus on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Clear validation result after 3 seconds
  useEffect(() => {
    if (validationResult) {
      const timer = setTimeout(() => {
        setValidationResult(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [validationResult]);

  const handleBarcodeChange = (value: string) => {
    setBarcode(value);
    // Clear any previous validation result when typing
    if (validationResult) {
      setValidationResult(null);
    }
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // NO auto-validation - only validate when user explicitly submits
    // This prevents premature validation while typing manually
  };

  const validateAndProcessBarcode = async (barcodeValue: string) => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      const validation = validateBarcode(barcodeValue);
      
      if (validation.isValid) {
        setValidationResult({
          isValid: true,
          message: `Código válido (${validation.format || 'desconocido'})`,
          type: validation.format || undefined
        });
        
        // Emit the barcode to parent component
        onProductScanned(barcodeValue);
        
        // Clear input and refocus for next scan
        setBarcode('');
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
      } else {
        setValidationResult({
          isValid: false,
          message: validation.message || 'Código de barras inválido'
        });
      }
    } catch (error) {
      setValidationResult({
        isValid: false,
        message: 'Error validando código de barras'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleManualSubmit = () => {
    if (barcode.trim()) {
      validateAndProcessBarcode(barcode.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleManualSubmit();
    }
  };

  const handleBlur = () => {
    // Optional: validate when user clicks away from input
    // Remove this if you don't want blur validation
    if (barcode.trim() && barcode.length >= 8) {
      validateAndProcessBarcode(barcode.trim());
    }
  };

  return (
    <Card className={`border-[#9d684e]/20 ${className}`}>
      <CardHeader>
        <CardTitle className="text-[#455a54] font-tan-nimbus flex items-center gap-2">
          <Scan className="h-5 w-5" />
          Escáner de Códigos de Barras
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            ref={inputRef}
            value={barcode}
            onChange={(e) => handleBarcodeChange(e.target.value)}
            onKeyPress={handleKeyPress}
            onBlur={handleBlur}
            placeholder="Escanee o ingrese código de barras..."
            className="border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20 text-lg"
            disabled={isScanning || isValidating}
          />
          
          {isValidating && (
            <div className="flex items-center gap-2 text-[#455a54]/70">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-winter-solid">Validando código...</span>
            </div>
          )}
          
          {validationResult && (
            <div className="flex items-center gap-2">
              {validationResult.isValid ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <Badge 
                variant={validationResult.isValid ? "default" : "outline"}
                className={validationResult.isValid ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}
              >
                {validationResult.message}
              </Badge>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleManualSubmit}
            disabled={!barcode.trim() || isScanning || isValidating}
            className="flex-1 bg-[#9d684e] hover:bg-[#9d684e]/90 text-white"
          >
            <Scan className="h-4 w-4 mr-2" />
            Carga Manual
          </Button>
          <Button
            onClick={() => {
              setBarcode('');
              setValidationResult(null);
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }}
            variant="outline"
            className="border-[#9d684e] text-[#9d684e] hover:bg-[#9d684e] hover:text-white"
          >
            Limpiar
          </Button>
        </div>
        
        <div className="text-xs text-[#455a54]/60 font-winter-solid">
          💡 Tip: Use un lector de códigos de barras (se procesa automáticamente) o ingrese manualmente y presione Enter. 
          El sistema valida EAN-13, UPC-A, EAN-8 y Code 128.
        </div>
      </CardContent>
    </Card>
  );
});

BarcodeScanner.displayName = 'BarcodeScanner';
