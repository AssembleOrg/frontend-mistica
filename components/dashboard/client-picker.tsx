'use client';

// Buscador inline de clientes (debounce 250 ms, hasta 12 resultados). Elegido
// el cliente, se muestra como chip con X para cambiarlo. Opcionalmente ofrece
// "cargar como nuevo" cuando no está en el sistema.

import { useEffect, useState } from 'react';
import { Loader2, Plus, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ClientsService, type Client } from '@/services/clients.service';

const clientsService = new ClientsService();

export function clientIdOf(client: Client): string {
  return client.id || client._id || '';
}

const defaultFieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

export function ClientPicker({
  value,
  onChange,
  onCreateNew,
  placeholder = 'Escribí al menos 2 letras para buscar…',
  className,
}: Readonly<{
  value: Client | null;
  onChange: (client: Client | null) => void;
  /** Si viene, ofrece cargar lo tipeado como cliente nuevo. */
  onCreateNew?: (query: string) => void;
  placeholder?: string;
  className?: string;
}>) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (value || term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await clientsService.getClients(1, 12, { search: term });
        if (active) {
          setResults(
            response.data.data.map((client) => ({ ...client, id: clientIdOf(client) })),
          );
        }
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, value]);

  if (value) {
    return (
      <div className='flex min-h-10 items-center gap-2 rounded-md border border-[#bfd2c9] bg-[#E7F0EC] px-3'>
        <span className='min-w-0 flex-1 truncate text-sm font-medium text-[#455a54]'>
          {value.fullName}
          {(value.phone || value.email) && (
            <span className='ml-1.5 text-xs font-normal text-[#6d7d77]'>
              · {value.phone ?? value.email}
            </span>
          )}
        </span>
        <button
          type='button'
          onClick={() => {
            onChange(null);
            setQuery('');
          }}
          className='rounded p-1 text-[#6d7d77] hover:bg-white/70'
          aria-label='Cambiar cliente'
        >
          <X className='h-4 w-4' />
        </button>
      </div>
    );
  }

  const term = query.trim();
  return (
    <div className='relative'>
      <Search className='pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#9d684e]/60' />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className={cn(defaultFieldCls, 'pl-9', className)}
      />
      {loading && (
        <Loader2 className='absolute right-3 top-3 h-4 w-4 animate-spin text-[#9d684e]' />
      )}
      {term.length >= 2 && !loading && (
        <div className='mt-1 max-h-48 overflow-y-auto rounded-md border border-[#e6dbcd] bg-white p-1 shadow-sm'>
          {results.length === 0 ? (
            <p className='px-2 py-3 text-sm text-[#7a6e6f]'>No encontramos clientes.</p>
          ) : (
            results.map((client) => (
              <button
                key={clientIdOf(client)}
                type='button'
                onClick={() => {
                  onChange(client);
                  setQuery('');
                  setResults([]);
                }}
                className='block w-full rounded px-2 py-2 text-left text-sm text-[#3d3338] hover:bg-[#fbf5ef]'
              >
                <span className='block font-medium'>{client.fullName}</span>
                {(client.phone || client.email) && (
                  <span className='block text-xs text-[#7a6e6f]'>
                    {[client.phone, client.email].filter(Boolean).join(' · ')}
                  </span>
                )}
              </button>
            ))
          )}
          {onCreateNew && (
            <button
              type='button'
              onClick={() => {
                onCreateNew(term);
                setQuery('');
                setResults([]);
              }}
              className='mt-1 flex w-full items-center gap-1.5 rounded border-t border-[#e6dbcd] px-2 py-2 text-left text-sm font-medium text-[#9d684e] hover:bg-[#fbf5ef]'
            >
              <Plus className='h-3.5 w-3.5' />
              Cargar «{term}» como cliente nuevo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
