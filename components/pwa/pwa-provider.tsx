'use client';

import { useEffect } from 'react';
import {
  usePwaStore,
  type BeforeInstallPromptEvent,
} from '@/stores/pwa.store';

function detectStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectIOS(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ se presenta como Mac: se lo distingue por la pantalla táctil.
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || isIPadOS;
}

/** Safari en cualquier equipo de Apple (en iOS todos los navegadores son WebKit). */
function detectAppleWebKit(): boolean {
  if (detectIOS()) return true;
  const ua = navigator.userAgent;
  return /Safari\//.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Android/.test(ua);
}

/** Registra el service worker y captura el aviso de instalación del navegador. */
export function PwaProvider() {
  const setDeferredPrompt = usePwaStore((s) => s.setDeferredPrompt);
  const setEnv = usePwaStore((s) => s.setEnv);

  useEffect(() => {
    setEnv({ isStandalone: detectStandalone(), isIOS: detectIOS() });

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setEnv({ isStandalone: true, isIOS: detectIOS() });
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    if ('serviceWorker' in navigator) {
      if (detectAppleWebKit()) {
        // En Safari (iPhone, iPad, Mac) un service worker con handler de fetch
        // hace que a veces no viaje la cookie de sesión (SameSite=Lax) y la app
        // instalada rebotaba al login. iOS no lo necesita para instalar la web,
        // así que ahí no se registra y se da de baja el que haya quedado.
        navigator.serviceWorker
          .getRegistrations()
          .then((registrations) => registrations.forEach((r) => void r.unregister()))
          .catch(() => {});
      } else {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/', updateViaCache: 'none' })
          .catch(() => {});
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [setDeferredPrompt, setEnv]);

  return null;
}
