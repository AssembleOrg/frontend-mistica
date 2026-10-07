'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bell, Check, CheckCheck, X } from 'lucide-react';
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
 * pinta, al lado dice cuántos hay y, abajo a la derecha, queda un recordatorio
 * en todas las pantallas. Los que llegan en vivo además saltan como aviso.
 */
export function InAppNotificationsBell() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [open, setOpen] = useState(false);
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
    <div ref={ref} className='relative ml-auto flex items-center gap-2'>
      {unread > 0 && (
        <button
          type='button'
          onClick={() => setOpen(true)}
          className='hidden rounded-full bg-[#F6E9DC] px-3 py-1 text-xs font-semibold text-[#9d684e] hover:bg-[#f0dcc8] sm:inline'
        >
          {unread === 1 ? '1 aviso sin leer' : `${unread} avisos sin leer`}
        </button>
      )}
      <button
        type='button'
        onClick={() => setOpen((value) => !value)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
          unread > 0
            ? 'bg-[#9d684e] text-white shadow-[0_0_0_4px_rgba(157,104,78,0.18)] hover:bg-[#8a5a43]'
            : 'text-[#455a54] hover:bg-[#9d684e]/10'
        }`}
        aria-label={unread > 0 ? `Notificaciones: ${unread} sin leer` : 'Notificaciones'}
      >
        <Bell className={`h-5 w-5 ${unread > 0 ? 'animate-[wiggle_1.2s_ease-in-out_infinite]' : ''}`} />
        {unread > 0 && (
          <span className='absolute -right-1 -top-1 min-w-5 rounded-full border-2 border-white bg-[#a33] px-1 text-center text-[10px] font-bold leading-4 text-white'>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className='absolute right-0 top-11 z-50 w-[22rem] max-w-[calc(100vw-1.5rem)] rounded-xl border border-[#e6dbcd] bg-white p-2 shadow-xl'>
          <div className='flex items-center justify-between gap-2 px-2 pb-2'>
            <strong className='text-sm text-[#455a54]'>Notificaciones</strong>
            <span className='flex items-center gap-1'>
              {unread > 0 && (
                <button
                  type='button'
                  onClick={() => void markAll()}
                  className='inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[#455a54] hover:bg-[#fbf5ef]'
                >
                  <CheckCheck className='h-3.5 w-3.5' /> Marcar todo leído
                </button>
              )}
              <button type='button' onClick={() => setOpen(false)} aria-label='Cerrar'>
                <X className='h-4 w-4 text-[#7a6e6f]' />
              </button>
            </span>
          </div>
          {items.length === 0 ? (
            <p className='p-2 text-sm text-[#7a6e6f]'>No hay notificaciones.</p>
          ) : (
            <div className='max-h-96 overflow-y-auto'>
              {items.map((item) => (
                <button
                  key={item.id}
                  type='button'
                  onClick={() => void openItem(item)}
                  className={`flex w-full gap-2 rounded-lg border-l-[3px] p-2 text-left hover:bg-[#fbf5ef] ${
                    item.read ? 'border-transparent opacity-60' : 'border-[#9d684e] bg-[#fdf6e3]'
                  }`}
                >
                  {item.read ? (
                    <Check className='mt-0.5 h-4 w-4 shrink-0 text-[#455a54]' />
                  ) : (
                    <span className='mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#9d684e]' />
                  )}
                  <span className='min-w-0 flex-1'>
                    <span className='flex items-baseline justify-between gap-2'>
                      <strong className='text-sm text-[#455a54]'>{item.title}</strong>
                      <span className='shrink-0 text-[10px] text-[#a99f92]'>{ago(item.createdAt)}</span>
                    </span>
                    <span className='block whitespace-pre-line text-xs text-[#7a6e6f]'>{item.body}</span>
                    {item.link && (
                      <span className='mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#9d684e]'>
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
      {/* Recordatorio en todas las pantallas mientras haya avisos sin leer. */}
      {unread > 0 && !open && (
        <button
          type='button'
          onClick={() => setOpen(true)}
          className='fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-[#455a54] px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-[#3b4e49]'
        >
          <Bell className='h-4 w-4' />
          {unread === 1 ? 'Tenés 1 aviso sin leer' : `Tenés ${unread} avisos sin leer`}
        </button>
      )}
    </div>
  );
}
