'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import {
  inAppNotifications,
  type InAppNotification,
} from '@/services/in-app-notifications.service';

export function InAppNotificationsBell() {
  const user = useAuthStore((state) => state.user);
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    void inAppNotifications.list().then(setItems).catch(() => setItems([]));
    return inAppNotifications.subscribe((event) => {
      setItems((current) => {
        const rest = current.filter((item) => item.id !== event.notification.id);
        return [event.notification, ...rest].slice(0, 50);
      });
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
    const saved = await inAppNotifications.markRead(item.id);
    setItems((current) => current.map((value) => value.id === saved.id ? saved : value));
  }

  return (
    <div ref={ref} className='relative ml-auto'>
      <button
        type='button'
        onClick={() => setOpen((value) => !value)}
        className='relative flex h-9 w-9 items-center justify-center rounded-lg text-[#455a54] hover:bg-[#9d684e]/10'
        aria-label='Notificaciones'
      >
        <Bell className='h-5 w-5' />
        {unread > 0 && <span className='absolute right-0 top-0 min-w-4 rounded-full bg-[#a33] px-1 text-[10px] font-bold text-white'>{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className='absolute right-0 top-11 z-50 w-80 rounded-xl border border-[#e6dbcd] bg-white p-2 shadow-xl'>
          <div className='flex items-center justify-between px-2 pb-2'>
            <strong className='text-sm text-[#455a54]'>Notificaciones</strong>
            <button type='button' onClick={() => setOpen(false)} aria-label='Cerrar'><X className='h-4 w-4 text-[#7a6e6f]' /></button>
          </div>
          {items.length === 0 ? <p className='p-2 text-sm text-[#7a6e6f]'>No hay notificaciones.</p> : (
            <div className='max-h-80 overflow-y-auto'>
              {items.map((item) => (
                <button key={item.id} type='button' onClick={() => void markRead(item)} className={`flex w-full gap-2 rounded-lg p-2 text-left hover:bg-[#fbf5ef] ${item.read ? 'opacity-60' : 'bg-[#fdf6e3]'}`}>
                  <Check className='mt-0.5 h-4 w-4 shrink-0 text-[#455a54]' />
                  <span><strong className='block text-sm text-[#455a54]'>{item.title}</strong><span className='whitespace-pre-line text-xs text-[#7a6e6f]'>{item.body}</span></span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
