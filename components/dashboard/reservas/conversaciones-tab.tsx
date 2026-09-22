'use client';

// Consultas: bandeja de TODAS las charlas por WhatsApp.
//
// Cada consulta que atiende el bot queda acá, turno a turno (constancia). Si el
// cliente pide hablar con alguien real —o el equipo responde una charla del
// bot— el bot se calla en ese chat y lo toma una persona; al terminarla, el bot
// vuelve a atender. El tema de cada consulta (cumpleaños, reserva…) aparece
// como etiqueta.
//
// Los avisos llegan por SSE, no por polling: la bandeja se actualiza sola.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Check,
  Download,
  FileText,
  Headset,
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
  type ConversationStatus,
} from '@/services/conversations.admin.service';
import { FilterChip } from './_shared';
import { useConfirm } from '@/components/ui/confirm-dialog';

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

type Filtro = 'abiertas' | 'WAITING' | 'BOT' | 'CLOSED';

// Qué estados pide cada chip al backend.
const FILTRO_STATUS: Record<Filtro, string> = {
  abiertas: 'BOT,WAITING,HUMAN',
  WAITING: 'WAITING',
  BOT: 'BOT',
  CLOSED: 'CLOSED',
};

const PAGE_SIZE = 40;

type Counts = Partial<Record<ConversationStatus, number>>;

export function ConversacionesTab() {
  const confirm = useConfirm();
  const [items, setItems] = useState<Conversation[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('abiertas');
  const [counts, setCounts] = useState<Counts>({});
  // Paginado de la bandeja: de a 40, "cargar más" al pie.
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  // El id seleccionado dentro del handler de SSE, sin re-suscribir en cada cambio.
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedId;
  const filtroRef = useRef<Filtro>(filtro);
  filtroRef.current = filtro;

  const loadCounts = useCallback(async () => {
    try {
      setCounts(await conversationsAdmin.counts());
    } catch {
      // Los contadores son decorativos: si fallan, la bandeja sigue.
    }
  }, []);

  // Recarga la primera página del filtro actual (y los contadores).
  const loadInbox = useCallback(async () => {
    try {
      const rows = await conversationsAdmin.list({
        status: FILTRO_STATUS[filtro],
        limit: PAGE_SIZE,
        page: 1,
      });
      setItems(rows);
      setPage(1);
      setHasMore(rows.length === PAGE_SIZE);
      void loadCounts();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar las charlas');
    }
  }, [filtro, loadCounts]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const rows = await conversationsAdmin.list({
        status: FILTRO_STATUS[filtro],
        limit: PAGE_SIZE,
        page: next,
      });
      setItems((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...rows.filter((c) => !seen.has(c.id))];
      });
      setPage(next);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar más charlas');
    } finally {
      setLoadingMore(false);
    }
  }, [filtro, page, hasMore, loadingMore]);

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
          const conv = event.conversation;
          const wanted = FILTRO_STATUS[filtroRef.current].split(',');
          setItems((prev) => {
            const rest = prev.filter((c) => c.id !== event.conversationId);
            // Si cambió de estado y ya no entra en el filtro, sale de la lista.
            if (!wanted.includes(conv.status)) return rest;
            return [conv, ...rest].sort(
              (a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt),
            );
          });
          void loadCounts();
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
              mediaKind: event.message!.mediaKind,
              mediaMime: event.message!.mediaMime,
              mediaName: event.message!.mediaName,
              mediaUrl: event.message!.mediaUrl,
            },
          ]);
        }
      },
      () => setLive(false),
    );
    return stop;
  }, [loadInbox, loadCounts]);

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
    else setMessages([]);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selected = items.find((c) => c.id === selectedId) ?? null;

  // La lista ya viene filtrada del backend; acá sólo se descarta lo que
  // cambió de estado en vivo (ej. una charla que se cerró estando abierta).
  const visibles = useMemo(() => {
    const wanted = FILTRO_STATUS[filtro].split(',');
    return items.filter((c) => wanted.includes(c.status));
  }, [items, filtro]);

  const abiertas =
    (counts.BOT ?? 0) + (counts.WAITING ?? 0) + (counts.HUMAN ?? 0);

  // Abrir es sólo leer: nunca toma la charla. El equipo la toma cuando quiere,
  // con el botón "Tomar" (o al responder).
  function abrir(c: Conversation) {
    setSelectedId(c.id);
  }

  async function tomar() {
    if (!selected) return;
    try {
      await conversationsAdmin.take(selected.id);
      showToast.success('Tomaste la charla. El bot deja de responder este chat.');
      await loadInbox();
      await loadMessages(selected.id);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo tomar la charla');
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
      // Responder una charla del bot la toma el equipo: refrescamos el estado.
      await loadInbox();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo enviar');
    } finally {
      setSending(false);
    }
  }

  async function cerrar() {
    if (!selected) return;
    const ok = await confirm({
      title: 'Terminar charla',
      description: `¿Dar por terminada la charla con ${selected.customerName ?? selected.phone}? El bot vuelve a atender ese chat.`,
      confirmLabel: 'Terminar charla',
      variant: 'normal',
    });
    if (!ok) return;
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
      {/* Filtros: una sola fila con scroll horizontal (no envuelven en mobile).
          El estado "en vivo" queda pegado a la derecha, fuera del scroll. */}
      <div className='flex items-center gap-2'>
        <div className='-mx-4 flex flex-1 items-center gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden'>
          <FilterChip
            label='Abiertas'
            count={abiertas}
            active={filtro === 'abiertas'}
            onClick={() => setFiltro('abiertas')}
          />
          <FilterChip
            label='Esperando'
            count={counts.WAITING ?? 0}
            active={filtro === 'WAITING'}
            color='#9d684e'
            tint='#f4ead9'
            onClick={() => setFiltro('WAITING')}
          />
          <FilterChip
            label='Con el bot'
            count={counts.BOT ?? 0}
            active={filtro === 'BOT'}
            onClick={() => setFiltro('BOT')}
          />
          <FilterChip
            label='Cerradas'
            count={counts.CLOSED ?? 0}
            active={filtro === 'CLOSED'}
            onClick={() => setFiltro('CLOSED')}
          />
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
            live ? 'bg-[#E7F0EC] text-[#455a54]' : 'bg-[#f6e2e2] text-[#a33]',
          )}
          title={
            live
              ? 'Recibiendo mensajes en vivo'
              : 'Se cortó la conexión en vivo; reintentando'
          }
        >
          {live ? <Wifi className='h-3.5 w-3.5' /> : <WifiOff className='h-3.5 w-3.5' />}
          <span className='hidden sm:inline'>{live ? 'en vivo' : 'reconectando…'}</span>
        </span>
      </div>

      {/* Desktop: dos columnas. Mobile: una vista por vez — la lista, o el chat
          a pantalla completa cuando hay una charla abierta (con "← Volver"). */}
      <div
        className={cn(
          'grid gap-4 lg:grid-cols-[320px_1fr]',
          selected && 'max-lg:grid-cols-1',
        )}
      >
        {/* Bandeja. En mobile se oculta mientras hay una charla abierta. */}
        <div
          className={cn(
            'flex max-h-[70vh] flex-col gap-2 overflow-y-auto lg:max-h-[560px]',
            selected && 'hidden lg:flex',
          )}
        >
          {visibles.length === 0 ? (
            <p className='rounded-2xl border border-dashed border-[#e6dbcd] bg-[#fbf5ef] p-4 text-center text-sm text-[#7a6e6f]'>
              No hay consultas acá.
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
                    <span className='rounded-full bg-[#9d684e] px-2 py-0.5 text-xs font-bold uppercase text-white'>
                      espera
                    </span>
                  )}
                  {c.status === 'HUMAN' && (
                    <span className='rounded-full bg-[#455a54] px-2 py-0.5 text-xs font-bold uppercase text-white'>
                      equipo
                    </span>
                  )}
                  {c.status === 'BOT' && (
                    <span className='inline-flex items-center gap-1 rounded-full bg-[#eef4f1] px-2 py-0.5 text-xs font-semibold text-[#455a54]'>
                      <Bot className='h-3 w-3' /> bot
                    </span>
                  )}
                  {c.status === 'CLOSED' && (
                    <span className='rounded-full bg-[#e6dbcd] px-2 py-0.5 text-xs font-semibold text-[#7a6e6f]'>
                      cerrada
                    </span>
                  )}
                  <span className='ml-auto shrink-0 font-mono text-xs text-[#7a6e6f]'>
                    {cuando(c.lastMessageAt)}
                  </span>
                </div>
                {c.intent && (
                  <span className='w-fit rounded-full bg-[#f4ead9] px-2 py-0.5 text-xs font-semibold text-[#9d684e]'>
                    {c.intent}
                  </span>
                )}
                {c.reason && (
                  <span className='truncate text-sm italic text-[#9d684e]'>
                    {c.reason}
                  </span>
                )}
                <span className='truncate text-sm text-[#7a6e6f]'>
                  {c.lastMessagePreview ?? '—'}
                </span>
                {c.unreadForAdmin > 0 && (
                  <span className='w-fit rounded-full bg-[#455a54] px-2 py-0.5 text-xs font-bold text-white'>
                    {c.unreadForAdmin} sin leer
                  </span>
                )}
              </button>
            ))
          )}
          {hasMore && (
            <button
              type='button'
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className='rounded-xl border border-dashed border-[#c3b7a4] py-2 text-sm font-medium text-[#455a54] hover:bg-[#fbf5ef] disabled:opacity-60'
            >
              {loadingMore ? 'Cargando…' : `Cargar ${PAGE_SIZE} más`}
            </button>
          )}
        </div>

        {/* Charla. En mobile sólo aparece cuando hay una elegida (ocupa la vista);
            en desktop está siempre, con su placeholder. */}
        <div
          className={cn(
            'flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-[#e6dbcd] bg-white',
            !selected && 'hidden lg:flex',
          )}
        >
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
                <div className='flex min-w-0 items-center gap-2'>
                  <button
                    type='button'
                    onClick={() => setSelectedId(null)}
                    className='-ml-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[#455a54] hover:bg-[#efe7db] lg:hidden'
                    aria-label='Volver a la bandeja'
                  >
                    <ArrowLeft className='h-5 w-5' />
                  </button>
                  <div className='flex min-w-0 flex-col'>
                  <span className='truncate font-tan-nimbus text-[16px] font-semibold text-[#455a54]'>
                    {selected.customerName ?? selected.phone}
                  </span>
                  <span className='truncate font-mono text-xs text-[#7a6e6f]'>
                    {selected.phone}
                    {selected.takenByName ? ` · atiende ${selected.takenByName}` : ''}
                  </span>
                  </div>
                </div>
                {selected.status === 'CLOSED' ? (
                  <span className='rounded-full bg-[#e6dbcd] px-3 py-1 text-xs font-semibold text-[#7a6e6f]'>
                    Cerrada · la atiende el bot
                  </span>
                ) : selected.status === 'HUMAN' ? (
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
                  // BOT o WAITING: se puede tomar cuando se quiera.
                  <div className='flex items-center gap-2'>
                    {selected.status === 'BOT' && (
                      <span className='inline-flex items-center gap-1.5 rounded-full bg-[#eef4f1] px-2.5 py-1 text-xs font-semibold text-[#455a54]'>
                        <Bot className='h-3.5 w-3.5' /> La atiende el bot
                      </span>
                    )}
                    <Button
                      type='button'
                      variant='verde'
                      onClick={() => void tomar()}
                      className='gap-2'
                    >
                      <Headset className='h-4 w-4' />
                      Tomar la charla
                    </Button>
                  </div>
                )}
              </header>

              <div className='flex flex-1 flex-col gap-2.5 overflow-y-auto p-4'>
                {messages.map((m) => (
                  <Burbuja key={m.id} m={m} />
                ))}
                <div ref={bottomRef} />
              </div>

              {selected.status !== 'CLOSED' && (
                <div className='flex flex-col gap-2 border-t border-[#e6dbcd] p-3'>
                  {selected.status === 'BOT' && (
                    <p className='text-xs text-[#9d684e]'>
                      La atiende el bot. Si respondés, tomás vos la charla y el
                      bot deja de contestar este chat.
                    </p>
                  )}
                  <div className='flex items-end gap-2'>
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
        <div className='mb-0.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide opacity-70'>
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
        {m.mediaKind && <Adjunto m={m} />}
        {m.body && (
          <p className='whitespace-pre-wrap text-sm leading-relaxed'>{m.body}</p>
        )}
      </div>
    </div>
  );
}

// Imagen o documento que mandó el cliente. La URL es firmada y de corta vida:
// si venció (o falló la subida), mostramos un aviso en vez de un roto.
function Adjunto({ m }: { m: ConversationMessage }) {
  if (!m.mediaUrl) {
    return (
      <div className='mb-1 flex items-center gap-1.5 rounded-lg border border-dashed border-[#e6dbcd] bg-white/60 px-2.5 py-1.5 text-xs text-[#7a6e6f]'>
        <AlertTriangle className='h-3.5 w-3.5' />
        {m.mediaKind === 'image' ? 'Imagen' : m.mediaName || 'Archivo'} no
        disponible
      </div>
    );
  }
  if (m.mediaKind === 'image') {
    return (
      <a
        href={m.mediaUrl}
        target='_blank'
        rel='noopener noreferrer'
        className='mb-1 block'
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={m.mediaUrl}
          alt={m.mediaName || 'Imagen del cliente'}
          className='max-h-64 w-auto max-w-full rounded-lg border border-black/5 object-contain'
        />
      </a>
    );
  }
  return (
    <a
      href={m.mediaUrl}
      target='_blank'
      rel='noopener noreferrer'
      download={m.mediaName || true}
      className='mb-1 flex items-center gap-2 rounded-lg border border-[#e6dbcd] bg-white px-2.5 py-2 text-sm text-[#455a54] hover:bg-[#fbf5ef]'
    >
      <FileText className='h-4 w-4 shrink-0' />
      <span className='truncate'>{m.mediaName || 'Documento'}</span>
      <Download className='ml-auto h-3.5 w-3.5 shrink-0 opacity-70' />
    </a>
  );
}
