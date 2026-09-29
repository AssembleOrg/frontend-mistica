'use client';

// Pestaña Bot (Reservas > Bot): configuración del bot de WhatsApp para el
// dueño, calcada del panel de Mery: qué dice, qué políticas usa, probarlo y
// la sesión de WhatsApp. Sólo admin.

import { useState } from 'react';
import { FlaskConical, ListChecks, Settings2, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BotConfigPanel } from './bot/bot-config-panel';
import { BotFaqPanel } from './bot/bot-faq-panel';
import { BotTryPanel } from './bot/bot-try-panel';
import { BotSessionPanel } from './bot/bot-session-panel';

type Sub = 'config' | 'faq' | 'try' | 'session';

const SUBS: { key: Sub; label: string; icon: typeof Settings2 }[] = [
  { key: 'config', label: 'Configuración', icon: Settings2 },
  { key: 'faq', label: 'Preguntas y respuestas', icon: ListChecks },
  { key: 'try', label: 'Probador', icon: FlaskConical },
  { key: 'session', label: 'Sesión', icon: Smartphone },
];

export function BotTab() {
  const [sub, setSub] = useState<Sub>('config');
  return (
    <div className='flex flex-col gap-5'>
      <div className='inline-flex w-fit max-w-full items-center overflow-x-auto rounded-[11px] border border-[#e6dbcd] bg-[#fbf5ef] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
        {SUBS.map(({ key, label, icon: Icon }) => {
          const on = sub === key;
          return (
            <button
              key={key}
              type='button'
              onClick={() => setSub(key)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors',
                on ? 'bg-[#455a54] text-white' : 'text-[#7a6e6f] hover:text-[#455a54]',
              )}
            >
              <Icon className='h-[15px] w-[15px]' />
              {label}
            </button>
          );
        })}
      </div>

      {sub === 'config' && <BotConfigPanel />}
      {sub === 'faq' && <BotFaqPanel />}
      {sub === 'try' && <BotTryPanel />}
      {sub === 'session' && <BotSessionPanel />}
    </div>
  );
}
