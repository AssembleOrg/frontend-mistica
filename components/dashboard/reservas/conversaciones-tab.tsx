'use client';

// Charlas con una persona del equipo.
//
// Cuando un cliente pide hablar con alguien real, el bot se calla en ese chat y
// la conversación aparece acá. El equipo responde desde el panel (sale por
// WhatsApp) y, cuando la da por terminada, el bot vuelve a atender.
//
// Los avisos llegan por SSE, no por polling: la bandeja se actualiza sola.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  MessageCircle,
  Send,
  User,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  conversationsAdmin,
  type Conversation,
  type ConversationMessage,
} from '@/services/conversations.admin.service';
import { FilterChip } from './_shared';

const AR_TZ = 'America/Argentina/Buenos_Aires';

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: AR_TZ,
  });
}

function cuando(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: AR_TZ });
  const dia = d.toLocaleDateString('en-CA', { timeZone: AR_TZ });
  if (dia === hoy) return hora(iso);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: AR_TZ,
  });
}

type Filtro = 'abiertas' | 'WAITING' | 'CLOSED';

export function ConversacionesTab() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('abiertas');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  // El id seleccionado dentro del handler de SSE, sin re-suscribir en cada cambio.
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedId;

  const loadInbox = useCallback(async () => {
    try {
      setItems(await conversationsAdmin.list());
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar las charlas');
    }
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    try {
      const { messages: rows } = await conversationsAdmin.messages(id);
      setMessages(rows);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar los mensajes');
    }
  }, []);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  // Suscripción en vivo. Una sola, para toda la pestaña.
  useEffect(() => {
    const stop = conversationsAdmin.subscribe(
      (event) => {
        setLive(true);
        // La bandeja siempre se refresca: cambió el orden, el estado o el
        // contador de sin leer.
        if (event.conversation) {
          setItems((prev) => {
            const rest = prev.filter((c) => c.id !== event.conversationId);
            return [event.conversation!, ...rest].sort(
              (a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt),
            );
          });
        } else {
          void loadInbox();
        }

        if (event.type === 'opened') {
          showToast.success(
            `Nueva charla: ${event.conversation?.customerName ?? event.phone}`,
          );
        }

        // Si es la charla abierta, se agrega el mensaje sin recargar todo.
        if (event.conversationId === selectedRef.current && event.message) {
          setMessages((prev) => [
            ...prev,
            {
              id: `${event.message!.createdAt}-${prev.length}`,
              author: event.message!.author,
              authorName: event.message!.authorName,
              body: event.message!.body,
              createdAt: event.message!.createdAt,
            },
          ]);
        }
      },
      () => setLive(false),
    );
    return stop;
  }, [loadInbox]);

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
    else setMessages([]);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selected = items.find((c) => c.id === selectedId) ?? null;

  const visibles = useMemo(() => {
    if (filtro === 'abiertas')
      return items.filter((c) => c.status !== 'CLOSED');
    return items.filter((c) => c.status === filtro);
  }, [items, filtro]);

  const esperando = items.filter((c) => c.status === 'WAITING').length;

  async function abrir(c: Conversation) {
    setSelectedId(c.id);
    if (c.status === 'WAITING') {
      try {
        await conversationsAdmin.take(c.id);
        await loadInbox();
      } catch {
        /* si falla, igual puede leer y responder */
      }
    }
  }

  async function enviar() {
    const text = draft.trim();
    if (!selectedId || !text) return;
    setSending(true);
    try {
      const { delivered } = await conversationsAdmin.reply(selectedId, text);
      setDraft('');
      if (!delivered) {
        showToast.error('Se guardó, pero WhatsApp no lo pudo entregar.');
      }
      await loadMessages(selectedId);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo enviar');
    } finally {
      setSending(false);
    }
  }

  async function cerrar() {
    if (!selected) return;
    if (
      !window.confirm(
        `¿Dar por terminada la charla con ${selected.customerName ?? selected.phone}? El bot vuelve a atender ese chat.`,
      )
    )
      return;
    try {
      await conversationsAdmin.close(selected.id);
      showToast.success('Charla cerrada. El bot vuelve a atender.');
      await loadInbox();
      await loadMessages(selected.id);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo cerrar');
    }
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <FilterChip
            label='Abiertas'
            count={items.filter((c) => c.status !== 'CLOSED').length}
            active={filtro === 'abiertas'}
            onClick={() => setFiltro('abiertas')}
          />
          <FilterChip
            label='Esperando'
            count={esperando}
            active={filtro === 'WAITING'}
            color='#9d684e'
            tint='#f4ead9'
            onClick={() => setFiltro('WAITING')}
          />
          <FilterChip
            label='Cerradas'
            active={filtro === 'CLOSED'}
            onClick={() => setFiltro('CLOSED')}
          />
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
            live ? 'bg-[#E7F0EC] text-[#455a54]' : 'bg-[#f6e2e2] text-[#a33]',
          )}
          title={
            live
              ? 'Recibiendo mensajes en vivo'
              : 'Se cortó la conexión en vivo; reintentando'
          }
        >
          {live ? <Wifi className='h-3.5 w-3.5' /> : <WifiOff className='h-3.5 w-3.5' />}
          {live ? 'en vivo' : 'reconectando…'}
        </span>
      </div>

      <div className='grid gap-4 lg:grid-cols-[320px_1fr]'>
        {/* Bandeja */}
        <div className='flex max-h-[560px] flex-col gap-2 overflow-y-auto'>
          {visibles.length === 0 ? (
            <p className='rounded-2xl border border-dashed border-[#e6dbcd] bg-[#fbf5ef] p-6 text-center text-sm text-[#7a6e6f]'>
              No hay charlas acá.
            </p>
          ) : (
            visibles.map((c) => (
              <button
                key={c.id}
                type='button'
                onClick={() => void abrir(c)}
                className={cn(
                  'flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors',
                  c.id === selectedId
                    ? 'border-[#455a54] bg-[#E7F0EC]'
                    : 'border-[#e6dbcd] bg-white hover:bg-[#fbf5ef]',
                )}
              >
                <div className='flex items-center gap-2'>
                  <span className='truncate text-sm font-semibold text-[#3d3338]'>
                    {c.customerName ?? c.phone}
                  </span>
                  {c.status === 'WAITING' && (
                    <span className='rounded-full bg-[#9d684e] px-2 py-0.5 text-[10px] font-bold uppercase text-white'>
                      espera
                    </span>
                  )}
                  {c.status === 'CLOSED' && (
                    <span className='rounded-full bg-[#e6dbcd] px-2 py-0.5 text-[10px] font-semibold text-[#7a6e6f]'>
                      cerrada
                    </span>
                  )}
                  <span className='ml-auto shrink-0 font-mono text-[11px] text-[#7a6e6f]'>
                    {cuando(c.lastMessageAt)}
                  </span>
                </div>
                {c.reason && (
                  <span className='truncate text-[12px] italic text-[#9d684e]'>
                    {c.reason}
                  </span>
                )}
                <span className='truncate text-[12px] text-[#7a6e6f]'>
                  {c.lastMessagePreview ?? '—'}
                </span>
                {c.unreadForAdmin > 0 && (
                  <span className='w-fit rounded-full bg-[#455a54] px-2 py-0.5 text-[10px] font-bold text-white'>
                    {c.unreadForAdmin} sin leer
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Charla */}
        <div className='flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-[#e6dbcd] bg-white'>
          {!selected ? (
            <div className='flex flex-1 items-center justify-center p-8 text-center text-sm text-[#7a6e6f]'>
              <span className='flex flex-col items-center gap-2'>
                <MessageCircle className='h-6 w-6 text-[#c3b7a4]' />
                Elegí una charla para leerla y responder.
              </span>
            </div>
          ) : (
            <>
              <header className='flex flex-wrap items-center justify-between gap-2 border-b border-[#e6dbcd] bg-[#fbf5ef] px-4 py-3'>
                <div className='flex flex-col'>
                  <span className='font-tan-nimbus text-[16px] font-semibold text-[#455a54]'>
                    {selected.customerName ?? selected.phone}
                  </span>
                  <span className='font-mono text-[11px] text-[#7a6e6f]'>
                    {selected.phone}
                    {selected.takenByName ? ` · atiende ${selected.takenByName}` : ''}
                  </span>
                </div>
                {selected.status !== 'CLOSED' ? (
                  <Button
                    type='button'
                    variant='ghost'
                    onClick={() => void cerrar()}
                    className='gap-2 border border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
                  >
                    <Check className='h-4 w-4' />
                    Terminar y devolver al bot
                  </Button>
                ) : (
                  <span className='rounded-full bg-[#e6dbcd] px-3 py-1 text-xs font-semibold text-[#7a6e6f]'>
                    Cerrada · la atiende el bot
                  </span>
                )}
              </header>

              <div className='flex flex-1 flex-col gap-2.5 overflow-y-auto p-4'>
                {messages.map((m) => (
                  <Burbuja key={m.id} m={m} />
                ))}
                <div ref={bottomRef} />
              </div>

              {selected.status !== 'CLOSED' && (
                <div className='flex items-end gap-2 border-t border-[#e6dbcd] p-3'>
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void enviar();
                      }
                    }}
                    rows={2}
                    placeholder='Escribí tu respuesta… (Enter envía, Shift+Enter salta de línea)'
                    className='border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30'
                  />
                  <Button
                    type='button'
                    variant='verde'
                    onClick={() => void enviar()}
                    disabled={sending || !draft.trim()}
                    className='shrink-0 gap-2'
                  >
                    <Send className='h-4 w-4' />
                    {sending ? 'Enviando…' : 'Enviar'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Burbuja({ m }: { m: ConversationMessage }) {
  const mine = m.author === 'ADMIN';
  const isBot = m.author === 'BOT';
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3.5 py-2.5',
          mine
            ? 'bg-[#455a54] text-white'
            : isBot
              ? 'border border-dashed border-[#e6dbcd] bg-[#fbf5ef] text-[#7a6e6f]'
              : 'border border-[#e6dbcd] bg-[#fbf5ef] text-[#3d3338]',
        )}
      >
        <div className='mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-70'>
          {isBot ? (
            <>
              <Bot className='h-3 w-3' /> bot
            </>
          ) : mine ? (
            <>
              <User className='h-3 w-3' /> {m.authorName ?? 'equipo'}
            </>
          ) : (
            <>
              <User className='h-3 w-3' /> cliente
            </>
          )}
          <span className='ml-1 font-mono normal-case opacity-80'>
            {hora(m.createdAt)}
          </span>
          {m.delivered === false && (
            <span
              className='ml-1 inline-flex items-center gap-1 text-[#ffd7d7]'
              title='WhatsApp no pudo entregarlo'
            >
              <AlertTriangle className='h-3 w-3' /> no entregado
            </span>
          )}
        </div>
        <p className='whitespace-pre-wrap text-sm leading-relaxed'>{m.body}</p>
      </div>
    </div>
  );
}
