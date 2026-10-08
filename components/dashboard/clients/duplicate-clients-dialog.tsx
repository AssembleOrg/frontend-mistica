'use client';

import { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { showToast } from '@/lib/toast';
import { clientsService, type DuplicateClient } from '@/services/clients.service';

/**
 * Clientes repetidos (mismo teléfono y nombre de pila). Por grupo se elige
 * con cuál quedarse; los demás se fusionan en ese: sus ventas, reservas,
 * señas, conversaciones y ficha de alumno pasan al elegido.
 */
export function DuplicateClientsDialog({ onMerged }: { onMerged: () => void }) {
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<DuplicateClient[][] | null>(null);
  const [keep, setKeep] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const gs = await clientsService.getDuplicates();
      setGroups(gs);
      // Sugerido: el primero (el backend ordena por más historia).
      setKeep(Object.fromEntries(gs.map((g, i) => [i, g[0]?.id])));
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al buscar repetidos');
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setGroups(null);
      load();
    }
  }, [open, load]);

  async function merge(i: number, group: DuplicateClient[]) {
    const keepId = keep[i];
    const kept = group.find((c) => c.id === keepId);
    const others = group.filter((c) => c.id !== keepId);
    if (!kept || others.length === 0) return;
    const ok = await confirm({
      title: `¿Fusionar en ${kept.fullName}?`,
      description: `${others.map((c) => c.fullName).join(', ')} se borra${others.length > 1 ? 'n' : ''} y su historial (ventas, reservas, señas, alumno) pasa a ${kept.fullName}.`,
      confirmLabel: 'Fusionar',
    });
    if (!ok) return;
    setBusy(i);
    try {
      for (const c of others) await clientsService.mergeClients(kept.id, c.id);
      showToast.success(`Fusionado en ${kept.fullName}`);
      onMerged();
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo fusionar');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Button
        type='button'
        variant='outline'
        onClick={() => setOpen(true)}
        className='border-[#9d684e]/40 text-[#9d684e] w-full sm:w-auto'
      >
        <Users className='h-4 w-4 mr-2' />
        Repetidos
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Clientes repetidos</DialogTitle>
            <DialogDescription>
              Mismo teléfono y mismo nombre de pila. Elegí con cuál quedarte y
              fusioná: el resto se borra y su historial pasa al elegido.
            </DialogDescription>
          </DialogHeader>

          {groups === null ? (
            <p className='text-sm text-[#7a6e6f]'>Buscando…</p>
          ) : groups.length === 0 ? (
            <p className='text-sm text-[#7a6e6f]'>No hay clientes repetidos.</p>
          ) : (
            <div className='flex flex-col gap-3'>
              {groups.map((g, i) => (
                <div key={g.map((c) => c.id).join()} className='rounded-xl border border-[#e6dbcd] p-3'>
                  <div className='flex flex-col gap-1.5'>
                    {g.map((c) => (
                      <label
                        key={c.id}
                        className={`flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${
                          keep[i] === c.id ? 'bg-[#E7F0EC]' : ''
                        }`}
                      >
                        <input
                          type='radio'
                          name={`keep-${i}`}
                          checked={keep[i] === c.id}
                          onChange={() => setKeep((k) => ({ ...k, [i]: c.id }))}
                          className='mt-1 accent-[#455a54]'
                        />
                        <span className='min-w-0 flex-1'>
                          <span className='font-medium'>{c.fullName}</span>
                          {c.isStudent && (
                            <span className='ml-2 rounded-full bg-[#455a54]/10 px-2 py-0.5 text-[11px] text-[#455a54]'>
                              alumno
                            </span>
                          )}
                          <span className='block text-xs text-[#7a6e6f]'>
                            {[c.phone, c.email].filter(Boolean).join(' · ')}
                            {' · '}
                            {c.salesCount} ventas · {c.reservationsCount} reservas · alta{' '}
                            {new Date(c.createdAt).toLocaleDateString('es-AR')}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className='mt-2 flex justify-end'>
                    <Button
                      type='button'
                      size='sm'
                      variant='verde'
                      disabled={busy !== null}
                      onClick={() => merge(i, g)}
                    >
                      {busy === i ? 'Fusionando…' : 'Fusionar en el elegido'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
