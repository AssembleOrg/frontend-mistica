'use client';

import { useState } from 'react';
import { Download, Share, SquarePlus } from 'lucide-react';
import { usePwaStore } from '@/stores/pwa.store';
import { showToast } from '@/lib/toast';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * "Instalar app" en el menú lateral. En Chrome/Edge/Android abre el diálogo
 * nativo; en iPhone/iPad explica cómo agregarla desde Compartir. Instalada, no
 * se muestra.
 */
export function InstallAppButton() {
  const { canInstall, isStandalone, isIOS, promptInstall } = usePwaStore();
  const [iosHelp, setIosHelp] = useState(false);

  if (isStandalone || (!canInstall && !isIOS)) return null;

  async function install() {
    if (!canInstall) {
      setIosHelp(true);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === 'accepted') showToast.success('¡App instalada!');
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={install}
        tooltip='Instalar app'
        className='text-[#455a54] hover:bg-[#e0a38d]/40 touch-target'
      >
        <Download className='h-5 w-5 sm:h-4 sm:w-4' />
        <span className='font-winter-solid text-sm sm:text-base group-data-[collapsible=icon]:hidden'>
          Instalar app
        </span>
      </SidebarMenuButton>

      <Dialog open={iosHelp} onOpenChange={setIosHelp}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>Instalar Mística</DialogTitle>
            <DialogDescription>
              Queda como una app más en la pantalla de inicio.
            </DialogDescription>
          </DialogHeader>
          <ol className='space-y-3 text-sm text-[#455a54]'>
            <li className='flex items-center gap-3'>
              <Share className='h-5 w-5 shrink-0 text-[#9d684e]' />
              Tocá el botón Compartir en la barra de Safari.
            </li>
            <li className='flex items-center gap-3'>
              <SquarePlus className='h-5 w-5 shrink-0 text-[#9d684e]' />
              Elegí &quot;Agregar a inicio&quot;.
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </SidebarMenuItem>
  );
}
