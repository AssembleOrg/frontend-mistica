'use client';

// Confirmación reutilizable que reemplaza a window.confirm nativo.
// Uso: const confirm = useConfirm(); if (!(await confirm({ title, ... }))) return;
// Requiere <ConfirmProvider/> montado una vez arriba (en el layout del dashboard).

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'destructivo' (rojo, default para borrar) o 'normal' (verde). */
  variant?: 'destructivo' | 'normal';
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm requiere <ConfirmProvider/>');
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  }, []);

  const destructive = opts?.variant !== 'normal';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={opts !== null} onOpenChange={(o) => !o && settle(false)}>
        {opts && (
          <DialogContent className='sm:max-w-sm'>
            <DialogHeader className='text-left'>
              <DialogTitle className='font-tan-nimbus text-xl text-[#455a54]'>
                {opts.title}
              </DialogTitle>
            </DialogHeader>
            {opts.description && (
              <p className='text-sm text-[#7a6e6f]'>{opts.description}</p>
            )}
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => settle(false)}
                className='border-[#e6dbcd] text-[#455a54] hover:bg-[#fbf5ef]'
              >
                {opts.cancelLabel ?? 'Cancelar'}
              </Button>
              <Button
                type='button'
                variant={destructive ? 'destructive' : 'verde'}
                onClick={() => settle(true)}
                autoFocus
              >
                {opts.confirmLabel ?? (destructive ? 'Eliminar' : 'Confirmar')}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  );
}
