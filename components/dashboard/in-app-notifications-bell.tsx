'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bell, CheckCheck, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import {
  IN_APP_NOTIFICATIONS_STREAM_PATH,
  inAppNotifications,
  type InAppNotification,
  type InAppNotificationEvent,
} from '@/services/in-app-notifications.service';
import { liveOrPoll } from '@/lib/live-stream';
import { showToast } from '@/lib/toast';

const NOTIFICATIONS_POLL_MS = 60_000;

function ago(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
}

/**
 * Avisos del panel. Con avisos sin leer no se pasan por alto: la campana se
 * mueve con su contador y, abajo a la derecha, queda un recordatorio en todas
 * las pantallas (se puede cerrar; vuelve si llega uno nuevo). Los que llegan
 * en vivo además saltan como aviso.
 */
export function InAppNotificationsBell() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [open, setOpen] = useState(false);
  // Sin leer al cerrar el recordatorio: no vuelve hasta que lleguen más.
  const [dismissedAt, setDismissedAt] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    // En vivo por SSE directo al backend; si no se puede, cada minuto y sólo
    // con la pestaña visible (ver `lib/live-stream.ts`).
    return liveOrPoll<InAppNotificationEvent>({
      path: IN_APP_NOTIFICATIONS_STREAM_PATH,
      pollMs: NOTIFICATIONS_POLL_MS,
      sync: async () => {
        try {
          setItems((await inAppNotifications.list()).slice(0, 50));
        } catch {
          /* si falla una vuelta, queda lo que había */
        }
      },
      onEvent: (event) => {
        if (!event?.notification) return;
        if (event.type === 'created' && !event.notification.read) {
          showToast.info(event.notification.title);
        }
        setItems((current) => {
          const rest = current.filter((item) => item.id !== event.notification.id);
          return [event.notification, ...rest].slice(0, 50);
        });
      },
    });
  }, [user]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, []);

  if (!user) return null;
  const unread = items.filter((item) => !item.read).length;
  // Si se leyeron avisos, el próximo nuevo vuelve a mostrar el recordatorio.
  if (unread < dismissedAt) setDismissedAt(unread);

  async function markRead(item: InAppNotification) {
    if (item.read) return;
    try {
      const saved = await inAppNotifications.markRead(item.id);
      setItems((current) => current.map((value) => (value.id === saved.id ? saved : value)));
    } catch {
      /* se reintenta al volver a tocarlo */
    }
  }

  async function openItem(item: InAppNotification) {
    void markRead(item);
    if (item.link) {
      setOpen(false);
      router.push(item.link);
    }
  }

  async function markAll() {
    try {
      await inAppNotifications.markAllRead();
      setItems((current) => current.map((item) => ({ ...item, read: true })));
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudieron marcar');
    }
  }

  return (
    <div ref={ref} className='relative ml-auto shrink-0'>
      <button
        type='button'
        onClick={() => setOpen((value) => !value)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
          unread > 0
            ? 'bg-[#F6E9DC] text-[#9d684e] hover:bg-[#f0dcc8]'
            : 'text-[#455a54] hover:bg-[#9d684e]/10'
        }`}
        aria-label={unread > 0 ? `Notificaciones: ${unread} sin leer` : 'Notificaciones'}
      >
        <Bell className={`h-[18px] w-[18px] ${unread > 0 ? 'animate-[wiggle_1.2s_ease-in-out_infinite]' : ''}`} />
        {unread > 0 && (
          <span className='absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full border-2 border-white bg-[#9d684e] px-1 text-center text-[10px] font-bold leading-[14px] text-white'>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        // Mobile: hoja de lado a lado bajo la barra. Desde sm: desplegable.
        <div className='fixed inset-x-2 top-16 z-50 overflow-hidden rounded-2xl border border-[#e6dbcd] bg-white shadow-[0_18px_40px_rgba(58,40,28,0.16)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[22rem]'>
          <div className='flex items-center justify-between gap-2 border-b border-[#f1ede6] px-4 py-3'>
            <span className='font-tan-nimbus text-[15px] font-semibold text-[#3d3338]'>
              Notificaciones
            </span>
            <span className='flex items-center gap-1'>
              {unread > 0 && (
                <button
                  type='button'
                  onClick={() => void markAll()}
                  className='inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-[#455a54] hover:bg-[#fbf5ef]'
                >
                  <CheckCheck className='h-3.5 w-3.5' /> Marcar leídas
                </button>
              )}
              <button
                type='button'
                onClick={() => setOpen(false)}
                aria-label='Cerrar'
                className='grid size-7 place-items-center rounded-full text-[#7a6e6f] hover:bg-[#fbf5ef]'
              >
                <X className='h-4 w-4' />
              </button>
            </span>
          </div>
          {items.length === 0 ? (
            <p className='px-4 py-8 text-center text-sm text-[#7a6e6f]'>No hay notificaciones.</p>
          ) : (
            <div className='max-h-[min(24rem,70vh)] divide-y divide-[#f1ede6] overflow-y-auto'>
              {items.map((item) => (
                <button
                  key={item.id}
                  type='button'
                  onClick={() => void openItem(item)}
                  className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-[#fbf5ef] ${
                    item.read ? '' : 'bg-[#fdf8f2]'
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      item.read ? 'bg-transparent' : 'bg-[#9d684e]'
                    }`}
                  />
                  <span className='min-w-0 flex-1'>
                    <span className='flex items-baseline justify-between gap-2'>
                      <span
                        className={`text-sm ${
                          item.read ? 'text-[#7a6e6f]' : 'font-semibold text-[#3d3338]'
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className='shrink-0 text-[11px] text-[#a99f92]'>{ago(item.createdAt)}</span>
                    </span>
                    <span className='mt-0.5 block whitespace-pre-line break-words text-xs text-[#7a6e6f]'>
                      {item.body}
                    </span>
                    {item.link && (
                      <span className='mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#9d684e]'>
                        Ver <ArrowRight className='h-3 w-3' />
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Recordatorio en todas las pantallas mientras haya avisos sin leer.
          Se cierra con la X y vuelve sólo si llegan avisos nuevos. */}
      {unread > dismissedAt && !open && (
        <div className='fixed bottom-4 right-4 z-40 flex items-center rounded-full bg-[#455a54] text-sm font-semibold text-white shadow-lg'>
          <button
            type='button'
            onClick={() => setOpen(true)}
            className='inline-flex items-center gap-2 rounded-l-full py-2 pl-4 pr-2 hover:bg-[#3b4e49]'
          >
            <Bell className='h-4 w-4' />
            {unread === 1 ? '1 aviso sin leer' : `${unread} avisos sin leer`}
          </button>
          <button
            type='button'
            onClick={() => setDismissedAt(unread)}
            aria-label='Ocultar recordatorio'
            className='grid h-9 w-9 place-items-center rounded-r-full border-l border-white/15 hover:bg-[#3b4e49]'
          >
            <X className='h-4 w-4' />
          </button>
        </div>
      )}
    </div>
  );
}
