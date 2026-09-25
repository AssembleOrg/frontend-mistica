'use client';

// Probador: "¿qué respondería el bot a…?". Corre el agente real en seco
// (misma IA, mismas políticas, mismo catálogo) sin mandar nada por WhatsApp
// ni crear reservas/consultas. Ideal para validar un cambio antes de que lo
// vea un cliente.

import { useEffect, useRef, useState } from 'react';
import { Bot, Eraser, Loader2, Send, User, Wrench } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { botAdmin, type BotTryTurn } from '@/services/bot.admin.service';
import { Section, fieldCls } from './_shared';

type Turn = BotTryTurn & { tools?: string[]; ms?: number };

const SUGERENCIAS = [
  'Hola, quiero hacer cerámica',
  '¿Hacen gift cards?',
  '¿Puedo llevar torta para un cumple?',
  '¿Qué precio tiene el brunch?',
  '¿Mis piezas están listas?',
];

export function BotTryPanel() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  async function send(text?: string) {
    const message = (text ?? draft).trim();
    if (!message || busy) return;
    setDraft('');
    const history = turns.map(({ role, content }) => ({ role, content }));
    setTurns((prev) => [...prev, { role: 'user', content: message }]);
    setBusy(true);
    try {
      const res = await botAdmin.try(message, history);
      setTurns((prev) => [
        ...prev,
        { role: 'assistant', content: res.reply || '(sin respuesta)', tools: res.tools, ms: res.ms },
      ]);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo probar');
      setTurns((prev) => prev.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section
      title='Probador'
      help='Escribí como un cliente y mirá qué contesta el bot con la configuración actual. Es una prueba en seco: no manda WhatsApp ni crea reservas.'
      action={
        turns.length > 0 ? (
          <Button type='button' variant='outline' className='gap-2 border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54]' onClick={() => setTurns([])}>
            <Eraser className='h-4 w-4' /> Limpiar
          </Button>
        ) : undefined
      }
    >
      <div className='flex max-h-[520px] min-h-[280px] flex-col gap-3 overflow-y-auto rounded-xl border border-[#e6dbcd] bg-[#fbf5ef] p-4'>
        {turns.length === 0 ? (
          <div className='m-auto flex flex-col items-center gap-3 text-center'>
            <Bot className='h-8 w-8 text-[#c3b7a4]' />
            <p className='text-sm text-[#7a6e6f]'>Probá con algo que preguntan seguido:</p>
            <div className='flex flex-wrap justify-center gap-2'>
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  type='button'
                  onClick={() => void send(s)}
                  className='rounded-full border border-[#e6dbcd] bg-white px-3 py-1.5 text-sm text-[#455a54] hover:bg-[#f3e9df]'
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((t, i) => (
            <div key={i} className={cn('flex gap-2', t.role === 'user' ? 'justify-end' : 'justify-start')}>
              {t.role === 'assistant' && (
                <span className='mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#455a54] text-white'>
                  <Bot className='h-4 w-4' />
                </span>
              )}
              <div className={cn('flex max-w-[80%] flex-col gap-1', t.role === 'user' && 'items-end')}>
                <div
                  className={cn(
                    'whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm',
                    t.role === 'user'
                      ? 'rounded-br-sm bg-[#455a54] text-white'
                      : 'rounded-bl-sm border border-[#e6dbcd] bg-white text-[#3d3338]',
                  )}
                >
                  {t.content}
                </div>
                {t.role === 'assistant' && (t.tools?.length || t.ms != null) && (
                  <div className='flex flex-wrap items-center gap-1.5 px-1 text-[11px] text-[#7a6e6f]'>
                    {t.tools?.map((name) => (
                      <span key={name} className='inline-flex items-center gap-1 rounded-full bg-[#eef4f1] px-2 py-0.5 font-mono text-[#455a54]'>
                        <Wrench className='h-3 w-3' /> {name}
                      </span>
                    ))}
                    {t.ms != null && <span>{(t.ms / 1000).toFixed(1)} s</span>}
                  </div>
                )}
              </div>
              {t.role === 'user' && (
                <span className='mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#9d684e] text-white'>
                  <User className='h-4 w-4' />
                </span>
              )}
            </div>
          ))
        )}
        {busy && (
          <div className='flex items-center gap-2 text-sm text-[#7a6e6f]'>
            <Loader2 className='h-4 w-4 animate-spin' /> Ariadna está escribiendo…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className='flex items-end gap-2'
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder='Escribí como si fueras un cliente… (Enter para enviar)'
          className={cn(fieldCls, 'min-h-0 flex-1 text-sm')}
        />
        <Button type='submit' variant='verde' className='gap-2' disabled={busy || !draft.trim()}>
          <Send className='h-4 w-4' /> Probar
        </Button>
      </form>
    </Section>
  );
}
