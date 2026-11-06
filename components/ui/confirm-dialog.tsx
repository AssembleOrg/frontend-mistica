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
import { Input } from '@/components/ui/input';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'destructivo' (rojo, default para borrar) o 'normal' (verde). */
  variant?: 'destructivo' | 'normal';
  /**
   * Palabra que hay que escribir para habilitar el botón (para acciones que
   * no se pueden tocar por error). Sin distinguir mayúsculas ni tildes.
   */
  typeToConfirm?: string;
}

function norm(v: string): string {
  return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
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
  const [typed, setTyped] = useState('');
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setTyped('');
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
  const locked = !!opts?.typeToConfirm && norm(typed) !== norm(opts.typeToConfirm);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={opts !== null} onOpenChange={(o) => !o && settle(false)}>
        {opts && (
          <DialogContent className='max-w-[calc(100%-2rem)] sm:max-w-md md:max-w-md lg:max-w-md xl:max-w-md'>
            <DialogHeader className='text-left'>
              <DialogTitle className='font-tan-nimbus text-xl text-[#455a54]'>
                {opts.title}
              </DialogTitle>
            </DialogHeader>
            {opts.description && (
              <p className='text-sm text-[#7a6e6f]'>{opts.description}</p>
            )}
            {opts.typeToConfirm && (
              <label className='flex flex-col gap-1.5 text-sm text-[#455a54]'>
                <span>
                  Escribí <b className='font-semibold'>{opts.typeToConfirm}</b> para seguir
                </span>
                <Input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !locked) settle(true);
                  }}
                  placeholder={opts.typeToConfirm}
                  autoFocus
                  autoComplete='off'
                  autoCapitalize='none'
                  autoCorrect='off'
                  spellCheck={false}
                />
              </label>
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
                disabled={locked}
                autoFocus={!opts.typeToConfirm}
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
