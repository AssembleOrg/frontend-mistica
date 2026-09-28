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
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [setDeferredPrompt, setEnv]);

  return null;
}
