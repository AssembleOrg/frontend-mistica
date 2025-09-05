'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, X, CheckCircle, Search, Loader2 } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Prepaid, CreatePrepaidRequest, UpdatePrepaidRequest } from '@/services/prepaids.service';
import { useClientsAPI } from '@/hooks/useClientsAPI';
import { formatCurrency } from '@/lib/sales-calculations';
import { Client } from '@/services/clients.service';

interface PrepaidFormProps {
  prepaid?: Prepaid | null;
  clientId?: string;
  onSave: (clientId: string, prepaidData: CreatePrepaidRequest | UpdatePrepaidRequest) => Promise<void>;
  onCancel: () => void;
  onMarkAsConsumed?: (prepaid: Prepaid) => void;
  isLoading?: boolean;
}

export function PrepaidForm({ 
  prepaid, 
  clientId: initialClientId, 
  onSave, 
  onCancel, 
  onMarkAsConsumed,
  isLoading = false 
}: PrepaidFormProps) {
  const { searchClients } = useClientsAPI();
  const [selectedClientId, setSelectedClientId] = useState(initialClientId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [formData, setFormData] = useState({
    amount: 0,
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (prepaid) {
      setFormData({
        amount: prepaid.amount,
        notes: prepaid.notes || '',
      });
      setSelectedClientId(prepaid.clientId);
      setSearchQuery(getClientName(prepaid.clientId));
    } else {
      setFormData({
        amount: 0,
        notes: '',
      });
      setSelectedClientId(initialClientId || '');
      setSearchQuery('');
    }
    setErrors({});
  }, [prepaid, initialClientId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.client-search-container')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAmountChange = (value: number) => {
    setFormData(prev => ({ ...prev, amount: value }));
    // Clear error when user starts typing
    if (errors.amount) {
      setErrors(prev => ({ ...prev, amount: '' }));
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowSearchResults(true);
    
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Only search if query has at least 3 characters
    if (value.trim().length >= 3) {
      debounceTimeoutRef.current = setTimeout(() => {
        performSearch(value.trim());
      }, 300); // 300ms debounce
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const performSearch = async (query: string) => {
    if (!query || query.length < 3) return;
    console.log(query)
    setIsSearching(true);
    try {
      const response = await searchClients(query, 1, 20);
      if (response && response.data) {
        setSearchResults(response.data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching clients:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClientId(client.id);
    setSearchQuery(getClientName(client.id));
    setShowSearchResults(false);
    setSearchResults([]);
    
    // Clear error when user selects a client
    if (errors.clientId) {
      setErrors(prev => ({ ...prev, clientId: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedClientId) {
      newErrors.clientId = 'Debe seleccionar un cliente';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
    }

    if (formData.amount > 100000) {
      newErrors.amount = 'El monto no puede ser mayor a $100,000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast.error('Error', 'Por favor corrige los errores en el formulario');
      return;
    }

    try {
      const prepaidData: CreatePrepaidRequest | UpdatePrepaidRequest = {
        amount: formData.amount,
        notes: formData.notes || undefined,
      };

      await onSave(selectedClientId, prepaidData);
    } catch (error) {
      console.error('Error saving prepaid:', error);
    }
  };

  const handleMarkAsConsumed = () => {
    if (prepaid && onMarkAsConsumed) {
      onMarkAsConsumed(prepaid);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getClientName = (clientId: string) => {
    // First try to find in search results
    const client = searchResults.find(c => c.id === clientId);
    if (client) {
      return `${client.fullName}${client.phone ? ` (${client.phone})` : ''}`;
    }
    return `Cliente ID: ${clientId}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-[#455a54] font-tan-nimbus mt-6'>
            {prepaid ? 'Editar Seña' : 'Nueva Seña'}
          </h1>
          <p className='text-[#455a54]/70 font-winter-solid'>
            {prepaid ? 'Modifica la información de la seña' : 'Complete la información de la nueva seña'}
          </p>
          <p className='text-sm text-[#455a54]/60 font-winter-solid mt-1'>
            Los campos marcados con <span className='text-red-500'>*</span> son obligatorios
          </p>
        </div>
        <div className="flex gap-2">
          {prepaid && prepaid.status === 'PENDING' && onMarkAsConsumed && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAsConsumed}
              className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50"
            >
              <CheckCircle className="h-4 w-4" />
              Marcar como Consumido
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-[#455a54] hover:text-[#9d684e] hover:bg-[#9d684e]/10">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="w-full max-w-2xl mx-auto border-[#9d684e]/20">
        <CardHeader>
          <CardTitle className="text-[#455a54] font-tan-nimbus">
            {prepaid ? 'Editar Seña' : 'Nueva Seña'}
          </CardTitle>
        </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="clientId" className="text-[#455a54] font-winter-solid">Cliente *</Label>
            <div className="relative client-search-container">
              <Input
                id="clientId"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Buscar cliente (mínimo 3 caracteres)..."
                className={`border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20 ${errors.clientId ? 'border-red-500' : ''}`}
                disabled={!!prepaid} // Disable if editing existing prepaid
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#9d684e]" />
                ) : (
                  <Search className="h-4 w-4 text-[#9d684e]" />
                )}
              </div>
              
              {/* Search Results Dropdown */}
              {showSearchResults && searchQuery.length >= 3 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-[#9d684e]/20 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    searchResults.map((client) => (
                      <div
                        key={client.id}
                        onClick={() => handleClientSelect(client)}
                        className="px-4 py-3 hover:bg-[#9d684e]/10 cursor-pointer border-b border-[#9d684e]/30 last:border-b-0"
                      >
                        <div className="font-medium text-[#455a54] font-winter-solid">
                          {client.fullName}
                        </div>
                        {client.phone && (
                          <div className="text-sm text-[#455a54]/70 font-winter-solid">
                            {client.phone}
                          </div>
                        )}
                        {client.email && (
                          <div className="text-sm text-[#455a54]/70 font-winter-solid">
                            {client.email}
                          </div>
                        )}
                      </div>
                    ))
                  ) : !isSearching && searchQuery.length >= 3 ? (
                    <div className="px-4 py-3 text-[#455a54]/70 font-winter-solid text-center">
                      No se encontraron clientes
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            {errors.clientId && (
              <p className="text-sm text-red-500 font-winter-solid">{errors.clientId}</p>
            )}
            {prepaid && (
              <p className="text-sm text-[#455a54]/70 font-winter-solid">
                Cliente: {getClientName(prepaid.clientId)}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-[#455a54] font-winter-solid">Monto (ARS) *</Label>
            <CurrencyInput
              id="amount"
              value={formData.amount || 0}
              onChange={handleAmountChange}
              placeholder="0,00"
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && (
              <p className="text-sm text-red-500 font-winter-solid">{errors.amount}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-[#455a54] font-winter-solid">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Descripción de la seña..."
              rows={3}
              className="border-[#9d684e]/20 focus:border-[#9d684e] focus:ring-[#9d684e]/20"
            />
          </div>

          {/* Status Display (for editing) */}
          {prepaid && (
            <div className="space-y-2">
              <Label className="text-[#455a54] font-winter-solid">Estado</Label>
              <div className="p-3 bg-[#9d684e]/5 rounded-md border border-[#9d684e]/20">
                <div className="flex items-center gap-2">
                  {prepaid.status === 'PENDING' ? (
                    <>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-yellow-700 font-medium font-winter-solid">Pendiente</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      <span className="text-gray-700 font-medium font-winter-solid">Consumido</span>
                    </>
                  )}
                </div>
                {prepaid.consumedAt && (
                  <p className="text-sm text-[#455a54]/70 mt-1 font-winter-solid">
                    Consumido el: {new Date(prepaid.consumedAt).toLocaleDateString('es-AR')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-[#9d684e]/20">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="border-[#9d684e] text-[#9d684e] hover:bg-[#9d684e] hover:text-white"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="bg-[#9d684e] hover:bg-[#9d684e]/90 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Guardando...' : (prepaid ? 'Actualizar' : 'Crear')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    </div>
  );
}
